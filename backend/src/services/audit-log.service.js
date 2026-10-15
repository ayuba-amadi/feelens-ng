async function recordAuditLog(pool, {
  actorAdminUserId,
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null
}) {
  await pool.query(
    `INSERT INTO audit_logs
      (actor_admin_user_id, action, entity_type, entity_id, old_values, new_values)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
    [
      actorAdminUserId,
      action,
      entityType,
      entityId,
      oldValues === null ? null : JSON.stringify(oldValues),
      newValues === null ? null : JSON.stringify(newValues)
    ]
  );
}

module.exports = { recordAuditLog };

