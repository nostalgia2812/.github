from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from fastapi import Body, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .data import CHECKLIST, IOCS
from .engine import analyze_request
from .fluid_integration import build_fluid_payload, fluid_status
from .ghostwallet import (
    GHOSTWALLET_ERRORS,
    build_deployment_dashboard,
    correct_error,
    CorrectionResult,
    DeploymentDashboard,
    GWErrorEntry,
)
from .openclaw_threat_model import generate_complete_code_string
from .schemas import (
    Checklist,
    DeploymentProbe,
    ErrorCorrectionRequest,
    Indicator,
    ScanRequest,
    ScanResponse,
)
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
    # --- GhostWallet ---
    {
        "path": "/api/ghostwallet/errors",
        "method": "GET",
        "description": "List all GhostWallet error codes with descriptions and correction steps.",
        "protected": False,
    },
    {
        "path": "/api/ghostwallet/errors/{code}",
        "method": "GET",
        "description": "Retrieve a single GhostWallet error entry by code (e.g. GW-007).",
        "protected": False,
    },
    {
        "path": "/api/ghostwallet/correct",
        "method": "POST",
        "description": "Submit a raw error code or message; returns structured correction result.",
        "protected": False,
    },
    # --- Deployment dashboard ---
    {
        "path": "/api/deployment/dashboard",
        "method": "GET",
        "description": "Snapshot of all service health checks and GhostWallet error category summary.",
        "protected": False,
    },
    {
        "path": "/api/deployment/dashboard",
        "method": "POST",
        "description": "Submit live probe results and receive an updated deployment dashboard.",
        "protected": False,
    },
]


app = FastAPI(
    title="AI Skill Defense API",
    description=(
        "Backend service for analyzing AI agent skills, tracking OpenClaw-style indicators, "
        "and managing GhostWallet error correction with deployment health dashboards."
    ),
    version="2.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Core endpoints
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# GhostWallet error correction endpoints
# ---------------------------------------------------------------------------

@app.get("/api/ghostwallet/errors")
def list_ghostwallet_errors() -> dict:
    """Return all registered GhostWallet error codes."""
    return {
        "total": len(GHOSTWALLET_ERRORS),
        "errors": list(GHOSTWALLET_ERRORS.values()),
    }


@app.get("/api/ghostwallet/errors/{code}")
def get_ghostwallet_error(code: str) -> GWErrorEntry:
    """Return a single GhostWallet error entry by code (case-insensitive)."""
    from fastapi import HTTPException, status as http_status

    normalised = code.upper()
    entry = GHOSTWALLET_ERRORS.get(normalised)
    if entry is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=f"No GhostWallet error registered for code '{normalised}'.",
        )
    return entry


@app.post("/api/ghostwallet/correct")
def ghostwallet_correct(payload: ErrorCorrectionRequest) -> CorrectionResult:
    """Accept a raw error string and return a structured correction result."""
    return correct_error(payload.raw_input)


# ---------------------------------------------------------------------------
# Deployment dashboard endpoints
# ---------------------------------------------------------------------------

@app.get("/api/deployment/dashboard")
def get_deployment_dashboard() -> DeploymentDashboard:
    """Return a live-generated deployment health snapshot with default probes."""
    return build_deployment_dashboard()


@app.post("/api/deployment/dashboard")
def post_deployment_dashboard(probes: Optional[List[DeploymentProbe]] = Body(default=None)) -> DeploymentDashboard:
    """Accept caller-supplied probe results and generate a deployment dashboard."""
    raw = None
    if probes:
        raw = [p.model_dump() for p in probes]
    return build_deployment_dashboard(raw)
