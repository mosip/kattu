# NPM Sonar Analysis Workflow

## Purpose

This workflow automates the process of performing SonarQube code analysis on a `Node.js` project using npm.
It is designed to help maintain the code quality and identify issues in the codebase.
The workflow includes steps to install `Node.js` dependencies, build the project, run Sonar analysis, and send Slack notifications based on the analysis results.

## Inputs

This workflow accepts the following inputs:
- `SERVICE_LOCATION` (required): The location of the `Node.js` project for which you want to run SonarQube analysis.
- `SONAR_URL` (optional, default: 'https://sonarcloud.io'): The URL of the SonarQube server. You can change this URL if you are using a custom SonarQube server.
- `PROJECT_KEY` (optional, default: "mosip_{{ github.event.repository.name }}"): The unique project key for SonarQube analysis.

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:
- `SONAR_TOKEN` (required): The authentication token for SonarQube, allowing the workflow to send analysis results to your SonarQube server.
- `ORG_KEY` (required): The organization key associated with your SonarQube project.
- `SLACK_WEBHOOK_URL` (required): A Slack webhook URL for notifications. This enables the workflow to report status updates to a Slack channel.

## Example Usage

You can include this workflow in your repository as follows:
```yaml
name: NPM Sonar Analysis Workflow Example
on:
  release:
    types: [published]
  pull_request:
    types: [opened, reopened, synchronize]
  workflow_dispatch:
    inputs:
      message:
        description: 'Message for manually triggering'
        required: false
        default: 'Triggered for Updates'
        type: string
  push:
    branches:
      - <BRANCH-1>
      - <BRANCH-2>
      - <BRANCH-N>

jobs:
    sonar-analysis:
      needs: build-<NPM-APP>
      if: "${{ github.event_name != 'pull_request' }}"
      uses: mosip/kattu/.github/workflows/npm-sonar-analysis.yml@master
      with:
        SERVICE_LOCATION: <SERVICE-LOCATION>
        SONAR_URL: 'https://sonarcloud.io'
        PROJECT_KEY: 'mosip_${{ github.event.repository.name }}'
      secrets:
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        ORG_KEY: ${{ secrets.ORG_KEY }}
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```