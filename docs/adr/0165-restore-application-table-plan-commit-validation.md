# ADR 0165: Restore Application Table Plan Commit Validation

## Status

Accepted

## Decision

Tighten `POST /api/restores/application-commit` so workspace-snapshot restore records must match the submitted application table plan before any D1 conflict checks or writes run.

The Worker now computes per-table workspace-snapshot counts from the submitted records and compares table name, source, entity type, operation count, create count, update count, skip count, preview-only count, and restore-support status against the request's workspace-snapshot table-plan rows. If the preflight row contains an `applicationTablePlan` inside rollback guidance, the commit request's table plan must also match that stored preflight plan exactly.

Mismatches return `restore_application_table_plan_record_mismatch` or `restore_application_preflight_table_plan_mismatch` with `destructiveWrite: false`.

## Context

Application preflights already persisted bounded table-plan metadata, and application commits already checked preview counts and fresh D1 conflicts. However, a malformed client could still submit a broad table plan with a narrower or differently shaped record list. That weakened the handoff between preview, preflight, and commit.

## Consequences

- Workspace snapshot commits are tied more tightly to the table plan the user reviewed.
- Planning table-plan rows remain separate and are still validated by the planning commit path.
- Existing legacy preflight rows without a stored application table plan can still proceed if the request table plan matches the submitted records.
