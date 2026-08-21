# ADR 0121: Tasks Workspace Section

Date: 2026-07-08

## Status

Accepted

## Decision

Promote Tasks from a static sidebar label into a selected-project workspace section.

The section:

- shows the selected project's open tasks in a dense table,
- summarizes overdue, pending, and ready counts,
- reuses the existing local `add-task` operation flow,
- keeps task persistence local-first through IndexedDB operation replay until Worker-side task mutation rules are explicitly expanded.

## Context

The Slate dashboard already had a compact task panel, but production work needs a larger operational task surface. The current task model is selected-project scoped and local-first, so a dedicated section can improve usability without introducing new server writes or a router dependency.

## Consequences

- The sidebar Tasks item now has a real workspace destination.
- Task creation remains the same queued local operation and does not bypass existing replay authorization.
- Future task editing, completion, assignment, and filtering should extend the shared schema and Worker replay rules before becoming authoritative.
