# Post Release Changes Workflow

## Purpose
This workflow is designed to prepare a post-release changes by automating the task. It's especially useful for updating RELEASE_URL to OSSRH_SNAPSHOT_URL and creating pull requests in your project. The workflow can be customized to fit your post-release process.

## Inputs
This workflow accepts the following inputs:
- REPO_URL (required): Name of the owner of the repository and repository name
- REPO_BRANCH (required): The name of the branch for which release changes need to be made.
- BASE (required): The base branch for creating a pull request.

## Secrets
This workflow requires the following secrets to be set in your GitHub repository:
- `SLACK_WEBHOOK_URL` (required): The Slack webhook URL for sending notifications about the workflow's progress and outcome.
- `ACTION_PAT` (required): A GitHub Personal Access Token (PAT) with the necessary permissions to create pull requests in your repository.

## Example Usage
To use this workflow, you can create an example workflow file in your repository, such as .github/workflows/post-release-changes.yml, with the following content:
```yaml
name: Post-Release Preparation.

on:
  workflow_dispatch:
    inputs:
      REPO_URL:
        description: 'Repo URL ( EX. mosip/< repo name > )'
        required: true
      REPO_BRANCH:
        description: 'Repo Branch'
        required: true
      BASE:
        description: 'base branch for PR'
        required: true
jobs:
  maven-post-release-preparation:
    uses: mosip/kattu/.github/workflows/post-release-changes.yml@master
    with:
      REPO_URL: ${{ inputs.REPO_URL }}
      REPO_BRANCH: ${{ inputs.REPO_BRANCH }}
      BASE: ${{ inputs.BASE }}
    secrets:
      ACTION_PAT: ${{ secrets.ACTION_PAT }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_MOSIP_WEBHOOK_URL }}
```