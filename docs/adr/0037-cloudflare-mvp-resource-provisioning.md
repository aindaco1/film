# ADR 0037: Cloudflare MVP Resource Provisioning

Date: 2026-07-08

## Status

Accepted

## Decision

Provision the initial Cloudflare resources for Film and replace local placeholder binding IDs in `apps/worker/wrangler.toml`.

## Context

The Worker had local placeholder bindings for D1/KV and named R2 buckets. The app now has enough auth, operation-log, backup, attachment, and migration surface to justify creating real MVP resources before deployment hardening.

## Consequences

- Remote D1 database `film` was created and all migrations through `0005_production_planning_tables.sql` were applied.
- Remote KV namespace `SESSIONS` was created and bound to the Worker.
- Remote R2 buckets `film-backups` and `film-attachments` were created.
- `wrangler.toml` now contains the real D1 and KV IDs while preserving code-facing binding names `DB`, `SESSIONS`, `BACKUPS`, and `ATTACHMENTS`.
- No provider credentials, OAuth secrets, webhook secrets, or live email/SMS secrets were added.
- Deployment routes, custom domains, production CORS origins, rate limits, and live provider secrets remain future work.
