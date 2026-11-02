-- Non-destructive CAC catalogue grouping and fee-option normalization.
-- Apply manually after taking a production database backup.
BEGIN;
SET LOCAL search_path TO feelens_app, public;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS catalogue_group TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'services_catalogue_group_check'
       AND conrelid = 'feelens_app.services'::regclass
  ) THEN
    ALTER TABLE services ADD CONSTRAINT services_catalogue_group_check
      CHECK (catalogue_group IS NULL OR catalogue_group IN ('registration', 'change_of_name', 'other')) NOT VALID;
  END IF;
END $$;
ALTER TABLE services VALIDATE CONSTRAINT services_catalogue_group_check;

DO $$
DECLARE matched_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO matched_count
    FROM services s JOIN mdas m ON m.id = s.mda_id
   WHERE m.slug = 'cac'
     AND s.slug IN (
       'business-name-registration-ctc-registration-documents',
       'company-with-share-capital-small-private-other-than-small',
       'cac-007-incorporation-of-incorporated-trustees',
       'cac-008-registration-of-limited-partnership',
       'cac-009-registration-of-limited-liability-partnership',
       'cac-010-change-of-name-business-name',
       'cac-011-change-of-name-company',
       'cac-012-change-of-name-incorporated-trustees',
       'cac-013-change-of-name-limited-partnership',
       'cac-014-change-of-name-limited-liability-partnership'
     );
  IF matched_count <> 10 THEN
    RAISE EXCEPTION 'CAC curation expected exactly 10 matched services; found %; no changes applied.', matched_count;
  END IF;
END $$;

DO $$
DECLARE
  current_formula_count INTEGER;
  current_fee_count INTEGER;
  normalized_tier_count INTEGER;
BEGIN
  SELECT COUNT(*) FILTER (WHERE f.pricing_model = 'formula'), COUNT(*),
         COUNT(*) FILTER (WHERE f.pricing_model = 'fixed' AND
           ((f.label = 'Small Company' AND f.amount = 10000) OR
            (f.label = 'Company other than Small Company and LTD/GTE' AND f.amount = 20000) OR
            (f.label = 'Public Company' AND f.amount = 50000)))
    INTO current_formula_count, current_fee_count, normalized_tier_count
    FROM fee_options f
    JOIN services s ON s.id = f.service_id
    JOIN mdas m ON m.id = s.mda_id
   WHERE m.slug = 'cac'
     AND s.slug = 'cac-011-change-of-name-company'
     AND f.is_current = TRUE;
  IF NOT ((current_formula_count = 1 AND current_fee_count = 1)
       OR (current_formula_count = 0 AND current_fee_count = 3 AND normalized_tier_count = 3)) THEN
    RAISE EXCEPTION 'Expected one legacy formula or the three normalized CAC company name-change fee options; found formula %, total %, normalized tiers %; no changes applied.', current_formula_count, current_fee_count, normalized_tier_count;
  END IF;
END $$;

CREATE TEMP TABLE cac_service_curation_before ON COMMIT DROP AS
SELECT s.id, s.slug, s.catalogue_group, s.requirements, s.process_steps
  FROM services s JOIN mdas m ON m.id = s.mda_id
 WHERE m.slug = 'cac';

CREATE TEMP TABLE cac_company_name_fee_before ON COMMIT DROP AS
SELECT f.*
  FROM fee_options f
  JOIN services s ON s.id = f.service_id
  JOIN mdas m ON m.id = s.mda_id
 WHERE m.slug = 'cac'
   AND s.slug = 'cac-011-change-of-name-company'
   AND f.is_current = TRUE
   AND f.pricing_model = 'formula';

UPDATE fee_options
   SET is_current = FALSE,
       verification_status = 'superseded',
       updated_at = NOW()
 WHERE id IN (SELECT id FROM cac_company_name_fee_before);

CREATE TEMP TABLE cac_company_name_fee_new ON COMMIT DROP AS
SELECT * FROM fee_options WHERE FALSE;

WITH tiers(label, amount, conditions) AS (
  VALUES
    ('Small Company', 10000::NUMERIC, 'Applies to Small Companies.'),
    ('Company other than Small Company and LTD/GTE', 20000::NUMERIC, 'Applies to a Company other than Small Company and LTD/GTE.'),
    ('Public Company', 50000::NUMERIC, 'Applies to Public Companies.')
), inserted AS (
INSERT INTO fee_options (
  service_id, pricing_model, currency, amount, min_amount, max_amount,
  percentage, formula, conditions, label, notes, is_current,
  verification_status, verified_at, next_review_at, supersedes_fee_option_id
)
SELECT old.service_id, 'fixed', old.currency, tiers.amount, NULL, NULL,
       NULL, NULL, tiers.conditions, tiers.label,
       'Tier-specific fee stated in the CAC Service Level Agreement.', TRUE,
       old.verification_status, NULL, old.next_review_at, old.id
  FROM cac_company_name_fee_before old
 CROSS JOIN tiers
RETURNING *
)
INSERT INTO cac_company_name_fee_new
SELECT * FROM inserted;

INSERT INTO fee_sources (fee_option_id, source_id, excerpt, page_or_section, is_primary)
SELECT new.id, old_source.source_id, old_source.excerpt, old_source.page_or_section, old_source.is_primary
  FROM cac_company_name_fee_new new
  JOIN cac_company_name_fee_before old ON old.service_id = new.service_id
  JOIN fee_sources old_source ON old_source.fee_option_id = old.id
ON CONFLICT (fee_option_id, source_id) DO NOTHING;

UPDATE services s
   SET catalogue_group = 'other', updated_at = NOW()
  FROM mdas m
 WHERE s.mda_id = m.id
   AND m.slug = 'cac';

WITH curated(slug, catalogue_group, requirements, process_steps) AS (
  VALUES
    ('business-name-registration-ctc-registration-documents', 'registration',
     '["Means of Identification of Proprietor(s)","Passport photograph of Proprietor(s)","Signature of Proprietor(s)"]'::jsonb,
     '["Log on to the iCRP.","On the Registration tab of the dashboard, choose Register a New Business.","Enter the availability code for the reserved name. Alternatively, open Name Reservation, choose Action, then Go to Business Registration.","Complete the registration form and verify the details on the preview page."]'::jsonb),
    ('company-with-share-capital-small-private-other-than-small', 'registration',
     '["Means of Identification of Director(s), Shareholder(s), and Secretary where applicable","Signatures of Director(s), Shareholder(s), Secretary where applicable, and witness","Proficiency certificate where applicable","Letter of No Objection where applicable","Approval-in-Principle where applicable","Residence Permit where applicable"]'::jsonb,
     '["Log on to the iCRP.","On the Registration tab of the dashboard, choose Register a New Business.","Enter the availability code for the reserved name. Alternatively, open Name Reservation, choose Action, then Go to Business Registration.","Complete the registration form and verify the details on the preview page.","Make any necessary corrections or proceed to payment."]'::jsonb),
    ('cac-007-incorporation-of-incorporated-trustees', 'registration',
     '["Means of Identification of Trustees and Secretary, if any","Signature of Trustees, Secretary, if any, and Chairman","Trustees’ Declaration form","Newspaper publications (2)","Minutes of meeting"]'::jsonb,
     '["Log on to the iCRP.","On the Registration tab of the dashboard, choose Register a New Business and enter the availability code for the reserved name.","Alternatively, use the Name Requiring Consent tab as applicable."]'::jsonb),
    ('cac-008-registration-of-limited-partnership', 'registration',
     '["Means of Identification of Partners","Passport photograph of Partners","Signature of Partners"]'::jsonb,
     '["Log on to the iCRP.","On the Registration tab of the dashboard, choose Register a New Business.","Enter the availability code for the reserved name. Alternatively, open Name Reservation, choose Action, then Go to Business Registration.","Complete the registration form and verify the details on the preview page.","Make any necessary corrections or proceed to payment."]'::jsonb),
    ('cac-009-registration-of-limited-liability-partnership', 'registration',
     '["Means of Identification of Partners","Signature of Partners"]'::jsonb,
     '["Log on to the iCRP.","On the Registration tab of the dashboard, choose Register a New Business.","Enter the availability code for the reserved name. Alternatively, open Name Reservation, choose Action, then Go to Business Registration.","Complete the registration form and verify the details on the preview page.","Make any necessary corrections or proceed to payment."]'::jsonb),
    ('cac-010-change-of-name-business-name', 'change_of_name',
     '["Nil"]'::jsonb,
     '["Log on to the iCRP.","Obtain a new name reservation, or obtain consent for the new name where applicable.","Complete the application form.","Verify the preview details; make necessary changes or proceed to payment.","Upload documents where applicable."]'::jsonb),
    ('cac-011-change-of-name-company', 'change_of_name',
     '["Special Resolution"]'::jsonb,
     '["Log on to the iCRP.","Obtain a new name reservation, or obtain consent for the new name where applicable.","Complete the application form.","Verify the preview details; make necessary changes or proceed to payment.","Upload documents where applicable."]'::jsonb),
    ('cac-012-change-of-name-incorporated-trustees', 'change_of_name',
     '["Minutes of meeting signed by the existing Chairman and Secretary, if any, on record","Newspaper publications (2)","Public notice"]'::jsonb,
     '["Log on to the iCRP.","Obtain a new name reservation, or obtain consent for the new name where applicable.","Complete the application form.","Verify the preview details; make necessary changes or proceed to payment.","Upload documents where applicable."]'::jsonb),
    ('cac-013-change-of-name-limited-partnership', 'change_of_name',
     '["Nil"]'::jsonb,
     '["Log on to the iCRP.","Obtain a new name reservation, or obtain consent for the new name where applicable.","Complete the application form.","Verify the preview details; make necessary changes or proceed to payment.","Upload documents where applicable."]'::jsonb),
    ('cac-014-change-of-name-limited-liability-partnership', 'change_of_name',
     '["Special Resolution"]'::jsonb,
     '["Log on to the iCRP.","Obtain a new name reservation, or obtain consent for the new name where applicable.","Complete the application form.","Verify the preview details; make necessary changes or proceed to payment.","Upload documents where applicable."]'::jsonb)
)
UPDATE services s
   SET catalogue_group = curated.catalogue_group,
       requirements = curated.requirements,
       process_steps = curated.process_steps,
       updated_at = NOW()
  FROM mdas m, curated
 WHERE s.mda_id = m.id
   AND m.slug = 'cac'
   AND curated.slug = s.slug;

INSERT INTO audit_logs (actor_admin_user_id, action, entity_type, entity_id, old_values, new_values)
SELECT NULLIF(current_setting('feelens.cac_actor_admin_user_id', TRUE), '')::BIGINT,
       'cac.catalogue.curated', 'service', before.id::TEXT,
       jsonb_build_object('catalogueGroup', before.catalogue_group,
                          'requirements', before.requirements,
                          'processSteps', before.process_steps),
       jsonb_build_object('catalogueGroup', after.catalogue_group,
                          'requirements', after.requirements,
                          'processSteps', after.process_steps)
  FROM cac_service_curation_before before
  JOIN services after ON after.id = before.id
 WHERE before.catalogue_group IS DISTINCT FROM after.catalogue_group
    OR before.requirements IS DISTINCT FROM after.requirements
    OR before.process_steps IS DISTINCT FROM after.process_steps;

INSERT INTO audit_logs (actor_admin_user_id, action, entity_type, entity_id, old_values, new_values)
SELECT NULLIF(current_setting('feelens.cac_actor_admin_user_id', TRUE), '')::BIGINT,
       'cac.fee.options.normalized', 'fee_option', old.id::TEXT,
       to_jsonb(old), jsonb_build_object('superseded', to_jsonb(old), 'replacementOptions',
         (SELECT jsonb_agg(jsonb_build_object('id', n.id, 'label', n.label, 'amount', n.amount,
                                             'conditions', n.conditions, 'status', n.verification_status))
            FROM cac_company_name_fee_new n))
  FROM cac_company_name_fee_before old;

INSERT INTO audit_logs (actor_admin_user_id, action, entity_type, entity_id, old_values, new_values)
SELECT NULLIF(current_setting('feelens.cac_actor_admin_user_id', TRUE), '')::BIGINT,
       'cac.fee.option.created', 'fee_option', new.id::TEXT, NULL, to_jsonb(new)
  FROM cac_company_name_fee_new new;

INSERT INTO audit_logs (actor_admin_user_id, action, entity_type, entity_id, old_values, new_values)
SELECT NULLIF(current_setting('feelens.cac_actor_admin_user_id', TRUE), '')::BIGINT,
       'cac.fee.source_linked', 'fee_option', fs.fee_option_id::TEXT, NULL,
       jsonb_build_object('sourceId', fs.source_id, 'excerpt', fs.excerpt,
                          'pageOrSection', fs.page_or_section, 'isPrimary', fs.is_primary)
  FROM fee_sources fs
  JOIN cac_company_name_fee_new new ON new.id = fs.fee_option_id;

COMMIT;
