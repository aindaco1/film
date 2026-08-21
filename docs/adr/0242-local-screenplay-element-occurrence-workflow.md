# ADR 0242: Local Screenplay Element-Occurrence Workflow

## Status

Accepted.

## Context

An element inventory is incomplete for production departments unless it answers where each item appears and lets a user reuse an existing item without entering a near-duplicate. Film already stores reviewed scene-element occurrences and has one bounded helper for normalized manual tags. A separate occurrence store or copy/paste buffer would duplicate that graph and introduce reconciliation work.

## Decision

The shared element-report projection includes ordered, source-free occurrence positions: occurrence ID, scene ID/ordinal/number/heading, source line, and non-dismissed review state. It excludes screenplay source text and occurrence excerpts. The Breakdown Element List renders these positions in an expandable ledger and uses scene IDs to navigate back to the source scene.

Applying an inventory element to the selected scene delegates to `addManualScreenplayElementOccurrence`. The helper reuses the normalized category/name identity, confirms an existing dismissed or suggested occurrence, creates at most one missing occurrence, and enforces the existing graph caps. No additional element or occurrence persistence model is introduced.

Markdown and formula-safe UTF-8 CSV handoffs serialize the same ordered position metadata used by the UI.

## Consequences

- Departments can audit every active occurrence and return to its scene without exposing script text in the report.
- Repetitive breakdown work reuses an existing element identity and updates scheduling/resource derivations immediately.
- Direct manual entry, inventory reuse, occurrence navigation, and exports remain consistent because they share one graph and projection.
- Multi-scene selection and bulk apply remain separate future decisions. Deterministic duplicate suggestions and explicit canonical merges are defined by ADR 0243; category reassignment is defined by ADR 0244.
