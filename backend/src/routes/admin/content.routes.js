const express = require('express');
const { recordAuditLog } = require('../../services/audit-log.service');
const { withTransaction } = require('../../utils/database');
const { HttpError, notFound, conflict } = require('../../utils/http-error');
const {
  channelSchema,
  feeSchema,
  feeSupersessionSchema,
  idParamsSchema,
  mdaSchema,
  paginationSchema,
  serviceSchema,
  sourceLinkSchema,
  sourceSchema,
} = require('../../validation/admin.schemas');
const {
  boolQuery,
  handleDatabaseError,
  paginationMeta,
  parse,
  stripCount,
} = require('./route-helpers');

const MDA_SELECT = `
  id, name, slug, acronym, description, website_url AS "websiteUrl",
  entity_type AS "entityType", jurisdiction, category,
  coverage_status AS "coverageStatus", is_active AS "isActive",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

const SERVICE_SELECT = `
  s.id, s.mda_id AS "mdaId", s.name, s.slug, s.description, s.category,
  s.catalogue_group AS "catalogueGroup",
  s.jurisdiction, s.requirements, s.process_steps AS "processSteps", s.notes,
  s.is_active AS "isActive", s.created_at AS "createdAt", s.updated_at AS "updatedAt",
  m.name AS "mdaName", m.acronym AS "mdaAcronym"`;

const FEE_SELECT = `
  f.id, f.service_id AS "serviceId", f.pricing_model AS "pricingModel",
  f.currency, f.amount, f.min_amount AS "minimumAmount",
  f.max_amount AS "maximumAmount", f.percentage, f.formula, f.conditions,
  f.label, f.notes, f.is_current AS "isCurrent",
  f.verification_status AS "verificationStatus", f.verified_at AS "verifiedAt",
  f.next_review_at AS "nextReviewAt",
  f.supersedes_fee_option_id AS "supersedesFeeOptionId",
  f.created_at AS "createdAt", f.updated_at AS "updatedAt",
  s.name AS "serviceName", m.id AS "mdaId", m.name AS "mdaName"`;

const SOURCE_SELECT = `
  id, title, source_type AS "sourceType", evidence_tier AS "evidenceTier",
  publisher, url, document_reference AS "documentReference",
  publication_date AS "publicationDate", effective_date AS "effectiveDate",
  accessed_at AS "accessedAt", notes, created_at AS "createdAt", updated_at AS "updatedAt"`;

const CHANNEL_SELECT = `
  c.id, c.service_id AS "serviceId", c.mda_id AS "mdaId", c.channel_type AS "channelType", c.name,
  c.url, c.contact_value AS "contactValue", c.instructions,
  c.is_active AS "isActive", c.created_at AS "createdAt", c.updated_at AS "updatedAt",
  s.name AS "serviceName", m.name AS "mdaName"`;

function listResponse(rows, page, pageSize) {
  return {
    items: rows.map(stripCount),
    pagination: paginationMeta(rows, page, pageSize),
  };
}

function addSearch(conditions, values, search, columns) {
  if (!search) return;
  values.push(`%${search}%`);
  const index = values.length;
  conditions.push(`(${columns.map((column) => `${column} ILIKE $${index}`).join(' OR ')})`);
}

async function audit(client, req, action, entityType, entityId, oldValues, newValues) {
  await recordAuditLog(client, {
    actorAdminUserId: req.admin.id,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
  });
}

function createContentRouter(pool) {
  const router = express.Router();

  router.get('/mdas', async (req, res, next) => {
    try {
      const query = parse(paginationSchema, req.query);
      const conditions = [];
      const values = [];
      addSearch(conditions, values, query.search, ['name', 'acronym', 'slug']);
      const isActive = boolQuery(req.query.isActive);
      if (isActive !== undefined) {
        values.push(isActive);
        conditions.push(`is_active = $${values.length}`);
      }
      if (req.query.coverageStatus) {
        values.push(req.query.coverageStatus);
        conditions.push(`coverage_status = $${values.length}`);
      }
      const sortColumns = {
        name: 'name',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        coverageStatus: 'coverage_status',
      };
      const sort = sortColumns[query.sort] || 'name';
      values.push(query.pageSize, (query.page - 1) * query.pageSize);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT ${MDA_SELECT}, COUNT(*) OVER() AS total_count
           FROM mdas ${where}
          ORDER BY ${sort} ${query.order === 'desc' ? 'DESC' : 'ASC'}, id ASC
          LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      res.json(listResponse(result.rows, query.page, query.pageSize));
    } catch (error) {
      next(error);
    }
  });

  router.post('/mdas', async (req, res, next) => {
    try {
      const value = parse(mdaSchema, req.body);
      const created = await withTransaction(pool, async (client) => {
        const result = await client.query(
          `INSERT INTO mdas
            (name, slug, acronym, description, website_url, entity_type, jurisdiction,
             category, coverage_status, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING ${MDA_SELECT}`,
          [value.name, value.slug, value.acronym, value.description, value.websiteUrl,
            value.entityType, value.jurisdiction, value.category, value.coverageStatus, value.isActive],
        );
        await audit(client, req, 'mda.created', 'mda', result.rows[0].id, null, result.rows[0]);
        return result.rows[0];
      });
      res.status(201).json(created);
    } catch (error) {
      try { handleDatabaseError(error, 'An MDA with this slug already exists.'); } catch (handled) { next(handled); }
    }
  });

  router.get('/mdas/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const result = await pool.query(
        `SELECT ${MDA_SELECT},
                (SELECT COUNT(*)::int FROM services s WHERE s.mda_id = mdas.id) AS "serviceCount"
           FROM mdas WHERE id = $1`,
        [id],
      );
      if (!result.rows[0]) throw notFound('MDA');
      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/mdas/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const value = parse(mdaSchema, req.body);
      const updated = await withTransaction(pool, async (client) => {
        const oldResult = await client.query(`SELECT ${MDA_SELECT} FROM mdas WHERE id = $1 FOR UPDATE`, [id]);
        const oldValue = oldResult.rows[0];
        if (!oldValue) throw notFound('MDA');
        if (value.updatedAt && new Date(value.updatedAt).getTime() !== new Date(oldValue.updatedAt).getTime()) {
          throw conflict('This MDA was changed by another administrator. Refresh before saving.');
        }
        const result = await client.query(
          `UPDATE mdas SET name=$1, slug=$2, acronym=$3, description=$4, website_url=$5,
             entity_type=$6, jurisdiction=$7, category=$8, coverage_status=$9,
             is_active=$10, updated_at=NOW()
           WHERE id=$11 RETURNING ${MDA_SELECT}`,
          [value.name, value.slug, value.acronym, value.description, value.websiteUrl,
            value.entityType, value.jurisdiction, value.category, value.coverageStatus, value.isActive, id],
        );
        await audit(client, req, 'mda.updated', 'mda', id, oldValue, result.rows[0]);
        return result.rows[0];
      });
      res.json(updated);
    } catch (error) {
      try { handleDatabaseError(error, 'An MDA with this slug already exists.'); } catch (handled) { next(handled); }
    }
  });

  router.get('/services', async (req, res, next) => {
    try {
      const query = parse(paginationSchema, req.query);
      const conditions = [];
      const values = [];
      addSearch(conditions, values, query.search, ['s.name', 's.slug', 'm.name']);
      if (req.query.mdaId) {
        values.push(parse(idParamsSchema, { id: req.query.mdaId }).id);
        conditions.push(`s.mda_id = $${values.length}`);
      }
      const isActive = boolQuery(req.query.isActive);
      if (isActive !== undefined) {
        values.push(isActive);
        conditions.push(`s.is_active = $${values.length}`);
      }
      const sortColumns = { name: 's.name', createdAt: 's.created_at', updatedAt: 's.updated_at', mda: 'm.name' };
      const sort = sortColumns[query.sort] || 's.name';
      values.push(query.pageSize, (query.page - 1) * query.pageSize);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT ${SERVICE_SELECT}, COUNT(*) OVER() AS total_count
           FROM services s JOIN mdas m ON m.id=s.mda_id ${where}
          ORDER BY ${sort} ${query.order === 'desc' ? 'DESC' : 'ASC'}, s.id ASC
          LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      res.json(listResponse(result.rows, query.page, query.pageSize));
    } catch (error) { next(error); }
  });

  router.post('/services', async (req, res, next) => {
    try {
      const value = parse(serviceSchema, req.body);
      const created = await withTransaction(pool, async (client) => {
        const result = await client.query(
          `INSERT INTO services
            (mda_id,name,slug,description,category,jurisdiction,requirements,process_steps,notes,is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10)
           RETURNING id`,
          [value.mdaId, value.name, value.slug, value.description, value.category, value.jurisdiction,
            JSON.stringify(value.requirements), JSON.stringify(value.processSteps), value.notes, value.isActive],
        );
        const full = await client.query(
          `SELECT ${SERVICE_SELECT} FROM services s JOIN mdas m ON m.id=s.mda_id WHERE s.id=$1`,
          [result.rows[0].id],
        );
        await audit(client, req, 'service.created', 'service', result.rows[0].id, null, full.rows[0]);
        return full.rows[0];
      });
      res.status(201).json(created);
    } catch (error) {
      try { handleDatabaseError(error, 'This MDA already has a service with that slug.'); } catch (handled) { next(handled); }
    }
  });

  router.get('/services/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const result = await pool.query(
        `SELECT ${SERVICE_SELECT},
                (SELECT COUNT(*)::int FROM fee_options f WHERE f.service_id=s.id) AS "feeCount",
                (SELECT COUNT(*)::int FROM official_channels c WHERE c.service_id=s.id) AS "channelCount"
           FROM services s JOIN mdas m ON m.id=s.mda_id WHERE s.id=$1`,
        [id],
      );
      if (!result.rows[0]) throw notFound('Service');
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.patch('/services/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const value = parse(serviceSchema, req.body);
      const updated = await withTransaction(pool, async (client) => {
        const oldResult = await client.query(
          `SELECT ${SERVICE_SELECT} FROM services s JOIN mdas m ON m.id=s.mda_id WHERE s.id=$1 FOR UPDATE OF s`,
          [id],
        );
        const oldValue = oldResult.rows[0];
        if (!oldValue) throw notFound('Service');
        if (value.updatedAt && new Date(value.updatedAt).getTime() !== new Date(oldValue.updatedAt).getTime()) {
          throw conflict('This service was changed by another administrator. Refresh before saving.');
        }
        await client.query(
          `UPDATE services SET mda_id=$1,name=$2,slug=$3,description=$4,category=$5,
             jurisdiction=$6,requirements=$7::jsonb,process_steps=$8::jsonb,notes=$9,
             is_active=$10,updated_at=NOW() WHERE id=$11`,
          [value.mdaId, value.name, value.slug, value.description, value.category, value.jurisdiction,
            JSON.stringify(value.requirements), JSON.stringify(value.processSteps), value.notes, value.isActive, id],
        );
        const result = await client.query(
          `SELECT ${SERVICE_SELECT} FROM services s JOIN mdas m ON m.id=s.mda_id WHERE s.id=$1`, [id],
        );
        await audit(client, req, 'service.updated', 'service', id, oldValue, result.rows[0]);
        return result.rows[0];
      });
      res.json(updated);
    } catch (error) {
      try { handleDatabaseError(error, 'This MDA already has a service with that slug.'); } catch (handled) { next(handled); }
    }
  });

  router.get('/fees', async (req, res, next) => {
    try {
      const query = parse(paginationSchema, req.query);
      const conditions = [];
      const values = [];
      addSearch(conditions, values, query.search, ['f.label', 's.name', 'm.name']);
      for (const [queryKey, column] of [['serviceId', 'f.service_id'], ['mdaId', 'm.id']]) {
        if (req.query[queryKey]) {
          values.push(parse(idParamsSchema, { id: req.query[queryKey] }).id);
          conditions.push(`${column} = $${values.length}`);
        }
      }
      if (req.query.verificationStatus) {
        values.push(req.query.verificationStatus);
        conditions.push(`f.verification_status = $${values.length}`);
      }
      const isCurrent = boolQuery(req.query.isCurrent);
      if (isCurrent !== undefined) {
        values.push(isCurrent);
        conditions.push(`f.is_current = $${values.length}`);
      }
      const sortColumns = { createdAt: 'f.created_at', updatedAt: 'f.updated_at', service: 's.name', status: 'f.verification_status' };
      const sort = sortColumns[query.sort] || 'f.updated_at';
      values.push(query.pageSize, (query.page - 1) * query.pageSize);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT ${FEE_SELECT}, COUNT(*) OVER() AS total_count
           FROM fee_options f JOIN services s ON s.id=f.service_id JOIN mdas m ON m.id=s.mda_id ${where}
          ORDER BY ${sort} ${query.order === 'asc' ? 'ASC' : 'DESC'}, f.id DESC
          LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      res.json(listResponse(result.rows, query.page, query.pageSize));
    } catch (error) { next(error); }
  });

  router.post('/fees', async (req, res, next) => {
    try {
      const value = parse(feeSchema, req.body);
      const created = await withTransaction(pool, async (client) => {
        const result = await client.query(
          `INSERT INTO fee_options
            (service_id,pricing_model,currency,amount,min_amount,max_amount,percentage,
             formula,conditions,label,notes,is_current,verification_status,verified_at,next_review_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           RETURNING id`,
          [value.serviceId, value.pricingModel, value.currency, value.amount, value.minimumAmount,
            value.maximumAmount, value.percentage, value.formula, value.conditions, value.label,
            value.notes, value.isCurrent, value.verificationStatus, value.verifiedAt, value.nextReviewAt],
        );
        const full = await client.query(
          `SELECT ${FEE_SELECT} FROM fee_options f JOIN services s ON s.id=f.service_id
            JOIN mdas m ON m.id=s.mda_id WHERE f.id=$1`, [result.rows[0].id],
        );
        await audit(client, req, 'fee.created', 'fee_option', result.rows[0].id, null, full.rows[0]);
        return full.rows[0];
      });
      res.status(201).json(created);
    } catch (error) {
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  router.get('/fees/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const [feeResult, sourcesResult] = await Promise.all([
        pool.query(
          `SELECT ${FEE_SELECT} FROM fee_options f JOIN services s ON s.id=f.service_id
            JOIN mdas m ON m.id=s.mda_id WHERE f.id=$1`, [id],
        ),
        pool.query(
          `SELECT sources.id, sources.title, sources.source_type AS "sourceType",
                  sources.evidence_tier AS "evidenceTier", sources.publisher, sources.url,
                  sources.document_reference AS "documentReference",
                  sources.publication_date AS "publicationDate", sources.effective_date AS "effectiveDate",
                  sources.accessed_at AS "accessedAt", sources.notes,
                  sources.created_at AS "createdAt", sources.updated_at AS "updatedAt",
                  fs.excerpt, fs.page_or_section AS "pageOrSection", fs.is_primary AS "isPrimary"
             FROM fee_sources fs JOIN sources ON sources.id=fs.source_id
            WHERE fs.fee_option_id=$1 ORDER BY fs.is_primary DESC, sources.title`, [id],
        ),
      ]);
      if (!feeResult.rows[0]) throw notFound('Fee option');
      res.json({ ...feeResult.rows[0], sources: sourcesResult.rows });
    } catch (error) { next(error); }
  });

  router.patch('/fees/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const value = parse(feeSchema, req.body);
      const updated = await withTransaction(pool, async (client) => {
        const oldResult = await client.query('SELECT * FROM fee_options WHERE id=$1 FOR UPDATE', [id]);
        const oldValue = oldResult.rows[0];
        if (!oldValue) throw notFound('Fee option');
        if (value.updatedAt && new Date(value.updatedAt).getTime() !== new Date(oldValue.updated_at).getTime()) {
          throw conflict('This fee was changed by another administrator. Refresh before saving.');
        }
        await client.query(
          `UPDATE fee_options SET service_id=$1,pricing_model=$2,currency=$3,amount=$4,
             min_amount=$5,max_amount=$6,percentage=$7,formula=$8,conditions=$9,
             label=$10,notes=$11,is_current=$12,verification_status=$13,verified_at=$14,
             next_review_at=$15,updated_at=NOW() WHERE id=$16`,
          [value.serviceId, value.pricingModel, value.currency, value.amount, value.minimumAmount,
            value.maximumAmount, value.percentage, value.formula, value.conditions, value.label,
            value.notes, value.isCurrent, value.verificationStatus, value.verifiedAt, value.nextReviewAt, id],
        );
        const result = await client.query(
          `SELECT ${FEE_SELECT} FROM fee_options f JOIN services s ON s.id=f.service_id
            JOIN mdas m ON m.id=s.mda_id WHERE f.id=$1`, [id],
        );
        await audit(client, req, 'fee.updated', 'fee_option', id, oldValue, result.rows[0]);
        return result.rows[0];
      });
      res.json(updated);
    } catch (error) {
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  router.post('/fees/:id/supersede', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const value = parse(feeSupersessionSchema, req.body);
      if (value.newFee.verificationStatus === 'superseded' || !value.newFee.isCurrent) {
        throw new HttpError(400, 'The replacement fee must be current and must not already be superseded.');
      }

      const replacement = await withTransaction(pool, async (client) => {
        const oldResult = await client.query('SELECT * FROM fee_options WHERE id=$1 FOR UPDATE', [id]);
        const oldFee = oldResult.rows[0];
        if (!oldFee) throw notFound('Fee option');
        if (!oldFee.is_current) throw conflict('Only a current fee can be superseded.');
        if (Number(oldFee.service_id) !== Number(value.newFee.serviceId)) {
          throw new HttpError(400, 'A replacement fee must belong to the same service.');
        }

        const inserted = await client.query(
          `INSERT INTO fee_options
            (service_id,pricing_model,currency,amount,min_amount,max_amount,percentage,
             formula,conditions,label,notes,is_current,verification_status,verified_at,next_review_at,
             supersedes_fee_option_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE,$12,$13,$14,$15)
           RETURNING *`,
          [value.newFee.serviceId, value.newFee.pricingModel, value.newFee.currency, value.newFee.amount,
            value.newFee.minimumAmount, value.newFee.maximumAmount, value.newFee.percentage,
            value.newFee.formula, value.newFee.conditions, value.newFee.label, value.newFee.notes,
            value.newFee.verificationStatus, value.newFee.verifiedAt, value.newFee.nextReviewAt, id],
        );
        const newFee = inserted.rows[0];

        await client.query(
          `UPDATE fee_options SET is_current=FALSE, verification_status='superseded', updated_at=NOW()
            WHERE id=$1`, [id],
        );
        for (const sourceId of [...new Set(value.sourceIds)]) {
          await client.query(
            `INSERT INTO fee_sources (fee_option_id,source_id,is_primary)
             VALUES ($1,$2,FALSE)`, [newFee.id, sourceId],
          );
        }
        await client.query(
          `INSERT INTO verification_events
            (service_id,fee_option_id,status,checked_at,checked_by,notes,actor_admin_user_id,
             evidence_summary,verification_method,previous_values,new_values)
           VALUES ($1,$2,$3,COALESCE($4,NOW()),$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb)`,
          [newFee.service_id, newFee.id, newFee.verification_status, value.checkedAt,
            req.admin.display_name, value.reason, req.admin.id, value.evidenceSummary,
            value.verificationMethod, JSON.stringify(oldFee), JSON.stringify(newFee)],
        );
        await audit(client, req, 'fee.superseded', 'fee_option', id, oldFee, {
          replacementFeeOptionId: newFee.id,
          reason: value.reason,
        });
        await audit(client, req, 'fee.created_as_replacement', 'fee_option', newFee.id, null, newFee);
        return newFee;
      });
      res.status(201).json(replacement);
    } catch (error) {
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  router.post('/fees/:id/sources', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const value = parse(sourceLinkSchema, req.body);
      const link = await withTransaction(pool, async (client) => {
        const fee = await client.query('SELECT id FROM fee_options WHERE id=$1', [id]);
        if (!fee.rows[0]) throw notFound('Fee option');
        const result = await client.query(
          `INSERT INTO fee_sources (fee_option_id,source_id,excerpt,page_or_section,is_primary)
           VALUES ($1,$2,$3,$4,$5) RETURNING fee_option_id AS "feeOptionId", source_id AS "sourceId",
             excerpt, page_or_section AS "pageOrSection", is_primary AS "isPrimary", created_at AS "createdAt"`,
          [id, value.sourceId, value.excerpt, value.pageOrSection, value.isPrimary],
        );
        await audit(client, req, 'fee.source_linked', 'fee_option', id, null, result.rows[0]);
        return result.rows[0];
      });
      res.status(201).json(link);
    } catch (error) {
      if (error?.code === '23505') return next(conflict('This source is already linked to the fee.'));
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  router.delete('/fees/:id/sources/:sourceId', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, { id: req.params.id });
      const { id: sourceId } = parse(idParamsSchema, { id: req.params.sourceId });
      await withTransaction(pool, async (client) => {
        const result = await client.query(
          'DELETE FROM fee_sources WHERE fee_option_id=$1 AND source_id=$2 RETURNING *', [id, sourceId],
        );
        if (!result.rows[0]) throw notFound('Fee/source link');
        await audit(client, req, 'fee.source_unlinked', 'fee_option', id, result.rows[0], null);
      });
      res.status(204).end();
    } catch (error) { next(error); }
  });

  router.get('/sources', async (req, res, next) => {
    try {
      const query = parse(paginationSchema, req.query);
      const conditions = [];
      const values = [];
      addSearch(conditions, values, query.search, ['title', 'publisher', 'document_reference']);
      if (req.query.sourceType) {
        values.push(req.query.sourceType);
        conditions.push(`source_type = $${values.length}`);
      }
      const sortColumns = { title: 'title', createdAt: 'created_at', publicationDate: 'publication_date' };
      const sort = sortColumns[query.sort] || 'title';
      values.push(query.pageSize, (query.page - 1) * query.pageSize);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT ${SOURCE_SELECT}, COUNT(*) OVER() AS total_count FROM sources ${where}
          ORDER BY ${sort} ${query.order === 'desc' ? 'DESC' : 'ASC'}, id ASC
          LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      res.json(listResponse(result.rows, query.page, query.pageSize));
    } catch (error) { next(error); }
  });

  router.post('/sources', async (req, res, next) => {
    try {
      const value = parse(sourceSchema, req.body);
      const created = await withTransaction(pool, async (client) => {
        const result = await client.query(
          `INSERT INTO sources
            (title,source_type,evidence_tier,publisher,url,document_reference,publication_date,
             effective_date,accessed_at,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,NOW()),$10) RETURNING ${SOURCE_SELECT}`,
          [value.title, value.sourceType, value.evidenceTier, value.publisher, value.url,
            value.documentReference, value.publicationDate, value.effectiveDate, value.accessedAt, value.notes],
        );
        await audit(client, req, 'source.created', 'source', result.rows[0].id, null, result.rows[0]);
        return result.rows[0];
      });
      res.status(201).json(created);
    } catch (error) {
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  router.get('/sources/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const result = await pool.query(`SELECT ${SOURCE_SELECT} FROM sources WHERE id=$1`, [id]);
      if (!result.rows[0]) throw notFound('Source');
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.patch('/sources/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const value = parse(sourceSchema, req.body);
      const updated = await withTransaction(pool, async (client) => {
        const oldResult = await client.query(`SELECT ${SOURCE_SELECT} FROM sources WHERE id=$1 FOR UPDATE`, [id]);
        const oldValue = oldResult.rows[0];
        if (!oldValue) throw notFound('Source');
        if (value.updatedAt && new Date(value.updatedAt).getTime() !== new Date(oldValue.updatedAt).getTime()) {
          throw conflict('This source was changed by another administrator. Refresh before saving.');
        }
        const result = await client.query(
          `UPDATE sources SET title=$1,source_type=$2,evidence_tier=$3,publisher=$4,url=$5,
             document_reference=$6,publication_date=$7,effective_date=$8,accessed_at=COALESCE($9,accessed_at),
             notes=$10,updated_at=NOW() WHERE id=$11 RETURNING ${SOURCE_SELECT}`,
          [value.title, value.sourceType, value.evidenceTier, value.publisher, value.url,
            value.documentReference, value.publicationDate, value.effectiveDate, value.accessedAt, value.notes, id],
        );
        await audit(client, req, 'source.updated', 'source', id, oldValue, result.rows[0]);
        return result.rows[0];
      });
      res.json(updated);
    } catch (error) {
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  router.get('/channels', async (req, res, next) => {
    try {
      const query = parse(paginationSchema, req.query);
      const conditions = [];
      const values = [];
      addSearch(conditions, values, query.search, ['c.name', 's.name', 'm.name', 'c.url']);
      if (req.query.serviceId) {
        values.push(parse(idParamsSchema, { id: req.query.serviceId }).id);
        conditions.push(`c.service_id = $${values.length}`);
      }
      values.push(query.pageSize, (query.page - 1) * query.pageSize);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT ${CHANNEL_SELECT}, COUNT(*) OVER() AS total_count
           FROM official_channels c
           LEFT JOIN services s ON s.id=c.service_id
           LEFT JOIN mdas m ON m.id=COALESCE(s.mda_id, c.mda_id) ${where}
          ORDER BY c.updated_at DESC, c.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      res.json(listResponse(result.rows, query.page, query.pageSize));
    } catch (error) { next(error); }
  });

  router.post('/channels', async (req, res, next) => {
    try {
      const value = parse(channelSchema, req.body);
      const created = await withTransaction(pool, async (client) => {
        const result = await client.query(
          `INSERT INTO official_channels
            (service_id,mda_id,channel_type,name,url,contact_value,instructions,is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [value.serviceId || null, value.mdaId || null, value.channelType, value.name, value.url,
            value.contactValue, value.instructions, value.isActive],
        );
        const full = await client.query(
          `SELECT ${CHANNEL_SELECT} FROM official_channels c
           LEFT JOIN services s ON s.id=c.service_id
           LEFT JOIN mdas m ON m.id=COALESCE(s.mda_id, c.mda_id) WHERE c.id=$1`,
          [result.rows[0].id],
        );
        await audit(client, req, 'channel.created', 'official_channel', result.rows[0].id, null, full.rows[0]);
        return full.rows[0];
      });
      res.status(201).json(created);
    } catch (error) {
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  router.get('/channels/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const result = await pool.query(
        `SELECT ${CHANNEL_SELECT} FROM official_channels c
         LEFT JOIN services s ON s.id=c.service_id
         LEFT JOIN mdas m ON m.id=COALESCE(s.mda_id, c.mda_id) WHERE c.id=$1`, [id],
      );
      if (!result.rows[0]) throw notFound('Official channel');
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.patch('/channels/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const value = parse(channelSchema, req.body);
      const updated = await withTransaction(pool, async (client) => {
        const oldResult = await client.query('SELECT * FROM official_channels WHERE id=$1 FOR UPDATE', [id]);
        const oldValue = oldResult.rows[0];
        if (!oldValue) throw notFound('Official channel');
        if (value.updatedAt && new Date(value.updatedAt).getTime() !== new Date(oldValue.updated_at).getTime()) {
          throw conflict('This channel was changed by another administrator. Refresh before saving.');
        }
        await client.query(
          `UPDATE official_channels SET service_id=$1,mda_id=$2,channel_type=$3,name=$4,url=$5,
             contact_value=$6,instructions=$7,is_active=$8,updated_at=NOW() WHERE id=$9`,
          [value.serviceId || null, value.mdaId || null, value.channelType, value.name, value.url,
            value.contactValue, value.instructions, value.isActive, id],
        );
        const result = await client.query(
          `SELECT ${CHANNEL_SELECT} FROM official_channels c
           LEFT JOIN services s ON s.id=c.service_id
           LEFT JOIN mdas m ON m.id=COALESCE(s.mda_id, c.mda_id) WHERE c.id=$1`, [id],
        );
        await audit(client, req, 'channel.updated', 'official_channel', id, oldValue, result.rows[0]);
        return result.rows[0];
      });
      res.json(updated);
    } catch (error) {
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  return router;
}

module.exports = { createContentRouter };
