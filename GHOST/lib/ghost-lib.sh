#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# GHOST Shared Function Library
# Source this file from any GHOST script:
#   source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../lib/ghost-lib.sh"
# or from the GHOST root:
#   source "$GHOST_DIR/lib/ghost-lib.sh"
# ══════════════════════════════════════════════════════════════════════════════

# Guard against double-sourcing
[[ -n "${_GHOST_LIB_LOADED:-}" ]] && return 0
_GHOST_LIB_LOADED=1

# ── Colour output ─────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  _RED='\033[0;31m' _GRN='\033[0;32m' _YEL='\033[1;33m'
  _BLU='\033[0;34m' _CYN='\033[0;36m' _BLD='\033[1m' _RST='\033[0m'
else
  _RED='' _GRN='' _YEL='' _BLU='' _CYN='' _BLD='' _RST=''
fi

# Public colour functions — safe to call from any GHOST script
ok()    { echo -e "${_GRN}[✓]${_RST} $*"; }
log()   { echo -e "${_BLU}[*]${_RST} $*"; }
warn()  { echo -e "${_YEL}[!]${_RST} $*"; }
error() { echo -e "${_RED}[✗]${_RST} $*" >&2; }
hdr()   { echo -e "\n${_BLD}${_CYN}── $* ──${_RST}"; }
die()   { error "$*"; exit 1; }
info()  { echo -e "${_CYN}[>]${_RST} $*"; }
step()  { echo -e "${_BLD}[+]${_RST} $*"; }

# ── GHOST root detection ──────────────────────────────────────────────────────
# Sets GHOST_ROOT to the directory containing this lib/ghost-lib.sh
GHOST_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GHOST_ROOT="$(cd "$GHOST_LIB_DIR/.." && pwd)"

# ── Standard paths ────────────────────────────────────────────────────────────
GHOST_SRC="$GHOST_ROOT/src"
GHOST_TMP="$GHOST_ROOT/tmp"
GHOST_DATA="$GHOST_ROOT/tmp/data"
GHOST_LOGS="$GHOST_ROOT/tmp/logs"
GHOST_RECON="$GHOST_SRC/recon"
GHOST_ENV_FILE="$GHOST_ROOT/.ghost-env"
GHOST_PID_FILE="$GHOST_TMP/ghost.pid"

# ── Directory bootstrap ───────────────────────────────────────────────────────
# Call once per session to ensure all dirs exist
ghost_init_dirs() {
  mkdir -p \
    "$GHOST_SRC/recon" \
    "$GHOST_SRC/exploit" \
    "$GHOST_SRC/web" \
    "$GHOST_TMP" \
    "$GHOST_DATA" \
    "$GHOST_LOGS"
}

# ── Command checks ────────────────────────────────────────────────────────────
require_cmd() {
  command -v "$1" &>/dev/null || die "Required command not found: $1"
}

has_cmd() {
  command -v "$1" &>/dev/null
}

# ── Port utilities ────────────────────────────────────────────────────────────
port_in_use() {
  local port="${1:-8421}"
  if has_cmd ss; then
    ss -tlnp 2>/dev/null | grep -q ":${port} "
  elif has_cmd lsof; then
    lsof -i TCP:"$port" -sTCP:LISTEN &>/dev/null
  else
    return 1
  fi
}

# ── Safe cd — never fails silently ───────────────────────────────────────────
# Resolves the getcwd error when a parent dir was deleted
safe_cd() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    die "Directory does not exist: $dir"
  fi
  cd "$dir" || die "Cannot cd to: $dir"
}

# ── Env persistence ───────────────────────────────────────────────────────────
ghost_save_env() {
  cat > "$GHOST_ENV_FILE" <<EOF
GHOST_MODE=${GHOST_MODE:-unset}
GHOST_PORT=${GHOST_PORT:-8421}
GHOST_USERNAME=${GHOST_USERNAME:-nostalgia2812}
GHOST_DEPLOY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
}

ghost_load_env() {
  [[ -f "$GHOST_ENV_FILE" ]] && source "$GHOST_ENV_FILE" 2>/dev/null || true
}

# ── Tool path resolver ────────────────────────────────────────────────────────
# Returns full path of a GHOST recon tool, exits if not found
ghost_tool_path() {
  local tool="$1"
  local expected="$GHOST_RECON/$tool"
  if [[ -d "$expected" ]]; then
    echo "$expected"
  elif [[ -f "$expected" ]]; then
    echo "$expected"
  else
    die "GHOST tool not installed: $tool — run ghost-setup to install it"
  fi
}

# ── Python path: entry script for a tool ─────────────────────────────────────
# ghost_py_tool Sublist3r sublist3r.py  → returns the .py path, verified
ghost_py_tool() {
  local tool_dir
  tool_dir="$(ghost_tool_path "$1")"
  local script_name="${2:-${1,,}.py}"    # default: lowercase tool name + .py
  local full="$tool_dir/$script_name"
  # Search for the script case-insensitively if exact match not found
  if [[ ! -f "$full" ]]; then
    local found
    found="$(find "$tool_dir" -maxdepth 1 -iname "$script_name" -type f 2>/dev/null | head -1)"
    [[ -n "$found" ]] || die "Entry script not found: $full"
    full="$found"
  fi
  echo "$full"
}

# ── Browser launcher ──────────────────────────────────────────────────────────
open_browser() {
  local url="$1"
  if has_cmd xdg-open;  then xdg-open  "$url" &>/dev/null &
  elif has_cmd open;    then open      "$url" &>/dev/null &
  elif has_cmd start;   then start     "$url" &>/dev/null &
  fi
}

# ── PIP install helper ────────────────────────────────────────────────────────
ghost_pip_install() {
  local reqs="$1"
  if has_cmd pip3; then
    pip3 install -q -r "$reqs"
  elif has_cmd pip; then
    pip install -q -r "$reqs"
  else
    die "pip/pip3 not found — install Python package manager"
  fi
}

# ── Git clone with update support ─────────────────────────────────────────────
# ghost_clone <url> <dest>
# If dest exists:
#   - If it's a valid git repo → pull latest
#   - If it's empty/corrupt   → remove and re-clone
ghost_clone() {
  local url="$1"
  local dest="$2"

  if [[ -d "$dest" ]]; then
    if git -C "$dest" rev-parse --git-dir &>/dev/null; then
      log "Updating existing clone: $dest"
      git -C "$dest" pull --ff-only --quiet || warn "Pull failed; using existing clone"
    else
      warn "Destination exists but is not a git repo — re-cloning: $dest"
      rm -rf "$dest"
      git clone --quiet "$url" "$dest"
    fi
  else
    log "Cloning $url → $dest"
    git clone --quiet "$url" "$dest"
  fi
}

# ── Banner ────────────────────────────────────────────────────────────────────
ghost_banner() {
  local subtitle="${1:-}"
  echo -e "${_BLD}"
  echo "  ██████  ██   ██  ██████  ███████ ████████"
  echo " ██       ██   ██ ██    ██ ██         ██   "
  echo " ██   ███ ███████ ██    ██ ███████    ██   "
  echo " ██    ██ ██   ██ ██    ██      ██    ██   "
  echo "  ██████  ██   ██  ██████  ███████    ██   "
  echo -e "${_RST}${_CYN}         ${subtitle}${_RST}"
  echo ""
}
