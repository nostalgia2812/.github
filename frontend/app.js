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
  tab.addEventListener('click', () => {
    setActiveTab(tab.dataset.tab);
    if (tab.dataset.tab === 'comms' && !commsLoaded) {
      commsLoaded = true;
      loadCommsData();
    }
  });
});

loadIocs();
renderApopoView();
generateLoop();
document.getElementById('refresh-loop').addEventListener('click', generateLoop);

// ===== Communications Panel =====

const COMMS_KPI_CONFIG = [
  { key: 'total_messages',      label: 'Total Messages',     fmt: (v) => v.toLocaleString(), cls: 'kpi-blue',   sub: 'all channels' },
  { key: 'messages_today',      label: 'Today',              fmt: (v) => v.toString(),        cls: 'kpi-cyan',   sub: 'messages' },
  { key: 'active_calls',        label: 'Active Calls',       fmt: (v) => v.toString(),        cls: 'kpi-warn',   sub: 'live now' },
  { key: 'avg_response_ms',     label: 'Avg Response',       fmt: (v) => `${v} ms`,           cls: 'kpi-violet', sub: 'latency' },
  { key: 'delivery_rate_pct',   label: 'Delivery Rate',      fmt: (v) => `${v}%`,             cls: 'kpi-up',     sub: 'SMS/MMS' },
  { key: 'sms_sent',            label: 'SMS Sent',           fmt: (v) => v.toLocaleString(),  cls: 'kpi-blue',   sub: 'cumulative' },
  { key: 'calls_completed',     label: 'Calls Completed',    fmt: (v) => v.toString(),        cls: 'kpi-up',     sub: 'all time' },
  { key: 'calls_missed',        label: 'Missed Calls',       fmt: (v) => v.toString(),        cls: 'kpi-danger', sub: 'requires follow-up' },
];

const WEEKLY_VOLUME = [
  { day: 'Mon', sms: 82, msg: 24 },
  { day: 'Tue', sms: 118, msg: 31 },
  { day: 'Wed', sms: 95, msg: 18 },
  { day: 'Thu', sms: 143, msg: 42 },
  { day: 'Fri', sms: 167, msg: 55 },
  { day: 'Sat', sms: 54, msg: 12 },
  { day: 'Sun', sms: 38, msg: 9 },
];

const CALL_LOG = [
  { number: '+1 555-0101', duration: '3m 12s', status: 'completed', time: '10:04' },
  { number: '+1 555-0202', duration: '—',      status: 'missed',    time: '09:58' },
  { number: '+1 555-0303', duration: '1m 47s', status: 'completed', time: '09:30' },
  { number: '+1 555-0404', duration: '—',      status: 'active',    time: 'now' },
];

const FB_CONTACTS = [
  { name: 'Alice Chen', initials: 'AC', preview: 'Sent! Check /api endpoint…', channel: 'messenger' },
  { name: 'Bob Kim',    initials: 'BK', preview: 'Threat scan completed.', channel: 'messenger' },
  { name: 'Ops Team',  initials: 'OT', preview: 'Risk score alert received.', channel: 'messenger' },
];

let commsStats = null;
let commsMessages = [];
let activeContact = 0;
let smsFilter = 'all';
let commsLiveMode = false;   // true when Twilio SMS vars are set
let commsVoiceMode = false;  // true when Twilio Voice vars are set
let twilioDevice = null;     // Twilio.Device instance
let activeCall = null;       // active Call object
let callStartTime = null;

async function initTwilioDevice() {
  if (!window.Twilio || !window.Twilio.Device) return;
  try {
    const res = await fetch(`${API_BASE}/api/comms/voice/token`);
    if (!res.ok) return;
    const { token } = await res.json();
    twilioDevice = new Twilio.Device(token, { logLevel: 1 });

    twilioDevice.on('registered', () => {
      console.info('[Twilio] Device registered — ready for calls');
    });

    twilioDevice.on('incoming', (call) => {
      activeCall = call;
      setCallStatus(`Incoming call from ${call.parameters.From || 'unknown'}`, 'calling');
      call.accept();
    });

    twilioDevice.on('error', (err) => {
      console.warn('[Twilio] Device error', err);
    });

    await twilioDevice.register();
  } catch (err) {
    console.warn('[Twilio] Device init failed:', err.message);
  }
}

async function loadCommsConfig() {
  try {
    const res = await fetch(`${API_BASE}/api/comms/config`);
    if (!res.ok) return;
    const cfg = await res.json();
    commsLiveMode = cfg.sms_ready;
    commsVoiceMode = cfg.voice_ready;

    const badge = document.getElementById('comms-mode-badge');
    if (badge) {
      badge.textContent = cfg.mode === 'live' ? 'Live Mode' : 'Demo Mode';
      badge.className = cfg.mode === 'live' ? 'pill comms-live-pill' : 'pill comms-mode-pill';
    }

    const banner = document.getElementById('comms-setup-banner');
    if (banner) {
      if (cfg.missing_vars && cfg.missing_vars.length > 0) {
        banner.classList.remove('hidden');
        const list = document.getElementById('missing-vars-list');
        if (list) {
          list.innerHTML = cfg.missing_vars.map((v) =>
            `<code class="missing-var">${v}</code>`
          ).join('');
        }
      } else {
        banner.classList.add('hidden');
      }
    }
  } catch {
    // backend unreachable – stay in demo mode
  }
}

async function loadCommsData() {
  await loadCommsConfig();
  if (commsVoiceMode) await initTwilioDevice();

  try {
    const [statsRes, msgsRes] = await Promise.all([
      fetch(`${API_BASE}/api/comms/stats`),
      fetch(`${API_BASE}/api/comms/messages`),
    ]);
    commsStats = await statsRes.json();
    commsMessages = await msgsRes.json();
  } catch {
    // demo fallback
    commsStats = {
      total_messages: 1284, messages_today: 47, active_calls: 2,
      avg_response_ms: 340, delivery_rate_pct: 99.2, sms_sent: 623,
      sms_received: 418, messenger_sent: 154, messenger_received: 89,
      calls_completed: 38, calls_missed: 3, avg_call_duration_s: 142,
      channel_breakdown: { sms: 60, messenger: 30, webrtc: 10 },
      timestamp: new Date().toISOString(),
    };
    commsMessages = [
      { id: 1, channel: 'sms', direction: 'inbound',  from: '+1 555-0101', text: 'Hey, is the deployment ready?', ts: '09:12' },
      { id: 2, channel: 'sms', direction: 'outbound', from: 'Me', text: 'Running final checks now, ~10 min.', ts: '09:13' },
      { id: 3, channel: 'sms', direction: 'inbound',  from: '+1 555-0101', text: 'Great, ping me when done.', ts: '09:14' },
      { id: 4, channel: 'messenger', direction: 'inbound',  from: 'Alice Chen', text: 'Can you share the API docs link?', ts: '09:30' },
      { id: 5, channel: 'messenger', direction: 'outbound', from: 'Me', text: 'Sent! Check /api endpoint for catalog.', ts: '09:31' },
      { id: 6, channel: 'messenger', direction: 'inbound',  from: 'Bob Kim', text: 'Threat scan completed successfully.', ts: '09:45' },
      { id: 7, channel: 'sms', direction: 'inbound',  from: '+1 555-0202', text: 'Risk score alert: CRITICAL threshold hit.', ts: '10:02' },
      { id: 8, channel: 'messenger', direction: 'outbound', from: 'Me', text: 'Acknowledged, reviewing now.', ts: '10:03' },
    ];
  }
  renderCommsPanel();
}

function renderCommsPanel() {
  renderKPIs();
  renderSmsThread();
  renderFbContacts();
  renderFbThread();
  renderAnalytics();
  renderChannelDist();
  renderCallLog();
}

function renderKPIs() {
  const grid = document.getElementById('comms-kpi-grid');
  const ts = document.getElementById('comms-ts');
  if (commsStats && ts) {
    const d = new Date(commsStats.timestamp);
    ts.textContent = `Updated ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (!grid || !commsStats) return;
  grid.innerHTML = COMMS_KPI_CONFIG.map(({ key, label, fmt, cls, sub }) => {
    const val = commsStats[key] ?? '—';
    return `
      <div class="kpi-card">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value ${cls}">${fmt(val)}</div>
        <div class="kpi-sub">${sub}</div>
      </div>
    `;
  }).join('');
}

function renderSmsThread() {
  const thread = document.getElementById('sms-thread');
  if (!thread) return;
  const msgs = commsMessages.filter((m) => {
    if (m.channel !== 'sms') return false;
    if (smsFilter === 'all') return true;
    return m.direction === smsFilter;
  });
  thread.innerHTML = msgs.map((m) => `
    <div class="chat-bubble ${m.direction === 'outbound' ? 'out' : 'in'}">
      <div class="bubble-body">${escHtml(m.text)}</div>
      <div class="bubble-meta">${m.direction === 'inbound' ? escHtml(m.from) + ' · ' : ''}${m.ts}</div>
    </div>
  `).join('');
  thread.scrollTop = thread.scrollHeight;
}

function renderFbContacts() {
  const list = document.getElementById('fb-contacts');
  if (!list) return;
  list.innerHTML = FB_CONTACTS.map((c, i) => `
    <div class="contact-item ${i === activeContact ? 'active' : ''}" data-idx="${i}">
      <div class="contact-avatar">${c.initials}</div>
      <div class="contact-meta">
        <span class="contact-name">${c.name}</span>
        <span class="contact-preview">${c.preview}</span>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.contact-item').forEach((el) => {
    el.addEventListener('click', () => {
      activeContact = Number(el.dataset.idx);
      renderFbContacts();
      renderFbThread();
    });
  });
}

function renderFbThread() {
  const thread = document.getElementById('fb-thread');
  if (!thread) return;
  const contact = FB_CONTACTS[activeContact];
  const msgs = commsMessages.filter((m) => m.channel === 'messenger' && (m.from === contact.name || m.direction === 'outbound'));
  if (!msgs.length) {
    thread.innerHTML = '<p class="muted" style="font-size:0.82rem;padding:0.5rem 0">No messages with this contact yet.</p>';
    return;
  }
  thread.innerHTML = msgs.map((m) => `
    <div class="chat-bubble ${m.direction === 'outbound' ? 'out' : 'in'}">
      <div class="bubble-body">${escHtml(m.text)}</div>
      <div class="bubble-meta">${m.direction === 'inbound' ? escHtml(m.from) + ' · ' : ''}${m.ts}</div>
    </div>
  `).join('');
  thread.scrollTop = thread.scrollHeight;
}

function renderAnalytics() {
  const container = document.getElementById('comms-analytics');
  if (!container) return;
  const maxSms = Math.max(...WEEKLY_VOLUME.map((d) => d.sms));
  const maxMsg = Math.max(...WEEKLY_VOLUME.map((d) => d.msg));
  container.innerHTML = WEEKLY_VOLUME.map(({ day, sms, msg }) => `
    <div class="analytics-row">
      <div class="analytics-label-row">
        <span>${day}</span>
        <span style="color:#60a5fa">SMS ${sms}</span>
        <span style="color:var(--violet)">MSG ${msg}</span>
      </div>
      <div class="analytics-bar-track">
        <div class="analytics-bar-fill" style="width:${(sms / maxSms) * 100}%;background:#2563eb;height:5px;border-radius:999px"></div>
      </div>
      <div class="analytics-bar-track" style="height:5px;margin-top:2px">
        <div class="analytics-bar-fill" style="width:${(msg / maxMsg) * 100}%;background:var(--violet);height:5px;border-radius:999px"></div>
      </div>
    </div>
  `).join('');
}

function renderChannelDist() {
  const container = document.getElementById('channel-dist');
  if (!container || !commsStats) return;
  const colors = { sms: '#2563eb', messenger: '#1877f2', webrtc: 'var(--cyan)' };
  const bd = commsStats.channel_breakdown;
  container.innerHTML = Object.entries(bd).map(([ch, pct]) => `
    <div class="dist-row">
      <span class="dist-label">${ch.toUpperCase()}</span>
      <div class="dist-track">
        <div class="dist-fill" style="width:${pct}%;background:${colors[ch] || '#94a3b8'}"></div>
      </div>
      <span class="dist-pct">${pct}%</span>
    </div>
  `).join('');
}

function renderCallLog() {
  const container = document.getElementById('call-log');
  if (!container) return;
  container.innerHTML = `<p class="muted" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.3rem">Recent Calls</p>` +
    CALL_LOG.map((c) => `
      <div class="call-log-item">
        <span>
          <span class="call-status-dot dot-${c.status}"></span>
          ${escHtml(c.number)}
        </span>
        <span style="color:var(--muted)">${c.duration}</span>
        <span style="color:var(--muted)">${c.time}</span>
      </div>
    `).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// SMS compose — real send when live, demo fallback otherwise
document.getElementById('sms-compose').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('sms-input');
  const toInput = document.getElementById('sms-to');
  const statusEl = document.getElementById('sms-send-status');
  const text = input.value.trim();
  if (!text) return;

  const to = toInput ? toInput.value.trim() : '';

  if (commsLiveMode && to) {
    // Real SMS via Twilio
    statusEl.textContent = 'Sending…';
    statusEl.className = 'send-status sending';
    try {
      const res = await fetch(`${API_BASE}/api/comms/sms/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, body: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Send failed');
      statusEl.textContent = `Sent · SID ${data.sid}`;
      statusEl.className = 'send-status ok';
      commsMessages.push({ id: Date.now(), channel: 'sms', direction: 'outbound', from: 'Me', text, ts: data.ts || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.className = 'send-status err';
    }
  } else {
    // Demo mode
    if (commsLiveMode && !to) {
      statusEl.textContent = 'Enter a "To:" number to send a real SMS.';
      statusEl.className = 'send-status err';
    }
    commsMessages.push({ id: Date.now(), channel: 'sms', direction: 'outbound', from: 'Me', text, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    statusEl.textContent = 'Demo mode — message added locally.';
    statusEl.className = 'send-status muted-status';
  }

  input.value = '';
  renderSmsThread();
  setTimeout(() => { statusEl.className += ' hidden'; }, 4000);
  if (commsStats) { commsStats.total_messages++; commsStats.messages_today++; commsStats.sms_sent++; renderKPIs(); }
});

// FB compose
document.getElementById('fb-compose').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('fb-input');
  const text = input.value.trim();
  if (!text) return;
  commsMessages.push({ id: Date.now(), channel: 'messenger', direction: 'outbound', from: 'Me', text, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  input.value = '';
  renderFbThread();
  if (commsStats) { commsStats.total_messages++; commsStats.messages_today++; commsStats.messenger_sent++; renderKPIs(); }
});

// SMS filter buttons
document.querySelectorAll('.comms-filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.comms-filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    smsFilter = btn.dataset.filter;
    renderSmsThread();
  });
});

// Dialpad toggle
const dialpad = document.getElementById('dialpad');
const toggleBtn = document.getElementById('toggle-dialpad');
toggleBtn.addEventListener('click', () => {
  const hidden = dialpad.classList.toggle('hidden');
  toggleBtn.textContent = hidden ? 'Show Dialpad' : 'Hide Dialpad';
});

// Dialpad keys
document.querySelectorAll('.dp-key').forEach((key) => {
  key.addEventListener('click', () => {
    const display = document.getElementById('dp-number');
    display.value += key.dataset.digit;
  });
});

document.getElementById('dp-clear').addEventListener('click', () => {
  const display = document.getElementById('dp-number');
  display.value = display.value.slice(0, -1);
});

document.getElementById('dp-call').addEventListener('click', async () => {
  const number = document.getElementById('dp-number').value.trim();
  const statusBar = document.getElementById('call-status-bar');
  if (!number) return;

  if (twilioDevice && commsVoiceMode) {
    // Real call via Twilio.Device
    try {
      setCallStatus('Connecting…', 'calling');
      activeCall = await twilioDevice.connect({ params: { To: number } });

      activeCall.on('accept', () => {
        callStartTime = Date.now();
        setCallStatus(`Connected · ${number}`, 'connected');
        CALL_LOG.unshift({ number, duration: '…', status: 'active', time: 'now' });
        renderCallLog();
      });

      activeCall.on('disconnect', () => {
        const secs = callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : 0;
        const dur = secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
        setCallStatus(`Call ended · ${dur}`, 'ended');
        const item = CALL_LOG.find((c) => c.number === number && c.status === 'active');
        if (item) { item.status = 'completed'; item.duration = dur; }
        if (commsStats) { commsStats.calls_completed++; renderKPIs(); }
        renderCallLog();
        activeCall = null;
        callStartTime = null;
        setTimeout(() => { statusBar.className = 'call-status-bar hidden'; }, 3000);
      });

      activeCall.on('error', (err) => {
        setCallStatus(`Call error: ${err.message}`, 'error');
        activeCall = null;
      });

      document.getElementById('dp-call').textContent = 'Hang Up';
      document.getElementById('dp-call').onclick = () => { if (activeCall) activeCall.disconnect(); };
    } catch (err) {
      setCallStatus(`Failed: ${err.message}`, 'error');
    }
  } else {
    // Demo simulation
    CALL_LOG.unshift({ number, duration: '—', status: 'active', time: 'now' });
    setCallStatus(`[Demo] Simulating call to ${number}`, 'calling');
    renderCallLog();
    setTimeout(() => {
      const item = CALL_LOG.find((c) => c.number === number && c.status === 'active');
      if (item) { item.status = 'completed'; item.duration = '0m 42s'; renderCallLog(); }
      if (commsStats) { commsStats.calls_completed++; renderKPIs(); }
      setCallStatus('Demo call ended · 0m 42s', 'ended');
      setTimeout(() => { statusBar.className = 'call-status-bar hidden'; }, 3000);
    }, 4000);
  }
});

function setCallStatus(msg, state) {
  const bar = document.getElementById('call-status-bar');
  bar.textContent = msg;
  bar.className = `call-status-bar call-state-${state}`;
}

// commsLoaded flag used by tab click handlers above
let commsLoaded = false;
