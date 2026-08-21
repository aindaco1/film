# ADR 0117: Record Mutation Approval Application

Date: 2026-07-08

## Status

Accepted.

## Context

Mutation requests need to move beyond audit-only review without opening arbitrary browser-owned writes. Owner/producer approval should be durable, and any update/delete apply path must prove the row has not changed since the request was created.

## Decision

Add `record_mutation_requests` as a D1 table for selected project, document, task, person, equipment, and expense update/delete requests. Request creation stores bounded metadata, requested field keys, request status, and the selected row's `updated_at` value as `expected_updated_at`.

Keep the per-entity mutation field contract in `packages/schema`. The Team inspector renders field checkboxes and typed value controls from that contract, while the Worker rejects unsupported update field keys at request creation and revalidates the same allowlist during diff/apply.

Add `POST /api/records/mutations/requests/resolve-dry-run` for owner/producer approval or rejection. Resolution updates only request status and bounded note metadata and returns `destructiveWrite: false`.

Add `POST /api/records/mutations/apply` for owner/producer application. The route requires `APPLY MUTATION <requestId>` confirmation, an approved request, a matching workspace, fixed table/id routing, allowlisted update fields, same-workspace project references, active task assignees with project access when a task is project-scoped, and a fresh `updated_at` match before writing. Successful applies update or delete the core row, verify the guarded D1 write changed a row, mark the request `applied`, set `destructive_write = 1`, and record bounded audit metadata. Stale rows, invalid relationship updates, or guarded writes that change zero rows are blocked without treating the request as applied.

Add `POST /api/records/mutations/diff-dry-run` for owner/producer per-field update previews before apply. The route accepts the same allowlisted update payload shape, validates the same relationship constraints as apply, reads only fixed core metadata columns, returns before/after values and stale status, and records a bounded audit event while keeping `destructiveWrite: false`.

Add `POST /api/records/mutations/requests/audit-manifest` for a request-scoped audit manifest. It returns the durable request, rollback guidance, and matching `record_mutation.*` audit event metadata keys only. Newly applied requests store field diffs and rollback guidance in `application_json`; older rows remain readable with empty diff defaults.

Add `POST /api/records/mutations/requests/rollback-dry-run` for owner/producer rollback scaffolding on applied update requests. The route reads the stored field diffs, creates a new pending inverse update request against the current row timestamp, returns suggested rollback values from the prior diff, and keeps `destructiveWrite: false`. Delete rollback remains a restore/recreate workflow.

Add `POST /api/records/mutations/requests/delete-recovery-plan` for owner/producer delete recovery planning. It validates an applied delete request and returns blockers plus suggested restore/recreate steps without storing or returning raw deleted row contents.

## Consequences

- Mutation review has durable status instead of relying on audit event reconstruction.
- Browser code can request and review mutations, but the Worker owns approval, field allowlists, stale checks, and destructive writes.
- The app no longer relies on freeform `key=value` browser input for mutation review; unsupported field keys fail before durable request storage.
- Update payloads remain bounded metadata; document body text, provider credentials, comments, and sensitive contact/payment fields are not accepted by this route.
- Rollback remains an approval-gated follow-up workflow: update rollback starts with a pending inverse mutation request from the diff's before values, while delete recovery uses a backup-restore/recreate plan instead of storing raw deleted row contents in the mutation request.
