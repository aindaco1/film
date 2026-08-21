# ADR 0068: Google Drive Sync Dry-Run Contract

Date: 2026-07-08

## Status

Accepted

## Decision

Add a Google Drive/Docs sync dry-run contract without OAuth credentials or live Google API calls.

`packages/providers` now exposes a Google Drive sync plan that describes required scopes, planned actions, blockers, and compliance notes. The Worker route `POST /api/providers/google/drive-sync-dry-run` requires owner/producer authorization, workspace scope, CSRF/session checks when auth storage is available, and a bounded optional Drive root folder ID. It returns only dry-run metadata and records an audit event when D1 is available.

## Context

Google Drive/Docs import/export/sync is a major product direction, but native Film documents remain canonical and browser-owned OAuth tokens would violate the trust boundary. The app needs a visible setup contract before adding Google OAuth, webhook channel validation, token refresh, or live file reads.

## Consequences

- The provider inspector can show `Plan Drive sync` for the Google dry-run provider.
- Planned actions include root-folder linking, Drive metadata import, Google Docs Markdown export, and optional Calendar event reads.
- Live reads remain blocked until OAuth app setup, Worker-owned token storage, Drive webhook validation, consent copy, and production routes are explicit.
- Browser backups, local mirrors, and Worker requests still contain no Google OAuth refresh tokens.
