# ADR 0094: Provider Import Sync Audit Events

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0095.

## Context

ADR 0042 introduced Worker safety audit events for backup and restore paths. Provider dry runs, Notion import preflights, Stripe readiness checks, and operation sync replay are also trust-boundary routes, but they still returned useful results without recording D1 audit metadata.

Those routes must not persist provider secrets, OAuth values, raw import filenames, document bodies, email addresses, or operation payloads. The useful MVP audit signal is that an authenticated member checked a boundary and which bounded counts or policy statuses were returned.

## Decision

Record best-effort D1 `audit_events` for:

- provider dry-run preflights
- Stripe summary-readiness checks
- Notion import manifest preflights
- operation sync replay checks

Each route returns `auditPersistence` alongside its existing dry-run result. Metadata is limited to provider/status fields, configuration booleans, counts, policy names, and replay outcome counts.

The web provider panel now renders audit persistence for provider dry-run and Stripe readiness cards. Operation sync records the audit persistence in the local audit log entry after accepted replay.

## Consequences

- Live-provider readiness has an auditable dry-run handoff before credentials are configured.
- Notion import preflight audits can prove a manifest was checked without storing raw source paths.
- Operation sync audits can prove replay outcomes without storing operation payloads outside the existing operation-log path.
- Audit writes remain best-effort; local/no-D1 development still reports `dry_run_memoryless`.
- ADR 0095 adds a protected metadata-keys-only manifest for inspecting recent Worker audit events.
