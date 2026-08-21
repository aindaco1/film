# ADR 0071: Restore Application Table Plan

Date: 2026-07-08

## Status

Accepted

## Decision

Extend encrypted backup restore previews with a table-level application plan.

The plan groups preview records by their future storage target, including workspace snapshot tables (`workspaces`, `projects`, `tasks`, `documents`, `people`, `equipment`, and `expenses`) and D1 planning export tables (`locations`, `opportunities`, `meeting_notes`, `equipment_requests`, `shows`, `merch_items`, `media_items`, and `production_roles`). Each row reports operation counts, create/update/skip/preview-only counts, field conflict counts, restore support, and blockers.

## Context

Operation samples are useful for inspection, but destructive restore work needs table-level planning before it can safely implement per-table conflict rechecks and apply code. The application-preflight route now persists proof and rollback guidance, but it does not yet receive a table plan. Adding the plan to the browser-side encrypted preview gives the UI and tests a stable contract without enabling destructive writes.

## Consequences

- `packages/backup` exposes `RestoreApplicationTablePlan` inside `RestoreApplicationPlan`.
- The web restore preview shows a compact `Application table plan` summary.
- Planning rows remain preview-only and workspace snapshot rows remain blocked until Worker-owned per-table restore application exists.
- ADR 0070 stores this shape as bounded, non-authoritative rollback-guidance metadata in application preflight records.
- Future Worker restore apply endpoints can use this shape as the basis for server-side table validation, but must recompute it server-side from trusted backup contents before mutating records.
