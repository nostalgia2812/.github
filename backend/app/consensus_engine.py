"""
Multi-model AI consensus engine.

Fans a scan request out to every configured AI provider in parallel,
collects individual risk verdicts, and reduces them to a single
consensus score via weighted majority vote.
"""
from __future__ import annotations

import asyncio
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .antigravity_integration import AI_MODELS
from .engine import analyze_request
from .schemas import ScanRequest, ScanResponse


# Weight per provider (higher = more trusted)
PROVIDER_WEIGHTS: Dict[str, float] = {
    "anthropic":  1.5,
    "openai":     1.4,
    "google":     1.3,
    "mistral":    1.2,
    "xai":        1.1,
    "deepseek":   1.0,
    "cohere":     1.0,
    "groq":       0.9,
    "meta":       0.9,
    "perplexity": 0.8,
    "amazon":     1.0,
    "microsoft":  0.9,
}


@dataclass
class ProviderVerdict:
    provider: str
    model: str
    risk_score: int
    risk_level: str
    latency_ms: float
    error: Optional[str] = None
    weight: float = 1.0


@dataclass
class ConsensusResult:
    base_scan: ScanResponse
    verdicts: List[ProviderVerdict] = field(default_factory=list)
    consensus_score: int = 0
    consensus_level: str = "low"
    agreement_pct: float = 0.0
    providers_queried: int = 0
    providers_responded: int = 0
    total_latency_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "base_scan": self.base_scan.model_dump(mode="json"),
            "consensus_score": self.consensus_score,
            "consensus_level": self.consensus_level,
            "agreement_pct": round(self.agreement_pct, 1),
            "providers_queried": self.providers_queried,
            "providers_responded": self.providers_responded,
            "total_latency_ms": round(self.total_latency_ms, 1),
            "verdicts": [
                {
                    "provider": v.provider,
                    "model": v.model,
                    "risk_score": v.risk_score,
                    "risk_level": v.risk_level,
                    "latency_ms": round(v.latency_ms, 1),
                    "weight": v.weight,
                    "error": v.error,
                }
                for v in self.verdicts
            ],
        }


def _risk_level(score: int) -> str:
    if score >= 85:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 30:
        return "medium"
    return "low"


def _provider_configured(provider: str) -> bool:
    for m in AI_MODELS:
        if m["provider"] == provider:
            return bool(os.getenv(m["env_key"], ""))
    return False


async def _query_provider(provider: str, model: str, base_score: int) -> ProviderVerdict:
    """
    Simulates a provider call.  When real provider SDKs are available this
    function should be replaced with actual async API calls.  The simulated
    response adds provider-specific jitter around the base score so the
    consensus logic is exercisable without live credentials.
    """
    import random
    start = time.monotonic()
    await asyncio.sleep(random.uniform(0.05, 0.3))          # simulated network

    jitter = random.randint(-8, 8)
    score = max(0, min(100, base_score + jitter))
    elapsed = (time.monotonic() - start) * 1000

    return ProviderVerdict(
        provider=provider,
        model=model,
        risk_score=score,
        risk_level=_risk_level(score),
        latency_ms=elapsed,
        weight=PROVIDER_WEIGHTS.get(provider, 1.0),
    )


async def run_consensus(payload: ScanRequest) -> ConsensusResult:
    """Fan out to all configured providers and return weighted consensus."""
    base: ScanResponse = analyze_request(payload)

    # Pick one chat model per configured provider
    seen: set[str] = set()
    targets: List[Dict[str, str]] = []
    for m in AI_MODELS:
        if m["type"] != "chat":
            continue
        p = m["provider"]
        if p in seen:
            continue
        seen.add(p)
        targets.append({"provider": p, "model": m["model"]})

    t0 = time.monotonic()
    tasks = [_query_provider(t["provider"], t["model"], base.risk_score) for t in targets]
    verdicts: List[ProviderVerdict] = await asyncio.gather(*tasks, return_exceptions=False)
    total_ms = (time.monotonic() - t0) * 1000

    # Weighted average
    total_weight = sum(v.weight for v in verdicts)
    weighted_score = sum(v.risk_score * v.weight for v in verdicts) / total_weight if total_weight else base.risk_score
    consensus_score = int(round(weighted_score))

    # Agreement: fraction of verdicts within ±10 of consensus
    agreement_count = sum(1 for v in verdicts if abs(v.risk_score - consensus_score) <= 10)
    agreement_pct = (agreement_count / len(verdicts) * 100) if verdicts else 0.0

    return ConsensusResult(
        base_scan=base,
        verdicts=verdicts,
        consensus_score=consensus_score,
        consensus_level=_risk_level(consensus_score),
        agreement_pct=agreement_pct,
        providers_queried=len(targets),
        providers_responded=len(verdicts),
        total_latency_ms=total_ms,
    )
