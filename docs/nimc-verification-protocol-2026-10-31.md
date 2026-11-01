# FeeLens NIMC verification protocol

Status: proposed for owner review. Prepared 31 October 2026 for the NIMC catalogue work.

## What moves a record to verified

An authorised FeeLens management administrator may mark a fee verified only when:

1. A relevant official or otherwise authoritative source has been identified.
2. The exact service, amount or pricing model, scope, currency/unit and material conditions are supported by that source.
3. The source title, issuing body, original URL, document/page or section, and the exact evidence summary are recorded against the fee.
4. Provider publication and effective dates are recorded when the source states them. Missing dates remain missing.
5. Material conflicts, later official changes, applicability and channel differences have been checked.
6. The review decision and method are recorded in the append-only verification history and approved by the responsible administrator through the CMS workflow.

`free` is distinct from `unknown`. A source that proves a service exists does not prove that its fee is free. Conflicting official evidence remains `conflicting` until the conflict is resolved by appropriate evidence.

## Who performs the check

Existing project instructions assign the review action to an authenticated, authorised FeeLens management administrator. The backend derives the reviewer from the authenticated administrator session and records that identity in verification history and audit records. No named reviewer or separate review team is assigned in the repository. The owner must decide whether to assign a named responsible reviewer or role before treating that assignment as a project commitment.

## How source and dates are recorded

Each source record should contain:

- source title and issuing body;
- original official URL;
- source type and evidence tier;
- document reference and exact page/section;
- amount, currency or unit, scope and conditions supported;
- provider publication date and effective date, when stated;
- date integrated into FeeLens and date internally reviewed.

The public record makes the provider date prominent when available. Internal review/integration dates remain for accountability and staleness management and are not substituted for a missing provider date.

## Staleness

The repository does not contain an approved FeeLens review interval. The NIMC charter says NIMC reviews its own charter bi-annually, but that is a provider document-review statement, not an approved FeeLens maintenance policy.

Proposed policy requiring owner approval: review published fee records at least every six months, and review sooner when an official fee page, notice, portal, charter, law, channel or material service change is identified. A material conflict or official change should trigger an earlier review and, where necessary, a status change to `conflicting`, `pending` or `unable_to_verify` until checked.

## NIMC-specific decisions recorded

- The supplied charter is retained as a FeeLens-hosted copy only after release review: it is an official public service charter, contains no citizen records or confidential account printout, and is limited to the approved PDF rather than the full research directory.
- The requested official charter URL was checked on 31 October 2026 and returned 502 Bad Gateway. The supplied and hosted copies share SHA-256 77c7f3405dde318d32946570ab14a437c1d552ebdd892c5cda6ecddb440057b9, but the remote URL was not available for a byte-for-byte comparison; this is recorded as a source-access limitation, not as a successful remote match.
- Date-of-birth modification remains conflicting: the charter and current official fee page state ₦28,574, while the official adult modification page states ₦15,000.
- The four charter Verification API subscription/annual options remain conflicting because the current official fees page says the API is currently free for approved, registered developers; the scope difference is not resolved.
- Bulk verification P4/P5 remain conflicting/ambiguous because the charter overlaps the volume bands at 50,000,000+ records.
- Charter token-unit access levels are retained in the evidence matrix but not published as monetary fees because the current data model has no non-currency unit type.

## 28–29 October fieldwork request

No repository file containing findings from 28–29 October fieldwork was located. The repository contains UI refinement notes dated 27 October and other project documentation, but it does not supply participants, observations, quotations, results or a completed fieldwork report for those dates.

The owner can document the missing work later using this structure, without changing the existing research form, URL, questions, response settings or linked spreadsheet:

| Field | Record |
|---|---|
| Session/date | 28 or 29 October; time zone and setting |
| Participant context | Role or user type; no unnecessary personal data |
| Task tested | MDA → service → fee → evidence → official channel |
| Observed friction | What the participant could or could not find |
| Evidence | Observation, quote or artefact reference |
| Decision | Implemented, proposed, or no change |
| Resulting change | Exact UI/content change and source |
| Owner decision | Approval or follow-up required |

Until that record is supplied, no fieldwork finding or resulting change is claimed as implemented.
