# ADR 0049: Session Workspace Scope

Date: 2026-07-08

## Status

Accepted

## Decision

Reject workspace-scoped Worker mutations when the request workspace ID does not match the authenticated D1 session workspace.

## Context

D1 sessions can be bound to a workspace member. Several protected routes accepted a `workspaceId` in the request body, but authorization only checked role and member status. That left room for a valid member session to submit dry-run mutations against another workspace ID.

## Consequences

- Workspace-scoped Notion planning commits, planning exports, attachment preflights, backup dry-runs, restore gates, and operation sync now check session workspace scope.
- Memoryless local dry-run auth still works because it has no bound workspace.
- Workspace mismatch returns `workspace_mismatch` with the current auth persistence mode.
- Future multi-workspace switching must create or select a session bound to the target workspace before running protected mutations.
