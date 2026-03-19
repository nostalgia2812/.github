/* AI Skill Defense Dashboard — Hail Mary Edition */
const API_BASE = window.API_BASE || '';
const WS_BASE  = window.WS_BASE  || `ws://${location.host}`;

// ── Utilities ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function badgeClass(level) { return `risk-pill risk-${level || 'low'}`; }

function renderMeter(fillEl, labelEl, levelEl, score, level) {
  fillEl.style.width = `${score}%`;
  fillEl.className   = `meter-fill meter-${level}`;
  labelEl.textContent = `Risk Score ${score}/100`;
  levelEl.classList.remove('hidden');
  levelEl.className   = badgeClass(level);
  levelEl.textContent = `Risk Level: ${level.toUpperCase()}`;
}

function renderBars(barsEl, findings) {
  if (!findings.length) { barsEl.className = 'bars muted'; barsEl.textContent = 'No rule matches.'; return; }
  barsEl.className = 'bars';
  barsEl.innerHTML = findings.map(f => `
    <div class="bar-row">
      <div class="bar-header"><strong>${esc(f.rule)}</strong><span class="pill risk-${f.severity}">+${f.score_delta}</span></div>
      <div class="bar-track"><div class="bar-fill meter-${f.severity}" style="width:${Math.min(f.score_delta,100)}%"></div></div>
    </div>`).join('');
}

function severityIcon(sev) {
  return {critical:'🔴',high:'🟠',medium:'🟡',low:'🟢'}[sev] || '⚪';
}

function urlsFromInput(id) {
  return $(id).value.split(',').map(v => v.trim()).filter(Boolean);
}

function buildScanPayload(prefix='') {
  return {
    skill_name:       $(prefix+'skill_name').value,
    publisher:        $(prefix+'publisher').value,
    instruction_text: $(prefix+'instruction_text').value,
    urls:             urlsFromInput(prefix+'urls'),
  };
}

// ── Tab routing ───────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    $(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    if (btn.dataset.tab === 'alerts')  loadAlertStats();
    if (btn.dataset.tab === 'models')  initModelFilter();
  });
});

// ── Scan tab ──────────────────────────────────────────────────────────────────
$('scan-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Scanning…';
  try {
    const res  = await fetch(`${API_BASE}/api/scan`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(buildScanPayload()) });
    const data = await res.json();
    renderScanResult(data);
  } finally { btn.disabled = false; btn.textContent = 'Run Analysis'; }
});

function renderScanResult(data) {
  renderMeter($('meter-fill'), $('meter-label'), $('risk-level'), data.risk_score, data.risk_level);
  renderBars($('bars'), data.findings);
  const findings = data.findings.map(f =>
    `<li>${severityIcon(f.severity)} <strong>${esc(f.rule)}</strong> (${f.severity}) — ${esc(f.reason)}<br /><span class="muted">Evidence: ${f.evidence.map(esc).join(', ') || 'n/a'}</span></li>`
  ).join('');
  $('result').classList.remove('muted');
  $('result').innerHTML = `<p><strong>Skill:</strong> ${esc(data.skill_name)} | <strong>Publisher:</strong> ${esc(data.publisher)}</p>
    <ul class="stack">${findings || '<li>No suspicious behaviors detected.</li>'}</ul>`;
}

async function loadIocs() {
  const iocs = await fetch(`${API_BASE}/api/iocs`).then(r => r.json());
  $('ioc-list').innerHTML = iocs.map(ioc =>
    `<li>${severityIcon(ioc.severity)} <strong>${esc(ioc.type)}</strong>: ${esc(ioc.value)} <span class="muted">(${ioc.source})</span></li>`
  ).join('');
}

// ── Consensus tab ─────────────────────────────────────────────────────────────
$('consensus-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Running consensus…';
  try {
    const res  = await fetch(`${API_BASE}/api/scan/consensus`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(buildScanPayload('c-')) });
    const data = await res.json();
    renderConsensus(data);
  } finally { btn.disabled = false; btn.textContent = 'Run Consensus'; }
});

function renderConsensus(data) {
  renderMeter($('c-meter-fill'), $('c-meter-label'), $('c-risk-level'), data.consensus_score, data.consensus_level);
  $('c-meta').textContent = `${data.providers_responded}/${data.providers_queried} providers · ${data.agreement_pct}% agreement · ${data.total_latency_ms}ms`;
  const rows = data.verdicts.map(v => `
    <div class="verdict-row">
      <span class="provider-name">${esc(v.provider)}</span>
      <span class="model-name muted">${esc(v.model)}</span>
      <div class="mini-meter"><div class="meter-fill meter-${v.risk_level}" style="width:${v.risk_score}%"></div></div>
      <span class="pill risk-${v.risk_level}">${v.risk_score}</span>
      <span class="muted small">${Math.round(v.latency_ms)}ms</span>
    </div>`).join('');
  $('c-verdicts').innerHTML = rows || '<span class="muted">No verdicts.</span>';
}

// ── Batch tab ─────────────────────────────────────────────────────────────────
$('batch-btn').addEventListener('click', async () => {
  const raw = $('batch-input').value.trim();
  let payloads;
  try { payloads = JSON.parse(raw); } catch { $('batch-result').innerHTML = '<span class="muted">Invalid JSON.</span>'; return; }
  $('batch-btn').disabled = true; $('batch-btn').textContent = 'Running…';
  try {
    const res  = await fetch(`${API_BASE}/api/scan/batch`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payloads) });
    const data = await res.json();
    renderBatchResult(data);
  } finally { $('batch-btn').disabled = false; $('batch-btn').textContent = 'Run Batch'; }
});

function renderBatchResult(data) {
  if (data.error) { $('batch-result').innerHTML = `<span class="muted">${esc(data.error)}</span>`; return; }
  const b = data.breakdown;
  $('batch-result').innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><div class="stat-num">${data.total}</div><div>Total</div></div>
      <div class="stat-box risk-critical"><div class="stat-num">${b.critical}</div><div>Critical</div></div>
      <div class="stat-box risk-high"><div class="stat-num">${b.high}</div><div>High</div></div>
      <div class="stat-box risk-medium"><div class="stat-num">${b.medium}</div><div>Medium</div></div>
      <div class="stat-box risk-low"><div class="stat-num">${b.low}</div><div>Low</div></div>
      <div class="stat-box"><div class="stat-num">${Math.round(data.duration_ms)}ms</div><div>Duration</div></div>
    </div>
    <ul class="stack">${data.results.map(r =>
      `<li>${severityIcon(r.risk_level)} <strong>${esc(r.skill_name)}</strong> / ${esc(r.publisher)} — score: <strong>${r.risk_score}</strong> (${r.risk_level})</li>`
    ).join('')}</ul>`;
}

// ── Remediate tab ─────────────────────────────────────────────────────────────
$('remediate-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true; btn.textContent = 'Planning…';
  try {
    const res  = await fetch(`${API_BASE}/api/scan/remediate`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(buildScanPayload('r-')) });
    const data = await res.json();
    renderRemediation(data);
  } finally { btn.disabled = false; btn.textContent = 'Generate Remediation Plan'; }
});

function renderRemediation(data) {
  if (!data.remediation_items.length) {
    $('remediation-result').innerHTML = '<span class="muted">No findings — no remediation needed.</span>'; return;
  }
  $('remediation-result').innerHTML = `
    <p>Risk score: <strong>${data.risk_score}</strong> (${data.risk_level}) · ${data.total_findings} finding(s)</p>
    ${data.remediation_items.map(item => `
      <div class="remediation-item">
        <div class="remediation-header">${severityIcon(item.severity)} <strong>${esc(item.rule)}</strong> — ${esc(item.summary)}</div>
        <ol>${item.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        ${item.references.length ? `<p class="muted small">References: ${item.references.map(esc).join(' · ')}</p>` : ''}
      </div>`).join('')}`;
}

// ── Models tab ────────────────────────────────────────────────────────────────
let allModels = [];

async function initModelFilter() {
  if (allModels.length) return;
  const data = await fetch(`${API_BASE}/api/models`).then(r => r.json());
  allModels = data.models;
  $('model-count-badge').textContent = `${data.total} models`;
  const sel = $('model-provider-filter');
  data.providers.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; sel.appendChild(o); });
  renderModelGrid(allModels);
}

$('model-provider-filter').addEventListener('change', async () => {
  const p = $('model-provider-filter').value;
  const filtered = p ? allModels.filter(m => m.provider === p) : allModels;
  renderModelGrid(filtered);
});

$('load-models-btn').addEventListener('click', async () => {
  allModels = [];
  $('model-provider-filter').innerHTML = '<option value="">All providers</option>';
  await initModelFilter();
});

function renderModelGrid(models) {
  $('model-stats').textContent = `Showing ${models.length} model(s) · ${models.filter(m=>m.configured).length} configured`;
  $('model-grid').innerHTML = models.map(m => `
    <div class="model-card ${m.configured ? 'configured' : 'unconfigured'}">
      <div class="model-provider">${esc(m.provider)}</div>
      <div class="model-name">${esc(m.model)}</div>
      <div class="model-type pill">${esc(m.type)}</div>
      <div class="model-status ${m.configured ? 'status-ok' : 'status-missing'}">${m.configured ? '✓ ' + esc(m.api_key_masked) : '✗ key missing'}</div>
    </div>`).join('');
}

// ── Alerts tab ────────────────────────────────────────────────────────────────
let ws = null;

async function loadAlertStats() {
  const [stats, recent] = await Promise.all([
    fetch(`${API_BASE}/api/alerts/stats`).then(r => r.json()),
    fetch(`${API_BASE}/api/alerts?limit=20`).then(r => r.json()),
  ]);
  const b = stats.breakdown;
  $('alert-stats').innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><div class="stat-num">${stats.total}</div><div>Total</div></div>
      <div class="stat-box risk-critical"><div class="stat-num">${b.critical||0}</div><div>Critical</div></div>
      <div class="stat-box risk-high"><div class="stat-num">${b.high||0}</div><div>High</div></div>
      <div class="stat-box risk-medium"><div class="stat-num">${b.medium||0}</div><div>Medium</div></div>
      <div class="stat-box risk-low"><div class="stat-num">${b.low||0}</div><div>Low</div></div>
    </div>`;
  renderAlertList(recent.alerts);
}

function renderAlertList(alerts) {
  if (!alerts.length) { $('alert-list').innerHTML = '<span class="muted">No alerts.</span>'; return; }
  $('alert-list').innerHTML = `<ul class="stack">${alerts.map(a =>
    `<li>${severityIcon(a.risk_level)} <strong>${esc(a.skill_name)}</strong> / ${esc(a.publisher)} — score: <strong>${a.risk_score}</strong> · ${esc(a.timestamp)}</li>`
  ).join('')}</ul>`;
}

$('ws-toggle').addEventListener('click', () => {
  if (ws) { ws.close(); ws = null; return; }
  ws = new WebSocket(`${WS_BASE}/ws/alerts`);
  ws.onopen  = () => { $('ws-status').textContent = 'connected'; $('ws-badge').textContent = 'WS ●'; $('ws-log').classList.remove('muted'); $('ws-toggle').textContent = 'Disconnect'; };
  ws.onclose = () => { $('ws-status').textContent = 'disconnected'; $('ws-badge').textContent = 'WS ○'; $('ws-toggle').textContent = 'Connect'; ws = null; };
  ws.onmessage = (e) => {
    const a = JSON.parse(e.data);
    const line = document.createElement('div');
    line.innerHTML = `${severityIcon(a.risk_level)} <strong>${esc(a.skill_name)}</strong> score:${a.risk_score} ${esc(a.timestamp)}`;
    $('ws-log').prepend(line);
    if ($('ws-log').children.length > 50) $('ws-log').lastChild.remove();
  };
});

// ── Threats tab ───────────────────────────────────────────────────────────────
$('threat-scan-btn').addEventListener('click', async () => {
  const path = $('threat-path').value || '.';
  $('threat-result').textContent = 'Running aggregation…';
  const data = await fetch(`${API_BASE}/api/threats/aggregate?path=${encodeURIComponent(path)}`).then(r => r.json());
  renderThreats(data);
});

function renderThreats(data) {
  const s = data.sources;
  $('threat-result').innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><div class="stat-num">${data.total}</div><div>Total</div></div>
      <div class="stat-box risk-critical"><div class="stat-num">${data.breakdown.critical||0}</div><div>Critical</div></div>
      <div class="stat-box risk-high"><div class="stat-num">${data.breakdown.high||0}</div><div>High</div></div>
      <div class="stat-box risk-medium"><div class="stat-num">${data.breakdown.medium||0}</div><div>Medium</div></div>
      <div class="stat-box"><div class="stat-num">${s.gitleaks}</div><div>gitleaks</div></div>
      <div class="stat-box"><div class="stat-num">${s.trufflehog}</div><div>trufflehog</div></div>
      <div class="stat-box"><div class="stat-num">${s.antigravity}</div><div>antigravity</div></div>
    </div>
    <ul class="stack">${data.findings.slice(0,50).map(f =>
      `<li>${severityIcon(f.severity)} <span class="pill">${esc(f.source)}</span> <strong>${esc(f.rule)}</strong> — ${esc(f.description)}${f.file_path ? ` <span class="muted">${esc(f.file_path)}${f.line ? ':'+f.line : ''}</span>` : ''}${f.secret_masked ? ` <code>${esc(f.secret_masked)}</code>` : ''}</li>`
    ).join('')}${data.findings.length > 50 ? `<li class="muted">…and ${data.findings.length-50} more.</li>` : ''}</ul>`;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadIocs();
