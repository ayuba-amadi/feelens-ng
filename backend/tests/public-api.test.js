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
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: options.method || 'GET',
    }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null }));
    });
    req.on('error', reject);
    req.end();
  });
}

function poolFor(handler) {
  const calls = [];
  return {
    calls,
    async query(sql, values = []) {
      calls.push({ sql, values });
      return handler(sql, values);
    },
  };
}

test('public routes do not require authentication and search is parameterized', async () => {
  const pool = poolFor((sql, values) => {
    assert.equal(sql.includes("x' OR 1=1 --"), false);
    assert.equal(values[0], "%x' OR 1=1 --%");
    return { rows: [{ type: 'mda', slug: 'test-mda', name: 'Test MDA' }] };
  });
  await withServer(createApp({ config, pool }), async (baseUrl) => {
    const response = await request(baseUrl, "/public/search?q=x%27%20OR%201%3D1%20--");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.results, [{ type: 'mda', slug: 'test-mda', name: 'Test MDA' }]);
  });
});

test('stats returns database-derived public counts', async () => {
  const pool = poolFor((sql) => {
    assert.match(sql, /mdasCovered/);
    assert.match(sql, /is_active = TRUE/);
    return { rows: [{ mdasCovered: 2, servicesMapped: 5, verifiedFeeItems: 3, sources: 4 }] };
  });
  await withServer(createApp({ config, pool }), async (baseUrl) => {
    const response = await request(baseUrl, '/public/stats');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { mdasCovered: 2, servicesMapped: 5, verifiedFeeItems: 3, sources: 4 });
  });
});

test('MDA listing is paginated, active-only, and exposes public fields', async () => {
  const pool = poolFor((sql, values) => {
    assert.match(sql, /m\.is_active = TRUE/);
    assert.match(sql, /LIMIT \$1 OFFSET \$2/);
    assert.deepEqual(values, [25, 0]);
    return { rows: [{
      id: 1, slug: 'active-mda', name: 'Active MDA', acronym: 'AMDA',
      coverageStatus: 'verified', serviceCount: 2, total_count: '1',
    }] };
  });
  await withServer(createApp({ config, pool }), async (baseUrl) => {
    const response = await request(baseUrl, '/public/mdas?page=1&pageSize=25');
    assert.equal(response.status, 200);
    assert.equal(response.body.items[0].slug, 'active-mda');
    assert.equal(response.body.pagination.total, 1);
    assert.equal(response.body.items[0].total_count, undefined);
    assert.equal(JSON.stringify(response.body).includes('password_hash'), false);
  });
});

test('inactive MDA detail is not publicly visible', async () => {
  const pool = poolFor((sql) => {
    assert.match(sql, /m\.is_active = TRUE/);
    return { rows: [] };
  });
  await withServer(createApp({ config, pool }), async (baseUrl) => {
    const response = await request(baseUrl, '/public/mdas/inactive-mda');
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'MDA not found' });
  });
});

test('MDA filters reject unsafe sorting and invalid page sizes', async () => {
  const pool = poolFor(() => { throw new Error('database should not be called'); });
  await withServer(createApp({ config, pool }), async (baseUrl) => {
    const invalidPage = await request(baseUrl, '/public/mdas?pageSize=101');
    assert.equal(invalidPage.status, 400);
    const unsafeSort = await request(baseUrl, '/public/mdas?sort=DROP%20TABLE%20mdas');
    assert.equal(unsafeSort.status, 400);
  });
});

test('MDA services exclude inactive services and return current fee summaries', async () => {
  const pool = poolFor((sql) => {
    assert.match(sql, /s\.is_active = TRUE/);
    assert.match(sql, /m\.is_active = TRUE/);
    assert.match(sql, /f\.is_current = TRUE/);
    return { rows: [{
      id: 11, slug: 'active-service', name: 'Active Service',
      feeOptions: [{ pricingModel: 'unknown', amount: null }],
      verificationStatus: 'pending', total_count: '1',
    }] };
  });
  await withServer(createApp({ config, pool }), async (baseUrl) => {
    const response = await request(baseUrl, '/public/mdas/active-mda/services');
    assert.equal(response.status, 200);
    assert.equal(response.body.items[0].slug, 'active-service');
    assert.equal(response.body.items[0].feeOptions[0].amount, null);
  });
});

test('service detail exposes only current fee options, preserves unknown/conflicting status, and includes public evidence and channels', async () => {
  const pool = poolFor((sql, values) => {
    if (sql.includes('s.requirements')) {
      assert.match(sql, /s\.is_active = TRUE/);
      assert.match(sql, /m\.is_active = TRUE/);
      return { rows: [{
        id: 11, slug: 'active-service', name: 'Active Service', description: 'Public description',
        category: 'Licensing', jurisdiction: 'Lagos', requirements: ['ID'], processSteps: ['Apply'],
        feeOptions: [], verificationStatus: 'conflicting', lastChecked: '2026-10-01T00:00:00.000Z',
        mdaSlug: 'active-mda', mdaAcronym: 'AMDA', mdaName: 'Active MDA',
        mdaJurisdiction: 'Lagos', mdaOfficialWebsite: 'https://mda.example.invalid',
        officialUrl: 'https://service.example.invalid', hasEvidence: true,
        hasOfficialChannels: true, hasOfficialChannelUrl: true, officialChannelCount: 1, sourceCount: 1,
      }] };
    }
    if (sql.includes('fs.fee_option_id = f.id')) {
      assert.match(sql, /f\.is_current = TRUE/);
      assert.match(sql, /f\.verification_status <> 'superseded'/);
      return { rows: [
        { id: 21, pricingModel: 'unknown', amount: null, verificationStatus: 'conflicting', sources: [{ id: 31, title: 'Approved schedule', sourceType: 'approved_fee_schedule', publisher: 'MDA', url: 'https://source.example.invalid' }] },
        { id: 22, pricingModel: 'fixed', amount: '100.00', verificationStatus: 'verified', sources: [] },
      ] };
    }
    if (sql.includes('FROM official_channels')) {
      return { rows: [{ id: 41, channelType: 'portal', name: 'Official portal', url: 'https://portal.example.invalid', instructions: 'Use the official portal.' }] };
    }
    if (sql.includes('COUNT(*) FILTER')) {
      return { rows: [{ verified: 1, pending: 0, conflicting: 1, unableToVerify: 0 }] };
    }
    throw new Error(`Unexpected SQL: ${sql} ${JSON.stringify(values)}`);
  });

  await withServer(createApp({ config, pool }), async (baseUrl) => {
    const response = await request(baseUrl, '/public/services/active-service');
    assert.equal(response.status, 200);
    const service = response.body.service;
    assert.equal(service.verificationStatus, 'conflicting');
    assert.equal(service.feeOptions.length, 2);
    assert.equal(service.feeOptions[0].amount, null);
    assert.equal(service.feeOptions[0].verificationStatus, 'conflicting');
    assert.equal(service.sources[0].title, 'Approved schedule');
    assert.equal(service.officialChannels[0].channelType, 'portal');
    assert.equal(JSON.stringify(response.body).includes('notes'), false);
    assert.equal(JSON.stringify(response.body).includes('actor_admin_user_id'), false);
    assert.equal(JSON.stringify(response.body).includes('old_values'), false);
    assert.equal(JSON.stringify(response.body).includes('new_values'), false);
    assert.equal(JSON.stringify(response.body).includes('password_hash'), false);
  });
});

test('inactive service detail safely returns 404', async () => {
  const pool = poolFor((sql) => {
    assert.match(sql, /s\.is_active = TRUE/);
    return { rows: [] };
  });
  await withServer(createApp({ config, pool }), async (baseUrl) => {
    const response = await request(baseUrl, '/public/services/inactive-service');
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Service not found' });
  });
});

test('public source register is evidence-linked, paginated, and excludes internal notes', async () => {
  const pool = poolFor((sql, values) => {
    assert.match(sql, /JOIN fee_sources fs/);
    assert.match(sql, /f\.is_current = TRUE/);
    assert.match(sql, /f\.verification_status <> 'superseded'/);
    assert.deepEqual(values, ['official_website', 25, 0]);
    return { rows: [{
      id: 31, title: 'Official page', sourceType: 'official_website', publisher: 'MDA',
      url: 'https://mda.example.invalid', documentReference: null,
      publicationDate: null, effectiveDate: null, accessedAt: '2026-10-01T00:00:00.000Z',
      retrievedDate: '2026-10-01T00:00:00.000Z', total_count: '1',
    }] };
  });
  await withServer(createApp({ config, pool }), async (baseUrl) => {
    const response = await request(baseUrl, '/public/sources?sourceType=official_website');
    assert.equal(response.status, 200);
    assert.equal(response.body.items[0].title, 'Official page');
    assert.equal(response.body.items[0].notes, undefined);
    assert.equal(JSON.stringify(response.body).includes('internal'), false);
  });
});

test('search validates a sensible minimum query length', async () => {
  const pool = poolFor(() => { throw new Error('database should not be called'); });
  await withServer(createApp({ config, pool }), async (baseUrl) => {
    const response = await request(baseUrl, '/public/search?q=a');
    assert.equal(response.status, 400);
  });
});

test('public endpoints do not expose mutation routes', async () => {
  const pool = poolFor(() => ({ rows: [] }));
  await withServer(createApp({ config, pool }), async (baseUrl) => {
    const response = await request(baseUrl, '/public/mdas', { method: 'POST' });
    assert.equal(response.status, 404);
  });
});
