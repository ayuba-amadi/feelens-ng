# FeeLens NG Milestone 3B data coverage

This document describes the 15-institution pilot registry after Milestone 3B. It is a coverage report, not a claim that every institution has a complete or transparent fee schedule. An institution may have an official website and still have missing, pending, or conflicting fee data.

## Dataset totals

| Metric | Count |
| --- | ---: |
| Institutions | 15 |
| Services | 62 |
| Fee options | 78 |
| Verified fee options | 45 |
| Pending fee options | 13 |
| Conflicting fee options | 2 |
| Unable-to-verify fee options | 18 |
| Not-located fee options | 18 |
| Services with an official fee schedule referenced but amount not ingested | 13 |
| Services where a public fee amount was not located | 9 |
| Evidence sources | 35 |

## Institution coverage

`Primary source coverage` is the number of distinct source records linked from that institution’s service fee options or official channels. It does not measure source quality beyond the source and verification rules, and it does not mean the institution’s full schedule has been ingested.

| Institution | Jurisdiction | Services | Verified fee options | Pending fee options | Conflicting fee options | Not-located fee options | Primary source coverage |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| National Identity Management Commission (NIMC) | Federal | 4 | 3 | 0 | 2 | 0 | 2 |
| Nigeria Immigration Service (NIS) | Federal | 2 | 2 | 0 | 0 | 0 | 2 |
| Federal Capital Territory Internal Revenue Service (FCT-IRS) | FCT | 7 | 7 | 0 | 0 | 0 | 2 |
| Federal Ministry of Interior — Marriage/Civil Registry | Federal | 5 | 5 | 0 | 0 | 0 | 1 |
| Abuja Geographic Information Systems (AGIS) | FCT | 7 | 7 | 0 | 0 | 0 | 3 |
| Joint Admissions and Matriculation Board (JAMB) | Federal | 5 | 10 | 0 | 0 | 0 | 1 |
| Standards Organisation of Nigeria (SON) | Federal | 5 | 6 | 0 | 0 | 0 | 2 |
| Nigerian Electricity Management Services Agency (NEMSA) | Federal | 3 | 3 | 0 | 0 | 0 | 1 |
| National Population Commission (NPC) | Federal | 2 | 2 | 0 | 0 | 0 | 2 |
| Corporate Affairs Commission (CAC) | Federal | 6 | 0 | 6 | 0 | 0 | 3 |
| National Agency for Food and Drug Administration and Control (NAFDAC) | Federal | 3 | 0 | 3 | 0 | 0 | 2 |
| FCT Department of Development Control | FCT | 3 | 0 | 0 | 0 | 3 | 1 |
| FCT Department of Outdoor Advertisement & Signage (DOAS) | FCT | 3 | 0 | 0 | 0 | 3 | 1 |
| FCT Transportation Secretariat / AIITIS | FCT | 3 | 0 | 0 | 0 | 12 | 1 |
| FCT Water Board (FCTWB) | FCT | 4 | 0 | 4 | 0 | 0 | 3 |

## Status interpretation

- **Verified** — the fee option has a valid structure and active official evidence.
- **Pending** — an official schedule or fee-estimation source is identified, but the exact amount has not been ingested.
- **Conflicting** — official sources disagree; the option must not be presented as a current verified fee.
- **Not located / unable to verify** — the service is confirmed by an official source, but a current public numeric amount was not located in the sources reviewed.

CAC, NAFDAC, and FCT Water Board are represented as `published` and `pending` because official schedules or fee tools are known to exist. Development Control, DOAS, and AIITIS are represented as `not_located` and `unable_to_verify` because the supplied official pages identify the services or fee classes but do not provide the numeric schedules used by this dataset.

FeeLens deliberately does not display unknown values as zero, and does not infer amounts from third-party material. The next research pass can ingest exact schedules into the existing fee-option model without changing the service architecture.
