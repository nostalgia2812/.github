from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Form, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .comms_service import (
    build_dial_twiml,
    build_incoming_twiml,
    config_status as comms_config_status,
    get_voice_token,
    is_sms_ready,
    send_sms,
)
from .data import CHECKLIST, IOCS
from .engine import analyze_request
from .fluid_integration import build_fluid_payload, fluid_status
from .openclaw_threat_model import generate_complete_code_string
from .schemas import Checklist, Indicator, ScanRequest, ScanResponse
from .security import require_api_key


class SMSSendRequest(BaseModel):
    to: str
    body: str

# --- Communications demo data ---
_COMMS_MESSAGES: List[Dict[str, Any]] = [
    {"id": 1, "channel": "sms", "direction": "inbound", "from": "+1 555-0101", "text": "Hey, is the deployment ready?", "ts": "09:12"},
    {"id": 2, "channel": "sms", "direction": "outbound", "from": "Me", "text": "Running final checks now, ~10 min.", "ts": "09:13"},
    {"id": 3, "channel": "sms", "direction": "inbound", "from": "+1 555-0101", "text": "Great, ping me when done.", "ts": "09:14"},
    {"id": 4, "channel": "messenger", "direction": "inbound", "from": "Alice Chen", "text": "Can you share the API docs link?", "ts": "09:30"},
    {"id": 5, "channel": "messenger", "direction": "outbound", "from": "Me", "text": "Sent! Check /api endpoint for catalog.", "ts": "09:31"},
    {"id": 6, "channel": "messenger", "direction": "inbound", "from": "Bob Kim", "text": "Threat scan completed successfully.", "ts": "09:45"},
    {"id": 7, "channel": "sms", "direction": "inbound", "from": "+1 555-0202", "text": "Risk score alert: CRITICAL threshold hit.", "ts": "10:02"},
    {"id": 8, "channel": "messenger", "direction": "outbound", "from": "Me", "text": "Acknowledged, reviewing now.", "ts": "10:03"},
]

_COMMS_STATS: Dict[str, Any] = {
    "total_messages": 1284,
    "messages_today": 47,
    "active_calls": 2,
    "avg_response_ms": 340,
    "delivery_rate_pct": 99.2,
    "sms_sent": 623,
    "sms_received": 418,
    "messenger_sent": 154,
    "messenger_received": 89,
    "calls_completed": 38,
    "calls_missed": 3,
    "avg_call_duration_s": 142,
    "channel_breakdown": {"sms": 60, "messenger": 30, "webrtc": 10},
}


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
        "path": "/api/comms/stats",
        "method": "GET",
        "description": "Quantitative communication channel metrics (demo mode).",
        "protected": False,
    },
    {
        "path": "/api/comms/messages",
        "method": "GET",
        "description": "Message history, filterable by channel.",
        "protected": False,
    },
    {
        "path": "/api/comms/config",
        "method": "GET",
        "description": "Twilio integration status (live vs demo mode, missing env vars).",
        "protected": False,
    },
    {
        "path": "/api/comms/sms/send",
        "method": "POST",
        "description": "Send a real SMS via Twilio (requires TWILIO_* env vars).",
        "protected": False,
    },
    {
        "path": "/api/comms/voice/token",
        "method": "GET",
        "description": "Issue a Twilio Access Token for browser-based calling.",
        "protected": False,
    },
    {
        "path": "/api/comms/voice/twiml",
        "method": "POST",
        "description": "TwiML webhook: Twilio calls this to dial outbound PSTN numbers.",
        "protected": False,
    },
    {
        "path": "/api/comms/webhook/sms",
        "method": "POST",
        "description": "Twilio webhook: receives inbound SMS and appends to message feed.",
        "protected": False,
    },
    {
        "path": "/api/comms/webhook/voice",
        "method": "POST",
        "description": "Twilio webhook: rings the browser client on inbound calls.",
        "protected": False,
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


# --- Communications endpoints (demo/mock mode) ---

@app.get("/api/comms/stats")
def get_comms_stats() -> Dict[str, Any]:
    """Quantitative communication channel metrics."""
    return {**_COMMS_STATS, "timestamp": datetime.now(UTC).isoformat()}


@app.get("/api/comms/messages")
def get_comms_messages(channel: str = "all", limit: int = 20) -> List[Dict[str, Any]]:
    """Retrieve message history, optionally filtered by channel."""
    msgs = _COMMS_MESSAGES if channel == "all" else [m for m in _COMMS_MESSAGES if m["channel"] == channel]
    return msgs[-limit:]


# --- Real Twilio endpoints ---

@app.get("/api/comms/config")
def get_comms_config() -> Dict[str, Any]:
    """Twilio integration status: shows mode (live/demo) and any missing env vars."""
    return comms_config_status()


@app.post("/api/comms/sms/send")
def sms_send(payload: SMSSendRequest) -> Dict[str, Any]:
    """Send a real SMS. Requires TWILIO_* env vars; returns error detail otherwise."""
    try:
        result = send_sms(payload.to, payload.body)
        # Mirror into in-memory feed so the UI thread updates instantly
        _COMMS_MESSAGES.append({
            "id": len(_COMMS_MESSAGES) + 1,
            "channel": "sms",
            "direction": "outbound",
            "from": "Me",
            "text": payload.body,
            "ts": datetime.now().strftime("%H:%M"),
        })
        _COMMS_STATS["total_messages"] += 1
        _COMMS_STATS["messages_today"] += 1
        _COMMS_STATS["sms_sent"] += 1
        return {"ok": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/comms/voice/token")
def voice_token(identity: str = "dashboard-user") -> Dict[str, Any]:
    """
    Issue a short-lived Twilio Access Token so the browser Twilio.Device
    can place and receive real phone calls.
    """
    try:
        token = get_voice_token(identity)
        return {"token": token, "identity": identity, "ttl": 3600}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/api/comms/voice/twiml")
async def voice_twiml(To: Optional[str] = Form(default=None)) -> Response:
    """
    TwiML webhook called by Twilio when the browser client places an outbound
    call.  Set this URL as the Request URL in your TwiML App.
    """
    if To:
        xml = build_dial_twiml(To)
    else:
        xml = build_incoming_twiml()
    return Response(content=xml, media_type="application/xml")


@app.post("/api/comms/webhook/sms")
async def sms_webhook(
    From: str = Form(...),
    Body: str = Form(default=""),
) -> Dict[str, Any]:
    """
    Twilio webhook for inbound SMS.  Set this as the Messaging webhook URL
    on your Twilio phone number (HTTP POST).
    """
    _COMMS_MESSAGES.append({
        "id": len(_COMMS_MESSAGES) + 1,
        "channel": "sms",
        "direction": "inbound",
        "from": From,
        "text": Body,
        "ts": datetime.now().strftime("%H:%M"),
    })
    _COMMS_STATS["total_messages"] += 1
    _COMMS_STATS["sms_received"] += 1
    return {"ok": True}


@app.post("/api/comms/webhook/voice")
async def voice_webhook() -> Response:
    """Twilio webhook for inbound calls: ring the browser client."""
    xml = build_incoming_twiml()
    return Response(content=xml, media_type="application/xml")
