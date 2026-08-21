# 0088 - Document Record Permission Replay

## Status

Accepted. Extended by ADR 0089 and ADR 0108.

## Context

ADR 0080 made native Markdown saves queue metadata-only `document.updated` operations. ADR 0084 let project membership or explicit project record permissions authorize those updates, but that still forced document-level collaboration to look like project-level collaboration.

Film needs a conservative path for a contributor to save metadata for one document without granting project-wide write authority. The Worker still must not accept document body text in operation payloads or treat local document saves as authoritative server-side body writes.

## Decision

Extend canonical replay authorization so `document.updated` may use an unexpired document `record_permissions` write/admin grant for the updated document when no matching project membership or project record permission exists.

The document permission path is metadata-only. It does not authorize `document.created`, `task.created`, body persistence, attachment writes, restore writes, or provider actions. It uses the existing department-scope permission checks, so department leads must still carry a matching operation department and permission department when a permission is department-scoped.

## Consequences

- Contributors and department leads can replay bounded document-update metadata for a specifically granted document without receiving project-wide write access.
- Canonical task/document creates remain guarded by project membership or project record permission.
- ADR 0089 exposes selected-document grants in the Team inspector.
- Document body storage, reviewer/comment semantics, and broader ownership transfer remain future work.
