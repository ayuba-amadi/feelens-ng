const { z } = require('zod');

const verificationStatuses = ['verified', 'pending', 'conflicting', 'unable_to_verify', 'superseded'];
const pricingModels = ['fixed', 'free', 'range', 'percentage', 'formula', 'variable', 'unknown'];
const sourceTypes = [
  'act',
  'regulation',
  'gazette',
  'statutory_instrument',
  'approved_fee_schedule',
  'official_circular',
  'official_website',
  'official_portal',
  'official_notice',
  'correspondence',
  'foi_response',
  'other',
];

const optionalText = (max = 5000) => z.string().trim().max(max).nullable().optional();
const requiredText = (max = 500) => z.string().trim().min(1).max(max);
const optionalUrl = z.union([z.literal(''), z.url().max(2048)]).nullable().optional()
  .transform((value) => value || null);
const optionalDate = z.union([z.literal(''), z.iso.date(), z.iso.datetime({ offset: true })]).nullable().optional()
  .transform((value) => value || null);
const optionalNumber = z.number().finite().nonnegative().nullable().optional();

const idParamsSchema = z.object({ id: z.coerce.number().int().positive() }).strict();
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).default(''),
  sort: z.string().trim().max(50).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
}).passthrough();

const mdaSchema = z.object({
  name: requiredText(300),
  slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  acronym: optionalText(50),
  description: optionalText(),
  websiteUrl: optionalUrl,
  entityType: optionalText(100),
  jurisdiction: optionalText(100),
  category: optionalText(100),
  coverageStatus: z.enum(verificationStatuses).default('pending'),
  isActive: z.boolean().default(true),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
}).strict();

const serviceSchema = z.object({
  mdaId: z.coerce.number().int().positive(),
  name: requiredText(300),
  slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: optionalText(),
  category: optionalText(100),
  jurisdiction: optionalText(100),
  requirements: z.array(requiredText(1000)).max(100).default([]),
  processSteps: z.array(requiredText(2000)).max(100).default([]),
  notes: optionalText(),
  isActive: z.boolean().default(true),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
}).strict();

const feeSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  pricingModel: z.enum(pricingModels),
  label: optionalText(200),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default('NGN'),
  amount: optionalNumber,
  minimumAmount: optionalNumber,
  maximumAmount: optionalNumber,
  percentage: optionalNumber,
  formula: optionalText(5000),
  conditions: optionalText(5000),
  notes: optionalText(5000),
  verificationStatus: z.enum(verificationStatuses).default('pending'),
  verifiedAt: optionalDate,
  nextReviewAt: optionalDate,
  isCurrent: z.boolean().default(true),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
}).strict().superRefine((value, context) => {
  const issue = (field, message) => context.addIssue({
    code: 'custom',
    path: [field],
    message,
  });

  if (value.pricingModel === 'fixed') {
    if (!value.currency) issue('currency', 'Currency is required for a fixed fee.');
    if (value.amount === null || value.amount === undefined) issue('amount', 'Amount is required for a fixed fee.');
    if (value.amount === 0) issue('amount', 'Use the free pricing model instead of a zero fixed fee.');
  }

  if (value.pricingModel === 'free') {
    if ([value.amount, value.minimumAmount, value.maximumAmount, value.percentage].some((item) => item !== null && item !== undefined)) {
      issue('amount', 'Free fees must not contain numeric amounts.');
    }
  }

  if (value.pricingModel === 'range') {
    if (!value.currency) issue('currency', 'Currency is required for a fee range.');
    if (value.minimumAmount === null || value.minimumAmount === undefined) issue('minimumAmount', 'Minimum amount is required.');
    if (value.maximumAmount === null || value.maximumAmount === undefined) issue('maximumAmount', 'Maximum amount is required.');
    if (value.minimumAmount !== null && value.minimumAmount !== undefined
      && value.maximumAmount !== null && value.maximumAmount !== undefined
      && value.minimumAmount > value.maximumAmount) {
      issue('maximumAmount', 'Maximum amount must be greater than or equal to the minimum amount.');
    }
  }

  if (value.pricingModel === 'percentage') {
    if (value.percentage === null || value.percentage === undefined) issue('percentage', 'Percentage is required.');
    if (value.percentage === 0 || value.percentage > 100000) issue('percentage', 'Percentage is outside the supported range.');
  }

  if (value.pricingModel === 'formula' && !value.formula) issue('formula', 'Formula or calculation explanation is required.');
  if (value.pricingModel === 'variable' && !value.conditions) issue('conditions', 'Conditions are required for a variable fee.');
  if (value.pricingModel === 'variable' && !value.label && !value.notes) issue('label', 'A label or note is required for a variable fee.');

  if (value.pricingModel === 'unknown'
    && [value.amount, value.minimumAmount, value.maximumAmount, value.percentage].some((item) => item !== null && item !== undefined)) {
    issue('amount', 'Unknown fees must not contain numeric amounts.');
  }
});

const sourceSchema = z.object({
  title: requiredText(500),
  sourceType: z.enum(sourceTypes),
  evidenceTier: z.coerce.number().int().min(1).max(3),
  publisher: optionalText(300),
  url: optionalUrl,
  documentReference: optionalText(300),
  publicationDate: optionalDate,
  effectiveDate: optionalDate,
  accessedAt: optionalDate,
  notes: optionalText(),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
}).strict();

const channelSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  channelType: z.enum(['website', 'portal', 'office', 'email', 'phone', 'other']),
  name: requiredText(300),
  url: optionalUrl,
  contactValue: optionalText(500),
  instructions: optionalText(5000),
  isActive: z.boolean().default(true),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
}).strict();

const verificationSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  feeOptionId: z.coerce.number().int().positive().nullable().optional(),
  sourceId: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(verificationStatuses),
  checkedAt: z.iso.datetime({ offset: true }).optional(),
  evidenceSummary: requiredText(5000),
  verificationMethod: requiredText(500),
  notes: optionalText(5000),
}).strict();

const foiSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
  requestingBody: requiredText(300),
  subject: optionalText(500),
  requestReference: optionalText(300),
  submittedAt: optionalDate,
  respondedAt: optionalDate,
  status: z.enum(['draft', 'submitted', 'acknowledged', 'responded', 'closed', 'withdrawn']).default('draft'),
  requestText: optionalText(10000),
  responseSummary: optionalText(10000),
  sourceId: z.coerce.number().int().positive().nullable().optional(),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
}).strict();

const sourceLinkSchema = z.object({
  sourceId: z.coerce.number().int().positive(),
  excerpt: optionalText(5000),
  pageOrSection: optionalText(500),
  isPrimary: z.boolean().default(false),
}).strict();

const feeSupersessionSchema = z.object({
  newFee: feeSchema,
  sourceIds: z.array(z.coerce.number().int().positive()).min(1).max(100),
  reason: requiredText(5000),
  evidenceSummary: requiredText(5000),
  verificationMethod: requiredText(500),
  checkedAt: z.iso.datetime({ offset: true }).optional(),
}).strict();

const adminCreateSchema = z.object({
  email: z.email().trim().toLowerCase().max(320),
  displayName: requiredText(200),
  role: z.literal('admin').default('admin'),
  password: z.string().min(12).max(256)
    .regex(/[a-z]/, 'Password must include a lowercase letter.')
    .regex(/[A-Z]/, 'Password must include an uppercase letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
}).strict();

const adminUpdateSchema = z.object({
  displayName: requiredText(200).optional(),
  role: z.literal('admin').optional(),
  isActive: z.boolean().optional(),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
}).strict().refine((value) => Object.keys(value).some((key) => key !== 'updatedAt'), {
  message: 'At least one account change is required.',
});

const accountUpdateSchema = z.object({ displayName: requiredText(200) }).strict();
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256)
    .regex(/[a-z]/, 'Password must include a lowercase letter.')
    .regex(/[A-Z]/, 'Password must include an uppercase letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
}).strict().refine((value) => value.currentPassword !== value.newPassword, {
  path: ['newPassword'],
  message: 'New password must differ from the current password.',
});

module.exports = {
  accountUpdateSchema,
  adminCreateSchema,
  adminUpdateSchema,
  channelSchema,
  feeSchema,
  feeSupersessionSchema,
  foiSchema,
  idParamsSchema,
  mdaSchema,
  paginationSchema,
  passwordChangeSchema,
  pricingModels,
  serviceSchema,
  sourceLinkSchema,
  sourceSchema,
  sourceTypes,
  verificationSchema,
  verificationStatuses,
};
