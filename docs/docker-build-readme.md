# Build Docker and Push Image to Docker Hub

## Purpose

This GitHub Actions workflow is designed to perform the following tasks:
1. Build a Docker image based on the provided service location.
2. Push the Docker image to Docker Hub.
3. Notify the team through Slack in case of any failures.

## Inputs

This workflow accepts the following inputs:

- `SERVICE_NAME` (Required, String): The name of your service.
- `SERVICE_LOCATION` (Required, String): The relative path to your service within the repository.
- `BUILD_ARTIFACT` (Optional, String): The name of the build artifact.
- `NPM_BUILD` (Optional, Boolean): Set to true if you want to build docker for NPM application.
- `ONLY_DOCKER` (Optional, Boolean): Set to true if you only want to build the Docker image with a GitHub artifact.
- `BASE_IMAGE_BUILD` (Optional, Boolean): Set to true for base image builds which skip certain Docker layer checks.
- `SQUASH_LAYERS` (Optional, String): If provided, squashes Docker image layers before pushing.
- `PLATFORMS` (Optional, String): Comma-separated list of platforms to build for (default: `linux/arm64,linux/amd64`).

## Secrets

This workflow requires the following secrets to be set in your GitHub repository:

- `RELEASE_DOCKER_HUB`: The Docker Hub repository where the image will be pushed.
- `ACTOR_DOCKER_HUB`: The Docker Hub username of the actor performing the push.
- `DEV_NAMESPACE_DOCKER_HUB`: The Docker Hub namespace or organization.
- `SLACK_WEBHOOK_URL`: The Slack webhook URL for notifications.

## Example Usage
Here is an example workflow that uses the build-dockers workflow:

* Docker build for maven application:

```yaml
jobs:
  build-docker:
    needs: <job-name>
    strategy:
      matrix:
        include:
          - SERVICE_LOCATION: '<SERVICE-LOCATION>'
            SERVICE_NAME: '<SERVICE-NAME>'
            BUILD_ARTIFACT: '<GITHUB-ARTIFACT-NAME>'
      fail-fast: false
    name: ${{ matrix.SERVICE_NAME }}
    uses: mosip/kattu/.github/workflows/docker-build.yml@master
    with:
      SERVICE_LOCATION: ${{ matrix.SERVICE_LOCATION }}
      SERVICE_NAME: ${{ matrix.SERVICE_NAME }}
      BUILD_ARTIFACT: ${{ matrix.BUILD_ARTIFACT }}
    secrets:
      DEV_NAMESPACE_DOCKER_HUB: ${{ secrets.DEV_NAMESPACE_DOCKER_HUB }}
      ACTOR_DOCKER_HUB: ${{ secrets.ACTOR_DOCKER_HUB }}
      RELEASE_DOCKER_HUB: ${{ secrets.RELEASE_DOCKER_HUB }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```
* Docker build for NPM application:
```yaml
jobs:
  build-docker:
    needs: <job-name>
    strategy:
      matrix:
        include:
          - SERVICE_LOCATION: '<SERVICE-LOCATION>'
            SERVICE_NAME: '<SERVICE-NAME>'
            BUILD_ARTIFACT: '<GITHUB-ARTIFACT-NAME>'
            NPM_BUILD: true
      fail-fast: false
    name: ${{ matrix.SERVICE_NAME }}
    uses: mosip/kattu/.github/workflows/docker-build.yml@master
    with:
      SERVICE_LOCATION: ${{ matrix.SERVICE_LOCATION }}
      SERVICE_NAME: ${{ matrix.SERVICE_NAME }}
      BUILD_ARTIFACT: ${{ matrix.BUILD_ARTIFACT }}
      NPM_BUILD: ${{ matrix.NPM_BUILD }}
    secrets:
      DEV_NAMESPACE_DOCKER_HUB: ${{ secrets.DEV_NAMESPACE_DOCKER_HUB }}
      ACTOR_DOCKER_HUB: ${{ secrets.ACTOR_DOCKER_HUB }}
      RELEASE_DOCKER_HUB: ${{ secrets.RELEASE_DOCKER_HUB }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```
* Docker build without GitHub artifacts.
```yaml
jobs:
  build-docker:
    needs: <job-name>
    strategy:
      matrix:
        include:
          - SERVICE_LOCATION: '<SERVICE-LOCATION>'
            SERVICE_NAME: '<SERVICE-NAME>'
      fail-fast: false
    name: ${{ matrix.SERVICE_NAME }}
    uses: mosip/kattu/.github/workflows/docker-build.yml@master
    with:
      SERVICE_LOCATION: ${{ matrix.SERVICE_LOCATION }}
      SERVICE_NAME: ${{ matrix.SERVICE_NAME }}
    secrets:
      DEV_NAMESPACE_DOCKER_HUB: ${{ secrets.DEV_NAMESPACE_DOCKER_HUB }}
      ACTOR_DOCKER_HUB: ${{ secrets.ACTOR_DOCKER_HUB }}
      RELEASE_DOCKER_HUB: ${{ secrets.RELEASE_DOCKER_HUB }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```
* Docker build with GitHub artifacts.
```yaml
jobs:
  build-docker:
    needs: <job-name>
    strategy:
      matrix:
        include:
          - SERVICE_LOCATION: '<SERVICE-LOCATION>'
            SERVICE_NAME: '<SERVICE-NAME>'
            BUILD_ARTIFACT: '<GITHUB-ARTIFACT-NAME>'
            ONLY_DOCKER: true
      fail-fast: false
    name: ${{ matrix.SERVICE_NAME }}
    uses: mosip/kattu/.github/workflows/docker-build.yml@master
    with:
      SERVICE_LOCATION: ${{ matrix.SERVICE_LOCATION }}
      SERVICE_NAME: ${{ matrix.SERVICE_NAME }}
      BUILD_ARTIFACT: ${{ matrix.BUILD_ARTIFACT || false }}
      ONLY_DOCKER: ${{ matrix.ONLY_DOCKER || false }}
    secrets:
      DEV_NAMESPACE_DOCKER_HUB: ${{ secrets.DEV_NAMESPACE_DOCKER_HUB }}
      ACTOR_DOCKER_HUB: ${{ secrets.ACTOR_DOCKER_HUB }}
      RELEASE_DOCKER_HUB: ${{ secrets.RELEASE_DOCKER_HUB }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```
## Docker Image Requirements

### Standard Docker Image Requirements

For regular images (when `BASE_IMAGE_BUILD` is false), the Dockerfile must contain:

#### 1. The following labels for tracking:
```dockerfile
ARG SOURCE
ARG COMMIT_HASH
ARG COMMIT_ID
ARG BUILD_TIME
LABEL source=${SOURCE}
LABEL commit_hash=${COMMIT_HASH}
LABEL commit_id=${COMMIT_ID}
LABEL build_time=${BUILD_TIME}
```
#### 2. 'mosip' user definition:
```dockerfile
ARG container_user=mosip
ARG container_user_group=mosip
ARG container_user_uid=1001
ARG container_user_gid=1001
ENV container_user=${container_user}
ENV container_user_group=${container_user_group}
ENV container_user_uid=${container_user_uid}
ENV container_user_gid=${container_user_gid}
WORKDIR /home/${container_user}
```
#### 3. Proper ownership and permissions:
```dockerfile
chown -R ${container_user}:${container_user} /home/${container_user}
USER ${container_user_uid}:${container_user_gid}
```
## Release Branch Restrictions

When building from release branches, the Dockerfile is checked for:

- No base images from `mosipdev` or `mosipqa` organizations.
- No use of `latest` or `develop` tags in base images.
## Multi-Platform Support

The workflow supports building for multiple platforms:

- **Default platforms**: `linux/arm64,linux/amd64`

- **For single platform builds**:
  - The image is built and pushed normally.
  -   If  `SQUASH_LAYERS`  is provided, each platform image is squashed.

- **For multi-platform builds**:
  - Each platform is built separately.
  - Images are tagged with platform-specific tags.
  - If `SQUASH_LAYERS` is provided, each platform image is squashed.
  - A manifest is created containing all platform images.
  - The manifest is pushed with the main tag.
