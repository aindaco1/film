# ADR 0122: Docs Workspace Section

Date: 2026-07-08

## Status

Accepted

## Decision

Promote Docs from a static sidebar label into a selected-project workspace section with a document list and draft editor.

The section:

- shows the selected project's documents in a larger list,
- reuses the existing selected-document state,
- reuses the existing local Markdown draft editor and metadata-only `document.updated` operation flow,
- keeps non-Markdown documents metadata-only.

## Context

Native documents are part of Film's MVP, and the existing dashboard panel already supported local Markdown draft creation and saving. A dedicated Docs workspace makes that workflow easier to use while preserving the current privacy boundary: document body text stays local and is not sent through operation sync.

## Consequences

- The sidebar Docs item now opens a real workspace destination.
- Markdown editing remains local-first and backup-covered.
- Future collaborative body storage or Google Docs sync still needs explicit Worker/provider contracts before document bodies leave the browser.
