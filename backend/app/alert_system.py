"""
Alert system — threshold-based alerts emitted when scans exceed risk thresholds.
Alerts are stored in-memory (ring buffer) and streamed via the WebSocket feed.
"""
from __future__ import annotations

import asyncio
from collections import deque
from datetime import UTC, datetime
from typing import Any, Deque, Dict, List, Optional

from .schemas import ScanResponse


MAX_ALERTS = 500

THRESHOLDS = {
    "critical": 85,
    "high":     60,
    "medium":   30,
}


class AlertBus:
    def __init__(self, maxlen: int = MAX_ALERTS) -> None:
        self._alerts: Deque[Dict[str, Any]] = deque(maxlen=maxlen)
        self._subscribers: List[asyncio.Queue[Dict[str, Any]]] = []

    def subscribe(self) -> asyncio.Queue[Dict[str, Any]]:
        q: asyncio.Queue[Dict[str, Any]] = asyncio.Queue(maxsize=100)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[Dict[str, Any]]) -> None:
        try:
            self._subscribers.remove(q)
        except ValueError:
            pass

    def emit(self, alert: Dict[str, Any]) -> None:
        self._alerts.append(alert)
        for q in list(self._subscribers):
            try:
                q.put_nowait(alert)
            except asyncio.QueueFull:
                pass

    def recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        alerts = list(self._alerts)
        return alerts[-limit:]

    def stats(self) -> Dict[str, Any]:
        alerts = list(self._alerts)
        counts: Dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for a in alerts:
            lvl = a.get("risk_level", "low")
            counts[lvl] = counts.get(lvl, 0) + 1
        return {"total": len(alerts), "breakdown": counts}


# Singleton bus shared across the application
bus = AlertBus()


def maybe_alert(scan: ScanResponse) -> Optional[Dict[str, Any]]:
    """Emit an alert if the scan risk score exceeds any threshold."""
    level = scan.risk_level.value
    threshold = THRESHOLDS.get(level, 0)
    if scan.risk_score < threshold:
        return None

    alert: Dict[str, Any] = {
        "timestamp": datetime.now(UTC).isoformat(),
        "skill_name": scan.skill_name,
        "publisher": scan.publisher,
        "risk_score": scan.risk_score,
        "risk_level": level,
        "finding_count": len(scan.findings),
        "top_findings": [f.rule for f in scan.findings[:3]],
    }
    bus.emit(alert)
    return alert
