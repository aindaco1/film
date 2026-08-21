# ADR 0235: Local Production Shot Lists

Date: 2026-08-20

## Status

Accepted

## Decision

Add browser-local shot records linked to one scene in one screenplay breakdown. Store only shot-specific decisions: in-scene ordinal, editable shot number, description, planned/ready/captured/omitted status, framing, angle, movement, lens, camera/support, frame rate, bounded setup estimate/group, sound/lighting/general notes, and IDs referencing existing project documents.

Keep creation, normalization, updates, in-scene ordering, and derived manifests in `packages/schema`. Derive scene metadata, schedule-day use, and generated call-sheet use from existing breakdown, stripboard, and call-sheet collections. Reordering changes ordinals only among shots linked to the same project, breakdown, and scene. Do not copy screenplay text, scene headings, schedule rows, call-sheet data, document metadata, or document bytes into shot records.

Persist shots in the existing IndexedDB workspace and encrypted backup. Do not add an operation kind, D1 table, provider adapter, or model workflow. Generate local Markdown and formula-safe UTF-8 CSV handoffs from one shared normalized export-row projection. Both formats exclude screenplay source text, contacts, provider/private state, raw attachment bytes, and raw import paths.

## Context

Micro-budget productions need a practical shot plan that connects creative camera decisions to the day schedule. Film already owns the scene graph, stripboards, call sheets, and project documents. A standalone shot spreadsheet duplicates those relations and drifts quickly; a generated or model-inferred shot list would also be too opinionated for the local/private default.

## Consequences

- Shot planning stays connected to screenplay scenes and current production use without creating another scene or schedule source of truth.
- Users enter every creative and setup decision; Film performs no model inference or automated coverage recommendation.
- In-scene ordering is stable and independently editable from stripboard scene order.
- Sensitive shot plans remain encrypted in backups and appear outside Film only through an explicit local export.
- Storyboard image annotation, floor plans, camera reports, automatic shot generation, and collaborative canonical persistence remain separate decisions.
