from typing import Iterable, List

from .data import SUSPICIOUS_PATTERNS
from .schemas import Finding, ScanRequest, ScanResponse, Severity


def _extract_matches(text: str, terms: Iterable[str]) -> List[str]:
    lowered = text.lower()
    return [term for term in terms if term in lowered]


def _risk_level(score: int) -> Severity:
    if score >= 85:
        return Severity.critical
    if score >= 60:
        return Severity.high
    if score >= 30:
        return Severity.medium
    return Severity.low


def analyze_request(payload: ScanRequest) -> ScanResponse:
    findings: List[Finding] = []
    score = 0
    text = payload.instruction_text.lower()

    for rule_name, metadata in SUSPICIOUS_PATTERNS.items():
        if rule_name == "plain-http":
            if any(str(url).startswith("http://") for url in payload.urls):
                score += metadata["score"]
                findings.append(
                    Finding(
                        rule=rule_name,
                        severity=metadata["severity"],
                        score_delta=metadata["score"],
                        reason=metadata["reason"],
                        evidence=[str(url) for url in payload.urls if str(url).startswith("http://")],
                    )
                )
            continue

        if rule_name == "known-bad-publisher":
            matched = _extract_matches(payload.publisher.lower(), metadata["terms"])
        else:
            matched = _extract_matches(text, metadata["terms"])

        if matched:
            score += metadata["score"]
            findings.append(
                Finding(
                    rule=rule_name,
                    severity=metadata["severity"],
                    score_delta=metadata["score"],
                    reason=metadata["reason"],
                    evidence=matched,
                )
            )

    normalized_score = min(score, 100)
    return ScanResponse(
        skill_name=payload.skill_name,
        publisher=payload.publisher,
        risk_score=normalized_score,
        risk_level=_risk_level(normalized_score),
        findings=findings,
    )
