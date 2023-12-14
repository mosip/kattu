# Tagging of Repos Workflow

## Purpose

This workflow automates the process of creating GitHub releases by applying tags to your repositories through the GitHub API. It allows for the generation of both regular releases and pre-releases.It takes inputs dynamically from a CSV file.
The workflow can be triggered based on your specific release criteria.

## Inputs

The workflow accepts the following inputs from CSV file :
- `REPO` (required, string): The name of the repository without the .git extension. The name is not case sensitive.
- `TAG` (required): The tag that you want to create and publish.
- `ONLY_TAG` (optional, string, default: false): Set to true if you want to create only a tag without a full release.
- `BRANCH` (required, string): The name of the branch from which the release will be created.
- `LATEST` (optional, string, default: true): Set too false to prevent marking the release as the latest.
- `BODY` (optional, default: 'Changes in this Release'): A custom message for the release body, describing the changes in this release.
- `PRE_RELEASE` (required, default: False): A boolean (True/False) indicating whether the release is a pre-release or not.
- `DRAFT` (optional, default: False): A boolean (True/False) indicating whether the release should be a draft.
- `MESSAGE` (required, string): The tag message.

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:
- `SLACK_WEBHOOK_URL` (required): The Slack webhook URL for sending notifications about the workflow's progress and outcome.
- `TOKEN` (required): The token required for authenticating and authorizing the release operation.

## Example Usage

Here's an example of how you can use this workflow to create a release:
```yaml
name:  workflow for mosip github releases

on:
  workflow_dispatch:
    inputs:
      TOKEN:
        description: 'provide docker hub token'
        required: false
        default: ''
        type: string
jobs:
  workflow-tag:
    needs: chk_token
    uses: mosip/kattu/.github/workflows/tag.yaml@master
    secrets:
      TOKEN: "${{ secrets[needs.chk_token.outputs.TOKEN] || inputs.TOKEN }}"
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_MOSIP_WEBHOOK_URL }}
```
