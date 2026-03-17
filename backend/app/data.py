from typing import Dict, List

from .schemas import Checklist, Indicator, Severity


SUSPICIOUS_PATTERNS: Dict[str, dict] = {
    "password-protected-zip": {
        "score": 40,
        "severity": Severity.high,
        "reason": "Instruction suggests password-protected archive delivery.",
        "terms": ["password", "zip", "archive", "7z"],
    },
    "execute-shell": {
        "score": 35,
        "severity": Severity.high,
        "reason": "Instruction includes direct shell execution hints.",
        "terms": ["curl", "wget", "bash", "powershell", "terminal", "cmd.exe"],
    },
    "plain-http": {
        "score": 20,
        "severity": Severity.medium,
        "reason": "At least one URL uses insecure plain HTTP.",
        "terms": [],
    },
    "base64-obfuscation": {
        "score": 25,
        "severity": Severity.medium,
        "reason": "Instruction references payload encoding/decoding behavior.",
        "terms": ["base64", "decode", "encoded payload"],
    },
    "known-bad-publisher": {
        "score": 50,
        "severity": Severity.critical,
        "reason": "Publisher matches known malicious distribution account.",
        "terms": ["hightower6eu"],
    },
}

IOCS: List[Indicator] = [
    Indicator(type="publisher", value="hightower6eu", source="VirusTotal OpenClaw research", severity=Severity.critical),
    Indicator(type="password", value="openclaw", source="VirusTotal OpenClaw research", severity=Severity.high),
    Indicator(type="distribution", value="glot.io", source="Observed in malicious skill payload hosting", severity=Severity.medium),
]

CHECKLIST = Checklist(
    immediate_24h=[
        "Disable untrusted skill installation from third-party registries.",
        "Block plain HTTP egress from agent runtime environments.",
        "Require human approval for all shell-command execution workflows.",
    ],
    architecture_1_2_weeks=[
        "Run skill installers in isolated containers with read-only filesystems.",
        "Add static and LLM-assisted analysis for SKILL.md files before install.",
        "Mandate package signing for internal skill registries.",
    ],
    advanced_1_month=[
        "Enable eBPF telemetry for process/network anomaly detection.",
        "Automate IOC syncing into SIEM and endpoint policy engines.",
        "Deploy policy-as-code admission control for skill runtimes.",
    ],
)
