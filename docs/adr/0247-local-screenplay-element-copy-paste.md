# ADR 0247: Local Screenplay Element Copy and Paste

## Status

Accepted.

## Context

Repeated locations, props, wardrobe, equipment, and cast combinations make scene-by-scene breakdown entry slow. Creating a second clipboard-shaped element store or copying occurrence excerpts would introduce drift and retain more script-adjacent data than the workflow needs.

## Decision

Film can copy the active elements visible in the selected scene and category filter, up to 100 IDs. The in-app selection stores only the breakdown ID, source scene ID, source label, and element IDs in transient application memory. It is not the OS clipboard, is not persisted, and clears on reload or revision change.

A shared schema batch helper validates the target scene and every unique active element before making any change. It delegates each write to the same existing-element occurrence helper used by single-element reuse and manual exact-name reuse. The result reports added, reactivated, and already-present counts. Repeated paste is idempotent for an element and target scene; an existing dismissed occurrence is confirmed rather than duplicated.

The operation stays inside the selected local screenplay graph. It does not copy source text or excerpts into its summary and creates no Worker request, D1 row, operation payload, provider call, or model call.

## Consequences

- Repetitive breakdown work can be applied across scenes without recreating element identities.
- Category filtering doubles as a bounded copy selection without adding persistent checkbox state.
- A stale, cross-revision, unknown, or dismissed element selection fails before partial mutation.
- Schedule, DOOD, resource, report, and export projections see pasted occurrences immediately through the existing graph.
