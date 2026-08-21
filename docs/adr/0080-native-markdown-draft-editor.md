# 0080 - Native Markdown Draft Editor

## Status

Accepted. Extended by ADR 0088.

## Context

Film needs a usable native document path before deeper provider integrations. Markdown drafts already exist in the local workspace model and encrypted backups now split document bodies into a separate encrypted ZIP payload, but the UI only created document records.

## Decision

Add a local Markdown editor to the Docs panel. Selecting a Markdown document shows its current `markdownSnapshot`; saving updates the browser workspace state, records an audit event, and queues a `document.updated` operation.

`document.updated` is a metadata-only Worker replay operation. Browser sync sends bounded metadata such as project ID, document name, and Markdown length, but not body text or body snippets. The Worker stores those update operations in `operation_log`, treats repeated update operations for the same document as valid metadata history, and does not apply them to canonical document body storage yet.

Scoped contributor and department-lead document update metadata must pass the same project-membership or explicit project record-permission guard, including department scope, used for canonical task/document creates when D1 auth storage is available. ADR 0088 later adds explicit document record permissions as an alternate metadata-only document-update signal.

## Consequences

- The first document editor is usable without choosing a heavier UI framework.
- Markdown body text remains local and recoverable through encrypted backups rather than Worker operation payloads.
- D1 operation replay can track draft-save metadata without same-entity create conflict rejection.
- Future slices still need durable collaborative document bodies, richer editing, and broader record-level permission checks before server-side document updates become authoritative.
