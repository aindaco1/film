# Historical Decisions 0050-0099

Consolidated losslessly on 2026-09-06 from incremental ADRs. Original status statements describe their implementation stage, not current product or provider readiness. See [current decision owners](../../adr/README.md) and [project status](../../PROJECT_STATUS.md). Original files remain in the v0.1.0-beta.1 Git tag.

<a id="0050-workspace-invite-dry-run"></a>

Source: `docs/adr/0050-workspace-invite-dry-run.md`

# ADR 0050: Workspace Invite Dry Run

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0087 and ADR 0100.

## Decision

Implement workspace invite creation and acceptance as Worker-owned dry-run routes backed by D1 when available.

Owners and producers can create invites for a workspace through `POST /api/invites/create-dry-run`. Producer-created owner invites are rejected. Invite creation stores the target email as `email_hash`, stores only a hashed token, revokes older pending invites for the same workspace/email hash, records an audit event, and returns a development-only token without sending email.

Unauthenticated invite acceptance uses `POST /api/invites/accept-dry-run`. The Worker resolves the token hash, rejects expired or non-pending invites, creates or updates the workspace member, activates `workspace_member_statuses`, marks the invite accepted, and records an audit event. Acceptance does not create a session; the accepted member signs in through the existing magic-link path.

## Context

The MVP needs collaboration foundations before deeper provider integrations, but production invite delivery, custom routes, abuse controls, and email provider policy are not finalized. The D1 invite and member-status tables already exist, and auth now rejects invited/disabled members and workspace mismatches.

## Consequences

- Browser code never stores raw invite emails in the local mirror, operation log, or backups.
- Development tokens are visible only in the immediate dry-run response so local UI can exercise acceptance before email delivery exists.
- D1-backed acceptance can be tested end to end without adding production email, SMS, OAuth, or provider credentials.
- ADR 0100 adds protected pending invite manifests and exact pending invite revocation without exposing raw emails or token hashes.
- Future live invite delivery can reuse the D1 invite and dry-run delivery outbox model but must add abuse controls, delivery provider integration, token lifecycle policy, and public route decisions before going live.


---

<a id="0051-project-membership-assignment-dry-run"></a>

Source: `docs/adr/0051-project-membership-assignment-dry-run.md`

# ADR 0051: Project Membership Assignment Dry Run

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0099.

## Decision

Add a Worker-owned dry-run route for assigning active workspace members to projects:

`POST /api/projects/memberships/assign-dry-run`

The route requires owner/producer mutation authorization when D1 auth storage is available, rejects workspace mismatches, rejects producer-assigned owner roles, verifies that the target member exists in the same workspace and is active, ensures a project row exists for seed/local projects, and upserts `project_memberships`.

The Team inspector exposes a compact assignment form for the currently selected project. The web app stores only local audit feedback and transient UI state; the durable authorization signal is the D1 `project_memberships` row.

## Context

Invite acceptance activates workspace members, and operation replay already requires project membership for contributor and department-lead task/document creates. Without an assignment route, tests had to seed `project_memberships` directly and the UI could not exercise the collaboration path.

## Consequences

- Contributor and department-lead replay guards can now be exercised through a user-visible Worker route.
- Project assignments remain unavailable to signed-out users and fail closed for disabled/invited target members.
- ADR 0099 adds protected project membership manifests and exact assignment removal. Production still needs deeper record-level permissions, history, department scope rules, and invite delivery hardening before collaboration is complete.


---

<a id="0052-explicit-r2-attachment-byte-storage"></a>

Source: `docs/adr/0052-explicit-r2-attachment-byte-storage.md`

# ADR 0052: Explicit R2 Attachment Byte Storage

Date: 2026-07-08

## Status

Accepted

## Decision

Add an explicit Worker-owned attachment object upload path:

`PUT /api/attachments/r2/upload-object`

The route stores bytes in the `ATTACHMENTS` R2 binding only when all of these are true:

- The caller has a valid protected mutation session and CSRF header when D1 auth storage is available.
- The request workspace matches the authenticated D1 session workspace.
- The request includes `x-film-storage-confirmation: STORE <workspaceId>`.
- A matching D1 upload intent exists for workspace, doc id, object key, size, SHA-256, and hashed commit token.
- The received byte length and SHA-256 match the prepared intent metadata.

The Notion import flow still stages attachment blobs locally and performs metadata-only prepare/commit dry runs first. A separate `Store attachments` UI action reads staged blobs from IndexedDB, prepares fresh intents, sends bytes to the Worker upload route, and marks matching docs `stored_r2` only after the Worker confirms storage.

## Context

Earlier R2 work intentionally stopped at prepare/commit dry runs so the app could validate object keys, sizes, hashes, and idempotent commit metadata before production object storage. The Cloudflare `ATTACHMENTS` R2 binding now exists, and staged Notion blobs need a controlled path to durable object storage without silently uploading during import.

## Consequences

- Raw attachment bytes move to the Worker/R2 only after an explicit user action.
- Workspace JSON, operation payloads, and encrypted backup manifests remain metadata-only for attachments.
- D1 upload intents remain the authorization and idempotency record for R2 object writes.
- Attachment restore/export byte handling is still future work; stored object keys are now available for that path.


---

<a id="0053-protected-r2-attachment-export"></a>

Source: `docs/adr/0053-protected-r2-attachment-export.md`

# 0053 Protected R2 Attachment Export

## Status

Accepted

Updated by ADR 0062, ADR 0063, ADR 0064, and ADR 0065.

## Context

Film now has an explicit attachment byte-storage action that can write staged Notion attachment blobs to the `ATTACHMENTS` R2 binding after D1 upload intent validation. Once bytes are stored, users need a way to prove what is exportable and eventually retrieve those bytes, but the browser must not gain broad R2 listing authority or decide which object belongs to a workspace.

## Decision

Stored attachment export uses Worker-owned endpoints:

- `POST /api/attachments/r2/export-manifest` returns a bounded manifest of D1 `stored_r2` attachment intent rows for the authenticated workspace.
- `POST /api/attachments/r2/export-package-dry-run` returns a package plan with object count, total size, byte-source status, expiring package token metadata, and blockers when D1/R2 metadata is unavailable, truncated, or over the package byte cap.
- `GET` or `POST /api/attachments/r2/package` returns a bounded ZIP package containing a manifest plus D1-confirmed R2 attachment objects after validating every object size and SHA-256 hash. The POST path accepts a bounded selected list of manifest-returned object keys, requires the matching unexpired package plan token from ADR 0062, and revalidates every key against D1.
- `GET /api/attachments/r2/object` returns one R2 object only after the Worker validates the session, CSRF token, owner/producer role, workspace scope, object-key prefix, and matching D1 `stored_r2` row.

The manifest and package dry run are capped. The package ZIP route enforces a 25 MB source-byte cap, never lists R2 keys, and reads only D1-confirmed object keys. Browser-selected package keys are treated as hints and must match D1 rows for the authenticated workspace. The object route does not list R2 keys, does not trust browser-supplied attachment metadata, and serves bytes only for the exact D1-confirmed object key.

The web app exposes `Export manifest`, `Package attachments`, `Download package`, and `Download latest attachment` actions in the import inspector. The package action reports the D1-confirmed object count and total byte size. The package and object download actions verify downloaded blob SHA-256 values against Worker metadata, save files locally, and record local audit events without mutating workspace records.

## Consequences

- Attachment byte export remains behind Worker authorization instead of direct browser R2 access.
- D1 remains the source of truth for workspace ownership and stored attachment state.
- Backup ZIP payloads still keep attachment manifests metadata-only until a deliberate restore/export packaging flow is added.
- Object-download expiry policy and destructive restore application remain future work. ADR 0063 adds bounded single-range support for protected individual attachment object downloads, ADR 0064 adds bounded single-range support for protected package ZIP downloads, and ADR 0065 adds bounded pagination for stored attachment manifests and package plans.


---

<a id="0054-explicit-r2-backup-object-storage"></a>

Source: `docs/adr/0054-explicit-r2-backup-object-storage.md`

# 0054 Explicit R2 Backup Object Storage

## Status

Accepted

## Context

Film already exports encrypted `.filmbackup.zip` bundles in the browser and records latest-five restore-point metadata through a Worker dry-run route. That protects offline/local export, but restore-point metadata still used placeholder snapshot refs when the encrypted bytes were not stored in R2.

## Decision

Add a separate Worker-owned route, `PUT /api/backups/r2/upload-object`, for explicit storage of already-encrypted backup ZIP bytes in the `BACKUPS` R2 binding.

The route requires owner/producer mutation authorization when D1 auth is available, a valid workspace, matching workspace scope, `STORE BACKUP <workspaceId>` confirmation, a valid backup timestamp, declared size under the upload cap, a declared SHA-256 hash, and a matching SHA-256 over the received bytes. The Worker derives the R2 object key from workspace ID, backup timestamp, and hash; the browser does not choose the path.

After a successful R2 write, the Worker records a restore-point row whose snapshot ref points at `r2://film-backups/...`, prunes older restore points to latest five, and writes an audit event when D1 is available.

The web backup button still downloads the encrypted ZIP locally first. It then attempts the explicit R2 upload and falls back to the metadata-only backup dry-run route if storage is unavailable.

## Consequences

- Backup object storage no longer relies on placeholder snapshot refs when the `BACKUPS` binding is available.
- Passphrases and decrypted workspace payloads remain browser-only; the Worker receives only encrypted ZIP bytes plus validation metadata.
- Local backup export remains usable offline or when the Worker rejects storage.
- ADR 0055 adds protected stored-backup manifest and object download. Restore application from R2, lifecycle policy, and destructive restore commits remain future work.


---

<a id="0055-protected-r2-backup-export"></a>

Source: `docs/adr/0055-protected-r2-backup-export.md`

# 0055 Protected R2 Backup Export

## Status

Accepted

## Context

ADR 0054 stores already-encrypted backup ZIP bytes in the `BACKUPS` R2 bucket and records D1 restore points whose snapshot refs point at those objects. The next boundary is read access: users need to discover stored backup objects and eventually restore from them, but browser code must not list R2 buckets or choose arbitrary object keys.

## Decision

Add two Worker-owned routes:

- `POST /api/backups/r2/export-manifest` returns a bounded manifest of D1 restore points whose snapshot refs point at `r2://film-backups/workspaces/<workspace>/backups/...`.
- `GET /api/backups/r2/object` returns one encrypted backup ZIP only after the Worker validates owner/producer authorization, workspace scope, a D1 restore-point ID, the snapshot ref namespace, and the derived R2 object key prefix.

The browser-facing UI starts with a `Stored backups` action that previews the bounded manifest count and a `Preview stored backup` action that downloads a selected encrypted ZIP through the Worker, prompts for the passphrase locally, and reuses the existing non-destructive restore preview.

## Consequences

- R2 backup reads are mediated by D1 restore-point ownership, not browser-supplied object keys.
- Dry-run restore points with placeholder snapshot refs are not exposed as stored backup objects.
- The Worker can audit manifest creation and backup object downloads when D1 is available.
- Restore application from downloaded backup bytes remains non-destructive and preview-only until durable restore commits are implemented.


---

<a id="0056-dust-wave-workspace-fixture"></a>

Source: `docs/adr/0056-dust-wave-workspace-fixture.md`

# 0056 Dust Wave Workspace Fixture

## Status

Accepted

## Context

The importer tests already use Dust Wave-shaped relation-list CSV data. Future smoke tests need a reusable workspace that exercises relation-heavy projects, stored attachment metadata, backup manifests, roles, expenses, and operational records without mutating the default app seed.

## Decision

Export `dustWaveWorkspace` from `packages/schema` as a deterministic fixture. It is not the app default. The fixture includes a Dust Wave feature project, an operations project, relation-oriented tasks/docs/people/equipment/expenses, hashed members only, and one stored-R2 attachment metadata row. The backup package round-trips this fixture through encrypted ZIP creation, manifest reading, decryption, and non-destructive restore preview smoke coverage.

## Consequences

- Tests and future smoke flows can opt into richer production-shaped data.
- Backup restore-preview coverage now exercises a relation-heavy workspace with stored-R2 attachment metadata.
- The default Film app seed remains stable for the current UI.
- Fixture data remains metadata-only for stored attachments; no raw provider secrets, emails, or backup/attachment bytes are included.


---

<a id="0057-restore-application-preview-plan"></a>

Source: `docs/adr/0057-restore-application-preview-plan.md`

# 0057 Restore Application Preview Plan

## Status

Accepted

Updated by ADR 0066, ADR 0067, ADR 0081, ADR 0082, and ADR 0083.

## Context

Film can decrypt browser backups locally and ask the Worker to check a restore confirmation gate, but there is still no durable destructive restore commit path. Before adding one, the product needs an explicit restore application contract that states what would be created or updated and why application remains blocked.

## Decision

`summarizeRestorePreview` now includes a preview-only restore application plan. The plan reports create, update, unchanged, and field-conflict counts; attachment and planning restore policies; whether a pre-restore backup is required; bounded operation samples; and blockers that must be cleared before any destructive commit can exist.

The plan still returns `destructiveWrite: false`, `canApply: false`, and `requiresWorkerCommit: true` because preview itself is non-destructive. Later ADRs add gated Worker commit endpoints for workspace snapshot rows and planning rows; the preview plan remains the contract those commits validate against. Attachment bytes stay blocked pending package verification and destination write rules.

## Consequences

- The browser can show restore application rules without overwriting records.
- Future Worker restore commits have a stable preview contract to validate against.
- ADR 0067 adds bounded operation samples for create, update, skip, and planning preview-only records.
- Attachment byte packaging remains separate work before destructive byte restore can ship.


---

<a id="0058-stripe-summary-adapter-boundary"></a>

Source: `docs/adr/0058-stripe-summary-adapter-boundary.md`

# ADR 0058: Stripe Summary Adapter Boundary

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0107.

## Decision

Film will treat Stripe live reads as summary-adapter-first through Worker-owned Pool/Store boundaries. Direct Stripe API reads remain disabled in the MVP and require a later explicit decision with restricted scopes, production webhooks, redacted audit events, and production resource configuration.

## Context

Stripe payment, payout, and invoice data is financially sensitive. The current MVP needs visible provider status and planning metadata, but it does not need Film to become the primary Stripe client. Pool and Store are closer to the product workflows that generate financing, orders, attendees, and campaign summaries, so they are the safer first place to normalize Stripe-derived finance signals.

Stripe's current integration guidance emphasizes choosing the right API surface deliberately, using modern payment objects and events, and securing live keys and webhooks before launch. Film should not add Stripe secrets or direct API calls until the production boundary is clearer.

## Consequences

- The Stripe provider dry-run contract now exposes `productionReadPolicy.mode = "summary_adapter_first"`.
- The Worker returns Stripe as `liveReadAllowed: false` with a summary-only data boundary.
- The web inspector renders provider production-read policy when present.
- No Stripe SDK, API key, webhook secret, or live request path is added.
- The roadmap moves from deciding the Stripe read path to implementing Pool/Store summary adapters after scopes, mappings, webhooks, audit events, and production secrets are explicit.


---

<a id="0059-restore-pre-restore-backup-proof"></a>

Source: `docs/adr/0059-restore-pre-restore-backup-proof.md`

# ADR 0059: Restore Pre-Restore Backup Proof

Date: 2026-07-08

## Status

Accepted

Updated by ADR 0061 and ADR 0066.

## Decision

The Worker restore commit dry-run gate must verify stored R2 pre-restore backup proof before it can advance past the backup-proof blocker. The proof is a D1 restore-point ID whose snapshot reference belongs to the same workspace and points at the `film-backups` R2 namespace.

The gate remains non-destructive. Missing or unverified proof returns `blocked_until_pre_restore_backup`; verified proof returns the existing `blocked_until_restore_commit_storage` status until durable restore commits are implemented.

## Context

Restore previews and confirmation gates reduce accidental overwrite risk, but a future destructive restore path also needs a current safety backup. Film already records stored R2 backup restore points in D1. Reusing that metadata for dry-run proof lets the UI and Worker practice the final safety flow without adding destructive writes.

## Consequences

- `/api/restores/commit-dry-run` accepts optional `preRestoreBackupId`.
- The Worker verifies the ID against D1 restore-point metadata for the same workspace and requires an R2 backup snapshot reference.
- The web app sends a pre-restore backup ID only when the current session has successfully stored backup bytes in R2.
- The restore gate inspector reports proof persistence, verification status, and blocker text.
- ADR 0061 adds durable approval dry-run records that reuse this proof model, and ADR 0066 requires the same proof before recording blocked commit-storage attempts.


---

<a id="0060-deployment-readiness-report"></a>

Source: `docs/adr/0060-deployment-readiness-report.md`

# ADR 0060: Deployment Readiness Report

Date: 2026-07-08

## Status

Accepted

## Decision

Add `npm run check:deploy` as a non-secret deployment readiness report and `npm run check:deploy:strict` as the future failing gate once production route and origin decisions are configured.

## Context

The Worker already has real MVP D1/KV/R2 bindings and `workers_dev = false`, but production route/custom domain and production `ALLOWED_ORIGINS` still require an explicit product/deployment decision. A normal smoke run should not fail because those decisions are intentionally pending, but the blockers should be visible and repeatable.

## Consequences

- `scripts/check-deployment-readiness.mjs` validates non-secret Wrangler configuration and provider-live shape checks.
- The report confirms local-safe controls such as `workers_dev = false` and required D1/KV/R2 bindings.
- The report flags missing production route/custom domain, local-only or malformed `ALLOWED_ORIGINS`, and incomplete invite/Stripe live-provider configuration without printing secrets.
- Strict mode exits non-zero while blockers remain, but normal development uses the non-strict report.


---

<a id="0061-restore-approval-dry-run-records"></a>

Source: `docs/adr/0061-restore-approval-dry-run-records.md`

# ADR 0061: Restore Approval Dry-Run Records

Date: 2026-07-08

## Status

Accepted

Updated by ADR 0066.

## Decision

Add durable, non-destructive restore approval records at `POST /api/restores/approval-dry-run`.

The route uses the same owner/producer authorization, workspace match, bounded preview counts, exact `RESTORE <workspaceId>` confirmation phrase, and stored R2 pre-restore backup proof model as the restore commit dry-run gate. When D1 is available, it writes a `restore_approvals` row with the authenticated actor, snapshot workspace, backup timestamp, pre-restore backup proof ID, preview JSON, approval status, and `destructive_write = 0`.

Statuses are intentionally narrow:

- `blocked`: approval intent was recorded, but verified pre-restore backup proof is missing.
- `approved_pending_commit`: approval intent has verified pre-restore backup proof, but restore application is still absent.

## Context

The restore gate already practices authorization and confirmation, but future destructive restore work needs a durable marker that an owner or producer intentionally reviewed a specific preview. Persisting that marker now lets the UI and Worker exercise the approval handoff while keeping actual restore commits blocked.

## Consequences

- `migrations/0007_restore_approvals.sql` adds the `restore_approvals` table.
- The web inspector shows `Record approval` after a restore preview and gate check.
- Approval records persist only preview counts and warnings, not decrypted backup contents or backup passphrases.
- The route always returns `destructiveWrite: false`.
- ADR 0066 adds a commit-storage dry-run route that validates a matching approved record and records a blocked commit attempt before any destructive restore application exists.
- Future destructive restore commits must validate matching approval and attempt records, rerun conflict checks, write audit events, and define rollback guidance before applying data.


---

<a id="0062-expiring-attachment-package-plans"></a>

Source: `docs/adr/0062-expiring-attachment-package-plans.md`

# ADR 0062: Expiring Attachment Package Plans

Date: 2026-07-08

## Status

Accepted

## Decision

Require an expiring D1-backed package plan before stored R2 attachment ZIP downloads.

`POST /api/attachments/r2/export-package-dry-run` can bind a package plan to selected D1-confirmed object keys. When the package is streamable, the Worker writes an `attachment_package_plans` row with the workspace, actor, selected object keys, object count, total source bytes, token hash, and expiry. It returns the package plan ID, one-time browser-visible package token, and expiry to the signed-in browser response.

`POST /api/attachments/r2/package` now requires the matching package plan ID and package token, rejects expired plans, rejects selected-key mismatches, revalidates every object key against D1, and checks that the total source byte count still matches the plan before reading R2 bytes.

## Context

The package ZIP route already revalidated browser-submitted object keys against D1 and enforced the byte cap. It still allowed callers to skip the package planning step and call the ZIP route directly. A short-lived plan token makes the protected package flow explicit: manifest, plan, then download.

## Consequences

- `migrations/0008_attachment_package_plans.sql` adds package plan storage.
- Package tokens are hashed at rest and expire after 15 minutes.
- Package downloads remain protected by owner/producer auth, CSRF/session checks, workspace scope, D1 object validation, R2 object validation, package SHA-256 headers, and the 25 MB source-byte cap.
- Browser state stores the returned plan token only long enough to download the planned package.
- Object-download expiry policy remains future hardening work. ADR 0063 adds bounded single-range support for protected individual attachment object downloads, and ADR 0064 adds bounded single-range support for protected package ZIP downloads.


---

<a id="0063-protected-attachment-object-ranges"></a>

Source: `docs/adr/0063-protected-attachment-object-ranges.md`

# ADR 0063: Protected Attachment Object Ranges

Date: 2026-07-08

## Status

Accepted

## Decision

Support bounded single-range downloads for protected stored R2 attachment objects.

`GET /api/attachments/r2/object` accepts standard single `Range` headers after owner/producer authorization, CSRF/session checks, workspace scope checks, D1 object-key ownership validation, and R2 binding availability checks. The Worker rejects multi-range, malformed, unsatisfiable, or over-cap ranges with `416` and serves valid ranges as `206 Partial Content` with `Content-Range` and `Accept-Ranges`.

## Context

Attachment objects can become large enough that future previews or resumable downloads should not require a full object read. The object route already validates D1 ownership before reading R2, so range support belongs inside that protected route rather than exposing R2 keys or signed URLs.

## Consequences

- Range responses are capped at 5 MB per request.
- Full-object downloads remain available for stored attachments up to the existing upload limit.
- `x-film-sha256` continues to refer to the full stored object hash; clients must not treat it as a partial-body hash.
- Package ZIP downloads do not support byte ranges yet.


---

<a id="0064-protected-attachment-package-ranges"></a>

Source: `docs/adr/0064-protected-attachment-package-ranges.md`

# ADR 0064: Protected Attachment Package Ranges

Date: 2026-07-08

## Status

Accepted

## Decision

Support bounded single-range responses for protected stored attachment package ZIP downloads.

`POST /api/attachments/r2/package` still requires owner/producer authorization, CSRF/session checks, workspace scope, D1 object validation, R2 byte validation, a matching unexpired package plan token, and the 25 MB source-byte cap before it creates the package ZIP. After the package bytes are built and hashed, the Worker can honor a single standard `Range` header and return `206 Partial Content` with `Content-Range` and `Accept-Ranges`.

## Context

Package downloads can be larger than individual attachment previews. Supporting single-range responses gives clients a resumable-download path without exposing R2 keys, signed URLs, or arbitrary bucket access.

## Consequences

- Package ZIP range responses are capped at 5 MB per request.
- Multi-range, malformed, unsatisfiable, or over-cap ranges return `416`.
- `x-film-package-sha256` continues to refer to the full package ZIP, not the partial body.
- The Worker still builds and validates the full ZIP before returning a partial response; streaming ZIP assembly can be revisited later if package sizes grow.


---

<a id="0065-stored-attachment-export-pagination"></a>

Source: `docs/adr/0065-stored-attachment-export-pagination.md`

# ADR 0065: Stored Attachment Export Pagination

Date: 2026-07-08

## Status

Accepted

## Decision

Add bounded offset pagination to stored R2 attachment export manifests and package plans.

`POST /api/attachments/r2/export-manifest` and `POST /api/attachments/r2/export-package-dry-run` accept `offset` plus the existing bounded `limit`. Responses include `offset`, `nextOffset`, `truncated`, and the current page of D1-confirmed attachment rows. Package plans created from paginated requests bind only the returned page of object keys unless the browser submits an explicit selected object-key list.

## Context

The stored attachment export routes were capped to avoid unbounded D1 reads and Worker memory pressure. Without pagination, large workspaces would be permanently truncated and unable to safely export package pages.

## Consequences

- Each page remains bounded to at most 1,000 D1 rows.
- Package ZIP downloads still require a matching unexpired package plan token.
- Browser UI now reports the next page offset when a manifest or package plan is truncated.
- Cursor pagination can replace offset pagination later if large datasets need better performance.


---

<a id="0066-restore-commit-storage-dry-run-attempts"></a>

Source: `docs/adr/0066-restore-commit-storage-dry-run-attempts.md`

# ADR 0066: Restore Commit Storage Dry-Run Attempts

Date: 2026-07-08

## Status

Accepted

## Decision

Add durable, non-destructive restore commit storage attempts at `POST /api/restores/commit-storage-dry-run`.

The route requires owner/producer authorization, matching workspace IDs, bounded preview counts, the exact `RESTORE <workspaceId>` confirmation phrase, D1 approval storage, a verified stored R2 pre-restore backup proof, and an existing `restore_approvals` row with `approved_pending_commit` status and `destructive_write = 0`. The request preview, snapshot workspace, backup timestamp, and pre-restore backup ID must match the approval record before the Worker writes a `restore_commit_attempts` row.

Commit attempts have one status for now: `blocked_until_restore_apply`. They prove the approval handoff reached durable storage while keeping restore application disabled.

## Context

Film now has a restore preview, confirmation gate, pre-restore backup proof, and approval record. The next safe step is not to apply restored records, but to persist the final pre-application validation attempt so the future destructive restore endpoint has an explicit handoff contract to validate.

## Consequences

- `migrations/0009_restore_commit_attempts.sql` adds the `restore_commit_attempts` table.
- The web inspector shows `Check commit storage` after an approved pending-commit approval.
- The route returns `destructiveWrite: false` and `commitStatus: blocked_until_restore_apply`.
- Attempts persist only preview counts and warnings, approval metadata, proof ID, actor member ID, status, and timestamps.
- ADR 0070 adds a blocked application-preflight record with rollback guidance. Future restore application still needs per-table apply logic, conflict rechecks, and audited writes before destructive changes are allowed.


---

<a id="0067-restore-application-operation-samples"></a>

Source: `docs/adr/0067-restore-application-operation-samples.md`

# ADR 0067: Restore Application Operation Samples

Date: 2026-07-08

## Status

Accepted

## Decision

Extend the preview-only restore application plan with bounded per-record operation samples.

`summarizeRestorePreview` now reports `operationPolicy: preview_only`, `operationCount`, and up to eight `operationSamples`. Each sample identifies the record or planning row, the planned action (`create`, `update`, or `skip`), status, field-conflict count, and blocker text when the operation cannot be applied.

## Context

Film already reports aggregate restore application counts and per-record preview differences. Future per-item restore needs a more explicit operation contract, but destructive writes are still blocked. Operation samples let the app explain what would happen next without applying data or carrying full backup payloads into Worker dry-run calls.

## Consequences

- The restore preview panel shows application operation samples alongside aggregate create/update counts.
- Planning rows remain `skip` operations with per-table restore blockers.
- The plan still returns `destructiveWrite: false`, `canApply: false`, and `requiresWorkerCommit: true`.
- Future restore application can replace samples with a full, paginated, Worker-validated operation plan before enabling writes.


---

<a id="0068-google-drive-sync-dry-run-contract"></a>

Source: `docs/adr/0068-google-drive-sync-dry-run-contract.md`

# ADR 0068: Google Drive Sync Dry-Run Contract

Date: 2026-07-08

## Status

Accepted

## Decision

Add a Google Drive/Docs sync dry-run contract without OAuth credentials or live Google API calls.

`packages/providers` now exposes a Google Drive sync plan that describes required scopes, planned actions, blockers, and compliance notes. The Worker route `POST /api/providers/google/drive-sync-dry-run` requires owner/producer authorization, workspace scope, CSRF/session checks when auth storage is available, and a bounded optional Drive root folder ID. It returns only dry-run metadata and records an audit event when D1 is available.

## Context

Google Drive/Docs import/export/sync is a major product direction, but native Film documents remain canonical and browser-owned OAuth tokens would violate the trust boundary. The app needs a visible setup contract before adding Google OAuth, webhook channel validation, token refresh, or live file reads.

## Consequences

- The provider inspector can show `Plan Drive sync` for the Google dry-run provider.
- Planned actions include root-folder linking, Drive metadata import, Google Docs Markdown export, and optional Calendar event reads.
- Live reads remain blocked until OAuth app setup, Worker-owned token storage, Drive webhook validation, consent copy, and production routes are explicit.
- Browser backups, local mirrors, and Worker requests still contain no Google OAuth refresh tokens.


---

<a id="0069-screenplay-file-metadata-import"></a>

Source: `docs/adr/0069-screenplay-file-metadata-import.md`

# ADR 0069: Screenplay File Metadata Import

Date: 2026-07-08

## Status

Superseded by ADR 0227

## Decision

Add a local metadata-only screenplay file import for `.fountain`, `.fdx`, and `.gwx` files.

The importer preflights selected files with the same safe-path and size-bound posture as other local imports. Accepted files become asset document records on the selected project with source path, size, content type, and `metadata_only` attachment status. Film does not parse screenplay contents, upload bytes, or treat screenplay tooling as canonical in this slice.

## Context

The product plan names Grainery as the better screenplay-tooling integration target than rebuilding screenplay editing inside Film. Film still needs to track screenplay files in project docs and backups. A metadata-only import gives the workspace a linkable record without taking ownership of screenplay parsing, collaboration, or file storage.

## Consequences

- The app exposes `Import screenplay` in the Imports panel.
- Supported files create local document records and `document.created` operations.
- Raw screenplay bytes stay on the user's machine unless a later explicit attachment-storage flow is used.
- Future Grainery work can add file launch/export handoff, `.gwx` metadata reading, and safer attachment packaging after restore/export policies mature.


---

<a id="0070-restore-application-preflight-records"></a>

Source: `docs/adr/0070-restore-application-preflight-records.md`

# ADR 0070: Restore Application Preflight Records

Date: 2026-07-08

## Status

Accepted

## Decision

Add durable, non-destructive restore application preflight records at `POST /api/restores/application-dry-run`.

The route requires owner/producer authorization, matching workspace IDs, bounded preview counts, the exact `RESTORE <workspaceId>` confirmation phrase, D1 approval and commit-attempt storage, a verified stored R2 pre-restore backup proof, an existing `approved_pending_commit` approval row, and an existing `blocked_until_restore_apply` commit attempt. The request preview, snapshot workspace, backup timestamp, and pre-restore backup ID must match both stored records before the Worker writes a `restore_application_preflights` row.

Application preflights have one status for now: `blocked_until_restore_apply_implementation`. They persist rollback guidance, bounded non-authoritative table-plan metadata, preview JSON, proof IDs, actor member ID, and `destructive_write = 0`.

## Context

Film now has a restore preview, confirmation gate, pre-restore backup proof, approval record, and commit-storage attempt. The next conservative step is to prove the final pre-application contract and rollback metadata without mutating any Film records.

## Consequences

- `migrations/0010_restore_application_preflights.sql` adds the `restore_application_preflights` table.
- The web inspector shows `Check application preflight` after a blocked commit-storage attempt exists.
- The route returns `destructiveWrite: false` and `commitStatus: blocked_until_restore_apply_implementation`.
- The route validates table-plan metadata for row count, table names, entity types, count consistency, restore support, and bounded blockers before storing it in rollback guidance.
- The route records a D1 audit event when D1 auth/session storage is available.
- Future destructive restore application must still rerun conflict checks, apply rows per table, write per-table audit events, and use the stored pre-restore backup for rollback.


---

<a id="0071-restore-application-table-plan"></a>

Source: `docs/adr/0071-restore-application-table-plan.md`

# ADR 0071: Restore Application Table Plan

Date: 2026-07-08

## Status

Accepted

## Decision

Extend encrypted backup restore previews with a table-level application plan.

The plan groups preview records by their future storage target, including workspace snapshot tables (`workspaces`, `projects`, `tasks`, `documents`, `people`, `equipment`, and `expenses`) and D1 planning export tables (`locations`, `opportunities`, `meeting_notes`, `equipment_requests`, `shows`, `merch_items`, `media_items`, and `production_roles`). Each row reports operation counts, create/update/skip/preview-only counts, field conflict counts, restore support, and blockers.

## Context

Operation samples are useful for inspection, but destructive restore work needs table-level planning before it can safely implement per-table conflict rechecks and apply code. The application-preflight route now persists proof and rollback guidance, but it does not yet receive a table plan. Adding the plan to the browser-side encrypted preview gives the UI and tests a stable contract without enabling destructive writes.

## Consequences

- `packages/backup` exposes `RestoreApplicationTablePlan` inside `RestoreApplicationPlan`.
- The web restore preview shows a compact `Application table plan` summary.
- Planning rows remain preview-only and workspace snapshot rows remain blocked until Worker-owned per-table restore application exists.
- ADR 0070 stores this shape as bounded, non-authoritative rollback-guidance metadata in application preflight records.
- Future Worker restore apply endpoints can use this shape as the basis for server-side table validation, but must recompute it server-side from trusted backup contents before mutating records.


---

<a id="0072-notion-planning-commit-table-summary"></a>

Source: `docs/adr/0072-notion-planning-commit-table-summary.md`

# ADR 0072: Notion Planning Commit Table Summary

Date: 2026-07-08

## Status

Accepted

## Decision

Return a per-table summary from `POST /api/imports/notion/planning/commit`.

The summary groups accepted, committed, idempotent, update-preview, and valid-kind rejected planning rows by their target D1 planning table. The web import inspector renders a compact `Planning D1 tables` line with committed/idempotent/update-preview/rejected counts per table.

## Context

The planning import route already writes deterministic, idempotent D1 rows for first-class production-planning tables. The UI only showed aggregate committed/idempotent/rejected counts, which made it hard to see whether a Notion export touched locations, opportunities, roles, or another planning table. A table summary improves operator review without adding update writes.

## Consequences

- Worker responses include `tableSummary` rows with kind, table name, accepted count, committed count, idempotent count, update-preview count, and rejected count.
- Audit metadata includes the same table summary.
- Existing idempotent behavior remains unchanged; repeated rows are still not updated.
- Rich changed-row previews and safe update writes remain future work.


---

<a id="0073-notion-planning-update-previews"></a>

Source: `docs/adr/0073-notion-planning-update-previews.md`

# ADR 0073: Notion Planning Update Previews

Date: 2026-07-08

## Status

Accepted

## Decision

Classify changed existing Notion planning rows as `updatePreview` in `POST /api/imports/notion/planning/commit`.

When a normalized planning import row maps to an existing deterministic D1 row ID, the Worker now compares a table-specific persisted signature to the incoming normalized row. Exact matches remain `idempotent`. Differences are returned in `updatePreview`, counted in `tableSummary`, and described with bounded field-level `updatePreviewDetails`, but the Worker does not update the D1 row.

## Context

The planning import route already used deterministic row IDs and `INSERT OR IGNORE`, which made repeated imports safe. The tradeoff was that changed rows looked idempotent, hiding what would need to be updated later. Update previews improve operator visibility before real planning update writes exist.

## Consequences

- Existing rows with changed projected fields are reported as `updatePreview`.
- Update previews include up to 20 changed rows and up to 8 field changes per row.
- D1 rows are not modified by update previews.
- The web import inspector shows aggregate update-preview counts.
- Future work still needs explicit update approval, conflict handling, per-field diffs, and audited D1 update writes.


---

<a id="0074-restore-planning-dry-run-previews"></a>

Source: `docs/adr/0074-restore-planning-dry-run-previews.md`

# ADR 0074: Restore Planning Dry-Run Previews

Date: 2026-07-08

## Status

Accepted

## Decision

Add `POST /api/restores/planning-dry-run` as a Worker-owned, preview-only restore check for D1 production-planning rows carried inside encrypted backups.

The route accepts backup planning records after a browser has decrypted a backup locally. It requires owner/producer authorization when D1 auth is available, rejects snapshot workspace mismatches, validates bounded planning record payloads, compares accepted rows with existing D1 planning tables, and classifies each row as `createPreview`, `idempotent`, or `updatePreview`. Rejected rows are reported with bounded reasons. When D1 is available, the route stores a `restore_planning_previews` row with count-level metadata, table summaries, rejected indexes/reasons, and update field keys. It records an audit event when D1 audit storage is available and never writes restored planning rows.

## Context

Encrypted backups already include D1 planning export records, and restore previews can show per-kind and per-table coverage. Operators still need a Worker-side check against current D1 state before committing planning restores. This gives the UI a server-owned preflight without introducing destructive restore behavior. ADR 0082 later adds the gated planning commit endpoint.

## Consequences

- Backup planning rows remain in browser memory after decryption and are not persisted locally as restored data.
- The web UI exposes `Check planning restore` when a preview includes planning rows.
- The Worker returns per-table create/idempotent/update/rejected counts and bounded field-level update-preview details.
- D1 stores durable restore planning preview proof without current/incoming field values.
- Invalid backup planning records produce preview rejections instead of partial writes.
- Future work still needs explicit per-table restore commit endpoints, conflict rechecks from trusted backup contents, and audited D1 create/update writes.


---

<a id="0075-canonical-replay-department-scope"></a>

Source: `docs/adr/0075-canonical-replay-department-scope.md`

# ADR 0075: Canonical Replay Department Scope

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0084 and ADR 0108.

## Decision

Strengthen Worker operation replay authorization for canonical D1 creates.

Owner, producer, and director sessions keep the operator path for project, task, and document creates. Contributor and department-lead sessions still need an active `project_memberships` row before task or document creates can be applied to canonical D1 tables. Department leads now need a matching operation `department` value when their project membership has a department. Scoped non-operator members cannot create canonical records marked `sensitive: true`. ADR 0084 later adds explicit project `record_permissions` write/admin grants as an alternate scoped signal. ADR 0108 later adds core owner metadata as another scoped signal.

The operation sync response now reports `recordAuthorizationPolicy: canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available`.

## Context

The first replay guard only checked that contributors and department leads had project membership before applying task/document creates. Film production teams need department-limited collaboration before broader live collaboration and destructive restore paths ship. This adds a small, testable permission layer without introducing a full ACL system or changing browser-local behavior.

## Consequences

- Department-lead replay with missing or mismatched department is rejected before operation-log persistence.
- Contributor replay with a mismatched explicit department is rejected.
- Sensitive canonical records require an operator role.
- Operator-created sensitive documents persist `sensitive = 1`.
- Future work still needs department metadata on more canonical tables, ownership transfer, and review/approval workflows beyond the current project-level membership, owner metadata, and record-permission guard.


---

<a id="0076-document-body-backup-payloads"></a>

Source: `docs/adr/0076-document-body-backup-payloads.md`

# ADR 0076: Document Body Backup Payloads

Date: 2026-07-08

## Status

Accepted

## Decision

Split native Markdown document body snapshots out of the encrypted workspace snapshot and into a separate encrypted ZIP payload at `payload/document-bodies.enc`.

## Context

Film's ZIP backup container was designed to grow beyond one opaque encrypted workspace JSON file. Native documents are canonical app data, and imported Notion Markdown pages already store local `markdownSnapshot` content. Keeping document bodies addressable as their own encrypted payload makes future document restore, Google Docs sync, and body-specific validation easier without exposing document text in the plaintext manifest.

## Consequences

- New `.filmbackup.zip` exports remove `markdownSnapshot` values from the encrypted workspace snapshot payload and store them in an encrypted `film.document-bodies` payload.
- The plaintext manifest records only the document-body payload path and count. It does not include document names, document text, project titles, or body snippets.
- ZIP decrypt rehydrates document bodies into the returned `BackupSnapshot`, so existing restore preview code keeps working.
- Legacy `.filmbackup.json` bundles and older ZIP backups without a document-body payload remain readable.
- Malformed document-body payloads are rejected when they do not match the workspace snapshot, exceed bounded counts/sizes, or reference unknown documents.


---

<a id="0077-attachment-restore-policy-payloads"></a>

Source: `docs/adr/0077-attachment-restore-policy-payloads.md`

# ADR 0077: Attachment Restore Policy Payloads

Date: 2026-07-08

## Status

Accepted

## Decision

Add a separate encrypted attachment restore-policy payload to `.filmbackup.zip` exports when the backup contains attachment metadata.

## Context

Attachment bytes intentionally stay out of workspace JSON, operation payloads, and backup snapshots. Film still needs future restore tooling to reason about which attachment records exist, what metadata is available, and why restore remains blocked without an explicit byte package. Keeping that policy in its own encrypted payload lets restore packaging evolve without placing attachment paths or object keys in the plaintext manifest.

## Consequences

- Backups with attachment metadata now include `payload/attachment-restore-policy.enc`.
- The plaintext manifest records only the policy payload path and attachment count. Source paths, object keys, hashes, names, and byte metadata remain encrypted.
- ZIP decrypt validates that the attachment restore-policy payload matches the decrypted snapshot attachment manifest.
- The policy remains `metadata_only`; it does not include attachment bytes and does not enable destructive attachment restore.
- Legacy backups without this payload remain readable.


---

<a id="0078-restore-attachment-package-plan"></a>

Source: `docs/adr/0078-restore-attachment-package-plan.md`

# ADR 0078: Restore Attachment Package Plan

Date: 2026-07-08

## Status

Accepted

## Decision

Add a structured attachment package plan to encrypted backup restore previews.

## Context

Attachment bytes are intentionally excluded from workspace snapshots and backup payloads. Restore previews already warned that attachment bytes are metadata-only, but future restore application needs more than a warning: it needs a stable contract for attachment metadata counts, source-byte totals, stored-R2 coverage, and blockers before any byte restore can be enabled.

## Consequences

- `summarizeRestorePreview` now includes `applicationPlan.attachmentPackagePlan`.
- The plan reports metadata record count, staged-local count, R2 dry-run count, stored-R2 count, total source bytes, package requirement, and byte-restore support.
- The web restore preview displays the attachment package requirement when a backup includes attachment metadata.
- The plan remains non-destructive. Byte restore is blocked until a verified attachment package and destination write rules exist.


---

<a id="0079-restore-attachment-package-preflights"></a>

Source: `docs/adr/0079-restore-attachment-package-preflights.md`

# ADR 0079: Restore Attachment Package Preflights

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0085.

## Decision

Add a Worker-owned attachment restore package preflight at `POST /api/restores/attachment-package-dry-run`.

## Context

Encrypted backup previews now produce a structured attachment package plan, but byte restore still needs a Worker boundary before any package verification or destination writes can exist. The conservative step is to validate the package plan under owner/producer authorization and persist non-destructive proof that attachment byte restore remains blocked.

## Consequences

- The route requires owner/producer auth, workspace scope, matching snapshot workspace, valid backup timestamp metadata, and bounded attachment package-plan counts.
- D1 stores `restore_attachment_package_preflights` rows with metadata counts, source-byte totals, status, and `destructive_write = 0`.
- The route records a D1 audit event when audit storage is available.
- The web restore preview exposes `Check attachment package` when a backup includes attachment metadata.
- No attachment bytes are accepted, uploaded, copied, restored, or written by this route. ADR 0085 adds a follow-on package manifest/hash verification dry-run that remains non-destructive.


---

<a id="0080-native-markdown-draft-editor"></a>

Source: `docs/adr/0080-native-markdown-draft-editor.md`

# 0080 - Native Markdown Draft Editor

## Status

Accepted. Extended by ADR 0088.

## Context

Film needs a usable native document path before deeper provider integrations. Markdown drafts already exist in the local workspace model and encrypted backups now split document bodies into a separate encrypted ZIP payload, but the UI only created document records.

## Decision

Add a local Markdown editor to the Docs panel. Selecting a Markdown document shows its current `markdownSnapshot`; saving updates the browser workspace state, records an audit event, and queues a `document.updated` operation.

`document.updated` is a metadata-only Worker replay operation. Browser sync sends bounded metadata such as project ID, document name, and Markdown length, but not body text or body snippets. The Worker stores those update operations in `operation_log`, treats repeated update operations for the same document as valid metadata history, and does not apply them to canonical document body storage yet.

Scoped contributor and department-lead document update metadata must pass the same project-membership or explicit project record-permission guard, including department scope, used for canonical task/document creates when D1 auth storage is available. ADR 0088 later adds explicit document record permissions as an alternate metadata-only document-update signal.

## Consequences

- The first document editor is usable without choosing a heavier UI framework.
- Markdown body text remains local and recoverable through encrypted backups rather than Worker operation payloads.
- D1 operation replay can track draft-save metadata without same-entity create conflict rejection.
- Future slices still need durable collaborative document bodies, richer editing, and broader record-level permission checks before server-side document updates become authoritative.


---

<a id="0081-core-restore-application-commits"></a>

Source: `docs/adr/0081-core-restore-application-commits.md`

# 0081 - Core Restore Application Commits

## Status

Accepted. Extended by ADR 0083.

## Context

Restore safety already had preview, approval, commit-storage, and application-preflight gates, but no Worker-owned path could apply restored records. Applying the whole backup domain at once would be too broad because planning rows, attachment bytes, people, equipment, expenses, and workspace metadata need table-specific policy and rollback semantics.

## Decision

Add a narrow Worker endpoint, `POST /api/restores/application-commit`, for core workspace snapshot records only: projects, tasks, and documents.

The endpoint requires owner/producer auth, CSRF/session validation, exact `RESTORE <workspaceId>` confirmation, a matching approved restore approval, a matching blocked commit attempt, a matching blocked application preflight, verified stored R2 pre-restore backup proof, bounded core-record payloads, preview count consistency, and fresh D1 target/project conflict checks before writing. Successful commits upsert only project/task/document D1 rows and write a durable `restore_application_commits` record with `destructive_write = 1`.

The web client exposes this endpoint only after a decrypted preview, approval, commit-storage check, and application preflight. The browser keeps the decrypted snapshot in memory, derives bounded project/task/document records, prompts for the exact confirmation phrase again, and leaves the generic `Restore` action as a local dry run.

## Consequences

- Film now has a first real destructive restore path, but it is intentionally limited and auditable.
- Existing preview, approval, preflight, and pre-restore backup gates remain required for every commit.
- Planning rows and attachment bytes stay on their separate non-destructive preview/preflight paths.
- ADR 0083 extends this endpoint to workspace metadata, people, equipment, and expenses with the same gates.


---

<a id="0082-planning-restore-commits"></a>

Source: `docs/adr/0082-planning-restore-commits.md`

# 0082 - Planning Restore Commits

## Status

Accepted.

## Context

Encrypted backups can include D1 production-planning rows, and `POST /api/restores/planning-dry-run` can classify those rows as create, idempotent, update-preview, or rejected without writing restored data. Operators still need a Worker-owned destructive path for planning rows, but it must not bypass restore approval, pre-restore backup proof, or stale-preview checks.

## Decision

Add `POST /api/restores/planning-commit` for first-class D1 planning tables: locations, opportunities, meeting notes, equipment requests, shows, merch items, media items, and production roles.

The endpoint requires owner/producer auth, CSRF/session validation, exact `RESTORE <workspaceId>` confirmation, a matching approved restore approval, matching blocked commit attempt, matching blocked application preflight, verified stored R2 pre-restore backup proof, a matching durable `restore_planning_previews` row, bounded planning records, zero rejected records, and a fresh preview recheck that matches the stored planning preview counts/table summaries. Successful commits upsert only planning rows and write `restore_planning_commits` with `destructive_write = 1`.

## Consequences

- Planning rows now have a real destructive restore path separate from the workspace snapshot commit endpoint.
- Stale planning previews are rejected before any planning rows are written.
- Attachment bytes remain separate restore work.
- The web client exposes planning apply only after planning preview and application preflight, and the preview panel now includes a scrollable row-by-row review table before apply.


---

<a id="0083-workspace-snapshot-restore-commits"></a>

Source: `docs/adr/0083-workspace-snapshot-restore-commits.md`

# 0083 - Workspace Snapshot Restore Commits

## Status

Accepted.

## Context

ADR 0081 added the first destructive restore application path, but it was limited to projects, tasks, and documents. Backup previews already classify workspace metadata, people, equipment, and expenses as workspace snapshot records, so leaving them outside the commit path made the visible restore action incomplete for the local app model.

## Decision

Extend `POST /api/restores/application-commit` to accept bounded workspace snapshot records for workspace metadata, projects, tasks, documents, people, equipment, and expenses.

The endpoint keeps the same owner/producer authorization, CSRF/session validation, exact `RESTORE <workspaceId>` confirmation, approved restore approval, blocked commit attempt, blocked application preflight, verified pre-restore backup proof, preview-count validation, and fresh conflict rechecks from ADR 0081. Workspace metadata writes update the `workspaces` row and upsert `workspace_restore_metadata`; people writes upsert `people` plus `project_people`; equipment and expenses write their first-class D1 tables.

The web client now exposes this as `Apply snapshot records` after decrypted preview, approval, commit-storage check, and application preflight. The decrypted snapshot remains in browser memory and only bounded restore records are sent to the Worker.

## Consequences

- Workspace metadata, people, equipment, and expenses have a destructive restore path under the same gates as project/task/document records.
- Attachment bytes remain outside application commits until package verification and destination write rules exist.
- Planning rows remain on the separate planning preview and planning commit path.
- The web client shows a row-by-row review table before apply so operators can inspect exact snapshot records and actions.


---

<a id="0084-record-permission-replay-guard"></a>

Source: `docs/adr/0084-record-permission-replay-guard.md`

# 0084 - Record Permission Replay Guard

## Status

Accepted. Extended by ADR 0088, ADR 0090, ADR 0105, and ADR 0108.

## Context

ADR 0075 made contributor and department-lead canonical replay depend on project memberships and department scope. That was a useful first collaboration guard, but production teams also need explicit record-level grants that are not the same as crew assignment. The next conservative step is to persist a bounded `record_permissions` table and use project-scoped write/admin grants as an alternate authorization signal before broader ACL management exists.

## Decision

Add a D1/SQLite `record_permissions` table with workspace, entity type, entity ID, member ID, permission level, optional department, and optional expiry fields.

Add `POST /api/records/permissions/assign-dry-run` as a Worker-owned route for owner/producer assignment of permissions to active members in the same workspace. The route requires CSRF/session authorization when D1 auth storage is available, rejects disabled or invited members, and upserts durable permission rows when D1 is available. Without D1 it remains a memoryless dry run. The Team inspector exposes a compact selected-project permission form that calls this route for active members.

Extend canonical operation replay so contributor and department-lead task/document creates and metadata-only document updates may proceed when the session member has either a matching `project_memberships` row or an unexpired project `record_permissions` write/admin grant. ADR 0088 later adds explicit document record permissions for metadata-only `document.updated` replay. ADR 0090 later allows exact task/document record permissions for direct canonical creates. ADR 0105 later extends the same guard shape to equipment creates while keeping person/expense replay operator-only. ADR 0108 later adds core owner metadata as another authorization signal. Department-scoped permissions must match the operation department; scoped non-operator sensitive records still require owner/producer/director replay.

## Consequences

- Film now has a durable permission table, Worker-owned assignment route, and visible selected-project permission control before broader collaboration UI is expanded.
- Canonical replay reports `recordAuthorizationPolicy: canonical_create_project_membership_record_permission_or_owner_department_scope_when_d1_available`.
- The first record-permission enforcement is intentionally project-scoped, then extended to metadata-only document update replay in ADR 0088, exact task/document create grants in ADR 0090, equipment create replay in ADR 0105, and core owner metadata in ADR 0108; ownership transfer, person/expense collaboration, and reviewer/comment semantics remain future work.
- Production invite delivery and user-facing permission management remain separate slices.


---

<a id="0085-restore-attachment-package-verification"></a>

Source: `docs/adr/0085-restore-attachment-package-verification.md`

# 0085 - Restore Attachment Package Verification

## Status

Accepted. Extended by ADR 0086.

## Context

ADR 0079 added a restore attachment-package preflight that records package-plan blockers without accepting bytes. The next conservative step before destructive attachment restore is to verify package manifest metadata and hashes against a prior preflight while still avoiding byte writes and destination mutation.

## Decision

Add `POST /api/restores/attachment-package-verify-dry-run`.

The route requires owner/producer auth, CSRF/session validation when D1 auth storage is available, workspace scope, matching snapshot workspace, a valid prior `restore_attachment_package_preflights` row when D1 is available, a bounded attachment package plan, a bounded `film.attachment-package` manifest, safe package paths, workspace-prefixed attachment object keys, valid SHA-256 hashes, and manifest object-count/source-byte totals that match the restore package plan.

Successful verification persists `restore_attachment_package_verifications` with package and manifest hashes, bounded manifest JSON, `status = verified_until_destination_rules`, and `destructive_write = 0`. The response keeps `canRestoreBytes: false` and reports that destination write rules are still required.

## Consequences

- Attachment package metadata can be verified under the restore safety chain without accepting raw attachment bytes.
- The web app can parse downloaded package `manifest.json` locally and submit the manifest metadata plus package hash to this dry-run route after package preflight.
- Stale, mismatched, unsafe, or oversized manifests fail before any durable verification record is written.
- Destructive attachment byte restore remains blocked until destination object mapping, overwrite policy, and write rules are explicit. ADR 0086 adds blocked object-level restore planning without byte writes.


---

<a id="0086-restore-attachment-object-plans"></a>

Source: `docs/adr/0086-restore-attachment-object-plans.md`

# 0086 - Restore Attachment Object Plans

## Status

Accepted.

## Context

ADR 0085 verifies attachment package manifest metadata and hashes, but it still does not decide where bytes would be written during restore. Film needs object-level planning before any destructive attachment restore route can exist, and that plan must remain non-destructive until overwrite and destination rules are explicit.

## Decision

Add `POST /api/restores/attachment-objects-plan-dry-run`.

The route requires owner/producer auth, CSRF/session validation when D1 auth storage is available, workspace scope, a matching `restore_attachment_package_verifications` row when D1 is available, package and manifest hashes, and a bounded package manifest. It creates deterministic destination object-key candidates for each package object, marks every object `blocked_destination_write_rules`, and persists `restore_attachment_object_plans` with `destructive_write = 0`.

## Consequences

- Attachment restore now has a durable per-object plan after package verification.
- The plan can be reviewed by the web app or future restore workers without accepting raw bytes.
- No object is restorable yet; destination write rules, overwrite policy, and byte-source validation remain future destructive work.


---

<a id="0087-invite-delivery-outbox-dry-run"></a>

Source: `docs/adr/0087-invite-delivery-outbox-dry-run.md`

# 0087 - Invite Delivery Outbox Dry Run

## Status

Accepted.

## Context

Workspace invite creation already stores only hashed invite targets and token hashes, but the response still reported `delivery: not_sent`. Live Resend delivery requires sender domain, templates, suppression handling, public routes, abuse controls, and provider credentials. Film can still add the durable handoff point now without sending email.

## Decision

Add `invite_delivery_attempts` as a hash-only dry-run delivery outbox table.

When `POST /api/invites/create-dry-run` creates a workspace invite, the Worker records a `resend`/`email` outbox attempt with `target_hash`, `template_key = workspace_invite`, `delivery_mode = dry_run_outbox`, and `status = queued_dry_run`. The route returns `delivery: queued_dry_run`, `deliveryPersistence`, and outbox metadata, but still returns the development-only invite token only in the immediate response.

## Consequences

- Invite delivery now has a durable Worker-owned handoff record without live provider calls.
- Raw invite email addresses are still not stored in D1, audit metadata, local mirror, operation log, or backups.
- Live delivery remains blocked until provider configuration, sender identity, templates, suppression/abuse controls, and public route decisions are explicit.


---

<a id="0088-document-record-permission-replay"></a>

Source: `docs/adr/0088-document-record-permission-replay.md`

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


---

<a id="0089-selected-document-permission-ui"></a>

Source: `docs/adr/0089-selected-document-permission-ui.md`

# 0089 - Selected Document Permission UI

## Status

Accepted. Extended by ADR 0096 and ADR 0102.

## Context

ADR 0088 let the Worker authorize metadata-only `document.updated` replay with an explicit document `record_permissions` write/admin grant. The Team inspector could assign project memberships and selected-project permissions, but it did not expose a way to create the document grants that the Worker now honors.

## Decision

Add a selected-document permission form to the Team inspector. It uses the current selected document, active workspace members, the same permission levels as project grants, optional department scope, optional expiry, and the existing Worker-owned `POST /api/records/permissions/assign-dry-run` route with `entityType: "document"`.

Project and document permission form state stay separate so granting one scope does not overwrite the visible status for the other. The UI remains a dry-run/Worker-owned assignment path and does not make document body storage authoritative.

## Consequences

- Owners and producers can create the document-level permission rows needed for metadata-only document update replay without granting project-wide write access.
- The first document permission UI is scoped to the currently selected document; broader permission management and review/comment semantics remain future work.
- ADR 0096 adds protected project/document permission manifest review for owner/producer sessions.
- ADR 0102 adds selected-task permission management using the same Worker-owned record-permission routes.


---

<a id="0090-direct-record-permission-create-replay"></a>

Source: `docs/adr/0090-direct-record-permission-create-replay.md`

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


---

<a id="0091-invite-delivery-readiness"></a>

Source: `docs/adr/0091-invite-delivery-readiness.md`

# 0091 - Invite Delivery Readiness

## Status

Accepted. Extended by ADR 0106.

## Context

ADR 0087 added a hash-only Resend dry-run outbox attempt when workspace invites are created. That proved the invite delivery boundary without sending email, but the UI still could not show what blocks live delivery.

Live email sending needs explicit production origin, sender, API secret, webhook signature validation, bounce/suppression handling, audit policy, and abuse controls. Until those are configured, the Worker should expose readiness metadata without reading or returning secret values and without sending messages.

## Decision

Add protected `POST /api/invites/delivery-readiness` for owner/producer sessions. The route checks workspace scope and returns a Resend email readiness contract:

- dry-run outbox availability
- whether the Resend API key, invite sender, invite app origin, webhook secret, and production origin are configured
- missing configuration blockers by variable name only
- compliance notes for webhook, bounce, suppression, abuse, and audit policy

The web Team inspector adds `Check invite delivery`, renders the readiness result, and keeps invite creation unchanged. ADR 0106 later adds the explicitly gated live Resend adapter; the readiness route still exposes no raw secrets.

## Consequences

- Users can see why invite delivery is still dry-run without relying on deployment logs or hidden env state.
- The Worker has a stable handoff contract for a future live Resend adapter.
- Actual sending remains blocked until production route/origin decisions, sender/domain setup, webhook validation, suppression handling, abuse controls, and redacted audit policy are explicit.


---

<a id="0092-stripe-summary-readiness"></a>

Source: `docs/adr/0092-stripe-summary-readiness.md`

# 0092 - Stripe Summary Readiness

## Status

Accepted. Extended by ADR 0094 and ADR 0107.

## Context

Film treats Stripe as an MVP provider, but direct Stripe reads are intentionally blocked. Payment data is high-risk, and Film should first consume summary-only aggregates through Pool/Store boundaries instead of introducing raw payment, card, payment-method, or unrestricted customer data.

The existing Stripe provider dry run states this policy, but the app needs a concrete readiness contract that shows what configuration remains missing before a future summary adapter can exist.

## Decision

Add protected `POST /api/providers/stripe/summary-readiness` for owner/producer sessions. The route checks workspace scope and returns a summary-only readiness contract:

- Pool summary adapter URL configured
- Store summary adapter URL configured
- project mapping configuration present
- Stripe webhook secret configured
- redacted audit logging enabled
- direct Stripe reads remain blocked
- live summary reads remain blocked until ADR 0107's explicit adapter route gates are satisfied

The web provider panel adds `Check Stripe summaries` when the Stripe dry run is selected and renders the readiness result. The route does not call Stripe, does not read browser credentials, and returns only configuration booleans and blocker labels.

## Consequences

- Stripe MVP work can advance through adapter readiness without weakening the summary-only boundary.
- Direct Stripe API reads and secrets remain out of browser code.
- ADR 0094 adds bounded D1 audit metadata for readiness checks without changing the no-live-read policy.
- ADR 0107 adds the Film-side live adapter route while Pool/Store still need production adapter endpoint definitions, webhook verification, redacted audit events, and production resources.


---

<a id="0093-provider-readiness-deploy-report"></a>

Source: `docs/adr/0093-provider-readiness-deploy-report.md`

# 0093 - Provider Readiness Deploy Report

## Status

Accepted.

## Context

ADR 0091 added invite-delivery readiness, and ADR 0092 added Stripe summary-readiness. Both routes expose live-provider blockers safely at runtime, but `npm run check:deploy` still only reported route and origin blockers.

Before public deployment, Film needs one command that makes live-provider blockers visible without committing secrets or printing secret values.

## Decision

Extend `scripts/check-deployment-readiness.mjs` to read expected live-provider configuration from `wrangler.toml` vars or the current process environment and report blockers by name only.

The report now covers:

- production Worker route/custom domain
- production app origins, including exact http(s) origin shape
- invite live-delivery configuration: `RESEND_API_KEY`, `INVITE_FROM_EMAIL`, `INVITE_APP_ORIGIN`, `INVITE_DELIVERY_WEBHOOK_SECRET`
- Stripe summary-readiness configuration: `POOL_STRIPE_SUMMARY_ADAPTER_URL`, `STORE_STRIPE_SUMMARY_ADAPTER_URL`, `STRIPE_PROJECT_MAPPINGS`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_REDACTED_AUDIT=true`, `STRIPE_SUMMARY_ADAPTER_SECRET`, `STRIPE_SUMMARY_MODE=live`

Follow-up hardening validates that Pool/Store adapter URLs are production HTTPS `/film/stripe-summary` endpoints, that mappings contain at least one safe Pool/Store ref instead of a placeholder string, and that Film's `STRIPE_SUMMARY_ADAPTER_SECRET` is configured separately from the companion Workers' `FILM_STRIPE_SUMMARY_ADAPTER_SECRET` naming convention.

Non-strict mode remains advisory and exits successfully for local development. Strict mode fails on unresolved blockers.

## Consequences

- Provider-live prerequisites and obvious shape mistakes are visible in deployment checks without exposing secret values.
- Secrets can still be supplied out of band through environment/secret bindings.
- Local development remains unblocked while production readiness remains explicit.


---

<a id="0094-provider-import-sync-audit-events"></a>

Source: `docs/adr/0094-provider-import-sync-audit-events.md`

# ADR 0094: Provider Import Sync Audit Events

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0095.

## Context

ADR 0042 introduced Worker safety audit events for backup and restore paths. Provider dry runs, Notion import preflights, Stripe readiness checks, and operation sync replay are also trust-boundary routes, but they still returned useful results without recording D1 audit metadata.

Those routes must not persist provider secrets, OAuth values, raw import filenames, document bodies, email addresses, or operation payloads. The useful MVP audit signal is that an authenticated member checked a boundary and which bounded counts or policy statuses were returned.

## Decision

Record best-effort D1 `audit_events` for:

- provider dry-run preflights
- Stripe summary-readiness checks
- Notion import manifest preflights
- operation sync replay checks

Each route returns `auditPersistence` alongside its existing dry-run result. Metadata is limited to provider/status fields, configuration booleans, counts, policy names, and replay outcome counts.

The web provider panel now renders audit persistence for provider dry-run and Stripe readiness cards. Operation sync records the audit persistence in the local audit log entry after accepted replay.

## Consequences

- Live-provider readiness has an auditable dry-run handoff before credentials are configured.
- Notion import preflight audits can prove a manifest was checked without storing raw source paths.
- Operation sync audits can prove replay outcomes without storing operation payloads outside the existing operation-log path.
- Audit writes remain best-effort; local/no-D1 development still reports `dry_run_memoryless`.
- ADR 0095 adds a protected metadata-keys-only manifest for inspecting recent Worker audit events.


---

<a id="0095-audit-event-manifest"></a>

Source: `docs/adr/0095-audit-event-manifest.md`

# ADR 0095: Audit Event Manifest

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0101.

## Context

ADR 0094 broadens Worker audit event writes across provider, import, and sync boundaries. Those events are useful only if operators can inspect that they exist, but raw audit metadata can include internal object keys, hashes, counts, and policy details that should not be exposed casually in the browser.

Film needs a conservative audit read path before live integrations and deeper collaboration, without turning audit export into a secret or payload leak.

## Decision

Add protected `POST /api/audit-events/export-dry-run` for owner/producer sessions. The route checks workspace scope, reads a bounded set of recent D1 `audit_events`, and returns an `audit_event_manifest_only` response containing:

- event ID
- action
- project ID
- actor member ID
- timestamp
- metadata key names
- metadata key count

The route does not return raw `metadata_json` values. It records a separate `audit.export_manifest_created` event after reading the manifest and returns `auditPersistence`.

The Activity tab adds `Worker audit`, which requests the manifest and renders recent actions plus metadata keys.

## Consequences

- Owner/producer users can verify Worker audit coverage from the app.
- Audit event inspection remains bounded and metadata-keys-only.
- Full audit export, retention tooling, and privileged audit search remain future work.


---

<a id="0096-record-permission-manifests"></a>

Source: `docs/adr/0096-record-permission-manifests.md`

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


---

<a id="0097-workspace-member-status-management"></a>

Source: `docs/adr/0097-workspace-member-status-management.md`

# ADR 0097: Workspace Member Status Management

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0048 added D1-backed member status checks so invited or disabled members cannot authenticate or use protected Worker routes. The Team panel could invite and grant access, but owners/producers had no app path for disabling a member after access was no longer appropriate or reactivating a disabled member.

Member lifecycle management needs to stay in the Worker because it affects authorization, session validity, and audit history.

## Decision

Add protected `POST /api/members/status/dry-run` for owner/producer sessions. The route:

- validates workspace scope, target member ID, and target status
- supports only `active` and `disabled` management states
- rejects self-disable
- requires an owner actor to update an owner target
- upserts `workspace_member_statuses`
- revokes target D1 sessions when the target is disabled
- records bounded audit metadata with member ID, role, status, persistence, and session-revocation policy

The Team panel adds an `Update member status` control next to the roster. Disabled members remain visible in the roster, but active-member-only project assignment and record-permission grant selects exclude them.

## Consequences

- Owners/producers can disable or reactivate members without exposing raw emails or invite tokens.
- Disabled members lose protected-route access immediately because auth checks the status table, and D1 sessions are explicitly revoked on disable.
- The route intentionally does not manage the `invited` state; invites remain controlled by invite create/accept flows.
- Deeper member history, reason capture, ownership transfer, and irreversible account removal remain future work.


---

<a id="0098-record-permission-revocation"></a>

Source: `docs/adr/0098-record-permission-revocation.md`

# ADR 0098: Record Permission Revocation

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0096 added protected project and document permission manifests. Owners/producers could review current explicit grants, but they still needed a Worker-owned path to remove stale or over-broad grants.

Revocation changes collaboration authorization, so it must live behind the same session, role, workspace, and audit boundaries as assignment.

## Decision

Add protected `POST /api/records/permissions/revoke-dry-run` for owner/producer sessions. The route validates workspace scope and requires the manifest row's:

- permission ID
- entity type
- entity ID
- member ID
- permission level

With D1 available, the Worker first reads a row matching every supplied field, then deletes with the same exact-match predicate. Mismatched or stale requests return `record_permission_not_found`. Successful revokes record bounded audit metadata and return `revokePolicy: "exact_permission_match_only"`.

The Team panel renders `Revoke` actions beside permission manifest rows. After a successful revoke, the browser removes the grant from the visible manifest and updates the count.

## Consequences

- Owners/producers can remove project/document grants without direct D1 access.
- Stale browser state cannot delete a different grant because every visible manifest field must still match.
- Revocation removes future authorization based on that explicit grant; it does not remove project memberships, historical audit events, or local browser operation history.
- Permission history, undo, bulk revocation, and grant-expiry automation remain future work.


---

<a id="0099-project-membership-manifest-removal"></a>

Source: `docs/adr/0099-project-membership-manifest-removal.md`

# ADR 0099: Project Membership Manifest And Removal

Date: 2026-07-08

## Status

Accepted.

## Context

ADR 0051 added project membership assignment. Those rows are durable collaboration signals for contributor and department-lead operation replay, but owners/producers could not review or remove them from the app.

Because project memberships affect authorization, review and removal need to stay Worker-owned and audited.

## Decision

Add protected owner/producer routes:

- `POST /api/projects/memberships/manifest`
- `POST /api/projects/memberships/revoke-dry-run`

The manifest route validates workspace scope, joins `project_memberships` through `projects` to confirm workspace ownership, and returns bounded `active_project_memberships_only` rows with member ID, role, department, persistence, and audit persistence.

The revoke route requires exact project ID, member ID, and project role from a manifest row. Owner project roles require an owner actor. With D1 available, the Worker reads a matching joined row before deleting the same exact membership tuple and records bounded audit metadata.

The Team panel adds `Review project team` and `Remove` actions. After removal, the visible manifest row and count update locally.

## Consequences

- Owners/producers can inspect and remove project-scoped collaboration assignments without direct D1 access.
- Stale or mismatched browser state cannot remove a different role because the project/member/role tuple must still match.
- Removing a project membership affects future replay authorization through membership checks, but it does not revoke workspace membership, explicit record permissions, local browser operation history, or audit events.
- Membership history, ownership transfer, bulk removal, and department-specific policy tuning remain future work.


---
