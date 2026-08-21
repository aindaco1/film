# ADR 0031: D1 Member-Bound Dry-Run Sessions

Date: 2026-07-08

## Status

Accepted

## Decision

When a dry-run magic-link email hash matches a D1 `workspace_members` row, bind the created session to that workspace member and use the member role for session metadata and protected role checks.

## Context

Early auth used KV role metadata and defaulted to owner in memoryless development. That was useful for local progress, but v1 collaboration needs sessions to connect to workspace membership. The membership tables now exist, so auth can conservatively use them without adding invite delivery or raw email storage.

## Consequences

- Magic-link verification still stores only hashed tokens and hashed CSRF values.
- Matching member rows populate `sessions.workspace_id` and `sessions.member_id`.
- The verify response and KV session cache use the matched member role.
- If KV is unavailable, protected mutation auth can fall back to the D1 member role through `sessions.member_id`.
- If no member row matches, local dry-run behavior still falls back to owner.
- Future work still needs invite acceptance, member status enforcement, workspace scoping for all queries, and project membership checks.
