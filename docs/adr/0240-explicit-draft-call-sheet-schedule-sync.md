# ADR 0240: Explicit Draft Call-Sheet Schedule Sync

## Status

Accepted.

## Context

Micro-budget schedules change after call-sheet logistics and performer details have already been entered. A stale warning protects issued documents, but recreating a sheet loses useful work and encourages parallel copies of schedule data.

## Decision

Film exposes `Sync schedule` only when a draft call sheet's source schedule changed. Call-sheet creation and sync use one shared local snapshot builder for schedule-owned date, unit, day count, ordered whole-scene/split strips, source version, and reviewed cast requirements.

Sync preserves the call-sheet ID, title, general call and wrap, location/access/hospital/weather/safety/general notes, and matching performer/cast-call edits. Newly required cast starts at the sheet's general call time; removed requirements leave the draft. Final sheets return unchanged until explicitly reopened.

The transition stays in `packages/schema`, persists through the existing local workspace path, creates a bounded local audit event, and makes no Worker, D1, provider, or model request. Existing sides and production reports keep their own pinned-source behavior.

## Consequences

- Schedule drift remains visible and requires an operator action.
- Manual logistics are not silently replaced by regenerated schedule defaults.
- Split ranges and main/second-unit identity use the same projection in creation and sync.
- Issued final sheets and downstream daily documents remain historical by default.
