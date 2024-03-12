# Developer Pre-Release Check Workflow

## Usage

This workflow performs pre-release checks for a GitHub repository. It checks for artifacts and dependencies and verifies a dynamically provided artifact version.

### Inputs

To trigger this workflow, the user needs to provide the following inputs:

- `REPO_URL` (required): GitHub account name and repository name (e.g., `<github-account-name>/<repo-name>`).
- `REPO_BRANCH` (required): Branch name to perform the pre-release check.
- `VERSION` (required): Version to check for dynamically provided artifacts.

### Secrets

The workflow requires the following secrets to be set in your GitHub repository:

- `SLACK_WEBHOOK_URL` (required): Slack webhook URL for notifications.
- `ACTION_PAT` (required): Personal Access Token (PAT) with appropriate permissions.

### Example Usage

To use this workflow, you can create an example workflow file in your repository, such as `.github/workflows/dev-pre-release-check.yml`, with the following content:

```yaml
name: Developer Pre-Release Check

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
      VERSION:
        description: 'version_to_check'
        required: true
    secrets:
      SLACK_WEBHOOK_URL:
        required: true
      ACTION_PAT:
        required: true
jobs:
  pre-release-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          repository: ${{ inputs.REPO_URL }}
          ref: ${{ inputs.REPO_BRANCH }}
      - name: Setup branch and env
        run: |
          # Strip git ref prefix from version
          echo "BRANCH_NAME=$(echo ${{ github.ref }} | sed -e 's,.*/\(.*\),\1,')" >> $GITHUB_ENV
          echo "GPG_TTY=$(tty)" >> $GITHUB_ENV
      - name: Change to each subdirectory and run Maven command
        run: |
          for folder in */; do
            if [ -f "$folder/pom.xml" ]; then
              echo "Checking artifacts and dependencies in $folder"
              (cd "$folder" && mvn dependency:tree -Dincludes=io.mosip.* | awk '/\[INFO\]/{print} !/Progress|Downloaded from central:/ && !/Downloading from/')
            fi
          done
      - name: Check Dynamically Provided Artifact Version
        run: |
          # Script to check dynamically provided artifact version
          version_to_check="${{ inputs.VERSION }}"
          if ! grep -r -E "<artifactId>io.mosip[^<]+</artifactId>|<version>${version_to_check}</version>" --include="pom.xml" . | \
          grep "<version>${version_to_check}</version>" | awk -F: '{printf "%-70s %s\n", $1, $2}'; then
            echo "Error: Dynamically provided artifact version '${version_to_check}' not found for io.mosip artifacts."
            exit 1
          fi
      - uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,author,commit,workflow,job # selectable (default: repo,message)
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }} # required
        if: failure() # Pick up events even if the job fails or is canceled.
