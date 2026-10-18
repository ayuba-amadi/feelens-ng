const fs = require('node:fs');
const path = require('node:path');
const { z } = require('zod');
const { getPool, closePool } = require('../src/db/pool');
const { recordAuditLog } = require('../src/services/audit-log.service');
const { withTransaction } = require('../src/utils/database');
const { pricingModels, sourceTypes, verificationStatuses } = require('../src/validation/admin.schemas');

const REPOSITORY_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_MANIFEST_PATH = path.join(REPOSITORY_ROOT, 'research/production-import/batch-01-mdas.json');
const BATCH_ALIASES = new Map([['batch-01', 'batch-01'], ['batch-01-mdas', 'batch-01']]);
const BATCH_01_SLUGS = ['fct-irs', 'nimc', 'nigeria-immigration-service', 'frsc-drivers-licence', 'cac'];

const dateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableDate = dateValue.nullable();
const nullableUrl = z.string().url().nullable();

const evidenceSchema = z.object({
  key: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(500),
  sourceType: z.enum(sourceTypes),
  url: z.string().url().max(2048),
  publicationDate: nullableDate,
  effectiveDate: nullableDate,
  lastChecked: dateValue,
  evidenceTier: z.number().int().min(1).max(3),
  publisher: z.string().trim().min(1).max(300),
  notes: z.string().trim().min(1).max(5000),
}).strict();

const channelSchema = z.object({
  channelType: z.enum(['website', 'portal', 'office', 'email', 'phone', 'other']),
  name: z.string().trim().min(1).max(300),
  url: nullableUrl,
  contactValue: z.string().trim().max(500).nullable().default(null),
  instructions: z.string().trim().max(5000).nullable().default(null),
}).strict();

const serviceSchema = z.object({
  name: z.string().trim().min(1).max(300),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  pricingModel: z.enum(pricingModels),
  amount: z.number().finite().nonnegative().nullable(),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  formula: z.string().trim().max(5000).nullable(),
  verificationStatus: z.enum(verificationStatuses),
  lastChecked: dateValue,
  evidence: z.array(evidenceSchema).min(1),
  officialActionUrl: nullableUrl,
  officialChannelType: z.enum(['website', 'portal', 'office', 'email', 'phone', 'other']),
  paymentGuide: z.string().trim().min(1).max(5000),
  notes: z.string().trim().max(5000).nullable().default(null),
}).strict().superRefine((value, context) => {
  if (value.pricingModel === 'fixed' && value.amount === null) context.addIssue({ code: 'custom', path: ['amount'], message: 'Fixed fees require an amount.' });
  if (value.pricingModel === 'free' && value.amount !== null) context.addIssue({ code: 'custom', path: ['amount'], message: 'Free fees must not contain an amount.' });
  if (value.pricingModel === 'formula' && !value.formula) context.addIssue({ code: 'custom', path: ['formula'], message: 'Formula fees require explanatory pricing text.' });
  if (['unknown', 'variable'].includes(value.pricingModel) && value.amount !== null) context.addIssue({ code: 'custom', path: ['amount'], message: `${value.pricingModel} fees must not contain a fixed amount.` });
});

const mdaSchema = z.object({
  name: z.string().trim().min(1).max(300),
  acronym: z.string().trim().min(1).max(50),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  officialWebsite: z.string().url().max(2048),
  coverageStatus: z.literal('pilot'),
  description: z.string().trim().min(1).max(5000),
  officialChannels: z.array(channelSchema).min(1),
  services: z.array(serviceSchema).min(1),
}).strict();

const manifestSchema = z.object({ batch: z.string().trim().min(1).max(50), mdas: z.array(mdaSchema).min(1) }).strict();

function validationError(issues) {
  const error = new Error('Manifest validation failed.');
  error.code = 'MANIFEST_VALIDATION';
  error.issues = issues;
  return error;
}

function validateManifest(value) {
  const result = manifestSchema.safeParse(value);
  if (!result.success) {
    throw validationError(result.error.issues.map((issue) => ({ path: issue.path.join('.') || 'manifest', message: issue.message })));
  }
  const issues = [];
  const mdaSlugs = new Set();
  for (const mda of result.data.mdas) {
    if (mdaSlugs.has(mda.slug)) issues.push({ path: `mdas.${mda.slug}`, message: 'Duplicate MDA slug.' });
    mdaSlugs.add(mda.slug);
    const serviceSlugs = new Set();
    for (const service of mda.services) {
      if (serviceSlugs.has(service.slug)) issues.push({ path: `${mda.slug}.services.${service.slug}`, message: 'Duplicate service slug.' });
      serviceSlugs.add(service.slug);
    }
  }
  if (issues.length) throw validationError(issues);
  return result.data;
}

function canonicalBatch(batch) { return BATCH_ALIASES.get(String(batch || '').trim().toLowerCase()); }

function selectBatch(manifest, batch = 'batch-01') {
  const selectedBatch = canonicalBatch(batch);
  if (!selectedBatch) throw new Error('Only batch-01 is supported by this importer.');
  const selected = manifest.mdas.filter((mda) => BATCH_01_SLUGS.includes(mda.slug))
    .sort((left, right) => BATCH_01_SLUGS.indexOf(left.slug) - BATCH_01_SLUGS.indexOf(right.slug));
  const excludedMdas = manifest.mdas.filter((mda) => !BATCH_01_SLUGS.includes(mda.slug)).map((mda) => mda.slug);
  if (selected.length !== BATCH_01_SLUGS.length) throw new Error(`Batch 1 requires exactly these five MDA slugs: ${BATCH_01_SLUGS.join(', ')}.`);
  return { batch: selectedBatch, mdas: selected, excludedMdas };
}

function dateToTimestamp(value) { return `${value}T00:00:00.000Z`; }
function nullableEqual(left, right) { return (left ?? null) === (right ?? null); }

function feeValues(service) {
  return {
    pricingModel: service.pricingModel, currency: service.currency, amount: service.amount,
    minimumAmount: null, maximumAmount: null, percentage: null, formula: service.formula,
    conditions: service.pricingModel === 'variable' ? service.paymentGuide : null,
    label: service.name, notes: service.notes, isCurrent: service.verificationStatus !== 'superseded',
    verificationStatus: service.verificationStatus,
    verifiedAt: service.verificationStatus === 'verified' ? dateToTimestamp(service.lastChecked) : null,
    nextReviewAt: null,
  };
}

function countManifest(selected) {
  const statusCounts = Object.fromEntries(verificationStatuses.map((status) => [status, 0]));
  const sourceKeys = new Set();
  const identities = new Set();
  let duplicateRisk = 0;
  const identity = (key) => { if (identities.has(key)) duplicateRisk += 1; identities.add(key); };
  let serviceCount = 0;
  let feeOptionCount = 0;
  let officialChannelCount = 0;
  for (const mda of selected.mdas) {
    identity(`mda:${mda.slug}`);
    officialChannelCount += mda.officialChannels.length;
    mda.officialChannels.forEach((channel) => identity(`mda-channel:${mda.slug}:${channel.channelType}:${channel.name}:${channel.url || ''}`));
    for (const service of mda.services) {
      serviceCount += 1;
      feeOptionCount += 1;
      statusCounts[service.verificationStatus] += 1;
      identity(`service:${mda.slug}:${service.slug}`);
      identity(`fee:${mda.slug}:${service.slug}`);
      service.evidence.forEach((source) => sourceKeys.add(source.key));
      if (service.officialActionUrl) {
        officialChannelCount += 1;
        identity(`service-channel:${mda.slug}:${service.slug}:${service.officialChannelType}:${service.officialActionUrl}`);
      }
    }
  }
  return {
    mdaCount: selected.mdas.length, serviceCount, feeOptionCount,
    verifiedCount: statusCounts.verified, conflictingCount: statusCounts.conflicting,
    pendingCount: statusCounts.pending, unableToVerifyCount: statusCounts.unable_to_verify,
    supersededCount: statusCounts.superseded, uniqueEvidenceCount: sourceKeys.size,
    officialChannelCount, duplicateRiskCount: duplicateRisk,
  };
}

function dryRunReport(manifest, batch) {
  const selected = selectBatch(manifest, batch);
  const warnings = selected.excludedMdas.length ? [`Excluded non-Batch-1 MDAs: ${selected.excludedMdas.join(', ')}.`] : [];
  for (const mda of selected.mdas) for (const service of mda.services) for (const source of service.evidence) {
    if (!source.publicationDate && !source.effectiveDate) warnings.push(`${source.key} has no publication/effective date in the supplied research.`);
  }
  return { ...countManifest(selected), validationWarnings: [...new Set(warnings)], validationErrors: [], writes: 0 };
}

async function audit(client, actorAdminUserId, action, entityType, entityId, oldValues, newValues) {
  await recordAuditLog(client, { actorAdminUserId, action, entityType, entityId, oldValues, newValues });
}

async function findOrCreateSource(client, source, actorAdminUserId) {
  const existing = await client.query('SELECT * FROM sources WHERE title=$1 AND source_type=$2 AND url IS NOT DISTINCT FROM $3 ORDER BY id ASC LIMIT 1', [source.title, source.sourceType, source.url]);
  if (existing.rows[0]) return { id: existing.rows[0].id, created: false };
  const created = await client.query(
    `INSERT INTO sources (title,source_type,evidence_tier,publisher,url,document_reference,publication_date,effective_date,accessed_at,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [source.title, source.sourceType, source.evidenceTier, source.publisher, source.url, null, source.publicationDate, source.effectiveDate, dateToTimestamp(source.lastChecked), source.notes],
  );
  await audit(client, actorAdminUserId, 'import.source.created', 'source', created.rows[0].id, null, created.rows[0]);
  return { id: created.rows[0].id, created: true };
}

async function findOrCreateMda(client, mda, actorAdminUserId) {
  const existing = await client.query('SELECT * FROM mdas WHERE slug=$1 FOR UPDATE', [mda.slug]);
  const values = [mda.name, mda.slug, mda.acronym, mda.description, mda.officialWebsite, mda.coverageStatus, true];
  if (!existing.rows[0]) {
    const created = await client.query(`INSERT INTO mdas (name,slug,acronym,description,website_url,coverage_status,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, values);
    await audit(client, actorAdminUserId, 'import.mda.created', 'mda', created.rows[0].id, null, created.rows[0]);
    return { row: created.rows[0], created: true, updated: false };
  }
  const old = existing.rows[0];
  const changed = ![old.name, old.slug, old.acronym, old.description, old.website_url, old.coverage_status, old.is_active].every((value, index) => nullableEqual(value, values[index]));
  if (!changed) return { row: old, created: false, updated: false };
  const updated = await client.query('UPDATE mdas SET name=$1,acronym=$2,description=$3,website_url=$4,coverage_status=$5,is_active=$6,updated_at=NOW() WHERE id=$7 RETURNING *', [mda.name, mda.acronym, mda.description, mda.officialWebsite, mda.coverageStatus, true, old.id]);
  await audit(client, actorAdminUserId, 'import.mda.updated', 'mda', old.id, old, updated.rows[0]);
  return { row: updated.rows[0], created: false, updated: true };
}

async function findOrCreateService(client, mdaId, service, actorAdminUserId) {
  const existing = await client.query('SELECT * FROM services WHERE mda_id=$1 AND slug=$2 FOR UPDATE', [mdaId, service.slug]);
  const values = [mdaId, service.name, service.slug, null, null, null, '[]', '[]', service.notes, true];
  if (!existing.rows[0]) {
    const created = await client.query(`INSERT INTO services (mda_id,name,slug,description,category,jurisdiction,requirements,process_steps,notes,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10) RETURNING *`, values);
    await audit(client, actorAdminUserId, 'import.service.created', 'service', created.rows[0].id, null, created.rows[0]);
    return { row: created.rows[0], created: true, updated: false };
  }
  const old = existing.rows[0];
  if (nullableEqual(old.name, service.name) && nullableEqual(old.notes, service.notes) && old.is_active === true) return { row: old, created: false, updated: false };
  const updated = await client.query('UPDATE services SET name=$1,notes=$2,is_active=TRUE,updated_at=NOW() WHERE id=$3 RETURNING *', [service.name, service.notes, old.id]);
  await audit(client, actorAdminUserId, 'import.service.updated', 'service', old.id, old, updated.rows[0]);
  return { row: updated.rows[0], created: false, updated: true };
}

async function findOrCreateFee(client, serviceId, service, actorAdminUserId) {
  const fee = feeValues(service);
  const existing = await client.query(
    `SELECT * FROM fee_options WHERE service_id=$1 AND pricing_model=$2 AND currency=$3
      AND amount IS NOT DISTINCT FROM $4 AND min_amount IS NOT DISTINCT FROM $5 AND max_amount IS NOT DISTINCT FROM $6
      AND percentage IS NOT DISTINCT FROM $7 AND formula IS NOT DISTINCT FROM $8 AND conditions IS NOT DISTINCT FROM $9
      AND label IS NOT DISTINCT FROM $10 AND notes IS NOT DISTINCT FROM $11 AND is_current=$12 AND verification_status=$13
      ORDER BY id ASC LIMIT 1`,
    [serviceId, fee.pricingModel, fee.currency, fee.amount, fee.minimumAmount, fee.maximumAmount, fee.percentage, fee.formula, fee.conditions, fee.label, fee.notes, fee.isCurrent, fee.verificationStatus],
  );
  if (existing.rows[0]) return { row: existing.rows[0], created: false };
  const created = await client.query(
    `INSERT INTO fee_options (service_id,pricing_model,currency,amount,min_amount,max_amount,percentage,formula,conditions,label,notes,is_current,verification_status,verified_at,next_review_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [serviceId, fee.pricingModel, fee.currency, fee.amount, fee.minimumAmount, fee.maximumAmount, fee.percentage, fee.formula, fee.conditions, fee.label, fee.notes, fee.isCurrent, fee.verificationStatus, fee.verifiedAt, fee.nextReviewAt],
  );
  await audit(client, actorAdminUserId, 'import.fee.created', 'fee_option', created.rows[0].id, null, created.rows[0]);
  return { row: created.rows[0], created: true };
}

async function linkSource(client, feeId, sourceId, source, actorAdminUserId, isPrimary) {
  const result = await client.query(
    `INSERT INTO fee_sources (fee_option_id,source_id,excerpt,page_or_section,is_primary) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (fee_option_id,source_id) DO NOTHING RETURNING fee_option_id AS "feeOptionId", source_id AS "sourceId", excerpt, page_or_section AS "pageOrSection", is_primary AS "isPrimary"`,
    [feeId, sourceId, source.notes, null, isPrimary],
  );
  if (result.rows[0]) await audit(client, actorAdminUserId, 'import.fee.source_linked', 'fee_option', feeId, null, result.rows[0]);
  return Boolean(result.rows[0]);
}

async function createVerificationEvent(client, serviceId, feeId, sourceId, service, actorAdminUserId) {
  const checkedAt = dateToTimestamp(service.lastChecked);
  const evidenceSummary = service.evidence.map((source) => source.notes).join(' ');
  const verificationMethod = `Batch 1 manifest review using ${service.evidence.length} official source${service.evidence.length === 1 ? '' : 's'}.`;
  const existing = await client.query('SELECT id FROM verification_events WHERE service_id=$1 AND fee_option_id=$2 AND status=$3 AND checked_at=$4 AND evidence_summary=$5 AND verification_method=$6 LIMIT 1', [serviceId, feeId, service.verificationStatus, checkedAt, evidenceSummary, verificationMethod]);
  if (existing.rows[0]) return { id: existing.rows[0].id, created: false };
  const created = await client.query(
    `INSERT INTO verification_events (service_id,fee_option_id,source_id,status,checked_at,checked_by,notes,actor_admin_user_id,evidence_summary,verification_method,previous_values,new_values)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb) RETURNING *`,
    [serviceId, feeId, sourceId, service.verificationStatus, checkedAt, 'batch-01 manifest import', service.paymentGuide, actorAdminUserId, evidenceSummary, verificationMethod, null, JSON.stringify(service)],
  );
  await audit(client, actorAdminUserId, 'import.verification.created', 'verification_event', created.rows[0].id, null, created.rows[0]);
  return { id: created.rows[0].id, created: true };
}

async function findOrCreateChannel(client, owner, channel, actorAdminUserId) {
  const existing = await client.query('SELECT * FROM official_channels WHERE mda_id IS NOT DISTINCT FROM $1 AND service_id IS NOT DISTINCT FROM $2 AND channel_type=$3 AND name=$4 AND url IS NOT DISTINCT FROM $5 AND contact_value IS NOT DISTINCT FROM $6 ORDER BY id ASC LIMIT 1', [owner.mdaId, owner.serviceId, channel.channelType, channel.name, channel.url, channel.contactValue]);
  if (existing.rows[0] && existing.rows[0].instructions === channel.instructions && existing.rows[0].is_active === true) return { row: existing.rows[0], created: false, updated: false };
  if (existing.rows[0]) {
    const updated = await client.query('UPDATE official_channels SET instructions=$1,is_active=TRUE,updated_at=NOW() WHERE id=$2 RETURNING *', [channel.instructions, existing.rows[0].id]);
    await audit(client, actorAdminUserId, 'import.channel.updated', 'official_channel', existing.rows[0].id, existing.rows[0], updated.rows[0]);
    return { row: updated.rows[0], created: false, updated: true };
  }
  const created = await client.query('INSERT INTO official_channels (service_id,mda_id,channel_type,name,url,contact_value,instructions,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [owner.serviceId, owner.mdaId, channel.channelType, channel.name, channel.url, channel.contactValue, channel.instructions, true]);
  await audit(client, actorAdminUserId, 'import.channel.created', 'official_channel', created.rows[0].id, null, created.rows[0]);
  return { row: created.rows[0], created: true, updated: false };
}

async function importMda(client, mda, actorAdminUserId) {
  const counters = { created: 0, updated: 0, linked: 0, verificationEvents: 0 };
  const mdaResult = await findOrCreateMda(client, mda, actorAdminUserId);
  counters.created += mdaResult.created ? 1 : 0;
  counters.updated += mdaResult.updated ? 1 : 0;
  for (const channel of mda.officialChannels) {
    const result = await findOrCreateChannel(client, { mdaId: mdaResult.row.id, serviceId: null }, channel, actorAdminUserId);
    counters.created += result.created ? 1 : 0;
    counters.updated += result.updated ? 1 : 0;
  }
  for (const service of mda.services) {
    const serviceResult = await findOrCreateService(client, mdaResult.row.id, service, actorAdminUserId);
    counters.created += serviceResult.created ? 1 : 0;
    counters.updated += serviceResult.updated ? 1 : 0;
    const sources = [];
    for (const evidence of service.evidence) sources.push(await findOrCreateSource(client, evidence, actorAdminUserId));
    const feeResult = await findOrCreateFee(client, serviceResult.row.id, service, actorAdminUserId);
    counters.created += feeResult.created ? 1 : 0;
    for (const [index, source] of sources.entries()) counters.linked += await linkSource(client, feeResult.row.id, source.id, service.evidence[index], actorAdminUserId, index === 0) ? 1 : 0;
    const event = await createVerificationEvent(client, serviceResult.row.id, feeResult.row.id, sources[0].id, service, actorAdminUserId);
    counters.verificationEvents += event.created ? 1 : 0;
    if (service.officialActionUrl) {
      const channel = { channelType: service.officialChannelType, name: `${service.name} official action channel`, url: service.officialActionUrl, contactValue: null, instructions: service.paymentGuide };
      const result = await findOrCreateChannel(client, { mdaId: null, serviceId: serviceResult.row.id }, channel, actorAdminUserId);
      counters.created += result.created ? 1 : 0;
      counters.updated += result.updated ? 1 : 0;
    }
  }
  return counters;
}

async function importBatch({ manifest, batch = 'batch-01', pool, actorAdminUserId = null }) {
  const selected = selectBatch(manifest, batch);
  const counters = { created: 0, updated: 0, linked: 0, verificationEvents: 0 };
  for (const mda of selected.mdas) {
    const result = await withTransaction(pool, (client) => importMda(client, mda, actorAdminUserId));
    counters.created += result.created; counters.updated += result.updated; counters.linked += result.linked; counters.verificationEvents += result.verificationEvents;
  }
  return { ...countManifest(selected), ...counters, writes: counters.created + counters.updated + counters.linked + counters.verificationEvents };
}

function parseArguments(argv) {
  const options = { manifestPath: DEFAULT_MANIFEST_PATH, batch: 'batch-01', dryRun: true, apply: false };
  let dryRunFlag = false;
  let applyFlag = false;
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run') dryRunFlag = true;
    else if (argument === '--apply') applyFlag = true;
    else if (argument === '--batch') options.batch = argv[++index];
    else if (argument === '--manifest') options.manifestPath = argv[++index];
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument.startsWith('-')) throw new Error(`Unknown option: ${argument}`);
    else positional.push(argument);
  }
  if (positional[0]) options.manifestPath = positional[0];
  if (dryRunFlag && applyFlag) throw new Error('Choose either --dry-run or --apply, not both.');
  options.apply = applyFlag;
  options.dryRun = !applyFlag;
  return options;
}

function printUsage() { console.log('Usage: node backend/scripts/import-production-manifest.js [manifest.json] [--batch batch-01] [--dry-run|--apply]'); }

function printReport(report, mode, manifestPath, batch) {
  console.log(JSON.stringify({ mode, manifestPath, batch, mdaCount: report.mdaCount, serviceCount: report.serviceCount, feeOptionCount: report.feeOptionCount, verifiedCount: report.verifiedCount, conflictingCount: report.conflictingCount, pendingCount: report.pendingCount, unableToVerifyCount: report.unableToVerifyCount, supersededCount: report.supersededCount, uniqueEvidenceCount: report.uniqueEvidenceCount, officialChannelCount: report.officialChannelCount, duplicateRiskCount: report.duplicateRiskCount, validationWarnings: report.validationWarnings || [], validationErrors: report.validationErrors || [], writes: report.writes, created: report.created || 0, updated: report.updated || 0, linked: report.linked || 0, verificationEvents: report.verificationEvents || 0 }, null, 2));
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) { printUsage(); return; }
  const manifestPath = path.resolve(options.manifestPath);
  const manifest = validateManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
  const selected = selectBatch(manifest, options.batch);
  if (options.dryRun) { printReport(dryRunReport(manifest, options.batch), 'dry-run', manifestPath, selected.batch); return; }
  if (!options.apply) throw new Error('Writes require the explicit --apply flag.');
  if (process.env.DB_SCHEMA !== 'feelens_app') throw new Error('Refusing to write: DB_SCHEMA must be exactly feelens_app.');
  const actorAdminUserId = process.env.IMPORT_ACTOR_ADMIN_ID ? Number(process.env.IMPORT_ACTOR_ADMIN_ID) : null;
  if (actorAdminUserId !== null && (!Number.isInteger(actorAdminUserId) || actorAdminUserId < 1)) throw new Error('IMPORT_ACTOR_ADMIN_ID must be a positive integer when supplied.');
  const pool = getPool();
  try { printReport(await importBatch({ manifest, batch: options.batch, pool, actorAdminUserId }), 'apply', manifestPath, selected.batch); } finally { await closePool(); }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.code === 'MANIFEST_VALIDATION' ? JSON.stringify({ error: error.message, issues: error.issues }, null, 2) : error.message);
    process.exitCode = 1;
  });
}

module.exports = { BATCH_01_SLUGS, DEFAULT_MANIFEST_PATH, countManifest, dryRunReport, importBatch, manifestSchema, parseArguments, selectBatch, validateManifest };
