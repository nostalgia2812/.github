"""
Threat aggregator — fuses findings from gitleaks, trufflehog, and antigravity
into a unified threat feed normalised to the platform schema.
"""
from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class AggregatedFinding:
    source: str          # "gitleaks" | "trufflehog" | "antigravity" | "platform"
    rule: str
    severity: str
    description: str
    file_path: Optional[str]
    line: Optional[int]
    commit: Optional[str]
    secret_masked: Optional[str]
    timestamp: str


def _mask(value: str) -> str:
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}{'*' * (len(value) - 8)}{value[-4:]}"


# ── Parsers ───────────────────────────────────────────────────────────────────

def _parse_gitleaks(raw: List[Dict[str, Any]]) -> List[AggregatedFinding]:
    out: List[AggregatedFinding] = []
    for item in raw:
        secret = item.get("Secret", "")
        out.append(AggregatedFinding(
            source="gitleaks",
            rule=item.get("RuleID", "unknown"),
            severity="high",
            description=item.get("Description", "Secret detected"),
            file_path=item.get("File"),
            line=item.get("StartLine"),
            commit=item.get("Commit"),
            secret_masked=_mask(secret) if secret else None,
            timestamp=item.get("Date", datetime.now(UTC).isoformat()),
        ))
    return out


def _parse_trufflehog(raw: List[Dict[str, Any]]) -> List[AggregatedFinding]:
    out: List[AggregatedFinding] = []
    for item in raw:
        secret = item.get("Raw", "")
        meta = item.get("SourceMetadata", {}).get("Data", {}).get("Git", {})
        out.append(AggregatedFinding(
            source="trufflehog",
            rule=item.get("DetectorName", "unknown"),
            severity="critical" if item.get("Verified") else "medium",
            description=f"{'Verified' if item.get('Verified') else 'Unverified'} credential detected",
            file_path=meta.get("file"),
            line=meta.get("line"),
            commit=meta.get("commit"),
            secret_masked=_mask(secret) if secret else None,
            timestamp=datetime.now(UTC).isoformat(),
        ))
    return out


def _parse_antigravity(raw: List[Dict[str, Any]]) -> List[AggregatedFinding]:
    out: List[AggregatedFinding] = []
    for item in raw:
        out.append(AggregatedFinding(
            source="antigravity",
            rule=item.get("rule", "unknown"),
            severity=item.get("severity", "medium"),
            description=item.get("description", "Antigravity finding"),
            file_path=item.get("file"),
            line=item.get("line"),
            commit=item.get("commit"),
            secret_masked=None,
            timestamp=item.get("timestamp", datetime.now(UTC).isoformat()),
        ))
    return out


# ── Runner helpers ────────────────────────────────────────────────────────────

def _run_gitleaks(path: str) -> List[AggregatedFinding]:
    try:
        result = subprocess.run(
            ["gitleaks", "detect", "--source", path, "--report-format", "json",
             "--report-path", "/dev/stdout", "--no-banner", "--exit-code", "0"],
            capture_output=True, text=True, timeout=120,
        )
        data = json.loads(result.stdout or "[]")
        return _parse_gitleaks(data if isinstance(data, list) else [])
    except Exception as exc:
        return [AggregatedFinding(
            source="gitleaks", rule="runner-error", severity="low",
            description=str(exc), file_path=None, line=None,
            commit=None, secret_masked=None,
            timestamp=datetime.now(UTC).isoformat(),
        )]


def _run_trufflehog(path: str) -> List[AggregatedFinding]:
    try:
        result = subprocess.run(
            ["trufflehog", "filesystem", path, "--json", "--no-update"],
            capture_output=True, text=True, timeout=180,
        )
        lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
        data = [json.loads(l) for l in lines]
        return _parse_trufflehog(data)
    except Exception as exc:
        return [AggregatedFinding(
            source="trufflehog", rule="runner-error", severity="low",
            description=str(exc), file_path=None, line=None,
            commit=None, secret_masked=None,
            timestamp=datetime.now(UTC).isoformat(),
        )]


def _run_antigravity(path: str) -> List[AggregatedFinding]:
    try:
        result = subprocess.run(
            ["antigravity", "scan", "--format", "json", path],
            capture_output=True, text=True, timeout=120,
        )
        data = json.loads(result.stdout or "[]")
        items = data if isinstance(data, list) else data.get("findings", [])
        return _parse_antigravity(items)
    except Exception as exc:
        return [AggregatedFinding(
            source="antigravity", rule="runner-error", severity="low",
            description=str(exc), file_path=None, line=None,
            commit=None, secret_masked=None,
            timestamp=datetime.now(UTC).isoformat(),
        )]


# ── Public API ────────────────────────────────────────────────────────────────

def aggregate(scan_path: str = ".") -> Dict[str, Any]:
    """Run all three scanners concurrently and return unified findings."""
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        f_gl  = pool.submit(_run_gitleaks,    scan_path)
        f_th  = pool.submit(_run_trufflehog,  scan_path)
        f_ag  = pool.submit(_run_antigravity, scan_path)
        gl    = f_gl.result()
        th    = f_th.result()
        ag    = f_ag.result()

    all_findings = gl + th + ag
    _sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    all_findings.sort(key=lambda f: _sev_order.get(f.severity, 9))

    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in all_findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1

    return {
        "scan_path": scan_path,
        "timestamp": datetime.now(UTC).isoformat(),
        "total": len(all_findings),
        "breakdown": counts,
        "sources": {
            "gitleaks": len(gl),
            "trufflehog": len(th),
            "antigravity": len(ag),
        },
        "findings": [
            {
                "source": f.source,
                "rule": f.rule,
                "severity": f.severity,
                "description": f.description,
                "file_path": f.file_path,
                "line": f.line,
                "commit": f.commit,
                "secret_masked": f.secret_masked,
                "timestamp": f.timestamp,
            }
            for f in all_findings
        ],
    }
