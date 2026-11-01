# FeeLens FRSC verification protocol

Status: proposed for owner review. Prepared 31 October 2026 for the Federal Road Safety Corps (FRSC) catalogue work. This extends the existing FeeLens verification mechanism documented in `docs/nimc-verification-protocol-2026-10-31.md` and `docs/nis-verification-protocol-2026-10-31.md`.

## Record-level verification

An FRSC fee option moves to `verified` only when the exact service or licence class, validity period, amount or pricing model, currency, applicant scope, multi-authority conditions and official channel are supported by publicly accessible authoritative evidence. For every source, FeeLens records the source title, issuing authority, exact URL, document/page/table reference, provider publication/revision/effective dates when stated, integration date and internal review date.

Material conflicts, separate state or third-party charges, mandatory in-person biometric or testing stages, and document confidentiality restrictions are checked before approval. A missing price, dash, blank or unsubstantiated figure from a restricted document is recorded as `pending` (`unknown` or `variable`), never assumed free.

## Confidentiality and public-release decision

The supplied document `research/repo/frsc_REVIEWED_SLA_2026_276a6818e9.pdf` (27 PDF pages; SHA-256 `3a38011ca7c790cef0c3ffe98c7e2521df51fa4a8f60594985a99c3699c12a18`) is titled *Federal Road Safety Corps — Service Level Agreements — Second Edition — April, 2026*. Every page (PDF pp. 1–27) is stamped **`-CONFIDENTIAL-`**.

During the 31 October 2026 public-source check, FRSC's public documentation page (`https://frsc.gov.ng/documentations/service-level-agreements`, HTTP 200) was found to query FRSC's Strapi CMS endpoint (`https://staging.frsc.gov.ng/frsc-admin/api/service-level-agreements?populate=*&sort=ReleaseDate:desc`), which serves `https://staging.frsc.gov.ng/frsc-admin/uploads/REVIEWED_SLA_2026_276a6818e9.pdf` with the exact same SHA-256 (`3a38011ca7c790cef0c3ffe98c7e2521df51fa4a8f60594985a99c3699c12a18`). However, that remote file still bears `-CONFIDENTIAL-` on every page and carries inconsistent CMS metadata (`Period: "2025"`, `ReleaseDate: "2025-02-05"` vs. `Description: "FRSC Service Level Agreement for 2026"`, `publishedAt: "2026-05-07T12:21:12.376Z"`).

An identical checksum proves only that two files match byte-for-byte; it does not independently establish publication authority or permission to redistribute a document marked `-CONFIDENTIAL-`. Therefore:

- `frsc_REVIEWED_SLA_2026_276a6818e9.pdf` is kept strictly in `research/repo/` and is **not** copied into `frontend/public/sources/`.
- No embedded PDF viewer route or public "Read FeeLens copy" / "View official source" link is exposed for the `-CONFIDENTIAL-` SLA PDF.
- Public FRSC records cite verified non-confidential public sources (`https://nigeriadriverslicence.frsc.gov.ng/faq`, `https://nigeriadriverslicence.frsc.gov.ng/`, `https://ndlverification.frsc.gov.ng/`, `https://nvis.frsc.gov.ng/`, `https://dssp.frsc.gov.ng/`, `https://frsc.gov.ng/services`, `https://frsc.gov.ng/documentations/standard-operating-procedures`, `https://frsc.gov.ng/wp-content/uploads/2019/11/FINALa.pdf`, `https://staging.frsc.gov.ng/frsc-admin/uploads/sopds_e1cd918588.pdf`, `https://staging.frsc.gov.ng/frsc-admin/uploads/fsc_0b3dd86863.pdf`, and `https://frsc.gov.ng/contact-us`).
- Where a fee appears only in the confidential SLA without independent public substantiation (such as the ₦50,000 Remita verification/shipping figure on SLA p. 11), the public record is marked `pending` (`unknown`).

## Multi-authority governance (FRSC, VIO and State IRS / JTB)

FRSC services span federal and state authorities:

1. **Federal Road Safety Corps (FRSC)** designs and produces the National Driver's Licence, National Vehicle Number Plates and road signage, operates the NDL, NDL Verification, NVIS and DSSP portals, accredits driving schools and speed-limiting device vendors, and conducts vision acuity checks and in-person biometric capture at Driver's Licence Centres (DLCs).
2. **State Vehicle Inspection Officers (VIO)** test the driving proficiency of prospective private, commercial and reciprocity drivers and issue the Driver's Test Certificate.
3. **State Boards of Internal Revenue (SBIR / FCT-IRS) and Motor Licensing Authorities (MLA / MVAA)** determine state collectible rates through the Joint Tax Board (JTB), issue Learner's Permits, assess and collect vehicle number plate and registration payments, confirm driver's licence payments, print Proof of Ownership Certificates (POC) and distribute permanent Driver's Licences and physical number plates.

FeeLens records baseline JTB/FRSC driver's licence fees (`₦7,000` Class A 3-year, `₦11,000` Class A 5-year, `₦15,000` motor vehicle 3-year, `₦21,000` motor vehicle 5-year) with explicit conditions stating that Learner's Permits, accredited driving-school tuition, VIO test charges, government hospital medical examinations, state administrative fees and bank/gateway transaction charges are separate. FeeLens does not infer an FCT or state total out-of-pocket figure from the national baseline.

## Responsible reviewer

The repository assigns review actions to an authenticated, authorised FeeLens management administrator through the existing CMS workflow. It does not assign a named individual reviewer or separate review team. No fictitious reviewer or approval event is manufactured.

## Dates and source record

For the supplied FRSC SLA, the cover and authorization table (Printed pp. 1–2; PDF pp. 1–2) state `Edition: 2` and `Date: April, 2026`. That date is an edition/authorization month; no day of the month or effective date is stated. Among the public FRSC SOPs inspected, only the Towing SOP (`FINALa.pdf`, p. 2) states an explicit approval date (`22 October 2019`). The source record distinguishes:

- provider publication/document date (`2019-10-22` for the Towing SOP; `null` / "Date not stated" where not stated by the public source);
- provider effective date, if stated;
- date integrated into FeeLens (`2026-10-31`); and
- date internally reviewed (`2026-10-31`).

A missing provider date remains "Publication date not stated by source" / "Date not provided"; the internal review date is never substituted for a provider publication date.

## Staleness

No approved FeeLens review interval was located in the repository. A six-month review interval remains a proposal requiring owner approval, not an adopted policy. Any JTB fee revision, FRSC notice, portal change, State IRS schedule update or new public SLA release should trigger an immediate review and status reassessment.

## Research gap

No repository records from the requested 28–29 October user-research fieldwork were located. No participant statements, counts, confusion points or design decisions are attributed to that fieldwork. The existing user-research form, URL, questions, response settings and linked spreadsheet remain untouched.
