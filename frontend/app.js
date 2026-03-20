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

// ─── Ghost Dashboard ───────────────────────────────────────────────────────

const ghostServices = [
  {
    name: 'GHOST AI Command Center',
    accent: 'violet',
    status: 'online',
    detail: 'Central orchestration dashboard',
    summary: 'Aggregates logs, controls, and status across AI, coding, and response services.',
    version: 'v2.4.1',
  },
  {
    name: 'Armageddon Engine',
    accent: 'amber',
    status: 'online',
    detail: 'Threat simulation + response',
    summary: 'Models threats, coordinates alerts, and supports defensive response workflows.',
    version: 'v1.9.0',
  },
  {
    name: 'Mistral Studio',
    accent: 'cyan',
    status: 'online',
    detail: 'Secure coding environment',
    summary: 'Coding runtime, prompt governance, and constrained execution layer.',
    version: 'v3.1.2',
  },
  {
    name: 'Claude / Roo / Kimi',
    accent: 'violet',
    status: 'online',
    detail: 'Developer tooling integration',
    summary: 'Local developer workflows, editor integration, and model configuration paths.',
    version: 'v1.0.0',
  },
];

const ghostControls = [
  { label: 'Restart Orchestrator', action: 'docker-compose restart ghost_ai', icon: '↺' },
  { label: 'Rebuild All Containers', action: 'docker-compose build --no-cache', icon: '⚙' },
  { label: 'Check Health Endpoints', action: 'curl -s localhost:3000/health', icon: '♥' },
  { label: 'Tail All Logs', action: 'docker-compose logs -f', icon: '☰' },
  { label: 'Run Defensive Sim', action: 'python3 armageddon/simulate.py --mode defensive', icon: '🛡' },
  { label: 'Export Audit Report', action: 'python3 scripts/export_audit.py', icon: '↗' },
];

const ghostSystemMetrics = [
  { label: 'Services Online', value: '4 / 4' },
  { label: 'Active Sessions', value: '12' },
  { label: 'Alerts (24h)', value: '3' },
  { label: 'Uptime', value: '99.8%' },
];

function makeLogEntry(level, service, msg) {
  const now = new Date();
  const ts = now.toTimeString().slice(0, 8);
  return { ts, level, service, msg };
}

const ghostLogSeed = [
  makeLogEntry('INFO', 'GHOST Core', 'Orchestrator heartbeat OK — all subsystems nominal.'),
  makeLogEntry('INFO', 'Armageddon', 'Threat model refresh complete. 0 new IOCs detected.'),
  makeLogEntry('WARN', 'Mistral Studio', 'Rate limit approached on coding endpoint — throttling active.'),
  makeLogEntry('INFO', 'Toolchain', 'Claude integration re-authenticated successfully.'),
  makeLogEntry('INFO', 'GHOST Core', 'Audit log snapshot exported to /data/audit/2026-03-20.json.'),
  makeLogEntry('INFO', 'Armageddon', 'Defensive simulation run complete — no policy violations.'),
  makeLogEntry('INFO', 'Mistral Studio', 'New coding session started by operator.'),
  makeLogEntry('INFO', 'GHOST Core', 'Config reload triggered — zero downtime.'),
];

function renderGhostDashboard() {
  // services
  document.getElementById('ghost-services').innerHTML = ghostServices
    .map(
      (svc) => `
      <article class="headline-card accent-${svc.accent}">
        <div class="service-status-row">
          <span class="status-dot status-${svc.status}"></span>
          <span class="flow-step">${svc.detail} · ${svc.version}</span>
        </div>
        <h3>${svc.name}</h3>
        <p class="muted">${svc.summary}</p>
      </article>
    `,
    )
    .join('');

  // controls
  document.getElementById('ghost-controls').innerHTML = ghostControls
    .map(
      (ctrl) => `
      <button type="button" class="ghost-ctrl-btn" title="${ctrl.action}">
        <span class="ctrl-icon">${ctrl.icon}</span>
        <span>${ctrl.label}</span>
        <code class="ctrl-cmd">${ctrl.action}</code>
      </button>
    `,
    )
    .join('');

  // metrics
  document.getElementById('ghost-metrics').innerHTML = ghostSystemMetrics
    .map(
      (m) => `
      <div class="metric-card">
        <span>${m.label}</span>
        <strong>${m.value}</strong>
      </div>
    `,
    )
    .join('');

  document.getElementById('ghost-uptime-pill').textContent = 'Uptime 99.8%';

  renderGhostLog(ghostLogSeed);
}

function renderGhostLog(entries) {
  document.getElementById('ghost-log-count').textContent = `${entries.length} entries`;
  document.getElementById('ghost-log').innerHTML = entries
    .map(
      (e) => `
      <div class="log-entry log-${e.level.toLowerCase()}">
        <span class="log-ts">${e.ts}</span>
        <span class="log-level">${e.level}</span>
        <span class="log-service">${e.service}</span>
        <span class="log-msg">${e.msg}</span>
      </div>
    `,
    )
    .join('');
}

function refreshGhostLog() {
  const extra = makeLogEntry('INFO', 'GHOST Core', `Manual refresh triggered at ${new Date().toTimeString().slice(0, 8)}.`);
  renderGhostLog([extra, ...ghostLogSeed]);
}

document.getElementById('ghost-refresh').addEventListener('click', refreshGhostLog);

// ─── Tools Integration ─────────────────────────────────────────────────────

const toolsCatalog = [
  {
    name: 'Gitleaks',
    repo: 'nostalgia2812/gitleaks',
    category: 'Secret Scanning',
    language: 'Go',
    license: 'MIT',
    priority: 'critical',
    status: 'Production',
    description: 'SAST tool for detecting hardcoded secrets, API keys, and tokens in git repositories.',
    docker: 'docker run --rm -v "$(pwd):/repo" ghcr.io/gitleaks/gitleaks:latest detect --source /repo',
    quickstart: 'gitleaks detect --source . --verbose',
  },
  {
    name: 'TruffleHog',
    repo: 'nostalgia2812/trufflehog',
    category: 'Secret Scanning',
    language: 'Go',
    license: 'AGPL-3.0',
    priority: 'critical',
    status: 'Production',
    description: 'Searches git history for secrets with 700+ credential detectors and real-time verification.',
    docker: 'docker run --rm -it ghcr.io/trufflesecurity/trufflehog:latest git file:///pwd --only-verified',
    quickstart: 'trufflehog git file://. --since-commit HEAD~10 --only-verified',
  },
  {
    name: 'Aircrack-ng',
    repo: 'nostalgia2812/aircrack-ng',
    category: 'Network Security',
    language: 'C',
    license: 'GPL-2.0',
    priority: 'high',
    status: 'Production',
    description: 'Complete WiFi network security assessment suite — monitoring, testing, and WPA/WEP cracking.',
    docker: null,
    quickstart: 'sudo airmon-ng start wlan0 && sudo airodump-ng wlan0mon',
  },
  {
    name: 'BeEF',
    repo: 'nostalgia2812/beef',
    category: 'Web App Testing',
    language: 'Ruby',
    license: 'Apache-2.0',
    priority: 'high',
    status: 'Production',
    description: 'Browser Exploitation Framework — hooks browsers and runs 300+ attack modules via JavaScript.',
    docker: 'docker run -p 3000:3000 beefproject/beef',
    quickstart: './beef  # UI at http://127.0.0.1:3000/ui/panel',
  },
  {
    name: 'Commix',
    repo: 'nostalgia2812/commix',
    category: 'Web App Testing',
    language: 'Python',
    license: 'GPL-3.0',
    priority: 'high',
    status: 'Production',
    description: 'Automated all-in-one OS command injection and exploitation tool for web applications.',
    docker: null,
    quickstart: 'python3 commix.py --url="http://target.com/page.php?id=1"',
  },
  {
    name: 'w3af',
    repo: 'nostalgia2812/w3af',
    category: 'Web App Testing',
    language: 'Python',
    license: 'GPL-2.0',
    priority: 'high',
    status: 'Stable',
    description: 'Web Application Attack and Audit Framework with 200+ plugins for vulnerability detection.',
    docker: 'docker run -it andresriancho/w3af',
    quickstart: 'python3 w3af_console',
  },
  {
    name: 'DeepDarkCTI',
    repo: 'nostalgia2812/deepdarkCTI',
    category: 'Threat Intelligence',
    language: 'Markdown',
    license: 'MIT',
    priority: 'medium',
    status: 'Production',
    description: 'Cyber threat intelligence from deep/dark web — ransomware sites, forums, IOC feeds.',
    docker: null,
    quickstart: 'git clone https://github.com/nostalgia2812/deepdarkCTI.git',
  },
  {
    name: 'Unblob',
    repo: 'nostalgia2812/unblob',
    category: 'Firmware Analysis',
    language: 'Python',
    license: 'MIT',
    priority: 'medium',
    status: 'Production',
    description: 'Extracts files from firmware images and binary blobs — 50+ supported formats.',
    docker: 'docker run --rm -v /path:/data ghcr.io/onekey-sec/unblob:latest /data/firmware.bin',
    quickstart: 'unblob -e /output firmware.bin',
  },
  {
    name: 'ADK Python',
    repo: 'nostalgia2812/adk-python',
    category: 'Dev Frameworks',
    language: 'Python',
    license: 'Apache-2.0',
    priority: 'medium',
    status: 'Beta',
    description: "Google's Agent Development Kit for building multi-agent AI systems with Gemini.",
    docker: null,
    quickstart: 'pip install google-adk',
  },
  {
    name: 'Firebase Framework Tools',
    repo: 'nostalgia2812/firebase-framework-tools',
    category: 'Dev Frameworks',
    language: 'TypeScript',
    license: 'Apache-2.0',
    priority: 'medium',
    status: 'Beta',
    description: 'Integrate Next.js, Angular, Nuxt, and other web frameworks with Firebase Hosting.',
    docker: null,
    quickstart: 'firebase deploy --only hosting',
  },
  {
    name: 'Book of Secret Knowledge',
    repo: 'nostalgia2812/the-book-of-secret-knowledge',
    category: 'Knowledge Bases',
    language: 'Markdown',
    license: 'MIT',
    priority: 'low',
    status: 'Production',
    description: 'Curated collection of CLI tools, cheatsheets, one-liners, and references for IT practitioners.',
    docker: null,
    quickstart: 'git clone https://github.com/nostalgia2812/the-book-of-secret-knowledge.git',
  },
];

const toolCategories = ['All', ...Array.from(new Set(toolsCatalog.map((t) => t.category)))];

const toolsPipeline = [
  { title: 'Commit → Gitleaks', text: 'Pre-commit hook blocks commits containing hardcoded secrets.' },
  { title: 'PR → TruffleHog', text: 'CI full-history scan runs on every pull request.' },
  { title: 'Deploy → w3af / Commix', text: 'Web vulnerability scan on staging before production push.' },
  { title: 'Runtime → DeepDarkCTI', text: 'Threat intelligence enrichment correlates live alerts.' },
  { title: 'Firmware → Unblob', text: 'Binary blob extraction feeds into static analysis pipelines.' },
  { title: 'Report', text: 'Consolidated findings exported to SIEM / ticketing.' },
];

const toolsDockerSnippets = toolsCatalog
  .filter((t) => t.docker)
  .map((t) => `# ${t.name}\n${t.docker}`);

let activeToolCategory = 'All';

function priorityClass(p) {
  return { critical: 'priority-critical', high: 'priority-high', medium: 'priority-medium', low: 'priority-low' }[p] || '';
}

function langAccent(lang) {
  return { Go: 'cyan', Python: 'violet', Ruby: 'amber', C: 'amber', TypeScript: 'cyan', Markdown: 'muted' }[lang] || '';
}

function renderToolsCatalog(category) {
  const filtered = category === 'All' ? toolsCatalog : toolsCatalog.filter((t) => t.category === category);
  document.getElementById('tools-visible-count').textContent = `${filtered.length} of ${toolsCatalog.length} tools`;

  document.getElementById('tools-catalog').innerHTML = filtered
    .map(
      (tool) => `
      <article class="tool-card">
        <div class="tool-card-header">
          <div>
            <h3 class="tool-name">${tool.name}</h3>
            <span class="tool-repo muted">${tool.repo}</span>
          </div>
          <div class="tool-badges">
            <span class="priority-pill ${priorityClass(tool.priority)}">${tool.priority}</span>
            <span class="lang-badge lang-${langAccent(tool.language)}">${tool.language}</span>
          </div>
        </div>
        <p class="tool-desc muted">${tool.description}</p>
        <div class="tool-meta-row">
          <span class="pill subtle">${tool.category}</span>
          <span class="pill subtle">${tool.license}</span>
          <span class="pill subtle status-pill-${tool.status.toLowerCase().replace(' ', '-')}">${tool.status}</span>
        </div>
        <pre class="tool-quickstart">${tool.quickstart}</pre>
      </article>
    `,
    )
    .join('');
}

function renderToolsView() {
  // summary metrics
  const byPriority = (p) => toolsCatalog.filter((t) => t.priority === p).length;
  document.getElementById('tools-summary-metrics').innerHTML = [
    { label: 'Critical', value: byPriority('critical') },
    { label: 'High Priority', value: byPriority('high') },
    { label: 'Medium Priority', value: byPriority('medium') },
    { label: 'Docker-Ready', value: toolsCatalog.filter((t) => t.docker).length },
  ]
    .map(
      (m) => `
      <div class="metric-card">
        <span>${m.label}</span>
        <strong>${m.value}</strong>
      </div>
    `,
    )
    .join('');

  // category filter
  document.getElementById('tools-filter').innerHTML = toolCategories
    .map(
      (cat) => `
      <button type="button" class="category-btn${cat === activeToolCategory ? ' active' : ''}" data-cat="${cat}">
        ${cat}
      </button>
    `,
    )
    .join('');

  document.querySelectorAll('.category-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeToolCategory = btn.dataset.cat;
      document.querySelectorAll('.category-btn').forEach((b) => b.classList.toggle('active', b.dataset.cat === activeToolCategory));
      renderToolsCatalog(activeToolCategory);
    });
  });

  // pipeline
  document.getElementById('tools-pipeline').innerHTML = toolsPipeline
    .map(
      (step) => `
      <article class="signal-card">
        <h3>${step.title}</h3>
        <p>${step.text}</p>
      </article>
    `,
    )
    .join('');

  // docker snippets
  document.getElementById('tools-docker').innerHTML = toolsDockerSnippets
    .map((snip) => `<pre>${snip}</pre>`)
    .join('');

  renderToolsCatalog(activeToolCategory);
}

renderGhostDashboard();
renderToolsView();
