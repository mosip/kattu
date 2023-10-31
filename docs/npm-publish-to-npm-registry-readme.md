# NPM Publish to NPM Registry Workflow

## Purpose

This workflow automates the process of publishing an NPM package to the NPM registry.
It's designed to simplify the publication process for NPM packages and allows you to control the publishing based on your project's requirements.
The workflow handles NPM package installation, Android build, verification, publishing, tagging, and provides Slack notifications.

## Inputs

This workflow accepts the following inputs:
- `SERVICE_LOCATION` (required): The location of the NPM package to be published.
- `ANDROID_LOCATION` (optional): The location of the Android build if applicable, or set to 'false' if not needed.
- `GRADLEW_ARGS` (optional): Additional arguments for the Android Gradle build.

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:
- `NPM_AUTH_TOKEN` (required): The NPM authentication token to allow publishing to the NPM registry.
- `SLACK_WEBHOOK_URL` (required): A Slack webhook URL for notifications. This enables the workflow to report status updates to a Slack channel.

## Example Usage

You can include this workflow in your repository as follows:
```yaml
name: Gradlew build, publish to npm registry
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

  publish-mosip-sbi-capacitor-to-npm-registry:
    if: "${{ !contains(github.ref, 'master') && github.event_name != 'pull_request' }}"
    needs: build-mosip-<SERVICE-NAME>
    uses: mosip/kattu/.github/workflows/npm-publish-to-npm-registry.yml@master
    with:
      SERVICE_LOCATION: '<SERVICE-LOCATION>'
      ANDROID_LOCATION: '<ANDROID-SERVICE-LOCATION>'
      GRADLEW_ARGS: '<ADDITIONAL-CLI-ARGS>'
    secrets:
      NPM_AUTH_TOKEN: ${{ secrets.NPM_AUTH_TOKEN }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```