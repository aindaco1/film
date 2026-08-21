# ADR 0137: Call Sheets Workspace Export

## Status

Accepted.

## Decision

Add a dedicated selected-project Call Sheets workspace section to the static app shell.

The workspace renders upcoming call details, crew snapshot, gear pull, and attachment review sections from the selected project's existing call-sheet, people, equipment, and document metadata.

Add a local Markdown `Export call sheet` action. The export is generated in browser memory from already-visible workspace metadata and downloaded directly as Markdown.

The call sheet explicitly excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. It does not queue an operation, create a D1 row, call a provider, update canonical project data, or distribute the call sheet through email, PDF generation, Google Docs, or Calendar.

## Context

Film needs fast production handoff artifacts before deeper provider integrations. Call sheets are essential for solo filmmakers and small crews, but live distribution introduces trust-sensitive choices around recipients, credentials, audit, redaction, and delivery status.

A local Markdown export provides a useful MVP artifact while keeping the implementation static-first and avoiding a premature call-sheet persistence or distribution model.

## Consequences

- Users get a quick selected-project call sheet without credentials or network dependencies.
- The call sheet remains a presentation artifact, so canonical sync, restore, and provider paths are unchanged.
- Future live email, branded PDF, Google Docs, or Calendar distribution must add Worker-owned authorization, audit, provider scopes, delivery state, and redaction rules before it becomes live behavior.
