/* ── SKILLDEF Dashboard — app.js ─────────────────────────────────
   Widgets wired:
   - Stat strip counters
   - Scan form → POST /api/scan  (X-API-Key forwarded when set)
   - Arc + bar risk meter
   - Rule-impact bars
   - Findings panel + Fluid result panel
   - Live feed (WebSocket /ws/feed)
   - Checklist   (GET /api/checklist)
   - IOC list    (GET /api/iocs)
   - Sidebar stat bars + module toggles
   - Fluid Link module status (GET /api/integrations/fluid/status)
   - Send to Fluid (POST /api/integrations/fluid/payload)
   - Command prompt: help / health / iocs / checklist / stats /
                     fluid / api / threat-model / clear / version
   ─────────────────────────────────────────────────────────────── */

'use strict';

const API_BASE = window.API_BASE || '';

/* ── DOM helper ────────────────────────────────────────────────── */
function el(id) { return document.getElementById(id); }

/* ── API key helper ────────────────────────────────────────────── */
function getApiKey() {
  const inp = el('api-key');
  return inp ? inp.value.trim() : '';
}

function authHeaders(extra = {}) {
  const key = getApiKey();
  return key
    ? { 'Content-Type': 'application/json', 'X-API-Key': key, ...extra }
    : { 'Content-Type': 'application/json', ...extra };
}

/* ── Session counters ──────────────────────────────────────────── */
const counters = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };

function incCounter(level) {
  counters.total++;
  if (level in counters) counters[level]++;

  el('stat-total').textContent    = counters.total;
  el('stat-critical').textContent = counters.critical;
  el('stat-high').textContent     = counters.high;
  el('stat-medium').textContent   = counters.medium;
  el('stat-low').textContent      = counters.low;

  // Sidebar bar widths (cap at 20 scans = 100 %)
  const cap = Math.max(counters.total, 1);
  setSideBar('sb-scans',    counters.total,    cap);
  setSideBar('sb-critical', counters.critical, cap);
  setSideBar('sb-high',     counters.high,     cap);
  el('sb-scans-val').textContent    = counters.total;
  el('sb-critical-val').textContent = counters.critical;
  el('sb-high-val').textContent     = counters.high;
}

function setSideBar(fillId, val, max) {
  const f = el(fillId);
  if (f) f.style.width = Math.min(100, Math.round((val / max) * 100)) + '%';
}

/* ── Arc risk meter ────────────────────────────────────────────── */
const ARC_LEN = 170;

const RISK_COLORS = { critical: '#ff2d6a', high: '#ffb300', medium: '#00e5ff', low: '#00e676' };

function renderMeter(score, level) {
  const arc    = el('arc-fill');
  arc.style.strokeDashoffset = ARC_LEN - (score / 100) * ARC_LEN;
  arc.style.stroke           = RISK_COLORS[level] || '#00e5ff';

  el('arc-score').textContent   = score;
  el('meter-fill').style.width  = score + '%';
  el('meter-label').textContent = `Risk Score ${score} / 100`;

  const badge      = el('risk-badge');
  badge.className  = `risk-badge risk-${level}`;
  badge.textContent = `Risk Level: ${level}`;
  badge.classList.remove('hidden');
}

/* ── Rule-impact bars ──────────────────────────────────────────── */
function renderBars(findings) {
  const wrap = el('bars');
  if (!findings.length) {
    wrap.className   = 'bars muted';
    wrap.textContent = 'No rule matches.';
    return;
  }
  wrap.className = 'bars';
  wrap.innerHTML  = findings.map(f => `
    <div class="bar-row">
      <div class="bar-header">
        <strong>${f.rule}</strong>
        <span style="color:var(--muted)">+${f.score_delta} pts</span>
      </div>
      <div class="impact-track">
        <div class="impact-fill" style="width:${Math.min(f.score_delta, 100)}%"></div>
      </div>
    </div>`).join('');
}

/* ── Findings panel ────────────────────────────────────────────── */
function renderResult(data) {
  const items = data.findings.map(f => `
    <li>
      <strong>${f.rule}</strong>
      <span class="risk-badge risk-${f.severity}"
            style="font-size:.68rem;padding:.12rem .4rem;margin:0 .3rem">${f.severity}</span>
      — ${f.reason}
      ${f.evidence.length
        ? `<br><span class="muted">Evidence: <code>${f.evidence.join(', ')}</code></span>`
        : ''}
    </li>`).join('');

  el('result').classList.remove('muted');
  el('result').innerHTML = `
    <p style="margin-bottom:.5rem">
      <strong>${data.skill_name}</strong> by <em>${data.publisher}</em>
    </p>
    <ul>${items || '<li>No suspicious behaviours detected.</li>'}</ul>`;

  el('findings-summary').textContent =
    data.findings.length
      ? `${data.findings.length} rule(s) matched · Risk ${data.risk_score}/100`
      : 'Clean — no rules triggered.';

  renderMeter(data.risk_score, data.risk_level);
  renderBars(data.findings);
  incCounter(data.risk_level);
}

/* ── Fluid result panel ────────────────────────────────────────── */
function showFluidResult(data) {
  const panel = el('fluid-result');
  panel.classList.remove('hidden');

  const configured = data.configured;
  const badge = configured
    ? `<span class="fluid-ok">● Configured</span>`
    : `<span class="fluid-warn">● Not configured (set FLUID_API_KEY env var)</span>`;

  panel.innerHTML = `
    <span class="fluid-title">Fluid Integration Payload ${badge}</span>
    <strong>Target:</strong> ${data.target}
    <strong>Risk:</strong>   ${data.payload.risk_level} (${data.payload.risk_score}/100)
    <strong>Findings:</strong> ${data.payload.findings.length} rule(s) matched
    <strong>Payload (JSON):</strong>
<code>${JSON.stringify(data.payload, null, 2)}</code>`;
}

/* ── Last scan payload (for Send to Fluid) ─────────────────────── */
let lastScanPayload = null;

/* ── Scan form ─────────────────────────────────────────────────── */
el('scan-form').addEventListener('submit', async (evt) => {
  evt.preventDefault();
  const btn = el('scan-btn');
  btn.disabled    = true;
  btn.textContent = 'Analysing…';

  // Hide Fluid panel from previous scan
  el('fluid-result').classList.add('hidden');
  el('fluid-btn').disabled = true;

  const payload = {
    skill_name:       el('skill_name').value.trim(),
    publisher:        el('publisher').value.trim(),
    instruction_text: el('instruction_text').value.trim(),
    urls: el('urls').value.split(',').map(v => v.trim()).filter(Boolean),
  };

  try {
    const res = await fetch(`${API_BASE}/api/scan`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderResult(data);
    lastScanPayload = payload;
    el('fluid-btn').disabled = false;
    feedPush(`Scan complete: ${payload.skill_name} — Risk ${data.risk_level} (${data.risk_score})`, 'info');
    cmdPrint(`Scan finished: ${payload.skill_name}`, 'var(--cyan)');
  } catch (err) {
    feedPush(`Scan error: ${err.message}`, 'error');
    cmdPrint(`Error: ${err.message}`, 'var(--pink)');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Run Analysis';
  }
});

/* ── Send to Fluid button ──────────────────────────────────────── */
el('fluid-btn').addEventListener('click', async () => {
  if (!lastScanPayload) return;
  const btn = el('fluid-btn');
  btn.disabled    = true;
  btn.textContent = 'Sending…';
  try {
    const res = await fetch(`${API_BASE}/api/integrations/fluid/payload`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(lastScanPayload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    showFluidResult(data);
    feedPush(`Fluid payload built for "${lastScanPayload.skill_name}".`,
      data.configured ? 'success' : 'warn');
    cmdPrint(
      `Fluid payload ready — target: ${data.target}`,
      data.configured ? 'var(--green)' : 'var(--amber)'
    );
  } catch (err) {
    feedPush(`Fluid error: ${err.message}`, 'error');
    cmdPrint(`Fluid error: ${err.message}`, 'var(--pink)');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Send to Fluid';
  }
});

/* ── IOC list ──────────────────────────────────────────────────── */
async function loadIocs() {
  try {
    const iocs = await fetch(`${API_BASE}/api/iocs`).then(r => r.json());
    el('stat-iocs').textContent = iocs.length;
    el('ioc-list').innerHTML    = iocs.map(ioc => `
      <li class="ioc-item">
        <span class="ioc-type">${ioc.type}</span>:
        <span class="ioc-value">${ioc.value}</span>
        <span class="risk-badge risk-${ioc.severity}"
              style="font-size:.65rem;padding:.1rem .35rem">${ioc.severity}</span>
        <br><span class="ioc-src">${ioc.source}</span>
      </li>`).join('');
  } catch (_) {
    el('ioc-list').innerHTML = '<li class="muted micro">Could not load IOCs.</li>';
  }
}

/* ── Checklist ─────────────────────────────────────────────────── */
async function loadChecklist() {
  try {
    const data = await fetch(`${API_BASE}/api/checklist`).then(r => r.json());
    const sections = [
      { key: 'immediate_24h',          label: 'Immediate (24 h)' },
      { key: 'architecture_1_2_weeks', label: 'Architecture (1–2 wks)' },
      { key: 'advanced_1_month',       label: 'Advanced (1 mo)' },
    ];
    el('checklist-body').innerHTML = sections.map(s => `
      <div class="checklist-section">
        <h4>${s.label}</h4>
        <ul>${(data[s.key] || []).map(item => `<li>${item}</li>`).join('')}</ul>
      </div>`).join('');
  } catch (_) {
    el('checklist-body').innerHTML = '<p class="muted micro">Could not load checklist.</p>';
  }
}

/* ── Fluid status (sidebar module) ────────────────────────────── */
async function loadFluidStatus(silent = false) {
  const modFluid = document.querySelector('[data-module="fluid"]');
  try {
    const res  = await fetch(`${API_BASE}/api/integrations/fluid/status`,
      { headers: authHeaders({ 'Content-Type': undefined }) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (modFluid) {
      const dot = modFluid.querySelector('.dot');
      if (data.configured) {
        dot.className = 'dot green';
        modFluid.classList.add('active');
      } else {
        dot.className = 'dot amber';
      }
    }

    if (!silent) {
      cmdPrint(
        `Fluid — configured: <strong>${data.configured}</strong> · ` +
        `base_url: ${data.base_url}` +
        (data.api_key_masked ? ` · key: ${data.api_key_masked}` : ''),
        data.configured ? 'var(--green)' : 'var(--amber)'
      );
      feedPush(
        `Fluid status: ${data.configured ? 'configured' : 'not configured'} — ${data.base_url}`,
        data.configured ? 'success' : 'warn'
      );
    }
    return data;
  } catch (err) {
    if (modFluid) modFluid.querySelector('.dot').className = 'dot pink';
    if (!silent) cmdPrint(`Fluid status error: ${err.message}`, 'var(--pink)');
    return null;
  }
}

/* ── Live feed helpers ─────────────────────────────────────────── */
const MAX_FEED = 40;

function feedPush(msg, level = 'info') {
  const list        = el('feed-list');
  const placeholder = list.querySelector('.muted');
  if (placeholder && placeholder.textContent.includes('Awaiting')) placeholder.remove();

  const ts = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const li       = document.createElement('li');
  li.className   = `feed-item ${level}`;
  li.textContent = `[${ts}] ${msg}`;
  list.prepend(li);

  while (list.children.length > MAX_FEED) list.lastElementChild.remove();
}

/* ── WebSocket live feed ───────────────────────────────────────── */
(function connectWS() {
  const proto  = location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl  = `${proto}://${location.host}/ws/feed`;
  const pill   = el('ws-status-pill');
  const modWs  = el('mod-ws');

  function setWsStatus(state) {
    const styles = {
      live:         { text: 'WS: Live',          css: 'border-color:rgba(0,230,118,.4);color:#00e676', dot: 'dot green' },
      reconnecting: { text: 'WS: Reconnecting…', css: '',                                             dot: 'dot amber' },
      offline:      { text: 'WS: Offline',        css: 'border-color:rgba(255,45,106,.4);color:#ff2d6a', dot: 'dot pink' },
    };
    const s = styles[state] || styles.reconnecting;
    pill.textContent   = s.text;
    pill.style.cssText = s.css;
    if (modWs) modWs.querySelector('.dot').className = s.dot;
  }

  function connect() {
    let ws;
    try { ws = new WebSocket(wsUrl); } catch (_) { setWsStatus('offline'); return; }

    ws.addEventListener('open', () => {
      setWsStatus('live');
      if (modWs) modWs.classList.add('active');
      feedPush('Live feed connected.', 'success');
      cmdPrint('WebSocket live feed connected.', 'var(--green)');
    });

    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        feedPush(msg.message || String(ev.data), msg.level || 'info');
      } catch (_) {
        feedPush(String(ev.data), 'info');
      }
    });

    ws.addEventListener('close', () => {
      setWsStatus('reconnecting');
      setTimeout(connect, 4000);
    });

    ws.addEventListener('error', () => setWsStatus('offline'));
  }

  connect();
})();

/* ── Module toggles ────────────────────────────────────────────── */
document.querySelectorAll('.module-item').forEach(item => {
  item.addEventListener('click', (e) => {
    if (!e.target.closest('.module-toggle') && e.target !== item) return;
    item.classList.toggle('active');
    const dot = item.querySelector('.dot');
    dot.className = item.classList.contains('active') ? 'dot green' : 'dot pink';
  });
});

/* ── Command prompt ────────────────────────────────────────────── */
function cmdPrint(html, color = 'var(--text)') {
  const out  = el('cmd-output');
  const line = document.createElement('div');
  line.className   = 'cmd-line';
  line.style.color = color;
  line.innerHTML   = `<span class="prompt">&gt;</span> ${html}`;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

const HELP_TEXT = [
  '<strong>help</strong>         — show this message',
  '<strong>health</strong>       — API health check',
  '<strong>iocs</strong>         — reload IOC list',
  '<strong>checklist</strong>    — reload checklist',
  '<strong>stats</strong>        — session scan counters',
  '<strong>fluid</strong>        — Fluid integration status',
  '<strong>api</strong>          — list all API endpoints',
  '<strong>threat-model</strong> — OpenClaw threat model info',
  '<strong>clear</strong>        — clear prompt output',
  '<strong>version</strong>      — show version',
].join('<br>');

el('cmd-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = el('cmd-input');
  const raw   = input.value.trim();
  input.value = '';
  if (!raw) return;

  cmdPrint(`<span style="color:var(--muted)">${raw}</span>`);

  const [cmd] = raw.toLowerCase().split(/\s+/);

  switch (cmd) {
    case 'help':
      cmdPrint(HELP_TEXT);
      break;

    case 'health':
      try {
        const data = await fetch(`${API_BASE}/api/health`).then(r => r.json());
        cmdPrint(`Status: <strong>${data.status}</strong> · ${data.timestamp}`, 'var(--green)');
      } catch (err) {
        cmdPrint(`Health check failed: ${err.message}`, 'var(--pink)');
      }
      break;

    case 'iocs':
      await loadIocs();
      cmdPrint('IOC list reloaded.', 'var(--cyan)');
      break;

    case 'checklist':
      await loadChecklist();
      cmdPrint('Checklist reloaded.', 'var(--cyan)');
      break;

    case 'clear':
      el('cmd-output').innerHTML = '';
      cmdPrint('Output cleared.', 'var(--muted)');
      break;

    case 'stats':
      cmdPrint(
        `Total: ${counters.total} &nbsp;|&nbsp; ` +
        `<span style="color:var(--pink)">Crit: ${counters.critical}</span> &nbsp;|&nbsp; ` +
        `<span style="color:var(--amber)">High: ${counters.high}</span> &nbsp;|&nbsp; ` +
        `<span style="color:var(--cyan)">Med: ${counters.medium}</span> &nbsp;|&nbsp; ` +
        `<span style="color:var(--green)">Low: ${counters.low}</span>`
      );
      break;

    case 'version':
      cmdPrint('SKILLDEF AI Skill Defense Console v2.2.0', 'var(--cyan)');
      break;

    case 'fluid':
      await loadFluidStatus(false);
      break;

    case 'api': {
      try {
        const data = await fetch(`${API_BASE}/api`).then(r => r.json());
        const lines = data.endpoints.map(ep =>
          `<span style="color:var(--cyan)">${ep.method.padEnd(4)}</span> ` +
          `${ep.path}` +
          (ep.protected ? ' <span style="color:var(--amber)">[key]</span>' : '')
        ).join('<br>');
        cmdPrint(
          `<strong>${data.service}</strong> v${data.version} — ` +
          `${data.total_endpoints} endpoints:<br>${lines}`,
          'var(--text)'
        );
      } catch (err) {
        cmdPrint(`API catalog error: ${err.message}`, 'var(--pink)');
      }
      break;
    }

    case 'threat-model': {
      try {
        const res = await fetch(`${API_BASE}/api/threat-model/raw`,
          { headers: authHeaders({ 'Content-Type': undefined }) });
        if (!res.ok) throw new Error(`HTTP ${res.status} — set API key if required`);
        const data = await res.json();
        const lines = data.code.split('\n').length;
        cmdPrint(
          `OpenClaw threat model: <strong>${data.filename}</strong> · ` +
          `${lines} lines · ` +
          `<span style="color:var(--muted)">use /api/threat-model/raw to export</span>`,
          'var(--cyan)'
        );
      } catch (err) {
        cmdPrint(`Threat model error: ${err.message}`, 'var(--pink)');
      }
      break;
    }

    default:
      cmdPrint(`Unknown command: <em>${cmd}</em>. Type <strong>help</strong>.`, 'var(--muted)');
  }
});

/* ── Startup ───────────────────────────────────────────────────── */
loadIocs();
loadChecklist();
loadFluidStatus(true);   // silently update sidebar Fluid module dot
