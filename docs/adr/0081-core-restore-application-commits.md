# 0081 - Core Restore Application Commits

## Status

Accepted. Extended by ADR 0083.

## Context

Restore safety already had preview, approval, commit-storage, and application-preflight gates, but no Worker-owned path could apply restored records. Applying the whole backup domain at once would be too broad because planning rows, attachment bytes, people, equipment, expenses, and workspace metadata need table-specific policy and rollback semantics.

## Decision

Add a narrow Worker endpoint, `POST /api/restores/application-commit`, for core workspace snapshot records only: projects, tasks, and documents.

The endpoint requires owner/producer auth, CSRF/session validation, exact `RESTORE <workspaceId>` confirmation, a matching approved restore approval, a matching blocked commit attempt, a matching blocked application preflight, verified stored R2 pre-restore backup proof, bounded core-record payloads, preview count consistency, and fresh D1 target/project conflict checks before writing. Successful commits upsert only project/task/document D1 rows and write a durable `restore_application_commits` record with `destructive_write = 1`.

The web client exposes this endpoint only after a decrypted preview, approval, commit-storage check, and application preflight. The browser keeps the decrypted snapshot in memory, derives bounded project/task/document records, prompts for the exact confirmation phrase again, and leaves the generic `Restore` action as a local dry run.

## Consequences

- Film now has a first real destructive restore path, but it is intentionally limited and auditable.
- Existing preview, approval, preflight, and pre-restore backup gates remain required for every commit.
- Planning rows and attachment bytes stay on their separate non-destructive preview/preflight paths.
- ADR 0083 extends this endpoint to workspace metadata, people, equipment, and expenses with the same gates.
