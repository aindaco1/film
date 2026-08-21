# ADR 0004: Magic-Link Dry-Run Auth

Date: 2026-07-07

## Status

Accepted

## Decision

Expose Worker-owned dry-run magic-link auth routes before sending real email. When D1/KV bindings are available, store dry-run magic-link and session state there with hashed tokens, expiry, reuse checks, and logout revocation.

## Context

The product requires no traditional passwords and provider-backed communications. Authentication must be owned by the Worker, but live email and production session storage should wait until expiry, reuse, rate limiting, and secret handling are fully wired.

## Consequences

- `/api/auth/magic-link/request` validates email, hashes it, and returns a development-only token without sending email. With D1, it records only the token hash and expiry.
- `/api/auth/magic-link/verify` accepts dry-run tokens and returns session metadata, CSRF token, and an HttpOnly cookie. With D1/KV, it requires a prepared unconsumed token, records a hashed CSRF session, and consumes the token.
- `/api/auth/logout` requires CSRF metadata and expires the dry-run session cookie.
- The static app shell may hold the development token and CSRF metadata in memory for the active page session, but must not write them to IndexedDB, localStorage, backups, or source files.
- Missing or unapplied local D1/KV bindings fall back to memoryless dry-run behavior so the static app remains usable without production credentials.
