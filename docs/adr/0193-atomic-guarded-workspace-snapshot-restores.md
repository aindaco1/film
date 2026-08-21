# ADR 0193: Atomic Guarded Workspace Snapshot Restores

Date: 2026-07-09

## Status

Accepted

## Decision

Commit a workspace snapshot as one bounded D1 batch containing every core-record write, the durable `restore_application_commits` row, and the bounded restore audit event.

D1 documents that `db.batch()` executes statements as a transaction and rolls back the sequence when a statement fails:

- <https://developers.cloudflare.com/d1/worker-api/d1-database/#batch>
- <https://developers.cloudflare.com/d1/platform/limits/>

Before preparing the batch, Film now enforces the backup model's relationship and semantic contract:

- root workspace/project rows cannot declare a parent project;
- task/document/person/equipment/expense rows require a same-workspace project;
- project phase, task status/priority, document type, and equipment tone are allowlisted;
- non-Markdown documents cannot carry Markdown bodies; and
- expense percentage is limited to 0–100.

The batch orders project writes before child writes. Fixed-query SQLite assertions run inside the transaction before every non-skip write: creates require the ID to be absent, updates require the ID in the current workspace, and child records require their project in the current workspace. A stale action or relationship causes an intentional SQL error and full rollback, preventing an upsert from changing a create into an update or an update into a create.

The core snapshot request is capped at 150 records and 700 prepared statements. A batch failure returns 503 with `destructiveWrite: false`; an oversized batch returns 422. Neither path writes restored rows, commit evidence, or audit evidence.

## Context

The prior endpoint performed each workspace/project/child write separately, then inserted the restore-commit row and audit event in later calls. A constraint or storage failure could therefore leave a partially restored workspace without durable commit evidence. Pre-batch conflict reads also did not protect against a target changing before an `ON CONFLICT` upsert executed.

## Consequences

- Restored core rows and their commit/audit evidence succeed or roll back together.
- Concurrent target changes cannot silently alter restore action semantics.
- Valid backups use canonical D1 values rather than arbitrary bounded strings.
- Snapshots above 150 core rows need a future resumable, proof-bound segmented restore design; they are not partially applied.
