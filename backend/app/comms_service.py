"""
Real telephony and SMS via Twilio (open-source SDK: github.com/twilio/twilio-python).

Set these environment variables to enable live mode:

  TWILIO_ACCOUNT_SID      Account SID from console.twilio.com
  TWILIO_AUTH_TOKEN       Auth Token from console.twilio.com
  TWILIO_PHONE_NUMBER     Your Twilio number in E.164 form, e.g. +15005550006
  TWILIO_TWIML_APP_SID    TwiML App SID (create under Voice > TwiML Apps)
  TWILIO_API_KEY          API Key SID  (create under Account > API Keys)
  TWILIO_API_SECRET       API Key Secret

Without these vars the service reports mode="demo" and all send/token calls
raise RuntimeError instead of hitting Twilio.

Quickstart:
  1. Sign up at twilio.com (free trial includes $15 credit + a phone number).
  2. Copy Account SID + Auth Token from the console dashboard.
  3. Buy or verify a number under Phone Numbers > Manage.
  4. Create a TwiML App: Voice > TwiML Apps > Create.
     - Request URL: https://<your-host>/api/comms/voice/twiml  (HTTP POST)
  5. Create an API Key: Account > API Keys & Tokens > Create API Key.
  6. Export all six env vars before starting the backend.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Dict, List

_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
_TWIML_APP_SID = os.getenv("TWILIO_TWIML_APP_SID", "")
_API_KEY = os.getenv("TWILIO_API_KEY", "")
_API_SECRET = os.getenv("TWILIO_API_SECRET", "")


# ---------------------------------------------------------------------------
# Status helpers
# ---------------------------------------------------------------------------

def is_sms_ready() -> bool:
    return bool(_ACCOUNT_SID and _AUTH_TOKEN and _PHONE_NUMBER)


def is_voice_ready() -> bool:
    return is_sms_ready() and bool(_TWIML_APP_SID and _API_KEY and _API_SECRET)


def config_status() -> Dict[str, Any]:
    missing: List[str] = []
    for name, val in [
        ("TWILIO_ACCOUNT_SID", _ACCOUNT_SID),
        ("TWILIO_AUTH_TOKEN", _AUTH_TOKEN),
        ("TWILIO_PHONE_NUMBER", _PHONE_NUMBER),
        ("TWILIO_TWIML_APP_SID", _TWIML_APP_SID),
        ("TWILIO_API_KEY", _API_KEY),
        ("TWILIO_API_SECRET", _API_SECRET),
    ]:
        if not val:
            missing.append(name)

    return {
        "mode": "live" if is_sms_ready() else "demo",
        "sms_ready": is_sms_ready(),
        "voice_ready": is_voice_ready(),
        "phone_number": _PHONE_NUMBER or None,
        "missing_vars": missing,
        "setup_guide": (
            "https://www.twilio.com/docs/voice/sdks/javascript/get-started"
            if missing else None
        ),
    }


# ---------------------------------------------------------------------------
# SMS
# ---------------------------------------------------------------------------

def send_sms(to: str, body: str) -> Dict[str, Any]:
    """Send a real SMS via Twilio REST API."""
    if not is_sms_ready():
        raise RuntimeError(
            "SMS not ready. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, "
            "and TWILIO_PHONE_NUMBER environment variables."
        )
    from twilio.rest import Client  # lazy import – app starts without twilio installed

    client = Client(_ACCOUNT_SID, _AUTH_TOKEN)
    msg = client.messages.create(body=body, from_=_PHONE_NUMBER, to=to)
    return {
        "sid": msg.sid,
        "status": msg.status,
        "to": msg.to,
        "from": _PHONE_NUMBER,
        "ts": datetime.now().strftime("%H:%M"),
    }


# ---------------------------------------------------------------------------
# Voice (WebRTC → PSTN via Twilio Voice JS SDK)
# ---------------------------------------------------------------------------

def get_voice_token(identity: str = "dashboard-user") -> str:
    """
    Return a signed JWT that the Twilio.Device browser SDK uses to make
    and receive real phone calls.
    """
    if not is_voice_ready():
        raise RuntimeError(
            "Voice not ready. Set TWILIO_TWIML_APP_SID, TWILIO_API_KEY, "
            "and TWILIO_API_SECRET in addition to the base Twilio vars."
        )
    from twilio.jwt.access_token import AccessToken
    from twilio.jwt.access_token.grants import VoiceGrant

    token = AccessToken(
        _ACCOUNT_SID,
        _API_KEY,
        _API_SECRET,
        identity=identity,
        ttl=3600,
    )
    token.add_grant(
        VoiceGrant(
            outgoing_application_sid=_TWIML_APP_SID,
            incoming_allow=True,
        )
    )
    return token.to_jwt()


def build_dial_twiml(to: str) -> str:
    """
    TwiML instructing Twilio to dial a PSTN number when the browser client
    places an outbound call.  Configure your TwiML App's Request URL to
    POST to /api/comms/voice/twiml.
    """
    from twilio.twiml.voice_response import Dial, VoiceResponse

    resp = VoiceResponse()
    dial = Dial(caller_id=_PHONE_NUMBER, timeout=30)
    dial.number(to)
    resp.append(dial)
    return str(resp)


def build_incoming_twiml(client_identity: str = "dashboard-user") -> str:
    """TwiML for inbound calls: ring the browser client."""
    from twilio.twiml.voice_response import Client as TwiClient
    from twilio.twiml.voice_response import Dial, VoiceResponse

    resp = VoiceResponse()
    dial = Dial()
    dial.client(client_identity)
    resp.append(dial)
    return str(resp)
