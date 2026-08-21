# ADR 0042: Worker Safety Audit Events

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0094.

## Decision

Record D1 `audit_events` for Worker backup dry-runs, explicit backup R2 object storage/export, and restore commit dry-run checks when D1 is available.

## Context

Film's roadmap requires audit events before destructive restores, live integrations, externally visible messaging, AI writes, or provider credentials. The schema already includes `audit_events`, but Worker safety gates were not writing audit rows.

## Consequences

- Backup dry-runs record the restore point id, snapshot ref, retention policy, and persistence mode.
- Backup R2 object storage records the restore point id, snapshot ref, object key, byte size, SHA-256, and restore-point metadata persistence mode.
- Backup R2 export records bounded manifest counts and object download restore-point metadata.
- Restore commit dry-run checks record preview counts, backup timestamp metadata, and `destructiveWrite: false`.
- Audit writes are best-effort and reported as `auditPersistence`; they do not make local dry-run backup or restore preview behavior fail when D1 is unavailable.
- ADR 0094 adds bounded audit events for provider preflights/readiness checks, Notion import preflights, and operation sync replay checks.
- Live integration, AI, and deeper destructive attachment restore audit coverage remain future work.
