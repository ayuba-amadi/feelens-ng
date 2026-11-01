# FeeLens consolidation review checkpoint

**Status: review only; not approved for publication or deployment.**

## Recovery state

The temporary recovery checkout and its claim-audit checkpoint, log, and prior review were unavailable. The former report of 75 processed and 930 remaining options cannot be independently recovered from this repository. No prior claim audit is being asserted as recovered. A new audit checkpoint starts at the first option in the currently available Batch 1 manifest; it records zero completed reviews.

The persistent branch is `consolidation-review-persistent-2026-11-01`, based on the existing `ui-refinement-2026-10-27` HEAD. Existing root-worktree changes were preserved. This review file and fresh audit checkpoint are new local changes; nothing has been committed or pushed.

## Artifacts present

- Batch manifests: `research/production-import/batch-01-mdas.json`, `batch-02-mdas.json`, and `batch-03-mdas.json`.
- Research catalogues: NIMC, NIS, FRSC, and NPC under `research/production-import/`.
- Evidence matrices: `research/nimc-service-evidence-matrix.md`, `nis-service-evidence-matrix.md`, `frsc-service-evidence-matrix.md`, and `npc-service-evidence-matrix.md`.
- Source PDFs in `research/repo/` include the NIMC February 2026 charter, NIS 2026 SLA, FRSC reviewed SLA, Siraki / Ministry of Interior document, JAMB payment/services material, NECO 2026 guidelines, CAC, NIPC, NDPC, NAFDAC, NCC, SON, NEPC, MANCAP, FCT-IRS, and other agency evidence.
- Archived PDFs also exist under `research/evidence/archive/` for NIS 2025, JAMB 2025 and 2026, CAC 2025, and NEPC.
- Only the NIMC charter and NIS 2026 SLA are present as PDFs under `frontend/public/sources/`. The confidential FRSC SLA and research-only Siraki PDF remain under research storage and were not found in public assets.
- Migrations 001–004 and the untracked `database/migrations/005_unpublish-agis.sql` exist. Migration 005 has not been applied; no rollback migration for 005 was found.
- The batch selection changes are present in the uncommitted importer at `backend/scripts/import-production-manifest.js`. They are covered by importer regression tests.

The three batch dry runs resolve 15 MDAs and 77 unique service slugs. Their combined normalized fee-option count is 1,066 (Batch 1: 994; Batch 2: 42; Batch 3: 30). This is the fresh checkpoint's available universe, not a reconstruction of the former 1,005-option audit.

## Audit state

`research/claim-audit-checkpoint.json` is a new checkpoint with zero reviewed options and a pointer to `fct-irs/tax-id-tin-generation-or-retrieval`, option 0, the first option in the current Batch 1 order. `research/claim-audit-log.md` records that no claim-level review has been completed in this recovery. Outcomes remain unassigned until source-by-source review is performed.

## Checks

- Backend test suite: **passed**, 65/65 tests.
- Backend syntax/lint: **passed** (`npm run lint`).
- Frontend lint: **passed** (`npm run lint`).
- Frontend production build: **passed** (`npm run build`).
- Frontend tests: **passed**, 3/3 tests, including the rendered review-state badge.
- Importer regression tests: **passed**, 12/12 tests. Public-provenance tests: **passed**, 8/8 tests.
- Batch 1, 2, and 3 dry runs: **passed**, zero writes, zero validation errors, and zero duplicate risks. All three report review/date warnings that remain visible in their output.
- Duplicate/slug scan: **passed**, 15 unique MDA slugs and 77 unique MDA/service pairs.
- Public PDF exposure scan: **passed** for the checked boundary. Public source PDFs are the NIMC charter and NIS SLA; no FRSC confidential SLA, Siraki document, personal document, or account-specific document was found in `frontend/public/`.
- Public status provenance tests cover stored verified claims without events, a valid event and current snapshot, stale snapshots, missing reviewer, missing source link, missing review details, conflicts, and historical claims.
- Conflict handling: backend regression coverage and the UI preserve visible conflicting status.
- AGIS static check: the Batch 2 manifest marks AGIS `inactive`; public routes require active MDAs and featured listings require pilot coverage; migration 005 is intended to deactivate AGIS. Persisted database state was not inspected, and migration 005 was not applied.
- `git diff --check`: **passed** after the final implementation and report edits.

## Public verification provenance

The API now projects stored status conservatively and does not update stored fee rows or historical events. A fee is publicly `verified` only when an event matches the same fee and service, is marked verified, has a non-null reviewer foreign key resolving to an admin, has a non-empty reviewer name matching that admin, includes a timestamp, evidence summary, and review method, links a source already linked to the fee, and contains a `new_values` snapshot matching the current fee claim fields. The snapshot match checks claim identifiers, pricing model, currency, monetary values/formula, conditions, label, current flag, and stored status. Internal notes are not part of the public projection.

If a stored `verified` fee has no valid review but has a linked recognized source (`source_type` other than `other`), the API returns `source_supported`; without a linked recognized source it returns `pending`. Stored `pending`, `conflicting`, and `unable_to_verify` values retain their distinct meanings. Superseded or non-current claims map to `historical_or_superseded`; current public fee queries continue to exclude superseded/non-current rows. The API does not expose reviewer names, internal notes, or review snapshots.

Manifest projection counts before and after applying this rule (no review events are present in the manifests):

| Public status | Before | After |
| --- | ---: | ---: |
| Verified | 1,003 | 0 |
| Source-supported — awaiting human review | 0 | 1,003 |
| Pending | 38 | 38 |
| Conflicting | 25 | 25 |
| Unable to verify | 0 | 0 |
| Historical / superseded | 0 | 0 |
| **Total available options** | **1,066** | **1,066** |

These are calculations over current normalized manifests, not counts read from a database. Every one of the 1,003 currently `verified` manifest options has a linked recognized source; none carries an authorised review event. Existing stored fee statuses, sources, and historical values are not bulk-rewritten. The importer now reports zero verification events and no longer creates any; an import or source link cannot itself represent human approval.

The UI uses the distinct label **“Source-supported — awaiting human review”** with an explanation that an official source is linked but FeeLens has not recorded an authorised human review. It is visually distinct from Verified, Pending, Conflicting, and Historical / superseded. The same state appears in fee cards, service summaries, source associations, and MDA fee coverage where supplied.

## Remaining release limits

No preview deployment configuration or configured preview environment was found. Deployment notes describe a cPanel setup with environment-managed PostgreSQL requirements. There is no database available for checking the persisted review ledger or AGIS state, so deployed status counts and persisted AGIS state remain unavailable. No database was contacted and migration 005 was not applied. The historical NECO/JAMB database projection and live source-link behaviour also remain unverified. The Batch 2 JAMB printing-of-result-slip record is explicitly conflicting and includes a 2025 manual; no active NECO record is present in the three batch manifests, while a NECO 2026 guideline PDF exists only in research storage. No commit, push, or deployment was made, as requested.

No commit, push, or deployment was made. This remains a review checkpoint, not publication readiness.
