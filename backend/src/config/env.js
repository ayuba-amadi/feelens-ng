const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DB_HOST: z.string().trim().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_NAME: z.string().trim().min(1),
  DB_SCHEMA: z.string()
    .trim()
    .regex(
      /^[A-Za-z_][A-Za-z0-9_]*$/,
      'DB_SCHEMA must be a valid PostgreSQL schema identifier.',
    )
    .default('public'),
  DB_USER: z.string().trim().min(1),
  DB_PASSWORD: z.string().min(1),
  ALLOWED_ORIGINS: z.string().trim().min(1),
  SESSION_SECRET: z.string().min(32),
  SENTRY_DSN: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().url().optional(),
  ),
  SENTRY_RELEASE: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().min(1).optional(),
  )
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missingOrInvalid = parsed.error.issues
      .map((issue) => issue.path.join('.') || 'environment')
      .join(', ');
    throw new Error(`Invalid environment configuration: ${missingOrInvalid}`);
  }

  return {
    ...parsed.data,
    ALLOWED_ORIGINS: parsed.data.ALLOWED_ORIGINS
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  };
}

module.exports = { loadEnv };

