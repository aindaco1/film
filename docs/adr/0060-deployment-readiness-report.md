# ADR 0060: Deployment Readiness Report

Date: 2026-07-08

## Status

Accepted

## Decision

Add `npm run check:deploy` as a non-secret deployment readiness report and `npm run check:deploy:strict` as the future failing gate once production route and origin decisions are configured.

## Context

The Worker already has real MVP D1/KV/R2 bindings and `workers_dev = false`, but production route/custom domain and production `ALLOWED_ORIGINS` still require an explicit product/deployment decision. A normal smoke run should not fail because those decisions are intentionally pending, but the blockers should be visible and repeatable.

## Consequences

- `scripts/check-deployment-readiness.mjs` validates non-secret Wrangler configuration and provider-live shape checks.
- The report confirms local-safe controls such as `workers_dev = false` and required D1/KV/R2 bindings.
- The report flags missing production route/custom domain, local-only or malformed `ALLOWED_ORIGINS`, and incomplete invite/Stripe live-provider configuration without printing secrets.
- Strict mode exits non-zero while blockers remain, but normal development uses the non-strict report.
