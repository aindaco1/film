# ADR 0007: SQLite Migration Validation

Date: 2026-07-07

## Status

Accepted

## Decision

Validate D1 migrations locally with SQLite before relying on Worker runtime bindings or deployed Cloudflare databases.

## Context

Film's structured data will live in D1, but the MVP still uses local seed data and dry-run Worker routes. The schema can drift or become non-idempotent if migrations are not exercised while features are being built.

## Consequences

- `npm run test:migrations` applies the full SQL migration chain to two fresh `tmp/film-migration-check.sqlite` databases.
- The check verifies SQLite integrity, foreign keys, expected table names, and selected expected columns.
- `npm run smoke` includes migration validation.
- Wrangler D1 apply commands remain a later step until real local/production database IDs are explicit.
