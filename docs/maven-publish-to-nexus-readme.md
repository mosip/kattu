# Publish to Nexus Workflow

This workflow is designed to automate the process of publishing Maven packages to Nexus for a specific service in the MOSIP project. 
It includes tasks related to setting up the build environment, publishing Maven packages, and notifying via Slack in case of job failure. 
The workflow is triggered under specific conditions.

## Purpose

The purpose of this workflow is to perform the following tasks:
- Configure the build environment for Maven.
- Set up the required branch and environment variables.
- Import GPG public keys for signing packages.
- Prepare the settings file for the OSSRH server.
- Publish Maven packages to Nexus.
- Notify via Slack in case of job failure.

## Inputs

This workflow accepts the following input:
- `SERVICE_LOCATION` (required): The location of the service to be published.

## Secrets

This workflow requires the following secrets to be set:
- `OSSRH_USER` (required): User credentials for the OSSRH server.
- `OSSRH_SECRET` (required): Password for the OSSRH server.
- `OSSRH_URL` (required): URL for the OSSRH server.
- `OSSRH_TOKEN` (required): Token for the OSSRH server.
- `GPG_SECRET` (required): GPG secret for signing.
- `SLACK_WEBHOOK_URL` (required): Slack webhook URL for notifications.

## Example Usage

Here is an example workflow that uses the `Publish to Nexus` workflow:
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
  publish_to_nexus:
    needs: build-maven-<SERVICE-NAME>
    if: "${{ !contains(github.ref, 'master') && github.event_name != 'pull_request' }}"
    uses: mosip/kattu/.github/workflows/maven-publish-to-nexus.yml@master
    with:
      SERVICE_LOCATION: <SERVICE-LOCATION>
    secrets:
      OSSRH_USER: ${{ secrets.OSSRH_USER }}
      OSSRH_SECRET: ${{ secrets.OSSRH_SECRET }}
      OSSRH_URL: ${{ secrets.OSSRH_SNAPSHOT_URL }}
      OSSRH_TOKEN: ${{ secrets.OSSRH_TOKEN }}
      GPG_SECRET: ${{ secrets.GPG_SECRET }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```