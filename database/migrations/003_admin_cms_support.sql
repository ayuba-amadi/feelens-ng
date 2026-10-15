-- FeeLens NG Phase 3: administration/CMS support
-- PostgreSQL 13 compatible. This migration is intentionally non-destructive.
-- Review and back up the production database before applying this migration later.

BEGIN;

ALTER TABLE mdas
  ADD COLUMN IF NOT EXISTS acronym TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS jurisdiction TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS coverage_status TEXT NOT NULL DEFAULT 'pilot',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS jurisdiction TEXT,
  ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS process_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE fee_options
  ADD COLUMN IF NOT EXISTS conditions TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS supersedes_fee_option_id BIGINT REFERENCES fee_options(id) ON DELETE RESTRICT;

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE verification_events
  ADD COLUMN IF NOT EXISTS actor_admin_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence_summary TEXT,
  ADD COLUMN IF NOT EXISTS verification_method TEXT,
  ADD COLUMN IF NOT EXISTS previous_values JSONB,
  ADD COLUMN IF NOT EXISTS new_values JSONB;

ALTER TABLE foi_requests
  ADD COLUMN IF NOT EXISTS subject TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mdas_coverage_status_check'
  ) THEN
    ALTER TABLE mdas ADD CONSTRAINT mdas_coverage_status_check
      CHECK (coverage_status IN ('pilot', 'roadmap', 'inactive')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_requirements_array_check'
  ) THEN
    ALTER TABLE services ADD CONSTRAINT services_requirements_array_check
      CHECK (jsonb_typeof(requirements) = 'array') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'services_process_steps_array_check'
  ) THEN
    ALTER TABLE services ADD CONSTRAINT services_process_steps_array_check
      CHECK (jsonb_typeof(process_steps) = 'array') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fee_options_verification_status_check'
  ) THEN
    ALTER TABLE fee_options ADD CONSTRAINT fee_options_verification_status_check
      CHECK (verification_status IN ('verified', 'pending', 'conflicting', 'unable_to_verify', 'superseded')) NOT VALID;
  END IF;
END $$;

ALTER TABLE mdas VALIDATE CONSTRAINT mdas_coverage_status_check;
ALTER TABLE services VALIDATE CONSTRAINT services_requirements_array_check;
ALTER TABLE services VALIDATE CONSTRAINT services_process_steps_array_check;
ALTER TABLE fee_options VALIDATE CONSTRAINT fee_options_verification_status_check;

CREATE INDEX IF NOT EXISTS idx_mdas_active_name ON mdas (is_active, name);
CREATE INDEX IF NOT EXISTS idx_mdas_coverage_status ON mdas (coverage_status);
CREATE INDEX IF NOT EXISTS idx_services_active_mda ON services (is_active, mda_id);
CREATE INDEX IF NOT EXISTS idx_fee_options_status_current ON fee_options (verification_status, is_current);
CREATE INDEX IF NOT EXISTS idx_fee_options_supersedes ON fee_options (supersedes_fee_option_id);
CREATE INDEX IF NOT EXISTS idx_sources_title ON sources (title);
CREATE INDEX IF NOT EXISTS idx_verification_events_actor ON verification_events (actor_admin_user_id);
CREATE INDEX IF NOT EXISTS idx_verification_events_checked_at ON verification_events (checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs (actor_admin_user_id, created_at DESC);

COMMIT;
