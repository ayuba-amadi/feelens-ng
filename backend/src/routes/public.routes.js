const express = require('express');
const { notFound, conflict, HttpError } = require('../utils/http-error');
const {
  publicMdaListSchema,
  publicSearchSchema,
  publicServiceListSchema,
  publicSourceListSchema,
  slugParamsSchema,
} = require('../validation/public.schemas');

const PUBLIC_FEE_WHERE = "f.is_current = TRUE AND f.verification_status <> 'superseded'";
const PUBLIC_SERVICE_WHERE = 's.is_active = TRUE AND m.is_active = TRUE';

const PUBLIC_FEE_FIELDS = `
  f.id,
  f.pricing_model AS "pricingModel",
  f.currency,
  f.amount,
  f.min_amount AS "minimumAmount",
  f.max_amount AS "maximumAmount",
  f.percentage,
  f.formula,
  f.conditions,
  f.label,
  f.verification_status AS "verificationStatus",
  f.verified_at AS "verifiedAt",
  f.next_review_at AS "nextReviewAt"`;

const PUBLIC_SOURCE_FIELDS = `
  src.id,
  src.title,
  src.source_type AS "sourceType",
  src.evidence_tier AS "evidenceTier",
  src.publisher,
  src.url,
  src.document_reference AS "documentReference",
  src.publication_date AS "publicationDate",
  src.effective_date AS "effectiveDate",
  src.accessed_at AS "accessedAt",
  src.accessed_at AS "retrievedDate"`;

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'request',
      message: issue.message || 'Invalid value.',
    }));
    throw new HttpError(400, 'Validation failed.', details);
  }
  return result.data;
}

function pageQuery(query) {
  return {
    page: query.page,
    pageSize: query.limit ?? query.pageSize,
    offset: (query.page - 1) * (query.limit ?? query.pageSize),
  };
}

function pagination(rows, page, pageSize) {
  const total = rows.length ? Number(rows[0].total_count) : 0;
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    hasMore: page * pageSize < total,
  };
}

function publicMdaSelect() {
  return `
    m.id,
    m.slug,
    m.acronym,
    m.name,
    m.description,
    m.entity_type AS "entityType",
    m.jurisdiction,
    m.category,
    m.coverage_status AS "coverageStatus",
    m.website_url AS "officialWebsite",
    m.website_url AS "websiteUrl",
    (
      SELECT COUNT(*)::int
      FROM services ms
      WHERE ms.mda_id = m.id AND ms.is_active = TRUE
    ) AS "serviceCount"`;
}

function publicFeeJson(alias = 'f') {
  return `json_build_object(
    'id', ${alias}.id,
    'pricingModel', ${alias}.pricing_model,
    'currency', ${alias}.currency,
    'amount', ${alias}.amount,
    'minimumAmount', ${alias}.min_amount,
    'maximumAmount', ${alias}.max_amount,
    'percentage', ${alias}.percentage,
    'formula', ${alias}.formula,
    'conditions', ${alias}.conditions,
    'label', ${alias}.label,
    'verificationStatus', ${alias}.verification_status,
    'verifiedAt', ${alias}.verified_at,
    'nextReviewAt', ${alias}.next_review_at
  )`;
}

function currentFeesJson(serviceAlias = 's') {
  return `COALESCE((
    SELECT json_agg(${publicFeeJson('f')} ORDER BY f.id ASC)
    FROM fee_options f
    WHERE f.service_id = ${serviceAlias}.id AND ${PUBLIC_FEE_WHERE}
  ), '[]'::json)`;
}

function verificationStatusSql(serviceAlias = 's') {
  return `CASE
    WHEN EXISTS (SELECT 1 FROM fee_options f WHERE f.service_id = ${serviceAlias}.id AND ${PUBLIC_FEE_WHERE} AND f.verification_status = 'conflicting') THEN 'conflicting'
    WHEN EXISTS (SELECT 1 FROM fee_options f WHERE f.service_id = ${serviceAlias}.id AND ${PUBLIC_FEE_WHERE} AND f.verification_status = 'unable_to_verify') THEN 'unable_to_verify'
    WHEN EXISTS (SELECT 1 FROM fee_options f WHERE f.service_id = ${serviceAlias}.id AND ${PUBLIC_FEE_WHERE} AND f.verification_status = 'pending') THEN 'pending'
    WHEN EXISTS (SELECT 1 FROM fee_options f WHERE f.service_id = ${serviceAlias}.id AND ${PUBLIC_FEE_WHERE} AND f.verification_status = 'verified') THEN 'verified'
    ELSE NULL
  END`;
}

function servicePublicSelect() {
  return `
    s.id,
    s.slug,
    s.name,
    s.description,
    s.category,
    s.jurisdiction,
    ${currentFeesJson('s')} AS "feeOptions",
    ${verificationStatusSql('s')} AS "verificationStatus",
    COALESCE(
      (SELECT MAX(ve.checked_at) FROM verification_events ve WHERE ve.service_id = s.id),
      (SELECT MAX(f.verified_at) FROM fee_options f WHERE f.service_id = s.id AND ${PUBLIC_FEE_WHERE})
    ) AS "lastChecked",
    (SELECT MIN(f.next_review_at) FROM fee_options f WHERE f.service_id = s.id AND ${PUBLIC_FEE_WHERE} AND f.next_review_at IS NOT NULL) AS "nextReviewAt",
    EXISTS (
      SELECT 1 FROM fee_sources fs
      JOIN fee_options f ON f.id = fs.fee_option_id
      WHERE f.service_id = s.id AND ${PUBLIC_FEE_WHERE}
    ) AS "hasEvidence",
    EXISTS (SELECT 1 FROM official_channels c WHERE c.service_id = s.id AND c.is_active = TRUE) AS "hasOfficialChannels",
    EXISTS (SELECT 1 FROM official_channels c WHERE c.service_id = s.id AND c.is_active = TRUE AND c.url IS NOT NULL) AS "hasOfficialChannelUrl",
    (SELECT c.url FROM official_channels c WHERE c.service_id = s.id AND c.is_active = TRUE AND c.url IS NOT NULL ORDER BY c.id ASC LIMIT 1) AS "officialUrl",
    (SELECT COUNT(*)::int FROM official_channels c WHERE c.service_id = s.id AND c.is_active = TRUE) AS "officialChannelCount",
    (SELECT COUNT(DISTINCT fs.source_id)::int
       FROM fee_sources fs
       JOIN fee_options f ON f.id = fs.fee_option_id
      WHERE f.service_id = s.id AND ${PUBLIC_FEE_WHERE}) AS "sourceCount"`;
}

function sourceSearch(conditions, values, search, columns) {
  if (!search) return;
  values.push(`%${search}%`);
  const parameter = `$${values.length}`;
  conditions.push(`(${columns.map((column) => `${column} ILIKE ${parameter}`).join(' OR ')})`);
}

function mdaSort(sort) {
  return {
    coverage: "CASE m.coverage_status WHEN 'pilot' THEN 1 WHEN 'roadmap' THEN 2 WHEN 'inactive' THEN 3 ELSE 4 END",
    alpha: 'm.name',
    name: 'm.name',
    live: "CASE WHEN m.coverage_status = 'pilot' AND (SELECT COUNT(*) FROM services ms WHERE ms.mda_id = m.id AND ms.is_active = TRUE) > 0 THEN 1 ELSE 2 END",
    services: '"serviceCount"',
    status: 'm.coverage_status',
    updatedAt: 'm.updated_at',
  }[sort] || 'm.name';
}

function serviceSort(sort) {
  return {
    name: 's.name',
    status: "CASE %STATUS_SQL% WHEN 'verified' THEN 1 WHEN 'pending' THEN 2 WHEN 'conflicting' THEN 3 WHEN 'unable_to_verify' THEN 4 ELSE 5 END",
    updatedAt: 's.updated_at',
  }[sort] || 's.name';
}

function createPublicRouter(pool) {
  const router = express.Router();

  router.get('/stats', async (req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM mdas WHERE is_active = TRUE) AS "mdasCovered",
          (SELECT COUNT(*)::int FROM services s JOIN mdas m ON m.id = s.mda_id WHERE ${PUBLIC_SERVICE_WHERE}) AS "servicesMapped",
          (SELECT COUNT(*)::int
             FROM fee_options f
             JOIN services s ON s.id = f.service_id
             JOIN mdas m ON m.id = s.mda_id
            WHERE ${PUBLIC_SERVICE_WHERE} AND ${PUBLIC_FEE_WHERE} AND f.verification_status = 'verified') AS "verifiedFeeItems",
          (SELECT COUNT(DISTINCT src.id)::int
             FROM sources src
             JOIN fee_sources fs ON fs.source_id = src.id
             JOIN fee_options f ON f.id = fs.fee_option_id
             JOIN services s ON s.id = f.service_id
             JOIN mdas m ON m.id = s.mda_id
            WHERE ${PUBLIC_SERVICE_WHERE} AND ${PUBLIC_FEE_WHERE}) AS "sources"
      `);
      res.json(result.rows[0] || { mdasCovered: 0, servicesMapped: 0, verifiedFeeItems: 0, sources: 0 });
    } catch (error) {
      next(error);
    }
  });

  router.get('/search', async (req, res, next) => {
    try {
      const query = parse(publicSearchSchema, req.query);
      const term = `%${query.q}%`;
      const result = await pool.query(`
        SELECT * FROM (
          SELECT 'mda' AS type, m.slug, m.name, m.acronym, m.slug AS "mdaSlug",
                 m.name AS "mdaName", m.category, m.jurisdiction
            FROM mdas m
           WHERE m.is_active = TRUE
             AND (m.name ILIKE $1 OR COALESCE(m.acronym, '') ILIKE $1)
          UNION ALL
          SELECT 'service' AS type, s.slug, s.name, NULL AS acronym, m.slug AS "mdaSlug",
                 m.name AS "mdaName", s.category, s.jurisdiction
            FROM services s
            JOIN mdas m ON m.id = s.mda_id
           WHERE ${PUBLIC_SERVICE_WHERE}
             AND s.name ILIKE $1
        ) public_results
        ORDER BY CASE WHEN type = 'mda' THEN 1 ELSE 2 END, name ASC
        LIMIT $2
      `, [term, 25]);
      res.json({ results: result.rows });
    } catch (error) {
      next(error);
    }
  });

  router.get('/mdas', async (req, res, next) => {
    try {
      const query = parse(publicMdaListSchema, req.query);
      const page = pageQuery(query);
      const conditions = ['m.is_active = TRUE'];
      const values = [];
      sourceSearch(conditions, values, query.search, ['m.name', 'm.acronym', 'm.category', 'm.slug']);
      for (const [value, column] of [
        [query.jurisdiction, 'm.jurisdiction'],
        [query.entityType, 'm.entity_type'],
        [query.category, 'm.category'],
        [query.coverageStatus, 'm.coverage_status'],
      ]) {
        if (value !== undefined) {
          values.push(value);
          conditions.push(`${column} = $${values.length}`);
        }
      }
      if (query.featured === true) {
        conditions.push("m.coverage_status = 'pilot'");
        conditions.push('(SELECT COUNT(*) FROM services ms WHERE ms.mda_id = m.id AND ms.is_active = TRUE) > 0');
      }
      values.push(page.pageSize, page.offset);
      const result = await pool.query(`
        SELECT ${publicMdaSelect()}, COUNT(*) OVER() AS total_count
          FROM mdas m
         WHERE ${conditions.join(' AND ')}
         ORDER BY ${mdaSort(query.sort)} ${query.order === 'desc' ? 'DESC' : 'ASC'}, m.id ASC
         LIMIT $${values.length - 1} OFFSET $${values.length}
      `, values);
      const pageMeta = pagination(result.rows, page.page, page.pageSize);
      res.json({
        items: result.rows.map(({ total_count: ignored, ...row }) => row),
        pagination: pageMeta,
        total: pageMeta.total,
        hasMore: pageMeta.hasMore,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/mdas/:slug', async (req, res, next) => {
    try {
      const { slug } = parse(slugParamsSchema, req.params);
      const result = await pool.query(`
        SELECT ${publicMdaSelect()},
          (SELECT COUNT(*)::int FROM services ms WHERE ms.mda_id = m.id AND ms.is_active = TRUE) AS "mappedActiveServices",
          (SELECT COUNT(*)::int FROM fee_options f JOIN services ms ON ms.id = f.service_id
             WHERE ms.mda_id = m.id AND ms.is_active = TRUE AND ${PUBLIC_FEE_WHERE} AND f.verification_status = 'verified') AS "currentVerifiedFeeItems",
          (SELECT COUNT(*)::int FROM fee_options f JOIN services ms ON ms.id = f.service_id
             WHERE ms.mda_id = m.id AND ms.is_active = TRUE AND ${PUBLIC_FEE_WHERE} AND f.verification_status = 'pending') AS "pendingItems",
          (SELECT COUNT(*)::int FROM fee_options f JOIN services ms ON ms.id = f.service_id
             WHERE ms.mda_id = m.id AND ms.is_active = TRUE AND ${PUBLIC_FEE_WHERE} AND f.verification_status = 'conflicting') AS "conflictingItems",
          (SELECT COUNT(*)::int FROM fee_options f JOIN services ms ON ms.id = f.service_id
             WHERE ms.mda_id = m.id AND ms.is_active = TRUE AND ${PUBLIC_FEE_WHERE} AND f.verification_status = 'unable_to_verify') AS "unableToVerifyItems"
          FROM mdas m
         WHERE m.slug = $1 AND m.is_active = TRUE
      `, [slug]);
      if (!result.rows[0]) throw notFound('MDA');
      res.json({ mda: result.rows[0] });
    } catch (error) {
      next(error);
    }
  });

  router.get('/mdas/:slug/services', async (req, res, next) => {
    try {
      const { slug } = parse(slugParamsSchema, req.params);
      const query = parse(publicServiceListSchema, req.query);
      const page = pageQuery(query);
      const conditions = [`${PUBLIC_SERVICE_WHERE}`, 'm.slug = $1'];
      const values = [slug];
      sourceSearch(conditions, values, query.search, ['s.name', 's.category', 's.slug']);
      values.push(page.pageSize, page.offset);
      const sort = serviceSort(query.sort).replace('%STATUS_SQL%', verificationStatusSql('s'));
      const result = await pool.query(`
        SELECT ${servicePublicSelect()}, COUNT(*) OVER() AS total_count
          FROM services s
          JOIN mdas m ON m.id = s.mda_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY ${sort} ${query.order === 'desc' ? 'DESC' : 'ASC'}, s.id ASC
         LIMIT $${values.length - 1} OFFSET $${values.length}
      `, values);
      if (!result.rows.length) {
        const mdaResult = await pool.query('SELECT id FROM mdas WHERE slug = $1 AND is_active = TRUE', [slug]);
        if (!mdaResult.rows[0]) throw notFound('MDA');
      }
      const pageMeta = pagination(result.rows, page.page, page.pageSize);
      res.json({
        items: result.rows.map(({ total_count: ignored, ...row }) => row),
        pagination: pageMeta,
        total: pageMeta.total,
        hasMore: pageMeta.hasMore,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/services/:slug', async (req, res, next) => {
    try {
      const { slug } = parse(slugParamsSchema, req.params);
      const serviceResult = await pool.query(`
        SELECT ${servicePublicSelect()},
          s.requirements,
          s.process_steps AS "processSteps",
          m.slug AS "mdaSlug",
          m.acronym AS "mdaAcronym",
          m.name AS "mdaName",
          m.jurisdiction AS "mdaJurisdiction",
          m.website_url AS "mdaOfficialWebsite"
          FROM services s
          JOIN mdas m ON m.id = s.mda_id
         WHERE s.slug = $1 AND ${PUBLIC_SERVICE_WHERE}
      `, [slug]);
      if (!serviceResult.rows.length) throw notFound('Service');
      if (serviceResult.rows.length > 1) throw conflict('This public service slug is ambiguous.');

      const service = serviceResult.rows[0];
      const [feeResult, channelsResult, summaryResult] = await Promise.all([
        pool.query(`
          SELECT ${PUBLIC_FEE_FIELDS},
            COALESCE((
              SELECT json_agg(json_build_object(
                'id', src.id,
                'title', src.title,
                'sourceType', src.source_type,
                'evidenceTier', src.evidence_tier,
                'publisher', src.publisher,
                'url', src.url,
                'documentReference', src.document_reference,
                'publicationDate', src.publication_date,
                'effectiveDate', src.effective_date,
                'accessedAt', src.accessed_at,
                'retrievedDate', src.accessed_at,
                'excerpt', fs.excerpt,
                'pageOrSection', fs.page_or_section,
                'isPrimary', fs.is_primary
              ) ORDER BY fs.is_primary DESC, src.id ASC)
              FROM fee_sources fs
              JOIN sources src ON src.id = fs.source_id
              WHERE fs.fee_option_id = f.id
            ), '[]'::json) AS sources
            FROM fee_options f
           WHERE f.service_id = $1 AND ${PUBLIC_FEE_WHERE}
           ORDER BY f.id ASC
        `, [service.id]),
        pool.query(`
          SELECT c.id, c.channel_type AS "channelType", c.name, c.url,
                 c.contact_value AS "contactValue", c.instructions
            FROM official_channels c
           WHERE c.service_id = $1 AND c.is_active = TRUE
           ORDER BY c.id ASC
        `, [service.id]),
        pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE f.verification_status = 'verified')::int AS verified,
            COUNT(*) FILTER (WHERE f.verification_status = 'pending')::int AS pending,
            COUNT(*) FILTER (WHERE f.verification_status = 'conflicting')::int AS conflicting,
            COUNT(*) FILTER (WHERE f.verification_status = 'unable_to_verify')::int AS "unableToVerify"
            FROM fee_options f
           WHERE f.service_id = $1 AND ${PUBLIC_FEE_WHERE}
        `, [service.id]),
      ]);

      const mda = {
        slug: service.mdaSlug,
        acronym: service.mdaAcronym,
        name: service.mdaName,
        jurisdiction: service.mdaJurisdiction,
        officialWebsite: service.mdaOfficialWebsite,
      };
      const feeOptions = feeResult.rows;
      const sources = [];
      const sourceIds = new Set();
      for (const fee of feeOptions) {
        for (const source of (fee.sources || [])) {
          if (!sourceIds.has(source.id)) {
            sourceIds.add(source.id);
            sources.push(source);
          }
        }
        delete fee.sources;
      }
      const summary = summaryResult.rows[0] || { verified: 0, pending: 0, conflicting: 0, unableToVerify: 0 };
      const publicService = {
        id: service.id,
        slug: service.slug,
        name: service.name,
        description: service.description,
        category: service.category,
        jurisdiction: service.jurisdiction,
        requirements: service.requirements,
        processSteps: service.processSteps,
        feeOptions,
        sources,
        officialChannels: channelsResult.rows,
        mda,
        mdaSlug: mda.slug,
        mdaAcronym: mda.acronym,
        mdaName: mda.name,
        officialUrl: service.officialUrl,
        hasEvidence: service.hasEvidence,
        hasOfficialChannels: service.hasOfficialChannels,
        hasOfficialChannelUrl: service.hasOfficialChannelUrl,
        officialChannelCount: service.officialChannelCount,
        sourceCount: service.sourceCount,
        verificationStatus: service.verificationStatus,
        verificationSummary: summary,
        lastChecked: service.lastChecked,
        nextReviewAt: service.nextReviewAt,
        nextReviewDate: service.nextReviewAt,
      };
      res.json({ service: publicService });
    } catch (error) {
      next(error);
    }
  });

  router.get('/sources', async (req, res, next) => {
    try {
      const query = parse(publicSourceListSchema, req.query);
      const page = pageQuery(query);
      const conditions = [PUBLIC_SERVICE_WHERE, PUBLIC_FEE_WHERE];
      const values = [];
      sourceSearch(conditions, values, query.search, ['src.title', 'src.publisher', 'src.document_reference']);
      if (query.sourceType !== undefined) {
        values.push(query.sourceType);
        conditions.push(`src.source_type = $${values.length}`);
      }
      values.push(page.pageSize, page.offset);
      const result = await pool.query(`
        SELECT public_sources.*, COUNT(*) OVER() AS total_count
          FROM (
            SELECT DISTINCT ${PUBLIC_SOURCE_FIELDS}
              FROM sources src
              JOIN fee_sources fs ON fs.source_id = src.id
              JOIN fee_options f ON f.id = fs.fee_option_id
              JOIN services s ON s.id = f.service_id
              JOIN mdas m ON m.id = s.mda_id
             WHERE ${conditions.join(' AND ')}
          ) public_sources
         ORDER BY public_sources.title ASC, public_sources.id ASC
         LIMIT $${values.length - 1} OFFSET $${values.length}
      `, values);
      const pageMeta = pagination(result.rows, page.page, page.pageSize);
      res.json({
        items: result.rows.map(({ total_count: ignored, ...row }) => row),
        pagination: pageMeta,
        total: pageMeta.total,
        hasMore: pageMeta.hasMore,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createPublicRouter };
