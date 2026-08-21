# Film User Flows

This is the canonical user-flow inventory for Film. The source of truth is `scripts/user-flow-catalog.mjs`; regenerate this document with `npm run docs:user-flows`.

Current inventory: 51 flows across 26 areas. Every flow declares automated regression evidence and shared UX acceptance criteria.

## Automated UX Audit

- `node --test scripts/user-flow-catalog.test.mjs` verifies unique flow IDs, complete steps/outcomes, all 17 application workspaces, concrete regression markers, and generated-document freshness.
- `npm run test:browser` drives every workspace on desktop and mobile, requiring the correct heading and active navigation state, a behavior contract for every visible enabled command, and no document-level horizontal overflow.
- The same browser run applies serious/critical axe checks to the full shell and representative interactive states while exercising primary local workflows, exports, auth, protected mutations, provider readiness, encrypted backup preview, and restore preflight. Provider consent, carrier approval, and live owned-account acceptance remain explicit external gates.

## Coverage Summary

| Area | Flows |
| --- | ---: |
| Navigation | 3 |
| Access | 2 |
| Collaboration | 4 |
| Projects | 2 |
| Offline | 1 |
| Audit | 1 |
| Breakdown | 6 |
| Schedule | 5 |
| Shots | 1 |
| Locations | 1 |
| Talent | 1 |
| Call Sheets | 1 |
| Sides | 1 |
| Reports | 1 |
| Tasks | 1 |
| Documents | 1 |
| People | 1 |
| Equipment | 1 |
| Expenses | 1 |
| Import | 2 |
| Planning | 1 |
| Attachments | 2 |
| Backups | 2 |
| Restore | 3 |
| Integrations | 4 |
| Messaging | 2 |

## Navigation

### NAV-01: Move between operational workspaces

- Persona: Any member
- Primary workspace: slate
- Steps:
  1. Open Film and use the workspace navigation.
  2. Move through every operational section without losing the selected project.
- Successful outcome: Each destination has a clear active state, recognizable heading, and no inert navigation controls.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `auditWorkspaceNavigation`

### NAV-02: Select and search projects

- Persona: Any member
- Primary workspace: projects
- Steps:
  1. Select a project from the sidebar or project directory.
  2. Search across allowed project metadata and clear the query.
- Successful outcome: Only matching projects appear and selecting one updates every project-scoped workspace.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `desktop nested metadata search`

### NAV-03: Use Film on a narrow mobile viewport

- Persona: Any member
- Primary workspace: slate
- Steps:
  1. Open the mobile workspace navigation.
  2. Reach every section and its primary action.
- Successful outcome: Controls remain labeled, reachable, non-overlapping, and free of document-level horizontal overflow.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `mobileWorkspaceAudit`

## Access

### AUTH-01: Request a magic link, sign in, and sign out

- Persona: Workspace member
- Primary workspace: slate
- Steps:
  1. Enter the member email and request a link.
  2. Consume the one-time link and later sign out.
- Successful outcome: The session is member/workspace scoped, uses CSRF protection, and visibly returns to signed-out state.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runAuthSmoke`

### AUTH-02: Consume sensitive auth and invite links

- Persona: Invited or existing member
- Primary workspace: slate
- Steps:
  1. Open a URL containing a magic-link or invite token fragment.
  2. Allow Film to consume the token.
- Successful outcome: The fragment disappears from browser history before authenticated or invite UI renders.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runSensitiveLinkSmoke`

## Collaboration

### TEAM-01: Invite and onboard a workspace member

- Persona: Owner or producer
- Primary workspace: slate
- Steps:
  1. Review invite readiness and create an invite for an allowed role.
  2. Share the one-time link; the recipient accepts with a display name.
  3. Review or revoke pending invites when necessary.
- Successful outcome: Only eligible operators create or revoke invites; raw addresses and tokens are not persisted in manifests.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/invite-client.test.ts` contains `acceptWorkspaceInvite`

### TEAM-02: Manage member status and project membership

- Persona: Owner or producer
- Primary workspace: slate
- Steps:
  1. Assign a member and role to a project.
  2. Review current/history manifests, revoke the assignment, or disable/reactivate the member.
- Successful outcome: Scope changes are explicit, auditable, and cannot cross workspace boundaries.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/membership-client.test.ts` contains `assignProjectMembership`

### TEAM-03: Transfer ownership and manage record permissions

- Persona: Owner or authorized operator
- Primary workspace: slate
- Steps:
  1. Review ownership and permission manifests.
  2. Transfer ownership or grant/revoke a bounded permission with optional expiry.
- Successful outcome: The UI distinguishes ownership from permission and exposes history without private field values.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/membership-client.test.ts` contains `transferRecordOwner`

### TEAM-04: Request, review, and apply a protected record change

- Persona: Contributor and owner/producer
- Primary workspace: slate
- Steps:
  1. Preflight a record change and request review.
  2. Resolve the request, preview the exact diff, and apply with stale checking.
  3. Review rollback guidance or leave a bounded comment intent.
- Successful outcome: Review, diff, apply, audit, and rollback are distinct states; a stale record never receives a silent write.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runRecordMutationSmoke`

## Projects

### PROJECT-01: Create and select a film project

- Persona: Owner or producer
- Primary workspace: projects
- Steps:
  1. Open New project, enter a title, and choose a project type.
  2. Submit and select the resulting project.
- Successful outcome: A typed film template appears locally and one bounded canonical-sync operation is queued.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `project onboarding`

### PROJECT-02: Export a filtered project directory

- Persona: Any member
- Primary workspace: projects
- Steps:
  1. Filter the project directory.
  2. Export the visible result as Markdown.
- Successful outcome: The handoff matches the visible rows and omits document bodies and private/provider state.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `Project directory exported`

## Offline

### SYNC-01: Work locally, reconcile tabs, and reconnect

- Persona: Any member
- Primary workspace: slate
- Steps:
  1. Create or edit supported records while offline/local-first.
  2. Open another tab and then run reconnect sync.
- Successful outcome: IndexedDB changes mirror across tabs; accepted operations clear while rejected operations remain queued with feedback.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runMultiTabOperationMirrorSmoke`

## Audit

### AUDIT-01: Review and export activity

- Persona: Authorized member
- Primary workspace: slate
- Steps:
  1. Open Activity and optionally filter protected Worker audit events.
  2. Export the local activity log.
- Successful outcome: The local export and protected manifest expose bounded event metadata without raw Worker metadata values.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `activity tab exported`

## Breakdown

### BREAKDOWN-01: Import a Fountain or Final Draft screenplay

- Persona: Producer or department lead
- Primary workspace: breakdown
- Steps:
  1. Choose a bounded .fountain or .fdx file.
  2. Review the parsed revision, scenes, elements, warnings, and provenance.
- Successful outcome: Parsing stays local, malformed input fails clearly, and the revision graph persists without a Worker request.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `importScreenplaySmokeFixture`

### BREAKDOWN-02: Search scenes and add a missed element

- Persona: Producer or department lead
- Primary workspace: breakdown
- Steps:
  1. Search headings, source, synopsis, or active element names.
  2. Clear the query and add a normalized manual element to the selected scene.
- Successful outcome: Search remains transient and manual tags deduplicate into the existing review graph.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `screenplay-search`

### BREAKDOWN-03: Review and reuse scene elements

- Persona: Producer or department lead
- Primary workspace: breakdown
- Steps:
  1. Confirm or dismiss parsed elements and inspect occurrence positions.
  2. Apply an existing element or copy a filtered selection to another scene.
- Successful outcome: Single and batch reuse share one deduplicating mutation; copied IDs clear on reload and never reach the Worker.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `screenplay-elements-copy`

### BREAKDOWN-04: Resolve duplicate names and category mistakes

- Persona: Producer or department lead
- Primary workspace: breakdown
- Steps:
  1. Review bounded local duplicate suggestions and choose a canonical element.
  2. Move an element to another category when live resource links permit it.
- Successful outcome: Film never auto-merges; explicit changes preserve occurrence and issued-document integrity.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `screenplay-element-category-move`

### BREAKDOWN-05: Change scene order and export breakdown handoffs

- Persona: Producer or department lead
- Primary workspace: breakdown
- Steps:
  1. Switch between script and matching stripboard order.
  2. Export the breakdown or filtered element report in Markdown/CSV.
- Successful outcome: Order changes are projections only; metadata handoffs omit screenplay source except the explicit full breakdown export.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `screenplay-scene-order`

### BREAKDOWN-06: Review a new screenplay revision

- Persona: Producer
- Primary workspace: breakdown
- Steps:
  1. Import a new draft while the prior revision is selected.
  2. Review unchanged/changed/added/removed scenes and carry matching planning forward once.
- Successful outcome: Planning copies are idempotent, unresolved work stays on the old revision, and issued daily documents remain pinned.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runScreenplayRevisionSmoke`

## Schedule

### SCHEDULE-01: Create, duplicate, switch, and lock schedule versions

- Persona: Producer or AD
- Primary workspace: schedule
- Steps:
  1. Create a version from the selected breakdown.
  2. Duplicate or switch versions and lock the approved version.
- Successful outcome: Versions remain independent, transient selections clear at boundaries, and locking disables edits.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runScheduleWorkspaceSmoke`

### SCHEDULE-02: Build shoot days and arrange strips

- Persona: Producer or AD
- Primary workspace: schedule
- Steps:
  1. Add/date/remove days, set Main or Second unit, assign strips, and reorder within a lane.
  2. Split a long scene into source-bounded parts and merge when needed.
- Successful outcome: Every strip has one location, source text is unchanged, and day/unit identity reaches downstream documents.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `schedule-scene-assign`

### SCHEDULE-03: Move a selected group of strips

- Persona: Producer or AD
- Primary workspace: schedule
- Steps:
  1. Select whole scenes or split parts and choose one destination.
  2. Move the bounded group or clear the transient selection.
- Successful outcome: The helper validates every unique reference before one atomic result; reload/version changes clear intent.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `schedule-strip-batch-move`

### SCHEDULE-04: Resolve availability, conflicts, and cast DOOD

- Persona: Producer or AD
- Primary workspace: schedule
- Steps:
  1. Add cast/location availability windows and review deterministic conflicts.
  2. Mark non-work cast days Off, Travel, or Hold.
- Successful outcome: Work remains derived and immutable; explicit non-work states survive permitted schedule transitions.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `schedule-dood-status`

### SCHEDULE-05: Compare assumptions, estimate costs, and export

- Persona: Producer
- Primary workspace: schedule
- Steps:
  1. Edit explicit micro-budget assumptions and compare schedule versions.
  2. Enter known rates, review the itemized estimate, and export the stripboard or project packet.
- Successful outcome: Metrics remain neutral, arithmetic uses integer cents, and exports state their source/privacy policy.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `schedule-budget-update`

## Shots

### SHOTS-01: Create and maintain a scene-linked shot list

- Persona: Director or camera department
- Primary workspace: shots
- Steps:
  1. Filter to a scene, create and edit shots, then reorder them within that scene.
  2. Export Markdown or formula-safe CSV.
- Successful outcome: Shot decisions persist locally and derive schedule/call-sheet use without copying screenplay text.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runProductionShotsWorkspaceSmoke`

## Locations

### LOCATIONS-01: Scout a location and apply logistics

- Persona: Producer or locations department
- Primary workspace: locations
- Steps:
  1. Create a linked/manual location, capture permit/access/facility/safety details, and export a brief.
  2. Apply a confirmed location to a matching draft call sheet.
- Successful outcome: Derived scene/schedule use stays current; final call sheets reject logistics mutation.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runLocationsWorkspaceSmoke`

## Talent

### TALENT-01: Track casting and apply a performer

- Persona: Producer or casting department
- Primary workspace: talent
- Steps:
  1. Create a linked/manual talent record and capture casting, paperwork, contact, deal, and readiness details.
  2. Apply a cast performer to a matching draft call sheet and export a brief.
- Successful outcome: Private details stay local; the workflow does not infer payroll, union, tax, or legal sufficiency.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runTalentWorkspaceSmoke`

## Call Sheets

### CALLSHEET-01: Generate, edit, sync, and issue a call sheet

- Persona: Producer or AD
- Primary workspace: call-sheets
- Steps:
  1. Generate a draft from an assigned schedule day and edit logistics/cast calls.
  2. Review source drift, explicitly sync, finalize or reopen, and export Markdown.
- Successful outcome: Manual fields survive sync, final sheets are immutable, and downstream documents stay pinned until deliberate change.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runCallSheetsWorkspaceSmoke`

## Sides

### SIDES-01: Review and distribute local sides files

- Persona: Cast or production team
- Primary workspace: sides
- Steps:
  1. Choose a generated call sheet and review its pinned scene order/source ranges.
  2. Export source Markdown or standalone print HTML.
- Successful outcome: Only scheduled source appears; missing or stale source is explicit and the HTML loads no external resources.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runProductionSidesWorkspaceSmoke`

## Reports

### REPORTS-01: Complete and issue a daily production report

- Persona: Producer or AD
- Primary workspace: reports
- Steps:
  1. Create a report from a call sheet, enter actual timing/counts/notes, and update scene outcomes.
  2. Finalize or reopen, then export Markdown and scene CSV.
- Successful outcome: Overnight durations calculate correctly, final reports lock, and exports omit screenplay/private state.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runProductionReportsWorkspaceSmoke`

## Tasks

### TASKS-01: Create, update, complete, and export tasks

- Persona: Any authorized project member
- Primary workspace: tasks
- Steps:
  1. Add a task with optional due label, change its status, or complete it.
  2. Export the current project task list.
- Successful outcome: Each transition queues one local operation and the handoff reflects visible status/due data.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `tasks workspace local create`

## Documents

### DOCS-01: Create, edit, reconcile, and export Markdown

- Persona: Any authorized project member
- Primary workspace: docs
- Steps:
  1. Create a Markdown document and save its local draft.
  2. When canonical state exists, reconcile exact versions; export the selected draft.
- Successful outcome: Stale canonical writes preserve the local draft and explicit export includes the body by user request.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `docs workspace local create`

## People

### PEOPLE-01: Maintain and export a crew directory

- Persona: Producer or department lead
- Primary workspace: people
- Steps:
  1. Add a crew member with role.
  2. Export the project crew directory.
- Successful outcome: The visible roster updates and the handoff omits contact fields.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `people workspace local create`

## Equipment

### EQUIPMENT-01: Maintain and export a gear pull

- Persona: Producer or department lead
- Primary workspace: equipment
- Steps:
  1. Add equipment and readiness status.
  2. Export the project gear pull.
- Successful outcome: The visible equipment state and exported handoff agree.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `equipment workspace local create`

## Expenses

### EXPENSES-01: Track costs and export the budget top sheet

- Persona: Owner or producer
- Primary workspace: expenses
- Steps:
  1. Add an expense line with spent and budget values.
  2. Review totals/status and export the top sheet.
- Successful outcome: Totals update without conflating schedule estimates and planned/actual expense records.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `expenses workspace local create`

## Import

### IMPORT-01: Preview and apply a Notion export

- Persona: Owner or producer
- Primary workspace: planning
- Steps:
  1. Choose an extracted Notion folder or ZIP.
  2. Review safe files, normalized core/planning rows, skipped rows, and attachments before applying locally.
- Successful outcome: Unsafe paths and active HTML are blocked; deterministic local replays do not duplicate records.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/import-preview.test.ts` contains `Notion`

### IMPORT-02: Commit reviewed Notion records canonically

- Persona: Owner or producer
- Primary workspace: planning
- Steps:
  1. Submit reviewed core records and planning rows through their separate protected routes.
  2. Review create/idempotent/update/rejected summaries.
- Successful outcome: Create-only atomic batches never silently overwrite changed canonical rows.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/notion-core-client.test.ts` contains `commitNotionCoreRecords`

## Planning

### PLANNING-01: Review, filter, refresh, and export production planning

- Persona: Producer or department lead
- Primary workspace: planning
- Steps:
  1. Filter local imported rows by planning kind and optionally refresh the bounded D1 view.
  2. Export the current visible view.
- Successful outcome: Filtering creates no writes and the export excludes raw import source paths.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runPlanningFilterSmoke`

## Attachments

### ATTACHMENTS-01: Stage and explicitly store imported attachments

- Persona: Owner or producer
- Primary workspace: docs
- Steps:
  1. Stage supported Notion attachment bytes locally.
  2. Prepare, upload, and commit an R2 object through Worker verification.
- Successful outcome: Every byte write is bounded, hash-verified, create-only, and separate from import metadata commits.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/attachment-upload.test.ts` contains `uploadAttachmentObject`

### ATTACHMENTS-02: Export stored attachment objects

- Persona: Owner or producer
- Primary workspace: backups
- Steps:
  1. Review a stored manifest and package plan.
  2. Download one object or a verified package using bounded ranges.
- Successful outcome: The package matches its plan and expired or mismatched ranges fail closed.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/attachment-export-client.test.ts` contains `downloadStoredAttachmentPackage`

## Backups

### BACKUP-01: Create and preview an encrypted local backup

- Persona: Owner or producer
- Primary workspace: backups
- Steps:
  1. Export an encrypted ZIP with a passphrase.
  2. Choose the file, decrypt locally, and review the restore preview before writes.
- Successful outcome: The default artifact is encrypted, excludes secrets, and previewing does not mutate workspace state.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `exportBackupForPreview`

### BACKUP-02: Store and retrieve an encrypted backup

- Persona: Owner or producer
- Primary workspace: backups
- Steps:
  1. Explicitly upload already-encrypted backup bytes to R2.
  2. Review stored metadata or create a bounded download plan.
- Successful outcome: The Worker never receives the passphrase or decrypted workspace and verifies exact ownership/hash metadata.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/backup-client.test.ts` contains `storeBackupObject`

## Restore

### RESTORE-01: Preview and authorize a workspace restore

- Persona: Owner or producer
- Primary workspace: backups
- Steps:
  1. Review the decrypted preview, enter the exact confirmation, and run gate/approval/storage/application preflights.
  2. Stop before apply if any evidence or destination check is stale.
- Successful outcome: Every stage names blockers and remains non-destructive until a separately authorized commit.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runRestoreApplicationPreflightA11ySmoke`

### RESTORE-02: Apply core and planning restore records

- Persona: Owner or producer
- Primary workspace: backups
- Steps:
  1. Apply an approved workspace snapshot through its exact table plan.
  2. Restore planning rows through their separate stale-checked preview and commit.
- Successful outcome: Core and planning writes are atomic, scoped, audited, and tied to fresh pre-restore backup proof.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/restore-client.test.ts` contains `runRestoreApplicationCommit`

### RESTORE-03: Restore attachment bytes

- Persona: Owner or producer
- Primary workspace: backups
- Steps:
  1. Verify the attachment package, plan destinations, and run object commit preflight.
  2. Commit each missing object with exact package/object hashes.
- Successful outcome: Existing destinations are never overwritten and metadata failures compensate safely.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/restore-client.test.ts` contains `commitRestoreAttachmentObject`

## Integrations

### PROVIDERS-01: Review provider capability and runtime readiness

- Persona: Owner or producer
- Primary workspace: slate
- Steps:
  1. Run provider dry-run preflights and protected runtime readiness.
  2. Review blockers without exposing secret values.
- Successful outcome: Each integration distinguishes dry-run, configured, connected, and live-ready states.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runProviderChipSmoke`

### GOOGLE-01: Connect Google and review Drive sync

- Persona: Owner or producer
- Primary workspace: slate
- Steps:
  1. Start OAuth, check the connection, page through a Drive manifest, and run sync dry-run.
  2. Disconnect when access is no longer needed.
- Successful outcome: OAuth state is Worker-owned; browser results expose bounded metadata and no tokens.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/provider-client.test.ts` contains `startGoogleOAuth`

### META-01: Connect Meta and review social analytics

- Persona: Owner or producer
- Primary workspace: slate
- Steps:
  1. Start OAuth, choose an eligible Facebook page, and review read-only Instagram/Facebook analytics/calendar data.
  2. Disconnect when needed.
- Successful outcome: Film remains read-only and never competes with the Social app for publishing.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/provider-client.test.ts` contains `startMetaOAuth`

### STRIPE-01: Review Pool/Store funding and sales summaries

- Persona: Owner or producer
- Primary workspace: slate
- Steps:
  1. Check summary readiness and fetch the normalized Pool/Store view.
  2. Review an empty configured state when no mapped campaign/product exists.
- Successful outcome: Film never handles direct Stripe secrets or implies missing Big Sword commerce records are errors.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/web/test/provider-client.test.ts` contains `fetchStripeSummary`

## Messaging

### SMS-01: Enroll in crew SMS and send an operational message

- Persona: Workspace member or authorized sender
- Primary workspace: slate
- Steps:
  1. Review the fixed disclosure and self-enroll an E.164 number for allowed categories.
  2. Select opaque recipients, compose a bounded message, and send through Telnyx readiness gates.
- Successful outcome: Consent is member-bound, recipients are opaque in the browser send request, and content is not stored in delivery attempts.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - browser: `scripts/browser-smoke.mjs` contains `runSmsComposerSmoke`

### SMS-02: Opt out, opt back in, or request help by SMS

- Persona: Enrolled recipient
- Primary workspace: slate
- Steps:
  1. Reply STOP, START, or HELP to the Film number.
  2. Receive the configured response and have consent state updated when applicable.
- Successful outcome: Signed Telnyx webhooks deduplicate events, enforce keyword semantics, and retain no message content beyond policy.
- UX checks:
  - Entry point and current state are visible.
  - Unavailable or destructive actions explain their gate before mutation.
  - Success or failure feedback names the resulting state.
  - Keyboard labels, mobile bounds, and private-data boundaries remain intact.
- Regression evidence:
  - automated: `apps/worker/test/telnyx-webhook.test.ts` contains `STOP`

