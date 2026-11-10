# PR Gate Workflow

A single, consolidated **reusable** PR gate (`workflow_call`) that MOSIP services call from their
own repositories. It replaces per-repo copies of secret scanning, dependency review, workflow
linting, Trivy scanning, SAST and Codecov coverage with one pinned, centrally-maintained gate.

**Design goals**

- **Findings appear on the PR itself** (comments / inline annotations), not in the Security tab.
- **Silent when clean** — a check that finds nothing posts nothing.
- **Blocking depends on the target branch.** Every scan runs and reports on every PR, but only PRs
  into protected branches (default `master,main,develop,release-*`) can be failed by it.

The gate has two tiers:

- **Tier 1 — Security (always runs, in parallel):** secret scan, dependency CVE review, workflow
  lint, Trivy filesystem scan, Trivy config/IaC scan, Semgrep SAST, and — when a `Dockerfile` is
  present — a Trivy scan of the base images it builds `FROM`.
- **Tier 2 — Stack-specific (conditional):** a `detect` job checks for stack marker files at the
  locations you declare, then only the relevant jobs run — Java / Go / npm / Android / Flutter
  coverage (Codecov), SpotBugs + Find Security Bugs and a Maven PGP signature check for Java, and
  Android Lint for Android.

> **If you only remember four things:**
> 1. Trigger the caller on `pull_request`.
> 2. Grant the token **`contents: write`, `pull-requests: write`, `security-events: write` and
>    `checks: write`** (all four are required — see §5).
> 3. Make secrets reachable (`secrets: inherit`) and point each `*_SERVICE_LOCATION` at the right folder.
> 4. Enable the repository's **Dependency graph** (Settings → Advanced Security), or `dependency-review` fails.

---

## 1. Quick start

Single-stack repo (everything at the repo root):

```yaml
name: PR Gate
on:
  pull_request:
    types: [opened, reopened, synchronize]
  push:
    branches: [develop]        # optional but recommended — see "Triggers" below

permissions:
  contents: write              # detect job commits a stack-detection cache on push
  pull-requests: write         # PR comments and inline review comments
  security-events: write       # SARIF uploads to the Security tab (non-PR runs only)
  checks: write                # reviewdog check-run annotations

jobs:
  pr-gate:
    uses: mosip/kattu/.github/workflows/pr-gate.yml@master   # pin to a tag/SHA for production
    secrets: inherit
```

With `SERVICE_LOCATION` defaulting to `.`, the gate auto-detects whichever stacks live at the repo
root and runs only those jobs.

### Triggers

| Trigger | Required? | Effect |
|---|---|---|
| `pull_request` | **Yes** | Runs every scan and posts findings on the PR. |
| `push` to the default branch | Optional, recommended | Uploads SARIF to the Security tab and refreshes the stack-detection cache `.pr-gate-cache.json`. |
| `workflow_dispatch` (via a small caller stub) | Optional | Full-backlog run: SARIF is uploaded to the Security tab like a push run, and the SpotBugs report is also uploaded as a workflow artifact. |

The cache is an optimisation only: if it is missing, or the bot cannot push it (for example a
branch-protected default branch), PRs simply detect stacks live. A PR whose own diff touches a stack
marker file (`pom.xml`, `go.mod`, `package.json`, `settings.gradle*`, `pubspec.yaml`, a
`Dockerfile` or `Dockerfile.*`) always detects live, so a new stack is scanned immediately. The
cache also records the `*_SERVICE_LOCATION` inputs it was built with and the commit it was
built from. A PR ignores the cache if its caller passes different inputs, if the cache's source
commit is missing (for example a cache written by an older version of the gate), or if any marker
file changed between that commit and the PR — which also covers a stale cache left behind when the
bot's cache commit was rejected.

---

## 2. Inputs

All inputs are **optional** — sensible defaults are applied. Set only what your repo needs.

| Input | Type | Default | What it does |
|---|---|---|---|
| `SERVICE_LOCATION` | string | `.` | Base path used by every stack **unless** a type-specific override below is set. |
| `JAVA_SERVICE_LOCATION` | string | `''` -> `SERVICE_LOCATION` | Folder containing `pom.xml`. |
| `GO_SERVICE_LOCATION` | string | `''` -> `SERVICE_LOCATION` | Folder containing `go.mod`. |
| `NPM_SERVICE_LOCATION` | string | `''` -> `SERVICE_LOCATION` | Folder containing `package.json`. |
| `ANDROID_SERVICE_LOCATION` | string | `''` -> `SERVICE_LOCATION` | Folder containing `settings.gradle` / `settings.gradle.kts`. |
| `FLUTTER_SERVICE_LOCATION` | string | `''` -> `SERVICE_LOCATION` | Folder containing `pubspec.yaml`. |
| `JAVA_VERSION` | number | `21` | Temurin JDK version for the Java, SpotBugs and Android jobs. |
| `NODE_VERSION` | string | `'20'` | Node.js version for the npm coverage job. |
| `FLUTTER_VERSION` | string | `''` (latest stable) | Flutter SDK version; empty = latest of the `stable` channel. |
| `SCAN_SEVERITY` | string | `'HIGH,CRITICAL'` | Trivy severities that are reported and gated on. |
| `trivy_comment_mode` | string | `'full'` | `full` = comment on, and gate on, all current HIGH/CRITICAL; `diff` = comment on, and gate on, only findings **newly introduced** by the PR (existing findings neither appear nor block). A finding counts as the same only if package, CVE, target file and installed version all match. |
| `NPM_COVERAGE_COMMAND` | string | `'npm test -- --coverage'` | Command that runs tests and emits coverage. Override for non-Jest runners, e.g. `npx vitest run --coverage`. |
| `SPOTBUGS_COMMENT_MODE` | string | `'diff'` | `diff` = the SpotBugs comment lists only findings newly introduced vs the PR's base; `full` = every current finding on every PR. |
| `PROTECTED_BRANCHES` | string | `'master,main,develop,release-*'` | Comma-separated glob patterns of PR **base** branches that enforce blocking. See §3. |

### How location resolution works

For each stack: **use the type-specific input if it is non-empty, otherwise fall back to
`SERVICE_LOCATION`.** A stack's Tier-2 jobs run **only if its marker file exists** at the resolved
location:

| Stack | Marker file checked | Jobs |
|---|---|---|
| Java | `<loc>/pom.xml` | `coverage-java`, `spotbugs-security`, `verify-maven-signatures` (pgpverify) |
| Go | `<loc>/go.mod` | `coverage-go` |
| npm | `<loc>/package.json` | `coverage-npm` |
| Android | `<loc>/settings.gradle` or `settings.gradle.kts` | `coverage-android`, `android-lint` |
| Flutter | `<loc>/pubspec.yaml` | `coverage-flutter` |

If the marker isn't found, that job is skipped silently — a repo only pays for the stacks it has.

---

## 3. What blocks, what only reports

Every job runs and reports on every PR. Whether a failure can **fail the PR** depends on the PR's
**base branch** matched against `PROTECTED_BRANCHES`:

| PR targets… | Behaviour |
|---|---|
| A protected branch (default `master`, `main`, `develop`, `release-*`) | Blocking jobs below fail the PR. |
| Any other branch | Same scans, same comments — but nothing fails the PR. |

| Job | Can block on a protected branch? | How findings are shown |
|---|---|---|
| `secret-scan` (gitleaks) | Yes | Inline review comments on lines the PR adds. Scans only the PR's own commits. |
| `dependency-review` | Yes | GitHub's dependency-review summary comment, only on failure. |
| `lint-workflows` (actionlint) | Yes | Inline review comments. |
| `trivy-fs` | Yes (HIGH/CRITICAL) | Sticky PR comment. |
| `coverage-*` (tests, then Codecov upload) | Yes (failing tests, install errors, upload errors) | Codecov's own status checks. |
| `trivy-config`, `semgrep`, `trivy-image-scan` | No | reviewdog check-run annotations. |
| `spotbugs-security` | No | Sticky PR comment with a "how to fix" link per finding. |
| `verify-maven-signatures` | No | Sticky PR comment. |
| `android-lint` | No | Report uploaded as the `android-lint-report` workflow artifact. |

Override the list per caller to match your own branch naming:

```yaml
with:
  PROTECTED_BRANCHES: 'main,release-*'
```

### Comments are silent when clean

A check with nothing to report posts nothing. The Trivy, SpotBugs and pgpverify sticky comments are
**removed** automatically once a later push makes them clean.

### Security tab

SARIF is uploaded to the repository Security tab **only on events other than `pull_request`**
(that is, on `push` and `workflow_dispatch` runs). Findings on an open PR never create Security-tab
entries; they exist only as PR comments/annotations.

### Known limitation: separate reviewdog check entries

`trivy-config`, `semgrep` and each `trivy-image-*` scan publish their annotations through reviewdog's
check-run reporter, which creates its **own check entry** next to the job (named `semgrep`,
`trivy-config`, `trivy-image-<image>`). GitHub marks that entry as failed whenever it has findings,
independent of the job's pass/fail. These entries do not affect the job result or merge ability
unless your branch protection lists them as required checks — do not add them as required checks.

---

## 4. Secrets

All secrets are declared `required: false`. In a `workflow_call`, secrets do **not** flow
automatically — use `secrets: inherit` (recommended) or map each one explicitly.

| Secret | Needed by | Notes |
|---|---|---|
| `CODECOV_LICENSE` | **All coverage jobs** | Codecov v4+ requires a token even for public repos. On protected-branch PRs a missing token makes the coverage job go red. |
| `OSSRH_USER` / `OSSRH_SECRET` | `coverage-java`, `spotbugs-security`, `verify-maven-signatures` | Needed only if the Maven build resolves dependencies from OSSRH (e.g. SNAPSHOT/staging). Injected into a generated `settings.xml`. |
| `GITLEAKS_LICENSE` | — | **No longer used.** Secret scanning runs the open-source gitleaks CLI. Still declared so existing callers that pass it keep working. |

---

## 5. Caller-side requirements (checklist)

These are things the **calling workflow / caller repo** must provide — the gate cannot set them for you.

- [ ] **Trigger on `pull_request`.** Comments and annotations need PR context.
- [ ] **Grant all four token permissions.** A reusable workflow's token can never exceed the
      caller's, so set at the caller (workflow- or job-level):
      ```yaml
      permissions:
        contents: write          # detect job commits the stack-detection cache on push
        pull-requests: write     # PR comments / inline review comments
        security-events: write   # SARIF upload to the Security tab (non-PR runs)
        checks: write            # reviewdog check-run annotations
      ```
      Omitting any of them makes the run fail at startup with "the nested job … is requesting
      '<perm>: write', but is only allowed '<perm>: read'". `contents: write` is requested even if
      you trigger on `pull_request` only; on a PR run the gate does not write to your repository.
- [ ] **Enable the Dependency graph** (Settings → Advanced Security) — `dependency-review` fails
      without it.
- [ ] **Make secrets reachable** — `secrets: inherit`, with `CODECOV_LICENSE` (and, for Maven,
      `OSSRH_USER` / `OSSRH_SECRET`) available as org/repo secrets.
- [ ] **Declare each stack's location** via the matching `*_SERVICE_LOCATION` input (see §2).
- [ ] **Do not reuse the gate's concurrency group.** The gate cancels a PR's superseded run using the
      group `pr-gate-<caller workflow name>-<PR number>`; don't define the same group on your caller.
      Push runs get a unique group, so they are never cancelled or dropped.
- [ ] **Satisfy the per-stack project prerequisites** below.

---

## 6. Per-stack project prerequisites

### Java (`coverage-java`)
- `pom.xml` at the Java location.
- **JaCoCo must be configured** so `mvn verify` produces `**/target/site/jacoco/jacoco.xml`. No
  JaCoCo report -> nothing to upload -> the upload step fails.
- `OSSRH_USER` / `OSSRH_SECRET` if the build pulls from OSSRH.

### SpotBugs + Find Security Bugs (`spotbugs-security`)
- Needs no `pom.xml` changes: the plugin is invoked ad hoc and analyses compiled bytecode, so the
  project must compile (`mvn compile`).
- In `diff` mode on a PR, findings are compared with the PR's base per (rule, file) by **count**:
  occurrences up to the base's count are treated as pre-existing, any beyond that are listed as new.
  Line numbers are ignored on purpose. Known gap: a PR that removes one occurrence of a rule in a
  file and adds another in the same file looks unchanged. The count of pre-existing findings is
  stated in the comment.
- If SpotBugs itself exits with an error, the comment says so and that the result is not a clean
  one, instead of staying silent.
- If the **base** branch cannot be built or scanned, the comment lists all findings and says so. If the **PR
  head** cannot be compiled, the scan is skipped: a one-line "SpotBugs was skipped" note replaces
  any earlier SpotBugs comment (so it cannot show stale findings), plus a warning in the job log
  and summary. It never fails the PR for a build problem.
- SpotBugs runs in the same Maven invocation as `compile`, so sibling modules of a multi-module
  project resolve from the build. If it finishes without writing a report, the job logs a warning
  so a missing report is not mistaken for a clean result.
- Non-blocking, always.

### Maven signature check (`verify-maven-signatures` / pgpverify)
- Runs automatically whenever a `pom.xml` is present. **Non-blocking** — posts a sticky `pgpverify`
  comment listing unsigned / invalid / untrusted / missing-key dependencies, only when there are any.
- Expect a **large first comment** unless you configure a PGP keys map, since most transitive deps
  are unsigned.

### Go (`coverage-go`)
- `go.mod` at the Go location; tests present.
- The job runs `go test -coverprofile=coverage.out -covermode=atomic ./...`.

### npm (`coverage-npm`)
- `package.json` at the npm location. The package manager is chosen from the committed lockfile:
  `package-lock.json` -> `npm ci`, `yarn.lock` -> `yarn install` (frozen), `pnpm-lock.yaml` ->
  `pnpm install --frozen-lockfile`, none -> `npm install`. Dependency caching is used for npm and yarn.
- Your `NPM_COVERAGE_COMMAND` must emit **`coverage/lcov.info`**.
  - Jest: the default `npm test -- --coverage` works if `lcov` is in `coverageReporters`.
  - **Vitest:** set `NPM_COVERAGE_COMMAND: 'npx vitest run --coverage'` **and** install
    `@vitest/coverage-v8` (matching your Vitest major) as a dev dependency.

### Android (`coverage-android`, `android-lint`)
- `settings.gradle` / `settings.gradle.kts` at the Android location; a committed Gradle wrapper.
- A `jacocoTestReport` task producing `**/build/reports/jacoco/**/*.xml` (the job runs
  `./gradlew testDebugUnitTest jacocoTestReport`).

### Flutter (`coverage-flutter`)
- `pubspec.yaml` at the Flutter location; tests under `test/`.
- The job runs `flutter pub get` then `flutter test --coverage`, producing `coverage/lcov.info`.
- Optionally pin the SDK via `FLUTTER_VERSION`.

### Container images (`trivy-image-scan`, `trivy-config`)
- Runs when a `Dockerfile*` is present. Every `FROM` image is scanned for **OS-package**
  vulnerabilities; application dependencies are covered by `trivy-fs`.
- `FROM` lines are parsed conservatively: flags such as `--platform=...` are ignored, build-stage
  aliases and `scratch` are skipped, and `ARG` defaults declared before the first `FROM` are
  substituted. A reference that stays unresolved (for example `FROM ${BASE}` with no default) is
  skipped, and any value containing characters that are not valid in an image reference is
  discarded — image names come from the repository's files and are never executed.
- An image that cannot be pulled (for example a private registry) produces a warning and is
  skipped; it does not fail the job.
- At most 3 images are scanned in parallel.

---

## 7. Behavior on fork PRs

On pull requests from forks the `GITHUB_TOKEN` is read-only, so the **Trivy**, **SpotBugs** and
**pgpverify** sticky-comment steps **auto-skip** (they compare head/base repo `full_name`, not
`head.repo.fork`). Scans and coverage jobs still run.

---

## 8. Resource usage

A gate run is 15 jobs when every stack is present, plus one `trivy-image-scan` job per distinct
base image; the number of images is not capped, only how many scan at once (3). `trivy-config` and
`semgrep` start immediately; the other jobs wait for `detect`. On a Java repository the sandbox runs
peaked at about 12 jobs at the same time. A new push to a PR cancels that PR's still-running gate. Because GitHub's concurrent-job limit is shared across an
organization's repositories, many PRs raised at once can queue behind each other — keep this in
mind before enabling the gate on every repository at once.

---

## 9. Example: esignet (multi-stack)

esignet ships Go and an npm UI, so it sets two locations and a Vitest coverage command:

```yaml
name: PR Gate
on:
  pull_request:
    types: [opened, reopened, synchronize]

permissions:
  contents: write
  pull-requests: write
  security-events: write
  checks: write

jobs:
  pr-gate:
    uses: mosip/kattu/.github/workflows/pr-gate.yml@master   # pin to a tag/SHA for production
    with:
      SERVICE_LOCATION: '.'
      GO_SERVICE_LOCATION: 'esignet-service'
      NPM_SERVICE_LOCATION: 'oidc-ui'
      NPM_COVERAGE_COMMAND: 'npx vitest run --coverage'
    secrets: inherit
```

esignet-side prerequisites that are **not** kattu changes:
- `oidc-ui` uses Vitest — its coverage needs `@vitest/coverage-v8` (matching the Vitest major) installed.
- `CODECOV_LICENSE` must be available as an org secret (it is, via `secrets: inherit`).

> Note: with `SERVICE_LOCATION: '.'`, if a `pom.xml` exists at the repo root the Java jobs run there
> even without `JAVA_SERVICE_LOCATION`. Set `JAVA_SERVICE_LOCATION` explicitly when the POM you want
> covered is in a subfolder.

---

## 10. What this replaces

Repos adopting the gate can retire standalone copies of: secret scanning, Trivy fs/config scanning,
dependency review, actionlint, Semgrep, and per-stack Codecov upload workflows — the gate covers all
of them behind one pinned entry point.
