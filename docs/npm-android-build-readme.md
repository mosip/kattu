# Android Build via Gradlew Workflow

This workflow is designed to automate the build process for an Android project using the Gradlew build tool.
It includes tasks like checking out the repository, installing dependencies, building the APK, verifying the build, and uploading the resulting APK as an artifact.

## Inputs

This workflow accepts the following inputs:
- `SERVICE_LOCATION` (required): The location of the project to be built.
- `ANDROID_LOCATION` (optional, default: 'false'): The subdirectory where the Android project is located within the service location.
- `BUILD_ARTIFACT` (required): The name of the artifact to be created.
- `GRADLEW_ARGS` (optional): Additional arguments to pass to the Gradlew build.

## Secrets

This workflow requires the following secret:
- `SLACK_WEBHOOK_URL` (required): Slack webhook URL for notifications.

## Environment Variables

This workflow uses the following environment variable:
- `ANDROID_HOME`: The path to the Android SDK installation directory.

## Example Usage

Here is an example workflow that uses the `Android Build via Gradlew` workflow:
```yaml
name: Gradlew build
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
  build-mosip-sbi-capacitor:
    uses: mosip/kattu/.github/workflows/npm-android-build.yml@master
    with:
      SERVICE_LOCATION: 'mosip-sbi-capacitor'
      ANDROID_LOCATION: 'android'
      BUILD_ARTIFACT: mosip-sbi-capacitor
      GRADLEW_ARGS: 'clean build test'
    secrets:
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```