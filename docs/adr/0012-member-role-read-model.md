# ADR 0012: Member Role Read Model

Date: 2026-07-07

## Status

Accepted

## Decision

Represent workspace members and first-class roles in the shared schema before implementing invites or real collaboration.

## Context

V1 needs multi-user collaboration with owner, producer, and director as first-class roles. The UI needs to make team ownership visible early, but invite delivery, raw email handling, permissions, and session-backed membership must remain Worker-owned.

## Consequences

- `WorkspaceData` includes member records with hashed email identifiers.
- The inspector shows a read-only team section.
- Raw emails are not included in seed workspace data.
- D1 now has invite and project membership-scope tables for future enforcement.
- Invite delivery, permission checks, session-to-member binding, and membership mutation remain later Worker-owned slices.
