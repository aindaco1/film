# Historical Decisions 0100-0149

Consolidated losslessly on 2026-09-06 from incremental ADRs. Original status statements describe their implementation stage, not current product or provider readiness. See [current decision owners](../../adr/README.md) and [project status](../../PROJECT_STATUS.md). Original files remain in the v0.1.0-beta.1 Git tag.

<a id="0100-pending-invite-manifest-revocation"></a>

Source: `docs/adr/0100-pending-invite-manifest-revocation.md`

# ADR 0100: Pending Invite Manifest Revocation

Date: 2026-07-08

## Status

Accepted.

## Decision

Add protected Worker routes for pending invite review and revocation:

- `POST /api/invites/manifest`
- `POST /api/invites/revoke-dry-run`

The manifest route requires an owner/producer D1-backed mutation session when auth storage is available, verifies workspace scope, and returns pending invite IDs, workspace IDs, email hashes, roles, status, expiry timestamps, and created timestamps. It does not return raw invite email addresses, invite token hashes, or development invite tokens.

The revoke route requires the same authorization and rejects producer attempts to revoke owner invites. It marks a pending invite revoked only after selecting a row that exactly matches workspace ID, invite ID, email hash, role, and pending status.

The Team panel adds `Review pending invites` and per-row `Revoke` controls. After a successful revoke, the browser removes the row from the visible manifest and decrements the count.

## Context

ADR 0050 added dry-run invite create/accept flows. ADR 0087 added a hash-only delivery outbox. Owners and producers could create and accept invites, but they could not review or cancel pending invites from the application.

Production invite delivery is still intentionally blocked on sender domain, public route, webhook, suppression, abuse-control, and provider credential decisions. Pending invite lifecycle management can still ship safely as a D1-backed dry-run because it operates only on hash-only metadata.

## Consequences

- Owners/producers can clean up pending invites before live delivery exists.
- The browser still never receives raw invite email addresses or token hashes from a manifest.
- Revocation is stale-row resistant because the Worker requires exact manifest metadata before mutating a row.
- Live delivery work still needs separate token lifecycle, webhook, bounce, suppression, and abuse controls.


---

<a id="0101-audit-manifest-filter-pagination"></a>

Source: `docs/adr/0101-audit-manifest-filter-pagination.md`

# ADR 0101: Audit Manifest Filter Pagination

Date: 2026-07-08

## Status

Accepted.

## Decision

Extend the protected `POST /api/audit-events/export-dry-run` route with bounded pagination and action-prefix filtering:

- `limit`: 1 to 100, default 50
- `offset`: 0 to 10000, default 0
- `actionPrefix`: optional, 1 to 80 lowercase action-prefix characters

The route applies the action filter in D1 as an exact prefix predicate with `instr(action, prefix) = 1`, reads `limit + 1` rows, returns `offset`, `nextOffset`, `actionPrefix`, `rowCount`, and `truncated`, and still returns only metadata key names/counts rather than raw `metadata_json` values. ADR 0206 replaced the original `LIKE '<prefix>%'` implementation to avoid SQLite LIKE-pattern limits and wildcard interpretation.

The Activity tab adds an action-prefix filter form and a `Next audit page` button when `nextOffset` is present.

## Context

ADR 0095 added a protected audit manifest so owners/producers can verify Worker audit coverage without leaking raw metadata values. As more Worker dry-run routes write events, the single latest-events view becomes harder to inspect.

Film needs a small operator-friendly improvement that does not become a broad audit export or privileged search feature.

## Consequences

- Owners/producers can inspect provider, restore, invite, import, or sync audit families with an action prefix.
- Pagination remains bounded and cursorless for now; it is simple but can skip/duplicate rows if new events are written between page requests.
- The metadata boundary is unchanged: raw metadata values, provider credentials, object keys, email addresses, document bodies, and operation payloads stay out of the manifest response.
- Retention policy, immutable audit export, richer search, and role-specific audit access remain future work.


---

<a id="0102-selected-task-permission-ui"></a>

Source: `docs/adr/0102-selected-task-permission-ui.md`

# ADR 0102: Selected Task Permission UI

Date: 2026-07-08

## Status

Accepted.

## Decision

Add selected-task record permission controls to the Team inspector.

The UI exposes:

- a task selector for the current project's open tasks
- active-member selection
- permission level
- optional department scope
- optional expiry date
- `Grant task permission`
- `Review task permissions`

The form uses the existing Worker-owned `POST /api/records/permissions/assign-dry-run` route with `entityType: "task"`. The review button uses the existing protected record-permission manifest route, and revocation continues to use exact manifest-row metadata through the existing revoke route.

## Context

ADR 0090 already lets exact task `record_permissions` authorize contributor or department-lead `task.created` replay when broader project membership or project permission is absent. The Team inspector could create project and selected-document grants, but it did not expose task grants even though the Worker and replay policy supported them.

## Consequences

- Owners/producers can pre-grant one known task permission without giving project-wide write access.
- The browser still does not implement authorization locally; it only calls Worker-owned grant, manifest, and revoke routes.
- Task permissions remain scoped to open tasks visible in the current project UI. Update/delete semantics, reviewer-only task comments, closed task history, and broader ownership policies remain future work.


---

<a id="0103-unexpired-record-permission-manifests"></a>

Source: `docs/adr/0103-unexpired-record-permission-manifests.md`

# ADR 0103: Unexpired Record Permission Manifests

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0096 named the protected record permission manifest policy `active_record_permissions_only`. Canonical replay already treats `record_permissions` rows as active only when `expires_at` is null or in the future, but the manifest query only scoped by workspace, entity type, and entity ID.

That mismatch could show expired grants in the Team inspector even though replay would not honor them.

## Decision

Filter `POST /api/records/permissions/manifest` with the same unexpired rule used by replay:

- include rows where `expires_at` is null
- include rows where `expires_at` is greater than the Worker request timestamp
- exclude expired rows before pagination/truncation

The response policy name remains `active_record_permissions_only`, now matching the returned data.

## Consequences

- Owners/producers review only grants that can still influence current collaboration decisions.
- Expired rows remain in D1 for future history/cleanup work, but they are not exposed as active grants.
- A future permission history route should use a different policy name and explicit expired/history semantics.


---

<a id="0104-expired-record-permission-manifests"></a>

Source: `docs/adr/0104-expired-record-permission-manifests.md`

# ADR 0104: Expired Record Permission Manifests

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0103 makes active record permission manifests match replay behavior by excluding expired grants. That keeps the active collaboration surface accurate, but it also means owners/producers need a separate way to find expired grants for cleanup.

The existing exact revoke route can already remove a known `record_permissions` row when the caller supplies matching manifest metadata.

## Decision

Add protected `POST /api/records/permissions/expired-manifest` for owner/producer sessions.

The route reuses the active manifest request shape, workspace authorization, bounded limit, and metadata-only response shape, but returns only rows where `expires_at` is set and is not later than the Worker request timestamp. It reports `manifestPolicy: expired_record_permissions_only` and records a bounded `record_permission.expired_manifest_created` audit event.

The Team inspector adds expired project, selected-task, and selected-document permission review buttons. Rows returned by the expired manifest use the existing exact revoke action.

## Consequences

- Active grant review stays focused on permissions that can affect current replay authorization.
- Expired grant cleanup is possible without adding broad permission history semantics.
- Revocation still requires exact manifest metadata and owner/producer authorization.
- A future history view can include revoked grants from audit events, but that is a separate policy from expired-row cleanup.


---

<a id="0105-local-operational-record-create-flows"></a>

Source: `docs/adr/0105-local-operational-record-create-flows.md`

# ADR 0105: Local Operational Record Create Flows

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0108.

## Context

The first app shell already allowed local task and Markdown document creation, but the People, Equipment, and Expenses panels were still mostly read-only. Those records are central to a film production workspace, and the MVP needs them to behave like operational working lists before deeper collaboration and provider integrations exist.

People and expenses can contain sensitive contact or financial data, so browser-to-Worker operation sync must stay metadata-only. Equipment records are less sensitive and can use the existing project membership and record-permission replay guard.

## Decision

Add local create forms for selected-project people, equipment, and expenses. The browser updates the local IndexedDB-backed workspace immediately and queues new operation kinds:

- `person.created`
- `equipment.created`
- `expense.created`

Shared schema helpers normalize bounded display metadata for each row. Person operations include display name, role, and initials only. Expense operations include category plus bounded spend/budget numbers only. Operation payloads do not include contact details, payment details, private notes, provider identifiers, or attachment bytes.

When D1 operation storage is available, the Worker can apply those operations to canonical `people`, `project_people`, `equipment`, and `expenses` tables. Person replay is limited to owner/producer/director sessions. Expense replay is limited to owner/producer sessions. Equipment replay can use the same project-membership, owner metadata, explicit project permission, exact record permission, and department-scope checks used by task and document creates.

## Consequences

- The operational workspace becomes directly usable for core production rows without adding a UI framework.
- Local-first behavior remains intact when the Worker or D1 is unavailable.
- Sensitive person and expense details stay out of operation sync payloads.
- The worker replay surface grows, but remains bounded by allowed kind/entity pairs, idempotent operation logs, create conflict checks, and role/permission guards.


---

<a id="0106-live-resend-invite-delivery"></a>

Source: `docs/adr/0106-live-resend-invite-delivery.md`

# ADR 0106: Live Resend Invite Delivery

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0087 created a hash-only invite delivery outbox, and ADR 0091 added readiness checks. That let owners and producers see invite-delivery blockers, but invite creation still could not send email even when production Resend settings were present.

Live invite delivery touches raw email addresses and invite tokens. Those values must not become durable Film data, and accidental sends must remain impossible in local development or partially configured deployments.

## Decision

Add an explicitly gated Resend delivery path to `POST /api/invites/create-dry-run`.

The Worker sends email only when all of these are true:

- `INVITE_DELIVERY_MODE=live`
- `RESEND_API_KEY` is configured
- `INVITE_FROM_EMAIL` is configured
- `INVITE_APP_ORIGIN` is a production HTTPS origin listed in `ALLOWED_ORIGINS`
- `INVITE_DELIVERY_WEBHOOK_SECRET` is configured
- D1 invite and delivery-attempt storage is available

Before calling Resend, the Worker inserts an `invite_delivery_attempts` row with `delivery_mode = live_resend` and `status = queued_live`. After the provider response, it updates the row to `sent_live` with the provider message ID or `failed_live_delivery` with a bounded error code. Film storage keeps only the target hash, provider message ID, error code, and delivery status. The raw email address and invite token are used only in the outgoing Resend request.

Dry-run behavior remains the default. When live delivery is not enabled, invite creation records the existing `dry_run_outbox` attempt and returns the development-only invite token for local testing. When live delivery is enabled, the browser response does not expose the invite token.

## Consequences

- Film can send invite emails through a Worker-owned provider path without putting provider credentials or raw invite targets in browser code.
- Accidental live sends remain blocked by an explicit mode flag and production-origin checks.
- Delivery attempts have durable status before and after provider calls.
- Bounce/suppression webhooks, sender/domain production setup, and abuse controls remain required before public launch.


---

<a id="0107-gated-stripe-summary-adapter-fetch"></a>

Source: `docs/adr/0107-gated-stripe-summary-adapter-fetch.md`

# 0107 - Gated Stripe Summary Adapter Fetch

## Status

Accepted.

## Context

ADR 0058 established a summary-adapter-first boundary for Stripe and ADR 0092 added protected readiness checks. The app now needs a Film-side fetch contract so Pool/Store adapter work can be tested without adding direct Stripe SDK/API reads or exposing provider credentials to the browser.

Pool and Store already own the checkout, settlement, and order/pledge contexts that can normalize Stripe-derived values. Film should consume only project-scoped aggregate fields from those systems.

## Decision

Add protected `POST /api/providers/stripe/summary` for owner/producer sessions. The route:

- requires workspace and project scope,
- requires `STRIPE_SUMMARY_MODE=live`,
- requires Pool/Store adapter URLs, project mappings, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SUMMARY_ADAPTER_SECRET`, and `STRIPE_REDACTED_AUDIT=true`,
- sends only workspace ID, project ID, mapped Pool/Store refs, a summary-only data boundary, and requested aggregate field names to the adapters,
- authenticates adapter calls with the shared adapter secret,
- sanitizes adapter responses down to money totals, count totals, adapter status, mapped-ref count, generated-at timestamp, and currency,
- records bounded audit metadata only.

Direct Stripe reads remain blocked. Film does not return customer data, card/payment-method data, raw payment identifiers, charge IDs, invoice IDs, unrestricted webhook payloads, or adapter response pass-through fields.

## Consequences

- The web inspector can show `Fetch summary aggregates` only after readiness reports live summary reads are allowed.
- Tests cover the live-mode gate, mocked Pool/Store adapter calls, aggregate summing, and response redaction.
- Pool/Store now expose matching `/film/stripe-summary` adapter endpoints; production use still requires deployed HTTPS adapter URLs, matching Film/companion shared adapter secrets, project mappings with safe Pool/Store refs, webhook posture review, and redacted audit validation.


---

<a id="0108-core-record-owner-metadata"></a>

Source: `docs/adr/0108-core-record-owner-metadata.md`

# ADR 0108: Core Record Owner Metadata

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0109.

## Context

Film now has D1-backed project memberships and explicit record permissions, but Worker-applied canonical records still lacked a durable owner signal. That made small solo-to-team workflows awkward: a contributor could create a row, but future replay authorization could not recognize that contributor as the row's owner unless an owner/producer also created a separate grant.

## Decision

Add nullable `owner_member_id` metadata to core canonical D1 rows: projects, documents, tasks, people, equipment, and expenses.

When operation replay applies a canonical create, the Worker stores the authenticated actor member ID as the owner metadata for the created row. The replay guard can then use owner metadata as an authorization signal alongside project memberships and explicit `record_permissions` rows:

- Owned projects can authorize scoped task, document, and equipment creates under that project.
- Owned documents can authorize metadata-only `document.updated` replay for that document.
- Sensitive records still require the existing operator role path.
- Department-scope matching still applies when authorization comes from a membership or explicit permission grant.

The migration keeps ownership nullable so existing rows, imported records, and restored rows are not forced into a false owner.

## Consequences

- Contributor-created canonical rows have an auditable owner member without exposing raw identity data outside D1.
- The replay response policy remains `canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available`.
- The migration validator now checks the owner columns explicitly while running the migration chain against fresh SQLite databases.
- Reviewer/comment semantics, update/delete authorization, and person/expense collaboration remain future work. ADR 0109 adds protected owner transfer.


---

<a id="0109-core-record-owner-transfer"></a>

Source: `docs/adr/0109-core-record-owner-transfer.md`

# ADR 0109: Core Record Owner Transfer

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0110 and ADR 0111.

## Context

ADR 0108 added nullable owner metadata and replay authorization based on owned project and document rows. That still left owner changes implicit: ownership could be set by Worker-applied creates, but owner/producers had no protected route to correct or transfer ownership as a team changes.

## Decision

Add Worker-owned routes for core D1 owner metadata:

- `POST /api/records/owners/manifest`
- `POST /api/records/owners/transfer-dry-run`

Both routes require owner/producer authorization, CSRF/session checks when D1 auth storage is available, matching workspace scope, a fixed core entity type, and a valid core record ID. The manifest route returns only the selected entity and current owner member ID. The transfer route also requires an active target workspace member, verifies the core record belongs to the workspace, updates only that record's `owner_member_id`, returns the previous owner member ID, and records bounded audit metadata.

The Team inspector exposes owner review and transfer for selected project, selected task, selected document, person, equipment, and expense ownership. The backend supports all core owner-bearing tables: projects, documents, tasks, people, equipment, and expenses.

## Consequences

- Owners/producers can review and correct ownership without direct D1 access or broad ad hoc SQL.
- Owner transfer is explicit and audited, but it does not grant project membership or create `record_permissions` rows.
- Ownership history, approval workflows, reviewer/comment semantics, and update/delete authorization remain future work.


---

<a id="0110-core-child-record-stable-ids"></a>

Source: `docs/adr/0110-core-child-record-stable-ids.md`

# ADR 0110: Core Child Record Stable IDs

Date: 2026-07-08

## Status

Accepted.

## Context

The D1 core tables for people, equipment, and expenses already use stable `id` primary keys, and ADR 0109 made owner review/transfer available for every core owner-bearing table. The browser workspace model still treated people, equipment, and expenses as display-only rows keyed by natural names or categories. That was workable for local panels, but it made owner transfer, restore review, and operation replay target different identifiers depending on whether the row came from the browser or D1.

## Decision

Add stable `id` fields to the shared `ProjectPerson`, `EquipmentItem`, and `ExpenseLine` contracts. Local factories, seed fixtures, Notion import mapping, local create flows, restore snapshot records, and backup restore matching now preserve or generate those IDs.

The Team inspector owner control uses explicit entity-type and record selectors for projects, tasks, documents, people, equipment, and expenses. Protected Worker owner routes still validate the selected fixed table and row ID before returning or updating owner metadata.

Older backup payloads that lack child IDs continue to fall back to the previous project/natural-key restore identifier.

## Consequences

- Browser-created people, equipment, and expense rows now target the same D1-shaped core row IDs used by owner manifests, owner transfers, and replay.
- Restore previews can match child rows by ID before falling back to display-name/category matching.
- This does not add contact details, payment details, or provider data to operation sync or backup manifests.
- Ownership history, approval workflows, reviewer/comment semantics, and update/delete authorization remain future work.


---

<a id="0111-core-record-owner-history"></a>

Source: `docs/adr/0111-core-record-owner-history.md`

# ADR 0111: Core Record Owner History

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0109 added protected owner manifest and transfer routes, and ADR 0110 made all browser core child rows addressable by stable IDs. Owner/producers could now correct current ownership, but the UI still had no bounded way to review how a row's owner changed over time.

## Decision

Add a protected `POST /api/records/owners/history` route backed by existing `audit_events` rows. The route requires the same owner/producer authorization, CSRF/session checks, workspace scope, fixed core entity type, and valid row ID checks as owner manifests and transfers. When D1 is available, it validates that the selected core row belongs to the workspace, then returns bounded `record_owner.transferred` audit entries for that exact entity.

The response exposes only transfer-oriented metadata: actor member ID, previous owner member ID, new owner member ID, timestamp, count, and truncation status. It does not expose arbitrary audit metadata values.

The Team inspector adds `Review owner history` next to current-owner review and transfer controls.

## Consequences

- Owners/producers can inspect recent ownership changes without direct D1 access.
- Owner history reuses bounded audit metadata instead of adding another table.
- Deleted-row history, approval workflows, reviewer/comment semantics, and update/delete authorization remain future work.


---

<a id="0112-record-comment-intents"></a>

Source: `docs/adr/0112-record-comment-intents.md`

# ADR 0112: Record Comment Intents

Date: 2026-07-08

## Status

Accepted.

## Context

The record permission model already includes a `comment` level, but there was no protected action that exercised comment authorization. Adding full stored comments would create a new primary-content export and restore surface before the backup model includes comments.

## Decision

Add metadata-only record comment intents for project, task, and document rows.

The Worker route `POST /api/records/comments/dry-run` requires an authenticated session, CSRF, workspace scope, a fixed commentable entity type, an existing core row, and a bounded comment body. Owner/producer sessions can create comment intents. Other roles need to own the selected record or hold an unexpired explicit `comment`, `write`, or `admin` record permission for the exact row.

The Worker route `POST /api/records/comments/manifest` uses the same session, workspace, row-existence, and owner/comment/write/admin authorization checks. It returns only bounded metadata for the exact selected row: author member ID, body preview, body hash, created timestamp, count, and truncation status.

When D1 is available, the Worker stores only a bounded body preview and SHA-256 hash in `record_comment_intents`; it does not store the full comment body. Audit metadata is bounded and includes the entity, body length or manifest count, hash or policy name, truncation state, and persistence mode.

## Consequences

- The `comment` permission level is now exercised by a protected Worker path without exposing full comment content.
- The UI can confirm reviewer/comment access semantics and review saved intent metadata before comments become primary exported content.
- Full comment storage, comment export/restore, threads, mentions, and deletion/moderation workflows remain future work.


---

<a id="0113-core-record-mutation-preflight"></a>

Source: `docs/adr/0113-core-record-mutation-preflight.md`

# ADR 0113: Core Record Mutation Preflight

Date: 2026-07-08

## Status

Accepted.

## Context

Core record ownership, transfer history, explicit record permissions, and comment intents now exist, but update/delete collaboration policy still needed a safe path before any destructive browser workflow ships.

## Decision

Add a non-destructive Worker route, `POST /api/records/mutations/preflight`, for project, task, document, person, equipment, and expense rows.

The route requires authenticated CSRF/session metadata, workspace scope, a fixed core entity type, an existing core row, and a fixed mutation kind of `update` or `delete`. Owner and producer sessions can preflight update or delete access. Other roles can preflight update access for project, task, document, and equipment rows when they own the row or hold an unexpired exact `write` or `admin` grant. Person and expense update preflights remain operator-only for now. Delete preflight remains owner/producer-only for all core rows.

The route does not mutate records. When allowed, it returns only policy metadata: selected entity, mutation kind, allowed-by reason, persistence mode, and audit persistence. Successful preflights record bounded audit metadata.

## Consequences

- The UI can expose update/delete policy checks without introducing destructive actions.
- Explicit write/admin grants can be validated against future update workflows.
- Delete behavior stays conservative until undo, backup, retention, and restore semantics are explicit.
- Actual update/delete routes, optimistic local editing, and permission history remain future work.


---

<a id="0114-record-permission-history"></a>

Source: `docs/adr/0114-record-permission-history.md`

# ADR 0114: Record Permission History

Date: 2026-07-08

## Status

Accepted.

## Context

Owners and producers can assign, review, expire-filter, and revoke project/task/document permissions. ADR 0103 called out permission history as future work so teams can audit how a grant changed without exposing raw audit metadata.

## Decision

Add `POST /api/records/permissions/history` for owner/producer sessions.

The route requires CSRF/session authorization, workspace scope, a fixed project/task/document entity type, an existing core row, and a bounded limit. It reads `audit_events` for `record_permission.assigned` and `record_permission.revoked` entries matching the exact entity type and ID.

The response policy is `record_permission_audit_history`. It returns only bounded permission-change metadata: action, actor member ID, target member ID, permission level, optional department, optional expiry, timestamp, count, and truncation status. Raw audit metadata remains out of the response.

## Consequences

- Owners/producers can audit permission changes from the Team inspector before broader collaboration workflows ship.
- Permission history reuses existing bounded audit events instead of creating another table.
- History is scoped to project/task/document permission UI for now; workspace/planning and other future scopes can be added when they have visible management workflows.


---

<a id="0115-project-membership-history"></a>

Source: `docs/adr/0115-project-membership-history.md`

# ADR 0115: Project Membership History

Date: 2026-07-08

## Status

Accepted.

## Context

The Team inspector can assign project memberships, review the active project team manifest, and remove exact assignments. Owners and producers also need a bounded audit view of who was assigned or removed without exposing raw audit metadata.

## Decision

Add `POST /api/projects/memberships/history` for owner/producer sessions.

The route requires CSRF/session authorization, workspace scope, an existing project row, and a bounded limit. It reads `audit_events` for `project_membership.assigned` and `project_membership.revoked` rows matching the exact workspace and project.

The response policy is `project_membership_audit_history`. It returns only membership-change metadata: action, actor member ID, target member ID, role, optional department, timestamp, count, and truncation status. It does not return raw audit metadata, invite email hashes, tokens, comments, or provider data.

## Consequences

- Owners/producers can inspect project-team changes before broader collaboration workflows ship.
- Membership history reuses existing audit events instead of adding a second membership-history table.
- The route is project-scoped for now; workspace-wide membership history can be added later if the UI grows a cross-project audit workflow.


---

<a id="0116-record-mutation-requests"></a>

Source: `docs/adr/0116-record-mutation-requests.md`

# ADR 0116: Record Mutation Requests

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0113 added authorization preflights for core record updates and deletes. The next useful collaboration step is to let authorized users record intent for owner/producer review before adding real update/delete application.

## Decision

Add `POST /api/records/mutations/request-dry-run` and `POST /api/records/mutations/requests/manifest`.

The request route requires CSRF/session authorization, workspace scope, a fixed core record type, an existing core row, a valid update/delete mutation, and the same authorization as the mutation preflight. It records a bounded `record_mutation.request_created` audit event when D1 is available.

The request response policy is `record_mutation_request_metadata_only`. It returns `destructiveWrite: false` plus request metadata: entity, mutation, actor, allowed-by policy, status, summary preview/hash, bounded field keys, and timestamp.

The first request route implementation stored request metadata in audit events only. ADR 0117 supersedes that storage shape with a dedicated `record_mutation_requests` table, owner/producer resolution, and stale-checked apply routes.

## Consequences

- Update/delete work now has a visible request and review step without weakening destructive-write boundaries.
- The first implementation reused `audit_events`; ADR 0117 moves durable request status to first-class D1 rows.
- Approval resolution, stale-record checks, and actual update/delete application are handled by ADR 0117.


---

<a id="0117-record-mutation-approval-application"></a>

Source: `docs/adr/0117-record-mutation-approval-application.md`

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


---

<a id="0118-local-planning-review-panel"></a>

Source: `docs/adr/0118-local-planning-review-panel.md`

# ADR 0118: Local Planning Review Panel

Date: 2026-07-08

## Status

Accepted

## Decision

Add a read-only Planning panel to the static app shell. The panel derives rows from the bounded `planningRecords` samples already stored in local `import.notion_applied` operation payloads by default, and can explicitly refresh a bounded D1 view through the existing protected planning export dry-run route.

The panel:

- groups rows by first-class production-planning kind,
- shows rows related to the selected project plus rows with no project relation,
- displays bounded titles, project hints, field keys, and source paths,
- marks whether rows came from local import operation samples or a Worker D1 export refresh,
- does not create a new planning persistence model,
- does not bypass the Worker-owned D1 planning commit, backup export, or restore commit paths.

## Context

Film can import, commit, back up, and restore first-class production-planning rows, but the main workspace mostly surfaced those rows through import and restore summaries. Solo filmmakers need a quick operational view of locations, opportunities, meetings, equipment requests, shows, merch, media, and roles without waiting for deeper planning CRUD.

## Consequences

- Planning rows become visible in the workspace after a Notion import while staying metadata-bounded.
- Signed-in users can check the canonical D1 rows from the same Planning panel without granting the browser direct database access.
- Reloaded sessions can reconstruct the review table from persisted local import operation payloads.
- The panel is intentionally not authoritative. D1 planning rows remain owned by the Worker commit/export/restore flows.
- Future CRUD or richer planning views should promote planning rows into an explicit shared schema contract instead of expanding operation-payload parsing indefinitely.


---

<a id="0119-planning-workspace-section"></a>

Source: `docs/adr/0119-planning-workspace-section.md`

# ADR 0119: Planning Workspace Section

Date: 2026-07-08

## Status

Accepted

## Decision

Promote Planning from a static sidebar label into a real workspace section in the static app shell.

The section:

- uses the existing `Slate` dashboard as the default section,
- adds a `Planning` workspace section with a full-width read-only planning table,
- reuses local import operation samples by default,
- can refresh a bounded read-only D1 planning export through the existing protected Worker dry-run,
- keeps unsupported sidebar items on the existing dry-run toast until their own sections are implemented.

## Context

ADR 0118 made planning rows visible inside the Slate dashboard, but the sidebar already exposed `Planning` as a workspace destination. Leaving that item inert made the app feel less operational and hid the most useful planning row review behind the dashboard footer.

## Consequences

- Planning now has a first-class place in the workspace without introducing client-side planning persistence or CRUD.
- The static app shell gets a small validated section state instead of a framework/router dependency.
- Future sections can follow the same conservative pattern: promote one sidebar item at a time only when it has a useful operational surface.


---

<a id="0120-backups-workspace-section"></a>

Source: `docs/adr/0120-backups-workspace-section.md`

# ADR 0120: Backups Workspace Section

Date: 2026-07-08

## Status

Accepted

## Decision

Promote Backups from a static sidebar label into a read-only workspace section for restore-point and safety status review.

The section:

- lists the bounded local restore-point metadata already present in the workspace model,
- summarizes next backup, queued local operations, Worker backup status, stored manifest status, and encrypted restore-preview status,
- reuses existing `Backup now`, `Preview encrypted backup`, and `Stored backups` actions,
- does not introduce a new backup store, restore selector, or destructive restore path.

## Context

Film's MVP needs data export and restore safety before deeper integrations. Backup controls existed in the topbar and inspector, but the sidebar already presented Backups as a workspace destination. A dedicated section makes the safety surface easier to find while keeping the trust-sensitive work in the Worker and existing backup clients.

## Consequences

- Operators can review backup status without scrolling through the inspector.
- Existing backup actions now bind to every matching control so topbar, inspector, and workspace buttons remain functional.
- Stored backup preview and destructive restore flows stay in the existing guarded inspector paths until a broader restore workspace is explicitly designed.


---

<a id="0121-tasks-workspace-section"></a>

Source: `docs/adr/0121-tasks-workspace-section.md`

# ADR 0121: Tasks Workspace Section

Date: 2026-07-08

## Status

Accepted

## Decision

Promote Tasks from a static sidebar label into a selected-project workspace section.

The section:

- shows the selected project's open tasks in a dense table,
- summarizes overdue, pending, and ready counts,
- reuses the existing local `add-task` operation flow,
- keeps task persistence local-first through IndexedDB operation replay until Worker-side task mutation rules are explicitly expanded.

## Context

The Slate dashboard already had a compact task panel, but production work needs a larger operational task surface. The current task model is selected-project scoped and local-first, so a dedicated section can improve usability without introducing new server writes or a router dependency.

## Consequences

- The sidebar Tasks item now has a real workspace destination.
- Task creation remains the same queued local operation and does not bypass existing replay authorization.
- Future task editing, completion, assignment, and filtering should extend the shared schema and Worker replay rules before becoming authoritative.


---

<a id="0122-docs-workspace-section"></a>

Source: `docs/adr/0122-docs-workspace-section.md`

# ADR 0122: Docs Workspace Section

Date: 2026-07-08

## Status

Accepted

## Decision

Promote Docs from a static sidebar label into a selected-project workspace section with a document list and draft editor.

The section:

- shows the selected project's documents in a larger list,
- reuses the existing selected-document state,
- reuses the existing local Markdown draft editor and metadata-only `document.updated` operation flow,
- keeps non-Markdown documents metadata-only.

## Context

Native documents are part of Film's MVP, and the existing dashboard panel already supported local Markdown draft creation and saving. A dedicated Docs workspace makes that workflow easier to use while preserving the current privacy boundary: document body text stays local and is not sent through operation sync.

## Consequences

- The sidebar Docs item now opens a real workspace destination.
- Markdown editing remains local-first and backup-covered.
- Future collaborative body storage or Google Docs sync still needs explicit Worker/provider contracts before document bodies leave the browser.


---

<a id="0123-operational-list-workspace-sections"></a>

Source: `docs/adr/0123-operational-list-workspace-sections.md`

# ADR 0123: Operational List Workspace Sections

Date: 2026-07-08

## Status

Accepted

## Decision

Promote People, Equipment, and Expenses from static sidebar labels into selected-project workspace sections.

The sections:

- render larger selected-project tables for people, equipment, and budget lines,
- reuse the existing local create forms and operation payloads,
- keep people and expense records marked as sensitive where the existing operation flow already does so,
- do not add live provider sync, destructive edits, or new Worker mutation routes.

## Context

People, gear, and expenses are central operational records for solo filmmakers and small teams. The Slate dashboard already had compact panels and local create flows, but the sidebar labels were inert. Promoting the sections makes those records easier to use while keeping the current local-first and Worker-replay boundaries intact.

## Consequences

- The sidebar now has real destinations for the main local operational records.
- Create behavior remains unchanged and continues to queue IndexedDB operations.
- Future edit/delete/assignment behavior should extend shared schemas, authorization, and Worker replay rules before becoming authoritative.


---

<a id="0124-projects-workspace-section"></a>

Source: `docs/adr/0124-projects-workspace-section.md`

# ADR 0124: Projects Workspace Section

Date: 2026-07-08

## Status

Accepted

## Decision

Promote Projects from a static sidebar label into a focused project directory workspace section.

The section:

- reuses the existing project list and board renderers,
- reuses the existing search/filter and project selection behavior,
- keeps Slate as the richer dashboard with timeline, operations, planning, and call-sheet panels.

## Context

The Slate dashboard is useful as an operational overview, but the sidebar also exposes Projects as a separate destination. A focused project directory helps users scan and switch projects without the rest of the dashboard content.

## Consequences

- The sidebar Projects item now has a real workspace destination.
- No new project persistence or mutation behavior is introduced.
- Future project creation/editing can extend this section once Worker replay and authorization rules are expanded.


---

<a id="0125-metadata-only-project-search"></a>

Source: `docs/adr/0125-metadata-only-project-search.md`

# ADR 0125: Metadata-Only Project Search

Date: 2026-07-08

## Status

Accepted

## Decision

Back the topbar project filter with a shared metadata search helper.

The helper indexes:

- project identity, schedule, workflow, budget, timeline, and call-sheet metadata,
- task title, due date, and status,
- document name, type, source metadata, and attachment state,
- person name, role, and initials,
- equipment name and status,
- expense category and bounded budget/spend fields.

Native Markdown draft bodies are excluded from the search index.

## Context

The workspace search placeholder promises more than title filtering, and sidebar sections now expose tasks, docs, people, equipment, and expenses as first-class destinations. Search should help users find the project that owns an operational record without becoming a full-text content index or moving trust-sensitive document body behavior into shared search code.

## Consequences

- Searching for nested operational metadata filters both Slate and the Projects workspace consistently.
- Markdown body text remains local to the editor and backup payloads, not searchable metadata.
- Future Worker-backed search can reuse this boundary by indexing metadata first and treating content search as a separate explicit feature.


---

<a id="0126-mobile-workspace-navigation"></a>

Source: `docs/adr/0126-mobile-workspace-navigation.md`

# ADR 0126: Mobile Workspace Navigation

Date: 2026-07-08

## Status

Accepted

## Decision

Render a compact horizontal workspace navigation rail below the topbar on mobile viewports.

The mobile rail uses the same workspace section list, `data-workspace-section` buttons, active state, and render path as the desktop sidebar navigation.

## Context

The desktop sidebar exposes Slate, Projects, Tasks, Docs, People, Equipment, Expenses, Planning, and Backups. On narrow screens the full sidebar and project nav collapse to preserve usable content width. Once dedicated workspace sections were added, hiding the full sidebar also hid the only way to reach those sections from a fresh mobile session.

## Consequences

- Mobile users can reach every workspace destination without relying on persisted state.
- Section event binding remains shared with desktop navigation.
- The rail is horizontally scrollable, so it does not force the dense operational workspace into a narrower content column.


---

<a id="0127-browser-smoke-gate"></a>

Source: `docs/adr/0127-browser-smoke-gate.md`

# ADR 0127: Browser Smoke Gate

Date: 2026-07-08

## Status

Accepted

## Decision

Add `npm run test:browser` as a Playwright-backed browser smoke gate and include it in `npm run smoke`.

The script starts its own Vite dev server, opens Chromium, and verifies:

- desktop app shell loading,
- serious/critical axe checks for the desktop app shell and mobile Backups workspace,
- mocked magic-link request, verification, and sign-out UI state,
- protected record mutation request, approval, diff, and apply UI state through mocked Worker routes,
- mocked provider dry-run chip summaries for every MVP provider,
- nested metadata search filtering,
- Projects workspace search reuse,
- local create flows for tasks, docs, people, equipment, and expenses,
- partial reconnect sync that leaves rejected local operations queued,
- encrypted ZIP backup export and non-destructive encrypted restore preview,
- desktop document overflow checks,
- mobile search overflow checks,
- mobile navigation to Backups.

## Context

The source-string tests catch important wiring, but they cannot prove that the app is reachable, clickable, and responsive in a real browser. Manual Playwright QA caught a mobile navigation gap after dedicated workspace sections were added. That class of issue should be part of the automated smoke path.

## Consequences

- `npm run smoke` now exercises the static app in Chromium.
- The script stores failure screenshots under ignored `test-results/` paths.
- Live Worker session browser automation remains a separate follow-up gate because it needs configured local or staging Worker origin setup.
- The protected mutation smoke remains mocked at the HTTP boundary; Worker authorization, stale checks, and D1 writes stay covered by `apps/worker/test`.


---

<a id="0128-backup-export-offline-worker-timeouts"></a>

Source: `docs/adr/0128-backup-export-offline-worker-timeouts.md`

# ADR 0128: Backup Export Offline Worker Timeouts

Date: 2026-07-08

## Status

Accepted

## Decision

Use short client-side timeouts for optional Worker calls made during browser backup export.

The local backup export flow still:

- asks for a passphrase,
- creates the encrypted ZIP in the browser,
- downloads the ZIP locally,
- then attempts Worker planning-export, R2 backup-object storage, and restore-point metadata handoff when available.

If those optional Worker calls are unavailable, blocked by development CORS, or slow, Film reports the skipped Worker handoff but does not block the local encrypted ZIP download.

## Context

Core user data must be exportable before deep integrations. Browser backup export already has the right trust boundary, but optional Worker calls can hang long enough to make an offline/local backup feel broken. A local encrypted backup should be reliable even when D1/R2 routes are unavailable.

## Consequences

- Local backup export remains usable offline and in mismatched local-origin development sessions.
- Worker planning rows and stored R2 restore-point metadata are best-effort additions during browser export.
- Explicit Worker actions, such as Planning `Refresh D1`, can still use normal client behavior because the user is intentionally asking for Worker-backed data.


---

<a id="0129-notion-html-import-sanitization"></a>

Source: `docs/adr/0129-notion-html-import-sanitization.md`

# ADR 0129: Notion HTML Import Sanitization

Date: 2026-07-08

## Status

Accepted

## Decision

Do not import Notion `.html` export contents into Film records.

The browser import helper only reads Markdown and CSV text content. Recognized binary assets are represented as metadata plus a deferred `readBlob` callback. HTML files are neither parsed as documents nor treated as attachment blobs.

## Context

Notion exports can include HTML pages with executable markup, inline scripts, external references, or styling that does not map cleanly to Film's static-first data model. Film's MVP importer needs Markdown, CSV databases, and metadata-only attachments, not a browser-rendered HTML ingestion surface.

## Consequences

- HTML export files are ignored instead of becoming document bodies.
- Binary attachments are not read as text during import preflight.
- Future rich-content import must define a sanitizer and target data model before accepting HTML.


---

<a id="0130-expanded-core-mutation-metadata-fields"></a>

Source: `docs/adr/0130-expanded-core-mutation-metadata-fields.md`

# ADR 0130: Expanded Core Mutation Metadata Fields

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0117 added a guarded mutation request, approval, diff, and apply path for core records. The first allowlist covered the minimum operational fields, but common production review work also needs to correct bounded metadata such as project type, document links, sensitivity flags, and short operational notes.

## Decision

Expand `packages/schema` record mutation field definitions for fixed base-table metadata:

- projects: `projectType`
- documents: `externalUrl`
- people: `sensitive`
- equipment: `notes`
- expenses: `comment`

The Worker maps each field to a fixed D1 column, reuses the existing stale `updated_at` gate, and keeps values bounded. Document external URLs must be http(s) URLs without embedded credentials.

Contact details, payment identifiers, raw document bodies, provider credentials, and cross-table `film_profiles` edits remain outside this path.

## Consequences

- Owner/producers can approve a wider set of practical metadata fixes without bypassing the mutation review flow.
- The browser renders the extra fields from the shared contract; local reconciliation updates only fields represented in the current static workspace model.
- Film-profile fields such as runtime, format, shoot dates, and budgets still need a separate design because they live outside the base core-record table used by this stale-check path.


---

<a id="0131-companion-worker-readiness-check"></a>

Source: `docs/adr/0131-companion-worker-readiness-check.md`

# ADR 0131: Companion Worker Readiness Check

Date: 2026-07-08

## Status

Accepted.

## Context

Film's live Stripe summaries are intentionally adapter-first. Pool and Store own their Stripe-derived data and expose summary-only `/film/stripe-summary` endpoints, while Film must not read Stripe directly or copy companion secrets into browser code.

Manual inspection showed the companion repos can drift in two ways: tracked endpoint/secret-name support may be missing, or local `.dev.vars` files may not declare the Film bearer secret even when production secrets are managed elsewhere.

## Decision

Add `npm run check:companions`, backed by `scripts/check-companion-workers.mjs`.

The script checks the sibling Pool and Store repos for:

- `workers_dev = false`
- a production route/custom domain declaration
- tracked `/film/stripe-summary` Worker source
- tracked `FILM_STRIPE_SUMMARY_ADAPTER_SECRET`/fallback bearer-secret usage
- docs/scripts that name the Film adapter endpoint and shared secret

It reads only variable names from local `.dev.vars` files and never prints values. Missing local `.dev.vars` declarations are warnings, not blockers, because production secrets may live in Wrangler or Cloudflare dashboard bindings.

## Consequences

- Film can verify companion adapter readiness without embedding Pool/Store implementation details or leaking local secrets.
- `--strict` can fail CI/operator handoffs when tracked adapter support is missing.
- Live summary enablement still requires operator choices for production Film routes, adapter URLs, matching secret values, project mappings, webhook posture, and redacted audit settings.


---

<a id="0132-provider-secret-free-ci-smoke"></a>

Source: `docs/adr/0132-provider-secret-free-ci-smoke.md`

# ADR 0132: Provider-Secret-Free CI Smoke

Date: 2026-07-08

## Status

Accepted.

## Context

Film needs repeatable release evidence before live provider credentials and production routes exist. CI should prove the static app, Worker package, migrations, browser smoke, and deployment-readiness reporting work without requiring Google, Resend, Stripe, Pool, Store, Social, or SMS secrets.

## Decision

Add `.github/workflows/ci.yml` for pull requests and pushes to `main`.

The workflow:

- installs dependencies with `npm ci`
- installs Playwright Chromium
- runs `npm run smoke`
- runs advisory `npm run check:deploy`
- packages the Worker with `npx wrangler deploy --dry-run`

It does not run `npm run check:companions` because normal GitHub checkouts do not include sibling Pool and Store repos.

## Consequences

- Pull requests get a no-secret baseline covering build, unit tests, secret scan, migrations, browser smoke, deploy-readiness reporting, and Worker packaging.
- Production release remains blocked until route/origin and live-provider decisions are configured.
- Companion Worker readiness remains an operator-local gate unless a future workflow explicitly checks out Pool and Store.


---

<a id="0133-schedule-workspace-section"></a>

Source: `docs/adr/0133-schedule-workspace-section.md`

# ADR 0133: Schedule Workspace Section

## Status

Accepted.

## Decision

Add a dedicated selected-project Schedule workspace section to the static app shell.

The Schedule workspace renders:

- production-clock counters from project progress, task completion, shoot-day, and scene metadata
- phase lanes from the existing project timeline
- upcoming call-sheet metadata from the selected project
- a read-only date-driven task table from the selected project's open tasks

It does not create a second calendar store, write schedule records, call Google Calendar, or add new Worker routes.

## Context

Film needs to feel like a production operations workspace, not only a generic project database. The app already stores the schedule-adjacent fields that matter for the first usable slice: project phase lanes, shoot dates, call-sheet summary, and task due labels.

A full calendar model would require stronger recurrence/date semantics, conflict handling, provider sync policy, and restore behavior. That is larger than the current need and would risk duplicating planning data already imported from Notion.

## Consequences

- Users can navigate directly to a schedule view from desktop and mobile workspace navigation.
- The schedule view stays local/read-only and remains covered by existing backup/export behavior because it derives from project data already in the workspace model.
- Future live Google Calendar or call-sheet publishing work must add explicit Worker-owned contracts instead of extending this static view into unsafely synced browser-owned state.


---

<a id="0134-local-project-packet-export"></a>

Source: `docs/adr/0134-local-project-packet-export.md`

# ADR 0134: Local Project Packet Export

## Status

Accepted.

## Decision

Add a local Markdown `Export packet` action to the selected-project Schedule workspace.

The packet includes selected-project summary, phase timeline, upcoming call-sheet metadata, bounded local planning rows when available, date-driven tasks, documents, people, equipment, and expense lines. The export is generated in browser memory from already-visible workspace metadata and downloaded directly as Markdown.

The packet explicitly excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. It does not queue an operation, create a D1 row, call a provider, or update canonical project data.

## Context

Film needs core user data to be exportable before deeper integrations. Encrypted backups already preserve recoverable workspace data, but solo filmmakers also need a quick human-readable project handoff packet for meetings, crew review, and offline production work.

A local Markdown export is sufficient for this slice and avoids adding document-generation infrastructure, live Google Docs export, or trust-sensitive server behavior before those contracts are explicit.

## Consequences

- Users get a fast selected-project handoff artifact without credentials or network dependencies.
- The export remains a presentation artifact, so canonical restore/sync paths are unchanged.
- Future branded PDF, Google Docs, or email delivery exports must add Worker-owned authorization, audit, provider-scope, and redaction rules before live distribution.


---

<a id="0135-locations-workspace-section"></a>

Source: `docs/adr/0135-locations-workspace-section.md`

# ADR 0135: Locations Workspace Section

## Status

Accepted.

## Decision

Add a dedicated selected-project Locations workspace section to the static app shell.

The Locations workspace renders:

- the active call-sheet location from the selected project
- call, wrap, scene, page, people, and weather metadata for that location
- bounded imported Notion planning rows with kind `location` from the existing local planning review cache

The imported-location table shows bounded field keys and source labels, but not raw import source paths.

## Context

Locations are central to production operations, but Film already has two sources that can support a first useful view: selected-project call-sheet metadata and Notion planning rows imported into the local review cache. Creating another canonical location store now would duplicate the first-class planning tables and force premature decisions about maps, releases, permits, contacts, and sync semantics.

## Consequences

- Users can inspect active and imported location context without leaving the project workspace.
- The slice remains static-first and credential-free.
- Future location editing, maps, permits, releases, or live provider enrichment must use Worker-owned contracts, authorization, audit, and backup/restore rules before becoming canonical writes.


---

<a id="0136-planning-kind-filter"></a>

Source: `docs/adr/0136-planning-kind-filter.md`

# ADR 0136: Planning Kind Filter

## Status

Accepted.

## Decision

Add a production-planning kind filter to the dedicated Planning workspace.

The filter is stored with browser UI preferences and can show all planning rows or one of the supported production-planning kinds: locations, opportunities, meeting notes, equipment requests, shows, merch, media, or roles. It filters the bounded read-only Planning table only.

The filter does not import rows, write D1 rows, update local planning records, or call the Worker.

## Context

The Notion importer can preserve several first-class production-planning row types. A single combined table is useful for auditability, but it is hard to scan once imports contain more than a few rows. A local view filter lets users inspect the imported cache by operational domain without changing the underlying import, backup, or restore contracts.

## Consequences

- Planning review remains one bounded read-only surface while becoming easier to scan.
- The filter state is a UI preference, not user data or sync metadata.
- Future saved views, edits, or canonical planning dashboards must add explicit data contracts and Worker-owned write/audit rules before they become durable collaboration features.


---

<a id="0137-call-sheets-workspace-export"></a>

Source: `docs/adr/0137-call-sheets-workspace-export.md`

# ADR 0137: Call Sheets Workspace Export

## Status

Accepted.

## Decision

Add a dedicated selected-project Call Sheets workspace section to the static app shell.

The workspace renders upcoming call details, crew snapshot, gear pull, and attachment review sections from the selected project's existing call-sheet, people, equipment, and document metadata.

Add a local Markdown `Export call sheet` action. The export is generated in browser memory from already-visible workspace metadata and downloaded directly as Markdown.

The call sheet explicitly excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. It does not queue an operation, create a D1 row, call a provider, update canonical project data, or distribute the call sheet through email, PDF generation, Google Docs, or Calendar.

## Context

Film needs fast production handoff artifacts before deeper provider integrations. Call sheets are essential for solo filmmakers and small crews, but live distribution introduces trust-sensitive choices around recipients, credentials, audit, redaction, and delivery status.

A local Markdown export provides a useful MVP artifact while keeping the implementation static-first and avoiding a premature call-sheet persistence or distribution model.

## Consequences

- Users get a quick selected-project call sheet without credentials or network dependencies.
- The call sheet remains a presentation artifact, so canonical sync, restore, and provider paths are unchanged.
- Future live email, branded PDF, Google Docs, or Calendar distribution must add Worker-owned authorization, audit, provider scopes, delivery state, and redaction rules before it becomes live behavior.


---

<a id="0138-budget-top-sheet-export"></a>

Source: `docs/adr/0138-budget-top-sheet-export.md`

# ADR 0138: Budget Top Sheet Export

## Status

Accepted.

## Decision

Enhance the selected-project Expenses workspace with a read-only Budget Top Sheet.

The top sheet summarizes total budget, spent amount, remaining budget, used percentage, line budget, line spend, largest line, and near/over-budget line counts from existing project and expense metadata.

Add a local Markdown `Export budget` action. The export is generated in browser memory from already-visible workspace metadata and downloaded directly as Markdown.

The budget top sheet explicitly excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. It does not queue an operation, create a D1 row, call Stripe or other providers, update canonical expense data, or become a replacement accounting ledger.

## Context

Film needs useful production finance visibility before live Stripe, Pool, Store, or accounting integrations. The app already has project budget totals and expense lines, so a static top sheet gives filmmakers a practical production artifact without weakening the existing provider boundary.

A local Markdown export is sufficient for this slice and keeps financial provider reads behind the existing Worker-owned dry-run/readiness gates.

## Consequences

- Users get a quick selected-project budget handoff artifact without credentials or network dependencies.
- The Expenses workspace becomes easier to scan while preserving the existing local create and queued operation flow.
- Future live finance summaries, accounting exports, or Stripe/Pool/Store reconciliation must use Worker-owned authorization, audit, redaction, and provider adapter contracts before becoming live behavior.


---

<a id="0139-operational-handoff-exports"></a>

Source: `docs/adr/0139-operational-handoff-exports.md`

# ADR 0139: Operational Handoff Exports

## Status

Accepted.

## Decision

Add local Markdown handoff exports to the selected-project People and Equipment workspaces.

People exports a crew directory from existing project person metadata. The crew directory excludes email addresses and phone numbers because those fields are not part of the current local person model and should not be inferred from provider/import data.

Equipment exports a gear pull from existing project equipment metadata and status fields.

Both exports are generated in browser memory from already-visible workspace metadata and downloaded directly as Markdown. They exclude provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. They do not queue operations, create D1 rows, call providers, or update canonical project data.

## Context

Solo filmmakers and small crews need quick handoff artifacts for crew coordination and gear checks. Film already has local people and equipment records, and the first MVP should make those records portable before deeper collaboration and provider integrations.

Local Markdown exports provide useful artifacts without committing to live email delivery, contact storage, inventory sync, or external document generation.

## Consequences

- Users get crew and gear handoff files without credentials or network dependencies.
- The People and Equipment workspaces remain local-first and reuse existing queued create flows.
- Future contact fields, vendor inventory sync, email delivery, or branded PDFs must add explicit Worker-owned authorization, audit, redaction, backup/restore, and provider contracts before live behavior is enabled.


---

<a id="0140-selected-markdown-draft-export"></a>

Source: `docs/adr/0140-selected-markdown-draft-export.md`

# ADR 0140: Selected Markdown Draft Export

## Status

Accepted.

## Decision

Add a local `Export draft` action to the selected-project Docs workspace for the currently selected Markdown document.

The export downloads a Markdown handoff file containing document metadata, the export policy, and the current browser-local draft body. If the editor contains unsaved text, the export uses the visible textarea value without queueing a sync operation.

Metadata-only non-Markdown documents remain non-exportable from the draft editor. The export excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. It does not create a D1 row, call Google Docs, call a provider, or send document body text to the Worker.

## Context

Native Film documents are canonical for the MVP, while Google Docs import/export/sync remains behind Worker-owned dry-run planning. The current editor intentionally syncs only document metadata, not body previews. Users still need a simple way to take local Markdown draft text out of the app for review or handoff.

A local export preserves the body privacy boundary while making draft text portable.

## Consequences

- Users can export selected Markdown drafts without network access or provider credentials.
- Document body sync remains metadata-only unless a future Worker-owned document body contract is explicitly added.
- Future Google Docs export, collaborative document storage, or server-side Markdown rendering must define authorization, audit, redaction, backup/restore, and provider-scope rules first.


---

<a id="0141-task-list-export"></a>

Source: `docs/adr/0141-task-list-export.md`

# ADR 0141: Task List Export

## Status

Accepted.

## Decision

Add a local Markdown `Export tasks` action to the selected-project Tasks workspace.

The task list export includes selected-project task counts, status coverage, and open task rows from existing local task metadata. It is generated in browser memory and downloaded directly as Markdown.

The export excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths. It does not queue an operation, create a D1 row, call Google Calendar, update task records, or become a live scheduling integration.

## Context

Film's MVP needs quick production handoff artifacts while deeper collaboration and calendar integrations remain explicitly gated. The Tasks workspace already renders the open task data needed for a useful handoff list.

A local Markdown export supports offline review and crew coordination without weakening the existing static-first and Worker-owned trust boundaries.

## Consequences

- Users can download selected-project task lists without network access or provider credentials.
- Local task creation and future Worker replay remain unchanged.
- Future calendar sync, assignee notifications, or collaborative task exports must define Worker-owned authorization, audit, redaction, and provider-scope rules first.


---

<a id="0142-planning-view-export"></a>

Source: `docs/adr/0142-planning-view-export.md`

# ADR 0142: Planning View Export

## Status

Accepted.

## Decision

Add a local Markdown `Export view` action to the dedicated Planning workspace.

The export uses the current production-planning kind filter and the same bounded row view rendered in the workspace. It includes row kind, title, project label, bounded field summaries, and safe source labels, but excludes raw local import source paths.

The export is generated in browser memory and downloaded directly as Markdown. It does not import rows, refresh D1, call the Worker, create D1 rows, update planning records, or expose raw attachment bytes.

## Context

The Notion importer preserves first-class production-planning rows, and the Planning workspace can filter those rows by operational domain. Users need a shareable review artifact for meetings and cleanup without creating another planning database or leaking local filesystem paths from import records.

A local view export gives a portable review artifact while keeping canonical planning writes and D1 refresh behavior behind existing explicit actions.

## Consequences

- Users can export the current Planning view without credentials or network access.
- Raw import source paths stay out of the handoff file.
- Future saved planning views, edits, or live planning dashboards must define durable data contracts, authorization, audit, and backup/restore behavior first.


---

<a id="0143-project-directory-export"></a>

Source: `docs/adr/0143-project-directory-export.md`

# ADR 0143: Project Directory Export

## Status

Accepted.

## Decision

Add a local Markdown `Export directory` action to the Projects workspace.

The export uses the current Projects filter and includes visible project metadata such as type, phase, shoot dates, location, runtime, format, progress, budget totals, task counts, document counts, people counts, equipment counts, and expense counts.

The export excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, raw import source paths, and Markdown document bodies. It is generated in browser memory and downloaded directly as Markdown. It does not queue operations, call the Worker, update project records, or expose document body text.

## Context

The Projects workspace is the broadest project directory surface. Film already supports selected-project handoff exports, but users also need a workspace-level index they can share for reviews, planning, and archive audits.

Using the current filter makes the export match the visible operator intent without adding saved views or a second reporting model.

## Consequences

- Users can export filtered project directories without network access or provider credentials.
- The directory remains metadata-only and does not weaken document-body privacy.
- Future saved reports, CSV exports, or team-shared directories must add explicit data contracts, authorization, audit, and backup/restore behavior first.


---

<a id="0144-local-activity-log-export"></a>

Source: `docs/adr/0144-local-activity-log-export.md`

# ADR 0144: Local Activity Log Export

## Status

Accepted.

## Decision

Add a local Markdown `Export activity` action to the Activity inspector tab.

The export includes local browser audit event messages, actor labels, and display timestamps from the workspace mirror. It excludes provider secrets, OAuth tokens, raw attachment bytes, private Worker state, raw Worker audit metadata, raw import source paths, and Markdown document bodies.

The export is generated in browser memory and downloaded directly as Markdown. It does not call the Worker, request the protected Worker audit manifest, create D1 rows, or expose Worker audit metadata values.

## Context

Film has two audit surfaces: a local browser audit log for user-visible local actions and a protected Worker audit manifest for D1-backed server actions. The Worker manifest intentionally returns metadata keys only. Users still need a simple way to export the local activity trail for review or support without requiring a signed session.

A local activity export keeps the browser log portable while preserving the stricter Worker audit boundary.

## Consequences

- Users can export local activity without network access or credentials.
- Worker audit metadata remains protected and metadata-key-only.
- Future unified audit exports must define authorization, redaction, retention, and pagination contracts before combining browser and Worker audit streams.


---

<a id="0145-local-team-roster-export"></a>

Source: `docs/adr/0145-local-team-roster-export.md`

# ADR 0145: Local Team Roster Export

## Status

Accepted.

## Decision

Add a local Markdown `Export team` action to the Team inspector section.

The export includes workspace member display names, roles, managed statuses, last-seen labels, and short email-hash references. It excludes raw email addresses, provider secrets, OAuth tokens, raw invite tokens, raw attachment bytes, private Worker state, permission grant details, and Worker audit metadata values.

The export is generated in browser memory and downloaded directly as Markdown. It does not call the Worker, request protected permission manifests, create D1 rows, or expose invite token hashes.

## Context

Film users need core user data to be exportable before deeper integrations ship. Workspace membership is core operational data, but the collaboration model already has trust-sensitive Worker surfaces for invite manifests, permission grants, owner transfers, mutation requests, and audit events.

A local roster export gives solo filmmakers and small teams a portable membership snapshot without weakening the Worker boundary around grants, invite tokens, and audit metadata.

## Consequences

- Users can export a useful team list without network access or credentials.
- Raw contact data and invite secrets remain out of browser exports.
- Future permission or grant exports must define protected Worker authorization, redaction, pagination, and audit behavior before joining the roster export.


---

<a id="0146-live-worker-smoke-gate"></a>

Source: `docs/adr/0146-live-worker-smoke-gate.md`

# ADR 0146: Live Worker Smoke Gate

## Status

Accepted.

## Decision

Add `npm run smoke:worker`, backed by `scripts/live-worker-smoke.mjs`, as an opt-in smoke gate for a configured local or staging Worker origin.

The smoke checks:

- `GET /health`
- `GET /api/provider-status`
- dry-run magic-link request and verification
- session metadata read with the returned `film_session` cookie
- MVP provider dry-run routes for Pool, Store, Stripe, Social, Google, Resend, and SMS
- Stripe summary-readiness policy
- Google Drive sync planning
- logout with the returned CSRF token

The command skips when no origin is configured. Operators can require the gate with `FILM_WORKER_SMOKE_REQUIRED=1` or `--require`. The script records only pass/fail evidence and route names; it does not print development magic-link tokens, CSRF tokens, cookies, provider secrets, or response payloads.

## Context

`npm run test:browser` already validates the UI in Chromium with mocked Worker routes. Worker unit tests validate D1/KV authorization and route behavior in-process. A release handoff still needs a small proof that a real Wrangler or staging Worker origin is reachable and that browser-facing dry-run auth/provider routes work together over HTTP.

Keeping the gate opt-in preserves secret-free default CI while giving operators a concrete local/staging command.

## Consequences

- Local/staging handoff can verify a real Worker origin with `FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:worker`.
- Default `npm run smoke` stays deterministic and does not require a running Worker.
- Browser UI automation against a live Worker remains a separate future gate.
- Live provider adapter reads still require explicit local/staging secrets and are not proven by this dry-run smoke.


---

<a id="0147-browser-worker-smoke-gate"></a>

Source: `docs/adr/0147-browser-worker-smoke-gate.md`

# ADR 0147: Browser Worker Smoke Gate

## Status

Accepted.

## Decision

Add `npm run smoke:browser:worker`, backed by `scripts/browser-worker-smoke.mjs`, as an opt-in browser smoke against a configured local or staging Worker origin.

The smoke opens the static app in Chromium and verifies:

- app shell loading
- dry-run magic-link request and verification through the real Worker origin
- signed owner session rendering
- MVP provider dry-run chips through the real Worker origin
- Stripe summary-readiness rendering
- Google Drive sync planning rendering
- logout through the real Worker origin

The command skips when no Worker origin is configured. It uses `FILM_BROWSER_WORKER_SMOKE_APP_ORIGIN` when supplied; otherwise it uses or starts local Vite at `http://127.0.0.1:5173` with `VITE_WORKER_URL` pointed at the Worker origin.

## Context

ADR 0146 added a direct Worker-origin smoke. That proves the Worker routes compose over HTTP, but it does not prove the static app can call those routes with browser credentials, CORS, cookies, and CSRF handling.

The default browser smoke stays mocked for deterministic CI. This opt-in gate gives local/staging operators the missing UI-through-Worker evidence without requiring provider secrets or production routes.

## Consequences

- Local/staging handoff can verify browser credential flow with `FILM_WORKER_SMOKE_ORIGIN=http://127.0.0.1:8787 npm run smoke:browser:worker`.
- Default `npm run smoke` remains deterministic and does not require a running Worker.
- Protected mutation, backup, restore, and live provider adapter browser flows remain future opt-in extensions.
- The gate must not print magic-link tokens, CSRF tokens, cookies, provider secrets, or full Worker payloads.


---

<a id="0148-backup-zip-parser-edge-cases"></a>

Source: `docs/adr/0148-backup-zip-parser-edge-cases.md`

# ADR 0148: Backup ZIP Parser Edge-Case Tests

## Status

Accepted.

## Decision

Cover backup ZIP parser rejection paths by generating a valid encrypted Film backup ZIP in tests and mutating its first central-directory header in memory.

The tests now assert rejection for:

- encrypted ZIP entries
- ZIP64 size sentinels
- malformed central-directory signatures

The fixtures are generated at test time instead of committed as binary archives.

## Context

Film backup ZIPs intentionally use a small stored-entry container: no compression, no encrypted ZIP entries, and no ZIP64 support. The actual sensitive backup payloads are encrypted application payloads inside the ZIP. The parser already rejects unsupported central-directory features, but the automated coverage did not exercise those failure paths.

Central-directory mutation tests keep the coverage close to the parser boundary while avoiding static binary fixtures that are harder to audit.

## Consequences

- Parser hard-fail behavior for unsupported ZIP features is covered.
- Tests remain readable and do not add committed binary fixtures.
- Future support for compressed or ZIP64 backup containers must update both parser behavior and these edge-case tests deliberately.


---

<a id="0149-restore-preview-accessibility-smoke"></a>

Source: `docs/adr/0149-restore-preview-accessibility-smoke.md`

# ADR 0149: Restore Preview Accessibility Smoke

## Status

Accepted.

## Decision

Extend `npm run test:browser` so the decrypted backup restore-preview state must pass serious/critical axe checks in Chromium.

The check runs after a local encrypted ZIP backup is exported, selected for preview, decrypted through the native passphrase prompt, and rendered with restore-preview warnings, action controls, and review content. It complements the existing desktop app-shell and mobile Backups accessibility checks.

## Context

Backup and restore controls are safety-critical. The browser smoke already proved the preview was non-destructive and did not overflow, but accessibility checks only covered the initial shell and mobile Backups workspace.

Running axe against the rendered restore-preview state catches severe semantic, labeling, and contrast regressions in the controls users rely on before any destructive restore path.

## Consequences

- Restore preview regressions can fail the normal `npm run smoke` gate.
- The check remains deterministic because it uses local encrypted backup export and preview, not live Worker restore commits.
- Native browser prompts and deeper live restore apply states still need separate targeted accessibility coverage.


---
