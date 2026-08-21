# ADR 0073: Notion Planning Update Previews

Date: 2026-07-08

## Status

Accepted

## Decision

Classify changed existing Notion planning rows as `updatePreview` in `POST /api/imports/notion/planning/commit`.

When a normalized planning import row maps to an existing deterministic D1 row ID, the Worker now compares a table-specific persisted signature to the incoming normalized row. Exact matches remain `idempotent`. Differences are returned in `updatePreview`, counted in `tableSummary`, and described with bounded field-level `updatePreviewDetails`, but the Worker does not update the D1 row.

## Context

The planning import route already used deterministic row IDs and `INSERT OR IGNORE`, which made repeated imports safe. The tradeoff was that changed rows looked idempotent, hiding what would need to be updated later. Update previews improve operator visibility before real planning update writes exist.

## Consequences

- Existing rows with changed projected fields are reported as `updatePreview`.
- Update previews include up to 20 changed rows and up to 8 field changes per row.
- D1 rows are not modified by update previews.
- The web import inspector shows aggregate update-preview counts.
- Future work still needs explicit update approval, conflict handling, per-field diffs, and audited D1 update writes.
