# ADR 0072: Notion Planning Commit Table Summary

Date: 2026-07-08

## Status

Accepted

## Decision

Return a per-table summary from `POST /api/imports/notion/planning/commit`.

The summary groups accepted, committed, idempotent, update-preview, and valid-kind rejected planning rows by their target D1 planning table. The web import inspector renders a compact `Planning D1 tables` line with committed/idempotent/update-preview/rejected counts per table.

## Context

The planning import route already writes deterministic, idempotent D1 rows for first-class production-planning tables. The UI only showed aggregate committed/idempotent/rejected counts, which made it hard to see whether a Notion export touched locations, opportunities, roles, or another planning table. A table summary improves operator review without adding update writes.

## Consequences

- Worker responses include `tableSummary` rows with kind, table name, accepted count, committed count, idempotent count, update-preview count, and rejected count.
- Audit metadata includes the same table summary.
- Existing idempotent behavior remains unchanged; repeated rows are still not updated.
- Rich changed-row previews and safe update writes remain future work.
