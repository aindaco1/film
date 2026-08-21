# ADR 0173: Local Task Due Capture

## Status

Accepted.

## Decision

Task create forms include an optional due label. `createTask` normalizes that label into the local task row, and `task.created` operation payloads include `dueAt` alongside the project ID and title.

When D1 operation replay applies a canonical `task.created` operation, the Worker writes the bounded `dueAt` payload into `tasks.due_at`. Empty due values remain `Unscheduled` locally and `NULL` in canonical D1 replay.

## Context

Film already displayed task due labels in the Slate and Tasks workspaces and included them in task-list exports, but locally created tasks always used `Unscheduled`. That made task handoff exports less useful for real production work.

## Consequences

- Solo users can capture lightweight due labels without adding a calendar store or Google Calendar dependency.
- The operation payload stays bounded metadata and does not include notes, private comments, provider IDs, or raw document content.
- Canonical D1 task creates can preserve the same due metadata when replay is authorized.
- Rich due-date validation, reminders, recurring tasks, and calendar sync remain separate Worker-owned/provider-gated work.
