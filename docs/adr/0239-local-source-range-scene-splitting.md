# ADR 0239: Local Source-Range Scene Splitting

Date: 2026-08-21

## Status

Accepted

## Decision

Represent a split scene as two bounded schedule-only parts referencing one screenplay scene ID, explicit `A`/`B` labels, and non-overlapping absolute source-line ranges. Splitting is allowed only after a valid line inside the selected scene. It removes the whole-scene assignment and places both parts in that same schedule lane. Each part can then move and reorder independently through shared schedule transitions.

Merging removes every part for that source scene and returns the whole scene to Unassigned. This avoids silently choosing one of several shoot days. Locked schedules reject split, move, reorder, and merge transitions through the existing lock boundary.

Derive cast, location, availability, DOOD, scenario, budget, shot-use, and resource-use data from each part's source scene ID through the existing requirement graph. Count parts as separate strip assignments for per-day strip limits while deduplicating their source scene for cast, location, and company-move requirements on one day.

Snapshot a schedule day's parts into a generated call sheet. Sides slice the pinned local screenplay scene text only at those snapshotted ranges; no sides or screenplay copy is stored. Revision carry-forward preserves parts only for unchanged source scenes and shifts their ranges by the matched scene's line offset. Changed or unresolved split scenes collapse to the new revision's Unassigned source scene for manual review.

## Context

A montage under one heading or a long scene may need to shoot across several days. Duplicating the source scene would corrupt breakdown identity, inflate resource relationships, and make revision reconciliation ambiguous. A schedule-only range reference supports the production workflow while retaining one screenplay and one production-element graph.

## Consequences

- Scene parts enter the existing local schedule collection, encrypted backups, and explicit metadata-only stripboard export.
- Source text remains immutable and never enters schedule records, Worker requests, D1, provider logs, operation payloads, or model calls.
- Call sheets retain source scene identity plus part labels/ranges; sides read the pinned local source only when viewed or explicitly exported.
- One split currently creates two parts. Further subdivision requires merging and selecting a new boundary.
- Merging always returns the whole source scene to Unassigned for an explicit scheduling decision.
