# Release/Pre-release Preparation Workflow

## Purpose

This workflow is designed to prepare a release or pre-release by automating several tasks.
It's especially useful for updating version numbers, creating pull requests, and making necessary adjustments in your project.
The workflow can be customized to fit your release process, such as handling Maven dependencies, updating README badges, and preparing the project for release.

## Inputs

This workflow accepts the following inputs:

- `MESSAGE` (optional, default: 'Release Preparation'): A custom message that describes the purpose of the workflow run. You can use this to differentiate between release and pre-release preparations.
- `RELEASE_TAG` (required): The tag associated with the release you're preparing.
- `SNAPSHOT_TAG` (required): The tag that needs to be replaced during the preparation.
- `BASE` (required): The base branch for creating a pull request.

## Secrets

To use this workflow, you need to provide the following secrets:

- `SLACK_WEBHOOK_URL` (required): The Slack webhook URL for sending notifications about the workflow's progress and outcome.
- `ACTION_PAT` (required): A GitHub Personal Access Token (PAT) with the necessary permissions to create pull requests in your repository.

## Example Usage

To use this workflow, you can create an example workflow file in your repository, such as `.github/workflows/release-preparation.yml`, with the following content:

```yaml
name: Release/pre-release Preparation.

on:
  workflow_dispatch:
    inputs:
      MESSAGE:
        description: 'Triggered for release or pe-release'
        required: false
        default: 'Release Preparation'
      RELEASE_TAG:
        description: 'tag to update'
        required: true
      SNAPSHOT_TAG:
        description: 'tag to be replaced'
        required: true
      BASE:
        description: 'base branch for PR'
        required: true
jobs:
  maven-release-preparation:
    uses: mosip/kattu/.github/workflows/release-changes.yml@master
    with:
      MESSAGE: ${{ inputs.MESSAGE }}
      RELEASE_TAG: ${{ inputs.RELEASE_TAG }}
      SNAPSHOT_TAG: ${{ inputs.SNAPSHOT_TAG }}
      BASE: ${{ inputs.BASE }}
    secrets:
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
      ACTION_PAT: ${{ secrets.ACTION_PAT }}
```