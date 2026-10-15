const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const argon2 = require('argon2');
const { z } = require('zod');
const { loadEnv } = require('../src/config/env');
const { getPool, closePool } = require('../src/db/pool');

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  displayName: z.string().trim().min(1).max(120),
  password: z.string().min(12).max(256)
});

async function readHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Interactive password input is required when password environment input is not supplied.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (chunk) => {
      const character = chunk.toString('utf8');

      if (character === '\u0003') {
        cleanup();
        reject(new Error('Input cancelled.'));
        return;
      }

      if (character === '\r' || character === '\n') {
        cleanup();
        stdout.write('\n');
        resolve(value);
        return;
      }

      if (character === '\u007f') {
        value = value.slice(0, -1);
        return;
      }

      value += character;
    };

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
    };

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function collectInput() {
  const envValues = {
    email: process.env.ADMIN_EMAIL,
    displayName: process.env.ADMIN_DISPLAY_NAME,
    password: process.env.ADMIN_PASSWORD
  };

  if (envValues.password) {
    console.warn('Warning: ADMIN_PASSWORD was supplied through the environment. Prefer hidden interactive input; unset temporary values immediately after use.');
  }

  if (envValues.email && envValues.displayName && envValues.password) {
    return envValues;
  }

  const prompt = readline.createInterface({ input: stdin, output: stdout });
  const email = envValues.email || await prompt.question('Administrator email: ');
  const displayName = envValues.displayName || await prompt.question('Display name: ');
  prompt.close();

  return {
    email,
    displayName,
    password: envValues.password || await readHidden('Password (12+ characters): ')
  };
}

async function main() {
  let pool;
  try {
    const config = loadEnv();
    const values = inputSchema.parse(await collectInput());
    pool = getPool(config);

    const existing = await pool.query(
      'SELECT id FROM admin_users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [values.email]
    );

    if (existing.rowCount > 0) {
      throw new Error('An administrator with that email already exists.');
    }

    const passwordHash = await argon2.hash(values.password, { type: argon2.argon2id });
    const result = await pool.query(
      `INSERT INTO admin_users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, email`,
      [values.email, passwordHash, values.displayName]
    );

    console.log(`Administrator created: ${result.rows[0].email} (id ${result.rows[0].id}).`);
  } finally {
    await closePool();
  }
}

main().catch((error) => {
  console.error(error.message || 'Administrator bootstrap failed.');
  process.exitCode = 1;
});

