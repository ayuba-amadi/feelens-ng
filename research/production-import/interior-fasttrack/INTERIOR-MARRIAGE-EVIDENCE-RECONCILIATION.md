# Interior marriage services evidence reconciliation

## Baseline

Branch `catalogue-rebuild-interior-2026-11-01`, HEAD `689b37bc071d4882a8ee7239e2fe327972d94c79`. Baseline status already showed staged additions for the production audit, recovery patches and `research/repo/`; those were left untouched.

## Evidence and authority

The official Federal Ministry of Interior website (https://interior.gov.ng/) labels and links “Marriage Services” to https://candb.interior.gov.ng/marriage. The linked public Ministry marriage portal displays five service cards, amounts and short descriptions. It was inspected 1 November 2026 without signing in, submitting an application or entering personal data. The /marriage/register route is an account-registration form; review stopped before account creation. The portal map also lists a public Marriage Notice Board, whose public description does not establish a separate paid service.

Local file `research/repo/Siraki — Ministry of Interior.pdf` (1 page; SHA-256 `9f1214cf06b339d8a65ee3adfe2af6b77b7de1d477ca399861650d9c260ba5e0`) is a printout of Siraki Ministry-assistant content, metadata dated 31 October 2026. It repeats the ₦75,000 ordinary and ₦100,000 special fees. It is not a fee schedule or Ministry portal page and is not used as fee evidence.

Portal and Ministry homepage have no published/effective dates. No publication/effective dates are asserted. Processing timelines, detailed requirements, legal distinctions beyond the portal's labels, and separate portal/Remita/bank charges are not publicly stated on the reviewed pages.

## Canonical services and fees

Five supported services are retained with existing public slugs: ordinary marriage application ₦75,000; special marriage application ₦100,000; marriage document verification ₦50,000; Certified True Copy ₦50,000; change of venue request ₦150,000. Amounts are what the Ministry-linked public portal displays, not a claim that those amounts include transaction charges. All options are `pending` for FeeLens human review; no review event is generated. Requirements are left empty where the public source does not state them. Portal-authenticated processes were not inspected.

The distinctions remain separate. The portal does not specify the ordinary/special eligibility split; only the local assistant printout says ordinary between two Nigerians and special for a Nigerian/non-Nigerian or two non-Nigerians, so that detail is not adopted.

## Existing-record reconciliation

Batch 3 contains exactly five legacy Interior service slugs. Each is **KEEP / UPDATE**: service identity, slug and displayed amount are retained; evidence and verification status are updated to the directly inspected official portal, with `pending` status and cautious public-only descriptions. The former source-register note claimed portal support without retaining the actual amounts or displayed excerpts; the live official page now corroborates all five amounts. No legacy service is unsupported, so no service, fee or channel retirement is required. Existing history is preserved.

## Fee separation

The public page displays one service amount per card. It does not separately state a portal fee, Remita charge, bank charge, agent/professional charge or other external fee. No such amount is added or combined. The payment guide tells users to confirm any amount in the official workflow.

## Conflicts and exclusions

There are zero unresolved conflicts between fee-authoritative sources. Siraki repeats the two registration amounts but is an assistant printout, not an independent authoritative schedule. The portal's Marriage Notice Board is excluded from active services because its page listing alone does not establish a service offering or price; details are in the unsupported register.

## Batch and publication

Interior is in Batch 3. A deterministic catalogue overlay is applied both when loading the canonical Batch 3 manifest and when `importBatch()` receives the raw Batch 3 manifest directly. Other batches and Batch 3 MDA composition are unchanged. Pending catalogue status does not constitute public verification. Importer does not create human review events.
