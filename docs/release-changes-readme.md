# Release/Pre-release Preparation Workflow

## Purpose

This workflow is designed to prepare a release or pre-release by automating several tasks.
It's especially useful for updating version numbers, creating pull requests, and making necessary adjustments in your project.
The workflow can be customized to fit your release process, such as handling Maven dependencies, updating README badges, and preparing the project for release.

## Inputs

This workflow accepts the following inputs:
- `REPO_URL` (required): Name of the owner of the repository and repository name
- `REPO_BRANCH` (required): The name of the branch for which release changes need to be made.
- `RELEASE_TAG` (required): The tag associated with the release you're preparing.
- `SNAPSHOT_TAG` (required): The tag that needs to be replaced during the preparation.
- `BASE` (required): The base branch for creating a pull request.

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:
- `SLACK_WEBHOOK_URL` (required): The Slack webhook URL for sending notifications about the workflow's progress and outcome.
- `ACTION_PAT` (required): A GitHub Personal Access Token (PAT) with the necessary permissions to create pull requests in your repository.

## Example Usage

To use this workflow, you can create an example workflow file in your repository, such as `.github/workflows/release-preparation.yml`, with the following content:
```yaml
name: Release/pre-release Preparation.

on:
  workflow_dispatch:
    inputs:
      REPO_URL:
        description: 'Repo URL ( EX. mosip/< repo name > )'
        required: true
      REPO_BRANCH:
        description: 'Repo Branch'
        required: true
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
      REPO_URL: ${{ inputs.REPO_URL }}
      REPO_BRANCH: ${{ inputs.REPO_BRANCH }}
      RELEASE_TAG: ${{ inputs.RELEASE_TAG }}
      SNAPSHOT_TAG: ${{ inputs.SNAPSHOT_TAG }}
      BASE: ${{ inputs.BASE }}
    secrets:
      ACTION_PAT: ${{ secrets.ACTION_PAT }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_MOSIP_WEBHOOK_URL }}
```
