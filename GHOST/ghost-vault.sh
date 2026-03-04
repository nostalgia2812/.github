#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# ghost-vault.sh — GHOST Secure Environment Launcher
#
# Decrypts the AES-256 credential vault, exports the API key into the
# environment, then launches the configured AI agent session.
#
# USAGE
#   ghost-start                                    # interactive (no target)
#   ghost-vault.sh -t 192.168.1.1                  # pentestgpt with target
#   ghost-vault.sh -t 192.168.1.1 -e kimi          # use kimi engine
#   ghost-vault.sh -t 192.168.1.1 -e pentestgpt    # explicit pentestgpt
#   ghost-vault.sh --no-ai                         # vault only, drop to shell
#
# OPTIONS
#   -t | --target   TARGET   IP/hostname to test (required for pentestgpt)
#   -e | --engine   ENGINE   AI engine: pentestgpt (default) | kimi | bash
#   -m | --model    MODEL    Model override (e.g. gemini-2.0-flash, gpt-4o)
#   --no-ai                  Decrypt vault and drop to interactive shell
#   --help                   Show this help
#
# NOTE: Only target systems you own or have explicit written authorisation
#       to test. Unauthorised access is illegal in most jurisdictions.
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Load shared library — FIXES: ok/log/warn/error/hdr/die not found ─────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/ghost-lib.sh"

# ── Paths ─────────────────────────────────────────────────────────────────────
VAULT_FILE="$GHOST_ROOT/.vault.enc"
AI_VENV="$GHOST_ROOT/engines/ai/venv"
CONF_DIR="$GHOST_ROOT/conf/profiles"
STEALTH_PROMPT="$CONF_DIR/stealth_prompt.txt"

# ── Defaults ──────────────────────────────────────────────────────────────────
AI_TARGET=""
AI_ENGINE="${GHOST_ENGINE:-pentestgpt}"   # pentestgpt | kimi | bash
AI_MODEL="${GHOST_MODEL:-}"
LAUNCH_AI=true
VAULT_TMP=""

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    -t|--target)  AI_TARGET="$2";  shift 2 ;;
    -e|--engine)  AI_ENGINE="$2";  shift 2 ;;
    -m|--model)   AI_MODEL="$2";   shift 2 ;;
    --no-ai)      LAUNCH_AI=false; shift ;;
    --help|-h)    grep '^#' "$0" | head -25 | sed 's/^# \?//'; exit 0 ;;
    *) warn "Unknown argument: $1"; shift ;;
  esac
done

# ── Cleanup: scrub key material on exit ───────────────────────────────────────
cleanup() {
  [[ -n "$VAULT_TMP" && -d "$VAULT_TMP" ]] && rm -rf "$VAULT_TMP"
  unset GHOST_API_KEY OPENAI_API_KEY GOOGLE_API_KEY GEMINI_API_KEY \
        KIMI_API_KEY ANTHROPIC_API_KEY VAULT_PASS 2>/dev/null || true
  ok "Memory scrubbed. Environment secured."
}
trap cleanup EXIT

# ══════════════════════════════════════════════════════════════════════════════
ghost_banner "Secure Environment"
log "Engine : $AI_ENGINE"
[[ -n "$AI_TARGET" ]] && log "Target : $AI_TARGET" || log "Target : (not set — interactive mode)"
echo ""

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — Decrypt vault / load API key
# ══════════════════════════════════════════════════════════════════════════════
if [[ -f "$VAULT_FILE" ]]; then
  info "Enter vault password:"
  read -rs -p "[>] " VAULT_PASS; echo ""

  VAULT_TMP="$(mktemp -d)"
  VAULT_OUT="$VAULT_TMP/vault.txt"

  if ! openssl enc -aes-256-cbc -d -pbkdf2 \
        -pass "pass:${VAULT_PASS}" \
        -in "$VAULT_FILE" \
        -out "$VAULT_OUT" 2>/dev/null; then
    die "Vault decryption failed — wrong password or corrupted vault"
  fi
  unset VAULT_PASS

  set -o allexport
  source "$VAULT_OUT" 2>/dev/null || true
  set +o allexport

  rm -f "$VAULT_OUT"
  ok "Vault decrypted."

elif [[ -n "${GHOST_API_KEY:-}" ]]; then
  ok "Using GHOST_API_KEY from environment (no vault)"

else
  warn "No vault at $VAULT_FILE and GHOST_API_KEY not set."
  warn "Run: ghost-setup --vault   to create the vault."
  info "Continuing without API key — some features unavailable."
fi

# ── Propagate key to all known env var names ──────────────────────────────────
_KEY=""
for kvar in GHOST_API_KEY OPENAI_API_KEY GOOGLE_API_KEY GEMINI_API_KEY KIMI_API_KEY ANTHROPIC_API_KEY; do
  [[ -n "${!kvar:-}" ]] && { _KEY="${!kvar}"; break; }
done

if [[ -n "$_KEY" ]]; then
  export OPENAI_API_KEY="$_KEY"
  export GOOGLE_API_KEY="$_KEY"
  export GEMINI_API_KEY="$_KEY"
  export KIMI_API_KEY="$_KEY"
  export GHOST_API_KEY="$_KEY"
  ok "API key active."
fi

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 2 — Load stealth prompt context
# ══════════════════════════════════════════════════════════════════════════════
INSTRUCTION_ARGS=()
if [[ -f "$STEALTH_PROMPT" ]]; then
  STEALTH_TEXT="$(cat "$STEALTH_PROMPT")"
  ok "Stealth profile loaded: $STEALTH_PROMPT"
  INSTRUCTION_ARGS=(-i "$STEALTH_TEXT")
else
  warn "No stealth prompt at $STEALTH_PROMPT — using AI defaults"
  warn "Generate one with: ghost-setup (or ghost-setup --all)"
fi

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 3 — Activate environment
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "────────────────────────────────────────────────────────────────────────────"
ok "GHOST Secure Environment ACTIVE"
echo "────────────────────────────────────────────────────────────────────────────"
echo ""

if ! $LAUNCH_AI; then
  log "AI launch skipped (--no-ai). Dropping to authenticated shell."
  exec bash --norc
fi

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 4 — AI engine dispatch
# ══════════════════════════════════════════════════════════════════════════════
case "$AI_ENGINE" in

  # ── kimi ──────────────────────────────────────────────────────────────────
  kimi)
    KIMI_BIN=""
    if has_cmd kimi;      then KIMI_BIN="$(command -v kimi)"
    elif has_cmd kimi-cli; then KIMI_BIN="$(command -v kimi-cli)"
    elif [[ -x "$GHOST_ROOT/bin/ghost-kimi" ]]; then KIMI_BIN="$GHOST_ROOT/bin/ghost-kimi"
    fi

    if [[ -z "$KIMI_BIN" ]]; then
      warn "kimi not found. Install with: curl -L code.kimi.com/install.sh | bash"
      warn "Falling back to interactive shell."
      exec bash --norc
    fi

    log "Launching Kimi AI agent..."
    if [[ -n "$AI_TARGET" ]]; then
      exec "$KIMI_BIN" "You are a penetration testing assistant. Target: $AI_TARGET. ${STEALTH_TEXT:-}"
    else
      exec "$KIMI_BIN"
    fi
    ;;

  # ── bash (vault-only shell) ───────────────────────────────────────────────
  bash)
    log "Dropping to authenticated shell (API key exported)."
    exec bash --norc
    ;;

  # ── pentestgpt (default) ──────────────────────────────────────────────────
  pentestgpt|*)
    # Locate pentestgpt binary — prefer venv, then PATH
    PENTESTGPT_BIN=""
    if [[ -x "$AI_VENV/bin/pentestgpt" ]]; then
      source "$AI_VENV/bin/activate" 2>/dev/null || true
      PENTESTGPT_BIN="$AI_VENV/bin/pentestgpt"
    elif [[ -x "$GHOST_ROOT/bin/pentestgpt-ghost" ]]; then
      PENTESTGPT_BIN="$GHOST_ROOT/bin/pentestgpt-ghost"
    elif has_cmd pentestgpt; then
      PENTESTGPT_BIN="$(command -v pentestgpt)"
    fi

    if [[ -z "$PENTESTGPT_BIN" ]]; then
      warn "pentestgpt not found."
      warn "Run: ghost-setup --ai   to install it."
      warn "Or:  pip install pentestgpt"
      echo ""
      info "Available commands in this shell (API key is active):"
      info "  nmap -sV $AI_TARGET"
      info "  sublist3r -d <domain>"
      info "  kismet"
      exec bash --norc
    fi

    # ── Require a target for pentestgpt ──────────────────────────────────
    if [[ -z "$AI_TARGET" ]]; then
      warn "No target specified for pentestgpt."
      echo ""
      info "Usage examples:"
      info "  ghost-vault.sh -t 192.168.1.1"
      info "  ghost-vault.sh -t 192.168.1.1 -m gpt-4o"
      info "  ghost-vault.sh -t 192.168.1.1 -e kimi"
      echo ""
      info "Dropping to authenticated shell. API key is active."
      info "You can run pentestgpt manually:"
      info "  pentestgpt -t <target>"
      exec bash --norc
    fi

    # ── Build pentestgpt command ──────────────────────────────────────────
    PG_ARGS=(-t "$AI_TARGET")
    [[ -n "$AI_MODEL" ]] && PG_ARGS+=(-m "$AI_MODEL")
    [[ ${#INSTRUCTION_ARGS[@]} -gt 0 ]] && PG_ARGS+=("${INSTRUCTION_ARGS[@]}")

    log "Launching pentestgpt against: $AI_TARGET"
    exec "$PENTESTGPT_BIN" "${PG_ARGS[@]}"
    ;;
esac
