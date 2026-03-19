from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .alert_system import bus, maybe_alert
from .antigravity_integration import AI_MODELS, antigravity_status, list_models
from .batch_scanner import run_batch
from .consensus_engine import run_consensus
from .data import CHECKLIST, IOCS
from .engine import analyze_request
from .fluid_integration import build_fluid_payload, fluid_status
from .openclaw_threat_model import generate_complete_code_string
from .remediation import build_remediation_plan
from .schemas import Checklist, Indicator, ScanRequest, ScanResponse
from .security import require_api_key
from .threat_aggregator import aggregate


API_CATALOG: List[Dict[str, Any]] = [
    {"path": "/api",                                  "method": "GET",  "description": "List all available API endpoints.",                                  "protected": False},
    {"path": "/api/health",                           "method": "GET",  "description": "Service health and server timestamp.",                               "protected": False},
    {"path": "/api/iocs",                             "method": "GET",  "description": "Known OpenClaw-related indicators of compromise.",                   "protected": False},
    {"path": "/api/checklist",                        "method": "GET",  "description": "Operational defense checklist grouped by timeline.",                 "protected": False},
    {"path": "/api/scan",                             "method": "POST", "description": "Analyze skill instruction content and compute risk score/findings.", "protected": True},
    {"path": "/api/scan/batch",                       "method": "POST", "description": "Batch-scan multiple skills concurrently.",                           "protected": True},
    {"path": "/api/scan/consensus",                   "method": "POST", "description": "Multi-model AI consensus scan across all configured providers.",     "protected": True},
    {"path": "/api/scan/remediate",                   "method": "POST", "description": "Run scan and return AI-powered remediation plan.",                   "protected": True},
    {"path": "/api/threats/aggregate",                "method": "GET",  "description": "Fused findings from gitleaks + trufflehog + antigravity.",           "protected": True},
    {"path": "/api/alerts",                           "method": "GET",  "description": "Recent risk alerts (ring buffer).",                                  "protected": True},
    {"path": "/api/alerts/stats",                     "method": "GET",  "description": "Alert count breakdown by severity.",                                 "protected": True},
    {"path": "/api/threat-model/raw",                 "method": "GET",  "description": "Export the complete OpenClaw threat-model Python source.",           "protected": True},
    {"path": "/api/integrations/fluid/status",        "method": "GET",  "description": "Show Fluid integration configuration status.",                      "protected": True},
    {"path": "/api/integrations/fluid/payload",       "method": "POST", "description": "Generate Fluid-ready payload from scan results.",                   "protected": True},
    {"path": "/api/integrations/antigravity/status",  "method": "GET",  "description": "Show Antigravity installation status and configured AI providers.", "protected": True},
    {"path": "/api/models",                           "method": "GET",  "description": "List all supported AI models, optionally filtered by provider.",    "protected": True},
    {"path": "/ws/alerts",                            "method": "WS",   "description": "WebSocket live alert stream.",                                       "protected": False},
]


app = FastAPI(
    title="AI Skill Defense API",
    description="Backend service for analyzing AI agent skills and tracking OpenClaw-style indicators.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Core ──────────────────────────────────────────────────────────────────────

@app.get("/api")
def list_api() -> dict:
    return {"service": app.title, "version": app.version, "total_endpoints": len(API_CATALOG), "endpoints": API_CATALOG}


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "timestamp": datetime.now(UTC).isoformat(), "version": app.version}


@app.get("/api/iocs", response_model=List[Indicator])
def get_iocs() -> List[Indicator]:
    return IOCS


@app.get("/api/checklist", response_model=Checklist)
def get_checklist() -> Checklist:
    return CHECKLIST


# ── Scan ──────────────────────────────────────────────────────────────────────

@app.post("/api/scan", response_model=ScanResponse, dependencies=[Depends(require_api_key)])
def scan_skill(payload: ScanRequest) -> ScanResponse:
    result = analyze_request(payload)
    maybe_alert(result)
    return result


@app.post("/api/scan/batch", dependencies=[Depends(require_api_key)])
async def scan_batch(payloads: List[ScanRequest]) -> dict:
    if not payloads:
        return {"error": "No payloads provided"}
    if len(payloads) > 200:
        return {"error": "Batch limit is 200 skills"}
    result = await run_batch(payloads)
    return result.summary


@app.post("/api/scan/consensus", dependencies=[Depends(require_api_key)])
async def scan_consensus(payload: ScanRequest) -> dict:
    result = await run_consensus(payload)
    maybe_alert(result.base_scan)
    return result.to_dict()


@app.post("/api/scan/remediate", dependencies=[Depends(require_api_key)])
def scan_and_remediate(payload: ScanRequest) -> dict:
    scan = analyze_request(payload)
    maybe_alert(scan)
    return build_remediation_plan(scan)


# ── Threats ───────────────────────────────────────────────────────────────────

@app.get("/api/threats/aggregate", dependencies=[Depends(require_api_key)])
def get_aggregated_threats(path: str = ".") -> dict:
    return aggregate(scan_path=path)


# ── Alerts ────────────────────────────────────────────────────────────────────

@app.get("/api/alerts", dependencies=[Depends(require_api_key)])
def get_alerts(limit: int = 50) -> dict:
    return {"alerts": bus.recent(limit=limit)}


@app.get("/api/alerts/stats", dependencies=[Depends(require_api_key)])
def get_alert_stats() -> dict:
    return bus.stats()


@app.websocket("/ws/alerts")
async def ws_alerts(websocket: WebSocket) -> None:
    await websocket.accept()
    q = bus.subscribe()
    try:
        while True:
            alert = await q.get()
            await websocket.send_json(alert)
    except WebSocketDisconnect:
        bus.unsubscribe(q)


# ── Threat model ──────────────────────────────────────────────────────────────

@app.get("/api/threat-model/raw", dependencies=[Depends(require_api_key)])
def get_threat_model_raw() -> dict:
    return {"filename": "openclaw_threat_model.py", "code": generate_complete_code_string()}


# ── Integrations ──────────────────────────────────────────────────────────────

@app.get("/api/integrations/fluid/status", dependencies=[Depends(require_api_key)])
def get_fluid_status() -> dict:
    return fluid_status()


@app.post("/api/integrations/fluid/payload", dependencies=[Depends(require_api_key)])
def get_fluid_payload(payload: ScanRequest) -> dict:
    return build_fluid_payload(payload)


@app.get("/api/integrations/antigravity/status", dependencies=[Depends(require_api_key)])
def get_antigravity_status() -> dict:
    return antigravity_status()


# ── Models ────────────────────────────────────────────────────────────────────

@app.get("/api/models", dependencies=[Depends(require_api_key)])
def get_models(provider: Optional[str] = None) -> dict:
    models = list_models(provider=provider)
    providers = sorted({m["provider"] for m in AI_MODELS})
    return {"total": len(models), "providers": providers, "models": models}
