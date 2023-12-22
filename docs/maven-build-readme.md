# Maven Build Workflow

This workflow is designed to automate the Maven build process for a specific service in the `MOSIP` project.
It includes tasks related to setting up the build environment, building the project, and uploading artifacts.
The workflow can be triggered when certain conditions are met.

## Purpose

The purpose of this workflow is to perform the following tasks:
- Build the specified service using Maven.
- Perform checks related to the project's licenses, developers, and plugins.
- Validate the `pom.xml` and `settings.xml` files.
- Create an executable JAR and upload it as an artifact.
- Notify via Slack in case of job failures.

## Inputs

This workflow accepts the following inputs:
- `SERVICE_LOCATION` (required): The location of the service to be built.
- `BUILD_ARTIFACT` (required): The name of the build artifact.

## Secrets

This workflow requires the following secrets to be set:
- `OSSRH_USER` (required): User credentials for the OSSRH server.
- `OSSRH_SECRET` (required): Password for the OSSRH server.
- `OSSRH_TOKEN` (required): Token for the OSSRH server.
- `GPG_SECRET` (required): GPG secret for signing.
- `SLACK_WEBHOOK_URL` (required): Slack webhook URL for notifications.

## Example Usage

Here is an example workflow that uses the `Maven build` workflow:
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
  build-maven-digitalcard:
    uses: mosip/kattu/.github/workflows/maven-build.yml@master
    with:
      SERVICE_LOCATION: <SERVICE-LOCATION>
      BUILD_ARTIFACT: <GITHUB-ARTIFACT-NAME>
    secrets:
      OSSRH_USER: ${{ secrets.OSSRH_USER }}
      OSSRH_SECRET: ${{ secrets.OSSRH_SECRET }}
      OSSRH_TOKEN: ${{ secrets.OSSRH_TOKEN }}
      GPG_SECRET: ${{ secrets.GPG_SECRET }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```
