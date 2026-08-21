# ADR 0023: Operation Replay Role Policy

Date: 2026-07-08

## Status

Accepted

## Decision

Operation sync remains available to every authenticated first-class role, but Worker-owned replay metadata must pass an operation-kind role policy before an operation is recorded in D1.

## Context

The sync endpoint originally had one coarse role gate: any authenticated role could submit a valid operation batch. That is acceptable for shape validation, but not for replaying metadata that future server-side mutation application will trust. Film needs a conservative policy before operation replay moves from metadata-only toward canonical record mutation.

## Consequences

- `workspace.seeded` replay is owner-only.
- `project.created` and `import.notion_applied` replay require owner, producer, or director.
- `task.created` and `document.created` replay allow owner, producer, director, department lead, or contributor.
- `backup.exported` and `restore.dry_run` replay require owner or producer.
- Reviewers can authenticate to the sync endpoint but have no replayable mutation operations in the current schema.
- Disallowed operations are rejected per operation with `insufficient_operation_role`; allowed operations in the same batch may still be accepted and replayed.
- This is still only the operation-kind layer. Real mutation application also needs canonical record ownership, membership, and collaboration checks.
