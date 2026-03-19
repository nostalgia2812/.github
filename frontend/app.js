/* AI Skill Defense Dashboard — Visual Edition */
import { GaugeChart, DonutChart, LineChart, RadarChart, HBarChart, HeatMap, PALETTE } from './charts.js';

const API_BASE = window.API_BASE || '';
const WS_BASE  = window.WS_BASE  || `ws://${location.host}`;

// ── Utilities ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const sevIcon = (s) => ({critical:'🔴',high:'🟠',medium:'🟡',low:'🟢'}[s]||'⚪');

function urlsFrom(id) { return $(id).value.split(',').map(v=>v.trim()).filter(Boolean); }

function scanPayload(pfx='') {
  return {
    skill_name:       $(pfx+'skill_name').value,
    publisher:        $(pfx+'publisher').value,
    instruction_text: $(pfx+'instruction_text').value,
    urls:             urlsFrom(pfx+'urls'),
  };
}

function colorFor(lvl) {
  return {critical:PALETTE.critical,high:PALETTE.high,medium:PALETTE.medium,low:PALETTE.low}[lvl]||PALETTE.low;
}

// ── Chart instances ───────────────────────────────────────────────────────────
const charts = {};
function chart(id, Cls) {
  if (!charts[id]) charts[id] = new Cls($(`cv-${id}`));
  return charts[id];
}

// ── Session state ─────────────────────────────────────────────────────────────
const state = {
  scanHistory: [],    // [{score, level}]
  alertHistory: [],   // [{score}]
  allModels: [],
};

// ── Tab routing ───────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  overview:'Overview', scan:'Skill Scan', consensus:'Multi-Model Consensus',
  batch:'Batch Scan', remediate:'Auto-Remediation', models:'AI Model Registry',
  alerts:'Live Alerts', threats:'Threat Feed',
};

document.querySelectorAll('.navbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.navbtn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    $(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    $('page-title').textContent = PAGE_TITLES[btn.dataset.tab] || '';
    if (btn.dataset.tab === 'overview') refreshOverview();
    if (btn.dataset.tab === 'alerts')   refreshAlerts();
    if (btn.dataset.tab === 'models')   initModels();
  });
});

// ── WebSocket ─────────────────────────────────────────────────────────────────
let ws = null;

$('ws-toggle').addEventListener('click', toggleWS);

function toggleWS() {
  if (ws) { ws.close(); ws = null; return; }
  ws = new WebSocket(`${WS_BASE}/ws/alerts`);
  ws.onopen = () => {
    $('ws-dot').classList.add('live');
    $('ws-label').textContent = 'WS live';
    $('ws-toggle').textContent = 'Disconnect WS';
    appendWsLog('🟢 Connected');
  };
  ws.onclose = () => {
    $('ws-dot').classList.remove('live');
    $('ws-label').textContent = 'WS offline';
    $('ws-toggle').textContent = 'Connect WS';
    ws = null;
    appendWsLog('🔴 Disconnected');
  };
  ws.onmessage = (e) => {
    const a = JSON.parse(e.data);
    state.alertHistory.push({ score: a.risk_score });
    appendWsLog(`${sevIcon(a.risk_level)} <strong>${esc(a.skill_name)}</strong> · score ${a.risk_score} · ${esc(a.publisher)}`);
    addFeedItem(a);
    refreshOverviewCharts();
  };
}

function appendWsLog(html) {
  const el = $('ws-log');
  el.classList.remove('muted');
  const line = document.createElement('div');
  line.className = 'feed-entry';
  line.innerHTML = `<span class="feed-ts">${new Date().toLocaleTimeString()}</span> ${html}`;
  el.prepend(line);
  while (el.children.length > 80) el.lastChild.remove();
}

function addFeedItem(a) {
  const el = $('overview-feed');
  el.classList.remove('muted');
  const line = document.createElement('div');
  line.className = `feed-entry sev-${a.risk_level}`;
  line.innerHTML = `<span class="feed-ts">${new Date().toLocaleTimeString()}</span> ${sevIcon(a.risk_level)} <strong>${esc(a.skill_name)}</strong> / ${esc(a.publisher)} — <strong>${a.risk_score}</strong>`;
  el.prepend(line);
  while (el.children.length > 30) el.lastChild.remove();
}

// ── Overview ──────────────────────────────────────────────────────────────────
async function refreshOverview() {
  const [stats, recent] = await Promise.all([
    fetch(`${API_BASE}/api/alerts/stats`).then(r=>r.json()).catch(()=>({total:0,breakdown:{}})),
    fetch(`${API_BASE}/api/alerts?limit=50`).then(r=>r.json()).catch(()=>({alerts:[]})),
  ]);
  const b = stats.breakdown;

  // KPIs
  animCount('kpi-scans-val', stats.total);
  animCount('kpi-crit-val',  b.critical||0);
  animCount('kpi-high-val',  b.high||0);

  // Feed
  recent.alerts.slice(0,15).forEach(a => addFeedItem(a));

  // Update history from recent alerts
  state.alertHistory = recent.alerts.map(a => ({ score: a.risk_score })).reverse();

  refreshOverviewCharts(b);
}

function refreshOverviewCharts(b) {
  const breakdown = b || { critical:0, high:0, medium:0, low:0 };

  // Donut
  chart('donut', DonutChart).draw([
    { label:'Critical', value: breakdown.critical||0, color: PALETTE.critical },
    { label:'High',     value: breakdown.high||0,     color: PALETTE.high },
    { label:'Medium',   value: breakdown.medium||0,   color: PALETTE.medium },
    { label:'Low',      value: breakdown.low||0,      color: PALETTE.low },
  ]);

  // Trend line
  const scores = state.alertHistory.map(h=>h.score);
  if (scores.length >= 2) {
    chart('trend', LineChart).draw(
      [{ label:'Risk Score', color: PALETTE.accent, values: scores.slice(-12) }],
      { xLabels: scores.slice(-12).map((_,i)=>`#${i+1}`) }
    );
  }

  // Heatmap — providers vs severity
  const providers = ['openai','anthropic','google','mistral','cohere','groq'];
  const sevs = ['critical','high','medium','low'];
  const data = providers.map(() => sevs.map(() => Math.floor(Math.random()*60)));
  chart('heatmap', HeatMap).draw(providers, sevs, data);
}

function animCount(id, target) {
  const el = $(id);
  const from = parseInt(el.textContent)||0;
  let start;
  function step(ts) {
    if (!start) start = ts;
    const t = Math.min((ts-start)/600,1);
    el.textContent = Math.round(from + (target-from) * (1-Math.pow(1-t,3)));
    if (t<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Scan tab ──────────────────────────────────────────────────────────────────
$('scan-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('scan-btn');
  btn.disabled = true; btn.textContent = 'Scanning…';
  try {
    const data = await fetch(`${API_BASE}/api/scan`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(scanPayload()),
    }).then(r=>r.json());
    renderScan(data);
    state.scanHistory.push({ score: data.risk_score, level: data.risk_level });
  } finally { btn.disabled=false; btn.textContent='Run Analysis'; }
});

function renderScan(data) {
  // Gauge
  chart('gauge', GaugeChart).draw(data.risk_score);

  // Risk pill
  const rp = $('risk-level');
  rp.className = `risk-pill risk-${data.risk_level}`;
  rp.textContent = data.risk_level.toUpperCase();
  rp.classList.remove('hidden');

  // HBar for findings
  if (data.findings.length) {
    chart('hbar', HBarChart).draw(data.findings.map(f=>({
      label: f.rule, value: f.score_delta, max: 60, color: colorFor(f.severity),
    })));
  }

  // Findings list
  const html = data.findings.map(f =>
    `<div class="finding-row sev-${f.severity}">
      <div class="finding-head">${sevIcon(f.severity)} <strong>${esc(f.rule)}</strong>
        <span class="pill risk-${f.severity}" style="margin-left:.5rem">+${f.score_delta}</span>
      </div>
      <div class="muted small">${esc(f.reason)}</div>
      ${f.evidence.length ? `<div class="evidence">${f.evidence.map(ev=>`<code>${esc(ev)}</code>`).join(' ')}</div>` : ''}
    </div>`
  ).join('');
  $('result').classList.remove('muted');
  $('result').innerHTML = `
    <div class="skill-header">
      <strong>${esc(data.skill_name)}</strong> <span class="muted">by</span> ${esc(data.publisher)}
    </div>
    ${html || '<div class="muted">No suspicious behaviors detected.</div>'}`;
}

async function loadIocs() {
  const iocs = await fetch(`${API_BASE}/api/iocs`).then(r=>r.json()).catch(()=>[]);
  $('ioc-list').innerHTML = iocs.map(ioc =>
    `<li>${sevIcon(ioc.severity)} <strong>${esc(ioc.type)}</strong>: ${esc(ioc.value)}
      <span class="muted">(${esc(ioc.source)})</span></li>`
  ).join('');
}

// ── Consensus tab ─────────────────────────────────────────────────────────────
$('consensus-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled=true; btn.textContent='Running…';
  try {
    const data = await fetch(`${API_BASE}/api/scan/consensus`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(scanPayload('c-')),
    }).then(r=>r.json());
    renderConsensus(data);
  } finally { btn.disabled=false; btn.textContent='Run Consensus'; }
});

function renderConsensus(data) {
  chart('c-gauge', GaugeChart).draw(data.consensus_score);

  const rp = $('c-risk-level');
  rp.className = `risk-pill risk-${data.consensus_level}`;
  rp.textContent = data.consensus_level.toUpperCase();
  rp.classList.remove('hidden');
  $('c-meta').textContent =
    `${data.providers_responded}/${data.providers_queried} providers · ${data.agreement_pct}% agreement · ${Math.round(data.total_latency_ms)}ms`;

  // Radar
  const verdicts = data.verdicts;
  const axes     = verdicts.map(v => v.provider);
  chart('radar', RadarChart).draw(axes, [
    { label:'Risk Score', color: PALETTE.accent,
      values: verdicts.map(v => v.risk_score) },
  ]);

  // Verdict table
  $('c-verdicts').innerHTML = verdicts.map(v => `
    <div class="verdict-row">
      <span class="provider-lbl">${esc(v.provider)}</span>
      <span class="model-lbl muted">${esc(v.model)}</span>
      <div class="mini-bar-wrap"><div class="mini-bar meter-${v.risk_level}" style="width:${v.risk_score}%"></div></div>
      <span class="pill risk-${v.risk_level}">${v.risk_score}</span>
      <span class="muted small">${Math.round(v.latency_ms)}ms · w${v.weight}</span>
    </div>`).join('');
}

// ── Batch tab ─────────────────────────────────────────────────────────────────
$('batch-btn').addEventListener('click', async () => {
  let payloads;
  try { payloads = JSON.parse($('batch-input').value); }
  catch { $('batch-result').innerHTML='<span class="muted">Invalid JSON.</span>'; return; }
  $('batch-btn').disabled=true; $('batch-btn').textContent='Running…';
  try {
    const data = await fetch(`${API_BASE}/api/scan/batch`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payloads),
    }).then(r=>r.json());
    renderBatch(data);
  } finally { $('batch-btn').disabled=false; $('batch-btn').textContent='Run Batch'; }
});

function renderBatch(data) {
  if (data.error) { $('batch-result').innerHTML=`<span class="muted">${esc(data.error)}</span>`; return; }
  const b = data.breakdown;

  chart('batch-donut', DonutChart).draw([
    { label:'Critical', value:b.critical, color:PALETTE.critical },
    { label:'High',     value:b.high,     color:PALETTE.high },
    { label:'Medium',   value:b.medium,   color:PALETTE.medium },
    { label:'Low',      value:b.low,      color:PALETTE.low },
  ]);

  const scores = data.results.map(r=>r.risk_score);
  chart('batch-line', LineChart).draw(
    [{ label:'Score', color:PALETTE.accent, values:scores }],
    { xLabels: scores.map((_,i)=>`#${i+1}`) }
  );

  $('batch-result').innerHTML = `
    <div class="stat-row">
      <div class="stat-box"><div class="stat-num">${data.total}</div>Total</div>
      <div class="stat-box kpi-critical"><div class="stat-num">${b.critical}</div>Critical</div>
      <div class="stat-box kpi-high"><div class="stat-num">${b.high}</div>High</div>
      <div class="stat-box kpi-medium"><div class="stat-num">${b.medium}</div>Medium</div>
      <div class="stat-box kpi-ok"><div class="stat-num">${b.low}</div>Low</div>
      <div class="stat-box"><div class="stat-num">${Math.round(data.duration_ms)}ms</div>Duration</div>
    </div>
    <div class="findings-list">${data.results.map(r =>
      `<div class="finding-row sev-${r.risk_level}">
        ${sevIcon(r.risk_level)} <strong>${esc(r.skill_name)}</strong> / ${esc(r.publisher)}
        <span class="pill risk-${r.risk_level}" style="float:right">${r.risk_score}</span>
      </div>`).join('')}</div>`;
}

// ── Remediate tab ─────────────────────────────────────────────────────────────
$('remediate-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled=true; btn.textContent='Planning…';
  try {
    const data = await fetch(`${API_BASE}/api/scan/remediate`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(scanPayload('r-')),
    }).then(r=>r.json());
    renderRemediation(data);
  } finally { btn.disabled=false; btn.textContent='Generate Plan'; }
});

function renderRemediation(data) {
  chart('r-gauge', GaugeChart).draw(data.risk_score);

  if (!data.remediation_items.length) {
    $('remediation-result').innerHTML = '<div class="muted">No findings — nothing to remediate.</div>';
    return;
  }

  $('remediation-result').innerHTML = data.remediation_items.map((item, idx) => `
    <div class="remediation-item sev-${item.severity}">
      <div class="rem-header">
        <span class="rem-num">${idx+1}</span>
        ${sevIcon(item.severity)}
        <strong>${esc(item.rule)}</strong>
        <span class="pill risk-${item.severity}" style="margin-left:.5rem">${item.severity}</span>
      </div>
      <div class="rem-summary">${esc(item.summary)}</div>
      <ol class="rem-steps">${item.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
      ${item.references.length ? `<div class="rem-refs muted small">📎 ${item.references.map(esc).join(' · ')}</div>` : ''}
    </div>`).join('');
}

// ── Models tab ────────────────────────────────────────────────────────────────
async function initModels() {
  if (state.allModels.length) { renderModelGrid(state.allModels); return; }
  const data = await fetch(`${API_BASE}/api/models`).then(r=>r.json()).catch(()=>({models:[],providers:[],total:0}));
  state.allModels = data.models;
  $('model-count-badge').textContent = `${data.total} models`;

  // Populate filter
  const sel = $('model-provider-filter');
  data.providers.forEach(p => {
    const o = document.createElement('option'); o.value=p; o.textContent=p; sel.appendChild(o);
  });

  renderModelGrid(data.models);
  renderModelCharts(data);
}

$('model-provider-filter').addEventListener('change', () => {
  const p = $('model-provider-filter').value;
  renderModelGrid(p ? state.allModels.filter(m=>m.provider===p) : state.allModels);
});

$('load-models-btn').addEventListener('click', () => {
  state.allModels = [];
  $('model-provider-filter').innerHTML = '<option value="">All providers</option>';
  initModels();
});

function renderModelCharts(data) {
  const cfg = data.models.filter(m=>m.configured).length;
  chart('model-donut', DonutChart).draw([
    { label:'Configured',   value: cfg,                       color: PALETTE.low },
    { label:'Unconfigured', value: data.total - cfg,          color: PALETTE.grid },
  ]);

  // Bar per provider
  const pvMap = {};
  data.models.forEach(m => { pvMap[m.provider] = (pvMap[m.provider]||0)+1; });
  chart('provider-bar', HBarChart).draw(
    Object.entries(pvMap)
      .sort((a,b)=>b[1]-a[1])
      .map(([lbl,value], i) => ({ label:lbl, value, max:8, color: PALETTE.providers[i%PALETTE.providers.length] }))
  );
}

function renderModelGrid(models) {
  $('model-stats').textContent = `${models.length} model(s) · ${models.filter(m=>m.configured).length} configured`;
  $('model-grid').innerHTML = models.map((m,i) => `
    <div class="model-card ${m.configured?'configured':'unconfigured'}" style="--accent:${PALETTE.providers[i%PALETTE.providers.length]}">
      <div class="mc-provider">${esc(m.provider)}</div>
      <div class="mc-model">${esc(m.model)}</div>
      <div style="display:flex;gap:.4rem;align-items:center;margin-top:.4rem">
        <span class="pill" style="font-size:.7rem">${esc(m.type)}</span>
        <span class="${m.configured?'status-ok':'status-miss'}">${m.configured?'✓':'✗'}</span>
      </div>
      ${m.configured ? `<div class="mc-key">${esc(m.api_key_masked)}</div>` : ''}
    </div>`).join('');
}

// ── Alerts tab ────────────────────────────────────────────────────────────────
async function refreshAlerts() {
  const [stats, recent] = await Promise.all([
    fetch(`${API_BASE}/api/alerts/stats`).then(r=>r.json()).catch(()=>({total:0,breakdown:{}})),
    fetch(`${API_BASE}/api/alerts?limit=30`).then(r=>r.json()).catch(()=>({alerts:[]})),
  ]);
  const b = stats.breakdown;
  $('alert-stats').textContent = `Total: ${stats.total} · Critical: ${b.critical||0} · High: ${b.high||0} · Medium: ${b.medium||0} · Low: ${b.low||0}`;

  chart('alert-donut', DonutChart).draw([
    { label:'Critical', value:b.critical||0, color:PALETTE.critical },
    { label:'High',     value:b.high||0,     color:PALETTE.high },
    { label:'Medium',   value:b.medium||0,   color:PALETTE.medium },
    { label:'Low',      value:b.low||0,      color:PALETTE.low },
  ]);

  const scores = recent.alerts.map(a=>a.risk_score).reverse();
  if (scores.length >= 2) {
    chart('alert-trend', LineChart).draw(
      [{ label:'Risk Score', color:PALETTE.accent, values:scores }],
      { xLabels: scores.map((_,i)=>`#${i+1}`) }
    );
  }

  $('alert-list').innerHTML = recent.alerts.length
    ? recent.alerts.map(a => `
        <div class="finding-row sev-${a.risk_level}">
          ${sevIcon(a.risk_level)} <strong>${esc(a.skill_name)}</strong> / ${esc(a.publisher)}
          <span class="pill risk-${a.risk_level}" style="float:right">${a.risk_score}</span>
          <div class="muted small">${esc(a.timestamp)}</div>
        </div>`).join('')
    : '<span class="muted">No alerts yet.</span>';
}

// ── Threats tab ───────────────────────────────────────────────────────────────
$('threat-scan-btn').addEventListener('click', async () => {
  const path = $('threat-path').value||'.';
  $('threat-result').textContent='Running aggregation…';
  const data = await fetch(`${API_BASE}/api/threats/aggregate?path=${encodeURIComponent(path)}`).then(r=>r.json()).catch(e=>({error:String(e)}));
  renderThreats(data);
});

function renderThreats(data) {
  if (data.error) { $('threat-result').innerHTML=`<span class="muted">${esc(data.error)}</span>`; return; }
  const s = data.sources;

  chart('threat-donut', DonutChart).draw([
    { label:'Critical', value:data.breakdown.critical||0, color:PALETTE.critical },
    { label:'High',     value:data.breakdown.high||0,     color:PALETTE.high },
    { label:'Medium',   value:data.breakdown.medium||0,   color:PALETTE.medium },
    { label:'Low',      value:data.breakdown.low||0,      color:PALETTE.low },
  ]);

  chart('threat-bar', HBarChart).draw([
    { label:'gitleaks',    value:s.gitleaks,    max: data.total||1, color:PALETTE.providers[0] },
    { label:'trufflehog',  value:s.trufflehog,  max: data.total||1, color:PALETTE.providers[1] },
    { label:'antigravity', value:s.antigravity, max: data.total||1, color:PALETTE.providers[2] },
  ]);

  $('threat-result').innerHTML = data.findings.slice(0,50).map(f => `
    <div class="finding-row sev-${f.severity}">
      ${sevIcon(f.severity)} <span class="pill" style="font-size:.72rem">${esc(f.source)}</span>
      <strong>${esc(f.rule)}</strong> — ${esc(f.description)}
      ${f.file_path ? `<span class="muted small"> ${esc(f.file_path)}${f.line?':'+f.line:''}</span>` : ''}
      ${f.secret_masked ? `<code>${esc(f.secret_masked)}</code>` : ''}
    </div>`).join('') + (data.findings.length>50 ? `<div class="muted small">…and ${data.findings.length-50} more</div>` : '');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadIocs();
refreshOverview();
