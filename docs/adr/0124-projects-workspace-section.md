# ADR 0124: Projects Workspace Section

Date: 2026-07-08

## Status

Accepted

## Decision

Promote Projects from a static sidebar label into a focused project directory workspace section.

The section:

- reuses the existing project list and board renderers,
- reuses the existing search/filter and project selection behavior,
- keeps Slate as the richer dashboard with timeline, operations, planning, and call-sheet panels.

## Context

The Slate dashboard is useful as an operational overview, but the sidebar also exposes Projects as a separate destination. A focused project directory helps users scan and switch projects without the rest of the dashboard content.

## Consequences

- The sidebar Projects item now has a real workspace destination.
- No new project persistence or mutation behavior is introduced.
- Future project creation/editing can extend this section once Worker replay and authorization rules are expanded.
