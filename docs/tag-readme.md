# Tagging of Repos Workflow

## Purpose

This workflow automates the process of creating GitHub releases by applying `tags` to your repositories.
It provides the flexibility to create both regular releases and pre-releases while allowing you to customize the release's body message.
The workflow can be triggered based on your specific release criteria.

## Inputs

The workflow accepts the following inputs:
- `REPO` (required, string): The name of the repository without the .git extension. The name is not case sensitive.
- `TAG` (required): The tag that you want to create and publish.
- `BODY` (optional, default: 'Changes in this Release'): A custom message for the release body, describing the changes in this release.
- `PRE_RELEASE` (required, default: False): A boolean (True/False) indicating whether the release is a pre-release or not.
- `DRAFT` (optional, default: False): A boolean (True/False) indicating whether the release should be a draft.
- `ONLY_TAG` (optional, string, default: false): Set to true if you want to create only a tag without a full release.
- `BRANCH` (required, string): The name of the branch from which the release will be created.
- `LATEST` (optional, string, default: true): Set too false to prevent marking the release as the latest.
- `MESSAGE` (required, string): The tag message.

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:
- `SLACK_WEBHOOK_URL` (required): The Slack webhook URL for sending notifications about the workflow's progress and outcome.
- `TOKEN` (required): The token required for authenticating and authorizing the release operation.

## Example Usage

Here's an example of how you can use this workflow to create a release:
```yaml
name: Tagging/Release of repos

on:
  workflow_call:
    inputs:
      CSV_FILE:
        description: path of csv file
        required: false
        type: string
        default: ./release/gh_release/repos.csv
    secrets:
      SLACK_WEBHOOK_URL:
        required: true
      TOKEN:
        required: true

jobs:
  create-releases-from-csv:
    name: Create Releases from CSV
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Create Releases from CSV
        run: |
          while IFS=, read -r REPO TAG ONLY_TAG BRANCH LATEST BODY PRE_RELEASE DRAFT MESSAGE; do
            if [[ "$REPO" == "REPO" ]]; then
              echo "CSV header line ignoring";
              continue;
            fi

            REPO=$(echo "$REPO" | tr -d '"')

            echo "REPO === $REPO"

            PRE_RELEASE=$(echo "$PRE_RELEASE" | tr '[:upper:]' '[:lower:]')
            DRAFT=$(echo "$DRAFT" | tr '[:upper:]' '[:lower:]')
            ONLY_TAG=$(echo "$ONLY_TAG" | tr '[:upper:]' '[:lower:]')

            [[ "$PRE_RELEASE" == "true" ]] && PRE_RELEASE=true || PRE_RELEASE=false
            [[ "$DRAFT" == "true" ]] && DRAFT=true || DRAFT=false
            [[ "$ONLY_TAG" == "true" ]] && ONLY_TAG=true || ONLY_TAG=false

            # Output key-value pairs
            echo "REPO: $REPO"
            echo "TAG: $TAG"
            echo "ONLY_TAG: $ONLY_TAG"
            echo "BRANCH: $BRANCH"
            echo "LATEST: $LATEST"
            echo "BODY: $BODY"
            echo "PRE_RELEASE: $PRE_RELEASE"
            echo "DRAFT: $DRAFT"
            echo "MESSAGE: $MESSAGE"
            echo "-----------------------------"

            # Fetch the latest commit
            REPO_URL="https://github.com/mosip/$REPO.git"
            OBJECT_SHA=$(git ls-remote "$REPO_URL" "refs/heads/$BRANCH" | cut -f1)
            echo "Latest commit on branch $BRANCH: $OBJECT_SHA"
            
            # Conditionally execute curl command based on ONLY_TAG value
            if [[ "$ONLY_TAG" == "true" ]]; then
              
              # Create a tag
              curl -X POST \
                 -H "Authorization: token ${{ secrets.TOKEN }}" \
                 -H "Accept: application/vnd.github.v3+json" \
                 -H "X-GitHub-Api-Version: 2022-11-28" \
                 https://api.github.com/repos/mosip/$REPO/git/refs \
                 -d '{"ref": "refs/tags/'"$TAG"'", "sha": "'"$OBJECT_SHA"'"}'

            else

              # Construct data payload for release
              data='{
                "tag_name": "'"$TAG"'",
                "name": "'"$TAG"'",
                "target_commitish": "'"$BRANCH"'",
                "body": "'"$BODY"'",
                "draft": '$DRAFT',
                "prerelease": '$PRE_RELEASE'
              }'
              
              # Debugging output
              echo "DEBUG: Data payload for release:"
              echo "data: $data"

              # Run curl command for release
              curl -L \
                -X POST \
                -H "Accept: application/vnd.github+json" \
                -H "Authorization: Bearer ${{ secrets.TOKEN }}" \
                -H "X-GitHub-Api-Version: 2022-11-28" \
                https://api.github.com/repos/mosip/$REPO/releases \
                -d "$data"
            fi
          done < "${{ inputs.CSV_FILE }}"
      - uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,author,commit,workflow,job # selectable (default: repo,message)
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # required
        if: failure() # Pick up events even if the job fails or is canceled.
```
