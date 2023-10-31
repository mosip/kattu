# NPM Build Workflow

## Purpose

This workflow automates the build process for NPM-based projects. It's designed to simplify the build and deployment of web applications that use NPM as their build tool. The key tasks of this workflow include installing project dependencies, building the application, zipping the build artifacts, and uploading them.

## Inputs

This workflow requires the following inputs:
- `BUILD_ARTIFACT` (required): The name of the build artifact that will be generated.
- `SERVICE_LOCATION` (required): The location of the project to be built.

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:
- `SLACK_WEBHOOK_URL` (required): A Slack webhook URL for notifications. This enables the workflow to report status updates to a Slack channel.

## Example Usage

You can include this workflow in your repository as follows:
```yaml
name: NPM Build Workflow Example

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
  build-admin-ui:
    uses: mosip/kattu/.github/workflows/npm-build.yml@master
    with:
      SERVICE_LOCATION: <SERVICE-LOCATION>
      BUILD_ARTIFACT: <GITHUB-ARTIFACT-NAME>
    secrets:
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

```