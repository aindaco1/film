# ADR 0120: Backups Workspace Section

Date: 2026-07-08

## Status

Accepted

## Decision

Promote Backups from a static sidebar label into a read-only workspace section for restore-point and safety status review.

The section:

- lists the bounded local restore-point metadata already present in the workspace model,
- summarizes next backup, queued local operations, Worker backup status, stored manifest status, and encrypted restore-preview status,
- reuses existing `Backup now`, `Preview encrypted backup`, and `Stored backups` actions,
- does not introduce a new backup store, restore selector, or destructive restore path.

## Context

Film's MVP needs data export and restore safety before deeper integrations. Backup controls existed in the topbar and inspector, but the sidebar already presented Backups as a workspace destination. A dedicated section makes the safety surface easier to find while keeping the trust-sensitive work in the Worker and existing backup clients.

## Consequences

- Operators can review backup status without scrolling through the inspector.
- Existing backup actions now bind to every matching control so topbar, inspector, and workspace buttons remain functional.
- Stored backup preview and destructive restore flows stay in the existing guarded inspector paths until a broader restore workspace is explicitly designed.
