# ADR 0006: Restore Preview Before Overwrite

Date: 2026-07-07

## Status

Accepted

## Decision

Encrypted backup files must be previewed before any restore can overwrite workspace data.

## Context

Film backups can contain schedules, contacts, budgets, private documents, and future provider metadata. A restore flow that immediately writes decrypted records would make it too easy to lose local work or import the wrong production workspace.

## Consequences

- The current app decrypts selected `.filmbackup.json` files locally and shows matching/new project counts, per-record status, and field-level overwrite conflicts.
- Previewing a backup adds a local `restore.dry_run` operation and audit entry.
- The backup passphrase is requested for the preview and is not stored.
- Destructive restore work must remain Worker-owned and require explicit confirmation, the existing conflict summaries, and tests before it ships.
