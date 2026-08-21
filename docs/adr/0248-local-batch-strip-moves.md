# ADR 0248: Local Batch Strip Moves

## Status

Accepted.

## Context

Micro-budget producers frequently regroup several strips when balancing locations, cast, company moves, and parallel units. Reassigning each strip through a separate control is slow and can leave a partially moved group if one reference is stale.

## Decision

Film supports a transient schedule-scoped selection of up to 200 whole-scene or split-part strip IDs. The selection stays in application memory and clears after a successful move, any persisted schedule mutation, schedule-version change, or reload. It is disabled when the selected schedule is locked.

A shared schema helper deduplicates references, validates the destination and every selected strip before mutation, and then delegates each required move to the existing single-scene or single-part transition with one timestamp. Strips already at the destination are reported separately and remain in place. An empty, over-limit, malformed, stale, or cross-schedule request fails before any returned schedule changes.

The operation stores no screenplay source or excerpt in its selection or summary. It creates no Worker request, operation payload, D1 row, provider call, or model call. Persisted assignments continue to use the existing schedule graph, encrypted backup, and explicit metadata-only export paths.

## Consequences

- Producers can regroup complete scenes and split ranges in one bounded action.
- Single-strip and batch behavior share the same mutation rules instead of maintaining parallel assignment logic.
- Reloading or switching versions cannot silently reuse a prior edit selection.
- Batch selection is workflow state, while completed strip assignments remain ordinary versioned schedule state.
