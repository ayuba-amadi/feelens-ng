# FeeLens 15-MDA Production Freeze

- Freeze date: 2026-10-18
- Milestone: 15-MDA pilot production baseline
- Rollout checkpoint commit: `aadd1c9f9f11a8853c967c4ca7408202b1d63d94`
- Production backup: `/home/vgrphaph/feelens-backups/20261018-075815/`
- Duplicate risk: 0
- Latest idempotency dry-run planned writes: 0

## Final production totals

| Record | Count |
| --- | ---: |
| Active pilot MDAs | 15 |
| Active services | 77 |
| Current fee options | 77 |
| Verified fee options | 70 |
| Pending fee options | 5 |
| Conflicting fee options | 2 |
| Sources | 28 |
| Evidence links | 93 |
| Official channels | 85 |
| Verification events | 77 |
| Import audit records | 452 |

## Batch scope

### Batch 1

1. FCT Internal Revenue Service
2. National Identity Management Commission
3. Nigeria Immigration Service
4. Federal Road Safety Corps / Nigeria Driver's Licence
5. Corporate Affairs Commission

### Batch 2

1. Abuja Geographic Information Systems / FCT Lands
2. High Court of the Federal Capital Territory
3. National Population Commission
4. Joint Admissions and Matriculation Board
5. Nigerian Export Promotion Council

### Batch 3

1. National Agency for Food and Drug Administration and Control
2. Standards Organisation of Nigeria
3. Federal Ministry of Interior - Marriage & Civil Registry
4. Nigerian Copyright Commission
5. Nigerian Communications Commission

## Backup integrity

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `feelens-api.tar.gz` | 57,902 bytes | `99fc29ad407beb6e2218bfda3148519473685ab22d0ead75ad0c2de8a66b83e2` |
| `public_html.tar.gz` | 205,979 bytes | `ad5ade0802c4913fb84ff73c49f84461f9ca2d080fb0c14d93661f0a1555a036` |
| `vgrphaph_feelens_prod__feelens_app.dump` | 94,479 bytes | `788d32e3908eb9c71b686473645b8e7ec3882f7b92a78e7cf4122aad22c90634` |

The archives and PostgreSQL custom-format dump passed integrity inspection. The backup directory also contains `SHA256SUMS`, and all checksum checks passed.

## Known warnings

- Five NAFDAC services remain pending and must not be presented as verified without newer official evidence.
- Two services remain conflicting; no single fee should be presented as authoritative while their official evidence conflicts.
- Some official sources lack an exact publication or effective date. Those fields remain blank rather than using fabricated dates.

No additional MDA data was imported as part of this freeze operation.
