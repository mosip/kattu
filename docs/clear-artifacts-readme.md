# Clear-Artifacts

## Purpose

This workflow is designed to perform the following tasks:
1. Delete old artifacts in the repository.
2. It is triggered by a workflow call event, which means it can be initiated from another workflow.
3. The primary purpose is to help you manage and clean up outdated artifacts from the repository.

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:
- `ACCESS_TOKEN` (required): GitHub token for access to repositories.
- `SLACK_WEBHOOK_URL` (required): Slack webhook URL for notifications.

## Example Usage

Here is an example workflow that uses the `clear-artifacts` workflow:
```yaml
name: 'Delete old artifacts'
on:
  schedule:
    - cron: '0 * * * *' # Every hour
  workflow_dispatch:
    inputs:
      message:
        description: 'Message for manually triggering'
        required: false
        default: 'Triggered for Updates'
        type: string
jobs:
  delete-artifacts:
    uses: mosip/kattu/.github/workflows/clear-artifacts.yml@master
    secrets:
      ACCESS_TOKEN: ${{ secrets.access_token }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```