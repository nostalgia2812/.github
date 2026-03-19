import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)

RISKY_PAYLOAD = {
    'skill_name': 'Finance Tracker',
    'publisher': 'unknown',
    'instruction_text': 'Use curl to download zip and decode base64 in terminal',
    'urls': ['http://example.org/payload.zip'],
}
SAFE_PAYLOAD = {
    'skill_name': 'Safe Skill',
    'publisher': 'trusted-corp',
    'instruction_text': 'Summarize earnings reports.',
    'urls': [],
}


# ── Existing ───────────────────────────────────────────────────────────────────

def test_health() -> None:
    r = client.get('/api/health')
    assert r.status_code == 200
    body = r.json()
    assert body['status'] == 'ok'
    assert 'timestamp' in body
    assert 'version' in body


def test_scan_detects_risky_instructions() -> None:
    r = client.post('/api/scan', json=RISKY_PAYLOAD)
    assert r.status_code == 200
    body = r.json()
    assert body['risk_score'] == 100
    assert body['risk_level'] == 'critical'
    assert len(body['findings']) >= 4


def test_scan_detects_malicious_publisher() -> None:
    payload = {'skill_name': 'Market Pulse', 'publisher': 'hightower6eu',
               'instruction_text': 'Summarize market open data', 'urls': []}
    r = client.post('/api/scan', json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body['risk_score'] == 50
    assert any(item['rule'] == 'known-bad-publisher' for item in body['findings'])


def test_threat_model_raw_endpoint() -> None:
    r = client.get('/api/threat-model/raw')
    assert r.status_code == 200
    body = r.json()
    assert body['filename'] == 'openclaw_threat_model.py'
    assert 'class OpenClawSecurityOrchestrator' in body['code']


def test_fluid_status_endpoint_default() -> None:
    r = client.get('/api/integrations/fluid/status')
    assert r.status_code == 200
    body = r.json()
    assert body['configured'] is False
    assert 'base_url' in body


def test_fluid_payload_generation() -> None:
    r = client.post('/api/integrations/fluid/payload', json=RISKY_PAYLOAD)
    assert r.status_code == 200
    body = r.json()
    assert body['target'].endswith('/threat-analysis')
    assert body['payload']['risk_score'] == 100


def test_api_key_protection_enabled(monkeypatch) -> None:
    monkeypatch.setenv('APP_API_KEY', 'top-secret')
    unauth = client.post('/api/scan', json=SAFE_PAYLOAD)
    assert unauth.status_code == 401
    auth = client.post('/api/scan', json=SAFE_PAYLOAD, headers={'X-API-Key': 'top-secret'})
    assert auth.status_code == 200


def test_api_catalog_lists_all_endpoints() -> None:
    r = client.get('/api')
    assert r.status_code == 200
    body = r.json()
    assert body['total_endpoints'] >= 16
    paths = {e['path'] for e in body['endpoints']}
    assert '/api/scan' in paths
    assert '/api/scan/batch' in paths
    assert '/api/scan/consensus' in paths
    assert '/api/scan/remediate' in paths
    assert '/api/alerts' in paths
    assert '/api/models' in paths
    assert '/ws/alerts' in paths


# ── Batch ──────────────────────────────────────────────────────────────────────

def test_batch_scan_mixed() -> None:
    r = client.post('/api/scan/batch', json=[RISKY_PAYLOAD, SAFE_PAYLOAD])
    assert r.status_code == 200
    body = r.json()
    assert body['total'] == 2
    assert body['completed'] == 2
    assert body['breakdown']['critical'] >= 1
    assert body['breakdown']['low'] >= 1


def test_batch_scan_empty() -> None:
    r = client.post('/api/scan/batch', json=[])
    assert r.status_code == 200
    assert 'error' in r.json()


def test_batch_scan_limit_exceeded() -> None:
    r = client.post('/api/scan/batch', json=[SAFE_PAYLOAD] * 201)
    assert r.status_code == 200
    assert 'error' in r.json()


# ── Consensus ──────────────────────────────────────────────────────────────────

@pytest.mark.anyio
async def test_consensus_scan_structure() -> None:
    from httpx import AsyncClient, ASGITransport
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as ac:
        r = await ac.post('/api/scan/consensus', json=RISKY_PAYLOAD)
    assert r.status_code == 200
    body = r.json()
    assert 'consensus_score' in body
    assert 'consensus_level' in body
    assert 'agreement_pct' in body
    assert 'verdicts' in body
    assert body['providers_queried'] > 0


# ── Remediation ────────────────────────────────────────────────────────────────

def test_remediate_returns_plan() -> None:
    r = client.post('/api/scan/remediate', json=RISKY_PAYLOAD)
    assert r.status_code == 200
    body = r.json()
    assert 'remediation_items' in body
    assert len(body['remediation_items']) > 0
    first = body['remediation_items'][0]
    assert 'rule' in first
    assert 'steps' in first
    assert isinstance(first['steps'], list)


def test_remediate_safe_skill() -> None:
    r = client.post('/api/scan/remediate', json=SAFE_PAYLOAD)
    assert r.status_code == 200
    body = r.json()
    assert body['total_findings'] == 0
    assert body['remediation_items'] == []


# ── Alerts ─────────────────────────────────────────────────────────────────────

def test_alerts_endpoint() -> None:
    # Trigger an alert
    client.post('/api/scan', json=RISKY_PAYLOAD)
    r = client.get('/api/alerts')
    assert r.status_code == 200
    body = r.json()
    assert 'alerts' in body


def test_alert_stats_endpoint() -> None:
    r = client.get('/api/alerts/stats')
    assert r.status_code == 200
    body = r.json()
    assert 'total' in body
    assert 'breakdown' in body


# ── Models ─────────────────────────────────────────────────────────────────────

def test_models_endpoint_returns_all() -> None:
    r = client.get('/api/models')
    assert r.status_code == 200
    body = r.json()
    assert body['total'] >= 30
    assert len(body['providers']) >= 10
    assert all('provider' in m and 'model' in m and 'type' in m for m in body['models'])


def test_models_filter_by_provider() -> None:
    r = client.get('/api/models?provider=anthropic')
    assert r.status_code == 200
    body = r.json()
    assert all(m['provider'] == 'anthropic' for m in body['models'])
    assert body['total'] >= 3


# ── Antigravity ────────────────────────────────────────────────────────────────

def test_antigravity_status_endpoint() -> None:
    r = client.get('/api/integrations/antigravity/status')
    assert r.status_code == 200
    body = r.json()
    assert 'installed' in body
    assert 'total_models' in body
    assert body['total_models'] >= 30
