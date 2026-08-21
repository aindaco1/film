# 0090 - Direct Record Permission Create Replay

## Status

Accepted. Extended by ADR 0102, ADR 0105, and ADR 0108.

## Context

ADR 0084 let project permissions authorize task/document creates under a project, and ADR 0088 let document permissions authorize metadata-only document updates. That still left no way to pre-authorize a contributor for one exact task or document create without giving project-wide write access. ADR 0105 later extends this exact-record replay shape to equipment creates.

Film's current operation model only includes project, task, and document creates plus metadata-only document updates. A conservative record-level step should reuse those operation kinds and the existing `record_permissions` table instead of adding a wider ACL system or new mutation surfaces.

## Decision

Extend canonical replay authorization so `task.created` and `document.created` may use an unexpired write/admin `record_permissions` row for the exact operation entity ID when no matching project membership or project permission exists.

The operation must still target a known project, pass operation-kind role checks, satisfy department-scope checks, and avoid scoped non-operator sensitive records. Direct record permissions do not authorize other records, provider actions, restore writes, attachment bytes, or document body persistence.

## Consequences

- Owners and producers can pre-grant a contributor or department lead permission for one known task/document ID without granting project-wide write access.
- Canonical creates remain limited to the existing task/document operation kinds and project existence boundary.
- ADR 0102 adds a selected-task UI path for creating and reviewing the task permissions this replay policy already honors.
- Ownership transfer, update/delete, reviewer/comment, and person/expense collaboration policies remain future work.
