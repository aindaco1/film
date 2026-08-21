# ADR 0144: Local Activity Log Export

## Status

Accepted.

## Decision

Add a local Markdown `Export activity` action to the Activity inspector tab.

The export includes local browser audit event messages, actor labels, and display timestamps from the workspace mirror. It excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, raw Worker audit metadata, raw import source paths, and Markdown document bodies.

The export is generated in browser memory and downloaded directly as Markdown. It does not call the Worker, request the protected Worker audit manifest, create D1 rows, or expose Worker audit metadata values.

## Context

Film has two audit surfaces: a local browser audit log for user-visible local actions and a protected Worker audit manifest for D1-backed server actions. The Worker manifest intentionally returns metadata keys only. Users still need a simple way to export the local activity trail for review or support without requiring a signed session.

A local activity export keeps the browser log portable while preserving the stricter Worker audit boundary.

## Consequences

- Users can export local activity without network access or credentials.
- Worker audit metadata remains protected and metadata-key-only.
- Future unified audit exports must define authorization, redaction, retention, and pagination contracts before combining browser and Worker audit streams.
