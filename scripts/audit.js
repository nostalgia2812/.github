#!/usr/bin/env node

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/audit.js <url>');
  process.exit(1);
}

const started = Date.now();
const httpsRecommended = target.startsWith('http://');

fetch(target, { method: 'GET', headers: { 'user-agent': 'ai-skill-defense-auditor/1.0' } })
  .then(async (response) => {
    const latencyMs = Date.now() - started;
    const output = {
      url: target,
      ok: response.ok,
      statusCode: response.status,
      latencyMs,
      message: response.ok ? 'Endpoint responded successfully.' : `Endpoint returned HTTP ${response.status}.`,
      httpsRecommended,
    };
    console.log(JSON.stringify(output, null, 2));
  })
  .catch((error) => {
    const latencyMs = Date.now() - started;
    console.log(JSON.stringify({
      url: target,
      ok: false,
      statusCode: null,
      latencyMs,
      message: `Request failed: ${error.message}`,
      httpsRecommended,
    }, null, 2));
    process.exitCode = 2;
  });
