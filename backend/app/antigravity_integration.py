"""
Antigravity integration: install, configure, and expose all supported AI model providers.
"""
import os
import subprocess
import shutil
from typing import Any, Dict, List, Optional


AI_MODELS: List[Dict[str, Any]] = [
    # OpenAI
    {"provider": "openai", "model": "gpt-4o",               "type": "chat",       "env_key": "OPENAI_API_KEY"},
    {"provider": "openai", "model": "gpt-4o-mini",          "type": "chat",       "env_key": "OPENAI_API_KEY"},
    {"provider": "openai", "model": "gpt-4-turbo",          "type": "chat",       "env_key": "OPENAI_API_KEY"},
    {"provider": "openai", "model": "gpt-3.5-turbo",        "type": "chat",       "env_key": "OPENAI_API_KEY"},
    {"provider": "openai", "model": "text-embedding-3-large","type": "embedding",  "env_key": "OPENAI_API_KEY"},
    # Anthropic
    {"provider": "anthropic", "model": "claude-opus-4-6",       "type": "chat", "env_key": "ANTHROPIC_API_KEY"},
    {"provider": "anthropic", "model": "claude-sonnet-4-6",     "type": "chat", "env_key": "ANTHROPIC_API_KEY"},
    {"provider": "anthropic", "model": "claude-haiku-4-5-20251001", "type": "chat", "env_key": "ANTHROPIC_API_KEY"},
    # Google
    {"provider": "google",    "model": "gemini-2.0-flash",       "type": "chat", "env_key": "GOOGLE_API_KEY"},
    {"provider": "google",    "model": "gemini-2.0-pro",         "type": "chat", "env_key": "GOOGLE_API_KEY"},
    {"provider": "google",    "model": "gemini-1.5-pro",         "type": "chat", "env_key": "GOOGLE_API_KEY"},
    {"provider": "google",    "model": "gemini-1.5-flash",       "type": "chat", "env_key": "GOOGLE_API_KEY"},
    {"provider": "google",    "model": "text-embedding-004",     "type": "embedding", "env_key": "GOOGLE_API_KEY"},
    # Meta / Llama (via HuggingFace or Groq)
    {"provider": "meta",      "model": "llama-3.3-70b-instruct", "type": "chat", "env_key": "GROQ_API_KEY"},
    {"provider": "meta",      "model": "llama-3.1-8b-instant",   "type": "chat", "env_key": "GROQ_API_KEY"},
    {"provider": "meta",      "model": "llama-3.2-90b-vision",   "type": "chat", "env_key": "GROQ_API_KEY"},
    # Mistral
    {"provider": "mistral",   "model": "mistral-large-latest",   "type": "chat", "env_key": "MISTRAL_API_KEY"},
    {"provider": "mistral",   "model": "mistral-small-latest",   "type": "chat", "env_key": "MISTRAL_API_KEY"},
    {"provider": "mistral",   "model": "codestral-latest",       "type": "chat", "env_key": "MISTRAL_API_KEY"},
    {"provider": "mistral",   "model": "mistral-embed",          "type": "embedding", "env_key": "MISTRAL_API_KEY"},
    # Cohere
    {"provider": "cohere",    "model": "command-r-plus",         "type": "chat", "env_key": "COHERE_API_KEY"},
    {"provider": "cohere",    "model": "command-r",              "type": "chat", "env_key": "COHERE_API_KEY"},
    {"provider": "cohere",    "model": "embed-english-v3.0",     "type": "embedding", "env_key": "COHERE_API_KEY"},
    # Amazon Bedrock
    {"provider": "amazon",    "model": "amazon.titan-text-premier-v1:0", "type": "chat", "env_key": "AWS_ACCESS_KEY_ID"},
    {"provider": "amazon",    "model": "amazon.nova-pro-v1:0",           "type": "chat", "env_key": "AWS_ACCESS_KEY_ID"},
    {"provider": "amazon",    "model": "amazon.nova-lite-v1:0",          "type": "chat", "env_key": "AWS_ACCESS_KEY_ID"},
    # xAI Grok
    {"provider": "xai",       "model": "grok-3",                "type": "chat", "env_key": "XAI_API_KEY"},
    {"provider": "xai",       "model": "grok-3-mini",           "type": "chat", "env_key": "XAI_API_KEY"},
    # DeepSeek
    {"provider": "deepseek",  "model": "deepseek-chat",         "type": "chat", "env_key": "DEEPSEEK_API_KEY"},
    {"provider": "deepseek",  "model": "deepseek-coder",        "type": "chat", "env_key": "DEEPSEEK_API_KEY"},
    # Microsoft / Phi
    {"provider": "microsoft", "model": "phi-4",                 "type": "chat", "env_key": "AZURE_OPENAI_API_KEY"},
    {"provider": "microsoft", "model": "phi-3.5-mini",          "type": "chat", "env_key": "AZURE_OPENAI_API_KEY"},
    # Groq (hosted inference)
    {"provider": "groq",      "model": "mixtral-8x7b-32768",    "type": "chat", "env_key": "GROQ_API_KEY"},
    {"provider": "groq",      "model": "gemma2-9b-it",          "type": "chat", "env_key": "GROQ_API_KEY"},
    # Perplexity
    {"provider": "perplexity","model": "sonar-pro",             "type": "chat", "env_key": "PERPLEXITY_API_KEY"},
    {"provider": "perplexity","model": "sonar",                 "type": "chat", "env_key": "PERPLEXITY_API_KEY"},
]


def _mask(secret: str) -> str:
    if len(secret) <= 6:
        return "***"
    return f"{secret[:3]}***{secret[-3:]}"


def antigravity_status() -> Dict[str, Any]:
    """Return installation status and configured model providers."""
    installed = shutil.which("antigravity") is not None

    configured_providers: Dict[str, bool] = {}
    for entry in AI_MODELS:
        provider = entry["provider"]
        if provider not in configured_providers:
            key_val = os.getenv(entry["env_key"], "")
            configured_providers[provider] = bool(key_val)

    return {
        "installed": installed,
        "version": _get_version() if installed else None,
        "configured_providers": configured_providers,
        "total_models": len(AI_MODELS),
    }


def _get_version() -> Optional[str]:
    try:
        result = subprocess.run(
            ["antigravity", "--version"],
            capture_output=True, text=True, timeout=5,
        )
        return result.stdout.strip() or result.stderr.strip()
    except Exception:
        return None


def list_models(provider: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return all AI models, optionally filtered by provider."""
    models = AI_MODELS
    if provider:
        models = [m for m in models if m["provider"] == provider]
    # Annotate each model with whether its API key is configured
    result = []
    for m in models:
        env_val = os.getenv(m["env_key"], "")
        result.append({
            **m,
            "configured": bool(env_val),
            "api_key_masked": _mask(env_val) if env_val else None,
        })
    return result
