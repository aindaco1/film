# ADR 0067: Restore Application Operation Samples

Date: 2026-07-08

## Status

Accepted

## Decision

Extend the preview-only restore application plan with bounded per-record operation samples.

`summarizeRestorePreview` now reports `operationPolicy: preview_only`, `operationCount`, and up to eight `operationSamples`. Each sample identifies the record or planning row, the planned action (`create`, `update`, or `skip`), status, field-conflict count, and blocker text when the operation cannot be applied.

## Context

Film already reports aggregate restore application counts and per-record preview differences. Future per-item restore needs a more explicit operation contract, but destructive writes are still blocked. Operation samples let the app explain what would happen next without applying data or carrying full backup payloads into Worker dry-run calls.

## Consequences

- The restore preview panel shows application operation samples alongside aggregate create/update counts.
- Planning rows remain `skip` operations with per-table restore blockers.
- The plan still returns `destructiveWrite: false`, `canApply: false`, and `requiresWorkerCommit: true`.
- Future restore application can replace samples with a full, paginated, Worker-validated operation plan before enabling writes.
