# ADR 0015: Local Attachment Staging and R2 Dry Run

Date: 2026-07-08

## Status

Accepted

## Decision

Stage supported imported attachment bytes in a dedicated browser IndexedDB object store and validate staged attachment metadata through Worker-owned R2 dry-run endpoints. Do not send raw attachment bytes to the Worker or include them in workspace JSON, operation payloads, or encrypted backup bundles in this slice.

## Context

Notion imports need attachment continuity before live storage is configured. Film also needs backup and restore safety before deep integrations. Storing imported bytes directly inside the workspace model would make backups large and blur the line between metadata sync and binary object storage.

## Consequences

- Imported `ASSET` document records start as `metadata_only` and become `staged_local` only after the matching blob is written to IndexedDB.
- Each staged attachment records a local storage key, SHA-256 hash, staged timestamp, source path, size, and content type.
- `/api/attachments/r2/dry-run` validates attachment metadata and returns future object keys without receiving raw bytes.
- `/api/attachments/r2/prepare-upload` and `/api/attachments/r2/commit` model the future signed upload handshake in dry-run mode.
- The Worker rejects attachment dry-run requests that include `bytes`, `blob`, or `payload` fields.
- Future live storage needs real signed upload URLs, R2 object lifecycle policy, backup byte rules, and restore behavior before bytes leave the browser.
