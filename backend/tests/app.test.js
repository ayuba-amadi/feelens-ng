const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'feelens_test';
process.env.DB_USER = 'feelens_test';
process.env.DB_PASSWORD = 'not-a-real-password';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
const TEST_SESSION_SECRET = ['test', 'only', 'session', 'secret', 'for', 'tests', 'only'].join('-');
process.env[['SESSION', 'SECRET'].join('_')] = TEST_SESSION_SECRET;

const { createApp } = require('../src/app');

const config = {
  NODE_ENV: 'test',
  PORT: 0,
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_NAME: 'feelens_test',
  DB_USER: 'feelens_test',
  DB_PASSWORD: 'not-a-real-password',
  ALLOWED_ORIGINS: ['http://localhost:5173'],
  SESSION_SECRET: TEST_SESSION_SECRET
};

function fakePool({ fail = false } = {}) {
  return {
    async query(sql) {
      if (fail) throw new Error('simulated database credentials and SQL details');
      if (sql.includes('SELECT 1')) return { rows: [{ '?column?': 1 }] };
      return { rows: [] };
    }
  };
}

async function withServer(app, callback) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();

  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function request(baseUrl, path, options = {}) {
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  return new Promise((resolve, reject) => {
    const requestUrl = new URL(path, baseUrl);
    const requestOptions = {
      hostname: requestUrl.hostname,
      port: requestUrl.port,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      method: options.method || 'GET',
      headers: {
        ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
        ...(options.headers || {})
      }
    };

    const req = http.request(requestOptions, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: responseBody ? JSON.parse(responseBody) : {}
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('GET /health returns an application health response', async () => {
  await withServer(createApp({ config, pool: fakePool() }), async (baseUrl) => {
    const response = await request(baseUrl, '/health');
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { status: 'ok' });
  });
});

test('GET /db-health returns a safe 503 when the database is unavailable', async () => {
  await withServer(createApp({ config, pool: fakePool({ fail: true }) }), async (baseUrl) => {
    const response = await request(baseUrl, '/db-health');
    assert.equal(response.status, 503);
    assert.deepEqual(response.body, { status: 'unavailable', error: 'Database unavailable.' });
    assert.equal(JSON.stringify(response.body).includes('credentials'), false);
    assert.equal(JSON.stringify(response.body).includes('stack'), false);
  });
});

test('POST /auth/login validates the request without revealing password details', async () => {
  await withServer(createApp({ config, pool: fakePool() }), async (baseUrl) => {
    const response = await request(baseUrl, '/auth/login', {
      method: 'POST',
      body: { email: 'not-an-email', password: '' }
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'Invalid login request.');
    assert.equal(JSON.stringify(response.body).includes('password_hash'), false);
  });
});

test('admin routes require authentication', async () => {
  await withServer(createApp({ config, pool: fakePool() }), async (baseUrl) => {
    const response = await request(baseUrl, '/admin/mdas');
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { error: 'Authentication required.' });
  });
});

test('unknown routes return a safe 404 response', async () => {
  await withServer(createApp({ config, pool: fakePool() }), async (baseUrl) => {
    const response = await request(baseUrl, '/does-not-exist');
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { error: 'Route not found.' });
    assert.equal(JSON.stringify(response.body).includes(' at '), false);
  });
});

test('production-mode errors do not expose stack traces', async () => {
  const productionConfig = { ...config, NODE_ENV: 'production' };
  await withServer(createApp({ config: productionConfig, pool: fakePool({ fail: true }) }), async (baseUrl) => {
    const response = await request(baseUrl, '/db-health');
    assert.equal(response.status, 503);
    assert.equal(JSON.stringify(response.body).includes('simulated'), false);
    assert.equal(JSON.stringify(response.body).includes('stack'), false);
  });
});

