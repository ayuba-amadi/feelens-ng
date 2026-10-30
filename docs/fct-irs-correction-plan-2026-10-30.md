# FCT-IRS TIN correction: production execution plan

Status: **not executed**. The production admin endpoint returned 401 without an authenticated session. No production data, permissions, schema, or deployment were changed. The NIMC date-of-birth example remains excluded from the showcase.

## Preflight snapshot and outstanding checks

Public API observed on 30 October 2026: FCT-IRS has the active combined service `tax-id-tin-generation-or-retrieval` (service ID 1); its current fee option is ID 1, free and verified, last checked 18 October 2026. It has FAQ source ID 1 and active website channel ID 3, `https://fctirs.gov.ng/`. The FAQ excerpt incorrectly suggests the FAQ itself supports both activities as free. The public API does not expose the complete administrative audit history, verification history, inactive relationships, or current audit state. An authenticated administrator must capture those and the full CMS records before any write, and confirm a recoverable backup or equivalent governed recovery procedure. IDs here are administrative references, not proposed public content.

## Intended records

Create two **inactive** services under the existing FCT-IRS MDA using the CMS; leave the existing service active throughout preparation. Confirm slug uniqueness in the CMS first. Create each fee as current, free, initially pending, without an amount; link sources and add service-owned channels before adding the verified decision. Set source publication and effective dates only if stated by the source. Reuse an existing source if its URL matches and its metadata is appropriate; otherwise create it. Record the actual review/access dates, never a prospective date.

| Field | Generation / enrolment | Retrieval |
| --- | --- | --- |
| Service name | TIN generation / enrolment | TIN retrieval |
| Proposed slug | `tin-generation-enrolment` | `tin-retrieval` |
| Fee label and model | TIN generation / enrolment; Free | FCT-IRS TIN retrieval service charge; Free |
| Evidence links | [FCT-IRS FAQ](https://fctirs.gov.ng/faq/) and [FCT-IRS SLA](https://fctirs.gov.ng/wp-content/uploads/FCTIRS-SLA-Version1.0.pdf) | [FCT-IRS FAQ](https://fctirs.gov.ng/faq/) and [FCT-IRS free-service notice](https://fctirs.gov.ng/offering-and-accepting-processing-fee-or-service-charge-gratification-is-not-allowed/) |
| Primary source | FAQ | Free-service notice for the FCT-IRS fee claim; FAQ is process evidence |
| Channels | The individual and non-individual JTB registration URLs linked by the FAQ, with accurately labelled audiences | USSD `*7737*22#`, as described by the FAQ; link to the FAQ as the official instructions, and include the carrier-charge caveat |

Generation evidence summary: “The FCT-IRS FAQ explicitly states that TIN generation is free of charge. The FCT-IRS Service Level Agreement also lists Taxpayer Identification Number Enrolment with a cost of service of Free.”

Retrieval evidence summary: “The FCT-IRS FAQ explains the official process for retrieving a lost TIN. FCT-IRS separately states that its services are rendered free of charge and that processing/service charges are not permitted. This record concerns the FCT-IRS service charge; it does not establish whether a telecommunications provider may apply a separate USSD or network charge.” Applying the general policy to this service is an inference. It does not mean the FAQ expressly prices retrieval or that a carrier charge has been verified.

For each record, create a fee-level verification event with status Verified, the above summary, method “Review of official FCT-IRS sources”, the actual checked time, and the appropriate primary source. The CMS attaches multiple sources to the fee, while an event has at most one primary source. Confirm both fee-source links, event history and audited mutations after saving. Verify the actual official channels against the FAQ before attaching them. Activate each service only after its data and relationships are complete.

## Release and acceptance gates

The local public API retains per-fee sources, but it still returns internal IDs and raw enum values; the live API currently returns IDs and enums and does not include per-fee sources. The local service-detail query also does not return verification-event evidence summaries, and the local verification panel does not render them. Source excerpts are not rendered by the evidence card. Therefore CMS edits alone cannot satisfy the requested public API and panel acceptance; implementation, compatibility review, testing and deployment of the needed public API/UI changes are required before final acceptance. Do not claim these requirements passed based on the local source alone.

Once the functionality is available, activate the completed replacements and verify both production API responses and rendered pages, including evidence attribution, verified dates, channels and the telecom caveat. Confirm no internal IDs or raw enums are exposed as required, and that the per-fee source relationships remain correct. Only after both pages pass, deactivate the old service via the CMS, preserving its records and audit history; do not delete it. The existing routes do not establish a redirect for the old slug, so provide and test a reviewed compatibility solution before retirement. Verify the old URL behavior and both replacements after retirement. Keep the old record active if these gates fail; do not leave a public gap.
