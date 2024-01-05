# Sonar Analysis via Gradlew Workflow

## Purpose

This workflow is designed to perform the following tasks:
1. Analyze a project using SonarCloud with Gradlew.
2. Generate code quality reports.
3. Send Slack notifications in case of job failure.

## Inputs

This workflow accepts the following inputs:
- `SERVICE_LOCATION`: The location of the service or project.
- `ANDROID_LOCATION`: The location of the Android project within the service.
- `SONAR_URL`: (Optional) The URL of the Sonar server (default: https://sonarcloud.io).
- `PROJECT_KEY`: (Optional) The key of the Sonar project (default: "mosip_${{ github.event.repository.name }}").
- `PROJECT_NAME`: (Optional) The name of the Sonar project (default: "${{ github.event.repository.name }").
- `SONAR_ARGS`: (Optional) Additional arguments for Sonar analysis.

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:
- `SONAR_TOKEN`: The authentication token for accessing SonarQube.
- `SONAR_ORGANIZATION`: The organization name on SonarQube.
- `SLACK_WEBHOOK_URL`: The URL for sending Slack notifications.

## Example Usage

Here is an example workflow that uses the `Sonar Analysis via Gradlew` workflow:
```yaml
name: Gradlew sonar-analysis
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
  sonar-analysis-<app-name>:
    if: "${{ github.event_name != 'pull_request' }}"
    needs: <app-build-job-name>
    uses: mosip/kattu/.github/workflows/gradlew-sonar-analysis.yml@master
    with:
      SERVICE_LOCATION: 'mosip-sbi-capacitor'
      ANDROID_LOCATION: 'android'
      SONAR_URL: 'https://sonarcloud.io'
      PROJECT_KEY: "mosip_${{ github.event.repository.name }}"
      PROJECT_NAME: "${{ github.event.repository.name }}"
    secrets:
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
      SONAR_ORGANIZATION: ${{ secrets.ORG_KEY }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```