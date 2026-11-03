-- FeeLens NG: MDA publication order and priority support.
-- PostgreSQL 13 compatible. Non-destructive migration.
-- Review and back up the production database before applying.

BEGIN;

SET LOCAL search_path TO feelens_app, public;

ALTER TABLE mdas
  ADD COLUMN IF NOT EXISTS publication_priority INTEGER NOT NULL DEFAULT 100;

CREATE INDEX IF NOT EXISTS idx_mdas_publication_priority ON mdas (publication_priority, name);

-- Assign requested sequence for top priority MDAs
-- 1. OFO (retained in position 1 if exists or when added)
-- 2. NIMC — National Identity Management Commission
-- 3. CAC — Corporate Affairs Commission
-- 4. NIPC — Nigerian Investment Promotion Commission
-- 5. NIS — Nigeria Immigration Service

UPDATE mdas SET publication_priority = 1 WHERE slug = 'ofo';
UPDATE mdas SET publication_priority = 2 WHERE slug = 'nimc';
UPDATE mdas SET publication_priority = 3 WHERE slug = 'cac';
UPDATE mdas SET publication_priority = 4 WHERE slug = 'nipc';
UPDATE mdas SET publication_priority = 5 WHERE slug = 'nigeria-immigration-service';

COMMIT;
