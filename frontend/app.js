const API_BASE = window.API_BASE || '';

const form = document.getElementById('scan-form');
const auditForm = document.getElementById('audit-form');
const result = document.getElementById('result');
const auditResult = document.getElementById('audit-result');
const iocList = document.getElementById('ioc-list');
const bars = document.getElementById('bars');
const meterFill = document.getElementById('meter-fill');
const meterLabel = document.getElementById('meter-label');
const riskLevel = document.getElementById('risk-level');
const latestContent = document.getElementById('latest-content');
const toolList = document.getElementById('tool-list');
const dashboardInsight = document.getElementById('dashboard-insight');
const developerWorkflows = document.getElementById('developer-workflows');
const powershellCommands = document.getElementById('powershell-commands');

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
      </div>
    `,
    )
    .join('');
}

function renderResult(data) {
  const findings = data.findings
    .map(
      (f) => `<li><strong>${f.rule}</strong> (${f.severity}) - ${f.reason}<br /><span class="muted">Evidence: ${f.evidence.join(', ') || 'n/a'}</span></li>`,
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

function renderDashboardContext(data) {
  latestContent.className = 'grid-list';
  latestContent.innerHTML = data.latest_content
    .map((item) => `<article class="mini-card"><span class="mini-date">${item.date}</span><strong>${item.title}</strong><span class="muted">${item.category}</span></article>`)
    .join('');

  toolList.className = 'grid-list';
  toolList.innerHTML = data.tools
    .map((tool) => `<article class="mini-card"><strong>${tool.name}</strong><span class="muted">${tool.role}</span><p>${tool.benefit}</p></article>`)
    .join('');

  dashboardInsight.classList.remove('muted');
  dashboardInsight.textContent = data.insight;
}

function renderDeveloperToolkit(data) {
  developerWorkflows.className = 'grid-list';
  developerWorkflows.innerHTML = data.developer_workflows
    .map((item) => `<article class="mini-card"><strong>${item.name}</strong><span class="muted">${item.focus}</span><p>${item.value}</p></article>`)
    .join('');

  powershellCommands.className = 'command-list';
  powershellCommands.innerHTML = data.powershell_commands
    .map((item) => `<article class="command-card"><code>${item.command}</code><span>${item.description}</span><span class="muted">${item.example}</span></article>`)
    .join('');
}

function renderAuditResult(data) {
  auditResult.classList.remove('muted');
  auditResult.innerHTML = `
    <p><strong>URL:</strong> ${data.url}</p>
    <p><strong>Status:</strong> ${data.status_code ?? 'unavailable'} | <strong>Latency:</strong> ${data.latency_ms}ms</p>
    <p><strong>Message:</strong> ${data.message}</p>
    <p><strong>HTTPS Reminder:</strong> ${data.https_recommended ? 'Use https:// for sensitive endpoints.' : 'HTTPS already in use or not applicable.'}</p>
  `;
}

async function loadDeveloperToolkit() {
  const response = await fetch(`${API_BASE}/api/developer-toolkit`);
  const payload = await response.json();
  renderDeveloperToolkit(payload);
}

async function loadDashboardContext() {
  const response = await fetch(`${API_BASE}/api/dashboard/context`);
  const payload = await response.json();
  renderDashboardContext(payload);
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
    urls: document.getElementById('urls').value.split(',').map((value) => value.trim()).filter(Boolean),
  };

  const response = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  renderResult(await response.json());
});

auditForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const response = await fetch(`${API_BASE}/api/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: document.getElementById('audit_url').value }),
  });

  renderAuditResult(await response.json());
});

loadIocs();
loadDashboardContext();
loadDeveloperToolkit();
