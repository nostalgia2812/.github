#!/usr/bin/env bash
# =============================================================================
# check_health.sh - Verify all nostalgia2812 security tool installations
# =============================================================================
# Part of the nostalgia2812 tooling and filing system
# Branch: claude/tooling-filing-system-uG7Gs
# =============================================================================

set -uo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
TOOLS_ROOT="${TOOLS_ROOT:-$HOME/nostalgia2812-tools}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-text}"  # text | json | markdown
EXIT_ON_FAILURE="${EXIT_ON_FAILURE:-false}"
CHECK_DOCKER="${CHECK_DOCKER:-true}"
CHECK_VERSIONS="${CHECK_VERSIONS:-true}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Health Check State ───────────────────────────────────────────────────────
declare -A TOOL_STATUS
declare -A TOOL_VERSIONS
declare -A TOOL_PATHS
TOTAL=0
PASSED=0
FAILED=0
WARNINGS=0

# ─── Output Functions ─────────────────────────────────────────────────────────
print_header() {
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "${CYAN}${BOLD}"
        echo "╔══════════════════════════════════════════════════════════════╗"
        echo "║   nostalgia2812 Security Tools - Health Check                ║"
        echo "║   Branch: claude/tooling-filing-system-uG7Gs                ║"
        echo "╚══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        echo -e "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo -e "Tools Root: $TOOLS_ROOT"
        echo ""
    fi
}

print_section() {
    [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "\n${CYAN}──── $* ────${NC}"
}

check_pass() {
    local tool="$1" version="$2" path="$3"
    TOOL_STATUS["$tool"]="PASS"
    TOOL_VERSIONS["$tool"]="${version:-unknown}"
    TOOL_PATHS["$tool"]="${path:-}"
    ((PASSED++)) || true
    ((TOTAL++)) || true
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "  ${GREEN}✓${NC} ${BOLD}${tool}${NC}"
        [[ -n "$version" ]] && echo -e "    Version: $version"
        [[ -n "$path" ]] && echo -e "    Path: $path"
    fi
}

check_fail() {
    local tool="$1" message="$2"
    TOOL_STATUS["$tool"]="FAIL"
    TOOL_VERSIONS["$tool"]="not installed"
    ((FAILED++)) || true
    ((TOTAL++)) || true
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "  ${RED}✗${NC} ${BOLD}${tool}${NC}"
        echo -e "    ${RED}${message}${NC}"
    fi
}

check_warn() {
    local tool="$1" message="$2"
    TOOL_STATUS["$tool"]="WARN"
    ((WARNINGS++)) || true
    ((TOTAL++)) || true
    if [[ "$OUTPUT_FORMAT" == "text" ]]; then
        echo -e "  ${YELLOW}⚠${NC} ${BOLD}${tool}${NC}"
        echo -e "    ${YELLOW}${message}${NC}"
    fi
}

# ─── Check Functions ──────────────────────────────────────────────────────────

check_command_tool() {
    local tool="$1"
    local version_cmd="${2:-$tool --version}"
    local binary="${3:-$tool}"

    if command -v "$binary" &>/dev/null; then
        local version
        version=$(eval "$version_cmd" 2>/dev/null | head -1 || echo "unknown")
        local path
        path=$(command -v "$binary")
        check_pass "$tool" "$version" "$path"
        return 0
    fi
    return 1
}

check_dir_tool() {
    local tool="$1"
    local dir="$2"
    local check_file="${3:-}"

    if [[ -d "$dir" ]]; then
        local version="directory exists"
        if [[ -n "$check_file" && -f "$dir/$check_file" ]]; then
            version="$(head -1 "$dir/$check_file" 2>/dev/null || echo 'installed')"
        fi
        # Check for git info
        if [[ -d "$dir/.git" ]]; then
            local commit
            commit=$(git -C "$dir" rev-parse --short HEAD 2>/dev/null || echo "unknown")
            local branch
            branch=$(git -C "$dir" branch --show-current 2>/dev/null || echo "unknown")
            version="git commit $commit (branch: $branch)"
        fi
        check_pass "$tool" "$version" "$dir"
        return 0
    fi
    return 1
}

check_python_module() {
    local tool="$1"
    local module="$2"

    if python3 -c "import $module" &>/dev/null 2>&1; then
        local version
        version=$(python3 -c "import $module; print(getattr($module, '__version__', 'installed'))" 2>/dev/null || echo "installed")
        check_pass "$tool" "$version" "$(python3 -c "import $module, os; print(os.path.dirname($module.__file__))" 2>/dev/null || echo 'Python module')"
        return 0
    fi
    return 1
}

# ─── Tool Health Checks ───────────────────────────────────────────────────────

check_gitleaks() {
    print_section "Gitleaks (Secret Scanning)"
    if ! check_command_tool "gitleaks" "gitleaks version" "gitleaks"; then
        check_fail "gitleaks" "Not found in PATH. Install with: go install github.com/gitleaks/gitleaks/v8@latest"
    fi
}

check_trufflehog() {
    print_section "TruffleHog (Secret Scanning)"
    if ! check_command_tool "trufflehog" "trufflehog --version" "trufflehog"; then
        check_fail "trufflehog" "Not found in PATH. Install with: go install github.com/trufflesecurity/trufflehog/v3@latest"
    fi
}

check_aircrack_ng() {
    print_section "Aircrack-ng (Network Security)"
    if ! check_command_tool "aircrack-ng" "aircrack-ng --version 2>&1 | head -1" "aircrack-ng"; then
        check_fail "aircrack-ng" "Not found in PATH. Install with: sudo apt-get install aircrack-ng"
    fi

    # Check companion tools
    local companion_tools=("airodump-ng" "aireplay-ng" "airmon-ng")
    for ct in "${companion_tools[@]}"; do
        if command -v "$ct" &>/dev/null; then
            [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "    ${GREEN}+${NC} $ct: available"
        fi
    done
}

check_beef() {
    print_section "BeEF (Web Application Testing)"
    if check_dir_tool "beef" "$TOOLS_ROOT/beef" "beef"; then
        # Check if Ruby dependencies are met
        if [[ -f "$TOOLS_ROOT/beef/Gemfile.lock" ]]; then
            [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "    ${GREEN}+${NC} Gemfile.lock present (dependencies installed)"
        else
            [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "    ${YELLOW}!${NC} Run: cd $TOOLS_ROOT/beef && bundle install"
        fi
    elif check_dir_tool "beef" "/opt/beef" "beef"; then
        true
    else
        check_fail "beef" "Not found. Install with: scripts/install_all.sh beef"
    fi
}

check_commix() {
    print_section "Commix (Web Application Testing)"
    if check_command_tool "commix" "commix --version 2>&1" "commix"; then
        true
    elif python3 -c "import commix" &>/dev/null 2>&1; then
        check_pass "commix" "installed as Python module" "$(python3 -c "import commix, os; print(os.path.dirname(commix.__file__))" 2>/dev/null)"
    elif check_dir_tool "commix" "$TOOLS_ROOT/commix" "commix.py"; then
        true
    else
        check_fail "commix" "Not found. Install with: pip3 install commix"
    fi
}

check_w3af() {
    print_section "w3af (Web Application Testing)"
    if check_dir_tool "w3af" "$TOOLS_ROOT/w3af" "w3af_console"; then
        # Verify Python dependencies
        if [[ -f "$TOOLS_ROOT/w3af/requirements.txt" ]]; then
            local missing=0
            while IFS= read -r req; do
                [[ -z "$req" || "$req" =~ ^# ]] && continue
                local module
                module=$(echo "$req" | sed 's/[>=<].*//' | tr '-' '_')
                python3 -c "import $module" &>/dev/null 2>&1 || ((missing++)) || true
            done < "$TOOLS_ROOT/w3af/requirements.txt"
            if [[ $missing -gt 0 ]]; then
                [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "    ${YELLOW}!${NC} $missing Python dependencies may be missing"
            fi
        fi
    else
        check_fail "w3af" "Not found. Install with: scripts/install_all.sh w3af"
    fi
}

check_deepdarkCTI() {
    print_section "DeepDarkCTI (Threat Intelligence)"
    if check_dir_tool "deepdarkCTI" "$TOOLS_ROOT/deepdarkCTI" "README.md"; then
        # Check data freshness
        if [[ -d "$TOOLS_ROOT/deepdarkCTI/.git" ]]; then
            local last_update
            last_update=$(git -C "$TOOLS_ROOT/deepdarkCTI" log -1 --format="%ar" 2>/dev/null || echo "unknown")
            [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "    Last update: $last_update"
        fi
    else
        check_fail "deepdarkCTI" "Not found. Install with: scripts/install_all.sh deepdarkCTI"
    fi
}

check_unblob() {
    print_section "Unblob (Firmware Analysis)"
    if check_command_tool "unblob" "unblob --version" "unblob"; then
        # Check system dependencies
        local deps=("lzop" "zstd" "lz4")
        local missing_deps=()
        for dep in "${deps[@]}"; do
            command -v "$dep" &>/dev/null || missing_deps+=("$dep")
        done
        if [[ ${#missing_deps[@]} -gt 0 ]]; then
            [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "    ${YELLOW}!${NC} Missing system deps: ${missing_deps[*]}"
        fi
    elif check_python_module "unblob" "unblob"; then
        true
    else
        check_fail "unblob" "Not found. Install with: pip3 install unblob"
    fi
}

check_adk_python() {
    print_section "ADK Python (Development Frameworks)"
    if check_python_module "adk-python" "google.adk"; then
        true
    elif pip3 show google-adk &>/dev/null 2>&1; then
        local version
        version=$(pip3 show google-adk 2>/dev/null | grep Version | awk '{print $2}')
        check_pass "adk-python" "v$version" "$(pip3 show google-adk 2>/dev/null | grep Location | awk '{print $2}')"
    else
        check_fail "adk-python" "Not found. Install with: pip3 install google-adk"
    fi
}

check_firebase_tools() {
    print_section "Firebase Framework Tools (Development Frameworks)"
    if check_command_tool "firebase-framework-tools" "firebase --version" "firebase"; then
        true
    else
        check_fail "firebase-framework-tools" "Firebase CLI not found. Install with: npm install -g firebase-tools"
    fi
}

check_book_of_secret_knowledge() {
    print_section "The Book of Secret Knowledge (Knowledge Bases)"
    if check_dir_tool "the-book-of-secret-knowledge" "$TOOLS_ROOT/the-book-of-secret-knowledge" "README.md"; then
        # Count entries
        local count
        count=$(find "$TOOLS_ROOT/the-book-of-secret-knowledge" -name "*.md" 2>/dev/null | wc -l)
        [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "    Markdown files: $count"
    else
        check_fail "the-book-of-secret-knowledge" "Not found. Install with: scripts/install_all.sh book-of-secret-knowledge"
    fi
}

# ─── Docker Checks ────────────────────────────────────────────────────────────

check_docker_images() {
    if ! command -v docker &>/dev/null; then
        [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "  ${YELLOW}⚠${NC} Docker not available - skipping image checks"
        return 0
    fi

    print_section "Docker Images"
    local images=(
        "ghcr.io/gitleaks/gitleaks:latest:gitleaks"
        "ghcr.io/trufflesecurity/trufflehog:latest:trufflehog"
        "ghcr.io/onekey-sec/unblob:latest:unblob"
        "beefproject/beef:latest:beef"
    )

    for img_spec in "${images[@]}"; do
        local image="${img_spec%:*}"
        local tool="${img_spec##*:}"
        if docker image inspect "$image" &>/dev/null 2>&1; then
            local created
            created=$(docker image inspect "$image" --format "{{.Created}}" 2>/dev/null | cut -c1-10)
            [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "  ${GREEN}✓${NC} $image (pulled: $created)"
        else
            [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "  ${YELLOW}-${NC} $image (not pulled)"
        fi
    done
}

# ─── Environment Checks ───────────────────────────────────────────────────────

check_environment() {
    print_section "Environment Prerequisites"
    local env_checks=(
        "git:git --version"
        "python3:python3 --version"
        "go:go version"
        "ruby:ruby --version"
        "node:node --version"
        "npm:npm --version"
        "docker:docker --version"
        "curl:curl --version | head -1"
    )

    for check in "${env_checks[@]}"; do
        local name="${check%:*}"
        local cmd="${check#*:}"
        if command -v "$name" &>/dev/null; then
            local version
            version=$(eval "$cmd" 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
            [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "  ${GREEN}✓${NC} $name ${version:+v$version}"
        else
            [[ "$OUTPUT_FORMAT" == "text" ]] && echo -e "  ${YELLOW}-${NC} $name: not found"
        fi
    done
}

# ─── Summary ─────────────────────────────────────────────────────────────────

print_summary_text() {
    echo ""
    echo -e "${CYAN}${BOLD}════════════════════════════════════${NC}"
    echo -e "${CYAN}${BOLD} Health Check Summary${NC}"
    echo -e "${CYAN}${BOLD}════════════════════════════════════${NC}"
    echo ""
    echo -e "Total checks:  ${BOLD}$TOTAL${NC}"
    echo -e "Passed:        ${GREEN}${BOLD}$PASSED${NC}"
    echo -e "Failed:        ${RED}${BOLD}$FAILED${NC}"
    echo -e "Warnings:      ${YELLOW}${BOLD}$WARNINGS${NC}"
    echo ""

    if [[ $FAILED -eq 0 ]]; then
        echo -e "${GREEN}${BOLD}All tools healthy!${NC}"
    elif [[ $FAILED -lt 3 ]]; then
        echo -e "${YELLOW}${BOLD}Some tools need attention. Run scripts/install_all.sh to fix.${NC}"
    else
        echo -e "${RED}${BOLD}Multiple tools missing. Run scripts/install_all.sh to install all tools.${NC}"
    fi
    echo ""
}

print_summary_json() {
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    echo "{"
    echo "  \"timestamp\": \"$timestamp\","
    echo "  \"summary\": {"
    echo "    \"total\": $TOTAL,"
    echo "    \"passed\": $PASSED,"
    echo "    \"failed\": $FAILED,"
    echo "    \"warnings\": $WARNINGS"
    echo "  },"
    echo "  \"tools\": {"
    local first=true
    for tool in "${!TOOL_STATUS[@]}"; do
        [[ "$first" == "true" ]] || echo ","
        first=false
        printf "    \"%s\": {\"status\": \"%s\", \"version\": \"%s\"}" \
            "$tool" "${TOOL_STATUS[$tool]}" "${TOOL_VERSIONS[$tool]:-unknown}"
    done
    echo ""
    echo "  }"
    echo "}"
}

print_summary_markdown() {
    echo "# Tool Health Check Report"
    echo ""
    echo "**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    echo "## Summary"
    echo ""
    echo "| Metric | Value |"
    echo "|--------|-------|"
    echo "| Total | $TOTAL |"
    echo "| Passed | $PASSED |"
    echo "| Failed | $FAILED |"
    echo "| Warnings | $WARNINGS |"
    echo ""
    echo "## Tool Status"
    echo ""
    echo "| Tool | Status | Version |"
    echo "|------|--------|---------|"
    for tool in "${!TOOL_STATUS[@]}"; do
        local status="${TOOL_STATUS[$tool]}"
        local icon
        case "$status" in
            PASS) icon="✅" ;;
            FAIL) icon="❌" ;;
            WARN) icon="⚠️" ;;
        esac
        echo "| $tool | $icon $status | ${TOOL_VERSIONS[$tool]:-unknown} |"
    done
}

# ─── Main ─────────────────────────────────────────────────────────────────────

main() {
    print_header
    check_environment

    check_gitleaks
    check_trufflehog
    check_aircrack_ng
    check_beef
    check_commix
    check_w3af
    check_deepdarkCTI
    check_unblob
    check_adk_python
    check_firebase_tools
    check_book_of_secret_knowledge

    if [[ "$CHECK_DOCKER" == "true" ]]; then
        check_docker_images
    fi

    case "$OUTPUT_FORMAT" in
        json) print_summary_json ;;
        markdown) print_summary_markdown ;;
        *) print_summary_text ;;
    esac

    # Exit code based on failures
    if [[ "$EXIT_ON_FAILURE" == "true" && $FAILED -gt 0 ]]; then
        exit 1
    fi
}

# Parse flags
while [[ $# -gt 0 ]]; do
    case "$1" in
        --json) OUTPUT_FORMAT="json" ;;
        --markdown) OUTPUT_FORMAT="markdown" ;;
        --no-docker) CHECK_DOCKER="false" ;;
        --exit-on-failure) EXIT_ON_FAILURE="true" ;;
        --tools-root=*) TOOLS_ROOT="${1#*=}" ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --json              Output in JSON format"
            echo "  --markdown          Output in Markdown format"
            echo "  --no-docker         Skip Docker image checks"
            echo "  --exit-on-failure   Exit with code 1 if any tool fails"
            echo "  --tools-root=PATH   Set tools root directory"
            exit 0
            ;;
        *) echo "Unknown option: $1" ;;
    esac
    shift
done

main
