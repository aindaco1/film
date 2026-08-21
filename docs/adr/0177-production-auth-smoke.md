# ADR 0177: Production Auth Smoke

## Status

Accepted.

## Decision

Provide `npm run smoke:auth:production` as an explicitly gated production authentication probe. It runs only with `--allow-send` or `FILM_PRODUCTION_AUTH_SMOKE_ALLOW_SEND=1`, reads an approved owner address and Resend API credential from environment variables or an ignored companion `.dev.vars`, and never prints either value.

The smoke verifies the Worker's non-secret live auth mode, generic magic-link response, absence of a development token/email hash, creation and delivery of a newly requested matching Resend message, in-memory sign-in link consumption, session metadata, logout, and revoked-session rejection. It does not call project, provider, backup, restore, or other workspace mutation routes.

## Context

Local smoke depends on deterministic dry-run tokens, while production correctly exposes no token. Manual retrieval proved the live flow but was not repeatable release evidence and risked accidentally printing sensitive values.

## Consequences

- Production auth can be verified end to end without exposing the recipient, message ID, link, token, cookie, CSRF value, or API key.
- Every real run sends one approved magic-link email and writes then revokes one auth session.
- The send gate keeps the command out of normal CI and local smoke.

