# ADR 0021: Per-Record Restore Preview Conflicts

Date: 2026-07-07

## Status

Accepted

## Decision

Encrypted backup previews must summarize incoming records and field-level overwrite conflicts before any destructive restore path is introduced.

## Context

Project-level matching is not enough for restore safety. Film backups can change tasks, documents, people, equipment, expenses, budgets, and call sheet details inside a project without creating a new project. Users need to see those collisions before deciding whether a later Worker-owned restore commit is safe.

## Consequences

- Backup preview comparison now emits structured record summaries for workspace, project, task, document, person, equipment, and expense records.
- Existing records are matched by stable IDs when available, with natural labels as a fallback for project children that do not have IDs.
- Field-level changes are reported as conflicts because a future restore commit would overwrite current values.
- The browser still decrypts backup files locally, stores no passphrase, queues only a `restore.dry_run` operation, and does not overwrite records.
- Destructive restore commits remain future Worker-owned work with explicit confirmation and authorization gates.
