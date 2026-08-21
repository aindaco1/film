# ADR 0204: Atomic Magic-Link Verification

Date: 2026-07-09

## Status

Accepted

## Decision

Treat D1 as authoritative for magic-link verification and member-bound sessions. Verification runs an exact unconsumed/unexpired link assertion, an active member assertion when a member is present, one-time link consumption, and D1 session insertion in one `batch()`. Token consumption and session insertion must each change exactly one row; any assertion or D1 write failure returns the generic invalid-token response and rolls back both changes.

Write the KV session-role cache only after the D1 transaction commits. A KV cache-write failure does not invalidate or hide the committed D1 session because protected member-bound authorization rereads current role and status from D1. Live mutation rate limiting still requires KV and fails closed before verification starts.

Logout follows the same authority boundary: D1 revocation must succeed, then KV cache deletion is best-effort. A stale cache entry cannot revive a D1-revoked session, so the route clears the browser cookie after authoritative revocation even when cache deletion fails.

## Context

Verification previously consumed the link, inserted the session, and wrote KV sequentially. A session insert failure could burn a one-time token without creating a session. A later KV failure could leave a valid D1 session while the route reported failure, encouraging a retry with an already-consumed token.

## Consequences

- A failed D1 verification leaves the token unconsumed and no session row, so a safe retry can succeed.
- One-time token consumption and D1 session creation cannot split.
- KV remains a performance cache rather than a second source of truth for member-bound session validity.
- Post-revocation KV deletion failure does not turn a completed logout into a false error.
- Generic verification failures continue to avoid exposing whether a member, token, or storage record exists.
