# Tagging of Repos Workflow

## Purpose

This workflow automates the process of creating GitHub releases by applying tags to your repositories.
It provides the flexibility to create both regular releases and pre-releases while allowing you to customize the release's body message.
The workflow can be triggered based on your specific release criteria.

## Inputs

The workflow accepts the following inputs:

- `TAG` (required): The tag that you want to create and publish.
- `BODY` (optional, default: 'Changes in this Release'): A custom message for the release body, describing the changes in this release.
- `PRE_RELEASE` (required, default: False): A boolean (True/False) indicating whether the release is a pre-release or not.
- `DRAFT` (optional, default: False): A boolean (True/False) indicating whether the release should be a draft.

## Secrets

To use this workflow, you need to provide the following secret:

- `SLACK_WEBHOOK_URL` (required): The Slack webhook URL for sending notifications about the workflow's progress and outcome.

## Example Usage

Here's an example of how you can use this workflow to create a release:

```yaml
name: Tagging of repos

on:
  workflow_dispatch:
    inputs:
      TAG:
        description: 'Tag to be published'
        required: true
        type: string
      BODY:
        description: 'Release body message'
        required: true
        default: 'Changes in this Release'
        type: string
      PRE_RELEASE:
        description: 'Pre-release? True/False'
        required: true
        default: False
        type: string
      DRAFT:
        description: 'Draft? True/False'
        required: false
        default: False
        type: string

jobs:
  tag-branch:
    uses: mosip/kattu/.github/workflows/tag.yml@master
    with:
      TAG: ${{ inputs.TAG }}
      BODY: ${{ inputs.BODY }}
      PRE_RELEASE: ${{ inputs.PRE_RELEASE }}
      DRAFT: ${{ inputs.DRAFT }}
    secrets:
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```