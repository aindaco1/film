# ADR 0078: Restore Attachment Package Plan

Date: 2026-07-08

## Status

Accepted

## Decision

Add a structured attachment package plan to encrypted backup restore previews.

## Context

Attachment bytes are intentionally excluded from workspace snapshots and backup payloads. Restore previews already warned that attachment bytes are metadata-only, but future restore application needs more than a warning: it needs a stable contract for attachment metadata counts, source-byte totals, stored-R2 coverage, and blockers before any byte restore can be enabled.

## Consequences

- `summarizeRestorePreview` now includes `applicationPlan.attachmentPackagePlan`.
- The plan reports metadata record count, staged-local count, R2 dry-run count, stored-R2 count, total source bytes, package requirement, and byte-restore support.
- The web restore preview displays the attachment package requirement when a backup includes attachment metadata.
- The plan remains non-destructive. Byte restore is blocked until a verified attachment package and destination write rules exist.
