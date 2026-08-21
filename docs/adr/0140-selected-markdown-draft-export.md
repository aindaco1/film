# ADR 0140: Selected Markdown Draft Export

## Status

Accepted.

## Decision

Add a local `Export draft` action to the selected-project Docs workspace for the currently selected Markdown document.

The export downloads a Markdown handoff file containing document metadata, the export policy, and the current browser-local draft body. If the editor contains unsaved text, the export uses the visible textarea value without queueing a sync operation.

Metadata-only non-Markdown documents remain non-exportable from the draft editor. The export excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. It does not create a D1 row, call Google Docs, call a provider, or send document body text to the Worker.

## Context

Native Film documents are canonical for the MVP, while Google Docs import/export/sync remains behind Worker-owned dry-run planning. The current editor intentionally syncs only document metadata, not body previews. Users still need a simple way to take local Markdown draft text out of the app for review or handoff.

A local export preserves the body privacy boundary while making draft text portable.

## Consequences

- Users can export selected Markdown drafts without network access or provider credentials.
- Document body sync remains metadata-only unless a future Worker-owned document body contract is explicitly added.
- Future Google Docs export, collaborative document storage, or server-side Markdown rendering must define authorization, audit, redaction, backup/restore, and provider-scope rules first.
