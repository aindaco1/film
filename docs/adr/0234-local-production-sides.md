# ADR 0234: Local Production Sides

Date: 2026-08-20

## Status

Accepted

## Decision

Add a selected-project Sides workspace derived from the existing production call-sheet snapshot and its pinned screenplay breakdown. Keep the projection in `packages/schema`: preserve the call sheet's scene order, attach only matching per-scene cast-call snapshots, retain source line metadata, and report missing scene IDs. Reject a call sheet and breakdown that do not belong to the same project and source relationship.

Do not create a sides record, scene-text copy, new IndexedDB collection, backup payload, operation kind, D1 table, provider adapter, or model workflow. Reuse the selected call-sheet state and existing screenplay source. Report source-schedule drift and a newer available screenplay revision without silently changing the pinned breakdown.

Allow two explicit local source exports: Markdown for editable handoff and standalone letter-sized HTML for browser printing. Both include the scheduled screenplay scene text because that is the user's requested artifact. The HTML escapes all source and metadata, contains no script or external resources, and sets a restrictive content-security policy. Both formats exclude contact fields, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import paths.

## Context

Micro-budget productions need daily sides for cast and crew, but Film already owns the necessary screenplay scenes, stripboard, and call-sheet snapshot. Persisting another source-text collection would create revision ambiguity and enlarge backup, migration, and privacy surfaces. Existing call-sheet and report exports intentionally omit screenplay source text, so sides require a separate, visibly explicit source-export boundary.

## Consequences

- Sides stay consistent with the issued call sheet without duplicating screenplay data.
- New revisions and schedule edits remain visible without rewriting an operational snapshot.
- Screenplay text appears only on screen or in a user-triggered local sides download; it is not sent to the Worker, D1, providers, or models.
- Markdown and printable HTML cover the first micro-budget handoff without adding PDF rendering or a browser print service.
- Watermarks, revision-color page rendering, scene-specific annotations, distribution tracking, and signed delivery remain separate decisions.
