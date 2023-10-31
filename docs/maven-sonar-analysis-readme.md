# Maven Sonar Analysis Workflow

This workflow is designed to automate the process of analyzing a Maven project with SonarCloud.
The workflow involves setting up the build environment, performing the Sonar analysis, and notifying via Slack in case of job failure.

## Purpose

The purpose of this workflow is to perform the following tasks:
- Set up the build environment for a Maven project.
- Perform SonarCloud analysis on the Maven project.
- Notify via Slack in case of job failure.

## Inputs

This workflow accepts the following inputs:
- `SERVICE_LOCATION` (required): The location of the service to be analyzed.
- `SONAR_URL` (optional, default: 'https://sonarcloud.io'): URL of the Sonar server for analysis.
- `PROJECT_KEY` (optional, default: "mosip_${{ github.event.repository.name }}"): Project key for Sonar analysis. 

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:
- `SONAR_TOKEN` (required): Token for SonarCloud. 
- `ORG_KEY` (required): Organization key for SonarCloud.
- `OSSRH_USER` (required): User credentials for the OSSRH server.
- `OSSRH_SECRET` (required): Password for the OSSRH server.
- `OSSRH_TOKEN` (required): Token for the OSSRH server.
- `GPG_SECRET` (required): GPG secret for signing.
- `SLACK_WEBHOOK_URL` (required): Slack webhook URL for notifications.

## Example Usage

Here is an example workflow that uses the `Maven Sonar Analysis` workflow:
```yaml
name: Maven Package upon a push

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
  sonar_analysis:
    needs: build-maven-<SERVICE-NAME>
    if: "${{  github.event_name != 'pull_request' }}"
    uses: mosip/kattu/.github/workflows/maven-sonar-analysis.yml@master
    with:
      SERVICE_LOCATION: <SERVICE-LOCATION>
    secrets:
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      ORG_KEY: ${{ secrets.ORG_KEY }}
      OSSRH_USER: ${{ secrets.OSSRH_USER }}
      OSSRH_SECRET: ${{ secrets.OSSRH_SECRET }}
      OSSRH_TOKEN: ${{ secrets.OSSRH_TOKEN }}
      GPG_SECRET: ${{ secrets.GPG_SECRET }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```