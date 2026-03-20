# Developer Onboarding Guide

> nostalgia2812 Security Tools - Getting Started
> Branch: `claude/tooling-filing-system-uG7Gs`

## Welcome

This guide walks you through setting up the complete nostalgia2812 security tooling environment. Whether you're joining the team or setting up a new workstation, this guide covers everything you need.

## Prerequisites

Before starting, ensure you have:

| Requirement | Minimum Version | Installation |
|-------------|----------------|-------------|
| Git | 2.30+ | `sudo apt-get install git` |
| Go | 1.21+ | https://go.dev/dl/ |
| Python | 3.9+ | `sudo apt-get install python3` |
| Ruby | 3.0+ | `sudo apt-get install ruby-full` |
| Node.js | 18+ | https://nodejs.org/ |
| Docker | 24+ | https://docs.docker.com/get-docker/ |

### Verify Prerequisites

```bash
git --version    # >= 2.30
go version       # >= 1.21
python3 --version  # >= 3.9
ruby --version   # >= 3.0
node --version   # >= 18
docker --version # >= 24
```

## Quick Setup (5 minutes)

### 1. Clone the hub repository

```bash
git clone https://github.com/nostalgia2812/.github.git nostalgia2812-hub
cd nostalgia2812-hub
```

### 2. Run the installer

```bash
# Make executable (if needed)
chmod +x scripts/install_all.sh

# Install all tools
./scripts/install_all.sh

# Or install specific tools
./scripts/install_all.sh gitleaks trufflehog
```

### 3. Verify installation

```bash
./scripts/check_health.sh
```

### 4. Set up pre-commit hooks (for each repository you work in)

```bash
# Copy shared pre-commit config
cp config/pre-commit-config.yaml /path/to/your/repo/.pre-commit-config.yaml

# Install hooks
cd /path/to/your/repo
pre-commit install
```

## Detailed Setup by Tool Category

### Secret Scanning Setup

These are the most critical tools and should be set up first.

#### Gitleaks

```bash
# Install
go install github.com/gitleaks/gitleaks/v8@latest

# Verify
gitleaks version

# Run scan on current directory
gitleaks detect --source . --verbose

# Set up as pre-commit hook
cat >> .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
EOF
pre-commit install
```

#### TruffleHog

```bash
# Install
go install github.com/trufflesecurity/trufflehog/v3@latest

# Verify
trufflehog --version

# Scan current git repo
trufflehog git file://. --only-verified

# Scan a GitHub repository
trufflehog github --repo https://github.com/nostalgia2812/TARGET_REPO
```

### Web Application Testing Setup

#### BeEF

```bash
# Install dependencies
sudo apt-get install -y ruby-full git

# Clone BeEF
git clone https://github.com/nostalgia2812/beef.git ~/tools/beef
cd ~/tools/beef

# Install gem dependencies
gem install bundler
bundle install

# Start BeEF
./beef

# Access UI at: http://127.0.0.1:3000/ui/panel
# Default credentials: beef/beef (change in config/beef.erb)
```

#### Commix

```bash
# Install via pip
pip3 install commix

# Or clone
git clone https://github.com/nostalgia2812/commix.git ~/tools/commix

# Test (requires a target)
commix --url="http://target.example.com/page.php?id=1"

# With POST data
commix --url="http://target.com/login.php" \
       --data="username=admin&password=test" \
       --level=3
```

#### w3af

```bash
# Clone
git clone https://github.com/nostalgia2812/w3af.git ~/tools/w3af
cd ~/tools/w3af

# Install dependencies
pip3 install -r requirements.txt

# Start console
python3 w3af_console

# Quick scan via console:
# > profiles
# > use OWASP_TOP10
# > target set target http://target.example.com
# > start
```

### Network Security Setup

#### Aircrack-ng

```bash
# Install (requires wireless card with monitor mode support)
sudo apt-get install -y aircrack-ng

# Verify
aircrack-ng --version

# Check wireless interfaces
sudo airmon-ng

# Start monitor mode
sudo airmon-ng start wlan0

# Capture packets
sudo airodump-ng wlan0mon

# Crack WPA handshake (educational use only)
aircrack-ng -w /usr/share/wordlists/rockyou.txt capture.cap
```

### Firmware Analysis Setup

#### Unblob

```bash
# Install system dependencies
sudo apt-get install -y lzop zstd lz4 unar p7zip-full squashfs-tools build-essential

# Install via pip
pip3 install unblob

# Verify
unblob --version

# Extract firmware
unblob -e ./output firmware.bin

# Using Docker (no dependencies needed)
docker pull ghcr.io/onekey-sec/unblob:latest
docker run --rm -v "$(pwd):/data" ghcr.io/onekey-sec/unblob:latest /data/firmware.bin
```

### Development Frameworks Setup

#### ADK Python

```bash
# Install
pip3 install google-adk

# Verify
python3 -c "import google.adk; print('ADK Python installed')"

# Create a simple security agent
cat > security_agent.py << 'EOF'
from google.adk.agents import Agent

security_agent = Agent(
    name="security_scanner",
    model="gemini-2.0-flash",
    description="Security analysis agent",
    instruction="You are a security expert. Analyze the provided data for security issues."
)
EOF
```

#### Firebase Framework Tools

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Verify
firebase --version

# Login (requires Google account)
firebase login

# Initialize project
firebase init hosting

# Deploy
firebase deploy --only hosting
```

## Working with the Tool Catalog

### Browse the catalog

```bash
# Human-readable
cat TOOLS_INDEX.md

# Machine-readable
cat .tooling/tool_manifest.json | python3 -m json.tool

# List tools by category
python3 - << 'EOF'
import json

with open('.tooling/tool_manifest.json') as f:
    manifest = json.load(f)

for tool in manifest['tools']:
    print(f"[{tool['category']}] {tool['name']}")
EOF
```

### Add a new tool to the catalog

1. Edit `.tooling/tool_manifest.json` - add tool entry
2. Edit `.tooling/categories.json` - add to appropriate category
3. Edit `TOOLS_INDEX.md` - add documentation section
4. Add functions to `scripts/install_all.sh`, `scripts/update_all.sh`, `scripts/check_health.sh`

## Environment Variables

Set these in your shell profile (`~/.bashrc` or `~/.zshrc`):

```bash
# nostalgia2812 Tools Configuration
export TOOLS_ROOT="$HOME/nostalgia2812-tools"
export PATH="$PATH:$TOOLS_ROOT/bin:$GOPATH/bin"

# Tool-specific settings
export GITLEAKS_CONFIG="$HOME/.config/gitleaks.toml"

# Performance
export PARALLEL_JOBS=4
```

## Common Workflows

### Security Assessment Workflow

```bash
# 1. Initial secret scan of target repository
trufflehog github --repo https://github.com/target/repo --only-verified

# 2. Web application scanning
w3af_console  # Use OWASP_TOP10 profile

# 3. Command injection testing (requires prior web recon)
commix --url="http://target.com/?id=1" --level=3

# 4. Check threat intelligence
cd $TOOLS_ROOT/deepdarkCTI
# Browse relevant threat actor data

# 5. Firmware analysis (if applicable)
unblob -e ./extracted-firmware firmware.bin
```

### Development Workflow

```bash
# Before committing
pre-commit run --all-files

# After making changes to scripts
shellcheck scripts/*.sh

# Validate catalog changes
python3 -c "
import json
with open('.tooling/tool_manifest.json') as f:
    manifest = json.load(f)
print(f'Manifest valid: {len(manifest[\"tools\"])} tools')
"
```

## Troubleshooting

### Gitleaks finds secrets in test files

Add to `.gitleaks.toml`:
```toml
[allowlist]
paths = ['''tests/''', '''test_data/''']
```

### TruffleHog is slow

Use `--only-verified` to skip unverified detections:
```bash
trufflehog git file://. --only-verified --concurrency=8
```

### Unblob extraction fails

Install additional system tools:
```bash
sudo apt-get install -y lzop zstd lz4 unar binwalk squashfs-tools \
  cpio gzip bzip2 xz-utils
```

### BeEF won't start

Check Ruby and bundler versions:
```bash
ruby --version  # Need 3.0+
bundle --version
cd ~/tools/beef && bundle install
```

## Getting Help

- **Tool documentation**: See `TOOLS_INDEX.md` for links to each tool's official docs
- **Architecture**: See `docs/ARCHITECTURE.md` for system design
- **Workflows**: See `docs/WORKFLOWS.md` for CI/CD workflow details
- **Health check**: Run `./scripts/check_health.sh --markdown` for a status report

## Legal and Ethical Notice

All tools in this repository are intended for **authorized security testing only**. Always ensure you have explicit written permission before testing any system or network. Unauthorized access to computer systems is illegal and unethical.

The nostalgia2812 organization maintains these tools for legitimate security research, penetration testing with authorization, and educational purposes.
