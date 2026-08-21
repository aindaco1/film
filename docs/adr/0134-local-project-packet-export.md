# ADR 0134: Local Project Packet Export

## Status

Accepted.

## Decision

Add a local Markdown `Export packet` action to the selected-project Schedule workspace.

The packet includes selected-project summary, phase timeline, upcoming call-sheet metadata, bounded local planning rows when available, date-driven tasks, documents, people, equipment, and expense lines. The export is generated in browser memory from already-visible workspace metadata and downloaded directly as Markdown.

The packet explicitly excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. It does not queue an operation, create a D1 row, call a provider, or update canonical project data.

## Context

Film needs core user data to be exportable before deeper integrations. Encrypted backups already preserve recoverable workspace data, but solo filmmakers also need a quick human-readable project handoff packet for meetings, crew review, and offline production work.

A local Markdown export is sufficient for this slice and avoids adding document-generation infrastructure, live Google Docs export, or trust-sensitive server behavior before those contracts are explicit.

## Consequences

- Users get a fast selected-project handoff artifact without credentials or network dependencies.
- The export remains a presentation artifact, so canonical restore/sync paths are unchanged.
- Future branded PDF, Google Docs, or email delivery exports must add Worker-owned authorization, audit, provider-scope, and redaction rules before live distribution.
