import { Octokit } from '@octokit/rest';
import axios from 'axios';
import * as openpgp from 'openpgp';

const axiosInstance = axios.create({
  timeout: 5000,
  headers: { 'Accept-Encoding': 'gzip' }
});

let octokit;

// ------------------ HELPERS ------------------

async function notifySlack(channel, message, slackToken, blocks = null) {
  try {
    const res = await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel,
        text: message,
        blocks: blocks || undefined,
        link_names: true, // ✅ REQUIRED for mentions
      },
      {
        headers: {
          Authorization: `Bearer ${slackToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.data.ok) {
      console.error("Slack API error:", res.data);
    }

  } catch (error) {
    console.error("Slack notification failed:", error.message);
  }
}

async function getPullRequestDetails(owner, repo, commitSha, octokit) {
  try {
    const { data: prs } = await octokit.search.issuesAndPullRequests({
      q: `${commitSha} type:pr repo:${owner}/${repo}`,
    });

    if (prs.items.length === 0) return null;

    const prNumber = prs.items[0].number;

    const { data: prData } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });

    return {
      number: prData.number,
      html_url: prData.html_url,
      user: { login: prData.user.login },
      merged: prData.merged // ✅ IMPORTANT
    };

  } catch (error) {
    console.error('PR lookup failed:', error.message);
    return null;
  }
}

async function getSlackUserId(githubUsername, mapUrl, passphrase) {
  try {
    const response = await axiosInstance.get(mapUrl, {
      responseType: 'arraybuffer'
    });
    
    const encrypted = Buffer.from(response.data);
    
    // Debug logs
    console.log("RAW RESPONSE (first 200 chars):");
    console.log(encrypted.toString('utf8', 0, 200));


    const message = await openpgp.readMessage({
      binaryMessage: new Uint8Array(Buffer.from(encrypted))
    });

    const { data: decrypted } = await openpgp.decrypt({
      message,
      passwords: [passphrase],
      format: 'utf8',
    });

    const userMap = JSON.parse(decrypted);

    // 🧠 HYBRID LOOKUP STARTS HERE

    console.log("GitHub Username:", githubUsername);
    console.log("UserMap Keys:", Object.keys(userMap));

    // 1️⃣ Exact match
    if (userMap[githubUsername]) {
      console.log("Exact match found");
      return userMap[githubUsername];
    }

    // 2️⃣ Normalized fallback
    const normalizedUsername = githubUsername.trim().toLowerCase();

    const matchKey = Object.keys(userMap).find(
      key => key.trim().toLowerCase() === normalizedUsername
    );

    if (matchKey) {
      console.log(`Fallback match found: ${matchKey}`);
      return userMap[matchKey];
    }

    console.log(`User not found in map: ${githubUsername}`);
    return null;

  } catch (err) {
    console.error("User mapping error:", err.message);
    return null;
  }
}
// ------------------ HANDLER ------------------

export const handler = async (event) => {
  if (!octokit) {
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  try {
    const githubEvent = event.headers['x-github-event'];
    const payload = JSON.parse(event.body);

    // ✅ ONLY process failure events
    if (
      githubEvent !== 'check_suite' ||
      payload.action !== 'completed' ||
      payload.check_suite.status !== 'completed' ||
      !['failure', 'timed_out', 'cancelled'].includes(payload.check_suite.conclusion)
    ) {
      return { statusCode: 200 };
    }

    const checkSuite = payload.check_suite;
    const ownerRaw = payload.repository.owner.login;
    const owner = ownerRaw.toLowerCase();
    const repo = payload.repository.name;

    // -------- CHANNEL MAP --------
    let channelMap = {};
    try {
      channelMap = JSON.parse(process.env.CHANNEL_MAP || "{}");
    } catch (e) {
      console.error("Invalid CHANNEL_MAP JSON");
    }

    // -------- FETCH DATA --------
    const [checksResponse, pr] = await Promise.all([
      octokit.checks.listForSuite({
        owner: ownerRaw,
        repo,
        check_suite_id: checkSuite.id,
      }),
      getPullRequestDetails(ownerRaw, repo, checkSuite.head_sha, octokit)
    ]);

    if (!pr) return { statusCode: 200 };

    // ✅ SET USERNAME (FIXED)
    const githubUsername = pr.user.login;
    console.log("GitHub Username:", githubUsername);

    // -------- FAILED CHECKS --------
    const failedChecks = checksResponse.data.check_runs.filter(
      c => c.conclusion === 'failure'
    );

    if (!failedChecks.length) return { statusCode: 200 };

    const failureList = failedChecks
      .slice(0, 5)
      .map(c => `❌ ${c.name}`)
      .join("\n");

    const extraCount = failedChecks.length > 5
      ? `\n…and ${failedChecks.length - 5} more`
      : "";

    // -------- USER MAPPING --------
    let slackUserId = null;
    try {
      slackUserId = await getSlackUserId(
        githubUsername,
        process.env.USER_MAP_URL,
        process.env.GPG_USER_MAP_PASSPHRASE
      );
    } catch (e) {
      console.log("User mapping failed");
    }

    const authorText = slackUserId
      ? `<@${slackUserId}>`
      : githubUsername;

    // -------- CHANNEL DECISION --------
const orgChannel = channelMap[owner];
const commonChannel = process.env.SLACK_COMMON_CHANNEL;

let statusMessage = "";
let targetChannel = "";

if (!orgChannel) {
  statusMessage = `❗ *Org not found in channel map*`;
  targetChannel = commonChannel;
} 
else if (!slackUserId) {
  statusMessage = `⚠️ *${githubUsername} not found in user map*`;
  targetChannel = commonChannel;
} 
// 👤 PRE-MERGE → DM USER
else if (!pr.merged) {
  console.log("PR not merged → sending DM");

  statusMessage = `⚠️ *Build failed (PR not merged yet)*`;
  targetChannel = slackUserId; // DM
} 
// 📢 POST-MERGE → ORG CHANNEL
else {
  console.log("PR merged → sending to org channel");

  statusMessage = `🚨 *Build Failure (Post Merge)*`;
  targetChannel = orgChannel; // ✅ THIS WAS MISSING
}

// -------- MESSAGE --------
const repoFullName = `${ownerRaw}/${repo}`;
const branch = checkSuite.head_branch;
const fallbackText = "CI Failure";

const blocks = [
  {
    type: "section",
    text: { type: "mrkdwn", text: statusMessage }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text:
        `*Repo:* ${repoFullName}\n` +
        `*Branch:* ${branch}\n` +
        `*Author:* ${authorText}`
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Failed Checks:*\n${failureList}${extraCount}`
    }
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "View PR" },
        url: pr.html_url,
        style: "primary"
      },
      {
        type: "button",
        text: { type: "plain_text", text: "View Checks" },
        url: failedChecks[0].html_url,
        style: "danger"
      }
    ]
  }
];

// -------- SEND --------
await notifySlack(
  targetChannel,
  fallbackText,
  process.env.SLACK_TOKEN,
  blocks
);

return { statusCode: 200 };

  } catch (error) {
    console.error("Processing failed:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
};
