# ADR 0145: Local Team Roster Export

## Status

Accepted.

## Decision

Add a local Markdown `Export team` action to the Team inspector section.

The export includes workspace member display names, roles, managed statuses, last-seen labels, and short email-hash references. It excludes raw email addresses, provider secrets, OAuth tokens, raw invite tokens, raw attachment bytes, private Worker state, permission grant details, and Worker audit metadata values.

The export is generated in browser memory and downloaded directly as Markdown. It does not call the Worker, request protected permission manifests, create D1 rows, or expose invite token hashes.

## Context

Film users need core user data to be exportable before deeper integrations ship. Workspace membership is core operational data, but the collaboration model already has trust-sensitive Worker surfaces for invite manifests, permission grants, owner transfers, mutation requests, and audit events.

A local roster export gives solo filmmakers and small teams a portable membership snapshot without weakening the Worker boundary around grants, invite tokens, and audit metadata.

## Consequences

- Users can export a useful team list without network access or credentials.
- Raw contact data and invite secrets remain out of browser exports.
- Future permission or grant exports must define protected Worker authorization, redaction, pagination, and audit behavior before joining the roster export.
