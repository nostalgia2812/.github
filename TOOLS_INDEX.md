# Security Tools Index - nostalgia2812 Organization

> A comprehensive catalog of security, pentesting, and development tools maintained by the nostalgia2812 organization.

**Last Updated:** 2026-03-20
**Total Tools:** 11
**Branch:** `claude/tooling-filing-system-uG7Gs`

---

## Table of Contents

- [Secret Scanning](#-secret-scanning)
- [Network Security](#-network-security)
- [Web Application Testing](#-web-application-testing)
- [Threat Intelligence](#-threat-intelligence)
- [Firmware Analysis](#-firmware-analysis)
- [Development Frameworks](#-development-frameworks)
- [Knowledge Bases](#-knowledge-bases)
- [Quick Reference](#quick-reference)
- [Integration Guide](#integration-guide)

---

## Secret Scanning

Tools for detecting hardcoded secrets, credentials, and sensitive data in source code and git history.

### Gitleaks
| Attribute | Value |
|-----------|-------|
| **Repository** | [nostalgia2812/gitleaks](https://github.com/nostalgia2812/gitleaks) |
| **Language** | Go |
| **License** | MIT |
| **Priority** | Critical |
| **Status** | Active / Production |

**Description:** SAST tool for detecting hardcoded secrets like passwords, API keys, and tokens in git repositories. Supports pre-commit hooks, CI/CD pipelines, and Docker.

**Key Features:**
- Scans git history, staged files, and working directories
- Highly configurable via `.gitleaks.toml`
- Fast, parallelized scanning engine
- 140+ built-in secret detection rules
- GitHub Actions native integration

**Quick Start:**
```bash
# Install
go install github.com/gitleaks/gitleaks/v8@latest

# Scan current repository
gitleaks detect --source . --verbose

# Scan git history
gitleaks detect --source . --log-opts="--all"

# Use as pre-commit hook
gitleaks protect --staged
```

**Integration:** Pre-commit hooks, GitHub Actions, GitLab CI, Jenkins

---

### TruffleHog
| Attribute | Value |
|-----------|-------|
| **Repository** | [nostalgia2812/trufflehog](https://github.com/nostalgia2812/trufflehog) |
| **Language** | Go |
| **License** | AGPL-3.0 |
| **Priority** | Critical |
| **Status** | Active / Production |

**Description:** Searches through git repositories for secrets by digging deep into commit history and branches. Excels at credential hunting across entire git history.

**Key Features:**
- Deep git history scanning
- 700+ credential detectors
- Real-time verification of found credentials
- S3 bucket, filesystem, and GitHub scanning
- Docker image available

**Quick Start:**
```bash
# Install
go install github.com/trufflesecurity/trufflehog/v3@latest

# Scan a GitHub repo
trufflehog github --repo https://github.com/nostalgia2812/target-repo

# Scan local git repo
trufflehog git file://. --since-commit HEAD~10 --only-verified

# Docker usage
docker run --rm -it -v "$PWD:/pwd" ghcr.io/trufflesecurity/trufflehog:latest git file:///pwd --only-verified
```

**Integration:** Pre-commit hooks, GitHub Actions, GitLab CI

---

## Network Security

Tools for network assessment, wireless security testing, and traffic analysis.

### Aircrack-ng
| Attribute | Value |
|-----------|-------|
| **Repository** | [nostalgia2812/aircrack-ng](https://github.com/nostalgia2812/aircrack-ng) |
| **Language** | C |
| **License** | GPL-2.0 |
| **Priority** | High |
| **Status** | Active / Production |

**Description:** Complete suite of tools to assess WiFi network security. Covers monitoring, attacking, testing, and cracking for WPA/WPA2/WEP networks.

**Included Tools:**
- `airmon-ng` - Enable/disable monitor mode
- `airodump-ng` - Packet capture
- `aireplay-ng` - Packet injection
- `aircrack-ng` - WEP/WPA key cracker
- `airdecap-ng` - Decrypt WEP/WPA capture files

**Quick Start:**
```bash
# Install (Debian/Ubuntu)
sudo apt-get install aircrack-ng

# Put interface in monitor mode
sudo airmon-ng start wlan0

# Capture packets
sudo airodump-ng wlan0mon

# Crack captured handshake
aircrack-ng -w wordlist.txt capture.cap
```

**Integration:** Standalone, automated testing frameworks

---

## Web Application Testing

Tools for testing web application security including injection attacks, browser exploitation, and automated scanning.

### BeEF (Browser Exploitation Framework)
| Attribute | Value |
|-----------|-------|
| **Repository** | [nostalgia2812/beef](https://github.com/nostalgia2812/beef) |
| **Language** | Ruby |
| **License** | Apache-2.0 |
| **Priority** | High |
| **Status** | Active / Production |

**Description:** Penetration testing tool focusing on web browser vulnerabilities. Hooks browsers and allows execution of attack modules via JavaScript.

**Key Features:**
- Browser hooking via JavaScript
- 300+ attack modules
- Metasploit integration
- RESTful API for automation
- Network map visualization

**Quick Start:**
```bash
# Install dependencies
sudo apt-get install ruby-full
gem install bundler

# Clone and setup
cd beef && bundle install

# Start BeEF
./beef

# Access UI at http://127.0.0.1:3000/ui/panel
```

**Integration:** Standalone, Metasploit, Burp Suite

---

### Commix
| Attribute | Value |
|-----------|-------|
| **Repository** | [nostalgia2812/commix](https://github.com/nostalgia2812/commix) |
| **Language** | Python |
| **License** | GPL-3.0 |
| **Priority** | High |
| **Status** | Active / Production |

**Description:** Automated all-in-one OS command injection and exploitation tool for web applications.

**Key Features:**
- Classic, timing-based, and file-based injection techniques
- Supports GET/POST parameters, HTTP headers, cookies
- Reverse shell generation
- Burp Suite log file support
- Tamper scripts for WAF bypass

**Quick Start:**
```bash
# Install
pip3 install commix
# OR
git clone https://github.com/commixproject/commix.git

# Basic scan
python3 commix.py --url="http://target.com/page.php?id=1"

# With POST data
python3 commix.py --url="http://target.com/login.php" --data="username=admin&password=test"

# With Burp Suite log
python3 commix.py --requestfile=/path/to/request.txt
```

**Integration:** Standalone, Burp Suite, Metasploit

---

### w3af
| Attribute | Value |
|-----------|-------|
| **Repository** | [nostalgia2812/w3af](https://github.com/nostalgia2812/w3af) |
| **Language** | Python |
| **License** | GPL-2.0 |
| **Priority** | High |
| **Status** | Active / Stable |

**Description:** Web Application Attack and Audit Framework - comprehensive vulnerability scanner and exploitation tool.

**Key Features:**
- 200+ plugins for vulnerability detection
- SQL injection, XSS, CSRF, and more
- Console and GUI interfaces
- REST API for integration
- Detailed reporting

**Quick Start:**
```bash
# Install dependencies
pip3 install -r requirements.txt

# Start console
python3 w3af_console

# Quick scan
python3 w3af_api

# Docker
docker run -it andresriancho/w3af
```

**Integration:** Standalone, CI/CD pipelines, REST API

---

## Threat Intelligence

Resources and tools for gathering, analyzing, and operationalizing cyber threat intelligence.

### DeepDarkCTI
| Attribute | Value |
|-----------|-------|
| **Repository** | [nostalgia2812/deepdarkCTI](https://github.com/nostalgia2812/deepdarkCTI) |
| **Language** | Markdown / Data |
| **License** | MIT |
| **Priority** | Medium |
| **Status** | Active / Production |

**Description:** Comprehensive collection of cyber threat intelligence from deep and dark web sources, including ransomware sites, forums, and threat actor infrastructure.

**Key Features:**
- Ransomware gang .onion sites
- Dark web forum links
- Threat actor tracking
- IOC feeds
- Paste site monitoring

**Quick Start:**
```bash
# Clone repository
git clone https://github.com/nostalgia2812/deepdarkCTI.git

# Browse intelligence categories
ls deepdarkCTI/

# Integrate with MISP
python3 scripts/misp_import.py --config config/misp.conf
```

**Integration:** SIEM, MISP, threat feed aggregators

---

## Firmware Analysis

Tools for analyzing, extracting, and reverse engineering firmware and binary blobs.

### Unblob
| Attribute | Value |
|-----------|-------|
| **Repository** | [nostalgia2812/unblob](https://github.com/nostalgia2812/unblob) |
| **Language** | Python |
| **License** | MIT |
| **Priority** | Medium |
| **Status** | Active / Production |

**Description:** Extracts files from firmware images and arbitrary binary blobs. Supports hundreds of binary formats including SquashFS, JFFS2, Zlib, LZMA, and more.

**Key Features:**
- 50+ supported file formats
- Recursive extraction
- Parallel processing
- Docker image available
- Nix package available

**Quick Start:**
```bash
# Install
pip3 install unblob

# Install system dependencies
sudo apt-get install lzop zstd lz4 unar

# Extract firmware
unblob firmware.bin

# With Docker
docker run --rm -v /path/to/firmware:/data ghcr.io/onekey-sec/unblob:latest /data/firmware.bin

# Specify output directory
unblob -e /output firmware.bin
```

**Integration:** Standalone, automated analysis pipelines, CI/CD

---

## Development Frameworks

Frameworks and SDKs for building security tools, AI agents, and deploying applications.

### Agent Development Kit (Python)
| Attribute | Value |
|-----------|-------|
| **Repository** | [nostalgia2812/adk-python](https://github.com/nostalgia2812/adk-python) |
| **Language** | Python |
| **License** | Apache-2.0 |
| **Priority** | Medium |
| **Status** | Active / Beta |

**Description:** Google's Agent Development Kit for building, evaluating, and deploying AI agents in Python. Supports multi-agent systems, tool use, and various LLM backends.

**Key Features:**
- Multi-agent orchestration
- Built-in tool integrations
- Evaluation framework
- Google Cloud / Vertex AI integration
- Gemini model support

**Quick Start:**
```bash
# Install
pip install google-adk

# Create a simple agent
from google.adk.agents import Agent
from google.adk.tools import google_search

agent = Agent(
    name="security_agent",
    model="gemini-2.0-flash",
    tools=[google_search]
)
```

**Integration:** Google Cloud, Vertex AI, Gemini

---

### Firebase Framework Tools
| Attribute | Value |
|-----------|-------|
| **Repository** | [nostalgia2812/firebase-framework-tools](https://github.com/nostalgia2812/firebase-framework-tools) |
| **Language** | TypeScript |
| **License** | Apache-2.0 |
| **Priority** | Medium |
| **Status** | Active / Beta |

**Description:** Tools for integrating modern web frameworks (Next.js, Angular, Nuxt, etc.) with Firebase Hosting for streamlined deployment.

**Key Features:**
- Next.js SSR support
- Angular Universal support
- Nuxt.js support
- Automatic framework detection
- GitHub Actions integration

**Quick Start:**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize project
firebase init hosting

# Deploy with framework support
firebase deploy --only hosting
```

**Integration:** Firebase, Google Cloud, GitHub Actions

---

## Knowledge Bases

Comprehensive reference collections, cheatsheets, and documentation resources.

### The Book of Secret Knowledge
| Attribute | Value |
|-----------|-------|
| **Repository** | [nostalgia2812/the-book-of-secret-knowledge](https://github.com/nostalgia2812/the-book-of-secret-knowledge) |
| **Language** | Markdown |
| **License** | MIT |
| **Priority** | Low |
| **Status** | Active / Production |

**Description:** Curated collection of inspiring lists, manuals, cheatsheets, blogs, hacks, one-liners, CLI tools and more for IT professionals and security practitioners.

**Contents:**
- Shell/bash cheatsheets
- CLI tools reference
- Security tools and techniques
- Network tools and commands
- Web server configurations
- DevOps and SRE references

**Quick Start:**
```bash
# Clone for offline access
git clone https://github.com/nostalgia2812/the-book-of-secret-knowledge.git

# Browse by category
ls the-book-of-secret-knowledge/

# Search for specific topics
grep -r "nmap" the-book-of-secret-knowledge/
```

---

## Quick Reference

### Tools by Priority

| Priority | Tool | Category |
|----------|------|----------|
| Critical | Gitleaks | Secret Scanning |
| Critical | TruffleHog | Secret Scanning |
| High | Aircrack-ng | Network Security |
| High | BeEF | Web Application Testing |
| High | Commix | Web Application Testing |
| High | w3af | Web Application Testing |
| Medium | DeepDarkCTI | Threat Intelligence |
| Medium | Unblob | Firmware Analysis |
| Medium | ADK Python | Development Frameworks |
| Medium | Firebase Framework Tools | Development Frameworks |
| Low | Book of Secret Knowledge | Knowledge Bases |

### Tools by Language

| Language | Tools |
|----------|-------|
| Go | Gitleaks, TruffleHog |
| Python | Commix, w3af, Unblob, ADK Python, DeepDarkCTI |
| Ruby | BeEF |
| C | Aircrack-ng |
| TypeScript | Firebase Framework Tools |
| Markdown | DeepDarkCTI, Book of Secret Knowledge |

### Docker-Available Tools

```bash
# Gitleaks
docker run --rm -v "$(pwd):/repo" ghcr.io/gitleaks/gitleaks:latest detect --source /repo

# TruffleHog
docker run --rm -it ghcr.io/trufflesecurity/trufflehog:latest github --repo <url>

# Unblob
docker run --rm -v /path:/data ghcr.io/onekey-sec/unblob:latest /data/firmware.bin

# BeEF
docker run -p 3000:3000 beefproject/beef
```

---

## Integration Guide

### Recommended Security Pipeline

```
[Code Commit]
      |
      v
[Gitleaks pre-commit hook] --> Blocks commit if secrets found
      |
      v
[TruffleHog CI scan] --> Full history scan on PR
      |
      v
[w3af / Commix web scan] --> Web vulnerability testing
      |
      v
[DeepDarkCTI correlation] --> Threat intelligence enrichment
      |
      v
[Report Generation]
```

### Pre-commit Configuration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

### GitHub Actions Integration

See `.github/workflows/` for complete workflow definitions:
- `tool-validation.yml` - Validates tool installations
- `security-scan.yml` - Security scanning on commits
- `integration-tests.yml` - Integration testing

### Scripts

See `scripts/` directory:
- `install_all.sh` - Install all tools
- `update_all.sh` - Update all tools to latest versions
- `check_health.sh` - Verify all tool installations

---

*Generated by the nostalgia2812 tooling and filing system. See [tool_manifest.json](.tooling/tool_manifest.json) for machine-readable catalog.*
