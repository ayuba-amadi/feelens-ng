# FeeLens NIS verification protocol

Status: proposed for owner review. Prepared 31 October 2026 for the Nigeria Immigration Service catalogue work. This extends the existing FeeLens verification mechanism documented in `docs/nimc-verification-protocol-2026-10-31.md`.

## Record-level verification

A NIS fee option moves to `verified` only when the exact service or fee schedule, amount or pricing model, currency/unit, applicant scope, conditions and channel are supported by relevant authoritative evidence. The source title, issuing body, original URL, exact PDF page or web section, provider publication/effective dates when stated, integration date and internal review date are recorded. Material conflicts, later notices, portal differences, bank charges and mandatory in-person steps are checked before approval.

The April 2026 SLA is evidence of what the document states. It is not by itself proof that every amount remains current. A dash, `N/A`, blank or unpriced service is pending, not free. Variable nationality-based schedules remain variable and are not converted into a universal fee.

## Responsible reviewer

The repository assigns review actions to an authenticated, authorised FeeLens management administrator through the existing CMS workflow. It does not assign a named reviewer or separate review team. The owner must decide whether to assign a named responsible reviewer or role before treating that assignment as a project commitment; no fictitious reviewer or approval event is recorded here.

## Dates and source record

For the supplied NIS SLA, the cover says Revised Edition, April 2026 and the foreword is dated 26 April 2026. No effective date is stated. Its version history calls April 2026 “Third Edition” while the description says “Second Edition, 2026”; this is retained as a source inconsistency. The source record distinguishes:

- provider publication/document date;
- provider effective date, if stated;
- date integrated into FeeLens; and
- date internally reviewed.

The provider date is the public date. A missing provider date remains “Date not stated”; the internal review date is not substituted for it.

## Staleness

No approved FeeLens review interval was located. A six-month review interval remains a proposal requiring owner approval, not an adopted commitment. An official fee notice, portal change, new SLA, gazette, changed complaint route or material conflict should trigger an earlier review and a status reassessment.

## NIS-specific evidence decisions

- The supplied SLA is retained as a local hosted copy because it is a public service document and the review found no personal or account-specific data. The full `research/repo` directory is not public.
- The official remote SLA URL is recorded as `https://immigration.gov.ng/wp-content/uploads/2026/04/SERVICE-LEVEL-AGREEMENT-2026_.pdf`. It was reachable through official web-source inspection and matched the supplied title, edition context and service/appendix structure, but local binary download/checksum comparison was unavailable because DNS could not resolve the host. The supplied SHA-256 is recorded in the evidence matrix and catalogue; an independent byte-for-byte remote match is not claimed.
- The SLA’s legacy or malformed portal references are not used as validated apply links where the current official NIS site supplies a current portal. Current passport, regular visa, e-Visa and e-CERPAC destinations are recorded separately and their mandatory in-person or biometric steps are preserved.
- The NIS current CERPAC page’s fee examples are kept as a separately scoped CERPAC service. They are not silently merged into nationality-based SLA STR visa rows.
- Eight fee options remain pending: the 64-page/5-year passport variant listed on the current passport page without a fee, F3A Transit Without Visa marked N/A, three Tanzania Appendix I cells printed as dashes, and three Appendix II N/A cells. None is presented as free.

## Research gap

No repository findings from the requested 28–29 October fieldwork were located. No participant, quotation, result or fieldwork conclusion is attributed to that request. The existing research form, URL, questions, response settings and linked spreadsheet remain unchanged.
