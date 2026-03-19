#!/usr/bin/env bash
# Install and configure Mistral vibe
set -euo pipefail

curl -LsSf https://mistral.ai/vibe/install.sh | bash
vibe --setup
