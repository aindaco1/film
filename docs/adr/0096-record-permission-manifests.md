# ADR 0096: Record Permission Manifests

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0098, ADR 0103, and ADR 0104.

## Context

ADR 0089 added selected-document permission grants in the Team panel. Owners/producers could create project and document grants, but there was no protected way to review the current D1 `record_permissions` rows for a project or document.

Permission review is necessary before deeper collaboration rules, revocation, comment-only review, or live invite delivery can be trusted.

## Decision

Add protected `POST /api/records/permissions/manifest` for owner/producer sessions. The route checks workspace scope, validates `entityType` and `entityId`, reads a bounded set of matching `record_permissions`, and returns `active_record_permissions_only` metadata:

- member ID
- permission level
- department scope
- expiry
- persistence and audit persistence

The Team panel adds `Review project permissions` and `Review document permissions` buttons. The latest manifest renders beneath the permission controls.

## Consequences

- Owners/producers can verify project and document grants from the app.
- The route remains read-only and does not expose raw emails or invite tokens.
- ADR 0098 adds exact grant revocation from manifest rows. Permission history and reviewer/comment semantics remain future work.
