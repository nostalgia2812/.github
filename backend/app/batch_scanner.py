"""
Batch scanner — process many skills concurrently and return aggregated stats.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List

from .engine import analyze_request
from .schemas import ScanRequest, ScanResponse


@dataclass
class BatchResult:
    total: int
    completed: int
    duration_ms: float
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    results: List[Dict[str, Any]] = field(default_factory=list)

    @property
    def summary(self) -> Dict[str, Any]:
        return {
            "total": self.total,
            "completed": self.completed,
            "duration_ms": round(self.duration_ms, 1),
            "breakdown": {
                "critical": self.critical,
                "high": self.high,
                "medium": self.medium,
                "low": self.low,
            },
            "results": self.results,
        }


async def _scan_one(payload: ScanRequest) -> ScanResponse:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, analyze_request, payload)


async def run_batch(payloads: List[ScanRequest], concurrency: int = 10) -> BatchResult:
    sem = asyncio.Semaphore(concurrency)
    t0 = time.monotonic()

    async def _bounded(p: ScanRequest) -> ScanResponse:
        async with sem:
            return await _scan_one(p)

    responses: List[ScanResponse] = await asyncio.gather(*[_bounded(p) for p in payloads])
    duration_ms = (time.monotonic() - t0) * 1000

    result = BatchResult(total=len(payloads), completed=len(responses), duration_ms=duration_ms)
    for r in responses:
        result.results.append(r.model_dump(mode="json"))
        lvl = r.risk_level.value
        if lvl == "critical":
            result.critical += 1
        elif lvl == "high":
            result.high += 1
        elif lvl == "medium":
            result.medium += 1
        else:
            result.low += 1

    return result
