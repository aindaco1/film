# ADR 0095: Audit Event Manifest

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0101.

## Context

ADR 0094 broadens Worker audit event writes across provider, import, and sync boundaries. Those events are useful only if operators can inspect that they exist, but raw audit metadata can include internal object keys, hashes, counts, and policy details that should not be exposed casually in the browser.

Film needs a conservative audit read path before live integrations and deeper collaboration, without turning audit export into a secret or payload leak.

## Decision

Add protected `POST /api/audit-events/export-dry-run` for owner/producer sessions. The route checks workspace scope, reads a bounded set of recent D1 `audit_events`, and returns an `audit_event_manifest_only` response containing:

- event ID
- action
- project ID
- actor member ID
- timestamp
- metadata key names
- metadata key count

The route does not return raw `metadata_json` values. It records a separate `audit.export_manifest_created` event after reading the manifest and returns `auditPersistence`.

The Activity tab adds `Worker audit`, which requests the manifest and renders recent actions plus metadata keys.

## Consequences

- Owner/producer users can verify Worker audit coverage from the app.
- Audit event inspection remains bounded and metadata-keys-only.
- Full audit export, retention tooling, and privileged audit search remain future work.
