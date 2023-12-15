# Tagging of Repos Workflow

## Purpose

This workflow automates the process of creating GitHub releases by applying tags to your repositories through the GitHub API. It allows for the generation of both regular releases and pre-releases.It takes inputs dynamically from a CSV file.
The workflow can be triggered based on your specific release criteria.

## Inputs

The workflow accepts the following inputs:
- `CSV_FILE` (required:false, string, default: ./release/gh_release/repos.csv): This input specifies the path to the CSV file. The content of the CSV file should adhere to the format: `REPO, TAG, ONLY_TAG, BRANCH, LATEST, BODY, PRE_RELEASE, DRAFT, MESSAGE`.
    - `REPO` : The name of the repository without the .git extension. The name is not case sensitive.
    - `TAG` : The tag that you want to create and publish.
    - `ONLY_TAG` : Set to true if you want to create only a tag without a full release.
    - `BRANCH` : The name of the branch from which the release will be created.
    - `LATEST` : Set to false to prevent marking the release as the latest.
    - `BODY` : A custom message for the release body, describing the changes in this release.
    - `PRE_RELEASE` : A boolean (True/False) indicating whether the release is a pre-release or not.
    - `DRAFT` : A boolean (True/False) indicating whether the release should be a draft.
    - `MESSAGE` : The tag message.
  
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
      CSV_FILE:
        description: path of csv file
        required: false
        type: string
        default: ./release/gh_release/repos.csv
jobs:
  workflow-tag:
    needs: chk_token
    uses: mosip/kattu/.github/workflows/tag.yaml@master
    with:
      CSV_FILE: ${{ inputs.CSV_FILE }}
    secrets:
      TOKEN: "${{ secrets.TOKEN }}"
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```
