# CAC Evidence Reconstruction — Fast-Track Review

## Source set
1. **CAC Service Level Agreement**, April 2026, version 1.0, 42 pages.
2. **Corporate Affairs Commission — New Schedule of Fees**, Official Gazette No. 92, Vol. 112, Government Notice No. 20, published 29 May 2025; schedule pages B625-B631.

## Extraction result
- SLA numbered services extracted: **127** (1-127).
- Gazette service/fee-option rows normalised: **151**.
- Gazette penalty rows normalised separately: **16**.
- SLA service inventory includes raw requirements, application mode, working-day timeline, fee wording, procedure and PDF page.
- Gazette matrix preserves category-specific and formula-based fee expressions rather than collapsing them into a single amount.

## Authority and reconciliation rules
- Treat the **Gazette schedule as the primary statutory fee authority** where it directly covers a CAC service.
- Treat the **April 2026 SLA as the primary operational service catalogue** for requirements, procedure, route and stated turnaround time.
- **Stamp duty is not a CAC service fee.** The SLA references stamp duty for some company/share-capital/charge transactions; model it separately as an external/statutory charge.
- **Penalties are not normal service fees.** The Gazette's annual-return and other default penalties are stored in a separate penalty matrix.
- Where SLA and Gazette differ, record the discrepancy and do not silently select one amount.
- Do not create public `verified` status without the existing authorised human-review event controls.

## Existing FeeLens CAC records
The prior simplified FeeLens set is supportable in principle but materially incomplete. Evidence in the Gazette supports:
- Business Name registration and CTC — N20,000.
- Business Name annual return / other post-registration or miscellaneous filing — N5,000 each.
- Business Name status report — N5,000.
- Company CTC documents/extracts — N5,000 each.
- Company incorporation with share capital — formula by entity class/share-capital band.
- Full electronic search per entity (view only) — N1,000.
- Standard name reservation — N1,000 for applicable entity classes.
- PSC view-only search — Free.

These records should be reconciled into the expanded catalogue rather than retained as the complete CAC coverage set.

## Additional service groups requiring publication consideration
The Gazette independently supports additional categories, including:
- company post-incorporation filings, status reports, good-standing letters, historical searches, due-diligence searches, striking-off/relisting, residential-address restriction, AGM extension and CTC;
- foreign-company services;
- LLP, LP, Business Name and Incorporated Trustee service schedules;
- accredited-agent/professional and insolvency-practitioner registration;
- value-added SMS subscription;
- website searches;
- personal/premium appointments;
- bulk products and directory/data products.

## Fast-track implementation status
This package is an **evidence-complete extraction seed**, not yet the final importer catalogue. The next mechanical step is to map the 127 SLA services and Gazette fee variants to stable FeeLens slugs/fee-options, add scoped retirement rules for obsolete CAC placeholders, and run the importer regression suite.
