const test = require('node:test');
const assert = require('node:assert/strict');
const {
  channelSchema,
  feeSchema,
  passwordChangeSchema,
} = require('../src/validation/admin.schemas');
const { sanitizeAuditValue } = require('../src/utils/audit-sanitizer');
const { withTransaction } = require('../src/utils/database');

function baseFee(overrides = {}) {
  return {
    serviceId: 1,
    pricingModel: 'unknown',
    verificationStatus: 'pending',
    isCurrent: true,
    ...overrides,
  };
}

test('official channels require exactly one service or MDA owner', () => {
  const base = { channelType: 'portal', name: 'Official portal' };
  assert.equal(channelSchema.safeParse({ ...base, serviceId: '11' }).success, true);
  assert.equal(channelSchema.safeParse({ ...base, mdaId: '22' }).success, true);
  assert.equal(channelSchema.safeParse({ ...base, serviceId: '11', mdaId: '22' }).success, false);
  assert.equal(channelSchema.safeParse(base).success, false);
});

test('unknown fees reject numeric values and never coerce to zero', () => {
  const valid = feeSchema.parse(baseFee());
  assert.equal(valid.amount, undefined);
  assert.equal(valid.pricingModel, 'unknown');
  assert.equal(feeSchema.safeParse(baseFee({ amount: 0 })).success, false);
});

test('free fees reject numeric values', () => {
  assert.equal(feeSchema.safeParse(baseFee({ pricingModel: 'free' })).success, true);
  assert.equal(feeSchema.safeParse(baseFee({ pricingModel: 'free', amount: 10 })).success, false);
});

test('range fees require ordered minimum and maximum values', () => {
  assert.equal(feeSchema.safeParse(baseFee({ pricingModel: 'range', currency: 'NGN', minimumAmount: 10, maximumAmount: 20 })).success, true);
  assert.equal(feeSchema.safeParse(baseFee({ pricingModel: 'range', currency: 'NGN', minimumAmount: 20, maximumAmount: 10 })).success, false);
  assert.equal(feeSchema.safeParse(baseFee({ pricingModel: 'range', currency: 'N', minimumAmount: 10, maximumAmount: 20 })).success, false);
});

test('password changes require a strong, different password', () => {
  assert.equal(passwordChangeSchema.safeParse({ currentPassword: 'OldPassword123', newPassword: 'OldPassword123' }).success, false);
  assert.equal(passwordChangeSchema.safeParse({ currentPassword: 'OldPassword123', newPassword: 'short' }).success, false);
  assert.equal(passwordChangeSchema.safeParse({ currentPassword: 'OldPassword123', newPassword: 'DifferentPassword456' }).success, true);
});

test('audit sanitization removes credentials recursively', () => {
  const value = sanitizeAuditValue({
    email: 'admin@example.invalid',
    password: 'plain',
    password_hash: 'hash',
    nested: { sessionId: 'sid', secretValue: 'secret', safe: true },
  });
  assert.deepEqual(value, { email: 'admin@example.invalid', nested: { safe: true } });
});

test('transaction helper rolls back when a later operation fails', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql === 'FAIL') throw new Error('expected failure');
      return { rows: [] };
    },
    release() { calls.push('RELEASE'); },
  };
  const pool = { async connect() { return client; } };
  await assert.rejects(() => withTransaction(pool, async (connection) => {
    await connection.query('MUTATION');
    await connection.query('FAIL');
  }));
  assert.deepEqual(calls, ['BEGIN', 'MUTATION', 'FAIL', 'ROLLBACK', 'RELEASE']);
});
