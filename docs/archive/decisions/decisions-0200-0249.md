# Historical Decisions 0200-0249

Consolidated losslessly on 2026-09-06 from incremental ADRs. Original status statements describe their implementation stage, not current product or provider readiness. See [current decision owners](../../adr/README.md) and [project status](../../PROJECT_STATUS.md). Original files remain in the v0.1.0-beta.1 Git tag.

<a id="0200-atomic-workspace-member-status-updates"></a>

Source: `docs/adr/0200-atomic-workspace-member-status-updates.md`

# ADR 0200: Atomic Workspace Member Status Updates

Date: 2026-07-09

## Status

Accepted

## Decision

Apply workspace member active/disabled changes in one guarded D1 `batch()`. The transaction asserts that the target member still has the preflight workspace, role, and status, then writes the new status, revokes every active target session when disabling, and inserts bounded audit evidence.

The status and audit writes must each report exactly one changed row. Any assertion, write, session-revocation, audit, or storage failure returns 503 and D1 rolls back the sequence. Reactivation does not revive revoked sessions; the member must authenticate again.

## Context

The prior helper upserted member status, revoked sessions in a later statement, and returned to the route before audit evidence was inserted. A D1 failure could therefore leave status, session validity, and audit history inconsistent. In particular, a disabled member could retain an active session if revocation failed after the status write.

## Consequences

- Member status, disable-time session revocation, and audit evidence commit or roll back together.
- A concurrent role or status change fails the in-transaction assertion instead of overwriting newer state.
- Retrying after a storage failure is safe because the original member and session state remains intact.
- Reactivation never silently restores a previously revoked session.


---

<a id="0201-atomic-collaboration-authorization-writes"></a>

Source: `docs/adr/0201-atomic-collaboration-authorization-writes.md`

# ADR 0201: Atomic Collaboration Authorization Writes

Date: 2026-07-09

## Status

Accepted

## Decision

Apply project membership assignment/revocation, record permission assignment/revocation, and core record owner transfer through guarded D1 `batch()` transactions. Each batch contains current-state assertions, the authorization write, and bounded audit evidence. Project membership assignment also creates a missing canonical project inside the same transaction and asserts that the resulting project belongs to the requested workspace.

Permission assignment preflights an existing grant by its unique identity and returns its durable ID when updating it. A new grant transaction asserts that no concurrent identity row appeared; an existing grant transaction asserts that the same ID remains current. Permission revocation requires the exact manifest identity and `updated_at`. Owner transfer asserts both an active target member and the exact prior owner.

Every authorization mutation and audit insert must report exactly one changed row. Any assertion, write, audit, or storage failure returns 503 and D1 rolls back the sequence.

## Context

These collaboration helpers previously wrote authorization state and returned to the route before inserting audit evidence. Assignment could also create a project in a separate write. A failure could leave live access state without history, or history without the intended state. In addition, `INSERT OR IGNORE` could hide a globally conflicting project ID, and permission upserts returned a generated ID even when the database retained an existing grant ID.

## Consequences

- Collaboration authorization state and its audit evidence commit or roll back together.
- Project IDs already owned by another workspace return `project_workspace_conflict` without creating a membership.
- Updating an existing permission preserves and returns its durable ID.
- Concurrent status, membership, permission, or ownership changes fail guarded assertions instead of overwriting newer state.
- Real local D1 smoke covers the complete assign, update, transfer, and revoke sequence.


---

<a id="0202-atomic-comment-and-mutation-review-artifacts"></a>

Source: `docs/adr/0202-atomic-comment-and-mutation-review-artifacts.md`

# ADR 0202: Atomic Comment and Mutation Review Artifacts

Date: 2026-07-09

## Status

Accepted

## Decision

Persist metadata-only comment intents, core record mutation requests, film-profile mutation requests, and mutation approval/rejection transitions with their bounded audit evidence in guarded D1 `batch()` transactions.

Comment creation reasserts the target record inside the transaction. For non-owner/producer actors it also reasserts current target ownership or an active comment/write/admin permission before inserting the body preview and SHA-256; raw comment bodies remain unstored. Mutation request creation asserts that the target still matches the captured `updated_at` state. Film-profile requests additionally assert the project workspace and exact profile presence/version. Approval/rejection asserts that the request is still pending before changing status and writing audit evidence. Rollback request scaffolding uses the same atomic core-request path with a source-request reference.

Every artifact write, status transition, and audit insert must report exactly one changed row. Any assertion, write, audit, or storage failure returns 503 and D1 rolls back the sequence.

## Context

These helpers previously wrote the review artifact or request status before the route inserted its audit event. Comment storage also returned a successful response carrying `d1_unavailable_dry_run` after a D1 exception. Permission or target state could change after preflight but before comment/request insertion.

## Consequences

- Protected comment storage now fails closed instead of reporting dry-run success after D1 errors.
- Comment authorization, mutation review artifacts, request resolution, and audit evidence cannot split.
- Concurrent target, permission, or request-status changes fail guarded assertions rather than producing stale review evidence.
- Existing mutation diff/application and rollback workflows retain their response contracts while gaining atomic request history.


---

<a id="0203-guarded-invite-acceptance-and-revocation"></a>

Source: `docs/adr/0203-guarded-invite-acceptance-and-revocation.md`

# ADR 0203: Guarded Invite Acceptance and Revocation

Date: 2026-07-09

## Status

Accepted

## Decision

Invite acceptance begins its D1 transaction with an exact assertion that the invite remains pending, unaccepted, and unchanged. It then asserts the expected member-email identity state, creates or updates the member role, activates member status, consumes the invite token, and inserts hash-only audit evidence in the same `batch()`.

Invite revocation similarly asserts the exact pending invite before changing status and inserting audit evidence. Member, status, invite-consumption/revocation, and audit writes must report their expected changed-row counts. Any assertion, write, audit, or storage failure returns 503 and D1 rolls back the sequence.

## Context

ADR 0188 grouped membership writes and invite consumption in one D1 batch, but the conditional consume statement ran last. D1 does not roll back a batch merely because an update changes zero rows, so a concurrent acceptance could allow earlier member/status writes to commit before the helper returned an invalid-token response. Acceptance and revocation audit events were also inserted by the route after their state transitions.

## Consequences

- A stale or concurrently consumed invite fails before membership state changes.
- Invite membership activation, one-time token consumption, and hash-only audit evidence commit or roll back together.
- Exact invite revocation and its audit evidence commit or roll back together.
- Local D1 smoke forces invite delivery to dry-run and verifies accepted/revoked states without sending external email.


---

<a id="0204-atomic-magic-link-verification"></a>

Source: `docs/adr/0204-atomic-magic-link-verification.md`

# ADR 0204: Atomic Magic-Link Verification

Date: 2026-07-09

## Status

Accepted

## Decision

Treat D1 as authoritative for magic-link verification and member-bound sessions. Verification runs an exact unconsumed/unexpired link assertion, an active member assertion when a member is present, one-time link consumption, and D1 session insertion in one `batch()`. Token consumption and session insertion must each change exactly one row; any assertion or D1 write failure returns the generic invalid-token response and rolls back both changes.

Write the KV session-role cache only after the D1 transaction commits. A KV cache-write failure does not invalidate or hide the committed D1 session because protected member-bound authorization rereads current role and status from D1. Live mutation rate limiting still requires KV and fails closed before verification starts.

Logout follows the same authority boundary: D1 revocation must succeed, then KV cache deletion is best-effort. A stale cache entry cannot revive a D1-revoked session, so the route clears the browser cookie after authoritative revocation even when cache deletion fails.

## Context

Verification previously consumed the link, inserted the session, and wrote KV sequentially. A session insert failure could burn a one-time token without creating a session. A later KV failure could leave a valid D1 session while the route reported failure, encouraging a retry with an already-consumed token.

## Consequences

- A failed D1 verification leaves the token unconsumed and no session row, so a safe retry can succeed.
- One-time token consumption and D1 session creation cannot split.
- KV remains a performance cache rather than a second source of truth for member-bound session validity.
- Post-revocation KV deletion failure does not turn a completed logout into a false error.
- Generic verification failures continue to avoid exposing whether a member, token, or storage record exists.


---

<a id="0205-idempotent-live-magic-link-delivery"></a>

Source: `docs/adr/0205-idempotent-live-magic-link-delivery.md`

# ADR 0205: Idempotent Live Magic-Link Delivery

Date: 2026-07-09

## Status

Accepted

## Decision

Use the random persisted D1 magic-link record ID as the Resend idempotency key for live sign-in email delivery. The header is scoped as `film-magic-link/<record-id>`. It contains no email, email hash, token, or token-derived value and is never returned to the browser.

Do not call Resend unless D1 magic-link persistence returns both the authoritative persistence mode and record ID. Failed delivery keeps the existing generic browser response and expires the unsent link through the existing cleanup path.

## Context

Workspace invite delivery already used a persisted non-PII ID for provider idempotency. Magic-link delivery lacked the same safeguard, so a provider or network retry at the send boundary could duplicate a one-time-link email.

## Consequences

- Retries for one persisted magic-link delivery use the same provider idempotency identity.
- Provider request metadata does not reveal recipient or token material.
- Browser responses remain generic in live member-only mode.


---

<a id="0206-atomic-restore-proof-chain-and-prefix-matching"></a>

Source: `docs/adr/0206-atomic-restore-proof-chain-and-prefix-matching.md`

# ADR 0206: Atomic Restore Proof Chain and Prefix Matching

Date: 2026-07-09

## Status

Accepted

## Decision

Create each non-destructive restore authorization artifact and its bounded audit event in one D1 batch:

- restore approval,
- restore commit attempt, and
- restore application preflight.

When D1 is bound, any assertion, insert, audit, or batch failure returns 503 and no proof ID. Commit-attempt creation reasserts the exact approval and stored R2 restore point inside the transaction. Application-preflight creation reasserts the exact approval, commit attempt, and stored R2 restore point inside the transaction.

Use `instr(column, prefix) = 1` for D1 prefix predicates. Do not express R2 snapshot namespaces or user-supplied audit action prefixes as `LIKE '<prefix>%'` patterns.

## Context

The three restore proof records were durable, but each matching audit event was written afterward. D1 failure could therefore leave an authorization artifact without its audit evidence, and approval storage failure could still produce a successful response with a null proof ID.

Real local-D1 verification also exposed a separate portability defect: the stored-backup namespace prefix is 53 characters, while the local D1 SQLite build rejects LIKE patterns longer than 50 characters. The lookup caught that SQL error and reported valid R2 restore points as unverified.

## Consequences

- A successful proof ID always has matching bounded audit evidence.
- Upstream restore proof rows cannot change between route validation and downstream proof creation without rolling back the batch.
- Bound-D1 failures cannot degrade into memoryless restore authorization success.
- Stored-backup listing, lookup, and proof assertions work without wildcard-pattern limits or wildcard interpretation.
- Audit action-prefix filtering remains bounded and exact-prefix based.
- Unit fault injection covers failure and retry at all three stages; the local Wrangler suite verifies the complete chain against real D1 and removes its probe rows.


---

<a id="0207-atomic-attachment-restore-proof-chain"></a>

Source: `docs/adr/0207-atomic-attachment-restore-proof-chain.md`

# ADR 0207: Atomic Attachment Restore Proof Chain

Date: 2026-07-09

## Status

Accepted

## Decision

Create each non-destructive attachment restore proof and its bounded audit event in one D1 batch:

- attachment package preflight,
- package verification,
- object plan, and
- object commit preflight.

Verification creation reasserts the exact package-preflight row inside its batch. Object-plan creation reasserts the exact package-verification row. Commit-preflight creation reasserts both the exact package verification and object plan. When D1 is bound, any assertion, insert, audit, or batch failure returns 503 and no proof ID.

The commit preflight remains non-destructive. It may inspect D1 and R2 destination state, but it writes no attachment bytes and cannot report `canRestoreBytes: true`.

## Context

The destructive attachment object commit already had reservation, create-only R2 storage, atomic D1 finalization, and compensation/retry behavior. Its four upstream proof rows were durable, but each audit event was a later independent write. The first three routes could also return success with a null proof ID after a bound-D1 failure.

Those artifacts authorize the later byte-commit route. A proof without audit evidence, or a downstream proof created after its upstream row changed, weakens the restore history even when no byte write occurs at that stage.

## Consequences

- Every successful attachment proof ID has matching bounded audit evidence.
- Upstream package, hash, manifest, object-plan, destination, and status evidence cannot change between route validation and downstream proof insertion.
- Bound-D1 errors cannot degrade into memoryless attachment restore authorization success.
- Existing no-overwrite and explicit byte-commit rules are unchanged.
- Unit fault injection covers failure and retry at all four stages; a dedicated local Wrangler probe validates the complete chain against real D1, performs no R2 write, and removes its proof and audit rows.


---

<a id="0208-atomic-planning-restore-previews"></a>

Source: `docs/adr/0208-atomic-planning-restore-previews.md`

# ADR 0208: Atomic Planning Restore Previews

Date: 2026-07-09

## Status

Accepted

## Decision

Persist each durable planning restore preview and its bounded `restore.planning_dry_run_created` audit event in one D1 batch.

When D1 is bound, any preview insert, audit insert, result-count, or batch failure returns 503 and no planning preview ID. Successful and rejected preview responses retain their existing 200/422 semantics when storage succeeds. The preview remains non-destructive and does not write planning rows.

## Context

The destructive planning commit requires a matching durable `restore_planning_previews` row. That row was inserted before a separate audit write, and bound-D1 failure could return a null preview ID while preserving the route's ordinary preview response.

## Consequences

- Every planning preview ID usable by planning commit has matching bounded audit evidence.
- Bound-D1 failures cannot produce a memoryless planning authorization artifact.
- Rejected record diagnostics remain available through the same persisted preview shape when storage succeeds.
- Unit fault injection verifies failure and retry; the real-D1 restore probe verifies the preview/audit pair and removes both.


---

<a id="0209-atomic-expiring-download-plans"></a>

Source: `docs/adr/0209-atomic-expiring-download-plans.md`

# ADR 0209: Atomic Expiring Download Plans

Date: 2026-07-09

## Status

Accepted

## Decision

Persist short-lived bearer download plans and their issuing audit evidence in one D1 batch:

- encrypted backup object download plans, and
- stored attachment package download plans.

Backup plan creation also reasserts the stored R2 restore-point proof inside the transaction. A failed backup plan batch returns 503 with no plan ID or token. A failed attachment package plan returns the existing blocked dry-run response with no plan ID or token; it may record a separate blocked-attempt audit because that response authorizes no download.

## Context

Both routes return short-lived bearer tokens that authorize encrypted or packaged bytes. Their plan rows were durable, but the audit event was a later independent write. D1 audit failure could therefore leave a usable token without its issuing history.

## Consequences

- A returned backup or attachment package bearer token always has matching bounded audit evidence.
- Backup plans cannot advance after their stored restore point disappears or leaves the expected R2 namespace.
- Failed attachment package plan storage remains a non-authorizing, operator-visible blocker.
- Download routes keep their existing token-hash, expiry, workspace, object-key, and D1 source revalidation.
- Unit fault injection verifies rollback/no-token behavior; local real-D1 browser and attachment probes exercise both plan types without exposing token values in logs.


---

<a id="0210-canonical-workspace-hydration"></a>

Source: `docs/adr/0210-canonical-workspace-hydration.md`

# ADR 0210: Canonical Workspace Hydration

## Status

Accepted.

## Decision

Add an authenticated, CSRF-protected `POST /api/workspaces/current/snapshot` route that returns a bounded canonical D1 workspace snapshot. The snapshot contains workspace/member metadata and core project, film-profile, task, document, people, equipment, expense, and restore-point records without contact fields, private notes, raw audit metadata, provider values, or attachment bytes.

Owner, producer, and director sessions can read all core project records, while expenses remain owner/producer or exact-owner/permission scoped. Other roles receive projects reachable through project membership, project ownership, or active record permissions; sensitive documents require exact document ownership or permission. Sensitive people and expenses remain restricted. Every collection has a fixed limit and the response reports truncated collection names.

After magic-link verification, and after a same-tab reload with a session token retained in `sessionStorage`, the browser fetches the canonical snapshot and reconciles it into IndexedDB. Canonical records replace fixture data. Explicitly queued local creates and unsynced task/document edits remain in the local mirror until replay succeeds. Successful D1 operation replay refreshes the snapshot again.

## Context

The static app previously always opened the demo `workspace_acme` mirror. Production authentication could succeed while the browser continued to show fixture projects, and no general D1 read path existed for another device or collaborator. Reloading also discarded the in-memory CSRF token even while the HttpOnly session cookie remained valid.

## Consequences

- Production opens the authenticated D1 workspace instead of demo content.
- Reloads in the same tab restore the session without exposing CSRF through the session metadata endpoint.
- A new tab still requires a new magic link because CSRF tokens are not persisted to long-lived local storage.
- Snapshot reads are bounded full snapshots, not incremental cursors; delta sync and richer conflict presentation remain future work.
- The browser remains an offline mirror, while D1 is authoritative for records that have completed replay or direct canonical writes.


---

<a id="0211-canonical-task-and-markdown-writes"></a>

Source: `docs/adr/0211-canonical-task-and-markdown-writes.md`

# ADR 0211: Canonical Task and Markdown Writes

## Status

Accepted.

## Decision

Apply `task.updated` and `task.completed` operations to canonical D1 task rows in the same guarded batch as their operation-log evidence. Each transition validates the submitted previous status, project/workspace relationship, and existing canonical task state. The D1 batch reasserts that state before changing the task and recording the operation; stale transitions are rejected rather than overwriting newer work.

Add a separate `POST /api/documents/markdown` route for native/Markdown document bodies. The route requires an authenticated session, CSRF metadata, matching workspace/project/document IDs, a body no larger than 64 KiB, and the exact prior `updated_at` value. Owners, producers, and directors can write accessible documents; other roles require exact document ownership or an active document `write`/`admin` permission. The body update and bounded audit evidence commit atomically. Audit metadata contains only IDs, size, SHA-256, timestamps, and sensitivity state, never Markdown text.

The browser saves Markdown to IndexedDB first. When a canonical document version is known, it also attempts the Worker write. A network, authorization, or stale-version failure leaves the local draft and queued metadata operation intact for user recovery.

## Context

Task state/completion and document updates previously produced metadata-only operation-log history. Other devices could not observe task progress, and Markdown bodies stayed permanently local even after document creation reached D1.

## Consequences

- Task state and completion become visible through canonical workspace hydration.
- Concurrent task changes fail on previous-status mismatch.
- Markdown body conflicts fail with `stale_document_version` and preserve the local draft.
- D1 stores native Markdown bodies as application data; provider secrets, contacts, attachment bytes, and audit bodies remain excluded.
- Document creates must replay and hydrate once before direct body persistence has a canonical stale-check token.


---

<a id="0212-worker-owned-google-oauth-and-drive-manifests"></a>

Source: `docs/adr/0212-worker-owned-google-oauth-and-drive-manifests.md`

# ADR 0212: Worker-Owned Google OAuth and Drive Manifests

## Status

Accepted.

## Context

Film needs an optional Google Drive integration without placing OAuth credentials or refresh tokens in browser storage. Native Film documents remain canonical, and a workspace must explicitly opt in before any Google data is read.

## Decision

Use OAuth 2.0 authorization code flow with PKCE through `oauth4webapi`. Owner/producer sessions may start a connection. A ten-minute, one-time state record is stored in KV under a hashed key and binds the callback to the initiating workspace, member, and Film session. The callback accepts only the configured HTTPS URI.

Store access and refresh tokens only in D1 after AES-256-GCM encryption with a Worker secret. Bind ciphertext to provider, workspace, token kind, and key version with authenticated additional data. Exclude the connection table from workspace snapshots, exports, and backups. Public status routes return scopes, expiry, and connection state only.

The first live capability is an explicit, paginated Drive folder metadata read. The Worker decrypts tokens only for the outbound request, refreshes access server-side when needed, normalizes at most 100 items, filters external links, and records count-only audit metadata. It does not import file contents or create canonical Film records. Disconnect attempts provider revocation and deletes local ciphertext regardless of provider response.

Keep `GOOGLE_OAUTH_MODE=dry_run` until the Google OAuth client, consent copy, least-privilege Drive scope, production callback, and operating owner are approved. Calendar access is a separate optional authorization request. Background Drive sync remains blocked until webhook channel validation and lifecycle handling exist.

## Consequences

- Google secrets and tokens never enter the static bundle, IndexedDB, session storage, operation logs, backups, or audit metadata.
- OAuth callback replay, cross-session callbacks, stale state, unapproved roles, and workspace mismatches fail closed.
- Interactive Drive metadata reads can ship without pretending webhook-based background sync exists.
- Token key rotation needs an explicit multi-key migration before changing `GOOGLE_TOKEN_ENCRYPTION_KEY` for connected workspaces.


---

<a id="0213-telnyx-sms-provider-selection"></a>

Source: `docs/adr/0213-telnyx-sms-provider-selection.md`

# ADR 0213: Telnyx for Crew Transactional SMS

Date: 2026-07-10

## Status

Accepted for MVP implementation. Live delivery remains blocked.

## Decision

Use Telnyx as Film's first SMS provider through one registered U.S. 10DLC messaging profile. MVP messages are limited to consented crew operations:

- call-sheet availability and delivery notices
- production schedule changes
- time-sensitive safety or location alerts

Investor updates, fundraising, promotion, bulk marketing, and background campaigns are outside the SMS v1 boundary. Film will not send live SMS until every live gate below is implemented and verified.

## Comparison

Rates are U.S. list prices checked on 2026-07-10 and exclude carrier, registration, tax, and other pass-through fees.

| Provider | Base SMS price | Relevant documented capabilities | MVP assessment |
| --- | ---: | --- | --- |
| Telnyx | $0.004 per message part, inbound and outbound | Ed25519-signed webhooks, final delivery events, retries, failover URL, advanced opt-in/out | Selected: best cost and control balance |
| Twilio | $0.0083 per segment, inbound and outbound | Signed webhooks, delivery callbacks, Messaging Services, advanced opt-out | Strong fallback; higher base cost |
| Bandwidth | $0.004 outbound 10DLC | Direct-to-carrier positioning, delivery webhooks, at-least-once callback retries | Strong high-volume option; not selected for the first self-serve integration |
| Plivo | $0.0077 inbound and outbound long-code SMS | Delivery reports and automatic U.S./Canada DND opt-out handling | Lower differentiation at current list price |

Primary sources:

- https://telnyx.com/pricing/messaging
- https://developers.telnyx.com/docs/messaging/messages/receiving-webhooks
- https://developers.telnyx.com/docs/messaging/messages/advanced-opt-in-out
- https://support.telnyx.com/en/articles/5634625-10dlc-fees-and-charges
- https://www.twilio.com/en-us/sms/pricing/us
- https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out
- https://www.twilio.com/docs/usage/webhooks/webhooks-security
- https://www.bandwidth.com/pricing/
- https://dev.bandwidth.com/docs/messaging/webhooks/
- https://www.plivo.com/sms/pricing/us/
- https://docs.plivo.com/docs/messaging/concepts/dnd-service

## Live Gates

1. Create and verify the Telnyx account, messaging profile, dedicated number, brand, and matching 10DLC campaign.
2. Add a versioned crew consent record with timestamp, source, disclosure version, message categories, and revocation state. Consent must not be inferred from workspace membership.
3. Encrypt E.164 recipient values at rest, index only a one-way normalized-number hash, and exclude numbers and message bodies from ordinary audit metadata.
4. Enforce category allowlists, recipient and segment caps, project scope, role authorization, quiet hours, and an explicit emergency override audit.
5. Verify Telnyx Ed25519 signatures against the exact raw request body, reject stale timestamps, and deduplicate provider event IDs in D1.
6. Apply STOP and revocation events before any later outbound send. HELP and re-subscription behavior must match the registered campaign.
7. Persist bounded delivery state and error codes, not an indefinite message-content archive. Approve a retention and deletion schedule before live mode.
8. Add local signature fixtures, dry-run send plans, webhook replay tests, provider failure tests, and one approved live-number smoke before enabling `SMS_MODE=live`.

## Consequences

- Film can implement against a named provider and concrete webhook contract without storing credentials or enabling sends yet.
- Telnyx's lower base rate preserves room for carrier and 10DLC fees without weakening signature, failover, or opt-out requirements.
- Twilio remains the fallback if onboarding, support, or measured delivery quality is materially worse during the controlled live smoke.
- The provider adapter must remain replaceable; canonical consent and delivery records belong to Film, not to Telnyx-specific browser state.

## Implementation Progress

- `POST /api/providers/sms/send-dry-run` accepts only workspace/project IDs, an allowlisted crew category, aggregate recipient/consent counts, estimated segments, and an optional safety override flag.
- The dry-run rejects recipient arrays and message bodies, enforces complete declared consent coverage, caps a plan at 50 recipients and 150 estimated segments, and always returns `liveSendAllowed: false`.
- The Worker has an isolated raw-body Ed25519 verifier with a five-minute replay window and a bounded Telnyx event normalizer. The normalized result excludes phone numbers, message text, provider error detail, and media URLs.
- The public messaging webhook is implemented but returns 404 unless its explicit live gate, Ed25519 public key, receiving-number/workspace mapping, HMAC key, and D1 storage are configured. Signed fixtures cover durable deduplication, hash-only recipient matching, transactional STOP revocation, pending-attempt suppression, START non-reactivation, and redacted responses/audits.
- Migration `0033_sms_compliance_records.sql`, ADR 0215, and ADR 0219 define and implement protected encrypted consent, opaque-ID revocation, append-only evidence, content-free delivery attempts, and redacted webhook events. No production recipient or provider event has been written.
- ADR 0222 implements a protected outbound adapter with opaque recipient IDs, transient message content, category/member/quiet-hours checks, deterministic replay protection, ten-recipient and segment caps, emergency reason codes, signed delivery-status reconciliation, and scheduled terminal-metadata retention. Production `SMS_MODE` remains disabled pending external account and policy gates.


---

<a id="0214-meta-read-only-social-analytics"></a>

Source: `docs/adr/0214-meta-read-only-social-analytics.md`

# ADR 0214: Read-Only Meta Social Analytics

Date: 2026-07-10

## Status

Accepted for MVP implementation. Live OAuth remains blocked.

## Decision

Use a Meta app with Facebook Login for Business as Film's first social integration. V1 reads analytics and calendar metadata for an explicitly connected Facebook Page and its linked Instagram professional account.

Request only:

- `pages_show_list`
- `pages_read_engagement`
- `read_insights`
- `instagram_basic`
- `instagram_manage_insights`

Do not request `pages_manage_posts`, `instagram_content_publish`, `ads_management`, `ads_read`, or another write/advertising permission in v1. Film does not publish, schedule provider-side posts, moderate comments, send messages, or mutate account data. The separate Social application remains the publishing system.

Film's content calendar is a local read model derived from provider media timestamps, captions or labels needed for identification, and bounded engagement summaries. It is not a publishing queue.

Primary sources checked on 2026-07-10:

- https://developers.facebook.com/documentation/instagram-platform/insights
- https://developers.facebook.com/docs/permissions#pages_read_engagement
- https://developers.facebook.com/docs/development/create-an-app
- https://developers.facebook.com/docs/app-review

## Access Rollout

1. Start with Standard Access for Dust Wave-owned or managed accounts added to the Meta App Dashboard.
2. Complete Business Verification, data handling questions, App Review, and Advanced Access before connecting accounts Film does not own or manage.
3. Demonstrate the complete consent flow and read-only insight surfaces in the App Review screencast.
4. Keep ad and boosted-media aggregate metrics out of v1 so `ads_management` and `ads_read` are unnecessary.

## Live Gates

1. Create the Meta app, configure exact production OAuth redirect URIs, and keep the app in development mode during the owned-account smoke.
2. Store access and refreshable token material only in the Worker using the existing encrypted provider-connection pattern; never return tokens to browser storage or exports.
3. Persist explicit workspace-to-Page-to-Instagram mappings and require an owner or producer to change them.
4. Bound analytics reads by project, account, date window, metric allowlist, pagination, and response size.
5. Verify Meta webhook signatures and deduplicate event IDs before any background refresh is enabled.
6. Define token renewal, deauthorization, data deletion callback, retention, and disconnected-account cleanup behavior.
7. Add OAuth state tests, scope regression tests, read fixtures, rate-limit behavior, disconnect tests, and one owned-account smoke before enabling live mode.

## Consequences

- Film can provide a useful cross-network production calendar and analytics summary without becoming another publisher.
- The App Review scope is smaller and easier to explain because all write, messaging, comment, and ad-management permissions are absent.
- Published content continues to originate from the Social application; Film only reflects provider state.
- External customer accounts remain blocked until Meta Advanced Access and data handling requirements are complete.


---

<a id="0215-sms-compliance-storage-boundary"></a>

Source: `docs/adr/0215-sms-compliance-storage-boundary.md`

# ADR 0215: SMS Compliance Storage Boundary

Date: 2026-07-10

## Status

Accepted for schema implementation. No live SMS writes are enabled.

## Decision

Keep SMS identity and compliance state in Worker-owned D1 tables introduced by migration `0033_sms_compliance_records.sql`:

- `sms_recipients` stores a workspace-scoped normalized-number hash, encrypted E.164 value, encryption-key version, current consent state, disclosure version, allowlisted categories, and bounded timestamps.
- `sms_consent_events` is the append-only consent/revocation history. Provider STOP, START, and HELP events can be deduplicated by their source event ID without storing inbound text.
- `sms_delivery_attempts` stores recipient hash, category, segment count, bounded status/error codes, and provider IDs. It has no message-body column.
- `telnyx_webhook_events` stores only the bounded metadata emitted by the isolated normalizer. It has no phone-number, message-text, media, or provider error-detail column.

Use a dedicated SMS encryption key and a separate HMAC key for recipient lookup. Do not reuse the Google token-encryption key or use plain SHA-256 for low-entropy phone-number identity.

## Transaction Rules

1. Creating or replacing consent must atomically update `sms_recipients`, append `sms_consent_events`, and write bounded audit evidence.
2. A verified STOP webhook must atomically insert the deduplicated Telnyx event, revoke the matching recipient, append the consent event, suppress pending attempts, and write audit evidence before returning `2xx`.
3. START records provider opt-in state but does not restore Film consent by itself; a current Film disclosure must be accepted before the recipient becomes active again.
4. A send transaction must reassert active category-specific consent and project scope before creating delivery attempts.
5. Provider event retries are idempotent through `provider_event_id` and `source_event_id`; duplicate delivery cannot apply state twice.

## Consequences

- Recipient identity can be matched and revoked without appearing in ordinary audit/event metadata.
- Consent history remains inspectable without retaining inbound message content.
- Backups and exports must continue to exclude ciphertext, recipient hashes, provider IDs, and SMS compliance tables by default.
- ADR 0219 implements the protected consent/revocation routes and an explicitly gated signed STOP webhook with these atomic rules. Production webhook activation and every live-send route remain blocked until provider resources, disclosure/retention approval, key rotation policy, and an owned-number smoke are complete.


---

<a id="0216-activate-metadata-only-google-oauth"></a>

Source: `docs/adr/0216-activate-metadata-only-google-oauth.md`

# ADR 0216: Activate Metadata-Only Google OAuth

## Status

Accepted.

## Context

ADR 0212 kept production Google OAuth disabled until the consent copy, client credentials, production callback, least-privilege scope, and operating owner were approved. Those gates are now complete for the external testing audience in Google Cloud project `film-502013`.

## Decision

Enable `GOOGLE_OAUTH_MODE=live` with only `https://www.googleapis.com/auth/drive.metadata.readonly`. Keep Google credentials and the existing token-encryption key in Worker secrets, with operator recovery copies under Film-specific Keychain service names. Allow only `https://film.dustwave.xyz` as the web origin and `https://api.film.dustwave.xyz/api/providers/google/oauth/callback` as the callback.

The production operator smoke must fail closed unless Google reports live readiness and an authorization start produces the exact metadata scope, production callback, PKCE S256 challenge, offline access, granular consent, and Google authorization origin. The probe must not navigate to consent, exchange a code, or store a Google token.

Keep the app in Google's external testing audience until verification and publication are intentionally approved. Drive file-content reads, Docs export, Calendar access, and background webhook sync remain separate consent and implementation increments.

## Consequences

- An owner or producer can explicitly begin Google consent; no connection exists before that action.
- At activation time production readiness expected five live provider gates. ADR 0223 later disabled unmapped Pool/Store/Stripe summaries, so the current truthful production posture is two live provider families (Resend and Google) and five blocked families.
- Meta Insights and Telnyx SMS remain blocked production contracts.
- Any Google incident can be contained by restoring `GOOGLE_OAUTH_MODE=dry_run` without deleting encrypted connection rows or rotating the token key.


---

<a id="0217-canonical-notion-core-import"></a>

Source: `docs/adr/0217-canonical-notion-core-import.md`

# ADR 0217: Canonical Notion Core Import

## Status

Accepted

## Context

Film's Notion importer already created a useful local review model and could persist production-planning rows, but imported tasks, documents, people, equipment, and expenses were not canonical D1 records. That left a core MVP migration gap and made a successful browser import appear more durable than it was.

## Decision

Emit bounded normalized core records from `packages/importers` with source provenance and project title. A protected owner/producer-only Worker route accepts at most 200 records for one canonical project, derives stable IDs from workspace/project/kind/provenance, validates project scope, and atomically creates missing rows plus count-only audit evidence.

Exact existing rows are idempotent. Changed existing rows return record kind and changed field names only; imports never update or overwrite canonical rows. Direct Markdown bodies are capped at 64 KiB and stay out of responses, operation metadata, and audit metadata. The browser commits selected-project core rows before planning rows and rehydrates the canonical workspace after a signed D1 commit.

## Consequences

- Notion exports can populate the canonical MVP core without routing trust-sensitive writes through browser-owned operation payloads.
- Retries are deterministic and safe; update review uses existing mutation/restore boundaries.
- A project must already exist canonically, and records related to another project stay local with a warning.
- Attachments, screenplay bytes, and unsupported funding semantics remain outside this route.


---

<a id="0218-cloudflare-kv-rate-limit-ttl-floor"></a>

Source: `docs/adr/0218-cloudflare-kv-rate-limit-ttl-floor.md`

# ADR 0218: Cloudflare KV Rate-Limit TTL Floor

## Status

Accepted

## Context

Film stores mutation rate-limit counters in KV and fails live mutations closed when that storage is unavailable. Cloudflare KV requires `expirationTtl` to be at least 60 seconds. A 60-second logical window initially wrote a valid TTL, then attempted 59, 58, and lower values on subsequent requests. KV rejected those writes, so legitimate requests received `rate_limit_unavailable` instead of a counter update.

## Decision

Keep the logical reset timestamp in the stored bucket and set the physical KV TTL to `max(60, resetAt - now)`. Parsing already ignores expired logical buckets, so an entry that physically survives beyond its logical reset is reinitialized safely on the next request.

Add a regression test with a KV double that rejects sub-60-second TTLs. Keep live-mode fail-closed behavior and existing per-route bucket separation.

## Consequences

- Repeated requests within 60-second buckets no longer fail because of an invalid provider TTL.
- Logical windows shorter than 60 seconds remain possible through reset timestamps, even though stale physical entries can live for up to 60 seconds.
- Operators can distinguish storage failure (`rate_limit_unavailable`) from policy exhaustion (`rate_limited`).


---

<a id="0219-atomic-sms-consent-and-stop"></a>

Source: `docs/adr/0219-atomic-sms-consent-and-stop.md`

# ADR 0219: Atomic SMS Consent and STOP

## Status

Accepted. Production webhook activation and all live sends remain blocked.

## Context

ADR 0213 selected Telnyx and ADR 0215 defined encrypted recipient and append-only compliance tables. Film still lacked a route that could safely record approved consent, an operator revocation path, and durable signed STOP processing. Enabling a webhook before those writes were atomic would risk acknowledging an opt-out without applying it.

## Decision

Add owner/producer-only consent, revocation, and manifest routes. Consent requires canonical E.164 input, a versioned disclosure, allowlisted categories, an optional active workspace member, and a unique evidence ID. The Worker derives a workspace-scoped HMAC lookup, encrypts the number with record-bound AES-GCM additional data, and atomically writes current state, append-only evidence, and bounded audit metadata. Exact evidence replays are idempotent; changed reuse conflicts. Revocation uses an opaque recipient ID, clears categories, suppresses pending attempts, and appends evidence atomically.

Add a Telnyx messaging webhook that returns 404 unless `TELNYX_WEBHOOK_MODE=live`. When enabled, it verifies the exact raw body and timestamp with the configured Ed25519 public key before extracting sender/destination numbers. A secret receiving-number mapping selects the workspace. Signed events are deduplicated in D1. STOP atomically records the event, revokes the recipient, appends evidence, suppresses pending attempts, and audits only bounded booleans/counts. START records provider opt-in but does not restore Film consent. HELP records evidence without message text.

The browser may review the redacted manifest but does not expose consent enrollment until disclosure and collection policy are approved. ADR 0222 adds the disabled-by-default outbound adapter and opaque-recipient composer without changing that enrollment boundary.

## Consequences

- Film can prove consent and apply revocation without placing phone numbers, hashes, ciphertext, source event IDs, or message text in ordinary responses/audits.
- Provider retries are safe and a storage failure remains fail closed so Telnyx retries instead of losing STOP.
- Operators must preserve both SMS keys and configure every receiving number to exactly one workspace before webhook activation.
- START alone is insufficient consent; a current Film disclosure must be accepted through the protected consent route.


---

<a id="0220-worker-owned-meta-oauth-and-read-model"></a>

Source: `docs/adr/0220-worker-owned-meta-oauth-and-read-model.md`

# ADR 0220: Worker-Owned Meta OAuth and Read Model

Date: 2026-07-10

## Status

Implemented behind a disabled production gate.

## Context

ADR 0214 selected Facebook Login for Business and a read-only Facebook/Instagram boundary. Film still needed an implementation that could connect a workspace without exposing tokens, reject permission expansion, select one analyzable Page with a linked Instagram professional account, and render useful calendar and engagement data without becoming a publisher.

## Decision

Add a dedicated `meta_provider_connections` table. Store user and Page access tokens as AES-256-GCM ciphertext using an independent `META_TOKEN_ENCRYPTION_KEY` and workspace/token-kind additional data. OAuth state is random, hashed in KV, valid for ten minutes, and bound to the current Film session, workspace, and owner/producer member.

The callback verifies the actual granted permission set. It requires the five ADR 0214 scopes, allows Meta's implicit `public_profile`, and rejects every other granted permission. Successful authorization stops at `pending_page_selection`. An owner or producer must select a Page that returns the `ANALYZE` task and a linked Instagram professional account before reads become active.

Analytics reads are limited to 31 days, 50 Facebook posts, 50 Instagram media rows, allowlisted Page/Instagram insight metrics, and bounded output. Responses may include labels or captions, publication timestamps, safe Facebook/Instagram permalinks, media type, and aggregate reactions/comments/shares. They never include access tokens, token ciphertext, media asset URLs, messages, comments, moderation data, ad data, or publishing controls. Independent endpoint failures produce redacted partial warnings.

Disconnect attempts provider revocation and always deletes local user/Page token ciphertext and account mappings. Provider tokens and connection rows remain excluded from workspace snapshots, exports, and backups.

## Production Gate

`META_OAUTH_MODE` remains `disabled`. Live mode requires all of:

- a Meta app and numeric app ID/secret;
- Facebook Login for Business and a numeric configuration ID;
- exact redirect `https://api.film.dustwave.xyz/api/providers/meta/oauth/callback`;
- an explicit reviewed `META_GRAPH_API_VERSION`;
- an independent recoverable 32-byte token encryption key;
- owned-account consent and disconnect smoke;
- Business Verification, data handling answers, and the required App Review/Advanced Access before external accounts.

Signed deauthorization and data-deletion callbacks are implemented independently of the interactive OAuth live gate; ADR 0221 records their verification, replay, deletion, and status boundary. Background refresh remains out of scope until a separate Graph webhook verification and deduplication path is implemented and verified. Publishing, messaging, moderation, and advertising permissions remain ineligible for Film social v1.

## Consequences

- The Worker owns every trust-sensitive Meta operation and the browser receives only redacted connection, candidate, calendar, and insight data.
- The Social application remains the only publishing surface.
- The implementation can ship while disabled without pretending that Meta account resources or review are complete.
- Losing the token key requires clearing affected connection rows and reconnecting; key rotation needs multi-key decryption before any active connection exists.


---

<a id="0221-worker-owned-meta-deletion-and-deauthorization"></a>

Source: `docs/adr/0221-worker-owned-meta-deletion-and-deauthorization.md`

# ADR 0221: Worker-Owned Meta Deletion And Deauthorization

Date: 2026-07-10

## Status

Implemented; production callbacks remain unavailable until the Meta app secret is provisioned.

## Context

Meta requires an app to remove locally stored account data after deauthorization and to accept a user-data deletion request that returns a status URL and confirmation code. These callbacks must keep working when Film disables new OAuth connections during an incident. They must not trust browser sessions, expose the app-scoped Meta user ID, retain access tokens, or turn an unsigned request into a destructive write.

## Decision

Add public Worker endpoints for Meta deauthorization and data deletion. Each endpoint accepts only a bounded form-encoded `signed_request`, verifies the HMAC-SHA256 signature with `META_OAUTH_CLIENT_SECRET`, requires the signed payload algorithm and numeric app-scoped user ID, rejects future timestamps, and operates without the interactive `META_OAUTH_MODE` gate.

Deauthorization deletes every matching `meta_provider_connections` row and writes workspace-scoped, value-free audit evidence in one D1 batch. Data deletion does the same while creating a completed request row with a random 128-bit confirmation code, a SHA-256 user reference, and a signed-request fingerprint. A repeated signed deletion request returns the original confirmation. The public status endpoint accepts only the fixed-format confirmation code and returns status, timestamps, and a deleted-connection count; it never returns the Meta user ID or hash.

The endpoints return 404 when the Meta app secret or D1 is unavailable. Callback rate limits are separate from interactive OAuth limits. Provider mode may stay disabled while signed callbacks remain active.

## Consequences

- Meta app configuration uses `/api/webhooks/meta/deauthorize` and `/api/webhooks/meta/data-deletion`; Film generates the status URL in the deletion response.
- A valid app-signed callback can delete local Meta connections without a Film session, as required by the provider contract.
- Callback verification and connection deletion are testable before enabling interactive OAuth, but a production signed smoke requires the real Meta app secret.
- Background Graph webhook refresh remains a separate decision with its own event signature and deduplication requirements.


---

<a id="0222-worker-owned-telnyx-outbound-adapter"></a>

Source: `docs/adr/0222-worker-owned-telnyx-outbound-adapter.md`

# ADR 0222: Worker-Owned Telnyx Outbound Adapter

Date: 2026-07-10

## Status

Implemented and enabled in production September 5, 2026 after controlled owned-number delivery and opt-out acceptance. The test recipient remains revoked.

## Context

Film already had encrypted SMS consent, signed Telnyx STOP/START/HELP handling, and content-free delivery-attempt storage. MVP crew operations still needed an outbound path without letting the browser resolve phone numbers, persisting message content, bypassing category consent, or repeating a provider send after an ambiguous client retry.

## Decision

Add a protected owner/producer `POST /api/providers/sms/send` route. The browser submits one to ten opaque consent-record IDs, one allowlisted operational category, a transient message body, and a fresh request key. The Worker verifies project/workspace scope, current category consent, linked-member status, batch and segment caps, and the configured quiet-hours window. Only safety/location alerts may use an emergency override, and the override requires an allowlisted reason code.

The Worker decrypts E.164 values only after every recipient passes policy. A deterministic attempt ID derived from the request key and opaque recipient ID gives Film-owned replay protection. Content-free `queued` attempt rows and redacted start audit evidence commit before any provider call. The Worker then sends each SMS through `POST https://api.telnyx.com/v2/messages`, stores only the returned provider message ID, bounded status/error codes, and segment count, and returns only opaque attempt IDs and aggregate counts. Message bodies are not stored in D1, audits, local UI state, backups, or provider responses.

Signed outbound Telnyx events atomically update the matching attempt and redacted audit evidence. A daily scheduled job deletes terminal delivery attempts and Telnyx event metadata after the explicitly configured 30–730 day period; pending attempts and consent evidence are not deleted by this job.

The September 2026 activation pass adds a final consent/member/suppression recheck before each dispatch and a route-level signed-webhook prerequisite. Redacted events are stored before shared delivery reconciliation, which also runs after the provider response associates its message ID. Reconciliation updates attempt and audit evidence together, tolerates early/reordered/duplicate callbacks, and preserves STOP suppression. Failed reconciliation returns a retryable webhook error even when the event was already stored. Worker and browser reuse one provider send-result contract, including suppressed-recipient counts.

Live readiness requires `SMS_MODE=live`, API/profile/sender configuration, encrypted identity keys, signed webhook configuration, approved quiet hours, an explicit retention period, and the retention cron. Production kept `SMS_MODE=disabled` through account verification, dedicated number, 10DLC campaign, disclosure, policy approval, and sender provisioning, then enabled it for the approved owned-number send/STOP/delivery smoke. One message was delivered and a new request after STOP was blocked before the provider.

## Consequences

- Telnyx remains replaceable because consent and delivery state are Film-owned and provider-specific content is not retained.
- A repeated request key cannot trigger a second provider send; an operator must use a new key for an intentional retry after reviewing the existing attempt.
- The first implementation caps a request at ten recipients and sixty total estimated segments. Larger crew sends require multiple explicitly keyed batches or a future queue.
- The Social application and email paths are unaffected; marketing, fundraising, investor, and promotional SMS remain outside v1.


---

<a id="0223-disable-unmapped-big-sword-summaries"></a>

Source: `docs/adr/0223-disable-unmapped-big-sword-summaries.md`

# ADR 0223: Disable Unmapped Big Sword Summaries

Date: 2026-07-10

## Status

Implemented. Product owner confirmed on 2026-07-10 that Big Sword has no Pool campaign or Store products yet, so mapping is intentionally deferred. Supersedes the production-default portion of ADR 0169.

## Context

Film production contains one canonical project: `workspace_acme/project_big_sword`. The tracked Stripe summary mappings referenced only the seed `proj_echoes` project and a separate Dust Wave fixture. Repository catalogs, production Pool/Store KV key names, and the live Stripe product catalog contain no Big Sword campaign or product reference.

The summary adapters and shared secret are operational, but reporting Pool, Store, and Stripe as live when no mapping can serve the only production project is misleading. Mapping Big Sword to Hand Relations, Film Fatale, or another unrelated public ref would silently attribute the wrong revenue.

## Decision

Set `STRIPE_PROJECT_MAPPINGS={}` and `STRIPE_SUMMARY_MODE=disabled` in production. Keep both companion adapter URLs, the redacted adapter implementation, and secret bindings in place. Deployment readiness treats the summary family as intentionally disabled and makes every URL/mapping/secret/live-mode check strict again when `STRIPE_SUMMARY_MODE=live` is requested.

Do not enable summaries until an operator supplies the exact Pool campaign slug and/or Store product refs that belong to Big Sword. The refs must exist in the companion catalog and return only aggregate money/count data through the existing adapters.

No Big Sword campaign or product needs to be created for the Film MVP. The integration remains activation-ready for a future resource: add its canonical ref, switch the explicit summary mode, pass strict readiness, and run the existing companion/live adapter smoke.

## Consequences

- Runtime readiness truthfully reports Pool, Store, and Stripe as blocked; Resend and Google remain the two live provider families.
- Big Sword cannot display unrelated seed/fixture revenue.
- No companion Worker or shared secret is removed, so activation is a small reviewed configuration change once canonical refs exist.
- Creating a new Pool campaign or Store product remains an explicit product/business action requiring campaign copy, goal, pricing, and publication decisions.


---

<a id="0224-disable-tracking-for-auth-email"></a>

Source: `docs/adr/0224-disable-tracking-for-auth-email.md`

# ADR 0224: Disable Tracking for Authentication Email

## Status

Implemented in production.

## Decision

Keep both Resend click tracking and open tracking disabled for the verified `dustwave.xyz` sending domain. Film magic-link and workspace-invite delivery remains transactional and continues to use provider delivery events, idempotency keys, hash-only suppression state, and bounded delivery-attempt metadata.

Do not route one-time authentication or invitation URLs through a click-tracking redirect and do not add tracking pixels to those messages.

## Context

The first explicit owner sign-in showed that Resend click tracking rewrote the Film magic link through a Resend redirect. That gives another service a copy of a live one-time URL and can also trigger link-scanner consumption or deliverability warnings. Resend recommends disabling tracking for sensitive login and verification email.

Primary sources:

- <https://resend.com/docs/dashboard/domains/tracking>
- <https://resend.com/docs/knowledge-base/how-do-i-maximize-deliverability-for-supabase-auth-emails>
- <https://resend.com/docs/dashboard/emails/deliverability-insights>

## Consequences

- Future Film authentication and invite links remain direct `film.dustwave.xyz` URLs.
- Film does not collect open/click engagement analytics for transactional identity email.
- Delivery, bounce, complaint, and suppression handling remains available through the signed Resend webhook path.


---

<a id="0225-meta-bearer-token-transport"></a>

Source: `docs/adr/0225-meta-bearer-token-transport.md`

# ADR 0225: Keep Meta Tokens Out of Request URLs

## Status

Implemented behind the disabled Meta production gate.

## Decision

Send Meta user and Page access tokens in `Authorization: Bearer` headers for permission, identity, Page-candidate, Page-selection, analytics, and revocation requests. Send the authorization-code and long-lived-token exchange parameters as form-encoded POST bodies.

Tests must reject `access_token`, `client_secret`, and exchanged-token values in Graph request query strings. Provider responses, application logs, audits, browser state, exports, and backups continue to exclude token values.

## Context

The initial implementation used Graph query parameters for several access-token reads and for the long-lived token exchange. Even when responses are redacted, full request URLs can appear in infrastructure diagnostics. Film can apply the stricter transport boundary before the external Meta app is activated.

## Consequences

- Meta credentials do not appear in Graph request URLs generated by Film.
- The owned-account smoke remains mandatory before `META_OAUTH_MODE=live` so provider compatibility is verified against the configured app.
- Meta remains disabled until its app/Login configuration, recoverable encryption key, review gates, and owned-account lifecycle are complete.


---

<a id="0226-fragment-bound-one-time-links"></a>

Source: `docs/adr/0226-fragment-bound-one-time-links.md`

# ADR 0226: Keep One-Time Link Tokens Out of HTTP URLs

## Status

Implemented in production.

## Decision

Generate new Film magic-link and workspace-invite URLs with the one-time token in the URL fragment. The static app consumes the fragment immediately, removes it with `history.replaceState`, and sends a magic-link token only in the explicit Worker verification POST. Invite links prefill the existing acceptance control and still require a display name plus the Worker acceptance request.

Continue accepting legacy query-parameter links until already-issued messages have expired, but do not generate new query-token links.

## Context

Query parameters are sent to the static hosting origin before browser code can remove them and may appear in infrastructure request diagnostics. URL fragments stay browser-side and are sufficient for Film's static-first handoff.

## Consequences

- The static `film-web` request URL does not contain newly issued magic-link or invite tokens.
- Link tokens remain short-lived, one-time, hash-only at rest, and are still validated by the Worker.
- Browser smoke covers fragment consumption, URL cleanup, automatic magic-link verification, and invite-token prefill.


---

<a id="0226-redacted-telnyx-provider-readiness"></a>

Source: `docs/adr/0226-redacted-telnyx-provider-readiness.md`

# ADR 0226: Redacted Telnyx Provider Readiness

Date: 2026-07-14

## Status

Implemented. Signed webhooks and outbound sending enabled September 5, 2026 after final sender assignment and controlled delivery/opt-out acceptance.

## Context

Film could validate local SMS configuration but still required manual Telnyx Portal inspection to distinguish campaign review, profile/webhook mistakes, and phone-number assignment state. The Telnyx API key must remain Worker-owned, and readiness output must not disclose credentials, profile/campaign identifiers, phone numbers, carrier identifiers, or provider error detail.

## Decision

Add an owner/producer-only `POST /api/providers/sms/provider-readiness` route and a `Check Telnyx` action in the provider inspector. The Worker performs bounded read-only requests for the configured messaging profile, campaign, carrier operation states, messaging number, phone-number campaign assignment, and keyword settings. The browser and Worker share the provider-readiness contract.

An approved campaign does not configure the actual HELP reply. The effective US/global rule must have a nonempty provider-valid response. Support the REST SDK's `info` operation with a HELP keyword and the messaging guide's `help` operation, whose built-in HELP trigger need not be repeated in the additional-keywords list. Unreadable, incomplete, or ambiguous rules fail readiness closed. Only reachability/configuration booleans leave the Worker; response wording and actual handset delivery remain separate operator acceptance checks.

The response contains only configuration booleans, aggregate carrier-state counts, normalized statuses, activation-gate state, and bounded operator blockers. It never returns configured identifiers or raw provider responses. The route audits count/status metadata only and does not assign numbers, modify the profile, enable webhooks, or send messages.

Production stages Denver quiet hours from 22:00 to 07:00 and 90-day terminal delivery/webhook metadata retention. Both Telnyx activation gates began `disabled` and became `live` on September 5 after the approved owned-number test. `TELNYX_CAMPAIGN_ID` is required for provider readiness and the final live gate.

The September 2026 activation pass distinguishes webhook-only activation from the earlier disabled preflight. Readiness requires affirmative carrier results and does not let a generic `ACTIVE` registration override specific pending, rejected, or suspended campaign state. The existing production owner-auth smoke can request these redacted diagnostics without receiving provider secrets or sending an SMS.

## Consequences

- Campaign review and carrier provisioning can be checked from Film without sharing the Telnyx API key with the browser.
- A missing or incorrect profile, webhook, number, campaign, or carrier assignment fails closed with redacted guidance.
- Provider readiness does not authorize activation. Signed webhook fixtures, an active campaign, assigned number, recipient enrollment, and the controlled owned-number smoke remain separate gates.


---

<a id="0227-local-screenplay-breakdown-graph"></a>

Source: `docs/adr/0227-local-screenplay-breakdown-graph.md`

# ADR 0227: Local Screenplay Breakdown Graph

Date: 2026-08-20

## Status

Accepted

## Decision

Replace the metadata-only Fountain and Final Draft handoff from ADR 0069 with a deterministic, revisioned screenplay breakdown graph stored in the browser-local workspace. Keep Grainery `.gwx` files metadata-only until that format has a documented parser contract.

The shared graph contains a screenplay revision, ordered scenes, canonical production elements, occurrence-level provenance, and explicit `suggested`, `confirmed`, or `dismissed` review state. Fountain and Final Draft parsers share one materialization path for stable IDs, element deduplication, occurrence limits, and review-state persistence. Fountain scene headings and character cues produce location and cast suggestions. Structured `[[category: value]]` tags cover deterministic production-element markup without a model. Final Draft XML uses a bounded XML parser and rejects DTD and entity declarations.

The browser stores source text and the parsed graph in the existing IndexedDB workspace mirror. Encrypted workspace backups include the graph. Import, review, and export do not call the Worker, upload source text, or invoke a model. A user-requested JSON export is intentionally plaintext and labels that policy in the export envelope.

Do not add canonical D1 screenplay tables yet. Server persistence requires a separate decision covering client-side content encryption, key recovery, authorization, revision conflicts, and backup/restore semantics. Canonical workspace reconciliation preserves the local screenplay collection in the meantime.

## Context

Film is replacing scheduling and budgeting tools for micro-budget non-union productions. Scheduling, day-out-of-days, budgeting, call sheets, and production reports all depend on one stable chain from script revision to scene and production element. A metadata-only document record cannot support that chain.

Local deterministic parsing covers reliable structure without sending confidential scripts to a cloud service. Small local models may later assist with ambiguous tags, synopsis drafting, or duplicate suggestions, but model output must remain optional, reviewable, and outside the canonical parse path. Optional bring-your-own-key cloud inference requires a separate explicit consent and data-boundary decision.

## Consequences

- The Breakdown workspace presents scenes, source excerpts, production elements, review progress, revision selection, and JSON export.
- Re-importing identical content keeps stable graph IDs and preserves occurrence review decisions.
- Source text participates in encrypted workspace backup because it is part of the local workspace contract.
- No screenplay source or parsed content enters operation payloads, Worker requests, D1, provider logs, or model calls.
- The next scheduling slice can consume confirmed scene and element IDs instead of reparsing files or duplicating breakdown logic.


---

<a id="0228-local-versioned-production-scheduling"></a>

Source: `docs/adr/0228-local-versioned-production-scheduling.md`

# ADR 0228: Local Versioned Production Scheduling

Date: 2026-08-20

## Status

Accepted

## Decision

Build production scheduling as an additive browser-local graph over the screenplay breakdown from ADR 0227. A schedule version references one breakdown revision and owns ordered shoot days, assigned and unassigned scene IDs, a draft or locked state, and explicit micro-budget assumptions. Duplicating a schedule creates an independent draft with new schedule and day IDs while preserving assignments and assumptions for side-by-side comparison.

Keep all schedule transitions in `packages/schema`: create, duplicate, add/remove day, assign/reorder scene, update day metadata, lock/unlock, reconcile scenes, and update bounded assumptions. The web app only renders these contracts and persists the resulting workspace state. Older local workspaces receive the documented default assumptions during workspace normalization.

Store cast and location availability as windows keyed to existing breakdown element IDs. Deterministic analysis derives required resources from reviewed scene occurrences, reports unavailable resources as blocking conflicts, missing confirmation as warnings, and assigned undated days as warnings. The same requirement graph produces a cast day-out-of-days work/off matrix.

Scenario analysis reports observed shoot days, assigned scenes, location transitions, estimated company-move minutes, peak scenes/locations/cast per day, consecutive dated days, availability conflicts, and explicit assumption breaches. It does not infer page count, scene duration, labor compliance, cost, or a preferred scenario. Comparison shows neutral B-minus-A deltas.

The default micro-budget assumptions are six scenes per day, two locations per day, eight cast per day, six consecutive shoot days, and 90 minutes reserved per company move. These are editable per version and bounded, not hidden recommendations.

Schedules, availability windows, DOOD rows, assumptions, and analysis remain local and private by default. They enter encrypted workspace backups. Explicit stripboard JSON export is metadata-only, declares `user_requested_schedule_metadata_export`, and omits screenplay source text. No scheduling data enters Worker requests, D1, provider logs, operation payloads, or model calls.

## Context

Micro-budget non-union productions need fast manual scheduling, visible cast/location constraints, and inexpensive scenario comparison. The screenplay graph already provides stable scene, cast, and location identities, so a separate scheduling parser or resource store would create drift. Local deterministic analysis also preserves script privacy and works offline.

## Consequences

- Schedule versions can be created, reordered, dated, duplicated, locked, compared, backed up, restored, and exported without network access.
- Availability and DOOD use the same reviewed occurrence graph as Breakdown.
- Assumption breaches remain explainable and tied to exact day metrics.
- Company moves count adjacent assigned scene-location changes; the minute estimate is only that count multiplied by the version's explicit assumption.
- Canonical D1 schedule persistence remains deferred until client-side encryption, key recovery, authorization, revision conflict, collaboration, and restore contracts are decided.


---

<a id="0229-local-schedule-budget-estimates"></a>

Source: `docs/adr/0229-local-schedule-budget-estimates.md`

# ADR 0229: Local Schedule Budget Estimates

Date: 2026-08-20

## Status

Accepted

## Decision

Add optional browser-local budget scenarios keyed to production schedule versions. Each scenario stores explicit user-entered assumptions for crew day cost, cast day rate, location day rate, equipment day cost, company-move cost, crew headcount, meal cost per person, and contingency basis points. Every assumption defaults to zero and money remains integer cents throughout calculation and persistence.

Keep creation, bounded updates, and estimation in `packages/schema`. The estimator reuses the schedule resource-requirement, day-out-of-days, and scenario-analysis helpers: shoot days come from days with assigned scenes, cast work days come from DOOD, location days come from unique reviewed scene-heading locations per scheduled day, company moves come from adjacent scene-location transitions, and meal person-days combine the entered crew headcount with working cast. The web app renders and persists this shared result rather than reimplementing production calculations.

Treat this output as a transparent planning estimate, not an accounting ledger or compliance engine. Film does not infer rates, union or guild rules, fringes, payroll taxes, overtime, turnaround, penalties, kit rentals, insurance, or local labor requirements. The existing Expenses workspace remains the source for planned and actual ledger entries.

Budget scenarios remain in IndexedDB and encrypted workspace backups. Explicit stripboard export may include the assumptions and calculated line items under `user_requested_schedule_metadata_export`; the export remains metadata-only and omits screenplay source text. No budget scenario or estimate enters Worker requests, D1, provider logs, operation payloads, or model calls.

## Context

Micro-budget non-union productions need a fast way to understand how schedule choices affect broad cost categories before building a detailed budget. The versioned schedule already owns the relevant days, reviewed cast/location requirements, and company-move count. Reusing those contracts keeps cost estimates explainable and prevents a second production graph from drifting.

## Consequences

- A filmmaker can compare rough schedule costs without cloud processing or hidden rate assumptions.
- Every line item can be traced to an entered rate and an observed schedule quantity.
- Schedule estimates and expense-ledger records remain deliberately separate.
- Unsupported labor, tax, and compliance calculations are visible omissions instead of misleading defaults.
- Canonical D1 persistence and collaborative budget editing remain deferred with the rest of the private screenplay/schedule graph.


---

<a id="0230-local-schedule-linked-call-sheets"></a>

Source: `docs/adr/0230-local-schedule-linked-call-sheets.md`

# ADR 0230: Local Schedule-Linked Call Sheets

Date: 2026-08-20

## Status

Accepted

## Decision

Generate production call sheets as browser-local records from a selected production schedule day. A generated record references the project, screenplay breakdown, schedule version, and shoot day; snapshots the ordered scene IDs, day ordinal, total shoot days, and source schedule update timestamp; and derives a cast-call snapshot from reviewed cast occurrences in those scenes.

Keep generation, bounded detail edits, cast-call edits, draft/final transitions, and manifest construction in `packages/schema`. Editable fields are title, date, general call, estimated wrap, primary location, parking/access, nearest hospital, weather notes, general notes, safety notes, and per-cast call/notes. Final sheets reject edits until explicitly reopened.

Do not copy project crew, equipment, or document rows into the call sheet. The workspace and export read those existing collections directly. Do not automatically update a generated sheet after its source schedule changes; report source drift and preserve the issued snapshot.

Store call sheets in IndexedDB and encrypted workspace backups. Explicit Markdown export includes bounded scene metadata, cast calls, logistics/safety notes, and existing project crew/gear/document metadata. It omits screenplay source text, contact fields, provider credentials, OAuth values, raw attachment bytes, private Worker state, and raw import paths. No call-sheet state enters Worker requests, D1, operation payloads, provider logs, or model calls.

## Context

Micro-budget productions need an editable daily handoff derived from the schedule, but a call sheet is an issued operational artifact rather than a live stripboard view. Snapshotting stable IDs prevents later schedule experiments from silently altering a finalized day's instructions. Reusing project collections avoids drift in crew, gear, and attachment lists.

## Consequences

- Assigned schedule days can become usable call sheets without cloud processing.
- Final/reopen state makes issuance intentional without pretending to provide signatures or distribution proof.
- Source changes are visible and do not mutate the snapshot.
- Cast requirements come from the same reviewed screenplay occurrence graph as schedule DOOD and availability analysis.
- PDF rendering, live weather, email/SMS distribution, acknowledgments, and canonical collaboration remain separate future decisions.


---

<a id="0231-local-daily-production-reports"></a>

Source: `docs/adr/0231-local-daily-production-reports.md`

# ADR 0231: Local Daily Production Reports

Date: 2026-08-20

## Status

Accepted

## Decision

Add browser-local daily production reports derived one-to-one from generated call sheets. A report snapshots the call-sheet/project/schedule/breakdown identities, planned scene IDs, date, day ordinal, primary location, cast count, crew count, and source call-sheet update timestamp.

Keep creation, bounded detail updates, per-scene planned/completed/partial/held transitions, draft/final transitions, and summary calculations in `packages/schema`. Actual detail fields cover crew call, first shot, meal start/end, camera wrap, crew wrap, crew/cast/background/meal/setup/take/recorded-minute counts, actual weather, delays, production notes, safety/incident notes, and next-day/pickup notes. Summary calculations report exact scene counts and completion percentage plus overnight-safe gross, meal, and working minutes. They do not infer overtime, union compliance, or payroll obligations.

Do not copy actual spending into production reports. Expenses remain the planned/actual ledger. Do not automatically rewrite a report after its source call sheet changes; show source drift and preserve the report snapshot.

Store reports in IndexedDB and encrypted workspace backups. Explicit local exports provide a human-readable Markdown daily report and a UTF-8 CSV scene-status table with stable columns. Every CSV cell is quoted and formula-leading values are prefixed before export. Both formats omit screenplay source text, contact fields, provider credentials, OAuth values, raw attachment bytes, private Worker state, and raw import paths. No report state enters Worker requests, D1, operation payloads, provider logs, or model calls.

## Context

Micro-budget productions need a lightweight end-of-day record that connects what was planned to what was completed. The generated call sheet already owns the stable scene snapshot, so it is the correct source boundary. Local deterministic summaries preserve privacy and remain usable offline.

## Consequences

- Each generated call sheet can produce one traceable daily report.
- Overnight timing math is explicit, while labor and overtime compliance remain intentionally unsupported.
- Final/reopen state makes report handoff intentional without claiming signatures or delivery proof.
- Markdown supports human review and formula-safe CSV supports spreadsheet handoff.
- PDF rendering, signatures, live distribution, and canonical collaborative reports remain separate future decisions.


---

<a id="0232-local-production-location-scouting"></a>

Source: `docs/adr/0232-local-production-location-scouting.md`

# ADR 0232: Local Production Location Scouting

Date: 2026-08-20

## Status

Accepted

## Decision

Add browser-local production location records for micro-budget scouting and shoot logistics. A record can link to one active screenplay location element or use a manual name against the selected local breakdown. It stores bounded scouting/hold/confirmed/released state, permit state, address/contact details, parking/access/load-in, power, sound, restroom, accessibility, nearest-hospital, manual weather, safety, general notes, and IDs referencing existing project documents.

Keep record creation, normalization, updates, derived manifests, and call-sheet mapping in `packages/schema`. Derive scene usage from the breakdown occurrence graph, schedule use from existing stripboard versions, and availability from existing resource windows. Do not copy those records into the location store. Do not copy document metadata or bytes; retain document IDs only.

Allow only a confirmed location to populate a draft call sheet. Applying it explicitly snapshots name/address, parking/access, hospital, weather, and safety fields through the existing call-sheet update helper. Final call sheets reject the mutation until reopened. Existing call-sheet source-drift behavior remains unchanged.

Store scouting records in IndexedDB and encrypted workspace backups. Do not send them to the Worker, D1, operation sync, providers, weather services, or models. Explicit local Markdown export includes contact details because it is an operational location handoff; the export states that policy and excludes screenplay source text, raw attachment bytes, provider/private state, and raw import paths. Imported Notion location rows remain a read-only source-review table.

## Context

Micro-budget productions need practical scouting and site-readiness information before issuing a call sheet. Film already owns breakdown locations, stripboards, availability, documents, and call-sheet logistics. A separate schedule, availability table, document store, or live weather dependency would create conflicting sources of truth and weaken local/private defaults.

## Consequences

- One scouting record can bridge script requirements, schedule use, resource availability, documents, and call-sheet logistics without copying those domains.
- Manual candidates remain useful before breakdown review, while linked records gain deterministic scene and schedule context.
- Contact and access details stay encrypted at rest in local backups and appear only in an explicit user-generated handoff.
- Weather is manual in this slice; local model assistance, live weather retrieval, maps, photos, permits/signatures, and collaborative canonical persistence remain separate decisions.


---

<a id="0233-local-production-talent-management"></a>

Source: `docs/adr/0233-local-production-talent-management.md`

# ADR 0233: Local Production Talent Management

Date: 2026-08-20

## Status

Accepted

## Decision

Add browser-local production talent records for micro-budget casting and shoot readiness. A record can link to one active screenplay cast element or use a manual character against the selected local breakdown. It stores bounded prospect/contacted/auditioning/offered/cast/released state, performer and direct/representative contacts, paperwork readiness, user-entered rate basis/amount, deal, travel, dietary, accessibility, wardrobe/fitting, general notes, and IDs referencing existing project documents.

Keep record creation, normalization, updates, derived manifests, and call-sheet mapping in `packages/schema`. Reuse the same internal production-resource helpers as Locations to derive scene usage from the occurrence graph, schedule use from existing stripboard versions, and availability from existing windows. Reuse the same web resource-usage renderer and document-reference checkbox renderer. Do not copy schedule, availability, scene, document metadata, or document bytes into talent records.

Allow only a linked record in `cast` state with a performer name to populate a draft call sheet that requires that exact screenplay character. Snapshot only the performer name into the existing cast call. Final call sheets reject the mutation until reopened.

Store talent records in IndexedDB and encrypted workspace backups. Do not send them to the Worker, D1, operation sync, providers, payroll systems, or models. Treat rate basis and amount as user-entered deal notes only: do not infer payroll, taxes, fringes, union terms, legal sufficiency, or labor compliance, and do not mutate the Expenses ledger or schedule-budget assumptions. Explicit local Markdown export includes the private fields because it is a user-triggered operational handoff; the export states that limitation and excludes screenplay source text, raw attachment bytes, provider/private state, and raw import paths.

## Context

Micro-budget non-union productions still need one place to connect characters, casting progress, performer readiness, schedule use, availability, paperwork references, and call sheets. Film already owns the underlying cast graph, stripboards, availability, project documents, and call-sheet cast calls. A separate casting schedule, contact database, document store, or inferred deal calculator would create conflicting sources of truth and weaken local/private defaults.

## Consequences

- One talent record bridges character requirements, casting readiness, entered terms, schedule use, availability, documents, and call-sheet performer names without copying those domains.
- Manual characters remain usable before breakdown review; linked records gain deterministic scene and call-sheet behavior.
- Sensitive contact and readiness details stay encrypted at rest in local backups and appear only in an explicit user-generated handoff.
- Audition media, releases/signatures, payroll integration, union-rule engines, agent portals, collaborative canonical persistence, and local-model assistance remain separate decisions.


---

<a id="0234-local-production-sides"></a>

Source: `docs/adr/0234-local-production-sides.md`

# ADR 0234: Local Production Sides

Date: 2026-08-20

## Status

Accepted

## Decision

Add a selected-project Sides workspace derived from the existing production call-sheet snapshot and its pinned screenplay breakdown. Keep the projection in `packages/schema`: preserve the call sheet's scene order, attach only matching per-scene cast-call snapshots, retain source line metadata, and report missing scene IDs. Reject a call sheet and breakdown that do not belong to the same project and source relationship.

Do not create a sides record, scene-text copy, new IndexedDB collection, backup payload, operation kind, D1 table, provider adapter, or model workflow. Reuse the selected call-sheet state and existing screenplay source. Report source-schedule drift and a newer available screenplay revision without silently changing the pinned breakdown.

Allow two explicit local source exports: Markdown for editable handoff and standalone letter-sized HTML for browser printing. Both include the scheduled screenplay scene text because that is the user's requested artifact. The HTML escapes all source and metadata, contains no script or external resources, and sets a restrictive content-security policy. Both formats exclude contact fields, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import paths.

## Context

Micro-budget productions need daily sides for cast and crew, but Film already owns the necessary screenplay scenes, stripboard, and call-sheet snapshot. Persisting another source-text collection would create revision ambiguity and enlarge backup, migration, and privacy surfaces. Existing call-sheet and report exports intentionally omit screenplay source text, so sides require a separate, visibly explicit source-export boundary.

## Consequences

- Sides stay consistent with the issued call sheet without duplicating screenplay data.
- New revisions and schedule edits remain visible without rewriting an operational snapshot.
- Screenplay text appears only on screen or in a user-triggered local sides download; it is not sent to the Worker, D1, providers, or models.
- Markdown and printable HTML cover the first micro-budget handoff without adding PDF rendering or a browser print service.
- Watermarks, revision-color page rendering, scene-specific annotations, distribution tracking, and signed delivery remain separate decisions.


---

<a id="0235-local-production-shot-lists"></a>

Source: `docs/adr/0235-local-production-shot-lists.md`

# ADR 0235: Local Production Shot Lists

Date: 2026-08-20

## Status

Accepted

## Decision

Add browser-local shot records linked to one scene in one screenplay breakdown. Store only shot-specific decisions: in-scene ordinal, editable shot number, description, planned/ready/captured/omitted status, framing, angle, movement, lens, camera/support, frame rate, bounded setup estimate/group, sound/lighting/general notes, and IDs referencing existing project documents.

Keep creation, normalization, updates, in-scene ordering, and derived manifests in `packages/schema`. Derive scene metadata, schedule-day use, and generated call-sheet use from existing breakdown, stripboard, and call-sheet collections. Reordering changes ordinals only among shots linked to the same project, breakdown, and scene. Do not copy screenplay text, scene headings, schedule rows, call-sheet data, document metadata, or document bytes into shot records.

Persist shots in the existing IndexedDB workspace and encrypted backup. Do not add an operation kind, D1 table, provider adapter, or model workflow. Generate local Markdown and formula-safe UTF-8 CSV handoffs from one shared normalized export-row projection. Both formats exclude screenplay source text, contacts, provider/private state, raw attachment bytes, and raw import paths.

## Context

Micro-budget productions need a practical shot plan that connects creative camera decisions to the day schedule. Film already owns the scene graph, stripboards, call sheets, and project documents. A standalone shot spreadsheet duplicates those relations and drifts quickly; a generated or model-inferred shot list would also be too opinionated for the local/private default.

## Consequences

- Shot planning stays connected to screenplay scenes and current production use without creating another scene or schedule source of truth.
- Users enter every creative and setup decision; Film performs no model inference or automated coverage recommendation.
- In-scene ordering is stable and independently editable from stripboard scene order.
- Sensitive shot plans remain encrypted in backups and appear outside Film only through an explicit local export.
- Storyboard image annotation, floor plans, camera reports, automatic shot generation, and collaborative canonical persistence remain separate decisions.


---

<a id="0236-local-screenplay-revision-reconciliation"></a>

Source: `docs/adr/0236-local-screenplay-revision-reconciliation.md`

# ADR 0236: Local Screenplay Revision Reconciliation

Date: 2026-08-21

## Status

Accepted

## Decision

Compare two browser-local screenplay breakdowns through a shared deterministic schema helper. Match scenes in three bounded passes: unique normalized production scene number, exact normalized scene content, then same-heading positional order. Report every next-revision scene as unchanged, changed, or added and every unmatched prior scene as removed. Match production elements only by exact category plus normalized name.

When a user imports one screenplay file while a prior revision is selected, carry matching occurrence-level human review states into the new graph. Do not carry review state during multi-file import because one unambiguous base cannot be inferred.

Keep downstream changes explicit. `Carry planning forward` creates draft copies of schedules linked to the prior revision, preserving matched day assignments and placing added scenes in the unassigned lane. Copy matching budget assumptions and cast/location availability into the new draft graph. Relink only shots with matched scenes and Talent/Location records with exact element matches. Leave unmatched records linked to the prior revision for manual review. Mark shots carried onto changed scenes as source-changed so their creative decisions receive another review.

Use source-record IDs on generated schedule, budget, and availability copies to make the action idempotent. Preserve every prior schedule and all final call sheets, sides, and production reports as historical snapshots. Export only a metadata-level Markdown revision report; screenplay source text remains available solely through the existing explicit breakdown/sides export paths.

## Context

Scene IDs intentionally include the imported revision hash, so the original same-breakdown reconciliation helper cannot map production work onto a changed draft. Dropping all assignments or mutating issued daily documents would make revision import too costly and unsafe for a micro-budget crew. A local deterministic comparison preserves script privacy and makes every carry-forward decision explainable without a cloud or local model.

## Consequences

- Revision comparison, review carry-forward, and downstream planning migration share schema helpers instead of workspace-specific matching logic.
- New and removed scenes remain visible and unmatched rather than being guessed by fuzzy similarity.
- Existing draft and locked schedules remain intact; generated copies always start unlocked for review.
- Call sheets, sides, and reports remain valid records of what was issued or completed against a specific draft.
- Ambiguous renamed scenes or elements require manual review and stay on the previous revision.
- All revision and carry-forward data enter encrypted workspace backups but never Worker requests, D1, provider logs, operation payloads, or model calls.


---

<a id="0237-local-screenplay-search-and-manual-tags"></a>

Source: `docs/adr/0237-local-screenplay-search-and-manual-tags.md`

# ADR 0237: Local Screenplay Search And Manual Tags

Date: 2026-08-21

## Status

Accepted

## Decision

Add search and manual tagging as shared operations over the existing browser-local screenplay breakdown graph. Search normalizes a bounded query and returns ordered scene IDs with explicit heading, source, synopsis, and active-element match categories. The browser keeps query text in ephemeral UI state and excludes it from persisted UI preferences.

Add missed elements through a shared schema transition keyed by selected scene, supported production category, and normalized element name. Reuse an existing element with the same category/name across the revision. When that element already occurs in the selected scene, confirm the existing occurrences instead of creating duplicates. Otherwise append one confirmed manual occurrence using a bounded display name/excerpt and a line clamped to the selected scene. Enforce the parser graph's 5,000-element and 50,000-occurrence limits.

Use one exported element-name normalizer in both the parser and manual transition. Source text is immutable; manual tags enrich only the production graph. Existing review controls can dismiss or reconfirm the resulting occurrence, and existing schedule, DOOD, call-sheet, Location, Talent, revision, export, and backup paths consume it without special cases.

## Context

Deterministic parsing intentionally favors explainability and will miss production-specific references. Requiring a filmmaker to edit and re-import the source file for every missed prop or sound cue breaks down during prep. Local source search and direct scene tagging cover that correction loop without a model, upload, parallel element store, or duplicated downstream logic.

## Consequences

- Search queries disappear on reload and never enter workspace backups, operation payloads, D1, Worker logs, providers, or model calls.
- Manual elements and occurrences enter the existing local breakdown graph and encrypted backups.
- Manual tags are immediately available to every graph-derived workspace.
- Adding the same category/name to the same scene is idempotent at the graph level.
- Search results expose match categories, not copied snippets or a second search index.


---

<a id="0238-local-unit-aware-production-scheduling"></a>

Source: `docs/adr/0238-local-unit-aware-production-scheduling.md`

# ADR 0238: Local Unit-Aware Production Scheduling

Date: 2026-08-21

## Status

Accepted

## Decision

Extend each existing production shoot day with one allowlisted unit identity: `main` or `second`. Keep main unit as the default and normalize older local schedules with no unit field to main unit. Unit edits use the existing locked-schedule transition, persistence, backup, reconciliation, and metadata-export paths; do not add a unit calendar, schedule collection, or Worker model.

Use the existing breakdown occurrence graph to detect a cast element required by main- and second-unit days on the same calendar date. Report one deterministic blocking conflict per cast member/date with the affected source scene IDs. Keep normal availability conflicts separate. Calculate consecutive shoot-day streaks independently for each unit so concurrent work does not inflate the observed metric.

Snapshot the selected shoot day's unit when creating a call sheet. Carry that snapshot through sides, daily reports, shot/resource-use projections, and explicit local handoff exports. Later schedule changes do not rewrite issued call sheets or reports.

## Context

Micro-budget productions may use a small second unit for inserts, exteriors, pickups, or parallel coverage. A separate schedule would duplicate scene assignment, availability, DOOD, budgeting, call-sheet, and revision state. Adding unit identity to the existing shoot-day graph supports the workflow while preserving one source of truth. The most actionable deterministic collision is a performer expected by two units on the same date.

## Consequences

- Main and second units share one versioned stripboard, scene graph, availability model, DOOD derivation, and backup path.
- Unit changes are rejected while a schedule is locked.
- Same-date cross-unit cast use is visible before call sheets are issued.
- Location concurrency is not automatically blocked because a location may support parallel work; availability and production judgment remain explicit.
- Unit identity and deterministic analysis remain local and never enter Worker requests, D1, provider logs, operation payloads, or model calls.
- Scene splitting remains a separate schedule-assignment decision.


---

<a id="0239-local-source-range-scene-splitting"></a>

Source: `docs/adr/0239-local-source-range-scene-splitting.md`

# ADR 0239: Local Source-Range Scene Splitting

Date: 2026-08-21

## Status

Accepted

## Decision

Represent a split scene as two bounded schedule-only parts referencing one screenplay scene ID, explicit `A`/`B` labels, and non-overlapping absolute source-line ranges. Splitting is allowed only after a valid line inside the selected scene. It removes the whole-scene assignment and places both parts in that same schedule lane. Each part can then move and reorder independently through shared schedule transitions.

Merging removes every part for that source scene and returns the whole scene to Unassigned. This avoids silently choosing one of several shoot days. Locked schedules reject split, move, reorder, and merge transitions through the existing lock boundary.

Derive cast, location, availability, DOOD, scenario, budget, shot-use, and resource-use data from each part's source scene ID through the existing requirement graph. Count parts as separate strip assignments for per-day strip limits while deduplicating their source scene for cast, location, and company-move requirements on one day.

Snapshot a schedule day's parts into a generated call sheet. Sides slice the pinned local screenplay scene text only at those snapshotted ranges; no sides or screenplay copy is stored. Revision carry-forward preserves parts only for unchanged source scenes and shifts their ranges by the matched scene's line offset. Changed or unresolved split scenes collapse to the new revision's Unassigned source scene for manual review.

## Context

A montage under one heading or a long scene may need to shoot across several days. Duplicating the source scene would corrupt breakdown identity, inflate resource relationships, and make revision reconciliation ambiguous. A schedule-only range reference supports the production workflow while retaining one screenplay and one production-element graph.

## Consequences

- Scene parts enter the existing local schedule collection, encrypted backups, and explicit metadata-only stripboard export.
- Source text remains immutable and never enters schedule records, Worker requests, D1, provider logs, operation payloads, or model calls.
- Call sheets retain source scene identity plus part labels/ranges; sides read the pinned local source only when viewed or explicitly exported.
- One split currently creates two parts. Further subdivision requires merging and selecting a new boundary.
- Merging always returns the whole source scene to Unassigned for an explicit scheduling decision.


---

<a id="0240-explicit-draft-call-sheet-schedule-sync"></a>

Source: `docs/adr/0240-explicit-draft-call-sheet-schedule-sync.md`

# ADR 0240: Explicit Draft Call-Sheet Schedule Sync

## Status

Accepted.

## Context

Micro-budget schedules change after call-sheet logistics and performer details have already been entered. A stale warning protects issued documents, but recreating a sheet loses useful work and encourages parallel copies of schedule data.

## Decision

Film exposes `Sync schedule` only when a draft call sheet's source schedule changed. Call-sheet creation and sync use one shared local snapshot builder for schedule-owned date, unit, day count, ordered whole-scene/split strips, source version, and reviewed cast requirements.

Sync preserves the call-sheet ID, title, general call and wrap, location/access/hospital/weather/safety/general notes, and matching performer/cast-call edits. Newly required cast starts at the sheet's general call time; removed requirements leave the draft. Final sheets return unchanged until explicitly reopened.

The transition stays in `packages/schema`, persists through the existing local workspace path, creates a bounded local audit event, and makes no Worker, D1, provider, or model request. Existing sides and production reports keep their own pinned-source behavior.

## Consequences

- Schedule drift remains visible and requires an operator action.
- Manual logistics are not silently replaced by regenerated schedule defaults.
- Split ranges and main/second-unit identity use the same projection in creation and sync.
- Issued final sheets and downstream daily documents remain historical by default.


---

<a id="0241-local-screenplay-element-list-projection"></a>

Source: `docs/adr/0241-local-screenplay-element-list-projection.md`

# ADR 0241: Local Screenplay Element-List Projection

## Status

Accepted.

## Context

Micro-budget departments need a complete, filterable inventory they can hand off without re-reading every scene or exposing the screenplay. Film already has one reviewed scene, element, and occurrence graph that feeds scheduling and resource workflows. A second inventory store would duplicate review state and let breakdown, schedule, and handoff results drift.

## Decision

Film derives the Element List through `buildScreenplayElementReport` in `packages/schema`. The selected category applies across the whole selected revision. Rows contain active element metadata, non-dismissed occurrence counts, unique scene uses, and first occurrence. Dismissed elements and occurrences are excluded, and screenplay source text is not copied into the projection.

The Breakdown table, Markdown handoff, and formula-safe UTF-8 CSV handoff consume those same projected rows. Manual tags and review decisions therefore appear immediately without synchronization or a parallel persistence model.

## Consequences

- Breakdown review, manual tags, scheduling derivations, and element handoffs remain on one graph.
- Explicit element-list exports omit screenplay text, contacts, provider state, private Worker state, attachments, and raw import paths.
- The existing breakdown JSON remains the explicit full-plaintext export.
- PDF and formatted workbook output are deferred; Markdown and CSV cover the MVP handoff without adding document-generation infrastructure.


---

<a id="0242-local-screenplay-element-occurrence-workflow"></a>

Source: `docs/adr/0242-local-screenplay-element-occurrence-workflow.md`

# ADR 0242: Local Screenplay Element-Occurrence Workflow

## Status

Accepted.

## Context

An element inventory is incomplete for production departments unless it answers where each item appears and lets a user reuse an existing item without entering a near-duplicate. Film already stores reviewed scene-element occurrences and has one bounded helper for normalized manual tags. A separate occurrence store or copy/paste buffer would duplicate that graph and introduce reconciliation work.

## Decision

The shared element-report projection includes ordered, source-free occurrence positions: occurrence ID, scene ID/ordinal/number/heading, source line, and non-dismissed review state. It excludes screenplay source text and occurrence excerpts. The Breakdown Element List renders these positions in an expandable ledger and uses scene IDs to navigate back to the source scene.

Applying an inventory element to the selected scene delegates to `addManualScreenplayElementOccurrence`. The helper reuses the normalized category/name identity, confirms an existing dismissed or suggested occurrence, creates at most one missing occurrence, and enforces the existing graph caps. No additional element or occurrence persistence model is introduced.

Markdown and formula-safe UTF-8 CSV handoffs serialize the same ordered position metadata used by the UI.

## Consequences

- Departments can audit every active occurrence and return to its scene without exposing script text in the report.
- Repetitive breakdown work reuses an existing element identity and updates scheduling/resource derivations immediately.
- Direct manual entry, inventory reuse, occurrence navigation, and exports remain consistent because they share one graph and projection.
- Multi-scene selection and bulk apply remain separate future decisions. Deterministic duplicate suggestions and explicit canonical merges are defined by ADR 0243; category reassignment is defined by ADR 0244.


---

<a id="0243-local-screenplay-element-duplicate-merge"></a>

Source: `docs/adr/0243-local-screenplay-element-duplicate-merge.md`

# ADR 0243: Local Screenplay Element Duplicate Merge

## Status

Accepted.

## Context

Manual and parsed breakdown work can produce near-identical element names that split scene counts and planning references. Automatically collapsing names is unsafe: similar names may represent distinct characters, places, props, or units, and any model or provider path would weaken the screenplay's private-by-default boundary.

## Decision

Film derives duplicate candidates locally from active elements in one selected category. The shared schema helper compares at most 300 deterministically sorted names and returns at most 100 normalized-match, contained-name, shared-term, or similar-spelling candidates. The result contains names, IDs, counts, scores, and reasons only; it contains no screenplay source text or occurrence excerpts.

Film never auto-merges. The Breakdown Element List requires the user to open a candidate and choose the canonical element. One shared workspace transaction then:

- removes the unkept element;
- reassigns its distinct occurrences to the kept element;
- collapses exact scene/line collisions while aggregating review state;
- relinks live availability, location, and talent references;
- removes exact duplicate availability windows created by the relink; and
- leaves generated call-sheet cast-call IDs and names unchanged as issued-document snapshots.

The transaction updates only local workspace data and enters the existing IndexedDB and encrypted-backup paths. It creates no Worker operation, D1 row, provider request, or model call.

## Consequences

- Departments can repair split counts and planning links without re-tagging scenes.
- Similar names remain distinct until a human chooses the canonical identity.
- Detection and mutation semantics are reusable and testable outside the browser renderer.
- Name-only matching will miss semantic aliases and may surface false positives; optional local-model assistance remains a future, separately consented decision.


---

<a id="0244-local-screenplay-element-category-moves"></a>

Source: `docs/adr/0244-local-screenplay-element-category-moves.md`

# ADR 0244: Local Screenplay Element Category Moves

## Status

Accepted.

## Context

Deterministic parsing and manual tags can classify the right production element under the wrong department. Deleting the element and re-tagging every scene would discard reviewed occurrence identity and can split downstream production planning. Category changes also cannot silently invalidate cast/location availability, talent, or scouting links.

## Decision

Film exposes an explicit destination-category form on each active Element List row. The shared workspace helper changes the existing element category without changing its ID or occurrences. The UI follows the element into the destination filter after success.

When the destination already contains an active element with the same normalized name, the option discloses that it will combine with the existing item. The transaction temporarily recategorizes the source and delegates to the canonical merge helper from ADR 0243, preserving its occurrence deduplication and reference rules rather than implementing a second merge path.

Before either path, Film checks live references. Availability requires a destination matching its cast/location resource category, location records require `location`, and talent records require `cast`. An incompatible move fails without mutation. Generated call-sheet cast calls are historical snapshots and remain unchanged.

The transaction is browser-local, persists through the existing IndexedDB/encrypted-backup path, and creates no Worker operation, D1 write, provider request, or model call.

## Consequences

- A department correction preserves reviewed scene work and stable graph identity.
- Exact destination collisions cannot create a second same-name item.
- Live resource semantics fail closed instead of becoming dangling or misleading.
- Resolving an incompatible live link requires a separate explicit resource-management workflow; the category move does not delete availability, scouting, or talent data.


---

<a id="0245-local-breakdown-script-stripboard-order"></a>

Source: `docs/adr/0245-local-breakdown-script-stripboard-order.md`

# ADR 0245: Local Breakdown Script and Stripboard Order

## Status

Accepted.

## Context

Breakdown review naturally starts in screenplay order, while production review often needs to follow the current shooting sequence. Copying scene rows into a schedule-specific breakdown view would create another scene store and make split strips or revision drift capable of hiding source scenes.

## Decision

Film keeps script order as the default and persists only a `script` or `schedule` UI preference. A shared schema projection accepts one breakdown and one schedule. It uses schedule order only when project and breakdown IDs match; otherwise it returns screenplay order.

Schedule order walks each shoot day in stored order, followed by unassigned strips. Scene IDs and split-part source scene IDs enter the same ordered set, so multiple parts expose the source scene once. Any known screenplay scene absent from the schedule is appended in script order. Search filters the chosen projection after ordering.

The segmented control disables Schedule when no matching stripboard exists. The projection mutates and copies neither screenplay nor schedule records and creates no Worker, D1, provider, or model path.

## Consequences

- Breakdown review can follow the active shooting plan without leaving the source workspace.
- Split scenes and stale schedules cannot duplicate or hide source scenes.
- Switching order changes presentation only; scene selection, tags, review state, and exports retain the same identities.
- Day-break labels and per-part rows remain Stripboard concerns; Breakdown intentionally shows each source scene once.


---

<a id="0246-local-cast-dood-travel-hold"></a>

Source: `docs/adr/0246-local-cast-dood-travel-hold.md`

# ADR 0246: Local Cast DOOD Travel and Hold Days

## Status

Accepted.

## Context

A work/off day-out-of-days report omits travel and paid or reserved hold days that affect a micro-budget cast plan. Treating those states as free-form notes would make them difficult to compare, duplicate, reconcile, and export.

## Decision

Store explicit `travel` or `hold` annotations on a versioned production schedule, keyed by active screenplay cast element ID and shoot-day ID. Off is represented by no annotation. Work remains derived from assigned scene requirements and cannot be manually overridden.

The shared schema helper validates the matching breakdown, active cast identity, existing day, unlocked schedule, allowed state, duplicate key, and a 5,000-annotation cap. Schedule duplication remaps annotation day IDs, day removal deletes affected annotations, element merge relinks and deduplicates them, and category moves away from Cast fail while a live annotation exists. Revision carry-forward retains annotations only when both the day and cast identity resolve.

The web DOOD matrix exposes Off, Travel, and Hold controls only for non-work cells. Locked schedules disable them. Analysis returns separate work, travel, hold, and idle totals; idle counts only unannotated off days between first and last work days. Existing encrypted backup and explicit metadata-only stripboard export paths carry the versioned annotations without screenplay source text, Worker requests, D1 writes, provider calls, or model calls.

## Consequences

- Producers can account for cast travel and hold commitments without a second calendar or resource store.
- Work always reflects the stripboard, so manual status cannot conceal a scheduled scene.
- Unresolved cast identities are dropped instead of being guessed across screenplay revisions.
- Historical call-sheet cast snapshots remain unchanged when live breakdown elements merge or move.


---

<a id="0247-local-screenplay-element-copy-paste"></a>

Source: `docs/adr/0247-local-screenplay-element-copy-paste.md`

# ADR 0247: Local Screenplay Element Copy and Paste

## Status

Accepted.

## Context

Repeated locations, props, wardrobe, equipment, and cast combinations make scene-by-scene breakdown entry slow. Creating a second clipboard-shaped element store or copying occurrence excerpts would introduce drift and retain more script-adjacent data than the workflow needs.

## Decision

Film can copy the active elements visible in the selected scene and category filter, up to 100 IDs. The in-app selection stores only the breakdown ID, source scene ID, source label, and element IDs in transient application memory. It is not the OS clipboard, is not persisted, and clears on reload or revision change.

A shared schema batch helper validates the target scene and every unique active element before making any change. It delegates each write to the same existing-element occurrence helper used by single-element reuse and manual exact-name reuse. The result reports added, reactivated, and already-present counts. Repeated paste is idempotent for an element and target scene; an existing dismissed occurrence is confirmed rather than duplicated.

The operation stays inside the selected local screenplay graph. It does not copy source text or excerpts into its summary and creates no Worker request, D1 row, operation payload, provider call, or model call.

## Consequences

- Repetitive breakdown work can be applied across scenes without recreating element identities.
- Category filtering doubles as a bounded copy selection without adding persistent checkbox state.
- A stale, cross-revision, unknown, or dismissed element selection fails before partial mutation.
- Schedule, DOOD, resource, report, and export projections see pasted occurrences immediately through the existing graph.


---

<a id="0248-local-batch-strip-moves"></a>

Source: `docs/adr/0248-local-batch-strip-moves.md`

# ADR 0248: Local Batch Strip Moves

## Status

Accepted.

## Context

Micro-budget producers frequently regroup several strips when balancing locations, cast, company moves, and parallel units. Reassigning each strip through a separate control is slow and can leave a partially moved group if one reference is stale.

## Decision

Film supports a transient schedule-scoped selection of up to 200 whole-scene or split-part strip IDs. The selection stays in application memory and clears after a successful move, any persisted schedule mutation, schedule-version change, or reload. It is disabled when the selected schedule is locked.

A shared schema helper deduplicates references, validates the destination and every selected strip before mutation, and then delegates each required move to the existing single-scene or single-part transition with one timestamp. Strips already at the destination are reported separately and remain in place. An empty, over-limit, malformed, stale, or cross-schedule request fails before any returned schedule changes.

The operation stores no screenplay source or excerpt in its selection or summary. It creates no Worker request, operation payload, D1 row, provider call, or model call. Persisted assignments continue to use the existing schedule graph, encrypted backup, and explicit metadata-only export paths.

## Consequences

- Producers can regroup complete scenes and split ranges in one bounded action.
- Single-strip and batch behavior share the same mutation rules instead of maintaining parallel assignment logic.
- Reloading or switching versions cannot silently reuse a prior edit selection.
- Batch selection is workflow state, while completed strip assignments remain ordinary versioned schedule state.


---

<a id="0249-canonical-ui-surface-ownership"></a>

Source: `docs/adr/0249-canonical-ui-surface-ownership.md`

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


---
