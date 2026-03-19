import asyncio
import json
import random
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any, Dict, List, Set

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .data import CHECKLIST, IOCS
from .engine import analyze_request
from .fluid_integration import build_fluid_payload, fluid_status
from .openclaw_threat_model import generate_complete_code_string
from .schemas import Checklist, Indicator, ScanRequest, ScanResponse
from .security import require_api_key


API_CATALOG: List[Dict[str, Any]] = [
    {
        "path": "/api",
        "method": "GET",
        "description": "List all available API endpoints.",
        "protected": False,
    },
    {
        "path": "/api/health",
        "method": "GET",
        "description": "Service health and server timestamp.",
        "protected": False,
    },
    {
        "path": "/api/iocs",
        "method": "GET",
        "description": "Known OpenClaw-related indicators of compromise.",
        "protected": False,
    },
    {
        "path": "/api/checklist",
        "method": "GET",
        "description": "Operational defense checklist grouped by timeline.",
        "protected": False,
    },
    {
        "path": "/api/scan",
        "method": "POST",
        "description": "Analyze skill instruction content and compute risk score/findings.",
        "protected": True,
    },
    {
        "path": "/api/threat-model/raw",
        "method": "GET",
        "description": "Export the complete OpenClaw threat-model Python source.",
        "protected": True,
    },
    {
        "path": "/api/integrations/fluid/status",
        "method": "GET",
        "description": "Show Fluid integration configuration status.",
        "protected": True,
    },
    {
        "path": "/api/integrations/fluid/payload",
        "method": "POST",
        "description": "Generate Fluid-ready payload from scan results.",
        "protected": True,
    },
    {
        "path": "/ws/feed",
        "method": "WS",
        "description": "WebSocket live-feed: streams system events to connected dashboards.",
        "protected": False,
    },
]

# ── WebSocket connection manager ──────────────────────────────────

class FeedManager:
    """Tracks active WebSocket clients and broadcasts messages to all."""

    def __init__(self) -> None:
        self._clients: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)

    async def broadcast(self, payload: Dict[str, Any]) -> None:
        dead: Set[WebSocket] = set()
        for ws in list(self._clients):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.add(ws)
        self._clients -= dead


feed_manager = FeedManager()

# ── Background feed simulator ─────────────────────────────────────

_FEED_EVENTS = [
    ("IOC pattern scan completed — no new matches.", "info"),
    ("Rule engine refreshed — 5 patterns loaded.", "info"),
    ("Health check passed.", "success"),
    ("New IOC submitted for review.", "info"),
    ("Warning: plain-HTTP URL detected in queued submission.", "warn"),
    ("Fluid integration ping successful.", "success"),
    ("OpenClaw pattern database synced.", "info"),
    ("Publisher blocklist updated.", "warn"),
]


async def _feed_simulator() -> None:
    """Periodically pushes synthetic system events to all WebSocket clients."""
    while True:
        await asyncio.sleep(random.uniform(8, 18))
        msg, level = random.choice(_FEED_EVENTS)
        await feed_manager.broadcast({"message": msg, "level": level})


# ── Lifespan (startup / shutdown) ─────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    task = asyncio.create_task(_feed_simulator())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="AI Skill Defense API",
    description="Backend service for analyzing AI agent skills and tracking OpenClaw-style indicators.",
    version="2.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST endpoints ────────────────────────────────────────────────

@app.get("/api")
def list_api() -> dict:
    return {
        "service": app.title,
        "version": app.version,
        "total_endpoints": len(API_CATALOG),
        "endpoints": API_CATALOG,
    }


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "timestamp": datetime.now(UTC).isoformat()}


@app.get("/api/iocs", response_model=List[Indicator])
def get_iocs() -> List[Indicator]:
    return IOCS


@app.get("/api/checklist", response_model=Checklist)
def get_checklist() -> Checklist:
    return CHECKLIST


@app.post("/api/scan", response_model=ScanResponse, dependencies=[Depends(require_api_key)])
async def scan_skill(payload: ScanRequest) -> ScanResponse:
    result = analyze_request(payload)
    # Broadcast scan event to all live-feed subscribers
    await feed_manager.broadcast({
        "message": (
            f"Scan complete: '{result.skill_name}' by '{result.publisher}' "
            f"— Risk {result.risk_level.value} ({result.risk_score}/100)"
        ),
        "level": "warn" if result.risk_score >= 60 else "info",
    })
    return result


@app.get("/api/threat-model/raw", dependencies=[Depends(require_api_key)])
def get_threat_model_raw() -> dict:
    return {"filename": "openclaw_threat_model.py", "code": generate_complete_code_string()}


@app.get("/api/integrations/fluid/status", dependencies=[Depends(require_api_key)])
def get_fluid_status() -> dict:
    return fluid_status()


@app.post("/api/integrations/fluid/payload", dependencies=[Depends(require_api_key)])
def get_fluid_payload(payload: ScanRequest) -> dict:
    return build_fluid_payload(payload)

# ── WebSocket live feed ───────────────────────────────────────────

@app.websocket("/ws/feed")
async def websocket_feed(ws: WebSocket) -> None:
    """Streams live system events to the dashboard."""
    await feed_manager.connect(ws)
    await ws.send_text(json.dumps({
        "message": f"Connected to SKILLDEF live feed — {datetime.now(UTC).strftime('%H:%M:%S UTC')}",
        "level": "success",
    }))
    try:
        while True:
            # Keep the socket open; client messages are ignored
            await ws.receive_text()
    except WebSocketDisconnect:
        feed_manager.disconnect(ws)
