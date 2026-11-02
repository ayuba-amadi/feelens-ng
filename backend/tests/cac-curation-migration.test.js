const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(__dirname, '../../database/migrations/006_cac_catalogue_curation.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');
const catalogue = JSON.parse(fs.readFileSync(path.join(__dirname, '../../research/production-import/cac-service-catalogue.json'), 'utf8'));
const featured = [
  'business-name-registration-ctc-registration-documents',
  'company-with-share-capital-small-private-other-than-small',
  'cac-007-incorporation-of-incorporated-trustees',
  'cac-008-registration-of-limited-partnership',
  'cac-009-registration-of-limited-liability-partnership',
  'cac-010-change-of-name-business-name',
  'cac-011-change-of-name-company',
  'cac-012-change-of-name-incorporated-trustees',
  'cac-013-change-of-name-limited-partnership',
  'cac-014-change-of-name-limited-liability-partnership',
];

test('CAC curation migration guards the exact ten matches and scopes classification to CAC', () => {
  assert.match(migration, /matched_count <> 10/);
  assert.match(migration, /m\.slug = 'cac'/);
  for (const slug of featured) assert.ok(migration.includes(slug), `migration must include ${slug}`);
  assert.match(migration, /SET catalogue_group = 'other'/);
  assert.match(migration, /'registration'/);
  assert.match(migration, /'change_of_name'/);
});

test('CAC curation migration preserves services and history instead of deleting records', () => {
  assert.doesNotMatch(migration, /\bDELETE\s+FROM\s+(services|fee_options|fee_sources|verification_events|audit_logs)/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
  assert.match(migration, /cac\.catalogue\.curated/);
  assert.match(migration, /cac\.fee\.options\.normalized/);
  assert.match(migration, /ON CONFLICT \(fee_option_id, source_id\) DO NOTHING/);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+verification_events/i);
});

test('CAC catalogue seed has exactly the approved ten records with all other services retained', () => {
  const bySlug = new Map(catalogue.services.map((service) => [service.slug, service]));
  assert.equal(featured.filter((slug) => bySlug.has(slug)).length, 10);
  assert.equal(catalogue.services.length - featured.length, 119);
  assert.ok(catalogue.services.filter((service) => !featured.includes(service.slug)).length === 119);
});
