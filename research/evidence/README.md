# FeeLens evidence register

This directory is a read-only export of the public FeeLens evidence catalogue at the time of this checkpoint.

## Contents

- `feelens-source-register.csv` contains one row per public source-to-service evidence link.
- `feelens-source-register.json` contains the same link records plus export counts and linked-service metadata.
- `archive-manifest.csv` records the directly downloaded official documents, their local paths, MIME types, SHA-256 hashes, and download date.
- `archive/` contains only directly accessible official documents. Official web pages remain represented by their source URLs instead of being scraped into local copies.
- `export-source-register.mjs` reproduces the register from the public read-only API and downloads PDF sources whose URLs are directly accessible.

## Source hierarchy

FeeLens uses three evidence tiers:

1. Acts, regulations, gazettes, statutory instruments, approved fee schedules, and circulars.
2. Official MDA websites, portals, notices, FAQs, fee pages, process pages, and service-level agreements.
3. Formal institutional correspondence, official email or letters, and FOI responses where appropriate.

Blogs, unofficial agents, and third-party websites are not treated as sole authoritative evidence.

## Dates and conflicts

Publication and effective dates are copied from the public source record. A missing date remains blank; it is never inferred from a URL or download timestamp. `last_checked` is the source record's checked/accessed date, while `downloaded_at` in the archive manifest records when a local copy was retrieved.

When official evidence conflicts, the linked service retains a conflicting status. The register does not resolve the disagreement by choosing an amount. Unknown is not zero, and free is a distinct fee model.

## Maintenance

Run the exporter from the repository root with:

```bash
node research/evidence/export-source-register.mjs
```

The exporter reads the public API only. It does not write to the FeeLens database, call admin endpoints, change production data, or deploy anything. Review the resulting counts, source URLs, downloaded files, and hashes before replacing an archived register.
