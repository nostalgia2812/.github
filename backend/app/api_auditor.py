from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


@dataclass
class AuditResult:
    url: str
    ok: bool
    status_code: Optional[int]
    latency_ms: int
    message: str
    https_recommended: bool



def audit_url(target_url: str, timeout_s: float = 5.0) -> AuditResult:
    parsed = urlparse(target_url)
    if parsed.scheme not in {"http", "https"}:
        return AuditResult(
            url=target_url,
            ok=False,
            status_code=None,
            latency_ms=0,
            message="Only http:// and https:// URLs are supported.",
            https_recommended=False,
        )

    request = Request(target_url, method="GET", headers={"User-Agent": "ai-skill-defense-auditor/1.0"})
    started = time.perf_counter()
    try:
        with urlopen(request, timeout=timeout_s) as response:
            latency_ms = int((time.perf_counter() - started) * 1000)
            status_code = getattr(response, "status", 200)
            return AuditResult(
                url=target_url,
                ok=200 <= status_code < 400,
                status_code=status_code,
                latency_ms=latency_ms,
                message="Endpoint responded successfully.",
                https_recommended=parsed.scheme != "https",
            )
    except HTTPError as exc:
        latency_ms = int((time.perf_counter() - started) * 1000)
        return AuditResult(
            url=target_url,
            ok=False,
            status_code=exc.code,
            latency_ms=latency_ms,
            message=f"Endpoint returned HTTP {exc.code}.",
            https_recommended=parsed.scheme != "https",
        )
    except URLError as exc:
        latency_ms = int((time.perf_counter() - started) * 1000)
        return AuditResult(
            url=target_url,
            ok=False,
            status_code=None,
            latency_ms=latency_ms,
            message=f"Request failed: {exc.reason}",
            https_recommended=parsed.scheme != "https",
        )
