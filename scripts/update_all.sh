#!/usr/bin/env bash
# =============================================================================
# update_all.sh - Update all nostalgia2812 security tools to latest versions
# =============================================================================
# Part of the nostalgia2812 tooling and filing system
# Branch: claude/tooling-filing-system-uG7Gs
# =============================================================================

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
TOOLS_ROOT="${TOOLS_ROOT:-$HOME/nostalgia2812-tools}"
LOG_FILE="${LOG_FILE:-/tmp/tool-update-$(date +%Y%m%d-%H%M%S).log}"
BACKUP_BEFORE_UPDATE="${BACKUP_BEFORE_UPDATE:-false}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Logging ──────────────────────────────────────────────────────────────────
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"; }
log_ok() { echo -e "${GREEN}[UPDATED]${NC} $*" | tee -a "$LOG_FILE"; }
log_skip() { echo -e "${YELLOW}[SKIPPED]${NC} $*" | tee -a "$LOG_FILE"; }
log_err() { echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"; }
log_section() { echo -e "\n${CYAN}════════════════════════════════════${NC}\n${CYAN} $*${NC}\n${CYAN}════════════════════════════════════${NC}" | tee -a "$LOG_FILE"; }

command_exists() { command -v "$1" &>/dev/null; }

# ─── Version Tracking ─────────────────────────────────────────────────────────
VERSION_FILE="$TOOLS_ROOT/.versions.json"

get_current_version() {
    local tool="$1"
    if [[ -f "$VERSION_FILE" ]]; then
        python3 -c "import json,sys; d=json.load(open('$VERSION_FILE')); print(d.get('$tool', 'unknown'))" 2>/dev/null || echo "unknown"
    else
        echo "unknown"
    fi
}

save_version() {
    local tool="$1"
    local version="$2"
    mkdir -p "$TOOLS_ROOT"

    if [[ -f "$VERSION_FILE" ]]; then
        python3 -c "
import json
with open('$VERSION_FILE', 'r') as f:
    d = json.load(f)
d['$tool'] = '$version'
d['_updated'] = '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
with open('$VERSION_FILE', 'w') as f:
    json.dump(d, f, indent=2)
" 2>/dev/null || true
    else
        echo "{\"$tool\": \"$version\", \"_updated\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$VERSION_FILE"
    fi
}

# ─── Update Functions ─────────────────────────────────────────────────────────

update_gitleaks() {
    log_section "Updating Gitleaks"
    local prev_version
    prev_version=$(gitleaks version 2>/dev/null || echo "not installed")

    if command_exists go; then
        log "Updating via go install..."
        go install github.com/gitleaks/gitleaks/v8@latest && \
            log_ok "gitleaks updated. Previous: $prev_version → New: $(gitleaks version 2>/dev/null)" || \
            log_err "Failed to update gitleaks via go"
    elif command_exists brew; then
        brew upgrade gitleaks 2>/dev/null && \
            log_ok "gitleaks updated via brew" || \
            log_skip "gitleaks already at latest via brew"
    else
        log_err "No update method available for gitleaks (requires go or brew)"
    fi
}

update_trufflehog() {
    log_section "Updating TruffleHog"
    local prev_version
    prev_version=$(trufflehog --version 2>/dev/null || echo "not installed")

    if command_exists go; then
        log "Updating via go install..."
        go install github.com/trufflesecurity/trufflehog/v3@latest && \
            log_ok "trufflehog updated. Previous: $prev_version → New: $(trufflehog --version 2>/dev/null)" || \
            log_err "Failed to update trufflehog via go"
    elif command_exists brew; then
        brew upgrade trufflehog 2>/dev/null && \
            log_ok "trufflehog updated via brew" || \
            log_skip "trufflehog already at latest via brew"
    else
        log "Updating via install script..."
        curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | \
            sh -s -- -b /usr/local/bin && \
            log_ok "trufflehog updated via install script" || \
            log_err "Failed to update trufflehog"
    fi
}

update_aircrack_ng() {
    log_section "Updating Aircrack-ng"

    if command_exists apt-get; then
        sudo apt-get update -qq && sudo apt-get install -y --only-upgrade aircrack-ng && \
            log_ok "aircrack-ng updated via apt" || log_skip "aircrack-ng already at latest"
    elif command_exists brew; then
        brew upgrade aircrack-ng 2>/dev/null && log_ok "aircrack-ng updated" || log_skip "aircrack-ng already at latest"
    elif [[ -d "$TOOLS_ROOT/aircrack-ng" ]]; then
        log "Updating aircrack-ng from git..."
        cd "$TOOLS_ROOT/aircrack-ng"
        git pull origin master && make -j"$(nproc)" && sudo make install && \
            log_ok "aircrack-ng updated from source" || log_err "Failed to update aircrack-ng from source"
    else
        log_skip "aircrack-ng: no update method available"
    fi
}

update_beef() {
    log_section "Updating BeEF"

    if [[ -d "$TOOLS_ROOT/beef" ]]; then
        cd "$TOOLS_ROOT/beef"
        log "Pulling latest BeEF changes..."
        git fetch origin
        local current
        current=$(git rev-parse HEAD)
        git pull origin master
        local new
        new=$(git rev-parse HEAD)
        if [[ "$current" != "$new" ]]; then
            bundle install --without test development
            log_ok "BeEF updated from $current to $new"
        else
            log_skip "BeEF already at latest commit"
        fi
    else
        log_skip "BeEF not found at $TOOLS_ROOT/beef. Run install_all.sh first."
    fi
}

update_commix() {
    log_section "Updating Commix"

    if command_exists pip3 && pip3 show commix &>/dev/null 2>&1; then
        pip3 install --user --upgrade commix && \
            log_ok "commix updated via pip" || log_err "Failed to update commix via pip"
    elif [[ -d "$TOOLS_ROOT/commix" ]]; then
        cd "$TOOLS_ROOT/commix"
        log "Pulling latest commix changes..."
        git fetch origin
        local current
        current=$(git rev-parse HEAD)
        git pull origin master
        local new
        new=$(git rev-parse HEAD)
        if [[ "$current" != "$new" ]]; then
            log_ok "commix updated from $current to $new"
        else
            log_skip "commix already at latest commit"
        fi
    else
        log_skip "commix not found. Run install_all.sh first."
    fi
}

update_w3af() {
    log_section "Updating w3af"

    if [[ -d "$TOOLS_ROOT/w3af" ]]; then
        cd "$TOOLS_ROOT/w3af"
        log "Pulling latest w3af changes..."
        git fetch origin
        local current
        current=$(git rev-parse HEAD)
        git pull origin master 2>/dev/null || git pull origin main 2>/dev/null
        local new
        new=$(git rev-parse HEAD)
        if [[ "$current" != "$new" ]]; then
            [[ -f "requirements.txt" ]] && pip3 install --user -r requirements.txt
            log_ok "w3af updated from $current to $new"
        else
            log_skip "w3af already at latest commit"
        fi
    else
        log_skip "w3af not found at $TOOLS_ROOT/w3af. Run install_all.sh first."
    fi
}

update_deepdarkCTI() {
    log_section "Updating DeepDarkCTI"

    if [[ -d "$TOOLS_ROOT/deepdarkCTI" ]]; then
        cd "$TOOLS_ROOT/deepdarkCTI"
        log "Pulling latest threat intelligence data..."
        git fetch origin
        local current
        current=$(git rev-parse HEAD)
        git pull origin main 2>/dev/null || git pull origin master 2>/dev/null
        local new
        new=$(git rev-parse HEAD)
        if [[ "$current" != "$new" ]]; then
            log_ok "deepdarkCTI updated with new threat intelligence data"
        else
            log_skip "deepdarkCTI already at latest"
        fi
    else
        log_skip "deepdarkCTI not found at $TOOLS_ROOT/deepdarkCTI. Run install_all.sh first."
    fi
}

update_unblob() {
    log_section "Updating Unblob"

    if command_exists pip3 && pip3 show unblob &>/dev/null 2>&1; then
        local prev_version
        prev_version=$(unblob --version 2>/dev/null || echo "unknown")
        pip3 install --user --upgrade unblob && \
            log_ok "unblob updated. Previous: $prev_version → New: $(unblob --version 2>/dev/null)" || \
            log_err "Failed to update unblob"
    elif command_exists docker; then
        log "Updating unblob Docker image..."
        docker pull ghcr.io/onekey-sec/unblob:latest && \
            log_ok "unblob Docker image updated" || log_err "Failed to pull unblob Docker image"
    else
        log_skip "unblob not found. Run install_all.sh first."
    fi
}

update_adk_python() {
    log_section "Updating ADK Python"

    if command_exists pip3 && pip3 show google-adk &>/dev/null 2>&1; then
        local prev_version
        prev_version=$(pip3 show google-adk 2>/dev/null | grep Version | awk '{print $2}' || echo "unknown")
        pip3 install --user --upgrade google-adk && \
            log_ok "google-adk updated. Previous: $prev_version" || log_err "Failed to update google-adk"
    else
        log_skip "google-adk not installed. Run install_all.sh first."
    fi
}

update_firebase_tools() {
    log_section "Updating Firebase Framework Tools"

    if command_exists firebase; then
        local prev_version
        prev_version=$(firebase --version 2>/dev/null || echo "unknown")
        npm update -g firebase-tools && \
            log_ok "firebase-tools updated. Previous: $prev_version → New: $(firebase --version 2>/dev/null)" || \
            log_err "Failed to update firebase-tools"
    else
        log_skip "firebase CLI not installed. Run install_all.sh first."
    fi
}

update_book_of_secret_knowledge() {
    log_section "Updating The Book of Secret Knowledge"

    if [[ -d "$TOOLS_ROOT/the-book-of-secret-knowledge" ]]; then
        cd "$TOOLS_ROOT/the-book-of-secret-knowledge"
        log "Pulling latest knowledge base updates..."
        git fetch origin
        local current
        current=$(git rev-parse HEAD)
        git pull origin master 2>/dev/null || git pull origin main 2>/dev/null
        local new
        new=$(git rev-parse HEAD)
        if [[ "$current" != "$new" ]]; then
            log_ok "The Book of Secret Knowledge updated"
        else
            log_skip "The Book of Secret Knowledge already at latest"
        fi
    else
        log_skip "The Book of Secret Knowledge not found. Run install_all.sh first."
    fi
}

update_docker_images() {
    log_section "Updating Docker Images"

    if ! command_exists docker; then
        log_skip "Docker not available, skipping Docker image updates"
        return 0
    fi

    local images=(
        "ghcr.io/gitleaks/gitleaks:latest"
        "ghcr.io/trufflesecurity/trufflehog:latest"
        "ghcr.io/onekey-sec/unblob:latest"
        "beefproject/beef:latest"
    )

    for image in "${images[@]}"; do
        if docker image inspect "$image" &>/dev/null 2>&1; then
            log "Updating Docker image: $image"
            docker pull "$image" && log_ok "$image updated" || log_err "Failed to update $image"
        fi
    done
}

# ─── Main ─────────────────────────────────────────────────────────────────────

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║   nostalgia2812 Security Tools - Update All                  ║"
    echo "║   Branch: claude/tooling-filing-system-uG7Gs                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "Update log: $LOG_FILE"
    echo ""
}

main() {
    print_header
    log "Starting update process at $(date)"
    mkdir -p "$TOOLS_ROOT"

    update_gitleaks || true
    update_trufflehog || true
    update_aircrack_ng || true
    update_beef || true
    update_commix || true
    update_w3af || true
    update_deepdarkCTI || true
    update_unblob || true
    update_adk_python || true
    update_firebase_tools || true
    update_book_of_secret_knowledge || true
    update_docker_images || true

    log_section "Update Complete"
    log "All updates finished at $(date)"
    log "Log saved to: $LOG_FILE"
}

main "$@"
