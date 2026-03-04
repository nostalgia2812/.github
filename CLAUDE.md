# CLAUDE.md

This file provides guidance for AI assistants (Claude, etc.) working in this repository.

## Repository Overview

This is the **`nostalgia2812/.github`** repository — a GitHub special repository that serves as the
organization-level default for community health files. Files placed here are automatically used as
defaults for any repository in the organization that does not define its own equivalent file.

Reference: [GitHub Docs — Creating a default community health file](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file)

## Repository Structure

```
.github/
├── CLAUDE.md                        # This file
├── README.md                        # Repo overview
├── CODE_OF_CONDUCT.md               # Contributor Covenant v2.1
├── CONTRIBUTING.md                  # PR/contribution guidelines
├── SECURITY.md                      # Security vulnerability reporting
├── profile/
│   └── README.md                    # Organization profile (shown on github.com/org)
├── config/
│   └── repolinter-ruleset.json      # Repolinter open-source policy checks
└── guides/
    └── ipynb/
        └── functional_api.ipynb     # Jupyter notebook guide (created via Colab)
```

## File Purposes

### Community Health Files
These files are picked up automatically by GitHub as organization-wide defaults:

| File | Purpose |
|------|---------|
| `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1; contact `support@github.com` for enforcement |
| `CONTRIBUTING.md` | Fork-clone-branch-PR workflow; references `script/bootstrap` and `script/cibuild` |
| `SECURITY.md` | Direct security reports to `opensource-security@github.com`; not via public issues |

### Organization Profile
`profile/README.md` renders as the public-facing organization profile page. It includes:
- Organization stats and milestones
- Key open source projects maintained by the org (GitHub CLI, Desktop, Git LFS, Primer)
- Links to roadmap, feedback, and careers pages

### Repolinter Configuration
`config/repolinter-ruleset.json` defines automated policy checks run by
[repolinter-action](https://github.com/newrelic/repolinter-action). Current rules (all `warning` level):

- **`license-file-is-MIT`** — Ensures `LICENSE` or `COPYING` file contains "MIT License"
- **`readme-file-exists`** — Ensures a `README` file is present
- **`codeowners-file-exists`** — Ensures a `CODEOWNERS` file is present

Auto-fixes are configured for each rule to create the missing file from a template URL if absent.

## Development Workflow

### Branch Naming
- Feature/AI branches follow the pattern: `claude/<description>-<session-id>`
- Default branch is `master`

### Contributing (from CONTRIBUTING.md)
1. Fork and clone the repository
2. Bootstrap dependencies: `script/bootstrap`
3. Verify CI locally: `script/cibuild`
4. Create a branch: `git checkout -b my-branch-name`
5. Make changes, add tests, ensure tests pass
6. Push and open a pull request

### Commit Style
Commit messages observed in this repo:
- Imperative mood, sentence case (e.g., `Capitalize the word git`)
- Prefixed with scope for docs changes (e.g., `docs: bump code of conduct version from 1.4 to 2.1`)
- Emojis used occasionally in profile/guide content but not typically in commit messages for governance files

## Key Conventions

### Editing Community Health Files
- `CODE_OF_CONDUCT.md` uses Contributor Covenant v2.1 — preserve the version attribution and links
- `SECURITY.md` — Security reports go to `opensource-security@github.com`, **not** public issues
- `CONTRIBUTING.md` — Contribution steps reference `script/bootstrap` and `script/cibuild` scripts
  (these live in individual repos, not here)

### Editing the Organization Profile
- `profile/README.md` is the public org profile; keep tone friendly and community-focused
- Statistics in the profile may become outdated — update with care and verify figures before committing

### Repolinter Ruleset
- JSON file must remain valid; note the trailing comma after the last rule block is **not** valid
  JSON — the existing file has this issue, so be cautious when editing `config/repolinter-ruleset.json`
- Schema is validated against `https://raw.githubusercontent.com/prototypicalpro/repolinter/master/rulesets/schema.json`

### Jupyter Notebooks
- `guides/ipynb/functional_api.ipynb` was created via Google Colab
- Edit using standard Jupyter tooling or the NotebookEdit tool

## What Not to Change

- Do not alter enforcement contact emails (`support@github.com`, `opensource-security@github.com`)
  without coordinating with the organization
- Do not change the Code of Conduct version attribution without updating to a newer Contributor
  Covenant release and verifying the new text
- The `profile/README.md` image URL references a GitHub CDN asset — do not replace it with
  an external URL

## No Build System / No Tests

This repository contains only documentation, configuration, and notebook files. There is:
- No package manager (no `package.json`, `Gemfile`, `requirements.txt`, etc.)
- No test suite
- No CI/CD pipeline defined in this repo (repolinter runs in individual repos via repolinter-action)

When the `CONTRIBUTING.md` references `script/bootstrap` and `script/cibuild`, those scripts
exist in the individual project repositories that adopt these community health files, not here.
