# ADR 0205: Idempotent Live Magic-Link Delivery

Date: 2026-07-09

## Status

Accepted

## Decision

Use the random persisted D1 magic-link record ID as the Resend idempotency key for live sign-in email delivery. The header is scoped as `film-magic-link/<record-id>`. It contains no email, email hash, token, or token-derived value and is never returned to the browser.

Do not call Resend unless D1 magic-link persistence returns both the authoritative persistence mode and record ID. Failed delivery keeps the existing generic browser response and expires the unsent link through the existing cleanup path.

## Context

Workspace invite delivery already used a persisted non-PII ID for provider idempotency. Magic-link delivery lacked the same safeguard, so a provider or network retry at the send boundary could duplicate a one-time-link email.

## Consequences

- Retries for one persisted magic-link delivery use the same provider idempotency identity.
- Provider request metadata does not reveal recipient or token material.
- Browser responses remain generic in live member-only mode.
