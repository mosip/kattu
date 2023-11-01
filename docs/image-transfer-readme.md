# Manual Workflow to Transfer Docker Images

This workflow is designed to automate the process of transferring Docker images to a specified Docker Hub destination organization.
It uses GitHub Actions to facilitate the image transfer.

## Purpose

The purpose of this workflow is to perform the following tasks:

1. Update the configuration file `config.yml` with Docker Hub credentials and the destination organization.
2. Push Docker images to the destination organization on Docker Hub. 
3. Notify the status of the workflow via Slack.

## Inputs

This workflow accepts the following inputs:
- `DESTINATION_ORGANIZATION`(required): The Docker Hub destination organization where you want to transfer the images.

## Secrets

This workflow requires the following secrets to be stored in your GitHub repository:
- `USERNAME`: Destination accounts Docker Hub username.
- `TOKEN`: Destination accounts Hub token for authentication.
- `SLACK_WEBHOOK_URL`: The Slack webhook URL for notifications.

## Example Usage

Here is an example workflow that uses the `Image transfer` workflow:
```
name:  Manual workflow to transfer images

on:
  workflow_dispatch:
    inputs:
      USERNAME:
        description: 'provide docker hub username'
        required: false
        default: ''
        type: string
      TOKEN:
        description: 'provide docker hub token'
        required: false
        default: ''
        type: string
      DESTINATION_ORGANIZATION:
        description: 'provide docker hub destination org'
        required: true
        default: ''
        type: string

jobs:
  Image-transfer:
    needs: chk_token
    uses: mosip/kattu/.github/workflows/image-transfer.yml@master
    with:
      DESTINATION_ORGANIZATION: ${{ inputs.DESTINATION_ORGANIZATION }}
    secrets:
      USERNAME: "${{ secrets[needs.chk_token.outputs.USERNAME] || inputs.USERNAME }}"
      TOKEN: "${{ secrets[needs.chk_token.outputs.TOKEN] || inputs.TOKEN }}"
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```