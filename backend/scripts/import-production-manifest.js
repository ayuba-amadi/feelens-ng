const fs = require('node:fs');
const path = require('node:path');
const { z } = require('zod');
const { getPool, closePool } = require('../src/db/pool');
const { recordAuditLog } = require('../src/services/audit-log.service');
const { withTransaction } = require('../src/utils/database');
const { pricingModels, sourceTypes, verificationStatuses } = require('../src/validation/admin.schemas');

const REPOSITORY_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_MANIFEST_PATH = path.join(REPOSITORY_ROOT, 'research/production-import/batch-01-mdas.json');
const BATCH_02_MANIFEST_PATH = path.join(REPOSITORY_ROOT, 'research/production-import/batch-02-mdas.json');
const FCTIRS_CATALOGUE_PATH = path.join(REPOSITORY_ROOT, 'research/production-import/fctirs-service-catalogue.json');
const NIMC_CATALOGUE_PATH = path.join(REPOSITORY_ROOT, 'research/production-import/nimc-service-catalogue.json');
const NIS_CATALOGUE_PATH = path.join(REPOSITORY_ROOT, 'research/production-import/nis-service-catalogue.json');
const FRSC_CATALOGUE_PATH = path.join(REPOSITORY_ROOT, 'research/production-import/frsc-service-catalogue.json');
const NPC_CATALOGUE_PATH = path.join(REPOSITORY_ROOT, 'research/production-import/npc-service-catalogue.json');
const BATCH_ALIASES = new Map([
  ['batch-01', 'batch-01'], ['batch-01-mdas', 'batch-01'],
  ['batch-02', 'batch-02'], ['batch-02-mdas', 'batch-02'],
  ['batch-03', 'batch-03'], ['batch-03-mdas', 'batch-03'],
]);
const BATCH_01_SLUGS = ['fct-irs', 'nimc', 'nigeria-immigration-service', 'frsc-drivers-licence', 'cac'];
const FCTIRS_OBSOLETE_SERVICE_SLUGS = [
  'tax-id-tin-generation-or-retrieval',
  'tax-payment',
];
const BATCH_02_SLUGS = ['agis', 'fct-high-court', 'npc', 'jamb', 'nepc'];
const BATCH_03_SLUGS = ['nafdac', 'son', 'ministry-interior-marriage-registry', 'nigerian-copyright-commission', 'ncc'];
const BATCH_SLUGS = { 'batch-01': BATCH_01_SLUGS, 'batch-02': BATCH_02_SLUGS, 'batch-03': BATCH_03_SLUGS };

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
  pageOrSection: z.string().trim().max(5000).nullable().optional().default(null),
  documentReference: z.string().trim().max(5000).nullable().optional().default(null),
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
  description: z.string().trim().max(5000).nullable().optional().default(null),
  category: z.string().trim().max(200).nullable().optional().default(null),
  jurisdiction: z.string().trim().max(200).nullable().optional().default(null),
  requirements: z.array(z.unknown()).optional().default([]),
  processSteps: z.array(z.unknown()).optional().default([]),
  pricingModel: z.enum(pricingModels),
  amount: z.number().finite().nonnegative().nullable(),
  minimumAmount: z.number().finite().nonnegative().nullable().optional().default(null),
  maximumAmount: z.number().finite().nonnegative().nullable().optional().default(null),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  percentage: z.number().finite().nonnegative().nullable().optional().default(null),
  formula: z.string().trim().max(5000).nullable(),
  conditions: z.string().trim().max(5000).nullable().optional().default(null),
  verificationStatus: z.enum(verificationStatuses),
  lastChecked: dateValue,
  evidence: z.array(evidenceSchema).min(1),
  officialActionUrl: nullableUrl,
  officialChannelType: z.enum(['website', 'portal', 'office', 'email', 'phone', 'other']),
  paymentGuide: z.string().trim().min(1).max(5000),
  notes: z.string().trim().max(5000).nullable().default(null),
  feeOptions: z.array(z.object({
    pricingModel: z.enum(pricingModels),
    amount: z.number().finite().nonnegative().nullable(),
    minimumAmount: z.number().finite().nonnegative().nullable().optional().default(null),
    maximumAmount: z.number().finite().nonnegative().nullable().optional().default(null),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    percentage: z.number().finite().nonnegative().nullable().optional().default(null),
    formula: z.string().trim().max(5000).nullable().optional().default(null),
    conditions: z.string().trim().max(5000).nullable().optional().default(null),
    label: z.string().trim().max(500).nullable().optional().default(null),
    notes: z.string().trim().max(5000).nullable().optional().default(null),
    verificationStatus: z.enum(verificationStatuses),
    sourceKeys: z.array(z.string().trim().min(1).max(200)).optional().default([]),
    page: z.string().trim().max(5000).nullable().optional().default(null),
    evidenceNote: z.string().trim().min(1).max(5000).nullable().optional().default(null),
    evidence: z.array(evidenceSchema).optional(),
    paymentGuide: z.string().trim().min(1).max(5000).optional(),
  }).strict()).optional().default([]),
}).strict().superRefine((value, context) => {
  if (value.pricingModel === 'fixed' && value.amount === null) context.addIssue({ code: 'custom', path: ['amount'], message: 'Fixed fees require an amount.' });
  if (value.pricingModel === 'free' && value.amount !== null) context.addIssue({ code: 'custom', path: ['amount'], message: 'Free fees must not contain an amount.' });
  if (value.pricingModel === 'formula' && !value.formula) context.addIssue({ code: 'custom', path: ['formula'], message: 'Formula fees require explanatory pricing text.' });
  if (['unknown', 'variable'].includes(value.pricingModel) && value.amount !== null) context.addIssue({ code: 'custom', path: ['amount'], message: `${value.pricingModel} fees must not contain a fixed amount.` });
  if (value.pricingModel === 'percentage' && (value.percentage === null || value.amount !== null)) context.addIssue({ code: 'custom', path: ['percentage'], message: 'Percentage fees require a percentage and must not contain a fixed amount.' });
  if (value.pricingModel !== 'percentage' && value.percentage !== null) context.addIssue({ code: 'custom', path: ['percentage'], message: 'Only percentage fees may contain a percentage.' });
});

const mdaSchema = z.object({
  name: z.string().trim().min(1).max(300),
  acronym: z.string().trim().min(1).max(50),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  officialWebsite: z.string().url().max(2048),
  jurisdiction: z.string().trim().max(200).nullable().optional(),
  coverageStatus: z.enum(['pilot', 'roadmap', 'inactive']),
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


function buildFctirsManifest(baseManifest, catalogue) {
  const sourceRecords = catalogue.sources || {};
  const mda = {
    ...catalogue.mda,
    services: catalogue.services.map((row) => {
      const evidenceFor = (sourceKeys, page, evidenceNote) => sourceKeys.map((key) => {
        const source = sourceRecords[key];
        if (!source) throw new Error(`FCT-IRS catalogue row ${row.slug} references missing source ${key}.`);
        return {
          key,
          ...source,
          pageOrSection: page || source.documentReference,
          notes: evidenceNote || source.notes,
        };
      });

      const feeOptions = row.feeOptions.map((option) => ({
        pricingModel: option.pricingModel,
        amount: option.amount ?? null,
        minimumAmount: option.minimumAmount ?? null,
        maximumAmount: option.maximumAmount ?? null,
        currency: option.currency,
        percentage: option.percentage ?? null,
        formula: option.formula ?? null,
        conditions: option.conditions ?? null,
        label: option.label || row.name,
        notes: option.notes || row.notes || null,
        verificationStatus: option.verificationStatus,
        evidence: evidenceFor(option.sourceKeys, option.page, option.evidenceNote),
        paymentGuide: row.paymentGuide,
      }));

      if (!feeOptions.length) {
        throw new Error(`FCT-IRS catalogue row ${row.slug} has no fee options.`);
      }

      const statuses = new Set(feeOptions.map((option) => option.verificationStatus));
      const verificationStatus = statuses.has('conflicting')
        ? 'conflicting'
        : statuses.has('pending')
          ? 'pending'
          : statuses.has('unable_to_verify')
            ? 'unable_to_verify'
            : 'verified';

      const first = feeOptions[0];

      const description = row.processingStandard
        ? `${row.description} Service standard: ${row.processingStandard}`
        : row.description;

      const notes = row.processingStandard
        ? `${row.notes || ''}${row.notes ? ' ' : ''}Service standard: ${row.processingStandard}`
        : row.notes || null;

      return {
        name: row.name,
        slug: row.slug,
        description,
        category: row.category,
        jurisdiction: row.jurisdiction || 'Federal Capital Territory',
        requirements: row.requirements || [],
        processSteps: row.processSteps || [],
        pricingModel: first.pricingModel,
        amount: first.amount,
        minimumAmount: first.minimumAmount,
        maximumAmount: first.maximumAmount,
        currency: first.currency,
        percentage: first.percentage,
        formula: first.formula,
        conditions: first.conditions,
        verificationStatus,
        lastChecked: '2026-11-01',
        evidence: first.evidence,
        officialActionUrl: row.officialActionUrl || null,
        officialChannelType: row.officialChannelType || 'website',
        paymentGuide: row.paymentGuide,
        notes,
        feeOptions,
      };
    }),
  };

  return {
    ...baseManifest,
    mdas: baseManifest.mdas.map((item) => item.slug === 'fct-irs' ? mda : item),
  };
}

function buildNimcManifest(baseManifest, catalogue) {
  const sourceRecords = catalogue.sources || {};
  const mda = {
    ...catalogue.mda,
    services: catalogue.rows.map((row) => {
      const evidence = row.sourceKeys.map((key) => {
        const source = sourceRecords[key];
        if (!source) throw new Error(`NIMC catalogue row ${row.slug} references missing source ${key}.`);
        return {
          key,
          ...source,
          pageOrSection: row.page,
          notes: row.evidenceNotes?.[key] || row.evidenceNote || source.notes,
        };
      });
      const requirements = row.slug === 'nimc-nin-first-time-enrolment-and-slip'
        ? ['Provide a valid supporting document accepted by NIMC.', 'Attend the enrolment process for demographic and biometric capture.']
        : row.slug === 'nimc-nin-slip-reissuance-loss-damage-theft'
          ? ['For loss or theft, provide the police report, court affidavit, evidence of payment and photo ID listed by NIMC.', 'For damage, provide the damaged slip and evidence of payment.']
          : row.slug === 'nimc-date-of-birth-modification' || row.slug === 'nimc-other-information-modification'
            ? ['Bring the original NIN slip, payment evidence, a signed application letter and supporting document as required by the field.', 'Use the NIMC centre or the supported self-service route for the requested field.']
            : [];
      const processSteps = row.slug === 'nimc-nin-first-time-enrolment-and-slip'
        ? ['Use NIMC pre-enrolment where available.', 'Attend an official NIMC enrolment centre for the supported capture and verification steps.', 'Collect the NIN slip after NIMC processing.']
        : row.slug === 'nimc-date-of-birth-modification' || row.slug === 'nimc-other-information-modification'
          ? ['Review NIMC\'s current modification instructions and payment route.', 'Submit the supported documents and complete the centre or self-service workflow.', 'Keep the transaction evidence and follow NIMC notifications.']
          : row.slug === 'nimc-nin-slip-reissuance-loss-damage-theft' || row.slug === 'nimc-nin-slip-reissuance-after-modification'
            ? ['Follow NIMC\'s re-issuance instructions for the applicable reason.', 'Present the required evidence and complete the official payment route.', 'Collect or retrieve the re-issued slip through the official channel.']
            : [];
      return {
        name: row.name,
        slug: row.slug,
        description: `${row.audience}. ${row.location}. ${row.notes}`,
        category: row.category,
        jurisdiction: row.category.startsWith('Diaspora') ? 'Diaspora' : row.category.startsWith('Institutional') ? 'Institutional' : 'Nigeria',
        requirements,
        processSteps,
        pricingModel: row.pricingModel,
        amount: row.amount ?? null,
        minimumAmount: row.minimumAmount ?? null,
        maximumAmount: row.maximumAmount ?? null,
        currency: row.currency,
        percentage: row.percentage ?? null,
        formula: row.formula ?? null,
        conditions: row.notes || null,
        verificationStatus: row.status,
        lastChecked: '2026-10-31',
        evidence,
        officialActionUrl: row.actionUrl || 'https://nimc.gov.ng/',
        officialChannelType: row.channelType || 'website',
        paymentGuide: row.status === 'conflicting'
          ? 'Official NIMC evidence does not establish one conclusive amount or band. Review every linked source and confirm the applicable amount with NIMC before payment.'
          : row.notes,
        notes: row.notes,
      };
    }),
  };
  return { ...baseManifest, mdas: baseManifest.mdas.map((item) => item.slug === 'nimc' ? mda : item) };
}

function buildNisManifest(baseManifest, catalogue) {
  const sourceRecords = catalogue.sources || {};
  const mda = {
    ...catalogue.mda,
    services: catalogue.services.map((row) => {
      const evidenceFor = (sourceKeys, page, evidenceNote) => sourceKeys.map((key) => {
        const source = sourceRecords[key];
        if (!source) throw new Error(`NIS catalogue row ${row.slug} references missing source ${key}.`);
        return { key, ...source, pageOrSection: page || source.documentReference, notes: evidenceNote || source.notes };
      });
      const feeOptions = row.feeOptions.map((option) => ({
        pricingModel: option.pricingModel,
        amount: option.amount ?? null,
        minimumAmount: option.minimumAmount ?? null,
        maximumAmount: option.maximumAmount ?? null,
        currency: option.currency,
        percentage: option.percentage ?? null,
        formula: option.formula ?? null,
        conditions: option.conditions ?? null,
        label: option.label || row.name,
        notes: option.notes || row.notes || null,
        verificationStatus: option.verificationStatus,
        evidence: evidenceFor(option.sourceKeys, option.page, option.evidenceNote),
        paymentGuide: row.paymentGuide,
      }));
      const statuses = new Set(feeOptions.map((option) => option.verificationStatus));
      const verificationStatus = statuses.has('conflicting') ? 'conflicting' : statuses.has('pending') ? 'pending' : statuses.has('unable_to_verify') ? 'unable_to_verify' : 'verified';
      const first = feeOptions[0];
      return {
        name: row.name,
        slug: row.slug,
        description: row.description,
        category: row.category,
        jurisdiction: row.jurisdiction || 'Nigeria and applicants abroad where stated',
        requirements: row.requirements || [],
        processSteps: row.processSteps || [],
        pricingModel: first.pricingModel,
        amount: first.amount,
        minimumAmount: first.minimumAmount,
        maximumAmount: first.maximumAmount,
        currency: first.currency,
        percentage: first.percentage,
        formula: first.formula,
        conditions: first.conditions,
        verificationStatus,
        lastChecked: '2026-10-31',
        evidence: first.evidence,
        officialActionUrl: row.officialActionUrl || null,
        officialChannelType: row.officialChannelType || 'website',
        paymentGuide: row.paymentGuide,
        notes: row.notes || null,
        feeOptions,
      };
    }),
  };
  return { ...baseManifest, mdas: baseManifest.mdas.map((item) => item.slug === 'nigeria-immigration-service' ? mda : item) };
}

function buildFrscManifest(baseManifest, catalogue) {
  const sourceRecords = catalogue.sources || {};
  const mda = {
    ...catalogue.mda,
    services: catalogue.services.map((row) => {
      const evidenceFor = (sourceKeys, page, evidenceNote) => sourceKeys.map((key) => {
        const source = sourceRecords[key];
        if (!source) throw new Error(`FRSC catalogue row ${row.slug} references missing source ${key}.`);
        return { key, ...source, pageOrSection: page || source.documentReference, notes: evidenceNote || source.notes };
      });
      const feeOptions = row.feeOptions.map((option) => ({
        pricingModel: option.pricingModel,
        amount: option.amount ?? null,
        minimumAmount: option.minimumAmount ?? null,
        maximumAmount: option.maximumAmount ?? null,
        currency: option.currency,
        percentage: option.percentage ?? null,
        formula: option.formula ?? null,
        conditions: option.conditions ?? null,
        label: option.label || row.name,
        notes: option.notes || row.notes || null,
        verificationStatus: option.verificationStatus,
        evidence: evidenceFor(option.sourceKeys, option.page, option.evidenceNote),
        paymentGuide: row.paymentGuide,
      }));
      const statuses = new Set(feeOptions.map((option) => option.verificationStatus));
      const verificationStatus = statuses.has('conflicting') ? 'conflicting' : statuses.has('pending') ? 'pending' : statuses.has('unable_to_verify') ? 'unable_to_verify' : 'verified';
      const first = feeOptions[0];
      return {
        name: row.name,
        slug: row.slug,
        description: row.description,
        category: row.category,
        jurisdiction: row.jurisdiction || 'Federal',
        requirements: row.requirements || [],
        processSteps: row.processSteps || [],
        pricingModel: first.pricingModel,
        amount: first.amount,
        minimumAmount: first.minimumAmount,
        maximumAmount: first.maximumAmount,
        currency: first.currency,
        percentage: first.percentage,
        formula: first.formula,
        conditions: first.conditions,
        verificationStatus,
        lastChecked: '2026-10-31',
        evidence: first.evidence,
        officialActionUrl: row.officialActionUrl || null,
        officialChannelType: row.officialChannelType || 'website',
        paymentGuide: row.paymentGuide,
        notes: row.notes || null,
        feeOptions,
      };
    }),
  };
  return { ...baseManifest, mdas: baseManifest.mdas.map((item) => item.slug === 'frsc-drivers-licence' ? mda : item) };
}

function buildNpcManifest(baseManifest, catalogue) {
  const sourceRecords = catalogue.sources || {};
  const mda = {
    ...catalogue.mda,
    services: catalogue.services.map((row) => {
      const evidenceFor = (sourceKeys, page, evidenceNote) => sourceKeys.map((key) => {
        const source = sourceRecords[key];
        if (!source) throw new Error(`NPC catalogue row ${row.slug} references missing source ${key}.`);
        return { key, ...source, pageOrSection: page || source.documentReference, notes: evidenceNote || source.notes };
      });
      const feeOptions = row.feeOptions.map((option) => ({
        pricingModel: option.pricingModel,
        amount: option.amount ?? null,
        minimumAmount: option.minimumAmount ?? null,
        maximumAmount: option.maximumAmount ?? null,
        currency: option.currency,
        percentage: option.percentage ?? null,
        formula: option.formula ?? null,
        conditions: option.conditions ?? null,
        label: option.label || row.name,
        notes: option.notes || row.notes || null,
        verificationStatus: option.verificationStatus,
        evidence: evidenceFor(option.sourceKeys, option.page, option.evidenceNote),
        paymentGuide: row.paymentGuide,
      }));
      const statuses = new Set(feeOptions.map((option) => option.verificationStatus));
      const verificationStatus = statuses.has('conflicting') ? 'conflicting' : statuses.has('pending') ? 'pending' : statuses.has('unable_to_verify') ? 'unable_to_verify' : 'verified';
      const first = feeOptions[0];
      return {
        name: row.name,
        slug: row.slug,
        description: row.description,
        category: row.category,
        jurisdiction: row.jurisdiction || 'Federal',
        requirements: row.requirements || [],
        processSteps: row.processSteps || [],
        pricingModel: first.pricingModel,
        amount: first.amount,
        minimumAmount: first.minimumAmount,
        maximumAmount: first.maximumAmount,
        currency: first.currency,
        percentage: first.percentage,
        formula: first.formula,
        conditions: first.conditions,
        verificationStatus,
        lastChecked: '2026-10-31',
        evidence: first.evidence,
        officialActionUrl: row.officialActionUrl || null,
        officialChannelType: row.officialChannelType || 'website',
        paymentGuide: row.paymentGuide,
        notes: row.notes || null,
        feeOptions,
      };
    }),
  };
  return { ...baseManifest, mdas: baseManifest.mdas.map((item) => item.slug === 'npc' ? mda : item) };
}

function loadManifest(manifestPath) {
  const resolvedPath = path.resolve(manifestPath);
  const baseManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (resolvedPath === BATCH_02_MANIFEST_PATH) {
    return buildNpcManifest(baseManifest, JSON.parse(fs.readFileSync(NPC_CATALOGUE_PATH, 'utf8')));
  }
  if (resolvedPath !== DEFAULT_MANIFEST_PATH) return baseManifest;
  const withFctirs = buildFctirsManifest(baseManifest, JSON.parse(fs.readFileSync(FCTIRS_CATALOGUE_PATH, 'utf8')));
  const withNimc = buildNimcManifest(withFctirs, JSON.parse(fs.readFileSync(NIMC_CATALOGUE_PATH, 'utf8')));
  const withNis = buildNisManifest(withNimc, JSON.parse(fs.readFileSync(NIS_CATALOGUE_PATH, 'utf8')));
  return buildFrscManifest(withNis, JSON.parse(fs.readFileSync(FRSC_CATALOGUE_PATH, 'utf8')));
}

function selectBatch(manifest, batch = 'batch-01') {
  const selectedBatch = canonicalBatch(batch);
  if (!selectedBatch || !BATCH_SLUGS[selectedBatch]) throw new Error('Only batch-01, batch-02, and batch-03 are supported by this importer.');
  const allowedSlugs = BATCH_SLUGS[selectedBatch];
  const selected = manifest.mdas.filter((mda) => allowedSlugs.includes(mda.slug))
    .sort((left, right) => allowedSlugs.indexOf(left.slug) - allowedSlugs.indexOf(right.slug));
  const excludedMdas = manifest.mdas.filter((mda) => !allowedSlugs.includes(mda.slug)).map((mda) => mda.slug);
  if (selected.length !== allowedSlugs.length) throw new Error(`${selectedBatch} requires exactly these MDA slugs: ${allowedSlugs.join(', ')}.`);
  return { batch: selectedBatch, mdas: selected, excludedMdas };
}

function dateToTimestamp(value) { return `${value}T00:00:00.000Z`; }
function nullableEqual(left, right) { return (left ?? null) === (right ?? null); }

function feeValues(service) {
  return {
    pricingModel: service.pricingModel, currency: service.currency, amount: service.amount,
    minimumAmount: service.minimumAmount ?? null, maximumAmount: service.maximumAmount ?? null, percentage: service.percentage, formula: service.formula,
    conditions: service.conditions ?? (service.pricingModel === 'variable' ? service.paymentGuide : null),
    label: service.label ?? service.name,
    notes: service.notes,
    isCurrent: service.verificationStatus !== 'superseded',
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
  let evidenceLinkCount = 0;
  let officialChannelCount = 0;
  for (const mda of selected.mdas) {
    identity(`mda:${mda.slug}`);
    officialChannelCount += mda.officialChannels.length;
    mda.officialChannels.forEach((channel) => identity(`mda-channel:${mda.slug}:${channel.channelType}:${channel.name}:${channel.url || ''}`));
    for (const service of mda.services) {
      serviceCount += 1;
      identity(`service:${mda.slug}:${service.slug}`);
      const feeOptions = service.feeOptions?.length ? service.feeOptions : [service];
      feeOptionCount += feeOptions.length;
      for (const [feeIndex, option] of feeOptions.entries()) {
        statusCounts[option.verificationStatus] += 1;
        identity(`fee:${mda.slug}:${service.slug}:${feeIndex}:${option.label || ''}:${option.amount ?? ''}`);
        const evidence = option.evidence || service.evidence;
        evidenceLinkCount += evidence.length;
        evidence.forEach((source) => sourceKeys.add(source.key));
      }
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
    evidenceLinkCount, officialChannelCount, duplicateRiskCount: duplicateRisk,
  };
}

function dryRunReport(manifest, batch) {
  const selected = selectBatch(manifest, batch);
  const warnings = selected.excludedMdas.length ? [`Excluded non-${selected.batch} MDAs: ${selected.excludedMdas.join(', ')}.`] : [];
  for (const mda of selected.mdas) for (const service of mda.services) for (const option of (service.feeOptions?.length ? service.feeOptions : [service])) for (const source of option.evidence || service.evidence) {
    if (!source.publicationDate && !source.effectiveDate) warnings.push(`${source.key} has no publication/effective date in the supplied research.`);
  }
  for (const mda of selected.mdas) for (const service of mda.services) for (const option of (service.feeOptions?.length ? service.feeOptions : [service])) {
    if (option.verificationStatus === 'conflicting' && (option.evidence || service.evidence).length < 2) warnings.push(`${mda.slug}/${service.slug}/${option.label || 'fee'} remains conflicting and has fewer than two supplied evidence records; recover the missing official source before publishing a definitive amount.`);
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
    [source.title, source.sourceType, source.evidenceTier, source.publisher, source.url, source.documentReference || null, source.publicationDate, source.effectiveDate, dateToTimestamp(source.lastChecked), source.notes],
  );
  await audit(client, actorAdminUserId, 'import.source.created', 'source', created.rows[0].id, null, created.rows[0]);
  return { id: created.rows[0].id, created: true };
}

async function findOrCreateMda(client, mda, actorAdminUserId) {
  const existing = await client.query('SELECT * FROM mdas WHERE slug=$1 FOR UPDATE', [mda.slug]);
  const isActive = mda.coverageStatus !== 'inactive';
  const values = [mda.name, mda.slug, mda.acronym, mda.description, mda.officialWebsite, mda.coverageStatus, isActive];
  const hasJurisdiction = mda.jurisdiction !== undefined;
  if (!existing.rows[0]) {
    const created = hasJurisdiction
      ? await client.query(`INSERT INTO mdas (name,slug,acronym,description,website_url,coverage_status,is_active,jurisdiction) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [...values, mda.jurisdiction])
      : await client.query(`INSERT INTO mdas (name,slug,acronym,description,website_url,coverage_status,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, values);
    await audit(client, actorAdminUserId, 'import.mda.created', 'mda', created.rows[0].id, null, created.rows[0]);
    return { row: created.rows[0], created: true, updated: false };
  }
  const old = existing.rows[0];
  const changed = ![old.name, old.slug, old.acronym, old.description, old.website_url, old.coverage_status, old.is_active].every((value, index) => nullableEqual(value, values[index]))
    || (hasJurisdiction && !nullableEqual(old.jurisdiction, mda.jurisdiction));
  if (!changed) return { row: old, created: false, updated: false };
  const updated = hasJurisdiction
    ? await client.query('UPDATE mdas SET name=$1,acronym=$2,description=$3,website_url=$4,coverage_status=$5,is_active=$6,jurisdiction=$7,updated_at=NOW() WHERE id=$8 RETURNING *', [mda.name, mda.acronym, mda.description, mda.officialWebsite, mda.coverageStatus, isActive, mda.jurisdiction, old.id])
    : await client.query('UPDATE mdas SET name=$1,acronym=$2,description=$3,website_url=$4,coverage_status=$5,is_active=$6,updated_at=NOW() WHERE id=$7 RETURNING *', [mda.name, mda.acronym, mda.description, mda.officialWebsite, mda.coverageStatus, isActive, old.id]);
  await audit(client, actorAdminUserId, 'import.mda.updated', 'mda', old.id, old, updated.rows[0]);
  return { row: updated.rows[0], created: false, updated: true };
}

async function findOrCreateService(client, mdaId, service, actorAdminUserId) {
  const existing = await client.query('SELECT * FROM services WHERE mda_id=$1 AND slug=$2 FOR UPDATE', [mdaId, service.slug]);
  const values = [mdaId, service.name, service.slug, service.description, service.category, service.jurisdiction, JSON.stringify(service.requirements || []), JSON.stringify(service.processSteps || []), service.notes, true];
  if (!existing.rows[0]) {
    const created = await client.query(`INSERT INTO services (mda_id,name,slug,description,category,jurisdiction,requirements,process_steps,notes,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10) RETURNING *`, values);
    await audit(client, actorAdminUserId, 'import.service.created', 'service', created.rows[0].id, null, created.rows[0]);
    return { row: created.rows[0], created: true, updated: false };
  }
  const old = existing.rows[0];
  if (nullableEqual(old.name, service.name) && nullableEqual(old.description, service.description) && nullableEqual(old.category, service.category) && nullableEqual(old.jurisdiction, service.jurisdiction) && JSON.stringify(old.requirements || []) === JSON.stringify(service.requirements || []) && JSON.stringify(old.process_steps || []) === JSON.stringify(service.processSteps || []) && nullableEqual(old.notes, service.notes) && old.is_active === true) return { row: old, created: false, updated: false };
  const updated = await client.query('UPDATE services SET name=$1,description=$2,category=$3,jurisdiction=$4,requirements=$5::jsonb,process_steps=$6::jsonb,notes=$7,is_active=TRUE,updated_at=NOW() WHERE id=$8 RETURNING *', [service.name, service.description, service.category, service.jurisdiction, JSON.stringify(service.requirements || []), JSON.stringify(service.processSteps || []), service.notes, old.id]);
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
    [feeId, sourceId, source.notes, source.pageOrSection || source.documentReference || null, isPrimary],
  );
  if (result.rows[0]) await audit(client, actorAdminUserId, 'import.fee.source_linked', 'fee_option', feeId, null, result.rows[0]);
  return Boolean(result.rows[0]);
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


async function reconcileFctirsObsoleteRecords(client, mdaId, actorAdminUserId) {
  const counters = { updated: 0 };

  const obsoleteServices = await client.query(
    `SELECT *
       FROM services
      WHERE mda_id = $1
        AND slug = ANY($2::text[])
      FOR UPDATE`,
    [mdaId, FCTIRS_OBSOLETE_SERVICE_SLUGS],
  );

  for (const service of obsoleteServices.rows) {
    if (service.is_active === true) {
      const updatedService = await client.query(
        `UPDATE services
            SET is_active = FALSE,
                updated_at = NOW()
          WHERE id = $1
          RETURNING *`,
        [service.id],
      );

      await audit(
        client,
        actorAdminUserId,
        'import.service.retired',
        'service',
        service.id,
        service,
        updatedService.rows[0],
      );

      counters.updated += 1;
    }

    const currentFees = await client.query(
      `SELECT *
         FROM fee_options
        WHERE service_id = $1
          AND is_current = TRUE
        FOR UPDATE`,
      [service.id],
    );

    for (const fee of currentFees.rows) {
      const updatedFee = await client.query(
        `UPDATE fee_options
            SET is_current = FALSE,
                verification_status = 'superseded',
                updated_at = NOW()
          WHERE id = $1
          RETURNING *`,
        [fee.id],
      );

      await audit(
        client,
        actorAdminUserId,
        'import.fee.superseded',
        'fee_option',
        fee.id,
        fee,
        updatedFee.rows[0],
      );

      counters.updated += 1;
    }

    const activeChannels = await client.query(
      `SELECT *
         FROM official_channels
        WHERE service_id = $1
          AND is_active = TRUE
        FOR UPDATE`,
      [service.id],
    );

    for (const channel of activeChannels.rows) {
      const updatedChannel = await client.query(
        `UPDATE official_channels
            SET is_active = FALSE,
                updated_at = NOW()
          WHERE id = $1
          RETURNING *`,
        [channel.id],
      );

      await audit(
        client,
        actorAdminUserId,
        'import.channel.retired',
        'official_channel',
        channel.id,
        channel,
        updatedChannel.rows[0],
      );

      counters.updated += 1;
    }
  }

  return counters;
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
  if (mda.slug === 'fct-irs') {
    const reconciliation = await reconcileFctirsObsoleteRecords(
      client,
      mdaResult.row.id,
      actorAdminUserId,
    );
    counters.updated += reconciliation.updated;
  }

  for (const service of mda.services) {
    const serviceResult = await findOrCreateService(client, mdaResult.row.id, service, actorAdminUserId);
    counters.created += serviceResult.created ? 1 : 0;
    counters.updated += serviceResult.updated ? 1 : 0;
    const feeOptions = service.feeOptions?.length ? service.feeOptions : [service];
    for (const option of feeOptions) {
      const optionService = { ...service, ...option, evidence: option.evidence || service.evidence, paymentGuide: option.paymentGuide || service.paymentGuide };
      const sources = [];
      for (const evidence of optionService.evidence) sources.push(await findOrCreateSource(client, evidence, actorAdminUserId));
      const feeResult = await findOrCreateFee(client, serviceResult.row.id, optionService, actorAdminUserId);
      counters.created += feeResult.created ? 1 : 0;
      for (const [index, source] of sources.entries()) counters.linked += await linkSource(client, feeResult.row.id, source.id, optionService.evidence[index], actorAdminUserId, index === 0) ? 1 : 0;
    }
    if (service.officialActionUrl) {
      const channel = { channelType: service.officialChannelType, name: `${service.name} official action channel`, url: service.officialActionUrl, contactValue: null, instructions: service.paymentGuide };
      const result = await findOrCreateChannel(client, { mdaId: null, serviceId: serviceResult.row.id }, channel, actorAdminUserId);
      counters.created += result.created ? 1 : 0;
      counters.updated += result.updated ? 1 : 0;
    }
  }
  return counters;
}


function canonicalizeImportManifest(manifest, batch) {
  const selectedBatch = canonicalBatch(batch);

  if (selectedBatch !== 'batch-01') return manifest;

  const hasFctirs = manifest.mdas?.some((mda) => mda.slug === 'fct-irs');
  if (!hasFctirs) return manifest;

  const catalogue = JSON.parse(
    fs.readFileSync(FCTIRS_CATALOGUE_PATH, 'utf8'),
  );

  return buildFctirsManifest(manifest, catalogue);
}

async function importBatch({ manifest, batch = 'batch-01', pool, actorAdminUserId = null }) {
  const canonicalManifest = validateManifest(
    canonicalizeImportManifest(manifest, batch),
  );
  const selected = selectBatch(canonicalManifest, batch);
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
  console.log(JSON.stringify({ mode, manifestPath, batch, mdaCount: report.mdaCount, serviceCount: report.serviceCount, feeOptionCount: report.feeOptionCount, verifiedCount: report.verifiedCount, conflictingCount: report.conflictingCount, pendingCount: report.pendingCount, unableToVerifyCount: report.unableToVerifyCount, supersededCount: report.supersededCount, uniqueEvidenceCount: report.uniqueEvidenceCount, evidenceLinkCount: report.evidenceLinkCount, officialChannelCount: report.officialChannelCount, duplicateRiskCount: report.duplicateRiskCount, validationWarnings: report.validationWarnings || [], validationErrors: report.validationErrors || [], writes: report.writes, created: report.created || 0, updated: report.updated || 0, linked: report.linked || 0, verificationEvents: report.verificationEvents || 0 }, null, 2));
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  if (options.help) { printUsage(); return; }
  const manifestPath = path.resolve(options.manifestPath);
  const manifest = validateManifest(loadManifest(manifestPath));
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

module.exports = { BATCH_01_SLUGS, BATCH_02_MANIFEST_PATH, BATCH_02_SLUGS, BATCH_03_SLUGS, DEFAULT_MANIFEST_PATH, FCTIRS_CATALOGUE_PATH, FCTIRS_OBSOLETE_SERVICE_SLUGS, FRSC_CATALOGUE_PATH, NIMC_CATALOGUE_PATH, NIS_CATALOGUE_PATH, NPC_CATALOGUE_PATH, buildFctirsManifest, buildFrscManifest, buildNimcManifest, buildNisManifest, buildNpcManifest, canonicalizeImportManifest, countManifest, dryRunReport, importBatch, loadManifest, manifestSchema, parseArguments, reconcileFctirsObsoleteRecords, selectBatch, validateManifest };
