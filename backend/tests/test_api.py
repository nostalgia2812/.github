from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get('/api/health')
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'ok'
    assert 'timestamp' in body


def test_scan_detects_risky_instructions() -> None:
    payload = {
        'skill_name': 'Finance Tracker',
        'publisher': 'unknown',
        'instruction_text': 'Use curl to download zip and decode base64 in terminal',
        'urls': ['http://example.org/payload.zip'],
    }
    response = client.post('/api/scan', json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body['risk_score'] == 100
    assert body['risk_level'] == 'critical'
    assert len(body['findings']) >= 4


def test_scan_detects_malicious_publisher() -> None:
    payload = {
        'skill_name': 'Market Pulse',
        'publisher': 'hightower6eu',
        'instruction_text': 'Summarize market open data',
        'urls': [],
    }
    response = client.post('/api/scan', json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body['risk_score'] == 50
    assert body['risk_level'] == 'medium'
    assert any(item['rule'] == 'known-bad-publisher' for item in body['findings'])


def test_threat_model_raw_endpoint() -> None:
    response = client.get('/api/threat-model/raw')
    assert response.status_code == 200
    body = response.json()
    assert body['filename'] == 'openclaw_threat_model.py'
    assert 'class OpenClawSecurityOrchestrator' in body['code']


def test_fluid_status_endpoint_default() -> None:
    response = client.get('/api/integrations/fluid/status')
    assert response.status_code == 200
    body = response.json()
    assert body['configured'] is False
    assert 'base_url' in body


def test_fluid_payload_generation() -> None:
    payload = {
        'skill_name': 'Finance Tracker',
        'publisher': 'unknown',
        'instruction_text': 'Use curl to download zip and decode base64 in terminal',
        'urls': ['http://example.org/payload.zip'],
    }
    response = client.post('/api/integrations/fluid/payload', json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body['target'].endswith('/threat-analysis')
    assert body['payload']['risk_score'] == 100


def test_api_key_protection_enabled(monkeypatch) -> None:
    monkeypatch.setenv('APP_API_KEY', 'top-secret')

    payload = {
        'skill_name': 'Finance Tracker',
        'publisher': 'unknown',
        'instruction_text': 'safe text',
        'urls': [],
    }

    unauthorized = client.post('/api/scan', json=payload)
    assert unauthorized.status_code == 401

    authorized = client.post('/api/scan', json=payload, headers={'X-API-Key': 'top-secret'})
    assert authorized.status_code == 200


def test_api_catalog_lists_all_endpoints() -> None:
    response = client.get('/api')
    assert response.status_code == 200
    body = response.json()
    assert body['total_endpoints'] >= 12
    paths = {entry['path'] for entry in body['endpoints']}
    assert '/api/scan' in paths
    assert '/api/integrations/fluid/payload' in paths
    assert '/api/audit' in paths


def test_provider_catalog_shows_defensive_usage_policy() -> None:
    response = client.get('/api/providers')
    assert response.status_code == 200
    body = response.json()
    assert len(body['providers']) >= 4
    assert 'payload generation' in body['usage_policy']['blocked']


def test_safety_policy_blocks_offensive_capabilities() -> None:
    response = client.get('/api/safety/policy')
    assert response.status_code == 200
    body = response.json()
    assert 'payload generation' in body['blocked_capabilities']
    assert 'defensive IOC enrichment' in body['safe_alternatives']


def test_dashboard_context_contains_latest_content_and_tools() -> None:
    response = client.get('/api/dashboard/context')
    assert response.status_code == 200
    body = response.json()
    assert len(body['latest_content']) >= 6
    assert any(tool['name'] == 'Prompt Maker Image Generator' for tool in body['tools'])


def test_developer_toolkit_contains_powershell_and_adk_guidance() -> None:
    response = client.get('/api/developer-toolkit')
    assert response.status_code == 200
    body = response.json()
    assert any(item['name'] == 'Google ADK + Gemini CLI' for item in body['developer_workflows'])
    assert any(cmd['command'] == 'kit version' for cmd in body['powershell_commands'])


def test_audit_endpoint_reminds_on_http(monkeypatch) -> None:
    from app import main as main_module

    class DummyResult:
        url = 'http://example.com'
        ok = True
        status_code = 200
        latency_ms = 12
        message = 'Endpoint responded successfully.'
        https_recommended = True

    monkeypatch.setattr(main_module, 'audit_url', lambda url: DummyResult())
    response = client.post('/api/audit', json={'url': 'http://example.com'})
    assert response.status_code == 200
    body = response.json()
    assert body['status_code'] == 200
    assert body['https_recommended'] is True
