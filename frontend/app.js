const API_BASE = window.API_BASE || '';

const form = document.getElementById('scan-form');
const result = document.getElementById('result');
const iocList = document.getElementById('ioc-list');
const bars = document.getElementById('bars');
const meterFill = document.getElementById('meter-fill');
const meterLabel = document.getElementById('meter-label');
const riskLevel = document.getElementById('risk-level');

const tabs = Array.from(document.querySelectorAll('.tab-button'));
const panels = Array.from(document.querySelectorAll('.tab-panel'));

const components = [
  {
    name: 'GHOST AI Command Center',
    accent: 'violet',
    title: 'Central orchestration dashboard',
    summary: 'Aggregates logs, controls, and status across AI, coding, and response services.',
    detail: 'Dashboard and operator surface',
  },
  {
    name: 'Armageddon Engine',
    accent: 'amber',
    title: 'Defensive simulation + response',
    summary: 'Models threats, coordinates alerts, and supports response workflows.',
    detail: 'Threat simulation engine',
  },
  {
    name: 'Mistral Studio',
    accent: 'cyan',
    title: 'Secure coding environment',
    summary: 'Represents the coding runtime, prompt governance, and constrained execution layer.',
    detail: 'Coding and execution service',
  },
  {
    name: 'Claude / Roo / Kimi',
    accent: 'violet',
    title: 'Developer tooling integration',
    summary: 'Captures local developer workflows, editor integration, and model configuration paths.',
    detail: 'Toolchain integration',
  },
];

const guardrails = [
  'Metrics such as “98.7% bypass resistance” or “99.1% detection accuracy” are shown as supplied claims, not repository-verified benchmarks.',
  'Potentially dangerous “bypass” language is interpreted here as a prompt-governance or safety-review concept, not a capability to implement.',
  'The overview emphasizes defensive architecture, monitoring, and operator review instead of exploit workflows.',
  'Operational diagrams should be read as planning artifacts unless backed by runnable code and tests in this repository.',
];

const workflowSteps = [
  {
    title: 'Prepare environment',
    text: 'Review .env values, resource availability, connectivity, and policy assumptions before deployment.',
  },
  {
    title: 'Build + launch services',
    text: 'Create directories, build containers, and start the stack with compose or equivalent orchestration.',
  },
  {
    title: 'Verify controls',
    text: 'Check health endpoints, logs, security status, and representative coding or simulation paths.',
  },
  {
    title: 'Maintain continuously',
    text: 'Update images, test backups, review logs, and tune resource limits based on observed behavior.',
  },
];

const blueprintMetrics = [
  { label: 'Named subsystems', value: '7' },
  { label: 'Workflow stages', value: '4' },
  { label: 'Doc references listed', value: '8' },
  { label: 'Benchmarks repo-verified', value: '0' },
];

const commands = [
  '[Claimed] Container startup: 1.8s',
  '[Claimed] Threat detection: 450ms / 1000 lines',
  'docker-compose build --no-cache',
  'docker-compose up -d',
  'docker-compose ps',
  'docker-compose logs -f mistral_studio',
];

const filesystemTree = `APOPO reference map
├── docs/ghost_dashboard_guide.md
├── docs/armageddon_reference.md
├── docs/mistral_developer_guide.md
├── docs/secure_coding.md
├── docs/threat_response.md
├── docs/api_reference.md
├── docs/deployment_checklist.md
├── docs/troubleshooting.md
└── Runtime layout
    ├── /data/ai_sessions/
    ├── /data/armageddon/
    └── /data/coding_projects/`;

const deploymentChecklist = [
  'Review API keys, resource limits, and network dependencies before rollout.',
  'Validate health endpoints and representative workflows after container startup.',
  'Run defensive simulations only in authorized environments.',
  'Back up persistent data and test restore procedures on a schedule.',
  'Treat benchmark values as targets or claims until independently measured.',
];

const loopSeed = [
  {
    model: 'Claude',
    role: 'Review',
    text: 'Let’s separate architecture intent from claims that have not been benchmarked in this repository.',
  },
  {
    model: 'GPT-4',
    role: 'Presentation',
    text: 'Then we can show the full APOPO summary in a way that highlights deployment flow, docs, and defensive controls.',
  },
  {
    model: 'Llama',
    role: 'Implementation',
    text: 'And we should preserve the live defense console while making the overview explicitly non-authoritative on performance metrics.',
  },
];

function setActiveTab(tabName) {
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });

  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  });
}

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
