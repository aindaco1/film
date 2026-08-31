# ADR 0249: Canonical UI Surface Ownership

## Status

Accepted.

## Decision

Assign each Film user job to one canonical interactive surface. Overview is a selected-project summary and Projects owns project search, selection, creation, and directory export. Domain workspaces own their create, edit, import, refresh, and export commands. Backups owns the entire backup and restore workflow; the inspector owns project context, governance, integrations, and Notion/attachment imports.

Summary cards may navigate to their detailed workspace. Empty states may link to a missing prerequisite. Responsive navigation may render as either sidebar buttons or a mobile picker. Repeated record rows may share one action contract. These are the only intentional exceptions to the one-owner rule.

Static rendered `data-action` counts and direct workspace links are regression-tested so a second command surface cannot be introduced accidentally.

## Context

The static-first shell accumulated convenient entry points as capabilities were added. Project creation and selection, screenplay import, planning refresh, backup recovery, and schedule summaries appeared in multiple places. The features remained functional, but users had to infer which copy was authoritative and the inspector became an oversized utility drawer.

## Consequences

- Users have one predictable place to perform each job.
- Overview remains useful without becoming a second editor.
- The inspector stays bounded to contextual and trust-sensitive work.
- Responsive navigation and contextual recovery remain available without duplicating commands.
- New UI work must update `docs/UI_SURFACE_OWNERSHIP.md` and its ownership regression when adding a genuinely new user job.
