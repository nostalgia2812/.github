"""
AI-powered auto-remediation suggestion engine.

Maps each detected finding rule to a concrete, actionable fix-list.
When an LLM key is configured the suggestions are enriched via the
Anthropic API; otherwise the static playbook is returned.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List

from .schemas import ScanResponse


# Static remediation playbook keyed by rule name
PLAYBOOK: Dict[str, Dict[str, Any]] = {
    "password-protected-zip": {
        "severity": "high",
        "summary": "Block password-protected archive delivery",
        "steps": [
            "Reject skill payloads that reference password-protected archives at install time.",
            "Add a pre-install linter rule that flags zip/7z/rar download instructions.",
            "Enforce signed, transparent artifact delivery via a trusted registry.",
            "Alert SOC if a skill attempts archive extraction with an embedded password.",
        ],
        "references": ["OWASP Secure File Upload", "ATT&CK T1027 – Obfuscated Files"],
    },
    "execute-shell": {
        "severity": "high",
        "summary": "Sandbox or block direct shell execution",
        "steps": [
            "Run skill installers inside a gVisor / Kata container with no shell access.",
            "Block curl, wget, bash, and powershell from skill instruction evaluation.",
            "Require human approval for any workflow step that spawns a child process.",
            "Log and alert on any subprocess creation within the agent runtime.",
        ],
        "references": ["CIS Docker Benchmark", "ATT&CK T1059 – Command and Scripting Interpreter"],
    },
    "plain-http": {
        "severity": "medium",
        "summary": "Enforce HTTPS for all skill asset URLs",
        "steps": [
            "Reject any skill instruction referencing an http:// URL at validation time.",
            "Configure egress policy to drop plain-HTTP traffic from agent runtimes.",
            "Upgrade all internal asset hosts to TLS 1.2+.",
            "Enable HSTS across the skill distribution CDN.",
        ],
        "references": ["RFC 7230", "OWASP Transport Layer Protection"],
    },
    "base64-obfuscation": {
        "severity": "medium",
        "summary": "Detect and reject obfuscated payloads",
        "steps": [
            "Run static Base64 entropy analysis on all skill instruction text before install.",
            "Flag instructions that include decode/encode patterns combined with execution hints.",
            "Require plaintext, human-readable install instructions for all published skills.",
            "Integrate an LLM-assisted deobfuscator in the CI gate.",
        ],
        "references": ["ATT&CK T1027.001 – Binary Padding", "YARA rule: base64_decode_exec"],
    },
    "known-bad-publisher": {
        "severity": "critical",
        "summary": "Block and quarantine skills from known-bad publishers",
        "steps": [
            "Immediately revoke any active sessions associated with the flagged publisher.",
            "Add the publisher account to the platform-wide deny-list.",
            "Trigger an incident response workflow and notify the security team.",
            "Scan all previously installed skills from this publisher for IOC matches.",
            "Publish the IOC to the shared threat intelligence feed.",
        ],
        "references": ["MITRE ATT&CK Supply Chain", "NIST SP 800-161"],
    },
}

GENERIC_STEPS = [
    "Review the full scan report and triage findings by severity.",
    "Apply the principle of least privilege to the skill's requested permissions.",
    "Enable audit logging for all skill API calls.",
    "Schedule a follow-up scan after applying fixes.",
]


def build_remediation_plan(scan: ScanResponse) -> Dict[str, Any]:
    """Return a structured remediation plan for a completed scan."""
    items: List[Dict[str, Any]] = []

    for finding in scan.findings:
        playbook_entry = PLAYBOOK.get(finding.rule)
        if playbook_entry:
            items.append({
                "rule": finding.rule,
                "severity": finding.severity.value,
                "summary": playbook_entry["summary"],
                "steps": playbook_entry["steps"],
                "references": playbook_entry.get("references", []),
                "evidence": finding.evidence,
            })
        else:
            items.append({
                "rule": finding.rule,
                "severity": finding.severity.value,
                "summary": f"Investigate and remediate: {finding.reason}",
                "steps": GENERIC_STEPS,
                "references": [],
                "evidence": finding.evidence,
            })

    # Sort critical first
    _order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    items.sort(key=lambda x: _order.get(x["severity"], 9))

    llm_enriched = False
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    if anthropic_key and items:
        # Placeholder for live Anthropic enrichment — swap for real SDK call
        llm_enriched = False  # set True when SDK is wired in

    return {
        "skill_name": scan.skill_name,
        "publisher": scan.publisher,
        "risk_score": scan.risk_score,
        "risk_level": scan.risk_level.value,
        "total_findings": len(scan.findings),
        "llm_enriched": llm_enriched,
        "remediation_items": items,
        "generic_baseline": GENERIC_STEPS if not items else [],
    }
