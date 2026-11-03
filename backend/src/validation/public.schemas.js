const { z } = require('zod');
const { sourceTypes } = require('./admin.schemas');

const verificationStatuses = ['verified', 'pending', 'conflicting', 'unable_to_verify', 'superseded'];
const coverageStatuses = ['pilot', 'roadmap', 'inactive'];
const publicSorts = ['coverage', 'priority', 'alpha', 'live', 'services', 'name', 'status', 'updatedAt'];

const optionalQueryText = (max = 200) => z.string().trim().max(max).transform((value) => value || undefined).optional();
const queryBoolean = z.union([
  z.literal('true').transform(() => true),
  z.literal('false').transform(() => false),
  z.boolean(),
]);

const paginationFields = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
};

const publicMdaListSchema = z.object({
  ...paginationFields,
  search: optionalQueryText(),
  jurisdiction: optionalQueryText(100),
  entityType: optionalQueryText(100),
  category: optionalQueryText(100),
  coverageStatus: z.enum(coverageStatuses).optional(),
  sort: z.enum(publicSorts).default('coverage'),
  featured: queryBoolean.optional(),
}).strict();

const publicServiceListSchema = z.object({
  ...paginationFields,
  search: optionalQueryText(),
  sort: z.enum(['name', 'status', 'updatedAt']).default('name'),
}).strict();

const publicSourceListSchema = z.object({
  ...paginationFields,
  search: optionalQueryText(),
  sourceType: z.enum(sourceTypes).optional(),
}).strict();

const publicSearchSchema = z.object({
  q: z.string().trim().min(2, 'Search query must be at least 2 characters.').max(100),
}).strict();

const slugParamsSchema = z.object({
  slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
}).strict();

module.exports = {
  publicMdaListSchema,
  publicSearchSchema,
  publicServiceListSchema,
  publicSourceListSchema,
  slugParamsSchema,
};
