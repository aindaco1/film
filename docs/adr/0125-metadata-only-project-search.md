# ADR 0125: Metadata-Only Project Search

Date: 2026-07-08

## Status

Accepted

## Decision

Back the topbar project filter with a shared metadata search helper.

The helper indexes:

- project identity, schedule, workflow, budget, timeline, and call-sheet metadata,
- task title, due date, and status,
- document name, type, source metadata, and attachment state,
- person name, role, and initials,
- equipment name and status,
- expense category and bounded budget/spend fields.

Native Markdown draft bodies are excluded from the search index.

## Context

The workspace search placeholder promises more than title filtering, and sidebar sections now expose tasks, docs, people, equipment, and expenses as first-class destinations. Search should help users find the project that owns an operational record without becoming a full-text content index or moving trust-sensitive document body behavior into shared search code.

## Consequences

- Searching for nested operational metadata filters both Slate and the Projects workspace consistently.
- Markdown body text remains local to the editor and backup payloads, not searchable metadata.
- Future Worker-backed search can reuse this boundary by indexing metadata first and treating content search as a separate explicit feature.
