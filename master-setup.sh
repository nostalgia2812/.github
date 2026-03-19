#!/usr/bin/env bash
# master-setup.sh — Unified setup: antigravity + vibe + AI model config + backend stack
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
die()     { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── 1. Detect OS ──────────────────────────────────────────────────────────────
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="${ID:-unknown}"
        OS_LIKE="${ID_LIKE:-}"
    else
        OS_ID="unknown"
        OS_LIKE=""
    fi

    if [[ "$OS_ID" == "debian" || "$OS_ID" == "ubuntu" || "$OS_LIKE" == *"debian"* ]]; then
        PKG_MANAGER="apt"
    elif [[ "$OS_ID" =~ ^(rhel|fedora|centos|rocky|alma)$ || "$OS_LIKE" =~ "rhel" ]]; then
        PKG_MANAGER="dnf"
    else
        warn "Unsupported OS '${OS_ID}'. Skipping package-manager install steps."
        PKG_MANAGER="none"
    fi

    info "Detected OS: ${BOLD}${OS_ID}${RESET} (package manager: ${PKG_MANAGER})"
}

# ── 2. Install antigravity ────────────────────────────────────────────────────
install_antigravity() {
    if command -v antigravity &>/dev/null; then
        success "antigravity already installed: $(antigravity --version 2>/dev/null || echo 'unknown version')"
        return
    fi

    info "Installing antigravity..."

    case "$PKG_MANAGER" in
        apt)
            sudo mkdir -p /etc/apt/keyrings
            curl -fsSL https://us-central1-apt.pkg.dev/doc/repo-signing-key.gpg | \
                sudo gpg --dearmor --yes -o /etc/apt/keyrings/antigravity-repo-key.gpg
            echo "deb [signed-by=/etc/apt/keyrings/antigravity-repo-key.gpg] \
https://us-central1-apt.pkg.dev/projects/antigravity-auto-updater-dev/ antigravity-debian main" | \
                sudo tee /etc/apt/sources.list.d/antigravity.list > /dev/null
            sudo apt update -qq
            sudo apt install -y antigravity
            ;;
        dnf)
            sudo tee /etc/yum.repos.d/antigravity.repo > /dev/null <<'REPO'
[antigravity-rpm]
name=Antigravity RPM Repository
baseurl=https://us-central1-yum.pkg.dev/projects/antigravity-auto-updater-dev/antigravity-rpm
enabled=1
gpgcheck=0
REPO
            sudo dnf makecache -q
            sudo dnf install -y antigravity
            ;;
        *)
            warn "Cannot install antigravity automatically. Please install it manually."
            return
            ;;
    esac

    success "antigravity installed: $(antigravity --version 2>/dev/null || echo 'ok')"
}

# ── 3. Install vibe (Mistral) ─────────────────────────────────────────────────
install_vibe() {
    if command -v vibe &>/dev/null; then
        success "vibe already installed: $(vibe --version 2>/dev/null || echo 'unknown version')"
        return
    fi

    info "Installing Mistral vibe..."
    curl -LsSf https://mistral.ai/vibe/install.sh | bash
    vibe --setup
    success "vibe installed and configured."
}

# ── 4. Configure AI model providers ──────────────────────────────────────────
configure_ai_models() {
    info "Configuring AI model providers..."

    declare -A PROVIDERS=(
        [OPENAI_API_KEY]="OpenAI (GPT-4o, GPT-4-turbo, GPT-3.5-turbo, text-embedding-3-large)"
        [ANTHROPIC_API_KEY]="Anthropic (claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5)"
        [GOOGLE_API_KEY]="Google (gemini-2.0-flash, gemini-2.0-pro, gemini-1.5-pro, gemini-1.5-flash)"
        [MISTRAL_API_KEY]="Mistral (mistral-large-latest, mistral-small-latest, codestral-latest)"
        [COHERE_API_KEY]="Cohere (command-r-plus, command-r, embed-english-v3.0)"
        [GROQ_API_KEY]="Groq / Meta-Llama (llama-3.3-70b, llama-3.1-8b, llama-3.2-90b, mixtral-8x7b)"
        [XAI_API_KEY]="xAI (grok-3, grok-3-mini)"
        [DEEPSEEK_API_KEY]="DeepSeek (deepseek-chat, deepseek-coder)"
        [PERPLEXITY_API_KEY]="Perplexity (sonar-pro, sonar)"
        [AWS_ACCESS_KEY_ID]="Amazon Bedrock (nova-pro, nova-lite, titan-text-premier)"
        [AZURE_OPENAI_API_KEY]="Microsoft Azure OpenAI / Phi (phi-4, phi-3.5-mini)"
    )

    CONFIGURED=0
    MISSING=0

    for KEY in "${!PROVIDERS[@]}"; do
        if [ -n "${!KEY:-}" ]; then
            masked="${!KEY:0:3}***${!KEY: -3}"
            success "${PROVIDERS[$KEY]} — key: ${masked}"
            ((CONFIGURED++)) || true
        else
            warn "${PROVIDERS[$KEY]} — ${KEY} not set"
            ((MISSING++)) || true
        fi
    done

    echo ""
    info "Providers configured: ${BOLD}${CONFIGURED}${RESET} / $((CONFIGURED + MISSING))"

    if command -v antigravity &>/dev/null; then
        info "Running: antigravity configure --all-models"
        antigravity configure --all-models 2>/dev/null || warn "antigravity configure exited non-zero (may be expected without keys)"
    fi
}

# ── 5. Start backend stack ────────────────────────────────────────────────────
start_backend() {
    if [ "${START_BACKEND:-0}" != "1" ]; then
        info "Skipping backend stack start (set START_BACKEND=1 to enable)."
        return
    fi

    if command -v docker &>/dev/null && [ -f "${SCRIPT_DIR}/docker-compose.yml" ]; then
        info "Starting backend stack with Docker Compose..."
        docker compose -f "${SCRIPT_DIR}/docker-compose.yml" up -d --build
        success "Stack up. Frontend: http://localhost:8080  Backend: http://localhost:8000"
    else
        info "Starting backend manually..."
        cd "${SCRIPT_DIR}/backend"
        python -m venv .venv
        source .venv/bin/activate
        pip install -q -r requirements.txt
        uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
        cd "${SCRIPT_DIR}/frontend"
        python -m http.server 8080 &
        success "Backend: http://localhost:8000  Frontend: http://localhost:8080"
    fi
}

# ── 6. Print model summary ────────────────────────────────────────────────────
print_summary() {
    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo -e "${BOLD} Setup complete — AI model registry (37 models / 12 providers)${RESET}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    cat <<'TABLE'
  Provider      Models
  ──────────    ──────────────────────────────────────────────
  OpenAI        gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo,
                text-embedding-3-large
  Anthropic     claude-opus-4-6, claude-sonnet-4-6,
                claude-haiku-4-5-20251001
  Google        gemini-2.0-flash, gemini-2.0-pro, gemini-1.5-pro,
                gemini-1.5-flash, text-embedding-004
  Meta/Llama    llama-3.3-70b-instruct, llama-3.1-8b-instant,
                llama-3.2-90b-vision  (via Groq)
  Mistral       mistral-large-latest, mistral-small-latest,
                codestral-latest, mistral-embed
  Cohere        command-r-plus, command-r, embed-english-v3.0
  Amazon        nova-pro-v1, nova-lite-v1, titan-text-premier-v1
  xAI           grok-3, grok-3-mini
  DeepSeek      deepseek-chat, deepseek-coder
  Microsoft     phi-4, phi-3.5-mini
  Groq          mixtral-8x7b-32768, gemma2-9b-it
  Perplexity    sonar-pro, sonar
TABLE
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
    echo -e "${BOLD}${CYAN}=== Master Setup Script ===${RESET}"
    detect_os
    install_antigravity
    install_vibe
    configure_ai_models
    start_backend
    print_summary
}

main "$@"
