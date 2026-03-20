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
    healthEndpoint: 'localhost:3000/health',
    connectedTools: ['Gitleaks', 'TruffleHog', 'Nuclei', 'DeepDarkCTI'],
    alertCount: 1,
  },
  {
    name: 'Armageddon Engine',
    accent: 'amber',
    status: 'online',
    detail: 'Threat simulation + response',
    summary: 'Models threats, coordinates alerts, and runs defensive simulation workflows.',
    version: 'v1.9.0',
    healthEndpoint: 'localhost:3001/health',
    connectedTools: ['DeepDarkCTI', 'Volatility', 'Wireshark', 'SIEM'],
    alertCount: 2,
  },
  {
    name: 'Mistral Studio',
    accent: 'cyan',
    status: 'degraded',
    detail: 'Secure coding environment',
    summary: 'Coding runtime, prompt governance, and constrained execution layer.',
    version: 'v3.1.2',
    healthEndpoint: 'localhost:3002/health',
    connectedTools: ['ADK Python', 'Firebase Framework Tools'],
    alertCount: 1,
  },
  {
    name: 'Claude / Roo / Kimi',
    accent: 'violet',
    status: 'online',
    detail: 'Developer tooling integration',
    summary: 'Local developer workflows, editor integration, and model configuration paths.',
    version: 'v1.0.0',
    healthEndpoint: 'localhost:3003/health',
    connectedTools: ['ADK Python', 'Book of Secret Knowledge'],
    alertCount: 0,
  },
];

const ghostAlerts = [
  {
    id: 'ALT-001',
    severity: 'high',
    service: 'Armageddon Engine',
    title: 'Unusual outbound connection pattern detected on port 4444',
    detail: 'Source: 192.168.1.47 → external. Possible C2 beacon. Isolating for analysis.',
    time: '09:14:22',
    status: 'investigating',
  },
  {
    id: 'ALT-002',
    severity: 'high',
    service: 'Armageddon Engine',
    title: 'SQLMap scan triggered WAF on staging environment',
    detail: 'Automated scan from CI pipeline hit rate limit. 47 payloads blocked. Review scan schedule.',
    time: '09:08:05',
    status: 'resolved',
  },
  {
    id: 'ALT-003',
    severity: 'medium',
    service: 'Mistral Studio',
    title: 'Prompt injection attempt blocked — sandbox isolation active',
    detail: 'Attempted jailbreak via crafted system prompt. Governance layer intercepted. Session terminated.',
    time: '09:02:47',
    status: 'resolved',
  },
  {
    id: 'ALT-004',
    severity: 'medium',
    service: 'GHOST Core',
    title: 'Nuclei scan found exposed admin panel on internal asset',
    detail: 'Template: exposed-panels/traefik-dashboard. Asset: 10.0.1.88:8080. Requires immediate remediation.',
    time: '08:55:13',
    status: 'open',
  },
  {
    id: 'ALT-005',
    severity: 'low',
    service: 'GHOST Core',
    title: 'TLS certificate rotation scheduled — 6 hours remaining',
    detail: 'Cert for ghost-internal.local expires at 16:00 UTC. Auto-renew via Certbot configured.',
    time: '08:45:00',
    status: 'pending',
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

function computeGhostMetrics() {
  const online = ghostServices.filter((s) => s.status === 'online').length;
  const total = ghostServices.length;
  const openAlerts = ghostAlerts.filter((a) => a.status === 'open' || a.status === 'investigating').length;
  const connectedToolsTotal = ghostServices.reduce((acc, s) => acc + s.connectedTools.length, 0);
  return [
    { label: 'Services Online', value: `${online} / ${total}` },
    { label: 'Open Alerts', value: String(openAlerts) },
    { label: 'Connected Tools', value: String(connectedToolsTotal) },
    { label: 'Uptime', value: '99.8%' },
  ];
}

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
  const metrics = computeGhostMetrics();
  const degraded = ghostServices.filter((s) => s.status !== 'online').length;

  // header pill
  document.getElementById('ghost-uptime-pill').textContent =
    degraded > 0 ? `${degraded} service degraded` : 'All systems nominal';

  // services — show connected tools inline
  document.getElementById('ghost-services').innerHTML = ghostServices
    .map(
      (svc) => `
      <article class="headline-card accent-${svc.accent}">
        <div class="service-status-row">
          <span class="status-dot status-${svc.status}"></span>
          <span class="flow-step">${svc.detail} · ${svc.version}</span>
          ${svc.alertCount > 0 ? `<span class="alert-badge">${svc.alertCount}</span>` : ''}
        </div>
        <h3>${svc.name}</h3>
        <p class="muted">${svc.summary}</p>
        <div class="connected-tools-row">
          ${svc.connectedTools.map((t) => `<span class="tag-chip">${t}</span>`).join('')}
        </div>
        <code class="health-endpoint muted">${svc.healthEndpoint}</code>
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
  document.getElementById('ghost-metrics').innerHTML = metrics
    .map(
      (m) => `
      <div class="metric-card">
        <span>${m.label}</span>
        <strong>${m.value}</strong>
      </div>
    `,
    )
    .join('');

  renderGhostAlerts(ghostAlerts);
  renderGhostLog(ghostLogSeed);
}

function renderGhostAlerts(alerts) {
  const el = document.getElementById('ghost-alerts');
  if (!el) return;
  const open = alerts.filter((a) => a.status !== 'resolved').length;
  document.getElementById('ghost-alerts-count').textContent = `${open} active`;
  el.innerHTML = alerts
    .map(
      (a) => `
      <article class="ghost-alert-card alert-sev-${a.severity}">
        <div class="alert-header-row">
          <div class="alert-id-group">
            <span class="alert-id">${a.id}</span>
            <span class="alert-sev-pill sev-${a.severity}">${a.severity}</span>
            <span class="alert-status-pill status-${a.status}">${a.status}</span>
          </div>
          <span class="alert-time muted">${a.time}</span>
        </div>
        <p class="alert-title">${a.title}</p>
        <p class="alert-detail muted">${a.detail}</p>
        <span class="tag-chip tag-service">${a.service}</span>
      </article>
    `,
    )
    .join('');
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
  // ── Secret Scanning ──────────────────────────────────────────────────────
  {
    name: 'Gitleaks',
    repo: 'nostalgia2812/gitleaks',
    category: 'Secret Scanning',
    language: 'Go',
    license: 'MIT',
    priority: 'critical',
    status: 'Production',
    description: 'SAST tool for detecting hardcoded secrets, API keys, and tokens in git repositories. 140+ built-in rules, pre-commit hooks, and CI/CD native.',
    docker: 'docker run --rm -v "$(pwd):/repo" ghcr.io/gitleaks/gitleaks:latest detect --source /repo',
    quickstart: 'gitleaks detect --source . --verbose',
    tags: ['secrets', 'git', 'sast', 'pre-commit', 'ci-cd'],
    integrations: ['TruffleHog', 'GitHub Actions', 'GitLab CI', 'Jenkins'],
  },
  {
    name: 'TruffleHog',
    repo: 'nostalgia2812/trufflehog',
    category: 'Secret Scanning',
    language: 'Go',
    license: 'AGPL-3.0',
    priority: 'critical',
    status: 'Production',
    description: 'Deep git history secret scanner with 700+ credential detectors and real-time verification against live APIs.',
    docker: 'docker run --rm -it ghcr.io/trufflesecurity/trufflehog:latest git file:///pwd --only-verified',
    quickstart: 'trufflehog git file://. --since-commit HEAD~10 --only-verified',
    tags: ['secrets', 'git', 'history-scan', 'ci-cd', 'verification'],
    integrations: ['Gitleaks', 'GitHub Actions', 'GitLab CI', 'SIEM'],
  },
  // ── Network Security ─────────────────────────────────────────────────────
  {
    name: 'Nmap',
    repo: 'community/nmap',
    category: 'Network Security',
    language: 'C',
    license: 'NPSL',
    priority: 'critical',
    status: 'Production',
    description: 'Network exploration and security auditing tool. Performs host discovery, port scanning, OS/service detection, and scriptable vulnerability probing.',
    docker: 'docker run --rm --network host instrumentisto/nmap -sV -O target',
    quickstart: 'nmap -sV -sC -O -p- target.host',
    tags: ['network', 'port-scan', 'os-detection', 'service-detection', 'nse'],
    integrations: ['Metasploit', 'Wireshark', 'w3af', 'Hydra'],
  },
  {
    name: 'Aircrack-ng',
    repo: 'nostalgia2812/aircrack-ng',
    category: 'Network Security',
    language: 'C',
    license: 'GPL-2.0',
    priority: 'high',
    status: 'Production',
    description: 'Complete WiFi security assessment suite — monitor mode, packet capture, injection, and WPA/WPA2/WEP cracking.',
    docker: null,
    quickstart: 'sudo airmon-ng start wlan0 && sudo airodump-ng wlan0mon',
    tags: ['wifi', 'wpa', 'wep', 'wireless', 'capture', 'injection'],
    integrations: ['Wireshark', 'Hashcat'],
  },
  {
    name: 'Hydra',
    repo: 'community/thc-hydra',
    category: 'Network Security',
    language: 'C',
    license: 'GPL-3.0',
    priority: 'high',
    status: 'Production',
    description: 'Fast, parallelized network login brute-forcer supporting 50+ protocols: SSH, FTP, HTTP, SMB, RDP, and more.',
    docker: 'docker run --rm vanhauser/hydra -l admin -P wordlist.txt ssh://target',
    quickstart: 'hydra -l admin -P rockyou.txt -t 4 ssh://target.host',
    tags: ['brute-force', 'login', 'protocols', 'ssh', 'ftp', 'password'],
    integrations: ['Nmap', 'John the Ripper', 'Hashcat'],
  },
  {
    name: 'Wireshark',
    repo: 'community/wireshark',
    category: 'Network Security',
    language: 'C',
    license: 'GPL-2.0',
    priority: 'medium',
    status: 'Production',
    description: 'World-leading network protocol analyzer. Captures live traffic or reads saved captures for deep packet inspection across 3000+ protocols.',
    docker: 'docker run --rm --net=host -e DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix lscr.io/linuxserver/wireshark',
    quickstart: 'wireshark -i eth0 -k  # live capture\ntshark -r capture.pcap -Y "http"',
    tags: ['packets', 'protocol-analysis', 'pcap', 'capture', 'tls', 'network'],
    integrations: ['Aircrack-ng', 'Nmap', 'Zeek'],
  },
  // ── Web App Testing ──────────────────────────────────────────────────────
  {
    name: 'SQLMap',
    repo: 'community/sqlmap',
    category: 'Web App Testing',
    language: 'Python',
    license: 'GPL-2.0',
    priority: 'critical',
    status: 'Production',
    description: 'Automated SQL injection detection and exploitation. Supports 6 injection techniques across MySQL, PostgreSQL, MSSQL, Oracle, SQLite, and more.',
    docker: 'docker run --rm -it paoloo/sqlmap -u "http://target/page?id=1" --dbs',
    quickstart: 'python3 sqlmap.py -u "http://target/page?id=1" --dbs --batch',
    tags: ['sql-injection', 'database', 'automated', 'web', 'blind', 'union'],
    integrations: ['Burp Suite', 'w3af', 'Commix', 'Nmap'],
  },
  {
    name: 'BeEF',
    repo: 'nostalgia2812/beef',
    category: 'Web App Testing',
    language: 'Ruby',
    license: 'Apache-2.0',
    priority: 'high',
    status: 'Production',
    description: 'Browser Exploitation Framework — hooks browsers via JavaScript and runs 300+ attack modules including network pivoting, social engineering, and keylogging.',
    docker: 'docker run -p 3000:3000 beefproject/beef',
    quickstart: './beef  # UI at http://127.0.0.1:3000/ui/panel',
    tags: ['browser', 'xss', 'javascript', 'hooking', 'social-engineering'],
    integrations: ['Metasploit', 'Burp Suite', 'w3af'],
  },
  {
    name: 'Commix',
    repo: 'nostalgia2812/commix',
    category: 'Web App Testing',
    language: 'Python',
    license: 'GPL-3.0',
    priority: 'high',
    status: 'Production',
    description: 'Automated all-in-one OS command injection — classic, timing-based, and file-based techniques with WAF bypass tamper scripts.',
    docker: null,
    quickstart: 'python3 commix.py --url="http://target.com/page.php?id=1"',
    tags: ['injection', 'os-command', 'waf-bypass', 'burp', 'reverse-shell'],
    integrations: ['Burp Suite', 'SQLMap', 'Metasploit'],
  },
  {
    name: 'OWASP ZAP',
    repo: 'community/zaproxy',
    category: 'Web App Testing',
    language: 'Java',
    license: 'Apache-2.0',
    priority: 'high',
    status: 'Production',
    description: 'OWASP Zed Attack Proxy — active and passive scanning, fuzzing, spider, and REST API for automated security testing in CI/CD pipelines.',
    docker: 'docker run -t owasp/zap2docker-stable zap-full-scan.py -t https://target.com',
    quickstart: '# Full scan\ndocker run owasp/zap2docker-stable zap-full-scan.py -t https://target.com -r report.html',
    tags: ['web', 'proxy', 'active-scan', 'passive-scan', 'fuzzing', 'ci-cd'],
    integrations: ['w3af', 'Burp Suite', 'Nuclei', 'Jenkins', 'GitHub Actions'],
  },
  {
    name: 'w3af',
    repo: 'nostalgia2812/w3af',
    category: 'Web App Testing',
    language: 'Python',
    license: 'GPL-2.0',
    priority: 'high',
    status: 'Stable',
    description: 'Web Application Attack and Audit Framework with 200+ plugins for SQL injection, XSS, CSRF detection and exploitation.',
    docker: 'docker run -it andresriancho/w3af',
    quickstart: 'python3 w3af_console',
    tags: ['web', 'scanner', 'sqli', 'xss', 'csrf', 'rest-api'],
    integrations: ['Burp Suite', 'Commix', 'SQLMap', 'OWASP ZAP'],
  },
  // ── Vulnerability Scanning ───────────────────────────────────────────────
  {
    name: 'Nuclei',
    repo: 'community/nuclei',
    category: 'Vulnerability Scanning',
    language: 'Go',
    license: 'MIT',
    priority: 'high',
    status: 'Production',
    description: 'Fast, template-based vulnerability scanner. 9000+ community templates covering CVEs, misconfigs, exposed panels, and cloud-native targets.',
    docker: 'docker run --rm -it projectdiscovery/nuclei -u https://target.com',
    quickstart: '# Scan with all templates\nnuclei -u https://target.com -t /nuclei-templates/\n# CVE-only scan\nnuclei -u https://target.com -t cves/',
    tags: ['templates', 'cve', 'web', 'cloud', 'misconfiguration', 'scanning'],
    integrations: ['Nmap', 'OWASP ZAP', 'GitHub Actions', 'SIEM'],
  },
  // ── Threat Intelligence ──────────────────────────────────────────────────
  {
    name: 'DeepDarkCTI',
    repo: 'nostalgia2812/deepdarkCTI',
    category: 'Threat Intelligence',
    language: 'Markdown',
    license: 'MIT',
    priority: 'medium',
    status: 'Production',
    description: 'Comprehensive cyber threat intelligence from deep/dark web — ransomware sites, forums, threat actor infrastructure, and IOC feeds.',
    docker: null,
    quickstart: 'git clone https://github.com/nostalgia2812/deepdarkCTI.git',
    tags: ['threat-intel', 'dark-web', 'ioc', 'ransomware', 'threat-actors'],
    integrations: ['MISP', 'SIEM', 'Nuclei', 'GHOST Core'],
  },
  // ── Firmware Analysis ────────────────────────────────────────────────────
  {
    name: 'Unblob',
    repo: 'nostalgia2812/unblob',
    category: 'Firmware Analysis',
    language: 'Python',
    license: 'MIT',
    priority: 'medium',
    status: 'Production',
    description: 'Extracts files from firmware images and arbitrary binary blobs — 50+ formats including SquashFS, JFFS2, Zlib, LZMA, and Zstd.',
    docker: 'docker run --rm -v /path:/data ghcr.io/onekey-sec/unblob:latest /data/firmware.bin',
    quickstart: 'unblob -e /output firmware.bin',
    tags: ['firmware', 'binary', 'extraction', 'iot', 'squashfs', 'reverse-engineering'],
    integrations: ['Volatility', 'Binwalk', 'Ghidra'],
  },
  // ── Memory Forensics ─────────────────────────────────────────────────────
  {
    name: 'Volatility',
    repo: 'community/volatility3',
    category: 'Memory Forensics',
    language: 'Python',
    license: 'Apache-2.0',
    priority: 'medium',
    status: 'Production',
    description: 'Advanced memory forensics framework for extracting digital artifacts from RAM dumps — processes, network connections, registry hives, and malware detection.',
    docker: 'docker run --rm -v $(pwd):/workspace sk4la/volatility3 -f /workspace/mem.dmp windows.pslist',
    quickstart: '# List processes from memory dump\nvol -f memory.dmp windows.pslist\n# Network connections\nvol -f memory.dmp windows.netstat',
    tags: ['memory', 'forensics', 'malware', 'ram', 'artifacts', 'incident-response'],
    integrations: ['Unblob', 'Wireshark', 'SIEM', 'DeepDarkCTI'],
  },
  // ── Password Cracking ────────────────────────────────────────────────────
  {
    name: 'Hashcat',
    repo: 'community/hashcat',
    category: 'Password Cracking',
    language: 'C',
    license: 'MIT',
    priority: 'medium',
    status: 'Production',
    description: 'World\'s fastest CPU-based password recovery utility. Supports 300+ hash types including MD5, SHA-1, bcrypt, WPA-PMKID, and NTLM.',
    docker: 'docker run --rm -it dizcza/docker-hashcat hashcat -a 0 -m 0 hashes.txt wordlist.txt',
    quickstart: '# Dictionary attack on MD5 hashes\nhashcat -a 0 -m 0 hashes.txt rockyou.txt\n# Brute-force 6-char\nhashcat -a 3 -m 0 hashes.txt ?a?a?a?a?a?a',
    tags: ['password', 'cracking', 'hash', 'brute-force', 'dictionary', 'wpa'],
    integrations: ['Hydra', 'Aircrack-ng', 'John the Ripper'],
  },
  // ── Dev Frameworks ───────────────────────────────────────────────────────
  {
    name: 'ADK Python',
    repo: 'nostalgia2812/adk-python',
    category: 'Dev Frameworks',
    language: 'Python',
    license: 'Apache-2.0',
    priority: 'medium',
    status: 'Beta',
    description: "Google's Agent Development Kit for building, evaluating, and deploying multi-agent AI systems with Gemini and Vertex AI.",
    docker: null,
    quickstart: 'pip install google-adk',
    tags: ['ai', 'agents', 'gemini', 'google', 'multi-agent', 'llm'],
    integrations: ['Gemini', 'Vertex AI', 'Google Cloud', 'GHOST Core'],
  },
  {
    name: 'Firebase Framework Tools',
    repo: 'nostalgia2812/firebase-framework-tools',
    category: 'Dev Frameworks',
    language: 'TypeScript',
    license: 'Apache-2.0',
    priority: 'medium',
    status: 'Beta',
    description: 'Integrate Next.js, Angular, Nuxt, and other modern web frameworks with Firebase Hosting for streamlined SSR deployment.',
    docker: null,
    quickstart: 'firebase deploy --only hosting',
    tags: ['firebase', 'deployment', 'nextjs', 'angular', 'ssr', 'hosting'],
    integrations: ['Firebase', 'Google Cloud', 'GitHub Actions'],
  },
  // ── Knowledge Bases ──────────────────────────────────────────────────────
  {
    name: 'Book of Secret Knowledge',
    repo: 'nostalgia2812/the-book-of-secret-knowledge',
    category: 'Knowledge Bases',
    language: 'Markdown',
    license: 'MIT',
    priority: 'low',
    status: 'Production',
    description: 'Curated collection of CLI tools, cheatsheets, one-liners, blogs, and references for IT professionals and security practitioners.',
    docker: null,
    quickstart: 'git clone https://github.com/nostalgia2812/the-book-of-secret-knowledge.git',
    tags: ['reference', 'cheatsheet', 'cli', 'one-liners', 'sysadmin'],
    integrations: ['All tools'],
  },
];

const toolCategories = ['All', ...Array.from(new Set(toolsCatalog.map((t) => t.category)))];

// Extract all unique tags from catalog, sorted by frequency
const toolTagFreq = toolsCatalog
  .flatMap((t) => t.tags)
  .reduce((acc, tag) => { acc[tag] = (acc[tag] || 0) + 1; return acc; }, {});
const toolAllTags = Object.entries(toolTagFreq)
  .sort((a, b) => b[1] - a[1])
  .map(([tag]) => tag);

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
let activeToolTags = new Set();

function priorityClass(p) {
  return { critical: 'priority-critical', high: 'priority-high', medium: 'priority-medium', low: 'priority-low' }[p] || '';
}

function langAccent(lang) {
  return { Go: 'cyan', Python: 'violet', Ruby: 'amber', C: 'amber', TypeScript: 'cyan', Markdown: 'muted' }[lang] || '';
}

function applyToolFilters() {
  let filtered = category === 'All' ? toolsCatalog : toolsCatalog.filter((t) => t.category === activeToolCategory);
  if (activeToolTags.size > 0) {
    filtered = filtered.filter((t) => [...activeToolTags].every((tag) => t.tags.includes(tag)));
  }
  return filtered;
}

function renderToolsCatalog() {
  let filtered = activeToolCategory === 'All' ? [...toolsCatalog] : toolsCatalog.filter((t) => t.category === activeToolCategory);
  if (activeToolTags.size > 0) {
    filtered = filtered.filter((t) => [...activeToolTags].every((tag) => t.tags.includes(tag)));
  }

  document.getElementById('tools-visible-count').textContent = `${filtered.length} of ${toolsCatalog.length} tools`;

  if (filtered.length === 0) {
    document.getElementById('tools-catalog').innerHTML = `<p class="muted" style="padding:1rem">No tools match the selected filters.</p>`;
    return;
  }

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
          <span class="pill subtle status-pill-${tool.status.toLowerCase().replace(/\s/g, '-')}">${tool.status}</span>
          <span class="integrations-count" title="Integrations: ${tool.integrations.join(', ')}">↔ ${tool.integrations.length}</span>
        </div>
        <div class="tool-tags-row">
          ${tool.tags.map((tag) => `<span class="tag-chip${activeToolTags.has(tag) ? ' tag-active' : ''}" data-tag="${tag}">${tag}</span>`).join('')}
        </div>
        <pre class="tool-quickstart">${tool.quickstart}</pre>
      </article>
    `,
    )
    .join('');

  // click tags on cards to add to filter
  document.querySelectorAll('.tool-tags-row .tag-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tag;
      if (activeToolTags.has(tag)) activeToolTags.delete(tag);
      else activeToolTags.add(tag);
      renderTagFilter();
      renderToolsCatalog();
    });
  });
}

function renderTagFilter() {
  const el = document.getElementById('tools-tags-filter');
  if (!el) return;
  el.innerHTML = toolAllTags
    .map(
      (tag) => `
      <span class="tag-chip${activeToolTags.has(tag) ? ' tag-active' : ''}" data-tag="${tag}" role="button" tabindex="0">${tag}</span>
    `,
    )
    .join('');
  el.querySelectorAll('.tag-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tag;
      if (activeToolTags.has(tag)) activeToolTags.delete(tag);
      else activeToolTags.add(tag);
      renderTagFilter();
      renderToolsCatalog();
    });
  });
  // update clear-tags button visibility
  const clearBtn = document.getElementById('tools-tags-clear');
  if (clearBtn) clearBtn.style.display = activeToolTags.size > 0 ? 'inline-flex' : 'none';
}

function renderToolsView() {
  // update header pill with live count
  const countPill = document.getElementById('tool-count-pill');
  if (countPill) countPill.textContent = `${toolsCatalog.length} Tools`;

  // summary metrics
  const byPriority = (p) => toolsCatalog.filter((t) => t.priority === p).length;
  document.getElementById('tools-summary-metrics').innerHTML = [
    { label: 'Critical', value: byPriority('critical') },
    { label: 'High Priority', value: byPriority('high') },
    { label: 'Total Tools', value: toolsCatalog.length },
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
      renderToolsCatalog();
    });
  });

  // tag filter
  renderTagFilter();
  document.getElementById('tools-tags-clear').addEventListener('click', () => {
    activeToolTags.clear();
    renderTagFilter();
    renderToolsCatalog();
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

  renderToolsCatalog();
}

// ─── Install Listing ───────────────────────────────────────────────────────

const installMethods = {
  // maps tool name → install commands by method
  'Gitleaks': {
    go:     'go install github.com/gitleaks/gitleaks/v8@latest',
    brew:   'brew install gitleaks',
    apt:    null,
    docker: 'docker run --rm -v "$(pwd):/repo" ghcr.io/gitleaks/gitleaks:latest detect --source /repo',
    pip:    null,
  },
  'TruffleHog': {
    go:     'go install github.com/trufflesecurity/trufflehog/v3@latest',
    brew:   'brew install trufflehog',
    apt:    null,
    docker: 'docker run --rm -it ghcr.io/trufflesecurity/trufflehog:latest',
    pip:    null,
  },
  'Nmap': {
    go:     null,
    brew:   'brew install nmap',
    apt:    'sudo apt-get install -y nmap',
    docker: 'docker run --rm --network host instrumentisto/nmap',
    pip:    null,
  },
  'Aircrack-ng': {
    go:     null,
    brew:   'brew install aircrack-ng',
    apt:    'sudo apt-get install -y aircrack-ng',
    docker: null,
    pip:    null,
  },
  'Hydra': {
    go:     null,
    brew:   'brew install hydra',
    apt:    'sudo apt-get install -y hydra',
    docker: 'docker run --rm vanhauser/hydra',
    pip:    null,
  },
  'Wireshark': {
    go:     null,
    brew:   'brew install --cask wireshark',
    apt:    'sudo apt-get install -y wireshark tshark',
    docker: 'docker run --rm --net=host lscr.io/linuxserver/wireshark',
    pip:    null,
  },
  'SQLMap': {
    go:     null,
    brew:   'brew install sqlmap',
    apt:    'sudo apt-get install -y sqlmap',
    docker: 'docker run --rm -it paoloo/sqlmap',
    pip:    'pip install sqlmap',
  },
  'BeEF': {
    go:     null,
    brew:   null,
    apt:    'sudo apt-get install -y beef-xss',
    docker: 'docker run -p 3000:3000 beefproject/beef',
    pip:    null,
  },
  'Commix': {
    go:     null,
    brew:   null,
    apt:    'sudo apt-get install -y commix',
    docker: null,
    pip:    'pip3 install commix',
  },
  'OWASP ZAP': {
    go:     null,
    brew:   'brew install --cask owasp-zap',
    apt:    'sudo snap install zaproxy --classic',
    docker: 'docker pull owasp/zap2docker-stable',
    pip:    null,
  },
  'w3af': {
    go:     null,
    brew:   null,
    apt:    null,
    docker: 'docker run -it andresriancho/w3af',
    pip:    'pip3 install -r requirements.txt  # inside cloned repo',
  },
  'Nuclei': {
    go:     'go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest',
    brew:   'brew install nuclei',
    apt:    null,
    docker: 'docker pull projectdiscovery/nuclei',
    pip:    null,
  },
  'DeepDarkCTI': {
    go:     null,
    brew:   null,
    apt:    null,
    docker: null,
    pip:    null,
    git:    'git clone https://github.com/nostalgia2812/deepdarkCTI.git',
  },
  'Unblob': {
    go:     null,
    brew:   null,
    apt:    'sudo apt-get install -y lzop zstd lz4 unar  # deps',
    docker: 'docker pull ghcr.io/onekey-sec/unblob:latest',
    pip:    'pip3 install unblob',
  },
  'Volatility': {
    go:     null,
    brew:   null,
    apt:    null,
    docker: 'docker pull sk4la/volatility3',
    pip:    'pip3 install volatility3',
    git:    'git clone https://github.com/volatilityfoundation/volatility3.git',
  },
  'Hashcat': {
    go:     null,
    brew:   'brew install hashcat',
    apt:    'sudo apt-get install -y hashcat',
    docker: 'docker pull dizcza/docker-hashcat',
    pip:    null,
  },
  'ADK Python': {
    go:     null,
    brew:   null,
    apt:    null,
    docker: null,
    pip:    'pip install google-adk',
  },
  'Firebase Framework Tools': {
    go:     null,
    brew:   null,
    apt:    null,
    docker: null,
    pip:    null,
    npm:    'npm install -g firebase-tools',
  },
  'Book of Secret Knowledge': {
    go:     null,
    brew:   null,
    apt:    null,
    docker: null,
    pip:    null,
    git:    'git clone https://github.com/nostalgia2812/the-book-of-secret-knowledge.git',
  },
};

function renderInstallListing() {
  const el = document.getElementById('tools-install-listing');
  if (!el) return;

  const methodIcons = { go: 'Go', brew: 'Brew', apt: 'APT', docker: 'Docker', pip: 'pip', npm: 'npm', git: 'git' };

  el.innerHTML = toolsCatalog
    .map((tool) => {
      const methods = installMethods[tool.name] || {};
      const cmds = Object.entries(methods)
        .filter(([, cmd]) => cmd)
        .map(([method, cmd]) => `<div class="install-row"><span class="install-method">${methodIcons[method] || method}</span><code class="install-cmd">${cmd}</code></div>`)
        .join('');
      return `
        <article class="install-card">
          <div class="install-card-header">
            <h3>${tool.name}</h3>
            <div>
              <span class="priority-pill ${priorityClass(tool.priority)}">${tool.priority}</span>
              <span class="lang-badge lang-${langAccent(tool.language)}" style="margin-left:0.3rem">${tool.language}</span>
            </div>
          </div>
          ${cmds || '<p class="muted" style="font-size:0.82rem;margin:0">Clone from source — see repo for instructions.</p>'}
        </article>
      `;
    })
    .join('');
}

renderGhostDashboard();
renderToolsView();
renderInstallListing();
