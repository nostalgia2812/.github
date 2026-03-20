# Tooling System Architecture

> nostalgia2812 organization - Security Tools Filing System
> Branch: `claude/tooling-filing-system-uG7Gs`

## Overview

The nostalgia2812 tooling system provides a unified filing and integration architecture across 11 security, pentesting, and development tool repositories. The `.github` repository serves as the **central hub** coordinating all tools.

## Repository Hierarchy

```
nostalgia2812/
├── .github (central hub)          ← YOU ARE HERE
│   ├── .tooling/                  # Machine-readable catalog
│   │   ├── tool_manifest.json     # Full tool metadata
│   │   └── categories.json        # Categorization schema
│   ├── .github/workflows/         # Org-wide CI/CD
│   │   ├── tool-validation.yml    # Daily tool validation
│   │   ├── security-scan.yml      # Secret & vuln scanning
│   │   └── integration-tests.yml  # Cross-tool testing
│   ├── scripts/                   # Management scripts
│   │   ├── install_all.sh         # Full installation
│   │   ├── update_all.sh          # Update all tools
│   │   └── check_health.sh        # Health verification
│   ├── config/                    # Shared configurations
│   │   ├── gitleaks.toml          # Gitleaks ruleset
│   │   ├── pre-commit-config.yaml # Pre-commit hooks
│   │   └── tool-defaults.json     # Default config values
│   ├── docs/                      # Documentation
│   │   ├── ARCHITECTURE.md        # This file
│   │   ├── WORKFLOWS.md           # Workflow guide
│   │   └── ONBOARDING.md          # Developer onboarding
│   └── TOOLS_INDEX.md             # Human-readable catalog
│
├── Secret Scanning
│   ├── gitleaks/                  # Git secret scanning
│   │   └── .tooling/tool.json
│   └── trufflehog/                # Deep credential hunting
│       └── .tooling/tool.json
│
├── Network Security
│   └── aircrack-ng/               # WiFi security suite
│       └── .tooling/tool.json
│
├── Web Application Testing
│   ├── beef/                      # Browser exploitation
│   │   └── .tooling/tool.json
│   ├── commix/                    # Command injection
│   │   └── .tooling/tool.json
│   └── w3af/                      # Web vulnerability scanner
│       └── .tooling/tool.json
│
├── Threat Intelligence
│   └── deepdarkCTI/               # Dark web CTI
│       └── .tooling/tool.json
│
├── Firmware Analysis
│   └── unblob/                    # Binary extraction
│       └── .tooling/tool.json
│
├── Development Frameworks
│   ├── adk-python/                # AI agent development
│   │   └── .tooling/tool.json
│   └── firebase-framework-tools/  # Web deployment
│       └── .tooling/tool.json
│
└── Knowledge Bases
    └── the-book-of-secret-knowledge/
        └── .tooling/tool.json
```

## Tool Categorization Model

Each tool repository contains a `.tooling/tool.json` metadata file linking it back to the central manifest. This enables:

1. **Decentralized metadata** - each repo owns its own tool description
2. **Centralized discovery** - the `.github` repo aggregates all metadata
3. **Consistent schema** - all tool metadata follows the same JSON schema

## Workflow Architecture

### Security Pipeline Flow

```
Developer Commit
      │
      ▼
┌─────────────────────────────────────────────────┐
│ Pre-commit Hooks (local)                        │
│  • gitleaks protect --staged                    │
│  • shellcheck (shell scripts)                   │
│  • validate-yaml / validate-json                │
└─────────────────────────────────────────────────┘
      │
      ▼ (on push to PR)
┌─────────────────────────────────────────────────┐
│ GitHub Actions - security-scan.yml              │
│  • Gitleaks full scan (SARIF → Security tab)    │
│  • TruffleHog diff scan                         │
│  • Dependency vulnerability scan (Trivy)        │
│  • Static analysis (ShellCheck, JSON/YAML lint) │
│  • Supply chain verification                    │
└─────────────────────────────────────────────────┘
      │
      ▼ (on merge to main)
┌─────────────────────────────────────────────────┐
│ GitHub Actions - tool-validation.yml            │
│  • Validate manifest files                      │
│  • Validate scripts syntax                      │
│  • Check repository accessibility               │
│  • Install & test Go tools                      │
└─────────────────────────────────────────────────┘
      │
      ▼ (weekly scheduled)
┌─────────────────────────────────────────────────┐
│ GitHub Actions - integration-tests.yml          │
│  • End-to-end tool installation tests           │
│  • Cross-tool integration validation            │
│  • Catalog consistency checks                   │
└─────────────────────────────────────────────────┘
```

### Daily Automated Checks

| Schedule | Workflow | Purpose |
|----------|----------|---------|
| Daily 06:00 UTC | tool-validation.yml | Ensure manifests are valid, repos accessible |
| On every push | security-scan.yml | Scan for secrets and vulnerabilities |
| Weekly Sun 02:00 UTC | security-scan.yml | Full history secret scan |
| Weekly Wed 04:00 UTC | integration-tests.yml | Full integration test suite |

## Data Flow

### Tool Metadata Flow

```
Individual repo .tooling/tool.json
        │
        │ (referenced by)
        ▼
.github/.tooling/tool_manifest.json  ←── Single source of truth
        │
        ├──► .github/TOOLS_INDEX.md (human-readable)
        ├──► .github/.tooling/categories.json (categorization)
        ├──► GitHub Actions workflows (validation)
        └──► scripts/check_health.sh (health checks)
```

### Configuration Flow

```
.github/config/gitleaks.toml
        │
        └──► All repos via:
             • Pre-commit hooks
             • GitHub Actions (gitleaks-action)
             • Manual scans

.github/config/pre-commit-config.yaml
        │
        └──► Deployed to each repo via:
             • scripts/install_all.sh (setup_precommit_hooks)
             • Developer onboarding guide
```

## Integration Points

### Between Tools

| Tool A | Integration Type | Tool B |
|--------|-----------------|--------|
| Gitleaks | Pre-commit + CI | All repos |
| TruffleHog | CI/CD pipeline | All repos |
| w3af | Initial scan | Commix (follow-up injection testing) |
| BeEF | Client-side | Commix (server-side) |
| Unblob | Extraction | Aircrack-ng (wireless firmware analysis) |
| DeepDarkCTI | IOC feeds | All security tools |
| ADK Python | Automation | Any tool with CLI/API |

### External Systems

| System | Integration |
|--------|------------|
| GitHub Security tab | SARIF uploads from Gitleaks, TruffleHog, Trivy |
| MISP | DeepDarkCTI threat intelligence feeds |
| SIEM | Log aggregation from all tool outputs |
| Metasploit | BeEF and Commix integration |
| Burp Suite | Commix and w3af proxy integration |

## File Naming Conventions

| Pattern | Purpose |
|---------|---------|
| `*.json` in `.tooling/` | Machine-readable metadata |
| `*.md` in `docs/` | Human-readable documentation |
| `*.sh` in `scripts/` | Operational scripts |
| `*.toml` in `config/` | Tool configuration files |
| `*.yaml` in `config/` | CI/CD and hook configurations |
| `*.yml` in `.github/workflows/` | GitHub Actions workflows |

## Adding a New Tool

1. Create repository under `nostalgia2812/` organization
2. Add `.tooling/tool.json` to the new repository
3. Add entry to `.github/.tooling/tool_manifest.json`
4. Add entry to relevant category in `.github/.tooling/categories.json`
5. Add section to `.github/TOOLS_INDEX.md`
6. Add installation function to `scripts/install_all.sh`
7. Add update function to `scripts/update_all.sh`
8. Add health check to `scripts/check_health.sh`
9. Update GitHub Actions workflows if needed

## Versioning

The tooling system uses semantic versioning:
- `manifest_version` in `tool_manifest.json`
- `schema_version` in `categories.json`
- Git tags for major system updates

Current versions:
- Tool Manifest: `1.0.0`
- Categories Schema: `1.0.0`
- System Branch: `claude/tooling-filing-system-uG7Gs`
