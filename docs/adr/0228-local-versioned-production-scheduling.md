# ADR 0228: Local Versioned Production Scheduling

Date: 2026-08-20

## Status

Accepted

## Decision

Build production scheduling as an additive browser-local graph over the screenplay breakdown from ADR 0227. A schedule version references one breakdown revision and owns ordered shoot days, assigned and unassigned scene IDs, a draft or locked state, and explicit micro-budget assumptions. Duplicating a schedule creates an independent draft with new schedule and day IDs while preserving assignments and assumptions for side-by-side comparison.

Keep all schedule transitions in `packages/schema`: create, duplicate, add/remove day, assign/reorder scene, update day metadata, lock/unlock, reconcile scenes, and update bounded assumptions. The web app only renders these contracts and persists the resulting workspace state. Older local workspaces receive the documented default assumptions during workspace normalization.

Store cast and location availability as windows keyed to existing breakdown element IDs. Deterministic analysis derives required resources from reviewed scene occurrences, reports unavailable resources as blocking conflicts, missing confirmation as warnings, and assigned undated days as warnings. The same requirement graph produces a cast day-out-of-days work/off matrix.

Scenario analysis reports observed shoot days, assigned scenes, location transitions, estimated company-move minutes, peak scenes/locations/cast per day, consecutive dated days, availability conflicts, and explicit assumption breaches. It does not infer page count, scene duration, labor compliance, cost, or a preferred scenario. Comparison shows neutral B-minus-A deltas.

The default micro-budget assumptions are six scenes per day, two locations per day, eight cast per day, six consecutive shoot days, and 90 minutes reserved per company move. These are editable per version and bounded, not hidden recommendations.

Schedules, availability windows, DOOD rows, assumptions, and analysis remain local and private by default. They enter encrypted workspace backups. Explicit stripboard JSON export is metadata-only, declares `user_requested_schedule_metadata_export`, and omits screenplay source text. No scheduling data enters Worker requests, D1, provider logs, operation payloads, or model calls.

## Context

Micro-budget non-union productions need fast manual scheduling, visible cast/location constraints, and inexpensive scenario comparison. The screenplay graph already provides stable scene, cast, and location identities, so a separate scheduling parser or resource store would create drift. Local deterministic analysis also preserves script privacy and works offline.

## Consequences

- Schedule versions can be created, reordered, dated, duplicated, locked, compared, backed up, restored, and exported without network access.
- Availability and DOOD use the same reviewed occurrence graph as Breakdown.
- Assumption breaches remain explainable and tied to exact day metrics.
- Company moves count adjacent assigned scene-location changes; the minute estimate is only that count multiplied by the version's explicit assumption.
- Canonical D1 schedule persistence remains deferred until client-side encryption, key recovery, authorization, revision conflict, collaboration, and restore contracts are decided.
