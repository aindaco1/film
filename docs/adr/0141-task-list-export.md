# ADR 0141: Task List Export

## Status

Accepted.

## Decision

Add a local Markdown `Export tasks` action to the selected-project Tasks workspace.

The task list export includes selected-project task counts, status coverage, and open task rows from existing local task metadata. It is generated in browser memory and downloaded directly as Markdown.

The export excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. It does not queue an operation, create a D1 row, call Google Calendar, update task records, or become a live scheduling integration.

## Context

Film's MVP needs quick production handoff artifacts while deeper collaboration and calendar integrations remain explicitly gated. The Tasks workspace already renders the open task data needed for a useful handoff list.

A local Markdown export supports offline review and crew coordination without weakening the existing static-first and Worker-owned trust boundaries.

## Consequences

- Users can download selected-project task lists without network access or provider credentials.
- Local task creation and future Worker replay remain unchanged.
- Future calendar sync, assignee notifications, or collaborative task exports must define Worker-owned authorization, audit, redaction, and provider-scope rules first.
