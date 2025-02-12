import { Octokit } from '@octokit/rest';
import axios from 'axios';
import * as openpgp from 'openpgp';

// Initialize clients outside handler to benefit from warm starts
const axiosInstance = axios.create({
  timeout: 5000, // Add timeout to prevent hanging requests
  headers: { 'Accept-Encoding': 'gzip' } // Enable compression
});

let octokit;

async function downloadGPGFile(url) {
  try {
    const response = await axiosInstance.get(url, { 
      responseType: 'arraybuffer'
    });
    return new Uint8Array(response.data);
  } catch (error) {
    console.error('GPG file download failed:', error.message);
    throw error;
  }
}

async function getSlackUserId(githubUsername, userMapUrl, userMapPassphrase) {
  try {
    const encryptedData = await downloadGPGFile(userMapUrl);
    const message = await openpgp.readMessage({
      binaryMessage: encryptedData
    });
    
    const { data: decrypted } = await openpgp.decrypt({
      message,
      passwords: [userMapPassphrase],
      format: 'utf8'
    });

    const userMap = JSON.parse(decrypted);
    return userMap[githubUsername];
  } catch (error) {
    console.error('Slack user ID lookup failed:', error.message);
    throw error;
  }
}

async function notifySlack(channel, message, slackToken) {
  try {
    await axiosInstance.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel,
        text: message,
        unfurl_links: false,
        unfurl_media: false,
      },
      {
        headers: {
          Authorization: `Bearer ${slackToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Slack notification failed:', error.message);
    throw error;
  }
}

async function getPullRequestDetails(owner, repo, commitSha, octokit) {
  try {
    // Only fetch essential fields to reduce payload size
    const { data: prs } = await octokit.search.issuesAndPullRequests({
      q: `${commitSha} type:pr repo:${owner}/${repo}`,
    });

    if (prs.items.length === 0) return null;

    const prNumber = prs.items[0].number;
    
    // Parallelize requests for performance
    const [prResponse, timelineResponse] = await Promise.all([
      octokit.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      }),
      octokit.issues.listEventsForTimeline({
        owner,
        repo,
        issue_number: prNumber,
      })
    ]);

    const synchronizeEvent = timelineResponse.data
      .reverse()
      .find(event => event.event === 'synchronized');

    // Only return necessary fields to reduce memory usage
    return {
      number: prResponse.data.number,
      state: prResponse.data.state,
      merged: prResponse.data.merged,
      html_url: prResponse.data.html_url,
      user: {
        login: prResponse.data.user.login
      },
      isSynchronize: !!synchronizeEvent
    };
  } catch (error) {
    console.error('PR lookup failed:', error.message);
    throw error;
  }
}

export const handler = async (event) => {
  // Initialize Octokit only once per container lifecycle
  if (!octokit) {
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  try {
    const githubEvent = event.headers['X-GitHub-Event'] || event.headers['x-github-event'];
    const payload = JSON.parse(event.body);
    
    // Early validations in single check
    if (githubEvent !== 'check_suite' || 
        payload.action !== 'completed' ||
        payload.check_suite.status !== 'completed' || 
        payload.check_suite.conclusion !== 'failure') {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Event ignored' })
      };
    }

    const checkSuite = payload.check_suite;
    const { owner: { login: owner }, name: repo } = payload.repository;

    // Parallelize initial API calls
    const [checksResponse, pr] = await Promise.all([
      octokit.checks.listForSuite({
        owner,
        repo,
        check_suite_id: checkSuite.id,
      }),
      getPullRequestDetails(owner, repo, checkSuite.head_sha, octokit)
    ]);

    const failedCheck = checksResponse.data.check_runs.find(check => 
      check.conclusion === 'failure'
    );
    
    if (!failedCheck || !pr || !['open', 'closed'].includes(pr.state)) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No action required' })
      };
    }

    // Prepare notification content
    const { SLACK_TOKEN, USER_MAP_URL, GPG_USER_MAP_PASSPHRASE, 
            SLACK_COMMON_CHANNEL, SLACK_FAILURE_CHANNEL } = process.env;

    // Construct base message once
    const baseMessage = `*Repo*: ${repo}\n*Workflow*: ${failedCheck.name}\n*Checks*: ${failedCheck.html_url}`;

    if (pr.state === 'closed' && pr.merged && SLACK_FAILURE_CHANNEL) {
      await notifySlack(
        SLACK_FAILURE_CHANNEL, 
        `🚨 *Build Failure After Merge*\n${baseMessage}`, 
        SLACK_TOKEN
      );
    } else {
      const slackUserId = await getSlackUserId(
        pr.user.login, 
        USER_MAP_URL, 
        GPG_USER_MAP_PASSPHRASE
      );

      const message = `${pr.isSynchronize ? '🔄' : '🚨'} *Build Failure${pr.isSynchronize ? ' - Updated PR' : ''}*\n${baseMessage}\n*PR*: ${pr.html_url}`;
      
      await notifySlack(
        slackUserId || SLACK_COMMON_CHANNEL,
        slackUserId ? message : `${message}\n(*${pr.user.login}* not found in user map)`,
        SLACK_TOKEN
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Webhook processed successfully' })
    };
  } catch (error) {
    console.error('Processing failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};