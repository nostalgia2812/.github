from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .data import CHECKLIST, IOCS
from .engine import analyze_request
from .antigravity_integration import AI_MODELS, antigravity_status, list_models
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
        "path": "/api/integrations/antigravity/status",
        "method": "GET",
        "description": "Show Antigravity installation status and configured AI providers.",
        "protected": True,
    },
    {
        "path": "/api/models",
        "method": "GET",
        "description": "List all supported AI models, optionally filtered by provider.",
        "protected": True,
    },
]


app = FastAPI(
    title="AI Skill Defense API",
    description="Backend service for analyzing AI agent skills and tracking OpenClaw-style indicators.",
    version="2.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api")
def list_api() -> dict:
    return {"service": app.title, "version": app.version, "total_endpoints": len(API_CATALOG), "endpoints": API_CATALOG}


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
def scan_skill(payload: ScanRequest) -> ScanResponse:
    return analyze_request(payload)


@app.get("/api/threat-model/raw", dependencies=[Depends(require_api_key)])
def get_threat_model_raw() -> dict:
    return {"filename": "openclaw_threat_model.py", "code": generate_complete_code_string()}


@app.get("/api/integrations/fluid/status", dependencies=[Depends(require_api_key)])
def get_fluid_status() -> dict:
    return fluid_status()


@app.post("/api/integrations/fluid/payload", dependencies=[Depends(require_api_key)])
def get_fluid_payload(payload: ScanRequest) -> dict:
    return build_fluid_payload(payload)


@app.get("/api/integrations/antigravity/status", dependencies=[Depends(require_api_key)])
def get_antigravity_status() -> dict:
    return antigravity_status()


@app.get("/api/models", dependencies=[Depends(require_api_key)])
def get_models(provider: Optional[str] = None) -> dict:
    models = list_models(provider=provider)
    providers = sorted({m["provider"] for m in AI_MODELS})
    return {"total": len(models), "providers": providers, "models": models}
