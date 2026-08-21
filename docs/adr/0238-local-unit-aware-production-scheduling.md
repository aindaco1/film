# ADR 0238: Local Unit-Aware Production Scheduling

Date: 2026-08-21

## Status

Accepted

## Decision

Extend each existing production shoot day with one allowlisted unit identity: `main` or `second`. Keep main unit as the default and normalize older local schedules with no unit field to main unit. Unit edits use the existing locked-schedule transition, persistence, backup, reconciliation, and metadata-export paths; do not add a unit calendar, schedule collection, or Worker model.

Use the existing breakdown occurrence graph to detect a cast element required by main- and second-unit days on the same calendar date. Report one deterministic blocking conflict per cast member/date with the affected source scene IDs. Keep normal availability conflicts separate. Calculate consecutive shoot-day streaks independently for each unit so concurrent work does not inflate the observed metric.

Snapshot the selected shoot day's unit when creating a call sheet. Carry that snapshot through sides, daily reports, shot/resource-use projections, and explicit local handoff exports. Later schedule changes do not rewrite issued call sheets or reports.

## Context

Micro-budget productions may use a small second unit for inserts, exteriors, pickups, or parallel coverage. A separate schedule would duplicate scene assignment, availability, DOOD, budgeting, call-sheet, and revision state. Adding unit identity to the existing shoot-day graph supports the workflow while preserving one source of truth. The most actionable deterministic collision is a performer expected by two units on the same date.

## Consequences

- Main and second units share one versioned stripboard, scene graph, availability model, DOOD derivation, and backup path.
- Unit changes are rejected while a schedule is locked.
- Same-date cross-unit cast use is visible before call sheets are issued.
- Location concurrency is not automatically blocked because a location may support parallel work; availability and production judgment remain explicit.
- Unit identity and deterministic analysis remain local and never enter Worker requests, D1, provider logs, operation payloads, or model calls.
- Scene splitting remains a separate schedule-assignment decision.
