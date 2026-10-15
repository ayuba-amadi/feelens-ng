async function findAdminByEmail(pool, email) {
  const result = await pool.query(
    `SELECT id, email, password_hash, display_name, role, is_active
     FROM admin_users
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
}

async function findActiveAdminById(pool, id) {
  const result = await pool.query(
    `SELECT id, email, display_name, role, is_active
     FROM admin_users
     WHERE id = $1 AND is_active = TRUE AND role = 'admin'
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateLastLogin(pool, id) {
  await pool.query(
    'UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
    [id]
  );
}

module.exports = { findAdminByEmail, findActiveAdminById, updateLastLogin };

