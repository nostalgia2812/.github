from typing import Any, Dict, List


BLOCKED_CAPABILITIES: List[str] = [
    "payload generation",
    "malware delivery",
    "evasion tooling",
    "credential attacks",
    "unauthorized access",
    "exploit chaining automation",
]

SAFE_ALTERNATIVES: List[str] = [
    "defensive IOC enrichment",
    "attack-surface monitoring",
    "security control validation in authorized environments",
    "incident-response workflow integration",
    "provider catalog and API inventory review",
]


def get_safety_policy() -> Dict[str, Any]:
    return {
        "allowed_scope": "Defensive monitoring, sanctioned security validation, and incident response only.",
        "blocked_capabilities": BLOCKED_CAPABILITIES,
        "safe_alternatives": SAFE_ALTERNATIVES,
        "note": "Offensive payload creation, evasion workflows, and unauthorized access automation are intentionally not implemented.",
    }
