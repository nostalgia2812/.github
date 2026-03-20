#!/usr/bin/env bash
# =============================================================================
# install_all.sh - Install all nostalgia2812 security tools
# =============================================================================
# Part of the nostalgia2812 tooling and filing system
# Branch: claude/tooling-filing-system-uG7Gs
# =============================================================================

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLS_ROOT="${TOOLS_ROOT:-$HOME/nostalgia2812-tools}"
LOG_FILE="${LOG_FILE:-/tmp/tool-install-$(date +%Y%m%d-%H%M%S).log}"
PARALLEL="${PARALLEL:-false}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ─── Logging ──────────────────────────────────────────────────────────────────
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $*" | tee -a "$LOG_FILE"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
log_err() { echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"; }
log_section() { echo -e "\n${CYAN}════════════════════════════════════${NC}\n${CYAN} $*${NC}\n${CYAN}════════════════════════════════════${NC}" | tee -a "$LOG_FILE"; }

# ─── Utility Functions ────────────────────────────────────────────────────────
command_exists() { command -v "$1" &>/dev/null; }

require_sudo() {
    if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
        log_warn "Some installations require sudo. You may be prompted for your password."
    fi
}

detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        echo "${ID:-unknown}"
    elif [[ "$(uname)" == "Darwin" ]]; then
        echo "darwin"
    else
        echo "unknown"
    fi
}

detect_arch() {
    local arch
    arch=$(uname -m)
    case "$arch" in
        x86_64) echo "amd64" ;;
        aarch64|arm64) echo "arm64" ;;
        armv7l) echo "armv7" ;;
        *) echo "$arch" ;;
    esac
}

# ─── Installation Functions ───────────────────────────────────────────────────

install_go_tool() {
    local name="$1"
    local package="$2"
    log "Installing $name via go install..."
    if command_exists go; then
        go install "$package" && log_ok "$name installed via go" || log_err "Failed to install $name via go"
    else
        log_warn "Go not found. Skipping go-based installation of $name."
        return 1
    fi
}

install_apt_packages() {
    local packages=("$@")
    if command_exists apt-get; then
        log "Installing apt packages: ${packages[*]}"
        sudo apt-get update -qq
        sudo apt-get install -y "${packages[@]}" && log_ok "Apt packages installed" || log_warn "Some apt packages failed"
    else
        log_warn "apt-get not available, skipping: ${packages[*]}"
    fi
}

install_pip_package() {
    local name="$1"
    local package="$2"
    log "Installing $name via pip..."
    if command_exists pip3; then
        pip3 install --user "$package" && log_ok "$name installed via pip3" || log_err "Failed to install $name via pip3"
    elif command_exists pip; then
        pip install --user "$package" && log_ok "$name installed via pip" || log_err "Failed to install $name via pip"
    else
        log_warn "pip not found. Skipping pip-based installation of $name."
        return 1
    fi
}

# ─── Tool Installation Functions ──────────────────────────────────────────────

install_gitleaks() {
    log_section "Installing Gitleaks (Secret Scanning)"

    if command_exists gitleaks; then
        log_warn "gitleaks already installed: $(gitleaks version 2>/dev/null || echo 'unknown version')"
        return 0
    fi

    local os arch version="v8.18.0"
    os=$(detect_os)
    arch=$(detect_arch)

    # Try go install first
    if command_exists go; then
        install_go_tool "gitleaks" "github.com/gitleaks/gitleaks/v8@latest" && return 0
    fi

    # Try binary download
    local binary_url
    case "$os" in
        linux)
            binary_url="https://github.com/gitleaks/gitleaks/releases/download/${version}/gitleaks_${version#v}_linux_${arch}.tar.gz"
            ;;
        darwin)
            if command_exists brew; then
                brew install gitleaks && log_ok "gitleaks installed via brew" && return 0
            fi
            binary_url="https://github.com/gitleaks/gitleaks/releases/download/${version}/gitleaks_${version#v}_darwin_${arch}.tar.gz"
            ;;
    esac

    if [[ -n "${binary_url:-}" ]]; then
        local tmp_dir
        tmp_dir=$(mktemp -d)
        log "Downloading gitleaks from $binary_url..."
        curl -sL "$binary_url" | tar xz -C "$tmp_dir"
        sudo mv "$tmp_dir/gitleaks" /usr/local/bin/
        rm -rf "$tmp_dir"
        log_ok "gitleaks installed to /usr/local/bin/"
    fi
}

install_trufflehog() {
    log_section "Installing TruffleHog (Secret Scanning)"

    if command_exists trufflehog; then
        log_warn "trufflehog already installed: $(trufflehog --version 2>/dev/null || echo 'unknown version')"
        return 0
    fi

    local os
    os=$(detect_os)

    # Try go install first
    if command_exists go; then
        install_go_tool "trufflehog" "github.com/trufflesecurity/trufflehog/v3@latest" && return 0
    fi

    # Try install script
    log "Installing trufflehog via install script..."
    curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin && \
        log_ok "trufflehog installed" || log_err "Failed to install trufflehog"
}

install_aircrack_ng() {
    log_section "Installing Aircrack-ng (Network Security)"

    if command_exists aircrack-ng; then
        log_warn "aircrack-ng already installed: $(aircrack-ng --version 2>/dev/null | head -1 || echo 'unknown version')"
        return 0
    fi

    local os
    os=$(detect_os)

    case "$os" in
        ubuntu|debian)
            install_apt_packages aircrack-ng
            ;;
        fedora|rhel|centos)
            sudo dnf install -y aircrack-ng && log_ok "aircrack-ng installed" || log_err "Failed to install aircrack-ng"
            ;;
        darwin)
            if command_exists brew; then
                brew install aircrack-ng && log_ok "aircrack-ng installed via brew"
            else
                log_warn "Homebrew not found. Install aircrack-ng manually on macOS."
            fi
            ;;
        *)
            log_warn "Building aircrack-ng from source..."
            local src_dir="/tmp/aircrack-ng-build"
            install_apt_packages build-essential autoconf automake libtool pkg-config \
                libnl-3-dev libnl-genl-3-dev libssl-dev ethtool iw usbutils
            git clone https://github.com/nostalgia2812/aircrack-ng.git "$src_dir"
            cd "$src_dir" && autoreconf -i && ./configure && make -j"$(nproc)" && sudo make install
            log_ok "aircrack-ng built and installed from source"
            ;;
    esac
}

install_beef() {
    log_section "Installing BeEF (Web Application Testing)"

    if [[ -d "$TOOLS_ROOT/beef" ]]; then
        log_warn "BeEF directory already exists at $TOOLS_ROOT/beef"
        return 0
    fi

    if ! command_exists ruby; then
        log "Installing Ruby..."
        local os
        os=$(detect_os)
        case "$os" in
            ubuntu|debian) install_apt_packages ruby-full ;;
            darwin) brew install ruby ;;
            *) log_err "Please install Ruby manually" && return 1 ;;
        esac
    fi

    mkdir -p "$TOOLS_ROOT"
    log "Cloning BeEF to $TOOLS_ROOT/beef..."
    git clone https://github.com/nostalgia2812/beef.git "$TOOLS_ROOT/beef"
    cd "$TOOLS_ROOT/beef"

    if command_exists bundle; then
        bundle install --without test development && log_ok "BeEF dependencies installed"
    else
        gem install bundler && bundle install --without test development && log_ok "BeEF dependencies installed"
    fi
}

install_commix() {
    log_section "Installing Commix (Web Application Testing)"

    if command_exists commix || python3 -m commix --version &>/dev/null 2>&1; then
        log_warn "commix already installed"
        return 0
    fi

    # Try pip install
    if install_pip_package "commix" "commix"; then
        return 0
    fi

    # Fall back to cloning
    mkdir -p "$TOOLS_ROOT"
    log "Cloning commix to $TOOLS_ROOT/commix..."
    git clone https://github.com/nostalgia2812/commix.git "$TOOLS_ROOT/commix"

    # Create wrapper script
    cat > /usr/local/bin/commix << 'WRAPPER'
#!/usr/bin/env bash
exec python3 "$HOME/nostalgia2812-tools/commix/commix.py" "$@"
WRAPPER
    chmod +x /usr/local/bin/commix
    log_ok "commix installed to $TOOLS_ROOT/commix"
}

install_w3af() {
    log_section "Installing w3af (Web Application Testing)"

    if [[ -d "$TOOLS_ROOT/w3af" ]]; then
        log_warn "w3af directory already exists at $TOOLS_ROOT/w3af"
        return 0
    fi

    mkdir -p "$TOOLS_ROOT"
    log "Cloning w3af to $TOOLS_ROOT/w3af..."
    git clone https://github.com/nostalgia2812/w3af.git "$TOOLS_ROOT/w3af"
    cd "$TOOLS_ROOT/w3af"

    if [[ -f "requirements.txt" ]]; then
        pip3 install --user -r requirements.txt && log_ok "w3af dependencies installed"
    fi

    log_ok "w3af installed to $TOOLS_ROOT/w3af"
}

install_deepdarkCTI() {
    log_section "Installing DeepDarkCTI (Threat Intelligence)"

    if [[ -d "$TOOLS_ROOT/deepdarkCTI" ]]; then
        log_warn "deepdarkCTI already exists at $TOOLS_ROOT/deepdarkCTI"
        return 0
    fi

    mkdir -p "$TOOLS_ROOT"
    log "Cloning deepdarkCTI to $TOOLS_ROOT/deepdarkCTI..."
    git clone https://github.com/nostalgia2812/deepdarkCTI.git "$TOOLS_ROOT/deepdarkCTI"
    log_ok "deepdarkCTI installed to $TOOLS_ROOT/deepdarkCTI"
}

install_unblob() {
    log_section "Installing Unblob (Firmware Analysis)"

    if command_exists unblob; then
        log_warn "unblob already installed: $(unblob --version 2>/dev/null || echo 'unknown version')"
        return 0
    fi

    # Install system dependencies
    log "Installing unblob system dependencies..."
    local os
    os=$(detect_os)
    case "$os" in
        ubuntu|debian)
            install_apt_packages lzop zstd lz4 unar p7zip-full squashfs-tools \
                build-essential libmagic1 liblzo2-dev
            ;;
        darwin)
            brew install lzop zstd lz4 unar p7zip squashfs-tools
            ;;
    esac

    # Install via pip
    install_pip_package "unblob" "unblob" && return 0

    log_warn "Trying Docker-based unblob..."
    if command_exists docker; then
        docker pull ghcr.io/onekey-sec/unblob:latest && \
        cat > /usr/local/bin/unblob << 'WRAPPER'
#!/usr/bin/env bash
docker run --rm -v "$(pwd):/data" ghcr.io/onekey-sec/unblob:latest "$@"
WRAPPER
        chmod +x /usr/local/bin/unblob
        log_ok "unblob installed via Docker wrapper"
    fi
}

install_adk_python() {
    log_section "Installing ADK Python (Development Frameworks)"

    if python3 -c "import google.adk" &>/dev/null 2>&1; then
        log_warn "adk-python already installed"
        return 0
    fi

    install_pip_package "google-adk" "google-adk" && return 0
    log_warn "adk-python installation may require additional configuration"
}

install_firebase_tools() {
    log_section "Installing Firebase Framework Tools (Development Frameworks)"

    if command_exists firebase; then
        log_warn "firebase CLI already installed: $(firebase --version 2>/dev/null || echo 'unknown version')"
        return 0
    fi

    if command_exists npm; then
        npm install -g firebase-tools && log_ok "firebase-tools installed" || log_err "Failed to install firebase-tools"
    elif command_exists node; then
        log_warn "npm not found but node is available. Please install npm."
    else
        log_warn "Node.js not found. Please install Node.js >= 16 first."
    fi
}

install_book_of_secret_knowledge() {
    log_section "Installing The Book of Secret Knowledge (Knowledge Bases)"

    if [[ -d "$TOOLS_ROOT/the-book-of-secret-knowledge" ]]; then
        log_warn "The Book of Secret Knowledge already exists at $TOOLS_ROOT/the-book-of-secret-knowledge"
        return 0
    fi

    mkdir -p "$TOOLS_ROOT"
    log "Cloning The Book of Secret Knowledge to $TOOLS_ROOT/the-book-of-secret-knowledge..."
    git clone https://github.com/nostalgia2812/the-book-of-secret-knowledge.git \
        "$TOOLS_ROOT/the-book-of-secret-knowledge"
    log_ok "The Book of Secret Knowledge available at $TOOLS_ROOT/the-book-of-secret-knowledge"
}

# ─── Pre-commit Hook Setup ────────────────────────────────────────────────────

setup_precommit_hooks() {
    log_section "Setting Up Pre-commit Security Hooks"

    if ! command_exists pre-commit; then
        install_pip_package "pre-commit" "pre-commit"
    fi

    local config_file=".pre-commit-config.yaml"
    if [[ ! -f "$config_file" ]]; then
        cat > "$config_file" << 'PRECOMMIT'
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
        name: Gitleaks Secret Scanner
        description: Detect hardcoded secrets in git commits
PRECOMMIT
        log_ok "Created .pre-commit-config.yaml with gitleaks hook"
    fi

    if command_exists pre-commit; then
        pre-commit install && log_ok "Pre-commit hooks installed"
    fi
}

# ─── Main Installation Flow ───────────────────────────────────────────────────

print_header() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║   nostalgia2812 Security Tools - Complete Installation       ║"
    echo "║   Branch: claude/tooling-filing-system-uG7Gs                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "Installation log: $LOG_FILE"
    echo "Tools root: $TOOLS_ROOT"
    echo ""
}

print_summary() {
    log_section "Installation Summary"
    echo ""
    local tools=("gitleaks" "trufflehog" "aircrack-ng" "commix" "unblob" "firebase")
    for tool in "${tools[@]}"; do
        if command_exists "$tool"; then
            log_ok "$tool: installed"
        else
            log_warn "$tool: not found in PATH"
        fi
    done

    local dirs=("beef" "commix" "w3af" "deepdarkCTI" "the-book-of-secret-knowledge")
    for dir in "${dirs[@]}"; do
        if [[ -d "$TOOLS_ROOT/$dir" ]]; then
            log_ok "$dir: available at $TOOLS_ROOT/$dir"
        fi
    done

    echo ""
    echo "Installation log saved to: $LOG_FILE"
}

main() {
    print_header
    require_sudo
    mkdir -p "$TOOLS_ROOT"

    # Parse arguments
    local tools_to_install=()
    if [[ $# -eq 0 ]]; then
        tools_to_install=(all)
    else
        tools_to_install=("$@")
    fi

    local install_all=false
    for arg in "${tools_to_install[@]}"; do
        [[ "$arg" == "all" ]] && install_all=true
    done

    # Secret Scanning
    if $install_all || [[ " ${tools_to_install[*]} " =~ " gitleaks " ]]; then
        install_gitleaks || log_warn "gitleaks installation failed"
    fi
    if $install_all || [[ " ${tools_to_install[*]} " =~ " trufflehog " ]]; then
        install_trufflehog || log_warn "trufflehog installation failed"
    fi

    # Network Security
    if $install_all || [[ " ${tools_to_install[*]} " =~ " aircrack-ng " ]]; then
        install_aircrack_ng || log_warn "aircrack-ng installation failed"
    fi

    # Web Application Testing
    if $install_all || [[ " ${tools_to_install[*]} " =~ " beef " ]]; then
        install_beef || log_warn "beef installation failed"
    fi
    if $install_all || [[ " ${tools_to_install[*]} " =~ " commix " ]]; then
        install_commix || log_warn "commix installation failed"
    fi
    if $install_all || [[ " ${tools_to_install[*]} " =~ " w3af " ]]; then
        install_w3af || log_warn "w3af installation failed"
    fi

    # Threat Intelligence
    if $install_all || [[ " ${tools_to_install[*]} " =~ " deepdarkCTI " ]]; then
        install_deepdarkCTI || log_warn "deepdarkCTI installation failed"
    fi

    # Firmware Analysis
    if $install_all || [[ " ${tools_to_install[*]} " =~ " unblob " ]]; then
        install_unblob || log_warn "unblob installation failed"
    fi

    # Development Frameworks
    if $install_all || [[ " ${tools_to_install[*]} " =~ " adk-python " ]]; then
        install_adk_python || log_warn "adk-python installation failed"
    fi
    if $install_all || [[ " ${tools_to_install[*]} " =~ " firebase " ]]; then
        install_firebase_tools || log_warn "firebase-tools installation failed"
    fi

    # Knowledge Bases
    if $install_all || [[ " ${tools_to_install[*]} " =~ " book-of-secret-knowledge " ]]; then
        install_book_of_secret_knowledge || log_warn "book-of-secret-knowledge installation failed"
    fi

    # Setup pre-commit hooks
    if $install_all; then
        setup_precommit_hooks || log_warn "pre-commit setup failed"
    fi

    print_summary
}

main "$@"
