# ADR 0133: Schedule Workspace Section

## Status

Accepted.

## Decision

Add a dedicated selected-project Schedule workspace section to the static app shell.

The Schedule workspace renders:

- production-clock counters from project progress, task completion, shoot-day, and scene metadata
- phase lanes from the existing project timeline
- upcoming call-sheet metadata from the selected project
- a read-only date-driven task table from the selected project's open tasks

It does not create a second calendar store, write schedule records, call Google Calendar, or add new Worker routes.

## Context

Film needs to feel like a production operations workspace, not only a generic project database. The app already stores the schedule-adjacent fields that matter for the first usable slice: project phase lanes, shoot dates, call-sheet summary, and task due labels.

A full calendar model would require stronger recurrence/date semantics, conflict handling, provider sync policy, and restore behavior. That is larger than the current need and would risk duplicating planning data already imported from Notion.

## Consequences

- Users can navigate directly to a schedule view from desktop and mobile workspace navigation.
- The schedule view stays local/read-only and remains covered by existing backup/export behavior because it derives from project data already in the workspace model.
- Future live Google Calendar or call-sheet publishing work must add explicit Worker-owned contracts instead of extending this static view into unsafely synced browser-owned state.
