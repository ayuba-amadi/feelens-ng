-- FeeLens NG: temporarily remove AGIS / FCT Lands from public discovery.
-- Non-destructive: retain the MDA, services, sources, channels and history.
-- Apply only after the normal production backup and migration review.

BEGIN;

SET LOCAL search_path TO feelens_app;

UPDATE mdas
   SET coverage_status = 'inactive',
       is_active = FALSE,
       updated_at = NOW()
 WHERE slug = 'agis';

UPDATE official_channels c
   SET is_active = FALSE,
       updated_at = NOW()
  FROM mdas m
 WHERE c.mda_id = m.id
   AND m.slug = 'agis';

COMMIT;
