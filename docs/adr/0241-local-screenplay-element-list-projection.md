# ADR 0241: Local Screenplay Element-List Projection

## Status

Accepted.

## Context

Micro-budget departments need a complete, filterable inventory they can hand off without re-reading every scene or exposing the screenplay. Film already has one reviewed scene, element, and occurrence graph that feeds scheduling and resource workflows. A second inventory store would duplicate review state and let breakdown, schedule, and handoff results drift.

## Decision

Film derives the Element List through `buildScreenplayElementReport` in `packages/schema`. The selected category applies across the whole selected revision. Rows contain active element metadata, non-dismissed occurrence counts, unique scene uses, and first occurrence. Dismissed elements and occurrences are excluded, and screenplay source text is not copied into the projection.

The Breakdown table, Markdown handoff, and formula-safe UTF-8 CSV handoff consume those same projected rows. Manual tags and review decisions therefore appear immediately without synchronization or a parallel persistence model.

## Consequences

- Breakdown review, manual tags, scheduling derivations, and element handoffs remain on one graph.
- Explicit element-list exports omit screenplay text, contacts, provider state, private Worker state, attachments, and raw import paths.
- The existing breakdown JSON remains the explicit full-plaintext export.
- PDF and formatted workbook output are deferred; Markdown and CSV cover the MVP handoff without adding document-generation infrastructure.
