# ADR 0038: Disable workers.dev for Dry-Run Auth

Date: 2026-07-08

## Status

Accepted

## Decision

Set `workers_dev = false` for the Worker until production routes, auth delivery, CORS origins, and rate limits are explicit.

## Context

The current Worker intentionally has development-only magic-link behavior that returns dry-run verification tokens. That is useful locally, but it should not become publicly reachable through an accidental `workers.dev` deployment.

## Consequences

- Wrangler can still package the Worker and validate bindings with `wrangler deploy --dry-run`.
- Publishing requires explicit routes/custom domains later.
- Production auth must replace development token return behavior before any public route is configured.
