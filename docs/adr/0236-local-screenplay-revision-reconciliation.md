# ADR 0236: Local Screenplay Revision Reconciliation

Date: 2026-08-21

## Status

Accepted

## Decision

Compare two browser-local screenplay breakdowns through a shared deterministic schema helper. Match scenes in three bounded passes: unique normalized production scene number, exact normalized scene content, then same-heading positional order. Report every next-revision scene as unchanged, changed, or added and every unmatched prior scene as removed. Match production elements only by exact category plus normalized name.

When a user imports one screenplay file while a prior revision is selected, carry matching occurrence-level human review states into the new graph. Do not carry review state during multi-file import because one unambiguous base cannot be inferred.

Keep downstream changes explicit. `Carry planning forward` creates draft copies of schedules linked to the prior revision, preserving matched day assignments and placing added scenes in the unassigned lane. Copy matching budget assumptions and cast/location availability into the new draft graph. Relink only shots with matched scenes and Talent/Location records with exact element matches. Leave unmatched records linked to the prior revision for manual review. Mark shots carried onto changed scenes as source-changed so their creative decisions receive another review.

Use source-record IDs on generated schedule, budget, and availability copies to make the action idempotent. Preserve every prior schedule and all final call sheets, sides, and production reports as historical snapshots. Export only a metadata-level Markdown revision report; screenplay source text remains available solely through the existing explicit breakdown/sides export paths.

## Context

Scene IDs intentionally include the imported revision hash, so the original same-breakdown reconciliation helper cannot map production work onto a changed draft. Dropping all assignments or mutating issued daily documents would make revision import too costly and unsafe for a micro-budget crew. A local deterministic comparison preserves script privacy and makes every carry-forward decision explainable without a cloud or local model.

## Consequences

- Revision comparison, review carry-forward, and downstream planning migration share schema helpers instead of workspace-specific matching logic.
- New and removed scenes remain visible and unmatched rather than being guessed by fuzzy similarity.
- Existing draft and locked schedules remain intact; generated copies always start unlocked for review.
- Call sheets, sides, and reports remain valid records of what was issued or completed against a specific draft.
- Ambiguous renamed scenes or elements require manual review and stay on the previous revision.
- All revision and carry-forward data enter encrypted workspace backups but never Worker requests, D1, provider logs, operation payloads, or model calls.
