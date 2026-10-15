const express = require('express');
const argon2 = require('argon2');
const { recordAuditLog } = require('../../services/audit-log.service');
const { withTransaction } = require('../../utils/database');
const { createCsrfToken, sessionRegenerate, sessionSave } = require('../../utils/session-security');
const { HttpError, notFound, conflict } = require('../../utils/http-error');
const {
  accountUpdateSchema,
  adminCreateSchema,
  adminUpdateSchema,
  foiSchema,
  idParamsSchema,
  paginationSchema,
  passwordChangeSchema,
  verificationSchema,
  verificationStatuses,
} = require('../../validation/admin.schemas');
const {
  handleDatabaseError,
  paginationMeta,
  parse,
  stripCount,
} = require('./route-helpers');

const FOI_SELECT = `
  f.id, f.service_id AS "serviceId", f.requesting_body AS "requestingBody",
  f.subject, f.request_reference AS "requestReference", f.submitted_at AS "submittedAt",
  f.responded_at AS "respondedAt", f.status, f.request_text AS "requestText",
  f.response_summary AS "responseSummary", f.source_id AS "sourceId",
  f.created_at AS "createdAt", f.updated_at AS "updatedAt",
  s.name AS "serviceName", m.name AS "mdaName"`;

function listResponse(rows, page, pageSize) {
  return {
    items: rows.map(stripCount),
    pagination: paginationMeta(rows, page, pageSize),
  };
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

function createGovernanceRouter(pool) {
  const router = express.Router();

  router.get('/verifications', async (req, res, next) => {
    try {
      const query = parse(paginationSchema, req.query);
      const conditions = [];
      const values = [];
      if (req.query.status) {
        if (!verificationStatuses.includes(req.query.status)) throw new HttpError(400, 'Invalid verification status.');
        values.push(req.query.status);
        conditions.push(`ve.status=$${values.length}`);
      }
      if (req.query.serviceId) {
        values.push(parse(idParamsSchema, { id: req.query.serviceId }).id);
        conditions.push(`ve.service_id=$${values.length}`);
      }
      if (req.query.mdaId) {
        values.push(parse(idParamsSchema, { id: req.query.mdaId }).id);
        conditions.push(`m.id=$${values.length}`);
      }
      if (query.search) {
        values.push(`%${query.search}%`);
        conditions.push(`(s.name ILIKE $${values.length} OR m.name ILIKE $${values.length}
          OR ve.evidence_summary ILIKE $${values.length})`);
      }
      values.push(query.pageSize, (query.page - 1) * query.pageSize);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT ve.id, ve.service_id AS "serviceId", ve.fee_option_id AS "feeOptionId",
                ve.source_id AS "sourceId", ve.status, ve.checked_at AS "checkedAt",
                ve.checked_by AS "checkedBy", ve.notes, ve.evidence_summary AS "evidenceSummary",
                ve.verification_method AS "verificationMethod", ve.previous_values AS "previousValues",
                ve.new_values AS "newValues", ve.actor_admin_user_id AS "actorAdminUserId",
                s.name AS "serviceName", m.name AS "mdaName", au.display_name AS "reviewerName",
                COUNT(*) OVER() AS total_count
           FROM verification_events ve JOIN services s ON s.id=ve.service_id
           JOIN mdas m ON m.id=s.mda_id LEFT JOIN admin_users au ON au.id=ve.actor_admin_user_id
           ${where} ORDER BY ve.checked_at DESC, ve.id DESC
           LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      res.json(listResponse(result.rows, query.page, query.pageSize));
    } catch (error) { next(error); }
  });

  router.post('/verifications', async (req, res, next) => {
    try {
      const value = parse(verificationSchema, req.body);
      const created = await withTransaction(pool, async (client) => {
        let previousValues = null;
        let newValues = null;
        if (value.feeOptionId) {
          const feeResult = await client.query(
            'SELECT * FROM fee_options WHERE id=$1 AND service_id=$2 FOR UPDATE',
            [value.feeOptionId, value.serviceId],
          );
          if (!feeResult.rows[0]) throw new HttpError(400, 'The selected fee does not belong to the selected service.');
          previousValues = feeResult.rows[0];
          await client.query(
            `UPDATE fee_options SET verification_status=$1,
               verified_at=CASE WHEN $1='verified' THEN COALESCE($2,NOW()) ELSE verified_at END,
               is_current=CASE WHEN $1='superseded' THEN FALSE ELSE is_current END,
               updated_at=NOW() WHERE id=$3`,
            [value.status, value.checkedAt, value.feeOptionId],
          );
          const updatedFee = await client.query('SELECT * FROM fee_options WHERE id=$1', [value.feeOptionId]);
          newValues = updatedFee.rows[0];
        }
        const result = await client.query(
          `INSERT INTO verification_events
            (service_id,fee_option_id,source_id,status,checked_at,checked_by,notes,
             actor_admin_user_id,evidence_summary,verification_method,previous_values,new_values)
           VALUES ($1,$2,$3,$4,COALESCE($5,NOW()),$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb)
           RETURNING id, service_id AS "serviceId", fee_option_id AS "feeOptionId",
             source_id AS "sourceId", status, checked_at AS "checkedAt", checked_by AS "checkedBy",
             notes, actor_admin_user_id AS "actorAdminUserId", evidence_summary AS "evidenceSummary",
             verification_method AS "verificationMethod", previous_values AS "previousValues",
             new_values AS "newValues"`,
          [value.serviceId, value.feeOptionId, value.sourceId, value.status, value.checkedAt,
            req.admin.display_name, value.notes, req.admin.id, value.evidenceSummary,
            value.verificationMethod, previousValues && JSON.stringify(previousValues),
            newValues && JSON.stringify(newValues)],
        );
        await audit(client, req, 'verification.created', 'verification_event', result.rows[0].id, null, result.rows[0]);
        return result.rows[0];
      });
      res.status(201).json(created);
    } catch (error) {
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  router.get('/foi', async (req, res, next) => {
    try {
      const query = parse(paginationSchema, req.query);
      const conditions = [];
      const values = [];
      if (query.search) {
        values.push(`%${query.search}%`);
        conditions.push(`(f.requesting_body ILIKE $${values.length} OR f.subject ILIKE $${values.length}
          OR f.request_reference ILIKE $${values.length})`);
      }
      if (req.query.status) {
        values.push(req.query.status);
        conditions.push(`f.status=$${values.length}`);
      }
      values.push(query.pageSize, (query.page - 1) * query.pageSize);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT ${FOI_SELECT}, COUNT(*) OVER() AS total_count
           FROM foi_requests f LEFT JOIN services s ON s.id=f.service_id
           LEFT JOIN mdas m ON m.id=s.mda_id ${where}
          ORDER BY f.updated_at DESC, f.id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      res.json(listResponse(result.rows, query.page, query.pageSize));
    } catch (error) { next(error); }
  });

  router.post('/foi', async (req, res, next) => {
    try {
      const value = parse(foiSchema, req.body);
      const created = await withTransaction(pool, async (client) => {
        const result = await client.query(
          `INSERT INTO foi_requests
            (service_id,requesting_body,subject,request_reference,submitted_at,responded_at,
             status,request_text,response_summary,source_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [value.serviceId, value.requestingBody, value.subject, value.requestReference,
            value.submittedAt, value.respondedAt, value.status, value.requestText,
            value.responseSummary, value.sourceId],
        );
        const full = await client.query(
          `SELECT ${FOI_SELECT} FROM foi_requests f LEFT JOIN services s ON s.id=f.service_id
            LEFT JOIN mdas m ON m.id=s.mda_id WHERE f.id=$1`, [result.rows[0].id],
        );
        await audit(client, req, 'foi.created', 'foi_request', result.rows[0].id, null, full.rows[0]);
        return full.rows[0];
      });
      res.status(201).json(created);
    } catch (error) {
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  router.get('/foi/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const result = await pool.query(
        `SELECT ${FOI_SELECT} FROM foi_requests f LEFT JOIN services s ON s.id=f.service_id
          LEFT JOIN mdas m ON m.id=s.mda_id WHERE f.id=$1`, [id],
      );
      if (!result.rows[0]) throw notFound('Formal request');
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });

  router.patch('/foi/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const value = parse(foiSchema, req.body);
      const updated = await withTransaction(pool, async (client) => {
        const oldResult = await client.query('SELECT * FROM foi_requests WHERE id=$1 FOR UPDATE', [id]);
        const oldValue = oldResult.rows[0];
        if (!oldValue) throw notFound('Formal request');
        if (value.updatedAt && new Date(value.updatedAt).getTime() !== new Date(oldValue.updated_at).getTime()) {
          throw conflict('This request was changed by another administrator. Refresh before saving.');
        }
        await client.query(
          `UPDATE foi_requests SET service_id=$1,requesting_body=$2,subject=$3,request_reference=$4,
             submitted_at=$5,responded_at=$6,status=$7,request_text=$8,response_summary=$9,
             source_id=$10,updated_at=NOW() WHERE id=$11`,
          [value.serviceId, value.requestingBody, value.subject, value.requestReference,
            value.submittedAt, value.respondedAt, value.status, value.requestText,
            value.responseSummary, value.sourceId, id],
        );
        const result = await client.query(
          `SELECT ${FOI_SELECT} FROM foi_requests f LEFT JOIN services s ON s.id=f.service_id
            LEFT JOIN mdas m ON m.id=s.mda_id WHERE f.id=$1`, [id],
        );
        await audit(client, req, 'foi.updated', 'foi_request', id, oldValue, result.rows[0]);
        return result.rows[0];
      });
      res.json(updated);
    } catch (error) {
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  router.get('/audit-logs', async (req, res, next) => {
    try {
      const query = parse(paginationSchema, req.query);
      const conditions = [];
      const values = [];
      if (query.search) {
        values.push(`%${query.search}%`);
        conditions.push(`(al.action ILIKE $${values.length} OR al.entity_type ILIKE $${values.length})`);
      }
      if (req.query.action) {
        values.push(req.query.action);
        conditions.push(`al.action=$${values.length}`);
      }
      if (req.query.entityType) {
        values.push(req.query.entityType);
        conditions.push(`al.entity_type=$${values.length}`);
      }
      values.push(query.pageSize, (query.page - 1) * query.pageSize);
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT al.id, al.actor_admin_user_id AS "actorAdminUserId", al.action,
                al.entity_type AS "entityType", al.entity_id AS "entityId",
                al.old_values AS "oldValues", al.new_values AS "newValues",
                al.created_at AS "createdAt", au.display_name AS "actorName", au.email AS "actorEmail",
                COUNT(*) OVER() AS total_count
           FROM audit_logs al LEFT JOIN admin_users au ON au.id=al.actor_admin_user_id
           ${where} ORDER BY al.created_at DESC, al.id DESC
           LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      res.json(listResponse(result.rows, query.page, query.pageSize));
    } catch (error) { next(error); }
  });

  router.get('/users', async (req, res, next) => {
    try {
      const query = parse(paginationSchema, req.query);
      const values = [];
      let where = '';
      if (query.search) {
        values.push(`%${query.search}%`);
        where = `WHERE email ILIKE $1 OR display_name ILIKE $1`;
      }
      values.push(query.pageSize, (query.page - 1) * query.pageSize);
      const result = await pool.query(
        `SELECT id,email,display_name AS "displayName",role,is_active AS "isActive",
                last_login_at AS "lastLoginAt",created_at AS "createdAt",updated_at AS "updatedAt",
                COUNT(*) OVER() AS total_count
           FROM admin_users ${where} ORDER BY display_name, id
           LIMIT $${values.length - 1} OFFSET $${values.length}`,
        values,
      );
      res.json(listResponse(result.rows, query.page, query.pageSize));
    } catch (error) { next(error); }
  });

  router.post('/users', async (req, res, next) => {
    try {
      const value = parse(adminCreateSchema, req.body);
      const passwordHash = await argon2.hash(value.password, { type: argon2.argon2id });
      const created = await withTransaction(pool, async (client) => {
        const result = await client.query(
          `INSERT INTO admin_users (email,password_hash,display_name,role)
           VALUES ($1,$2,$3,$4)
           RETURNING id,email,display_name AS "displayName",role,is_active AS "isActive",
             created_at AS "createdAt",updated_at AS "updatedAt"`,
          [value.email, passwordHash, value.displayName, value.role],
        );
        await audit(client, req, 'admin_user.created', 'admin_user', result.rows[0].id, null, result.rows[0]);
        return result.rows[0];
      });
      res.status(201).json(created);
    } catch (error) {
      try { handleDatabaseError(error, 'An administrator with this email already exists.'); } catch (handled) { next(handled); }
    }
  });

  router.patch('/users/:id', async (req, res, next) => {
    try {
      const { id } = parse(idParamsSchema, req.params);
      const value = parse(adminUpdateSchema, req.body);
      const updated = await withTransaction(pool, async (client) => {
        const oldResult = await client.query(
          `SELECT id,email,display_name AS "displayName",role,is_active AS "isActive",
                  created_at AS "createdAt",updated_at AS "updatedAt"
             FROM admin_users WHERE id=$1 FOR UPDATE`, [id],
        );
        const oldValue = oldResult.rows[0];
        if (!oldValue) throw notFound('Administrator');
        if (value.updatedAt && new Date(value.updatedAt).getTime() !== new Date(oldValue.updatedAt).getTime()) {
          throw conflict('This administrator was changed by someone else. Refresh before saving.');
        }
        const isActive = value.isActive ?? oldValue.isActive;
        if (!isActive && Number(id) === Number(req.admin.id)) {
          throw new HttpError(400, 'You cannot deactivate your own administrator account.');
        }
        if (!isActive && oldValue.isActive) {
          const activeResult = await client.query('SELECT COUNT(*)::int AS count FROM admin_users WHERE is_active');
          if (activeResult.rows[0].count <= 1) throw new HttpError(400, 'At least one active administrator is required.');
        }
        const result = await client.query(
          `UPDATE admin_users SET display_name=$1,role=$2,is_active=$3,updated_at=NOW()
            WHERE id=$4 RETURNING id,email,display_name AS "displayName",role,is_active AS "isActive",
              last_login_at AS "lastLoginAt",created_at AS "createdAt",updated_at AS "updatedAt"`,
          [value.displayName ?? oldValue.displayName, value.role ?? oldValue.role, isActive, id],
        );
        await audit(client, req, 'admin_user.updated', 'admin_user', id, oldValue, result.rows[0]);
        return result.rows[0];
      });
      res.json(updated);
    } catch (error) {
      try { handleDatabaseError(error); } catch (handled) { next(handled); }
    }
  });

  router.get('/account', (req, res) => {
    res.json({
      id: req.admin.id,
      email: req.admin.email,
      displayName: req.admin.display_name,
      role: req.admin.role,
    });
  });

  router.patch('/account', async (req, res, next) => {
    try {
      const value = parse(accountUpdateSchema, req.body);
      const updated = await withTransaction(pool, async (client) => {
        const result = await client.query(
          `UPDATE admin_users SET display_name=$1,updated_at=NOW() WHERE id=$2
           RETURNING id,email,display_name AS "displayName",role,updated_at AS "updatedAt"`,
          [value.displayName, req.admin.id],
        );
        await audit(client, req, 'admin_account.updated', 'admin_user', req.admin.id,
          { displayName: req.admin.display_name }, result.rows[0]);
        return result.rows[0];
      });
      res.json(updated);
    } catch (error) { next(error); }
  });

  router.post('/account/password', async (req, res, next) => {
    try {
      const value = parse(passwordChangeSchema, req.body);
      const result = await pool.query('SELECT password_hash FROM admin_users WHERE id=$1 AND is_active', [req.admin.id]);
      if (!result.rows[0] || !(await argon2.verify(result.rows[0].password_hash, value.currentPassword))) {
        throw new HttpError(400, 'Current password is incorrect.');
      }
      const passwordHash = await argon2.hash(value.newPassword, { type: argon2.argon2id });
      await withTransaction(pool, async (client) => {
        await client.query('UPDATE admin_users SET password_hash=$1,updated_at=NOW() WHERE id=$2',
          [passwordHash, req.admin.id]);
        await audit(client, req, 'admin_account.password_changed', 'admin_user', req.admin.id, null,
          { passwordChanged: true });
      });

      await sessionRegenerate(req.session);
      req.session.adminUserId = req.admin.id;
      req.session.csrfToken = createCsrfToken();
      await sessionSave(req.session);
      await pool.query(
        `DELETE FROM user_sessions WHERE sess->>'adminUserId'=$1 AND sid<>$2`,
        [String(req.admin.id), req.sessionID],
      );
      res.json({ success: true, csrfToken: req.session.csrfToken });
    } catch (error) { next(error); }
  });

  return router;
}

module.exports = { createGovernanceRouter };
