-- FeeLens NG administrator authentication foundation.
-- No administrator account is inserted by this migration.

CREATE TABLE admin_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX admin_users_lower_email_uidx ON admin_users (LOWER(email));

ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_actor_admin_user_fk
    FOREIGN KEY (actor_admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL;

-- Schema used by connect-pg-simple for server-side Express sessions.
CREATE TABLE user_sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX user_sessions_expire_idx ON user_sessions (expire);

