# 0083 - Workspace Snapshot Restore Commits

## Status

Accepted.

## Context

ADR 0081 added the first destructive restore application path, but it was limited to projects, tasks, and documents. Backup previews already classify workspace metadata, people, equipment, and expenses as workspace snapshot records, so leaving them outside the commit path made the visible restore action incomplete for the local app model.

## Decision

Extend `POST /api/restores/application-commit` to accept bounded workspace snapshot records for workspace metadata, projects, tasks, documents, people, equipment, and expenses.

The endpoint keeps the same owner/producer authorization, CSRF/session validation, exact `RESTORE <workspaceId>` confirmation, approved restore approval, blocked commit attempt, blocked application preflight, verified pre-restore backup proof, preview-count validation, and fresh conflict rechecks from ADR 0081. Workspace metadata writes update the `workspaces` row and upsert `workspace_restore_metadata`; people writes upsert `people` plus `project_people`; equipment and expenses write their first-class D1 tables.

The web client now exposes this as `Apply snapshot records` after decrypted preview, approval, commit-storage check, and application preflight. The decrypted snapshot remains in browser memory and only bounded restore records are sent to the Worker.

## Consequences

- Workspace metadata, people, equipment, and expenses have a destructive restore path under the same gates as project/task/document records.
- Attachment bytes remain outside application commits until package verification and destination write rules exist.
- Planning rows remain on the separate planning preview and planning commit path.
- The web client shows a row-by-row review table before apply so operators can inspect exact snapshot records and actions.
