from typing import Any, Dict, List


THREAT_INTEL_PROVIDERS: List[Dict[str, Any]] = [
    {
        "name": "DarkOwl Vision",
        "category": "threat-intelligence",
        "purpose": "Monitor dark-web exposure, market chatter, and leaked-data references for defensive investigations.",
        "environment_variables": ["DARKOWL_API_KEY", "DARKOWL_BASE_URL"],
        "safe_endpoints": [
            "POST /providers/darkowl/search",
            "GET /providers/darkowl/status",
        ],
    },
    {
        "name": "FullHunt OEM",
        "category": "attack-surface-management",
        "purpose": "Track external attack surface, exposed assets, and organization risk posture.",
        "environment_variables": ["FULLHUNT_API_KEY", "FULLHUNT_BASE_URL"],
        "safe_endpoints": [
            "POST /providers/fullhunt/attack-surface/search",
            "POST /providers/fullhunt/organization/search",
        ],
    },
    {
        "name": "AIL Project Onion Lookup",
        "category": "osint",
        "purpose": "Lookup onion-service metadata for sanctioned threat-intelligence enrichment.",
        "environment_variables": ["AIL_BASE_URL"],
        "safe_endpoints": [
            "GET /providers/ail/onion/{domain}",
            "POST /providers/ail/onion/batch",
        ],
    },
    {
        "name": "SpiderSilk",
        "category": "threat-intelligence",
        "purpose": "Review credential and infrastructure exposure signals for defensive monitoring.",
        "environment_variables": ["SPIDERSILK_API_KEY", "SPIDERSILK_BASE_URL"],
        "safe_endpoints": [
            "GET /providers/spidersilk/darkweb",
            "POST /providers/spidersilk/darkweb/credentials",
        ],
    },
]


def provider_catalog() -> Dict[str, Any]:
    return {
        "providers": THREAT_INTEL_PROVIDERS,
        "usage_policy": {
            "allowed": "Defensive monitoring, sanctioned security testing, and incident response.",
            "blocked": [
                "payload generation",
                "evasion tooling",
                "credential attacks",
                "malware delivery",
                "unauthorized access",
            ],
        },
    }
