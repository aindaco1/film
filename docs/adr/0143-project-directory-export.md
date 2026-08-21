# ADR 0143: Project Directory Export

## Status

Accepted.

## Decision

Add a local Markdown `Export directory` action to the Projects workspace.

The export uses the current Projects filter and includes visible project metadata such as type, phase, shoot dates, location, runtime, format, progress, budget totals, task counts, document counts, people counts, equipment counts, and expense counts.

The export excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, raw import source paths, and Markdown document bodies. It is generated in browser memory and downloaded directly as Markdown. It does not queue operations, call the Worker, update project records, or expose document body text.

## Context

The Projects workspace is the broadest project directory surface. Film already supports selected-project handoff exports, but users also need a workspace-level index they can share for reviews, planning, and archive audits.

Using the current filter makes the export match the visible operator intent without adding saved views or a second reporting model.

## Consequences

- Users can export filtered project directories without network access or provider credentials.
- The directory remains metadata-only and does not weaken document-body privacy.
- Future saved reports, CSV exports, or team-shared directories must add explicit data contracts, authorization, audit, and backup/restore behavior first.
