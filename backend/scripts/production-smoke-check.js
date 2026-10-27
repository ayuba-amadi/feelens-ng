// Run with the public origin as the first argument. Never reads credentials.
const base = process.argv[2];
if (!base) { console.error('Usage: node scripts/production-smoke-check.js https://example.org'); process.exit(1); }
let origin;
try { const url = new URL(base); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(); origin = url.origin; }
catch { console.error('Supply an HTTP(S) origin without credentials.'); process.exit(1); }
const paths = ['/api/health', '/api/db-health', '/api/public/stats', '/api/public/mdas?page=1&pageSize=5', '/api/public/sources?page=1&pageSize=5'];
(async () => {
  let failed = false;
  for (const path of paths) {
    try {
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(10000), redirect: 'manual' });
      console.log(`${path}: ${response.status}`);
      if (response.status !== 200) failed = true;
    } catch { console.error(`${path}: request failed or timed out`); failed = true; }
  }
  if (failed) process.exitCode = 1;
})();
