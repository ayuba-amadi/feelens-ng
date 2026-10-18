-- FeeLens NG production manifest support.
-- PostgreSQL 13 compatible. Review and back up the production database before applying.

BEGIN;

-- The production application schema is deliberately isolated from the legacy
-- public prototype schema. A missing feelens_app schema should fail loudly.
SET LOCAL search_path TO feelens_app;

-- The manifest distinguishes more official evidence types than the original CMS enum.
ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_source_type_check;
ALTER TABLE sources ADD CONSTRAINT sources_source_type_check CHECK (source_type IN (
  'act', 'regulation', 'gazette', 'statutory_instrument',
  'approved_fee_schedule', 'official_circular', 'official_website',
  'official_portal', 'official_notice', 'official_faq', 'official_fee_page',
  'official_process_page', 'service_level_agreement', 'gazette_fee_schedule',
  'official_statement', 'official_bulletin', 'official_training_material',
  'official_guideline', 'official_tariff_page', 'correspondence',
  'foi_response', 'other'
)) NOT VALID;
ALTER TABLE sources VALIDATE CONSTRAINT sources_source_type_check;

-- Keep MDA-wide official hubs without duplicating them onto every service.
ALTER TABLE official_channels
  ADD COLUMN IF NOT EXISTS mda_id BIGINT REFERENCES mdas(id) ON DELETE RESTRICT;
ALTER TABLE official_channels ALTER COLUMN service_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'official_channels_one_owner_check'
      AND conrelid = 'official_channels'::regclass
  ) THEN
    ALTER TABLE official_channels ADD CONSTRAINT official_channels_one_owner_check
      CHECK (num_nonnulls(service_id, mda_id) = 1) NOT VALID;
  END IF;
END $$;

ALTER TABLE official_channels VALIDATE CONSTRAINT official_channels_one_owner_check;
CREATE INDEX IF NOT EXISTS official_channels_mda_id_idx ON official_channels (mda_id);

COMMIT;
