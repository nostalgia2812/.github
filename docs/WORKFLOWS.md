# CI/CD Workflows Reference

> nostalgia2812 Security Tools - GitHub Actions Workflow Documentation
> Branch: `claude/tooling-filing-system-uG7Gs`

## Overview

The nostalgia2812 tooling system uses three primary GitHub Actions workflows, all defined in `.github/workflows/`. Each serves a distinct purpose in the automated security and quality pipeline.

## Workflow Summary

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| Tool Validation | `tool-validation.yml` | Daily + on push | Validates manifests, scripts, tool repos |
| Security Scan | `security-scan.yml` | Every push + weekly | Secret scanning, vulnerability detection |
| Integration Tests | `integration-tests.yml` | Weekly + on demand | End-to-end tool installation and testing |

---

## Tool Validation Workflow

**File:** `.github/workflows/tool-validation.yml`

### Triggers

- **Daily:** 06:00 UTC (via cron schedule)
- **On push:** To `main` or `claude/**` branches, when scripts or tooling files change
- **On PR:** To `main` branch
- **Manual:** Via workflow dispatch with optional tool filter

### Jobs

#### `validate-manifests`
Validates the JSON catalog files for schema correctness and cross-referential integrity.

| Check | Description |
|-------|-------------|
| `tool_manifest.json` schema | Required fields present for all tools |
| `categories.json` schema | All tool references exist in manifest |
| `TOOLS_INDEX.md` completeness | All tools appear in human-readable index |

#### `validate-scripts`
Lints all shell scripts and verifies runtime behavior.

| Check | Description |
|-------|-------------|
| ShellCheck | Static analysis with warning severity |
| Executable bit | All `.sh` files must be executable |
| Dry run | Health check runs without external dependencies |

#### `check-tool-repos`
Uses GitHub API to verify all 11 tool repositories are accessible (runs in parallel matrix).

#### `install-go-tools`
Actually installs Gitleaks and TruffleHog in the CI environment and runs a self-scan.

### Usage

```bash
# Trigger manually via GitHub CLI
gh workflow run tool-validation.yml

# Trigger with specific tools filter
gh workflow run tool-validation.yml -f tools="gitleaks,trufflehog"
```

---

## Security Scan Workflow

**File:** `.github/workflows/security-scan.yml`

### Triggers

- **On every push:** To main, claude/**, feature/**, fix/** branches
- **On PR:** To `main` branch
- **Weekly:** Sundays at 02:00 UTC (full history scan)
- **Manual:** Via workflow dispatch

### Jobs

#### `gitleaks-scan`
Runs Gitleaks secret detection with full git history access.

- Uses `gitleaks/gitleaks-action@v2` (official action)
- Falls back to Docker run if action unavailable
- Uploads SARIF results to GitHub Security tab
- Results visible at: Repository → Security → Code scanning

**Configuration:** Uses `config/gitleaks.toml` for custom rules and allowlists.

#### `trufflehog-scan`
Deep credential hunting with TruffleHog.

- Scans diff between base branch and HEAD on PRs
- On scheduled runs: scans full git history with `--only-verified`
- Uses official `trufflesecurity/trufflehog@main` action

#### `dependency-scan`
Vulnerability scanning for project dependencies.

- Python: `safety check` against requirements files
- General: Trivy filesystem scan for CRITICAL/HIGH CVEs
- Results uploaded to GitHub Security tab as SARIF

#### `static-analysis`
Code quality enforcement.

| Tool | Target | Severity |
|------|--------|---------|
| ShellCheck | All `*.sh` files | Error |
| JSON validator | All `*.json` files | Error |
| YAML validator | All `*.yml/*.yaml` files | Error |

#### `supply-chain`
Verifies tool catalog integrity and action pinning.

- All tools in manifest must have license information
- Checks for unpinned GitHub Actions (should use `@vX.Y.Z` not `@latest`)

### SARIF Integration

Security scan results flow to GitHub Security tab:

```
Gitleaks scan → gitleaks-report.sarif → Security tab (category: gitleaks)
TruffleHog   → (via action)          → Security tab (category: trufflehog)
Trivy scan   → trivy-results.sarif   → Security tab (category: trivy)
```

View at: `https://github.com/nostalgia2812/.github/security/code-scanning`

---

## Integration Tests Workflow

**File:** `.github/workflows/integration-tests.yml`

### Triggers

- **Weekly:** Wednesdays at 04:00 UTC
- **On push:** To `main` or `claude/**` when scripts/tooling changes
- **On PR:** To `main` branch
- **Manual:** With optional `test_suite` parameter

### Test Suite Parameter

```yaml
# Via GitHub UI: Actions → Integration Tests → Run workflow → test_suite
# Options: all | secret-scanning | network-security | web-testing | firmware-analysis | dev-frameworks
```

### Jobs

#### `test-secret-scanning`
End-to-end test of Gitleaks and TruffleHog:

1. Installs both tools via Go
2. Creates synthetic test repository with known-fake secrets
3. Runs Gitleaks detection (should find fake secrets)
4. Runs TruffleHog detection
5. Tests pre-commit configuration

#### `test-firmware-analysis`
Tests Unblob with a real binary:

1. Installs system dependencies (lzop, zstd, lz4, unar)
2. Installs Unblob via pip
3. Creates a compressed test binary (gzip)
4. Runs Unblob extraction
5. Verifies output directory structure

#### `test-dev-frameworks`
Validates development framework tools:

1. Installs `google-adk` and tests import
2. Installs Firebase CLI and checks version
3. Validates dev framework entries in tool manifest

#### `test-catalog-integration`
Cross-validates all catalog files:

1. Loads manifest, categories, and TOOLS_INDEX.md
2. Verifies all manifest tools appear in at least one category
3. Verifies all category tool references exist in manifest
4. Verifies all category IDs from manifest exist in categories.json
5. Generates a catalog summary report

### Test Artifacts

Test results are uploaded as GitHub Actions artifacts:
- `secret-scanning-results/` - JSON results from secret scanning tests
- Retained for 30 days

---

## Adding a New Workflow

When adding a new GitHub Actions workflow for the tooling system:

1. Place the file in `.github/workflows/`
2. Follow naming convention: `{purpose}.yml` (kebab-case)
3. Add SARIF upload if the workflow performs security scanning
4. Add a summary entry to `$GITHUB_STEP_SUMMARY`
5. Include the workflow in this documentation

### Workflow Template

```yaml
name: Your Workflow Name

on:
  push:
    branches: [main, 'claude/**']
  workflow_dispatch:

jobs:
  your-job:
    name: Descriptive Job Name
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # Your steps here

      - name: Generate summary
        if: always()
        run: |
          echo "# Your Workflow Results" >> $GITHUB_STEP_SUMMARY
          echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> $GITHUB_STEP_SUMMARY
```

## Secrets and Variables Required

Configure these in repository/organization settings:

| Secret/Variable | Used By | Description |
|----------------|---------|-------------|
| `GITHUB_TOKEN` | All workflows | Auto-provided by GitHub Actions |
| `GITLEAKS_LICENSE` | security-scan.yml | Optional: Gitleaks Pro license |

## Status Badges

Add to your README:

```markdown
[![Tool Validation](https://github.com/nostalgia2812/.github/actions/workflows/tool-validation.yml/badge.svg)](https://github.com/nostalgia2812/.github/actions/workflows/tool-validation.yml)
[![Security Scan](https://github.com/nostalgia2812/.github/actions/workflows/security-scan.yml/badge.svg)](https://github.com/nostalgia2812/.github/actions/workflows/security-scan.yml)
[![Integration Tests](https://github.com/nostalgia2812/.github/actions/workflows/integration-tests.yml/badge.svg)](https://github.com/nostalgia2812/.github/actions/workflows/integration-tests.yml)
```
