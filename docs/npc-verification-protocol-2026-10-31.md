# FeeLens NPC verification protocol

Status: proposed for owner review. Prepared 31 October 2026 for the National Population Commission (NPC) catalogue work. This extends the existing FeeLens verification mechanism documented in `docs/nimc-verification-protocol-2026-10-31.md`, `docs/nis-verification-protocol-2026-10-31.md`, and `docs/frsc-verification-protocol-2026-10-31.md`.

## Record-level verification

An NPC fee option moves to `verified` only when the exact service or vital-registration pathway, applicant eligibility (including age and timing cutoffs), pricing model or amount, currency, external-authority document conditions, and official channel are supported by publicly accessible authoritative evidence. For every source, FeeLens records the source title, issuing authority, exact public URL, document/section/code reference, provider publication/revision/effective dates when stated, integration date, and internal review date.

Material conflicts, decommissioned subdomains, authenticated-only portal pricing endpoints, separate court or hospital charges, and mandatory in-person vs. online stages are checked before approval. A service is published as `free` only when an official NPC source explicitly states that it is free. Where no public NPC source states a fee or free status (such as centre-based late birth registration for ages 5 to 17 years or stillbirth registration), the record is marked `pending` (`unknown`), never assumed free.

## Absence of a public NPC Service Charter or Gazette fee schedule

During the 31 October 2026 source discovery across `https://nationalpopulation.gov.ng/`, `https://vitalreg-selfservice.nationalpopulation.gov.ng/`, and `https://ecrvs.nationalpopulation.gov.ng/`:

- No downloadable NPC Service Charter PDF, SERVICOM Service Level Agreement PDF, or statutory Gazette fee table was found on `https://nationalpopulation.gov.ng/` (`https://nationalpopulation.gov.ng/legal` returns HTTP 404).
- Official public NPC webpages (`/civil-registration`, `/FAQs`, `/faq-vitalreg`, `/our-offices`, and dated official statements) establish the statutory mandate under the **Births, Deaths, Etc. (Compulsory Registration) Act, Act No. 69 of 1992 (Cap. B9, LFN 2004)**, the 0–17 age boundary for Birth Registration, the 18+ age boundary for Birth Attestation, the pre-November 2023 cutoff for Certificate Re-issuance, the free status of centre-based under-5 birth registration, and the single free digital download rule before paid Certificate Reprint.
- Numeric Naira fees for paid online VitalReg workflows (`₦5,000` birth registration with NIN, `₦4,000` temporary birth registration without child NIN, `₦15,000` adult birth attestation, `₦5,000` foreign birth notification, `₦3,000` re-issuance, `₦3,000` reprint, `₦3,000` standard birth/attestation modification, `₦35,000` date-of-birth modification, `₦2,000` foreign birth modification, `₦10,000` death record modification, `₦30,000` / `₦50,000+` Deed Poll name change/correction, `₦20,000` adoption registration, `₦10,000` surrogacy registration, and `₦5,000` single-parent registration) are served dynamically by the live VitalReg payment API (`https://ecrvs-api.verxid.site/payments/price/{transactionType}` and `/deed-poll/pathways`) behind account login on `https://vitalreg-selfservice.nationalpopulation.gov.ng/`.
- Because those numeric NGN figures are served dynamically by the portal API without a dated statutory tariff schedule or public HTML fee table on `nationalpopulation.gov.ng`, FeeLens records them as `pending` (or `conflicting` where they contradict legacy FeeLens claims), never `verified`.

## Evaluation and downgrade of legacy `USD 30` and `USD 80` claims

Existing Batch-2 records in `research/production-import/batch-02-mdas.json` contained three NPC services:

1. **`birth-registration-child-under-5-npc-registration-centre` (`free`, `verified`)**:
   - **Substantiated and retained as `verified` (`free`)**: Confirmed by the official NPC statement dated **1 January 2025** (`https://nationalpopulation.gov.ng/news/first-lady-welcomes-and-presents-birth-certificate-to-first-baby-of-the-year-2025`, which explicitly states that the e-birth certificate with NIN *"is entirely free"* across 4,000+ registration centres) and by the VitalReg Self-Service Portal requirement config (`fF.additionalRequirements[0]`: *"Birth registrations for children under the age of 5 years are free at every NPC registration center"*). The previously missing `publicationDate` is restored to `2025-01-01`.
2. **`online-self-service-birth-registration` (`USD 30`, `verified`)**:
   - **Downgraded from `verified` to `conflicting` / `pending`**: The previously cited URL (`https://www.birthreg-selfservice.nationalpopulation.gov.ng/`) fails DNS resolution (`NXDOMAIN`) on 31 October 2026. NPC consolidated self-service birth registration into `https://vitalreg-selfservice.nationalpopulation.gov.ng/`, where the live price endpoint (`/payments/price/birth_registration_payment`) returns **`NGN 5,000`** (even when queried with `?currency=USD`) and `NGN 4,000` for temporary birth registration without child NIN (`birth_no_nin_payment`).
3. **`adult-certificate-of-birth-attestation-self-service` (`USD 80`, `verified`)**:
   - **Downgraded from `verified` to `conflicting`**: The previously cited URL (`https://attestation.nationalpopulation.gov.ng/`) fails DNS resolution (`NXDOMAIN`) on 31 October 2026. NPC consolidated adult birth attestation into `https://vitalreg-selfservice.nationalpopulation.gov.ng/`, where the live price endpoint (`/payments/price/attestation_payment`) returns **`NGN 15,000`** (even when queried with `?currency=USD`).

## Separation of NPC fees from hospital, court, police and legal practitioner charges

NPC civil registration workflows frequently require supporting documents issued by other authorities:

- **Courts of Law (Judiciary)**: A **Court Sworn Affidavit** is mandatory for Adult Birth Attestation (18+), Attestation Re-issuance, unattended home Death Registration (where no medical certificate is available), and Deed Poll Name Change/Correction. Court affidavit fees (e.g., `₦500–₦750` on FCT High Court VARMS) are paid to the court, not to NPC.
- **Hospitals and Health Facilities**: A **Medical Certificate of Birth**, **Medical Certificate of Stillbirth**, or **Medical Certificate of Cause of Death** is issued by the attending hospital or clinic. Any hospital administrative charge is separate from NPC's registration fee.
- **Nigeria Police Force**: A **Police Report** is required alongside a medical certificate for road-side/crash Death Registration.
- **Legal Practitioners and Media Houses**: Preparing an executed **Deed Poll Agreement** and publishing a **Newspaper Change-of-Name Notice** involve private legal and publication fees separate from NPC's VitalReg Deed Poll fee.
- **National Identity Management Commission (NIMC)**: A valid **NIN** is required for VitalReg account creation and verification. Where an adult without a NIN obtains an NPC Temporary Attestation Number (`attest_no_nin`), NPC's VitalReg FAQ explicitly warns that it *"cannot be validated on the NIMC web modification portal. It is only meant for applicants without a NIN, to be used during NIN enrolment."*

## Responsible reviewer

The repository assigns review actions to an authenticated, authorised FeeLens management administrator through the existing CMS workflow. It does not assign a named individual reviewer or separate review team. No fictitious reviewer or approval event is manufactured.

## Dates and source record

Among the official NPC sources inspected:

- Official NPC Statement on First Baby of 2025 (`npc-first-baby-2025-statement`) states an explicit publication date of **January 1, 2025** (`2025-01-01`).
- Official NPC Statement on Civil Registration Laws (`npc-civil-registration-laws-2025-statement`) states an explicit publication date of **December 15, 2025** (`2025-12-15`).
- Official NPC Statement on First Baby of 2026 (`npc-first-baby-2026-statement`) states an explicit publication date of **January 1, 2026** (`2026-01-01`).
- The VitalReg Re-issuance module (`reissuance.q-B1wMse61.js` / `index-XX1KC8SJ.js`) defines the platform launch cutoff timestamp `V8 = "2023-11-08T00:00:00.999Z"` (**8 November 2023**) for legacy certificate re-issuance eligibility, but this is a service-eligibility cutoff date rather than a tariff publication date.
- Static NPC webpages (`/civil-registration`, `/FAQs`, `/faq-vitalreg`, `/our-offices`) and the VitalReg/eCRVS web apps do not display a provider publication or effective date on the page (`publicationDate: null`, `effectiveDate: null`). Server HTTP `Last-Modified` headers (`29 October 2026` on VitalReg; `26 October 2026` on eCRVS) are recorded only in technical notes and never inferred as provider publication dates.

The source record strictly distinguishes:

- provider publication date (`2025-01-01`, `2025-12-15`, `2026-01-01`, or `null` where unstated);
- provider effective date (`null` where unstated);
- date integrated into FeeLens (`2026-10-31`); and
- date internally reviewed (`2026-10-31`).

A missing provider date remains "Publication date not stated by source" / "Date not provided"; the internal review date is never substituted for a provider publication date.

## Staleness

No approved FeeLens review interval was located in the repository. A six-month review interval remains a proposal requiring owner approval, not an adopted policy. Any enactment of the proposed *Compulsory Civil Registration Bill, 2025*, publication of an official NPC Gazette/Service Charter fee schedule, or change to VitalReg portal charges should trigger an immediate review and status reassessment.

## Research gap

No repository records from the requested 28–29 October user-research fieldwork were located. No participant statements, counts, confusion points or design decisions are attributed to that fieldwork. The existing user-research form, URL, questions, response settings and linked spreadsheet remain untouched.
