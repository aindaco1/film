# ADR 0030: Project Membership Scope Tables

Date: 2026-07-08

## Status

Accepted

## Decision

Add D1/SQLite tables for workspace invites and project memberships.

## Context

Film v1 requires multi-user collaboration. The initial schema had workspace members and first-class roles, but future record-level authorization also needs project-specific grants and invite state. The current Worker still uses dry-run role metadata, so this migration is only the database foundation.

## Consequences

- `workspace_invites` stores hashed invite targets, invited roles, hashed invite tokens, status, expiry, and acceptance metadata.
- `project_memberships` maps workspace members to projects with project roles and optional department labels.
- Pending invites are unique per workspace and email hash.
- These tables are validated by `npm run test:migrations`.
- No Worker route uses these tables yet; future auth work must wire sessions to `workspace_members` and project-specific checks before relying on them for enforcement.
