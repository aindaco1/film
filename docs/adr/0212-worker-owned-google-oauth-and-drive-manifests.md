# ADR 0212: Worker-Owned Google OAuth and Drive Manifests

## Status

Accepted.

## Context

Film needs an optional Google Drive integration without placing OAuth credentials or refresh tokens in browser storage. Native Film documents remain canonical, and a workspace must explicitly opt in before any Google data is read.

## Decision

Use OAuth 2.0 authorization code flow with PKCE through `oauth4webapi`. Owner/producer sessions may start a connection. A ten-minute, one-time state record is stored in KV under a hashed key and binds the callback to the initiating workspace, member, and Film session. The callback accepts only the configured HTTPS URI.

Store access and refresh tokens only in D1 after AES-256-GCM encryption with a Worker secret. Bind ciphertext to provider, workspace, token kind, and key version with authenticated additional data. Exclude the connection table from workspace snapshots, exports, and backups. Public status routes return scopes, expiry, and connection state only.

The first live capability is an explicit, paginated Drive folder metadata read. The Worker decrypts tokens only for the outbound request, refreshes access server-side when needed, normalizes at most 100 items, filters external links, and records count-only audit metadata. It does not import file contents or create canonical Film records. Disconnect attempts provider revocation and deletes local ciphertext regardless of provider response.

Keep `GOOGLE_OAUTH_MODE=dry_run` until the Google OAuth client, consent copy, least-privilege Drive scope, production callback, and operating owner are approved. Calendar access is a separate optional authorization request. Background Drive sync remains blocked until webhook channel validation and lifecycle handling exist.

## Consequences

- Google secrets and tokens never enter the static bundle, IndexedDB, session storage, operation logs, backups, or audit metadata.
- OAuth callback replay, cross-session callbacks, stale state, unapproved roles, and workspace mismatches fail closed.
- Interactive Drive metadata reads can ship without pretending webhook-based background sync exists.
- Token key rotation needs an explicit multi-key migration before changing `GOOGLE_TOKEN_ENCRYPTION_KEY` for connected workspaces.
