#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# ghost-vault.sh — GHOST Secure Environment Launcher
#
# Decrypts the AES-256 credential vault, loads the API key into the
# environment, then launches the configured AI agent session.
#
# USAGE
#   ./ghost-vault.sh [--target TARGET] [--model MODEL] [--no-ai]
#
# NOTE: All tools (aircrack-ng, kismet, nmap, etc.) must only be used
# against systems you own or have explicit written authorization to test.
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Load shared library (FIXES: ok/log/warn/error not found) ─────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GHOST_ROOT="$SCRIPT_DIR"
source "$SCRIPT_DIR/lib/ghost-lib.sh"

# ── Defaults ──────────────────────────────────────────────────────────────────
VAULT_FILE="$GHOST_ROOT/.vault.enc"
VAULT_TMP=""
AI_TARGET=""
AI_MODEL="${GHOST_MODEL:-gemini-2.0-flash}"
LAUNCH_AI=true
PENTESTGPT_DIR="$GHOST_ROOT/engines/ai"
PENTESTGPT_VENV="$PENTESTGPT_DIR/venv"
CONF_DIR="$GHOST_ROOT/conf/profiles"
STEALTH_PROMPT="$CONF_DIR/stealth_prompt.txt"

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --target|-t)  AI_TARGET="$2";  shift 2 ;;
    --model|-m)   AI_MODEL="$2";   shift 2 ;;
    --no-ai)      LAUNCH_AI=false; shift ;;
    --help|-h)
      grep '^#' "$0" | head -20 | sed 's/^# \?//'
      exit 0
      ;;
    *) warn "Unknown argument: $1"; shift ;;
  esac
done

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() {
  if [[ -n "$VAULT_TMP" && -d "$VAULT_TMP" ]]; then
    rm -rf "$VAULT_TMP"
  fi
  # Scrub env vars with key material
  unset GHOST_API_KEY OPENAI_API_KEY GOOGLE_API_KEY GEMINI_API_KEY 2>/dev/null || true
  ok "Memory scrubbed. Environment secured."
}
trap cleanup EXIT

ghost_banner "Secure Environment"
log "Initializing GHOST Secure Environment..."

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Decrypt vault
# ══════════════════════════════════════════════════════════════════════════════
if [[ ! -f "$VAULT_FILE" ]]; then
  warn "No vault found at $VAULT_FILE"
  warn "Run the GHOST deploy script first to create a vault, or set GHOST_API_KEY in your env."
  if [[ -z "${GHOST_API_KEY:-}" ]]; then
    info "Enter API key manually (will not be saved):"
    read -rs -p "[>] API Key: " GHOST_API_KEY
    echo ""
  fi
else
  info "Enter Vault Password:"
  read -rs -p "[>] " VAULT_PASS
  echo ""

  VAULT_TMP="$(mktemp -d)"
  VAULT_OUT="$VAULT_TMP/vault.txt"

  if ! openssl enc -aes-256-cbc -d -pbkdf2 \
        -pass "pass:${VAULT_PASS}" \
        -in "$VAULT_FILE" \
        -out "$VAULT_OUT" 2>/dev/null; then
    die "Vault decryption failed — wrong password or corrupted vault"
  fi

  # Source exported vars (e.g. export GHOST_API_KEY=...)
  set -o allexport
  source "$VAULT_OUT" 2>/dev/null || true
  set +o allexport

  unset VAULT_PASS
  rm -f "$VAULT_OUT"
fi

ok "Vault decrypted."

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Map the key to whatever env var the AI tool expects
# ══════════════════════════════════════════════════════════════════════════════
# Support multiple key names written by different deploy scripts
for kvar in GHOST_API_KEY OPENAI_API_KEY GOOGLE_API_KEY GEMINI_API_KEY; do
  if [[ -n "${!kvar:-}" ]]; then
    # Export all common aliases so any AI tool finds its key
    export OPENAI_API_KEY="${!kvar}"
    export GOOGLE_API_KEY="${!kvar}"
    export GEMINI_API_KEY="${!kvar}"
    export GHOST_API_KEY="${!kvar}"
    break
  fi
done

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Load stealth prompt context (if available)
# ══════════════════════════════════════════════════════════════════════════════
INSTRUCTION_ARGS=()
if [[ -f "$STEALTH_PROMPT" ]]; then
  log "Feeding stealth prompt context..."
  STEALTH_TEXT="$(cat "$STEALTH_PROMPT")"
  ok "Stealth profile loaded."
  INSTRUCTION_ARGS=(-i "$STEALTH_TEXT")
else
  warn "No stealth prompt at $STEALTH_PROMPT — using AI defaults."
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Activate AI engine
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "=============================================================================="
ok "GHOST Secure Environment ACTIVE"
ok "Model: $AI_MODEL"
echo "=============================================================================="
echo ""

if ! $LAUNCH_AI; then
  log "AI launch skipped (--no-ai). Environment is active."
  exec bash --norc
fi

# ── Require a target ──────────────────────────────────────────────────────────
if [[ -z "$AI_TARGET" ]]; then
  warn "No target specified."
  warn "Usage: ghost-start --target <hostname-or-IP>"
  warn "       ghost-vault.sh --target <hostname-or-IP>"
  echo ""
  info "GHOST is active but no pentestgpt session started."
  info "You can now run tools manually:"
  info "  pentestgpt -t <target> -m $AI_MODEL"
  info "  sublist3r -d <domain>"
  info "  nmap -sV <target>"
  echo ""
  exec bash --norc
fi

# ── Activate venv and run pentestgpt ─────────────────────────────────────────
log "Activating AI agent framework..."

PENTESTGPT_BIN=""
if [[ -f "$PENTESTGPT_VENV/bin/pentestgpt" ]]; then
  # Venv-installed
  PENTESTGPT_BIN="$PENTESTGPT_VENV/bin/pentestgpt"
  source "$PENTESTGPT_VENV/bin/activate"
elif has_cmd pentestgpt; then
  PENTESTGPT_BIN="$(command -v pentestgpt)"
else
  warn "pentestgpt not found."
  warn "Install with: pip install pentestgpt  (or run ghost-setup)"
  exec bash --norc
fi

exec "$PENTESTGPT_BIN" \
  -t "$AI_TARGET" \
  -m "$AI_MODEL" \
  "${INSTRUCTION_ARGS[@]+"${INSTRUCTION_ARGS[@]}"}"
