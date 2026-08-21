# ADR 0029: Read-Only Session Metadata

Date: 2026-07-08

## Status

Accepted

## Decision

Add `GET /api/auth/session` as a Worker-owned read-only session metadata endpoint.

## Context

Magic-link verification returns an HttpOnly cookie plus an in-memory CSRF token. The app should be able to ask the Worker whether a cookie still maps to a valid session, but the Worker must not recover or expose the hashed CSRF token after a page reload.

## Consequences

- Without D1 auth storage, the endpoint returns `session: null` with memoryless dry-run persistence.
- With D1/KV auth storage, a valid cookie returns session ID, role, and expiry only.
- Invalid, expired, or revoked cookies fail closed with `invalid_session`.
- The endpoint does not return a CSRF token, does not extend the session, and does not create a new session.
- Protected mutations still require the CSRF token returned by magic-link verification.
