# FeeLens NG data model

FeeLens is an independent civic-tech transparency project. Its data model keeps a government service separate from the charges that may apply to that service. A service can have multiple fee options, no fee option, or an amount that has not been publicly located.

> **No fee should be displayed as verified unless it can be traced to authoritative evidence.**

## Core records

### Agency

An `Agency` identifies the institution associated with a service. It stores an `id`, `slug`, display name, acronym, jurisdiction, optional parent institution, optional official website, and active state. Agency records are currently demo placeholders and must be confirmed during research.

### Service

A `Service` is the user-facing government procedure or offering. It references an agency with `agencyId`, categorizes the service, lists intended user types and keywords, and contains arrays for `feeOptions`, `requirements`, `processSteps`, and `officialChannels`. Service-level `publicationStatus` and `verification` describe the state of the record as a whole.

### FeeOption

A `FeeOption` represents one charge possibility for a service. It has a `chargeClass`, `pricingModel`, conditions, payment notes, effective date, publication status, verification status, and `evidenceSourceIds`. Numeric fields stay numeric or `null`; labels such as `10k`, `free`, or `N/A` are not used in numeric fields.

Supported pricing models are:

- `fixed`: one numeric amount.
- `free`: amount is exactly `0`.
- `range`: numeric `minAmount` and `maxAmount`.
- `percentage`: a numeric percentage rate.
- `formula`: a published calculation described in `formulaDescription`.
- `variable`: the amount depends on conditions or an official assessment; the amount remains `null`.
- `unknown`: an official amount has not been located or is not yet understood; the amount remains `null`.

`VARIABLE` and `NOT PUBLICLY LOCATED` are different. A variable charge is expected to differ according to a known condition, class, duration, assessment, or formula. A not-located amount means FeeLens has not yet found enough authoritative evidence to state what the charge is. It must not be treated as free or zero.

### EvidenceSource

An `EvidenceSource` records the title, publisher, source type, URL, dates, jurisdiction, notes, and active state of a possible authority. Source types include Acts, regulations, gazettes, official fee schedules, portals, official notices, service charters, guidelines, and official FAQs. Production records in this milestone use the authoritative government URLs supplied for the initial dataset. Future unresearched placeholders must keep their URL as `null` and must never support a verified fee.

Blogs, media stories, and third-party websites may assist future research, but they cannot establish a verified official fee.

### Requirement

A `Requirement` describes one document, condition, or prerequisite. It contains an ID, text, mandatory flag, and evidence source references so each requirement can be traced independently.

### ProcessStep

A `ProcessStep` is an ordered procedure step with a step number, title, description, and evidence source references.

### OfficialChannel

An `OfficialChannel` describes where a user should continue for information, application, payment, complaints, or a physical office. FeeLens does not process payments; a payment channel only points users toward the appropriate official government channel. Channel URLs remain `null` in the demo dataset.

## Statuses

Publication statuses describe what FeeLens has located in published material:

- `published`: a relevant published record was located.
- `not_located`: an official amount or detail has not been found yet.
- `conflicting`: authoritative materials do not agree and need review.
- `superseded`: a previously published record has been replaced.

Verification statuses describe FeeLens review state:

- `verified`: structurally eligible and supported by official evidence.
- `pending`: queued for review.
- `unable_to_verify`: evidence is insufficient or not located.
- `disputed`: the record needs resolution due to a disagreement.
- `superseded`: the record is no longer current.

A **superseded source** is an older or replaced document and should not be used as the current basis for a verified fee. A **current verified source** is an active authoritative source that supports the fee’s current publication and is linked from the fee option. The validation policy checks structural eligibility; it does not claim that a URL is current merely because it looks official.

## Verification policy

`canBeMarkedVerified(feeOption, sources)` requires the fee option to be internally valid, have `verificationStatus: verified`, and reference at least one active source with an official source type. This is a safety check, not a research process. It does not fetch URLs, determine legal currency, or resolve conflicting documents.

The initial production records use only the supplied primary-source URLs. Any future demo fixtures must carry `recordType: demo`, remain separate from production exports, and never be presented as government claims.
