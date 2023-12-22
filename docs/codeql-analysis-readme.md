# CodeQL Analysis Workflow

## Purpose

This workflow is designed to perform the following tasks:
1. This GitHub Actions workflow is used for performing `CodeQL` analysis on the repository.
2. `CodeQL` is a powerful code analysis tool that helps to detect security vulnerabilities and code quality issues in various programming languages (i.e., cpp, csharp, go, java, javascript, python, ruby).
3. This workflow automates the process of code analysis using CodeQL.

## Example Usage

Here is an example workflow that uses the `codeql-analysis` workflow:
```
name: "CodeQL"

on:
  release:
    types: [published]
  pull_request:
    types: [opened]
  workflow_dispatch:
    inputs:
      message:
        description: 'Message for manually triggering'
        required: false
        default: 'Triggered for Updates'
        type: string
  push:
    branches:
      - '!

jobs:
  analyze:
    uses: mosip/kattu/.github/workflows/codeql-analysis.yml@master
```