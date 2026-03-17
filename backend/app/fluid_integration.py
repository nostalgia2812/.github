import os
from typing import Any, Dict

from .engine import analyze_request
from .schemas import ScanRequest


FLUID_API_KEY_ENV = "FLUID_API_KEY"
FLUID_BASE_URL_ENV = "FLUID_BASE_URL"


def _mask_secret(secret: str) -> str:
    if len(secret) <= 6:
        return "***"
    return f"{secret[:3]}***{secret[-3:]}"


def fluid_status() -> Dict[str, Any]:
    api_key = os.getenv(FLUID_API_KEY_ENV, "")
    base_url = os.getenv(FLUID_BASE_URL_ENV, "https://api.fluid.security/v1")
    return {
        "configured": bool(api_key),
        "base_url": base_url,
        "api_key_masked": _mask_secret(api_key) if api_key else None,
    }


def build_fluid_payload(payload: ScanRequest) -> Dict[str, Any]:
    scan = analyze_request(payload)
    status = fluid_status()
    return {
        "configured": status["configured"],
        "target": f"{status['base_url'].rstrip('/')}/threat-analysis",
        "headers": {
            "Authorization": f"Bearer {status['api_key_masked'] or '<missing>'}",
            "Content-Type": "application/json",
        },
        "payload": {
            "skill_name": scan.skill_name,
            "publisher": scan.publisher,
            "risk_score": scan.risk_score,
            "risk_level": scan.risk_level.value,
            "findings": [item.model_dump(mode="json") for item in scan.findings],
        },
    }
