# ADR 0002: Provider Dry-Run First

Date: 2026-07-07

## Status

Accepted

## Decision

Pool, Store, Stripe, Social, Google, SMS, Resend, and future AI integrations start as dry-run adapters. They are essential to the MVP, but production credentials and live mutation paths are deferred until scopes, compliance, storage, and audit behavior are explicit.

## Context

The MVP must integrate with external systems, but Film will handle sensitive production data and communications. Shipping dry-run adapters first lets the app shape the workflow without weakening security or requiring live credentials in local development.

## Consequences

- UI surfaces show integration status immediately.
- Worker routes expose provider status and dry-run backup behavior.
- Live integrations need separate security tests, webhook validation, and operator docs before enabling.
