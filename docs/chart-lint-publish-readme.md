# chart-lint-publish

## Purpose

This workflow is designed to perform the following tasks:
1. Validate Helm charts in pull requests by checking for changes in the Helm chart directory.
2. Generate a list of charts that are modified in the base branch compared to the pull request branch.
3. Optionally include or exclude specific charts from validation.
4. Publish Helm charts to a Helm chart repository on successful validation.

## Inputs

This workflow accepts the following inputs:
- `CHARTS_DIR` (required, string): The directory containing Helm charts.
- `CHARTS_URL` (required, string): The URL of the Helm chart repository.
- `REPOSITORY` (required, string): The name of the GitHub repository.
- `BRANCH` (required, string): The target branch for publishing Helm charts.
- `LINTING_CHART_SCHEMA_YAML_URL` (required, string): URL for Helm chart schema validation YAML.
- `LINTING_LINTCONF_YAML_URL` (required, string): URL for Helm chart lint configuration YAML.
- `LINTING_CHART_TESTING_CONFIG_YAML_URL` (required, string): URL for Helm chart testing configuration YAML.
- `LINTING_HEALTH_CHECK_SCHEMA_YAML_URL` (required, string): URL for Helm chart health check schema YAML.
- `IGNORE_CHARTS` (required, string): A list of charts to be ignored during validation.
- `CHART_PUBLISH` (required, string): Set to "NO" to skip chart publishing, or "YES" to enable chart publishing.
- `INCLUDE_ALL_CHARTS` (required, string): Set to "YES" to include all charts, or "NO" to exclude them.

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:
- `TOKEN` (required): GitHub token to publish helm charts to the specific repository.
- `SLACK_WEBHOOK_URL` (required): Slack webhook URL for notifications.

## Workflow Execution

The workflow consists of the following steps:

1. **Validate Helm Charts in Pull Requests**: Validates Helm charts in pull requests by checking for chart changes. A list of charts is generated.
    - This step runs when the event is a pull request.

2. **Get Helm Charts List**: Retrieves a list of Helm charts to validate or publish.
    - This step runs when the event is not a pull request.

3. **Validate / Publish Helm Charts**: Uses the `mosip/helm-gh-pages` action to validate and publish Helm charts.
    - This step includes linting and chart publication based on the input settings.

## Example Usage

Here is an example workflow that uses the `chart-lint-publish` workflow:
```yaml
name: Validate / Publish helm charts

on:
   release:
      types: [published]
   pull_request:
      types: [opened, reopened, synchronize]
      paths:
         - 'charts/**'
   workflow_dispatch:
      inputs:
         IGNORE_CHARTS:
            description: 'Provide list of charts to be ignored separated by pipe(|)'
            required: false
            default: ''
            type: string
         CHART_PUBLISH:
            description: 'Chart publishing to gh-pages branch'
            required: false
            default: 'NO'
            type: string
            options:
               - YES
               - NO
         INCLUDE_ALL_CHARTS:
            description: 'Include all charts for Linting/Publishing (YES/NO)'
            required: false
            default: 'NO'
            type: string
            options:
               - YES
               - NO
   push:
      branches:
         - <BRANCH-1>
         - <BRANCH-2>
         - <BRANCH-N>
      paths:
         - '<CHART-DIR>/**'
jobs:
   chart-lint-publish:
      uses: mosip/kattu/.github/workflows/chart-lint-publish.yml@master
      with:
         CHARTS_DIR: charts
         CHARTS_URL: https://mosip.github.io/mosip-helm
         REPOSITORY: mosip-helm
         BRANCH: gh-pages
         INCLUDE_ALL_CHARTS: "${{ inputs.INCLUDE_ALL_CHARTS || 'NO' }}"
         IGNORE_CHARTS: "${{ inputs.IGNORE_CHARTS ||'reporting|reporting-init|activemq-artemis' }}"
         CHART_PUBLISH: "${{ inputs.CHART_PUBLISH || 'YES' }}"
         LINTING_CHART_SCHEMA_YAML_URL: "https://raw.githubusercontent.com/mosip/kattu/master/.github/helm-lint-configs/chart-schema.yaml"
         LINTING_LINTCONF_YAML_URL: "https://raw.githubusercontent.com/mosip/kattu/master/.github/helm-lint-configs/lintconf.yaml"
         LINTING_CHART_TESTING_CONFIG_YAML_URL: "https://raw.githubusercontent.com/mosip/kattu/master/.github/helm-lint-configs/chart-testing-config.yaml"
         LINTING_HEALTH_CHECK_SCHEMA_YAML_URL: "https://raw.githubusercontent.com/mosip/kattu/master/.github/helm-lint-configs/health-check-schema.yaml"
      secrets:
         TOKEN: ${{ secrets.ACTION_PAT }}
         SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```