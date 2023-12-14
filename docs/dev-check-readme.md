# standalone Check for developer

## Purpose

This GitHub Action checks if specified dependencies in a Maven project are marked outside the current development version in the POM file.
It also provides an option to skip certain dependencies and specify expected versions for others.

## Inputs
This workflow accepts the following inputs:
-  `REPO_URL` (required): The GitHub repository URL in the format '<github-account-name>/<repo-name>'.
-  `REPO_BRANCH` (required): The branch in the repository to target for the workflow.
-  `MESSAGE` (optional, default: 'dependency check'): A custom message describing the purpose of the workflow run.
-  `SKIP_DEPENDENCIES` (optional, default: ''): A list of dependencies to be skipped during the check.
-  `DEPENDENCY_VERSIONS` (optional, default: ''): Specify versions for specific dependencies in the format 'dependency1=version1,dependency2=version2'.
-  `SLACK_WEBHOOK_URL` (required): The Slack webhook URL for receiving notifications.

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:
- `SLACK_WEBHOOK_URL` (required): The Slack webhook URL for sending notifications about the workflow's progress and outcome.

## Example Usage

To use this workflow, you can create an example workflow file in your repository, such as `.github/workflows/dev-check.yml`, with the following content:
```yaml
# .github/workflows/dependency-check.yml

name: Dependency Check

on:
  workflow_dispatch:
    inputs:
      REPO_URL:
        description: '<github-account-name>/<repo-name>'
        required: true
        type: string
      REPO_BRANCH:
        required: true
        type: string
      MESSAGE:
        description: 'Triggered For Dependency Check'
        required: false
        type: string
        default: 'dependency check'
      SKIP_DEPENDENCIES:
        description: 'List of dependencies to be skipped'
        required: false
        type: string
        default: ''
      DEPENDENCY_VERSIONS:
        description: 'Specify versions for specific dependencies'
        required: false
        type: string
        default: ''

    secrets:
      SLACK_WEBHOOK_URL:
        required: true

jobs:
  check-dependencies:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v2
        with:
          repository: ${{ inputs.REPO_URL }}
          ref: ${{ inputs.REPO_BRANCH }}
      - name: Setup branch and env
        run: |
          # Strip git ref prefix from version
          echo "BRANCH_NAME=$(echo ${{ github.ref }} | sed -e 's,.*/\(.*\),\1,')" >> $GITHUB_ENV
          echo "GPG_TTY=$(tty)" >> $GITHUB_ENV          

      - name: Set up JDK
        uses: actions/setup-java@v2
        with:
          distribution: 'adopt'
          java-version: '11'

      - name: Install xmlstarlet and xmllint
        run: |
          sudo apt-get update
          sudo apt-get install xmlstarlet libxml2-utils 

      - name: Check if dependencies are marked outside the current development version in the POM file.
        run: |
          # Find all pom.xml files
          pomfiles=$(find ./ -type f -name "*pom.xml")

          skipped_dependencies=${{ inputs.SKIP_DEPENDENCIES }}
          IFS=' ' read -ra dependency_versions <<< "$DEPENDENCY_VERSIONS"

          # Function to resolve a version and check if it's marked outside the current development version
          resolve_version() {
            local version=$1
            local pomfile=$2

            if [[ " ${skipped_dependencies[@]} " =~ " $version " ]]; then
              echo "Skipping VERSION $version based on user input (SKIP_DEPENDENCIES)"
            else
              output=$(grep -oPm1 "(?<=<${version}>)[^<]+" "$pomfile" || echo "ERROR")

              if [[ $output == "ERROR" ]]; then
                echo "VERSION $version not found; EXITING"
                exit 1
              elif [[ $output != *"-SNAPSHOT"* ]]; then
                if [[ ${dependency_versions["$version"]} ]]; then
                  expected_version="${dependency_versions["$version"]}"
                  if [[ "$output" != *"$expected_version"* ]]; then
                    echo "Mismatch for VERSION $version; Expected: $expected_version, Actual: $output; EXITING"
                    exit 1
                  fi
                else
                  echo "VERSION '$version' is marked outside the current development version; EXITING"
                  exit 1
                fi
              fi
            fi
          }

          for pomfile in $pomfiles; do
            echo "===================================== $pomfile =========================================="
            # Use grep to extract dependency versions
            for v in "${dependency_versions[@]}"; do
              echo -e "\nv=$v"
              resolve_version "$v" "$pomfile"
            done
          done

      - uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,author,commit,workflow,job # selectable (default: repo,message)
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # required
        if: failure() # Pick up events even if the job fails or is canceled.

```