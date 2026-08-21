# ADR 0016: R2 Upload Prepare and Commit Dry Run

Date: 2026-07-08

## Status

Accepted

## Decision

Model attachment uploads as a Worker-owned prepare/commit handshake before enabling real signed R2 uploads. The browser asks the Worker to prepare upload intents from staged attachment metadata, then commits those intents in dry-run mode. Raw bytes stay in the local IndexedDB attachment store.

## Context

Film needs the application contract for attachment storage before production R2 signing credentials, object lifecycle rules, and restore/export policies are final. A prepare/commit protocol lets the app validate object keys, hashes, size bounds, and commit tokens now without moving bytes to server storage.

## Consequences

- `prepare-upload` returns future object keys, required headers, expiry, and dry-run commit tokens.
- `commit` validates object key scope, size, SHA-256, commit token, and rejects raw bytes.
- Local `ASSET` docs move from `staged_local` to `r2_dry_run` when commit metadata is accepted.
- Encrypted backups include an attachment metadata manifest with policy `metadata_only`, counts, source sizes, hashes, and object keys, but no blob bytes.
- Live upload requires replacing `uploadUrl: null` with signed R2 URLs and enforcing object existence, byte hash verification, retention policy, and authorization checks.
