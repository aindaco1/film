# Historical Decisions 0001-0049

Consolidated losslessly on 2026-09-06 from incremental ADRs. Original status statements describe their implementation stage, not current product or provider readiness. See [current decision owners](../../adr/README.md) and [project status](../../PROJECT_STATUS.md). Original files remain in the v0.1.0-beta.1 Git tag.

<a id="0001-static-first-stack"></a>

Source: `docs/adr/0001-static-first-stack.md`

# ADR 0001: Static-First Stack

Date: 2026-07-07

## Status

Accepted

## Decision

Build Film with a static TypeScript app shell and raw Cloudflare Worker APIs. Do not add React, Vue, Svelte, or another frontend framework in the initial slice.

## Context

The product plan calls for Pool/Store-style practices: static-first public surfaces, Cloudflare Worker trust boundaries, generated assets, strong tests, and no premature heavy framework dependency. The app will eventually need editor and collaboration complexity, but the first slice can prove the workspace model without committing to a framework.

## Consequences

- The first UI is implemented with TypeScript modules and template rendering.
- The app can adopt a framework later if the editor/collaboration implementation proves the tradeoff.
- Trust-sensitive paths still belong in the Worker regardless of frontend implementation.


---

<a id="0002-provider-dry-run-first"></a>

Source: `docs/adr/0002-provider-dry-run-first.md`

# ADR 0002: Provider Dry-Run First

Date: 2026-07-07

## Status

Accepted

## Decision

Pool, Store, Stripe, Social, Google, SMS, Resend, and future AI integrations start as dry-run adapters. They are essential to the MVP, but production credentials and live mutation paths are deferred until scopes, compliance, storage, and audit behavior are explicit.

## Context

The MVP must integrate with external systems, but Film will handle sensitive production data and communications. Shipping dry-run adapters first lets the app shape the workflow without weakening security or requiring live credentials in local development.

## Consequences

- UI surfaces show integration status immediately.
- Worker routes expose provider status and dry-run backup behavior.
- Live integrations need separate security tests, webhook validation, and operator docs before enabling.


---

<a id="0003-indexeddb-operation-log"></a>

Source: `docs/adr/0003-indexeddb-operation-log.md`

# ADR 0003: IndexedDB Operation Log

Date: 2026-07-07

## Status

Accepted

## Decision

Use IndexedDB as the browser local mirror for workspace snapshots and queued operation records. Keep `localStorage` only as a fallback and for non-sensitive UI preferences.

## Context

Film must support full offline editing. The first slice does not implement server sync yet, but it needs the data shape that future sync, conflict handling, and restore previews can build on.

## Consequences

- Local mutations create operation records such as `project.created`, `task.created`, `backup.exported`, and `restore.dry_run`.
- The topbar and inspector expose the queued operation count.
- Current sync is a dry-run Worker preflight. Future sync can replay queued operations through Worker-owned authorization, idempotency, and conflict checks.


---

<a id="0004-magic-link-dry-run-auth"></a>

Source: `docs/adr/0004-magic-link-dry-run-auth.md`

# ADR 0004: Magic-Link Dry-Run Auth

Date: 2026-07-07

## Status

Accepted

## Decision

Expose Worker-owned dry-run magic-link auth routes before sending real email. When D1/KV bindings are available, store dry-run magic-link and session state there with hashed tokens, expiry, reuse checks, and logout revocation.

## Context

The product requires no traditional passwords and provider-backed communications. Authentication must be owned by the Worker, but live email and production session storage should wait until expiry, reuse, rate limiting, and secret handling are fully wired.

## Consequences

- `/api/auth/magic-link/request` validates email, hashes it, and returns a development-only token without sending email. With D1, it records only the token hash and expiry.
- `/api/auth/magic-link/verify` accepts dry-run tokens and returns session metadata, CSRF token, and an HttpOnly cookie. With D1/KV, it requires a prepared unconsumed token, records a hashed CSRF session, and consumes the token.
- `/api/auth/logout` requires CSRF metadata and expires the dry-run session cookie.
- The static app shell may hold the development token and CSRF metadata in memory for the active page session, but must not write them to IndexedDB, localStorage, backups, or source files.
- Missing or unapplied local D1/KV bindings fall back to memoryless dry-run behavior so the static app remains usable without production credentials.


---

<a id="0005-encrypted-browser-backups"></a>

Source: `docs/adr/0005-encrypted-browser-backups.md`

# ADR 0005: Encrypted Browser Backups

Date: 2026-07-07

## Status

Accepted

## Decision

Export browser backups using passphrase-derived AES-GCM encryption. ADR 0022 upgrades the active export container from legacy `.filmbackup.json` to `.filmbackup.zip`.

## Context

Film stores sensitive production-shaped data locally. Raw JSON backups are useful for early development but not acceptable as the default backup path for an app that will handle private contacts, releases, contracts, attendee lists, and production documents.

## Consequences

- The user must provide a passphrase of at least 12 characters before export.
- The passphrase is not stored and cannot be recovered.
- Legacy `.filmbackup.json` bundles encrypt the workspace snapshot as one payload and remain readable for previews.
- Current exports use the ZIP-container format described in ADR 0022.


---

<a id="0006-restore-preview-before-overwrite"></a>

Source: `docs/adr/0006-restore-preview-before-overwrite.md`

# ADR 0006: Restore Preview Before Overwrite

Date: 2026-07-07

## Status

Accepted

## Decision

Encrypted backup files must be previewed before any restore can overwrite workspace data.

## Context

Film backups can contain schedules, contacts, budgets, private documents, and future provider metadata. A restore flow that immediately writes decrypted records would make it too easy to lose local work or import the wrong production workspace.

## Consequences

- The current app decrypts selected `.filmbackup.json` files locally and shows matching/new project counts, per-record status, and field-level overwrite conflicts.
- Previewing a backup adds a local `restore.dry_run` operation and audit entry.
- The backup passphrase is requested for the preview and is not stored.
- Destructive restore work must remain Worker-owned and require explicit confirmation, the existing conflict summaries, and tests before it ships.


---

<a id="0007-sqlite-migration-validation"></a>

Source: `docs/adr/0007-sqlite-migration-validation.md`

# ADR 0007: SQLite Migration Validation

Date: 2026-07-07

## Status

Accepted

## Decision

Validate D1 migrations locally with SQLite before relying on Worker runtime bindings or deployed Cloudflare databases.

## Context

Film's structured data will live in D1, but the MVP still uses local seed data and dry-run Worker routes. The schema can drift or become non-idempotent if migrations are not exercised while features are being built.

## Consequences

- `npm run test:migrations` applies the full SQL migration chain to two fresh `tmp/film-migration-check.sqlite` databases.
- The check verifies SQLite integrity, foreign keys, expected table names, and selected expected columns.
- `npm run smoke` includes migration validation.
- Wrangler D1 apply commands remain a later step until real local/production database IDs are explicit.


---

<a id="0008-notion-import-manifest-preview"></a>

Source: `docs/adr/0008-notion-import-manifest-preview.md`

# ADR 0008: Notion Import Preflight

Date: 2026-07-07

## Status

Accepted

## Decision

Start Notion imports with a Worker-owned manifest preflight before local Markdown/CSV parsing, ZIP entry decompression, and record writes.

## Context

Notion exports can contain Markdown pages, CSV database exports, attachments, nested folders, and unsafe archive paths. The product needs an importer, but content reads and record writes must happen only after path sanitization and size bounds are checked.

## Consequences

- `packages/importers` can summarize Notion export file manifests, plan page/database/asset candidates, and map Markdown/CSV content plus attachment metadata into Film records.
- The app shell uses a directory picker or ZIP central-directory parser to build a file manifest from names, sizes, and content types before reading Markdown/CSV files.
- `/api/imports/notion/dry-run` requires CSRF metadata and accepts at most 2,000 manifest entries.
- Unsafe paths and oversized files are ignored and reported before content is parsed.
- ZIP support must reuse these sanitization rules before producing import records.


---

<a id="0009-provider-dry-run-preflights"></a>

Source: `docs/adr/0009-provider-dry-run-preflights.md`

# ADR 0009: Provider Dry-Run Preflights

Date: 2026-07-07

## Status

Accepted

Updated by ADR 0043, ADR 0058, and ADR 0068.

## Decision

Represent Pool, Store, Stripe, Social, Google, and SMS integrations as Worker-backed dry-run preflights before any live credentials, OAuth flows, or provider API calls are added.

## Context

Provider integrations are essential to the MVP, but they touch fundraising data, attendee lists, payment summaries, publishing workflows, Google data, and SMS compliance. The app needs visible integration surfaces early while keeping credentials and live calls out of browser code.

## Consequences

- `packages/providers` defines provider capabilities, required scopes, next steps, and compliance notes.
- `/api/providers/:provider/dry-run` requires CSRF metadata and returns dry-run provider metadata only.
- Topbar provider chips call the Worker and render an inspector summary.
- ADR 0068 adds a Google Drive/Docs sync dry-run plan route without OAuth credentials or live file reads.
- Live provider work must add least-privilege scopes, token storage, rate limits, consent/compliance checks, and webhook verification before credentials are used.


---

<a id="0010-native-document-drafts"></a>

Source: `docs/adr/0010-native-document-drafts.md`

# ADR 0010: Native Document Drafts

Date: 2026-07-07

## Status

Accepted

## Decision

Represent native app documents as first-class project records before adding a rich editor or Google Docs sync.

## Context

Film's product direction says native folders/docs are canonical and Google Drive/Docs is optional import/export/sync. The MVP needs document records and backup coverage before it needs a full editor.

## Consequences

- `ProjectDoc` records now have stable IDs.
- The app shell can create Markdown draft document records locally.
- Document creation writes a queued `document.created` operation for future Worker replay.
- Rich editing, document body storage, Google sync, and per-document restore remain later slices.


---

<a id="0011-operation-sync-validation"></a>

Source: `docs/adr/0011-operation-sync-validation.md`

# ADR 0011: Operation Sync Validation

Date: 2026-07-07

## Status

Accepted

## Decision

Validate queued local operations with a shared schema helper before the Worker accepts a dry-run sync batch.

## Context

Film is local-first, so browser actions create queued operations before future Worker replay. A shape-only sync preflight would allow invalid kind/entity pairs or oversized payloads to be marked synced before authorization and D1 replay exist.

## Consequences

- `validateOperationBatchForSync` lives in `packages/schema`.
- The Worker rejects invalid IDs, workspaces, statuses, kind/entity pairs, timestamps, summaries, and oversized or unserializable payloads.
- The sync endpoint still does not mutate canonical project/task/document records, but it now exercises the same contract future replay should start from.
- D1-backed replay now records operation metadata with authorization, idempotency, and conflict checks when D1 auth/session and operation-log storage are available.
- Per-record permission checks and canonical record mutation application remain separate work.


---

<a id="0012-member-role-read-model"></a>

Source: `docs/adr/0012-member-role-read-model.md`

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


---

<a id="0013-notion-import-applies-local-records"></a>

Source: `docs/adr/0013-notion-import-applies-local-records.md`

# ADR 0013: Notion Import Applies Local Records

Date: 2026-07-07

## Status

Accepted

## Decision

The Notion importer applies Markdown and CSV content, plus attachment metadata, to the local Film workspace after the Worker metadata preflight succeeds.

## Context

The product needs a real Notion importer, not a standalone preview feature. Exported Notion folders commonly include Markdown pages, CSV database exports for projects, tasks, docs, people, equipment, and expenses, and asset attachments referenced from those pages.

## Consequences

- The app imports extracted Notion export folders through `Import folder` and Notion ZIP archives through `Import ZIP`.
- `Projects.csv` creates Film projects before other CSVs are mapped, so related tasks/docs/people/equipment/expenses attach to the imported project.
- Relation-list cells such as `Related Project`, `Related Projects`, `Projects`, `Related Show`, and `Show` are split on common Notion export separators and matched against any imported/current project title, not only the first relation value.
- Markdown pages are preserved as native Film document records with a local markdown snapshot.
- Attachments are preserved as Film document metadata records with source path, size, and content type. Binary bytes are handled outside the workspace record model.
- The import queues an `import.notion_applied` operation for future Worker replay.


---

<a id="0014-notion-zip-and-attachment-metadata"></a>

Source: `docs/adr/0014-notion-zip-and-attachment-metadata.md`

# ADR 0014: Notion ZIP and Attachment Metadata

Date: 2026-07-07

## Status

Accepted

## Decision

Support Notion ZIP imports in the static app shell by parsing the ZIP central directory locally, sending only entry metadata to the Worker preflight, then decompressing Markdown and CSV entries after preflight succeeds.

## Context

Notion exports commonly arrive as ZIP files. Adding a large ZIP dependency would increase the static app surface area for a narrow need. The MVP also needs attachment continuity, but Worker/R2 upload commit, retention policy, restore behavior, and backup rules need explicit design before raw bytes move to server storage.

## Consequences

- The web app supports stored and deflated ZIP entries without adding a ZIP package dependency.
- ZIP metadata preflight uses the same path and size checks as extracted-folder imports.
- Markdown and CSV entries are decoded locally only after Worker preflight succeeds.
- Asset entries create Film document metadata records with source path, size, and content type.
- Attachment bytes remain out of workspace JSON, encrypted backup bundles, operation payloads, and Worker dry-run requests until R2 upload/commit is designed.


---

<a id="0015-local-attachment-staging-and-r2-dry-run"></a>

Source: `docs/adr/0015-local-attachment-staging-and-r2-dry-run.md`

# ADR 0015: Local Attachment Staging and R2 Dry Run

Date: 2026-07-08

## Status

Accepted

## Decision

Stage supported imported attachment bytes in a dedicated browser IndexedDB object store and validate staged attachment metadata through Worker-owned R2 dry-run endpoints. Do not send raw attachment bytes to the Worker or include them in workspace JSON, operation payloads, or encrypted backup bundles in this slice.

## Context

Notion imports need attachment continuity before live storage is configured. Film also needs backup and restore safety before deep integrations. Storing imported bytes directly inside the workspace model would make backups large and blur the line between metadata sync and binary object storage.

## Consequences

- Imported `ASSET` document records start as `metadata_only` and become `staged_local` only after the matching blob is written to IndexedDB.
- Each staged attachment records a local storage key, SHA-256 hash, staged timestamp, source path, size, and content type.
- `/api/attachments/r2/dry-run` validates attachment metadata and returns future object keys without receiving raw bytes.
- `/api/attachments/r2/prepare-upload` and `/api/attachments/r2/commit` model the future signed upload handshake in dry-run mode.
- The Worker rejects attachment dry-run requests that include `bytes`, `blob`, or `payload` fields.
- Future live storage needs real signed upload URLs, R2 object lifecycle policy, backup byte rules, and restore behavior before bytes leave the browser.


---

<a id="0016-r2-upload-prepare-commit-dry-run"></a>

Source: `docs/adr/0016-r2-upload-prepare-commit-dry-run.md`

# ADR 0016: R2 Upload Prepare and Commit Dry Run

Date: 2026-07-08

## Status

Accepted

## Decision

Model attachment uploads as a Worker-owned prepare/commit handshake before enabling real signed R2 uploads. The browser asks the Worker to prepare upload intents from staged attachment metadata, then commits those intents in dry-run mode. Raw bytes stay in the local IndexedDB attachment store.

## Context

Film needs the application contract for attachment storage before production R2 signing credentials, object lifecycle rules, and restore/export policies are final. A prepare/commit protocol lets the app validate object keys, hashes, size bounds, and commit tokens now without moving bytes to server storage.

## Consequences

- `prepare-upload` returns future object keys, required headers, expiry, and dry-run commit tokens.
- `commit` validates object key scope, size, SHA-256, commit token, and rejects raw bytes.
- Local `ASSET` docs move from `staged_local` to `r2_dry_run` when commit metadata is accepted.
- Encrypted backups include an attachment metadata manifest with policy `metadata_only`, counts, source sizes, hashes, and object keys, but no blob bytes.
- Live upload requires replacing `uploadUrl: null` with signed R2 URLs and enforcing object existence, byte hash verification, retention policy, and authorization checks.


---

<a id="0017-attachment-upload-idempotency-metadata"></a>

Source: `docs/adr/0017-attachment-upload-idempotency-metadata.md`

# ADR 0017: Attachment Upload Idempotency Metadata

Date: 2026-07-08

## Status

Accepted

## Decision

Persist attachment upload prepare/commit metadata in D1 when the `DB` binding and migration are available. The Worker records deterministic upload intent IDs, scoped object keys, size/content-type/SHA-256 metadata, expiry, and commit status. Commit tokens are returned to the browser for the dry-run handshake, but D1 stores only their SHA-256 hashes.

If D1 is absent or unavailable in local dry-run development, the Worker keeps the existing memoryless dry-run behavior and reports that persistence mode in the response.

## Context

The previous R2 prepare/commit dry-run modeled the browser-to-R2 upload flow but did not record intent state. That meant repeated commits could not be distinguished from first commits once live D1 was available, and future signed upload work had no durable metadata contract.

Film still does not have production R2 signing, object lifecycle rules, or byte-level restore/export policy. The next conservative step is durable metadata and idempotency, not live binary storage.

## Consequences

- `migrations/0003_attachment_upload_intents.sql` adds the D1/SQLite table for upload intents and commit status.
- `/api/attachments/r2/prepare-upload` returns an `idempotencyKey` and records the intent when D1 is working.
- `/api/attachments/r2/commit` rejects commits that have no prepared D1 intent when D1 is working, and returns the original commit timestamp for repeated commits.
- Local development without applied D1 migrations can still use the Notion importer through dry-run fallback, but the response exposes that persistence was not durable.
- Attachment bytes remain in browser IndexedDB or future direct R2 uploads; they are not sent to the Worker and are not included in workspace JSON, operation payloads, or encrypted backups.


---

<a id="0018-d1-kv-dry-run-auth-state"></a>

Source: `docs/adr/0018-d1-kv-dry-run-auth-state.md`

# ADR 0018: D1/KV Dry-Run Auth State

Date: 2026-07-08

## Status

Accepted

## Decision

Use D1 for dry-run magic-link and session records when the Worker has a usable `DB` binding. Store only hashed magic-link tokens and hashed CSRF tokens. Consume magic links once, enforce expiry during verification, and mark sessions revoked on logout.

Use the `SESSIONS` KV binding as an optional session cache keyed by the opaque session ID, with hashed CSRF metadata and the same expiry horizon. If D1 or KV is missing or not migrated in local development, preserve the memoryless dry-run auth flow and report the fallback persistence mode in API responses.

## Context

The first auth slice proved Worker-owned magic-link routes without email delivery or production session storage. The next MVP step is to make expiry, reuse protection, and logout stateful without introducing live email delivery, OAuth, or browser-owned secrets.

## Consequences

- Development magic-link tokens are still returned to the app because no email provider is live.
- D1 stores token hashes and CSRF hashes, not raw magic-link tokens or raw CSRF tokens.
- A D1-backed token can be verified only once.
- Logout revokes matching D1 session records and deletes the optional KV cache entry.
- Fine-grained protected-route authorization, production email delivery, rate limits, and abuse protection remain separate work before live auth.


---

<a id="0019-protected-mutation-session-checks"></a>

Source: `docs/adr/0019-protected-mutation-session-checks.md`

# ADR 0019: Protected Mutation Session Checks

Date: 2026-07-08

## Status

Accepted

## Decision

Require protected Worker dry-run mutations to pass a shared session guard when D1 auth storage is available. The guard validates the `x-film-csrf` header, checks the `film_session` HttpOnly cookie against the D1 `sessions` table, rejects revoked or expired sessions, verifies the hashed CSRF token, and reads the dry-run role from the optional `SESSIONS` KV cache.

Provider preflights and backup dry runs require owner or producer roles. Notion import and attachment R2 dry runs require owner, producer, or director roles. Operation sync preflight accepts any authenticated first-class role, and replay metadata now adds the operation-kind role policy from ADR 0023.

If the local D1 session store is missing or unavailable, the Worker preserves the existing memoryless dry-run fallback so the static app remains usable before local Wrangler resources are migrated.

## Context

D1/KV auth state gives Film one-time magic links and revocable sessions, but sensitive Worker mutations still accepted any sufficiently long CSRF-like string. The MVP needs Worker-owned authorization checks before provider, backup, import, attachment, and sync mutations become real.

## Consequences

- A migrated D1 auth store now makes protected dry-run mutations fail closed without a valid session cookie and matching CSRF token.
- Role checks are still dry-run oriented; detailed record-level ownership and collaboration checks remain future work.
- Local development with an unapplied D1 database can still exercise the app through the documented fallback.
- Browser code continues to hold only active-page session metadata and does not store tokens in IndexedDB, localStorage, backups, or source files.


---

<a id="0020-d1-operation-log-replay"></a>

Source: `docs/adr/0020-d1-operation-log-replay.md`

# ADR 0020: D1 Operation Log Replay

Date: 2026-07-08

## Status

Accepted

## Decision

Replay validated browser operation batches into D1 `operation_log` metadata when the Worker has usable D1 auth/session and operation-log storage. ADR 0025 extends this by applying bounded create operations for projects, tasks, and documents to canonical D1 tables; backup, restore, import, and workspace seed operations remain metadata-only.

The Worker treats repeated operation IDs with the same workspace, kind, entity, payload, and status as idempotent. It rejects reused operation IDs with different metadata as `operation_conflict`, rejects a second applied operation for the same workspace/entity/kind as `entity_conflict`, and applies the operation-kind role policy from ADR 0023 before replaying metadata.

If D1 is missing, unmigrated, or unavailable in local development, the endpoint preserves the prior memoryless dry-run validation behavior and reports that persistence mode in the response.

## Context

Film is local-first, so browser actions are queued before sync. The first sync endpoint validated operation shape but did not persist or detect replay conflicts. The next conservative step was Worker-owned operation metadata replay before broad canonical record mutation.

## Consequences

- The browser can still mark accepted operations synced using the existing `accepted` response list.
- The response now exposes `persistence`, `replayed`, `idempotent`, `canonicalApplied`, `metadataOnly`, `conflictPolicy`, and `authorizationPolicy` for diagnostics and UI status.
- Operation replay is protected by the existing session guard and operation-kind role checks when D1 auth storage is available.
- Broader update/delete mutation application, ownership transfer, and reviewer/comment collaboration checks remain future work.


---

<a id="0021-per-record-restore-preview"></a>

Source: `docs/adr/0021-per-record-restore-preview.md`

# ADR 0021: Per-Record Restore Preview Conflicts

Date: 2026-07-07

## Status

Accepted

## Decision

Encrypted backup previews must summarize incoming records and field-level overwrite conflicts before any destructive restore path is introduced.

## Context

Project-level matching is not enough for restore safety. Film backups can change tasks, documents, people, equipment, expenses, budgets, and call sheet details inside a project without creating a new project. Users need to see those collisions before deciding whether a later Worker-owned restore commit is safe.

## Consequences

- Backup preview comparison now emits structured record summaries for workspace, project, task, document, person, equipment, and expense records.
- Existing records are matched by stable IDs when available, with natural labels as a fallback for project children that do not have IDs.
- Field-level changes are reported as conflicts because a future restore commit would overwrite current values.
- The browser still decrypts backup files locally, stores no passphrase, queues only a `restore.dry_run` operation, and does not overwrite records.
- Destructive restore commits remain future Worker-owned work with explicit confirmation and authorization gates.


---

<a id="0022-encrypted-backup-zip-container"></a>

Source: `docs/adr/0022-encrypted-backup-zip-container.md`

# ADR 0022: Encrypted Backup ZIP Container

Date: 2026-07-07

## Status

Accepted

## Decision

Export encrypted browser backups as `.filmbackup.zip` containers with a plaintext non-secret `manifest.json`, an encrypted workspace snapshot payload file, and separately addressable encrypted payload files for sensitive record bodies.

## Context

The first backup format encrypted the whole workspace snapshot into one JSON bundle. That was enough for local backup safety, but future restore workflows need a container that can add manifests, record payloads, document payloads, and attachment policy files without making one large opaque JSON object the only format.

## Consequences

- Current browser exports download `.filmbackup.zip` files.
- ZIP entries are stored without an archive dependency; the encrypted payload already has high entropy, so compression is not useful for this slice.
- The manifest includes format, version, workspace ID, snapshot timestamps, encryption metadata, payload references, secret policy, attachment counts, and document-body payload counts. It does not include project titles, contact data, document contents, raw attachment bytes, or provider secrets.
- The workspace snapshot remains encrypted with PBKDF2-derived AES-GCM and uses the backup secret redaction policy from ADR 0024 before encryption.
- Legacy `.filmbackup.json` files remain readable by the preview flow.
- ADR 0076 splits native Markdown document bodies into an additional encrypted payload file without replacing the container format.
- ADR 0077 adds encrypted attachment restore-policy payloads without replacing the container format.


---

<a id="0023-operation-replay-role-policy"></a>

Source: `docs/adr/0023-operation-replay-role-policy.md`

# ADR 0023: Operation Replay Role Policy

Date: 2026-07-08

## Status

Accepted

## Decision

Operation sync remains available to every authenticated first-class role, but Worker-owned replay metadata must pass an operation-kind role policy before an operation is recorded in D1.

## Context

The sync endpoint originally had one coarse role gate: any authenticated role could submit a valid operation batch. That is acceptable for shape validation, but not for replaying metadata that future server-side mutation application will trust. Film needs a conservative policy before operation replay moves from metadata-only toward canonical record mutation.

## Consequences

- `workspace.seeded` replay is owner-only.
- `project.created` and `import.notion_applied` replay require owner, producer, or director.
- `task.created` and `document.created` replay allow owner, producer, director, department lead, or contributor.
- `backup.exported` and `restore.dry_run` replay require owner or producer.
- Reviewers can authenticate to the sync endpoint but have no replayable mutation operations in the current schema.
- Disallowed operations are rejected per operation with `insufficient_operation_role`; allowed operations in the same batch may still be accepted and replayed.
- This is still only the operation-kind layer. Real mutation application also needs canonical record ownership, membership, and collaboration checks.


---

<a id="0024-backup-secret-redaction"></a>

Source: `docs/adr/0024-backup-secret-redaction.md`

# ADR 0024: Backup Secret Redaction

Date: 2026-07-08

## Status

Accepted

## Decision

Backup snapshots must recursively remove provider-token-shaped fields before encryption, even when those fields are not part of the current typed workspace schema.

## Context

Provider integrations are dry-run today, but future OAuth and API integrations will introduce sensitive token-shaped values. TypeScript prevents those fields in normal code paths, but imported data, migration experiments, or provider adapter mistakes could still attach extra runtime properties to workspace records before backup export.

## Consequences

- `createBackupSnapshot` sanitizes a cloned workspace tree instead of storing the input object by reference.
- Common secret containers such as `providerSecrets` and `credentials` are removed.
- Common token/key fields such as access tokens, refresh tokens, API keys, private keys, webhook secrets, signing secrets, passwords, authorization headers, and bearer values are removed.
- Known live-token-looking string values are redacted even when they appear under an unexpected key.
- Policy metadata such as `secretPolicy` and provider `secretsPolicy` remains allowed.
- This is a defense-in-depth guard, not a replacement for Worker-owned OAuth token storage and provider adapter reviews.


---

<a id="0025-canonical-create-operation-application"></a>

Source: `docs/adr/0025-canonical-create-operation-application.md`

# ADR 0025: Canonical Create Operation Application

Date: 2026-07-08

## Status

Accepted

## Decision

When D1 operation replay is available, apply validated and authorized `project.created`, `task.created`, and `document.created` operations to canonical D1 tables in addition to recording operation metadata.

## Context

Operation-log replay proved idempotency and conflict checks, but the server still did not materialize user-created records. The safest next step is a narrow create-only application path for the three browser actions with bounded, known payloads. Backup, restore, import, workspace seed, update, delete, and provider operations need stronger commit semantics before canonical mutation.

## Consequences

- `project.created` inserts `projects` and a default `film_profiles` row.
- `task.created` inserts `tasks`; if the referenced project is a known seed project, the Worker materializes that project first so the relation is preserved.
- `document.created` inserts `documents` with a canonical document type derived from the local draft type.
- The sync response reports `canonicalApplied` and `metadataOnly` operation IDs.
- Replayed duplicate operation IDs remain idempotent and do not reapply canonical rows.
- Unsupported operation kinds continue to be recorded as metadata-only.
- This still depends on operation-kind role checks. Later ADRs add scoped replay guards and owner metadata; updates, deletes, restore commits, import commits, ownership transfer, and provider-side mutation remain future work.


---

<a id="0026-worker-restore-confirmation-gate"></a>

Source: `docs/adr/0026-worker-restore-confirmation-gate.md`

# ADR 0026: Worker Restore Confirmation Gate

Date: 2026-07-08

## Status

Accepted

Updated by ADR 0059, ADR 0061, and ADR 0066.

## Decision

Add a Worker-owned restore commit dry-run gate at `POST /api/restores/commit-dry-run` before any destructive restore endpoint exists.

## Context

Encrypted backup previews already show matching, new, and changed records plus field-level overwrite conflicts in the browser. That is enough for local inspection, but not enough for a real restore commit. A destructive restore needs server-side authorization and an explicit confirmation contract so future UI work cannot accidentally treat a preview as permission to overwrite data.

## Consequences

- The endpoint requires the same protected mutation auth as backup dry runs and is limited to owner or producer roles.
- Requests must include a valid workspace ID, a snapshot workspace ID that matches the target workspace, bounded restore preview counts, and the exact phrase `RESTORE <workspaceId>`.
- The response explicitly reports `destructiveWrite: false`, `preRestoreBackupRequired: true`, and a blocked commit status. ADR 0059 adds stored R2 pre-restore backup proof before the gate can advance from `blocked_until_pre_restore_backup` to `blocked_until_restore_commit_storage`.
- The gate does not write restored records, read backup contents, or move attachment bytes. ADR 0061 adds a separate durable approval dry-run endpoint, and ADR 0066 adds a blocked commit-storage attempt endpoint.
- A future destructive restore endpoint must still validate matching approval and commit-attempt records, rerun record-level conflict checks, write audit events, and provide rollback guidance.


---

<a id="0027-canonical-create-record-scope-guard"></a>

Source: `docs/adr/0027-canonical-create-record-scope-guard.md`

# ADR 0027: Canonical Create Record-Scope Guard

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0105 and ADR 0108.

## Decision

When D1 replay applies canonical `task.created` or `document.created` operations, department lead and contributor roles must target an existing or known seed project when a project relation is present. ADR 0105 later extends the same scope guard to `equipment.created`.

## Context

Operation-kind role checks are broad. They say whether a role may create a kind of record, not whether that role may create it under a specific project. Film v1 needs collaboration, and the first safe record-level boundary is the canonical create path that already writes to D1 tables.

## Consequences

- Owner, producer, and director create replay behavior stays unchanged.
- Department leads and contributors can still create unassigned task/document records.
- Department leads and contributors can create task/document records under projects already present in D1 or under known seed demo projects.
- Department leads and contributors cannot replay task/document creates under unknown project IDs; those operations are rejected with `project_scope_not_found` before canonical rows or operation-log entries are written.
- This is still a narrow guard. Later ADRs add workspace membership, project assignments, department scopes, explicit collaboration grants, and owner metadata; update/delete ownership transfer remains future work.


---

<a id="0028-stripe-dry-run-provider-contract"></a>

Source: `docs/adr/0028-stripe-dry-run-provider-contract.md`

# ADR 0028: Stripe Dry-Run Provider Contract

Date: 2026-07-08

## Status

Accepted

Updated by ADR 0058.

## Decision

Add Stripe to Film's Worker-backed dry-run provider contracts without adding credentials, live API calls, payment data storage, or billing UI.

## Context

The product plan treats Pool, Store, and Stripe as authoritative finance systems. Film should eventually read payment, payout, and invoice summaries, but it must not become a payments system or hold card/payment method data. The conservative step is a visible dry-run contract that defines capabilities, scopes, and compliance boundaries before any Stripe secret exists.

## Consequences

- `stripe` is now a shared `IntegrationKey` and appears in the seed workspace.
- `/api/providers/stripe/dry-run` returns metadata for payment summaries, payout summaries, and invoice status checks.
- The web app exposes a Stripe dry-run chip that uses the same Worker preflight path as other providers.
- The contract keeps `secretsPolicy: worker_only` and explicitly avoids card data, raw payment method details, and unrestricted customer exports.
- Future live Stripe work follows ADR 0058: Pool/Store summary adapters first, then any direct Stripe fallback only after least-privilege scopes, webhook verification, rate limits, and redacted audit events are explicit.


---

<a id="0029-read-only-session-metadata"></a>

Source: `docs/adr/0029-read-only-session-metadata.md`

# ADR 0029: Read-Only Session Metadata

Date: 2026-07-08

## Status

Accepted

## Decision

Add `GET /api/auth/session` as a Worker-owned read-only session metadata endpoint.

## Context

Magic-link verification returns an HttpOnly cookie plus an in-memory CSRF token. The app should be able to ask the Worker whether a cookie still maps to a valid session, but the Worker must not recover or expose the hashed CSRF token after a page reload.

## Consequences

- Without D1 auth storage, the endpoint returns `session: null` with memoryless dry-run persistence.
- With D1/KV auth storage, a valid cookie returns session ID, role, and expiry only.
- Invalid, expired, or revoked cookies fail closed with `invalid_session`.
- The endpoint does not return a CSRF token, does not extend the session, and does not create a new session.
- Protected mutations still require the CSRF token returned by magic-link verification.


---

<a id="0030-project-membership-scope-tables"></a>

Source: `docs/adr/0030-project-membership-scope-tables.md`

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


---

<a id="0031-d1-member-bound-dry-run-sessions"></a>

Source: `docs/adr/0031-d1-member-bound-dry-run-sessions.md`

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


---

<a id="0032-backup-restore-point-metadata-retention"></a>

Source: `docs/adr/0032-backup-restore-point-metadata-retention.md`

# ADR 0032: Backup Restore-Point Metadata Retention

Date: 2026-07-08

## Status

Accepted

## Decision

When D1 is available, backup dry-runs record restore-point metadata and retain only the latest five restore points per workspace.

## Context

The product plan requires restore safety and retaining the last five versions. Browser backup export already encrypts payloads locally, but the Worker backup endpoint only returned metadata. Before writing backup bytes to R2, Film needs the server-side restore-point contract and retention behavior.

## Consequences

- `POST /api/backups/dry-run` now returns backup persistence and restore-point metadata.
- With D1 available, the Worker inserts a `restore_points` row with a dry-run R2-style snapshot reference.
- After insertion, older restore-point metadata is pruned so only the latest five remain for the workspace.
- Without D1, the endpoint remains memoryless dry-run.
- This dry-run endpoint does not upload backup bytes, verify R2 object existence, or make restore commits destructive. ADR 0054 adds a separate explicit R2 object upload route for already-encrypted ZIP backup bytes.


---

<a id="0033-backup-ui-worker-metadata-handoff"></a>

Source: `docs/adr/0033-backup-ui-worker-metadata-handoff.md`

# ADR 0033: Backup UI Worker Metadata Handoff

Date: 2026-07-08

## Status

Accepted

Superseded in part by ADR 0054. The metadata-only handoff remains the fallback path when explicit R2 backup storage is unavailable.

## Decision

After exporting an encrypted browser ZIP backup, the web app calls the Worker backup dry-run endpoint to record or preview restore-point metadata when possible.

## Context

The browser owns local encrypted backup export, while the Worker owns durable restore-point metadata and future R2 storage handoff. The UI should show that boundary clearly without making the local export depend on Worker availability.

## Consequences

- Local encrypted ZIP export remains the primary backup action and still works offline.
- The app calls `POST /api/backups/dry-run` with session CSRF metadata after export.
- If the Worker returns restore-point metadata, the inspector shows the Worker persistence mode and latest-five retention policy, and the local restore-point list is updated.
- If the Worker is unavailable or the user lacks a valid session, the backup export still succeeds and the toast explains that Worker metadata was skipped.
- No backup bytes are sent to the Worker in this metadata-only fallback flow.


---

<a id="0034-restore-confirmation-web-client"></a>

Source: `docs/adr/0034-restore-confirmation-web-client.md`

# ADR 0034: Restore Confirmation Web Client

Date: 2026-07-08

## Status

Accepted

Updated by ADR 0059.

## Decision

Add a typed web client and visible non-destructive UI action for the Worker restore commit dry-run confirmation gate without wiring it to a destructive restore UI.

## Context

The Worker now owns a restore confirmation gate that requires owner/producer authorization, exact confirmation, and bounded preview counts. The app needs a typed client contract and visible gate check before future UI work can ask a user to perform a destructive restore commit.

## Consequences

- `apps/web/src/restore-client.ts` posts to `POST /api/restores/commit-dry-run` with credentials and CSRF metadata.
- The client sends workspace IDs, backup timestamp, optional stored R2 pre-restore backup proof, exact confirmation phrase, and restore preview counts.
- The Backup inspector shows `Check restore gate` after a restore preview exists, prompts for `RESTORE <workspaceId>`, and reports the Worker commit status plus pre-restore backup proof state.
- Worker-provided expected confirmation phrases are surfaced as thrown errors for UI prompts.
- The current Restore button remains a non-destructive local dry-run. No records are overwritten.


---

<a id="0035-production-planning-d1-tables"></a>

Source: `docs/adr/0035-production-planning-d1-tables.md`

# ADR 0035: Production Planning D1 Tables

Date: 2026-07-08

## Status

Accepted

## Decision

Add D1/SQLite tables for first-class production planning records found in the current Notion workspace model.

## Context

The Notion workspace includes opportunities, locations, equipment requests, meeting notes, shows, merch, media/reading-list records, and role catalogs. Film's initial schema covered projects, tasks, docs, people, equipment, and expenses, but it did not yet give the remaining v1 records durable table boundaries.

## Consequences

- New tables: `locations`, `opportunities`, `meeting_notes`, `equipment_requests`, `shows`, `merch_items`, `media_items`, and `production_roles`.
- The tables use workspace/project foreign keys where appropriate and JSON text fields for tags, participants, and channels until richer contracts are needed.
- This is migration-only groundwork. The importer and UI do not yet write these tables.
- `npm run test:migrations` validates the expanded schema twice with SQLite.


---

<a id="0036-notion-production-planning-mapping"></a>

Source: `docs/adr/0036-notion-production-planning-mapping.md`

# ADR 0036: Notion Production Planning Mapping

Date: 2026-07-08

## Status

Accepted

## Decision

Recognize production-planning Notion CSV databases in the importer and report mapped row counts before writing those records into the app model or D1.

## Context

D1 now has tables for locations, opportunities, meeting notes, equipment requests, shows, merch, media, and production roles. The browser workspace model does not yet expose those records, and the importer should not hide that limitation by turning them into generic docs.

## Consequences

- The importer summary now reports mapped counts for the new production-planning categories.
- The UI import summary shows those mapped counts separately from records actually created in the current workspace model.
- Unknown CSV databases still become imported documents with warnings.
- Future D1 import commits can use these categories as routing signals.


---

<a id="0037-cloudflare-mvp-resource-provisioning"></a>

Source: `docs/adr/0037-cloudflare-mvp-resource-provisioning.md`

# ADR 0037: Cloudflare MVP Resource Provisioning

Date: 2026-07-08

## Status

Accepted

## Decision

Provision the initial Cloudflare resources for Film and replace local placeholder binding IDs in `apps/worker/wrangler.toml`.

## Context

The Worker had local placeholder bindings for D1/KV and named R2 buckets. The app now has enough auth, operation-log, backup, attachment, and migration surface to justify creating real MVP resources before deployment hardening.

## Consequences

- Remote D1 database `film` was created and all migrations through `0005_production_planning_tables.sql` were applied.
- Remote KV namespace `SESSIONS` was created and bound to the Worker.
- Remote R2 buckets `film-backups` and `film-attachments` were created.
- `wrangler.toml` now contains the real D1 and KV IDs while preserving code-facing binding names `DB`, `SESSIONS`, `BACKUPS`, and `ATTACHMENTS`.
- No provider credentials, OAuth secrets, webhook secrets, or live email/SMS secrets were added.
- Deployment routes, custom domains, production CORS origins, rate limits, and live provider secrets remain future work.


---

<a id="0038-disable-workers-dev-for-dry-run-auth"></a>

Source: `docs/adr/0038-disable-workers-dev-for-dry-run-auth.md`

# ADR 0038: Disable workers.dev for Dry-Run Auth

Date: 2026-07-08

## Status

Accepted

## Decision

Set `workers_dev = false` for the Worker until production routes, auth delivery, CORS origins, and rate limits are explicit.

## Context

The current Worker intentionally has development-only magic-link behavior that returns dry-run verification tokens. That is useful locally, but it should not become publicly reachable through an accidental `workers.dev` deployment.

## Consequences

- Wrangler can still package the Worker and validate bindings with `wrangler deploy --dry-run`.
- Publishing requires explicit routes/custom domains later.
- Production auth must replace development token return behavior before any public route is configured.


---

<a id="0039-worker-cors-allowlist"></a>

Source: `docs/adr/0039-worker-cors-allowlist.md`

# ADR 0039: Worker CORS Allowlist

Date: 2026-07-08

## Status

Accepted

## Decision

Use a Worker-owned `ALLOWED_ORIGINS` variable for credentialed CORS responses. The Worker only echoes a request origin when it appears in the allowlist; otherwise it returns the first configured origin so browsers do not grant cross-origin credential access.

## Context

The Worker previously hardcoded one local Vite origin. Film now uses several local development ports and has remote Cloudflare resources, but no public production route. CORS needs to be explicit before routes, auth delivery, or provider credentials go live.

## Consequences

- Local Wrangler config lists the current Vite localhost origins.
- Production deployment must replace or override `ALLOWED_ORIGINS` with the actual app origin.
- OPTIONS preflights and normal JSON responses use the same security and CORS header path.
- Unknown browser origins are not reflected, while non-browser clients can still read ordinary API responses.


---

<a id="0040-kv-mutation-rate-limits"></a>

Source: `docs/adr/0040-kv-mutation-rate-limits.md`

# ADR 0040: KV Mutation Rate Limits

Date: 2026-07-08

## Status

Accepted

## Decision

Add a Worker-owned mutation rate-limit gate for POST routes using the existing `SESSIONS` KV namespace with `rl:`-prefixed keys. Buckets are scoped by route family and a SHA-256 hash of IP plus user agent.

## Context

The roadmap requires rate limits before production auth, public routes, provider credentials, and externally visible actions. Film already has a KV namespace for ephemeral session data, and the current app still needs to stay usable in local dry-run development when bindings are absent.

## Consequences

- Magic-link request attempts are limited more tightly than ordinary authenticated dry-run mutations.
- Provider, import, attachment, backup/restore, and operation sync POST routes now share route-family buckets.
- Without KV, the Worker reports no rate-limit persistence and preserves local dry-run behavior.
- This is a coarse MVP abuse guard. Production may still need tuned limits, Turnstile on unauthenticated auth starts, and stronger per-account/provider quotas.


---

<a id="0041-canonical-create-project-memberships"></a>

Source: `docs/adr/0041-canonical-create-project-memberships.md`

# ADR 0041: Canonical Create Project Memberships

Date: 2026-07-08

## Status

Accepted

## Decision

Require contributors and department leads to have a matching `project_memberships` row before D1 replay applies canonical `task.created` or `document.created` operations with a project relation.

## Context

ADR 0027 blocked contributor and department-lead creates under unknown projects. That was a useful first guard, but known-project existence is not enough for collaboration. The membership tables now exist, and dry-run sessions can carry a D1 workspace member id into replay.

## Consequences

- Owner, producer, and director roles can still apply canonical create operations broadly.
- Contributor and department-lead task/document creates under known projects are rejected as `project_membership_required` unless their session member is assigned to that project.
- Operation log rows now record `actor_member_id` for replayed operations when the session has a member id.
- Full department-scope, member status, invite acceptance, and record-level update/delete policies remain future work.


---

<a id="0042-worker-safety-audit-events"></a>

Source: `docs/adr/0042-worker-safety-audit-events.md`

# ADR 0042: Worker Safety Audit Events

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0094.

## Decision

Record D1 `audit_events` for Worker backup dry-runs, explicit backup R2 object storage/export, and restore commit dry-run checks when D1 is available.

## Context

Film's roadmap requires audit events before destructive restores, live integrations, externally visible messaging, AI writes, or provider credentials. The schema already includes `audit_events`, but Worker safety gates were not writing audit rows.

## Consequences

- Backup dry-runs record the restore point id, snapshot ref, retention policy, and persistence mode.
- Backup R2 object storage records the restore point id, snapshot ref, object key, byte size, SHA-256, and restore-point metadata persistence mode.
- Backup R2 export records bounded manifest counts and object download restore-point metadata.
- Restore commit dry-run checks record preview counts, backup timestamp metadata, and `destructiveWrite: false`.
- Audit writes are best-effort and reported as `auditPersistence`; they do not make local dry-run backup or restore preview behavior fail when D1 is unavailable.
- ADR 0094 adds bounded audit events for provider preflights/readiness checks, Notion import preflights, and operation sync replay checks.
- Live integration, AI, and deeper destructive attachment restore audit coverage remain future work.


---

<a id="0043-resend-dry-run-provider-contract"></a>

Source: `docs/adr/0043-resend-dry-run-provider-contract.md`

# ADR 0043: Resend Dry-Run Provider Contract

Date: 2026-07-08

## Status

Accepted

## Decision

Add Resend to Film's Worker-backed dry-run provider contracts without adding API keys, live sends, template storage, or email delivery.

## Context

The product plan calls for Resend as the first email provider and magic-link delivery will eventually need a live email path. Film should define the provider boundary before any sender domain, API key, suppression handling, or email content pipeline goes live.

## Consequences

- `resend` is now a shared `IntegrationKey` and appears in the seed workspace.
- `/api/providers/resend/dry-run` returns metadata for transactional email, magic-link delivery, and crew notification capabilities.
- The web app exposes a Resend dry-run chip using the same Worker preflight path as other providers.
- Future live email work must add sender-domain verification, template review, unsubscribe/suppression handling, rate limits, audit events, and secret storage in the Worker only.


---

<a id="0044-notion-planning-record-preservation"></a>

Source: `docs/adr/0044-notion-planning-record-preservation.md`

# ADR 0044: Notion Planning Record Preservation

Date: 2026-07-08

## Status

Accepted

## Decision

Have the Notion importer preserve bounded normalized row metadata for first-class production-planning databases while continuing to keep the current browser workspace model unchanged.

## Context

Film now has D1 tables for locations, opportunities, meeting notes, equipment requests, shows, merch, media, and production roles. The importer recognized those Notion CSV databases but only retained counts. A later Worker-owned D1 import commit path needs actual normalized rows, not just summary counts.

## Consequences

- `AppliedNotionImport` now includes `planningRecords` with record kind, title, source path, the raw project relation hint, split normalized project relation titles, and non-empty CSV fields.
- Planning field keys and values are bounded before they leave the importer helper.
- The queued `import.notion_applied` operation and Worker commit payload include a capped planning-record sample, normalized relation titles, and total/truncation metadata so sync remains under the existing operation payload limit.
- The Worker accepts normalized relation-title arrays while keeping the older single `projectTitle` field as a fallback for compatibility.
- The visible browser workspace still does not pretend to store these planning tables locally.
- Future D1 import commits can use this shape as the conservative input contract.


---

<a id="0045-worker-notion-planning-d1-commit"></a>

Source: `docs/adr/0045-worker-notion-planning-d1-commit.md`

# ADR 0045: Worker Notion Planning D1 Commit

Date: 2026-07-08

## Status

Accepted

## Decision

Add a Worker-owned `POST /api/imports/notion/planning/commit` route that accepts bounded normalized Notion planning rows and writes them into first-class D1 planning tables when D1 is available.

## Context

The browser importer can now recognize production-planning Notion databases and preserve normalized row metadata. Film also has D1 tables for locations, opportunities, meeting notes, equipment requests, shows, merch, media items, and production roles. The remaining gap was durable import handoff without moving trust-sensitive write behavior into browser code.

## Consequences

- The route accepts at most 200 planning records per request and requires owner, producer, or director authorization when D1 auth storage is available.
- Records are validated for known planning kind, bounded title, safe relative source path, bounded project relation hint, and bounded string fields.
- D1 rows use deterministic `notion_<kind>_<hash>` IDs based on workspace, kind, title, and source path so repeated imports are idempotent.
- The route skips all D1 planning writes when any row in the batch fails validation.
- Existing project rows are linked by case-insensitive project title hints when present; unresolved project hints import as workspace-level planning rows.
- The route returns `dryRun: true` until broader relation mapping, backup/export coverage, and live import approvals exist.
- The browser import summary reports committed, idempotent, and rejected planning row counts without pretending the browser workspace model stores those tables locally.


---

<a id="0046-planning-export-encrypted-backups"></a>

Source: `docs/adr/0046-planning-export-encrypted-backups.md`

# ADR 0046: Planning Export In Encrypted Backups

Date: 2026-07-08

## Status

Accepted

## Decision

Add a Worker-owned `POST /api/planning/export/dry-run` route that exports bounded D1 production-planning rows for inclusion inside encrypted browser ZIP backups.

## Context

Notion production-planning imports now have a D1 commit path. That creates durable user data outside the current browser workspace model, so backups need a read/export boundary before deeper integrations make those rows more important.

## Consequences

- The route requires owner or producer authorization when D1 auth storage is available.
- Export requests are capped at 1,000 planning records and share the backup/restore rate-limit bucket.
- The browser backup flow calls the planning export route before encrypting the ZIP snapshot.
- Planning rows are included inside the encrypted snapshot payload, not as plaintext ZIP entries.
- The plaintext ZIP manifest exposes only planning row count, truncation status, and persistence mode.
- If the Worker or D1 export is unavailable, the local encrypted backup still completes and the UI reports that planning rows were not included.
- ADR 0074 added per-table planning restore previews, and ADR 0082 added gated planning restore commits for these rows.


---

<a id="0047-planning-restore-preview"></a>

Source: `docs/adr/0047-planning-restore-preview.md`

# ADR 0047: Planning Restore Preview

Date: 2026-07-08

## Status

Accepted

## Decision

Show D1 planning rows from encrypted backups in restore previews as counted, grouped, per-table covered, field-key sampled, warning-only records. ADR 0082 later adds the destructive planning restore commit path.

## Context

Planning rows can now be imported into D1 and exported into encrypted ZIP backups. The existing restore preview compares the browser workspace model, which does not yet contain first-class planning tables. Treating planning rows as normal restored browser records would misrepresent the current restore capability.

## Consequences

- Restore previews now expose `planningRecordCount`, `planningTruncated`, per-kind `planningKindCounts`, per-table `planningTableCoverage`, and a bounded `planningRecords` sample with kind, title, project ID, source path, field count, and up to five field keys.
- `incomingRecordCount` includes planning rows so restore gates see the full backup size.
- The preview warns that planning restore requires the gated Worker planning commit path.
- The UI shows a separate planning-row line, per-kind planning coverage, per-table D1 coverage, and a small planning record sample with bounded field names in the restore preview panel.
- ADR 0074 adds per-table planning diffing, and ADR 0082 adds D1 planning commit handling.


---

<a id="0048-workspace-member-status-auth"></a>

Source: `docs/adr/0048-workspace-member-status-auth.md`

# ADR 0048: Workspace Member Status Auth

Date: 2026-07-08

## Status

Accepted. Extended by ADR 0097.

## Decision

Add D1-backed workspace member status enforcement for Worker auth paths using a `workspace_member_statuses` side table.

## Context

The shared browser model distinguishes active and invited members, and future invite flows need revocation/disable behavior. The already-applied D1 `workspace_members` table does not include a status column, so mutating that base table would be riskier than adding an idempotent companion table.

## Consequences

- Migration `0006_workspace_member_statuses.sql` adds active, invited, and disabled status rows keyed by member id.
- Legacy members with no status row default to active.
- Magic-link verification rejects invited or disabled matching workspace members before consuming the one-time token.
- Protected mutations and read-only session metadata reject sessions bound to non-active members.
- KV cached non-owner roles remain authoritative for dry-run tests, while D1 member status is still checked.
- Invite acceptance activates members through the status table. ADR 0097 adds protected active/disabled status management and target session revocation.


---

<a id="0049-session-workspace-scope"></a>

Source: `docs/adr/0049-session-workspace-scope.md`

# ADR 0049: Session Workspace Scope

Date: 2026-07-08

## Status

Accepted

## Decision

Reject workspace-scoped Worker mutations when the request workspace ID does not match the authenticated D1 session workspace.

## Context

D1 sessions can be bound to a workspace member. Several protected routes accepted a `workspaceId` in the request body, but authorization only checked role and member status. That left room for a valid member session to submit dry-run mutations against another workspace ID.

## Consequences

- Workspace-scoped Notion planning commits, planning exports, attachment preflights, backup dry-runs, restore gates, and operation sync now check session workspace scope.
- Memoryless local dry-run auth still works because it has no bound workspace.
- Workspace mismatch returns `workspace_mismatch` with the current auth persistence mode.
- Future multi-workspace switching must create or select a session bound to the target workspace before running protected mutations.


---
