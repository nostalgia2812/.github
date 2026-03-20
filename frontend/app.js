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

function renderApopoView() {
  document.getElementById('service-flow').innerHTML = components
    .map(
      (component) => `
        <article class="headline-card accent-${component.accent}">
          <p class="flow-step">${component.detail}</p>
          <h3>${component.name}</h3>
          <p class="muted">${component.summary}</p>
        </article>
      `,
    )
    .join('');

  document.getElementById('service-details').innerHTML = components
    .map(
      (component) => `
        <article class="fact-card verified">
          <h3>${component.title}</h3>
          <p>${component.summary}</p>
          <p class="muted"><strong>Mapped from:</strong> ${component.name}</p>
        </article>
      `,
    )
    .join('');

  document.getElementById('guardrails').innerHTML = guardrails
    .map(
      (item) => `
        <article class="timeline-item">
          <span class="timeline-date">Trust note</span>
          <p>${item}</p>
        </article>
      `,
    )
    .join('');

  document.getElementById('workflow-grid').innerHTML = workflowSteps
    .map(
      (step) => `
        <article class="signal-card">
          <h3>${step.title}</h3>
          <p>${step.text}</p>
        </article>
      `,
    )
    .join('');

  document.getElementById('blueprint-metrics').innerHTML = blueprintMetrics
    .map(
      (metric) => `
        <div class="metric-card">
          <span>${metric.label}</span>
          <strong>${metric.value}</strong>
        </div>
      `,
    )
    .join('');

  document.getElementById('filesystem-tree').textContent = filesystemTree;

  document.getElementById('checklist').innerHTML = deploymentChecklist
    .map((item) => `<li>${item}</li>`)
    .join('');

  document.getElementById('commands').innerHTML = commands
    .map((command) => `<pre>${command}</pre>`)
    .join('');
}

function generateLoop() {
  const loop = document.getElementById('conversation-loop');
  const offset = Math.floor(Math.random() * loopSeed.length);
  const ordered = loopSeed.map((_, index) => loopSeed[(index + offset) % loopSeed.length]);

  loop.innerHTML = ordered
    .map(
      (entry) => `
        <article class="message-card">
          <div class="message-meta">
            <strong>${entry.model}</strong>
            <span>${entry.role}</span>
          </div>
          <p>${entry.text}</p>
        </article>
      `,
    )
    .join('');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    skill_name: document.getElementById('skill_name').value,
    publisher: document.getElementById('publisher').value,
    instruction_text: document.getElementById('instruction_text').value,
    urls: document
      .getElementById('urls')
      .value.split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  };

  const response = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  renderResult(await response.json());
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

loadIocs();
renderApopoView();
generateLoop();
document.getElementById('refresh-loop').addEventListener('click', generateLoop);
