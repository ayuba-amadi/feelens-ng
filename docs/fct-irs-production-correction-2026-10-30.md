# FCT-IRS Production Evidence Correction

Date: 2026-10-30

## Purpose

Correct the original combined FCT-IRS Tax ID/TIN record so that generation/enrolment and retrieval are represented as separately evidenced services.

## Previous production record

- MDA: FCT Internal Revenue Service
- MDA ID: 1
- Previous service ID: 1
- Previous slug: `tax-id-tin-generation-or-retrieval`
- Previous fee option ID: 1
- Previous verification status: verified
- Previous evidence: FCT-IRS official FAQ
- Issue: the combined record overstated the scope of the FAQ evidence by representing generation and retrieval as one directly evidenced free service.

## Authoritative evidence

### Existing source

- Source ID: 1
- Title: FCT-IRS official FAQ
- Type: `official_faq`
- Evidence tier: 2
- URL: https://fctirs.gov.ng/faq/

### Added source

- Source ID: 29
- Title: FCT-IRS Service Level Agreement
- Type: `service_level_agreement`
- Evidence tier: 2
- URL: https://fctirs.gov.ng/wp-content/uploads/FCTIRS-SLA-Version1.0.pdf

The SLA lists Taxpayer Identification Number Enrolment with Cost of Service: Free.

### Added source

- Source ID: 30
- Title: FCT-IRS free-service and anti-gratification notice
- Type: `official_notice`
- Evidence tier: 2
- URL: https://fctirs.gov.ng/offering-and-accepting-processing-fee-or-service-charge-gratification-is-not-allowed/

The notice states that FCT-IRS services are rendered free of charge and prohibits processing or service charges.

## Replacement service 1

- Service ID: 78
- Name: TIN generation / enrolment
- Slug: `tin-generation-enrolment`
- Status: active
- Fee option ID: 78
- Pricing model: free
- Verification status: verified
- Official channel ID: 86
- Primary evidence: source 1, FCT-IRS FAQ
- Supporting evidence: source 29, FCT-IRS Service Level Agreement

Evidence position:

The FAQ directly states that TIN generation is free of charge. The SLA independently identifies TIN enrolment as free.

## Replacement service 2

- Service ID: 79
- Name: TIN retrieval
- Slug: `tin-retrieval`
- Status: active
- Fee option ID: 79
- Pricing model: free
- Verification status: verified
- Official channel ID: 87
- Primary fee evidence: source 30, FCT-IRS free-service notice
- Supporting process evidence: source 1, FCT-IRS FAQ

Evidence position:

The FAQ provides the TIN retrieval process but does not separately state a retrieval price.

The FCT-IRS free-service notice supports the conclusion that the FCT-IRS processing/service charge for retrieval is free.

Possible telecom, SMS or USSD charges are not established by the reviewed evidence and are not represented by FeeLens as free.

## Retirement of previous record

The previous combined service was retired after both replacement records had been created, evidenced, verified and publicly validated.

Final state:

- Service ID 1: inactive
- Fee option ID 1: non-current
- Fee option ID 1 verification status: superseded
- Old public route: HTTP 404
- Generation public route: HTTP 200
- Retrieval public route: HTTP 200

## Production cutover result

- CMS cutover: PASS
- Public content cutover: PASS

## Governance

All production content changes were performed through the authenticated FeeLens administrative API using the normal:

- administrator authorization;
- session controls;
- CSRF protection;
- application validation;
- transaction handling;
- audit logging.

No direct PostgreSQL content modification was used for this correction.

## Release note

Application-side API sanitization and public UI refinements are maintained separately in Git and require deployment after local test, lint and build validation.

No passwords, session cookies, CSRF tokens, database credentials or other secrets are contained in this document.
