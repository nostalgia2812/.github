const API_BASE = window.API_BASE || '';

// ─── Tab navigation ──────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

    if (btn.dataset.tab === 'ghostwallet' && !gwCatalogLoaded) loadGwCatalog();
    if (btn.dataset.tab === 'deployment') loadDeploymentDashboard();
  });
});

// ─── Tab 1: Skill Analysis ───────────────────────────────────────────────────

const form = document.getElementById('scan-form');
const result = document.getElementById('result');
const iocList = document.getElementById('ioc-list');
const bars = document.getElementById('bars');
const meterFill = document.getElementById('meter-fill');
const meterLabel = document.getElementById('meter-label');
const riskLevel = document.getElementById('risk-level');

function badgeClass(level) {
  return `risk-pill risk-${level || 'low'}`;
}

function renderMeter(score, level) {
  meterFill.style.width = `${score}%`;
  meterLabel.textContent = `Risk Score ${score}/100`;
  riskLevel.classList.remove('hidden');
  riskLevel.className = badgeClass(level);
  riskLevel.textContent = `Risk Level: ${level}`;
}

function renderBars(findings) {
  if (!findings.length) {
    bars.className = 'bars muted';
    bars.textContent = 'No rule matches yet.';
    return;
  }
  bars.className = 'bars';
  bars.innerHTML = findings
    .map(
      (item) => `
      <div class="bar-row">
        <div class="bar-header"><strong>${item.rule}</strong><span>+${item.score_delta}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(item.score_delta, 100)}%"></div></div>
      </div>`,
    )
    .join('');
}

function renderResult(data) {
  const findings = data.findings
    .map(
      (f) => `<li><strong>${f.rule}</strong> (${f.severity}) - ${f.reason}<br /><span class="muted">Evidence: ${
        f.evidence.join(', ') || 'n/a'
      }</span></li>`,
    )
    .join('');

  result.classList.remove('muted');
  result.innerHTML = `
    <p><strong>Skill:</strong> ${data.skill_name} | <strong>Publisher:</strong> ${data.publisher}</p>
    <ul class="stack">${findings || '<li>No suspicious behaviors detected.</li>'}</ul>
  `;
  renderMeter(data.risk_score, data.risk_level);
  renderBars(data.findings);
}

async function loadIocs() {
  const response = await fetch(`${API_BASE}/api/iocs`);
  const iocs = await response.json();
  iocList.innerHTML = iocs
    .map((ioc) => `<li><strong>${ioc.type}</strong>: ${ioc.value} <span class="muted">(${ioc.severity})</span></li>`)
    .join('');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    skill_name: document.getElementById('skill_name').value,
    publisher: document.getElementById('publisher').value,
    instruction_text: document.getElementById('instruction_text').value,
    urls: document.getElementById('urls').value.split(',').map((v) => v.trim()).filter(Boolean),
  };
  const response = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  renderResult(await response.json());
});

loadIocs();

// ─── Tab 2: GhostWallet Error Correction ─────────────────────────────────────

let gwCatalogLoaded = false;
let gwAllErrors = [];

const gwCorrectForm = document.getElementById('gw-correct-form');
const gwCorrectionResult = document.getElementById('gw-correction-result');
const gwCatalogEl = document.getElementById('gw-error-catalog');
const gwFilterEl = document.getElementById('gw-catalog-filter');
const gwStatsEl = document.getElementById('gw-stats');

function severityColor(s) {
  return { critical: '#7f1d1d', high: '#9a3412', medium: '#854d0e', low: '#166534' }[s] || '#334155';
}

function renderGwCatalog(errors) {
  if (!errors.length) {
    gwCatalogEl.innerHTML = '<p class="muted">No matching errors.</p>';
    return;
  }
  gwCatalogEl.innerHTML = errors
    .map(
      (e) => `
    <div class="gw-card">
      <div class="gw-card-header">
        <span class="gw-code">${e.code}</span>
        <span class="gw-title">${e.title}</span>
        <span class="gw-badge" style="background:${severityColor(e.severity)}">${e.severity}</span>
        ${e.auto_correctable ? '<span class="gw-auto-badge">auto-fix</span>' : ''}
      </div>
      <p class="gw-desc">${e.description}</p>
      <details>
        <summary>Correction steps</summary>
        <ol class="gw-steps">${e.correction_steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      </details>
      <div class="gw-meta">
        <span>Category: <strong>${e.category}</strong></span>
        <span>Retry-safe: <strong>${e.retry_safe ? 'yes' : 'no'}</strong></span>
        ${e.docs_ref ? `<a class="gw-docs-link" href="${e.docs_ref}" target="_blank" rel="noopener">Docs</a>` : ''}
      </div>
    </div>`,
    )
    .join('');
}

function updateGwStats(errors) {
  const total = errors.length;
  const autofixable = errors.filter((e) => e.auto_correctable).length;
  const bySeverity = {};
  errors.forEach((e) => { bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1; });
  gwStatsEl.className = 'gw-stats';
  gwStatsEl.innerHTML = `
    <div class="stat-row"><span>Total codes</span><strong>${total}</strong></div>
    <div class="stat-row"><span>Auto-correctable</span><strong>${autofixable}</strong></div>
    ${Object.entries(bySeverity)
      .map(([sev, cnt]) => `<div class="stat-row"><span style="color:${severityColor(sev)}">${sev}</span><strong>${cnt}</strong></div>`)
      .join('')}
  `;
}

async function loadGwCatalog() {
  try {
    const res = await fetch(`${API_BASE}/api/ghostwallet/errors`);
    const data = await res.json();
    gwAllErrors = data.errors || [];
    gwCatalogLoaded = true;
    renderGwCatalog(gwAllErrors);
    updateGwStats(gwAllErrors);
  } catch {
    gwCatalogEl.innerHTML = '<p class="muted">Failed to load error catalog.</p>';
  }
}

gwFilterEl.addEventListener('input', () => {
  const q = gwFilterEl.value.toLowerCase();
  const filtered = gwAllErrors.filter(
    (e) => e.code.toLowerCase().includes(q) || e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q),
  );
  renderGwCatalog(filtered);
});

gwCorrectForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const raw = document.getElementById('gw-raw-input').value;
  try {
    const res = await fetch(`${API_BASE}/api/ghostwallet/correct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_input: raw }),
    });
    const data = await res.json();
    gwCorrectionResult.classList.remove('hidden');
    if (!data.matched) {
      gwCorrectionResult.innerHTML = `<p class="muted">No matching GhostWallet error found for "<strong>${raw}</strong>".</p>`;
      return;
    }
    const e = data.error;
    gwCorrectionResult.innerHTML = `
      <div class="cr-header">
        <span class="gw-code">${e.code}</span>
        <span class="gw-title">${e.title}</span>
        <span class="gw-badge" style="background:${severityColor(e.severity)}">${e.severity}</span>
        ${data.auto_correction_applied ? '<span class="gw-auto-badge">auto-fix applied</span>' : ''}
      </div>
      <p>${e.description}</p>
      <div class="cr-log">
        ${data.correction_log.map((l) => `<div class="cr-log-line">${l}</div>`).join('')}
      </div>
      <p class="muted" style="font-size:.78rem">Corrected at ${data.timestamp}</p>
    `;
  } catch {
    gwCorrectionResult.classList.remove('hidden');
    gwCorrectionResult.innerHTML = '<p class="muted">Error contacting correction API.</p>';
  }
});

// ─── Tab 3: Deployment Dashboard ─────────────────────────────────────────────

const deployGeneratedAt = document.getElementById('deploy-generated-at');
const deployOverallBadge = document.getElementById('deploy-overall-badge');
const serviceGrid = document.getElementById('service-grid');
const errorCategoryBars = document.getElementById('error-category-bars');
const probeForm = document.getElementById('probe-form');
const probeResult = document.getElementById('probe-result');

const STATUS_COLORS = { healthy: '#166534', degraded: '#854d0e', down: '#7f1d1d' };

function renderDeploymentDashboard(data) {
  deployGeneratedAt.textContent = `Generated: ${new Date(data.generated_at).toLocaleString()}`;

  deployOverallBadge.textContent = data.overall_status;
  deployOverallBadge.className = 'status-badge';
  deployOverallBadge.style.background = STATUS_COLORS[data.overall_status] || '#334155';

  serviceGrid.innerHTML = data.services
    .map(
      (s) => `
    <div class="service-card">
      <div class="service-card-header">
        <strong>${s.service}</strong>
        <span class="status-dot" style="background:${STATUS_COLORS[s.status] || '#334155'}" title="${s.status}"></span>
      </div>
      ${s.version ? `<div class="service-version">v${s.version}</div>` : ''}
      <div class="service-status-label" style="color:${STATUS_COLORS[s.status] || '#94a3b8'}">${s.status}</div>
      <div class="service-details">
        ${Object.entries(s.details)
          .map(([k, v]) => `<span>${k.replace(/_/g, ' ')}: <strong>${v}</strong></span>`)
          .join('')}
      </div>
      <div class="service-checked muted">Checked: ${new Date(s.last_checked).toLocaleTimeString()}</div>
    </div>`,
    )
    .join('');

  const maxVal = Math.max(...Object.values(data.ghostwallet_errors_summary), 1);
  errorCategoryBars.className = 'bars';
  errorCategoryBars.innerHTML = Object.entries(data.ghostwallet_errors_summary)
    .map(
      ([cat, cnt]) => `
    <div class="bar-row">
      <div class="bar-header"><strong>${cat}</strong><span>${cnt}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${(cnt / maxVal) * 100}%"></div></div>
    </div>`,
    )
    .join('');
}

async function loadDeploymentDashboard() {
  try {
    const res = await fetch(`${API_BASE}/api/deployment/dashboard`);
    renderDeploymentDashboard(await res.json());
  } catch {
    serviceGrid.innerHTML = '<p class="muted">Failed to load deployment dashboard.</p>';
  }
}

probeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const probe = {
    service: document.getElementById('probe-service').value,
    status: document.getElementById('probe-status').value,
    version: document.getElementById('probe-version').value || null,
  };
  try {
    const res = await fetch(`${API_BASE}/api/deployment/dashboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([probe]),
    });
    const data = await res.json();
    renderDeploymentDashboard(data);
    probeResult.textContent = `Probe submitted. Overall status: ${data.overall_status}`;
  } catch {
    probeResult.textContent = 'Failed to submit probe.';
  }
});
