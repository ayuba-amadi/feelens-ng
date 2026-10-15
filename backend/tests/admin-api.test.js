const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { createApp } = require('../src/app');

const config = {
  NODE_ENV: 'test', PORT: 0, DB_HOST: 'localhost', DB_PORT: 5432,
  DB_NAME: 'isolated_test', DB_USER: 'isolated_test', DB_PASSWORD: 'not-real',
  ALLOWED_ORIGINS: ['http://localhost:5173'],
  SESSION_SECRET: 'isolated-test-session-secret-with-sufficient-length',
};

const authenticated = (req, res, next) => {
  req.admin = { id: 7, email: 'admin@example.invalid', display_name: 'Test Admin', role: 'admin', is_active: true };
  req.session.adminUserId = 7;
  req.session.csrfToken = 'test-csrf-token';
  next();
};
const skipCsrf = (req, res, next) => next();

async function withServer(app, callback) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    return await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function request(baseUrl, path, options = {}) {
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request({
      hostname: url.hostname, port: url.port, path: `${url.pathname}${url.search}`,
      method: options.method || 'GET',
      headers: { ...(body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {}), ...(options.headers || {}) },
    }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function transactionalPool(handler) {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rows: [] };
      return handler(sql, values, calls);
    },
    release() {},
  };
  return { calls, connect: async () => client, query: client.query.bind(client) };
}

test('authenticated administration root succeeds with injected test session context', async () => {
  const pool = { query: async () => ({ rows: [] }) };
  const app = createApp({ config, pool, adminMiddleware: authenticated, csrfMiddleware: skipCsrf });
  await withServer(app, async (baseUrl) => {
    const response = await request(baseUrl, '/admin');
    assert.equal(response.status, 200);
    assert.equal(response.body.user.displayName, 'Test Admin');
  });
});

test('state-changing admin routes reject a missing CSRF token', async () => {
  const pool = { query: async () => ({ rows: [] }) };
  const app = createApp({ config, pool, adminMiddleware: authenticated });
  await withServer(app, async (baseUrl) => {
    const response = await request(baseUrl, '/admin/mdas', { method: 'POST', body: { name: 'Sample MDA', slug: 'sample-mda' } });
    assert.equal(response.status, 403);
  });
});

test('MDA creation uses a transaction and writes an audit record', async () => {
  const pool = transactionalPool(async (sql) => {
    if (sql.includes('INSERT INTO mdas')) return { rows: [{ id: 11, name: 'Sample MDA', slug: 'sample-mda', coverageStatus: 'pending', isActive: true }] };
    if (sql.includes('INSERT INTO audit_logs')) return { rows: [] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const app = createApp({ config, pool, adminMiddleware: authenticated, csrfMiddleware: skipCsrf });
  await withServer(app, async (baseUrl) => {
    const response = await request(baseUrl, '/admin/mdas', { method: 'POST', body: { name: 'Sample MDA', slug: 'sample-mda' } });
    assert.equal(response.status, 201);
    assert.equal(response.body.id, 11);
  });
  assert.ok(pool.calls.some((call) => call.sql.includes('INSERT INTO audit_logs')));
  assert.ok(pool.calls.some((call) => call.sql === 'COMMIT'));
});

test('MDA update detects and persists a matching version timestamp', async () => {
  const timestamp = '2026-10-15T10:00:00.000Z';
  const pool = transactionalPool(async (sql) => {
    if (sql.includes('FROM mdas WHERE id = $1 FOR UPDATE')) return { rows: [{ id: 11, name: 'Sample MDA', slug: 'sample-mda', updatedAt: timestamp }] };
    if (sql.includes('UPDATE mdas SET')) return { rows: [{ id: 11, name: 'Updated Sample MDA', slug: 'sample-mda', updatedAt: timestamp }] };
    if (sql.includes('INSERT INTO audit_logs')) return { rows: [] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const app = createApp({ config, pool, adminMiddleware: authenticated, csrfMiddleware: skipCsrf });
  await withServer(app, async (baseUrl) => {
    const response = await request(baseUrl, '/admin/mdas/11', { method: 'PATCH', body: { name: 'Updated Sample MDA', slug: 'sample-mda', updatedAt: timestamp } });
    assert.equal(response.status, 200);
    assert.equal(response.body.name, 'Updated Sample MDA');
  });
});

test('service creation stores structured arrays without raw SQL interpolation', async () => {
  const pool = transactionalPool(async (sql, values) => {
    if (sql.includes('INSERT INTO services')) {
      assert.equal(values[6], JSON.stringify(['Requirement one']));
      assert.equal(values[7], JSON.stringify(['Step one']));
      return { rows: [{ id: 22 }] };
    }
    if (sql.includes('FROM services s JOIN mdas')) return { rows: [{ id: 22, name: 'Sample Service', requirements: ['Requirement one'], processSteps: ['Step one'] }] };
    if (sql.includes('INSERT INTO audit_logs')) return { rows: [] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const app = createApp({ config, pool, adminMiddleware: authenticated, csrfMiddleware: skipCsrf });
  await withServer(app, async (baseUrl) => {
    const response = await request(baseUrl, '/admin/services', { method: 'POST', body: { mdaId: 11, name: 'Sample Service', slug: 'sample-service', requirements: ['Requirement one'], processSteps: ['Step one'] } });
    assert.equal(response.status, 201);
    assert.deepEqual(response.body.processSteps, ['Step one']);
  });
});

test('service update preserves structured fields and writes an audit record', async () => {
  const timestamp = '2026-10-15T11:00:00.000Z';
  const pool = transactionalPool(async (sql, values) => {
    if (sql.includes('FOR UPDATE OF s')) return { rows: [{ id: 22, mdaId: 11, name: 'Sample Service', slug: 'sample-service', updatedAt: timestamp }] };
    if (sql.includes('UPDATE services SET')) {
      assert.equal(values[6], JSON.stringify(['Updated requirement']));
      return { rows: [] };
    }
    if (sql.includes('FROM services s JOIN mdas')) return { rows: [{ id: 22, name: 'Updated Service', requirements: ['Updated requirement'], processSteps: ['Updated step'] }] };
    if (sql.includes('INSERT INTO audit_logs')) return { rows: [] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const app = createApp({ config, pool, adminMiddleware: authenticated, csrfMiddleware: skipCsrf });
  await withServer(app, async (baseUrl) => {
    const response = await request(baseUrl, '/admin/services/22', { method: 'PATCH', body: {
      mdaId: 11, name: 'Updated Service', slug: 'sample-service', requirements: ['Updated requirement'],
      processSteps: ['Updated step'], updatedAt: timestamp,
    } });
    assert.equal(response.status, 200);
    assert.equal(response.body.name, 'Updated Service');
  });
  assert.ok(pool.calls.some((call) => call.sql.includes('INSERT INTO audit_logs')));
});

test('fee/source linking creates only the relationship and its audit record', async () => {
  const pool = transactionalPool(async (sql) => {
    if (sql.includes('SELECT id FROM fee_options')) return { rows: [{ id: 33 }] };
    if (sql.includes('INSERT INTO fee_sources')) return { rows: [{ feeOptionId: 33, sourceId: 44, isPrimary: false }] };
    if (sql.includes('INSERT INTO audit_logs')) return { rows: [] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const app = createApp({ config, pool, adminMiddleware: authenticated, csrfMiddleware: skipCsrf });
  await withServer(app, async (baseUrl) => {
    const response = await request(baseUrl, '/admin/fees/33/sources', { method: 'POST', body: { sourceId: 44 } });
    assert.equal(response.status, 201);
    assert.equal(response.body.sourceId, 44);
  });
});

test('verification workflow derives reviewer identity from the authenticated session', async () => {
  const pool = transactionalPool(async (sql, values) => {
    if (sql.includes('SELECT * FROM fee_options') && sql.includes('FOR UPDATE')) return { rows: [{ id: 33, service_id: 22, verification_status: 'pending' }] };
    if (sql.includes('UPDATE fee_options')) return { rows: [] };
    if (sql === 'SELECT * FROM fee_options WHERE id=$1') return { rows: [{ id: 33, service_id: 22, verification_status: 'verified' }] };
    if (sql.includes('INSERT INTO verification_events')) {
      assert.equal(values[5], 'Test Admin');
      assert.equal(values[7], 7);
      return { rows: [{ id: 55, status: 'verified', actorAdminUserId: 7 }] };
    }
    if (sql.includes('INSERT INTO audit_logs')) return { rows: [] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const app = createApp({ config, pool, adminMiddleware: authenticated, csrfMiddleware: skipCsrf });
  await withServer(app, async (baseUrl) => {
    const response = await request(baseUrl, '/admin/verifications', { method: 'POST', body: { serviceId: 22, feeOptionId: 33, status: 'verified', evidenceSummary: 'Generic authoritative evidence reviewed.', verificationMethod: 'Document review' } });
    assert.equal(response.status, 201);
    assert.equal(response.body.actorAdminUserId, 7);
  });
});

test('fee supersession preserves the old fee and creates linked history atomically', async () => {
  const pool = transactionalPool(async (sql) => {
    if (sql.includes('SELECT * FROM fee_options') && sql.includes('FOR UPDATE')) return { rows: [{ id: 33, service_id: 22, pricing_model: 'fixed', amount: '100.00', is_current: true }] };
    if (sql.includes('INSERT INTO fee_options')) return { rows: [{ id: 34, service_id: 22, pricing_model: 'fixed', amount: '120.00', is_current: true, verification_status: 'verified' }] };
    if (sql.includes("UPDATE fee_options SET is_current=FALSE")) return { rows: [] };
    if (sql.includes('INSERT INTO fee_sources')) return { rows: [] };
    if (sql.includes('INSERT INTO verification_events')) return { rows: [] };
    if (sql.includes('INSERT INTO audit_logs')) return { rows: [] };
    throw new Error(`Unexpected SQL: ${sql}`);
  });
  const app = createApp({ config, pool, adminMiddleware: authenticated, csrfMiddleware: skipCsrf });
  await withServer(app, async (baseUrl) => {
    const response = await request(baseUrl, '/admin/fees/33/supersede', { method: 'POST', body: {
      newFee: { serviceId: 22, pricingModel: 'fixed', currency: 'NGN', amount: 120, verificationStatus: 'verified', isCurrent: true },
      sourceIds: [44], reason: 'A newer approved schedule replaces the previous record.',
      evidenceSummary: 'Generic replacement evidence was reviewed.', verificationMethod: 'Approved schedule review',
    } });
    assert.equal(response.status, 201);
    assert.equal(response.body.id, 34);
  });
  assert.ok(pool.calls.some((call) => call.sql.includes("verification_status='superseded'")));
  assert.equal(pool.calls.filter((call) => call.sql.includes('INSERT INTO audit_logs')).length, 2);
  assert.ok(pool.calls.some((call) => call.sql === 'COMMIT'));
});

test('administrator list response never exposes password hashes', async () => {
  const pool = { query: async (sql) => {
    if (sql.includes('FROM admin_users')) return { rows: [{ id: 7, email: 'admin@example.invalid', displayName: 'Test Admin', role: 'admin', isActive: true, total_count: 1 }] };
    return { rows: [] };
  } };
  const app = createApp({ config, pool, adminMiddleware: authenticated, csrfMiddleware: skipCsrf });
  await withServer(app, async (baseUrl) => {
    const response = await request(baseUrl, '/admin/users');
    assert.equal(response.status, 200);
    assert.equal(JSON.stringify(response.body).includes('password_hash'), false);
  });
});

test('there is no public administrator registration endpoint', async () => {
  const pool = { query: async () => ({ rows: [] }) };
  const app = createApp({ config, pool });
  await withServer(app, async (baseUrl) => {
    const response = await request(baseUrl, '/auth/register', { method: 'POST', body: {} });
    assert.equal(response.status, 404);
  });
});
