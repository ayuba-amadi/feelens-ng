# JAMB evidence reconciliation

## Scope and method

The local file `research/repo/JAMB_PAYMENT & SERVICES.pdf` was read in full (one page). It lists rows 1–14 as JAMB services, including six separately named data-correction categories under row 11, and row 15 as separately itemised service charges. The six correction categories remain separate fee options under the existing public `correction-of-data-jamb` service slug. The separately itemised centre charges are never added to JAMB fee amounts.

The archived 31-page 2026 JAMB Bulletin was extracted in full and checked for registration pricing and operational statements. It explicitly supports Direct Entry ₦5,700, UTME without mock ₦7,200 and UTME with mock ₦8,700. The archived 142-page 2025 Training Manual was inspected, including the scanned service table on **printed p. 100**. It states “Printing of Result Slip (Coloured)”, portal charge ₦1,500, PRC/PTC service charge ₦200 and non-JAMB centre charge ₦300. The official JAMB portal at https://portal.jamb.gov.ng/ also lists Print Result Slip at ₦1,500.

No service requirements, detailed process steps or service processing timelines are asserted where these sources do not state them. For the 2026 registration items, the 2025 manual is not used to infer 2026 requirements. The source capture/metadata dates are not treated as JAMB publication or effective dates. Bulletin publication date is proven as 2 March 2026 by the document. Training-manual publication date and payment-page publication/effective dates are unknown.

## Source precedence and fee handling

The official 2026 bulletin governs the three 2026 registration products. The official Payment & Services page supports the generic services and listed fees. The official portal corroborates the ₦1,500 result-slip portal charge found in the 2025 manual, printed p. 100. The Payment & Services page lists ₦1,000 JAMB Result Slip plus separate ₦100 CBT service charge. These official values are retained as conflicting; no amount is selected. Portal charges and CBT/centre service charges remain separate.

## Existing Batch 2 JAMB record dispositions

| Existing slug | Disposition | Rationale |
| --- | --- | --- |
| `2026-direct-entry-registration` | KEEP | Existing public slug and amount retained; evidence/page references expanded. |
| `2026-utme-registration-without-mock` | KEEP | Existing public slug and amount retained; evidence/page references expanded. |
| `2026-utme-registration-with-mock` | KEEP | Existing public slug and amount retained; evidence/page references expanded. |
| `correction-of-data-jamb` | UPDATE | Existing slug retained; split fee options preserve the six separately listed categories and separate ₦100 CBT charge context. |
| `printing-of-result-slip` | CONFLICT | Existing slug retained; both recorded source values remain separate, with both evidence references and separate centre charges. |

The Payment & Services list adds: condonment of illegal admission, application for transfer, change of admission letter, fresh application admission letter, generic UTME registration, DE registration, NOUN registration, distance learning registration, sandwich registration, part-time registration, retrieve registration number, and JAMB admission letter. The generic UTME/DE entries remain distinct from the 2026 product variants because their source context/year and fee presentation differ.

No existing service is retired. No legacy record is deleted or globally deactivated. Old non-JAMB MDA data are left to existing importer behavior.

## Conflict register summary

Result slip remains unresolved: the official Payment & Services source states ₦1,000 JAMB fee plus separate ₦100 CBT service charge. The 2025 Training Manual, printed p. 100, states a ₦1,500 coloured-result-slip portal charge and separate ₦200 PRC/PTC or ₦300 non-JAMB centre service charge. The official JAMB portal also lists Print Result Slip ₦1,500. All evidence is retained, the fee options remain `conflicting`, and no amount is selected. No other fee conflicts were discovered in the checked local payment page and bulletin for services in this catalogue.

## Public verification controls

The catalogue is source-supported and awaiting authorised human review. Internal fee `verificationStatus` values reflect source support and conflict state only; this importer creates no human verification events. The existing public verification controls remain responsible for requiring authorised human review before public verified status.
