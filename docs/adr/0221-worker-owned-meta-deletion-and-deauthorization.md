# ADR 0221: Worker-Owned Meta Deletion And Deauthorization

Date: 2026-07-10

## Status

Implemented; production callbacks remain unavailable until the Meta app secret is provisioned.

## Context

Meta requires an app to remove locally stored account data after deauthorization and to accept a user-data deletion request that returns a status URL and confirmation code. These callbacks must keep working when Film disables new OAuth connections during an incident. They must not trust browser sessions, expose the app-scoped Meta user ID, retain access tokens, or turn an unsigned request into a destructive write.

## Decision

Add public Worker endpoints for Meta deauthorization and data deletion. Each endpoint accepts only a bounded form-encoded `signed_request`, verifies the HMAC-SHA256 signature with `META_OAUTH_CLIENT_SECRET`, requires the signed payload algorithm and numeric app-scoped user ID, rejects future timestamps, and operates without the interactive `META_OAUTH_MODE` gate.

Deauthorization deletes every matching `meta_provider_connections` row and writes workspace-scoped, value-free audit evidence in one D1 batch. Data deletion does the same while creating a completed request row with a random 128-bit confirmation code, a SHA-256 user reference, and a signed-request fingerprint. A repeated signed deletion request returns the original confirmation. The public status endpoint accepts only the fixed-format confirmation code and returns status, timestamps, and a deleted-connection count; it never returns the Meta user ID or hash.

The endpoints return 404 when the Meta app secret or D1 is unavailable. Callback rate limits are separate from interactive OAuth limits. Provider mode may stay disabled while signed callbacks remain active.

## Consequences

- Meta app configuration uses `/api/webhooks/meta/deauthorize` and `/api/webhooks/meta/data-deletion`; Film generates the status URL in the deletion response.
- A valid app-signed callback can delete local Meta connections without a Film session, as required by the provider contract.
- Callback verification and connection deletion are testable before enabling interactive OAuth, but a production signed smoke requires the real Meta app secret.
- Background Graph webhook refresh remains a separate decision with its own event signature and deduplication requirements.
