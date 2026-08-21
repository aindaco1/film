const browser = (marker) => ({ kind: "browser", file: "scripts/browser-smoke.mjs", marker });
const test = (file, marker) => ({ kind: "automated", file, marker });

export const WORKSPACE_FLOW_SECTIONS = [
  ["slate", "Slate"],
  ["projects", "Projects"],
  ["breakdown", "Breakdown"],
  ["schedule", "Schedule"],
  ["shots", "Shots"],
  ["call-sheets", "Call Sheets"],
  ["sides", "Sides"],
  ["reports", "Production Reports"],
  ["locations", "Locations"],
  ["talent", "Talent"],
  ["tasks", "Tasks"],
  ["docs", "Docs"],
  ["people", "People"],
  ["equipment", "Equipment"],
  ["expenses", "Expenses"],
  ["planning", "Planning"],
  ["backups", "Backups"],
];

export const FILM_USER_FLOWS = [
  flow("NAV-01", "Navigation", "Move between operational workspaces", "Any member", "slate", [
    "Open Film and use the workspace navigation.",
    "Move through every operational section without losing the selected project.",
  ], "Each destination has a clear active state, recognizable heading, and no inert navigation controls.", [browser("auditWorkspaceNavigation")]),
  flow("NAV-02", "Navigation", "Select and search projects", "Any member", "projects", [
    "Select a project from the sidebar or project directory.",
    "Search across allowed project metadata and clear the query.",
  ], "Only matching projects appear and selecting one updates every project-scoped workspace.", [browser("desktop nested metadata search")]),
  flow("NAV-03", "Navigation", "Use Film on a narrow mobile viewport", "Any member", "slate", [
    "Open the mobile workspace navigation.",
    "Reach every section and its primary action.",
  ], "Controls remain labeled, reachable, non-overlapping, and free of document-level horizontal overflow.", [browser("mobileWorkspaceAudit")]),
  flow("AUTH-01", "Access", "Request a magic link, sign in, and sign out", "Workspace member", "slate", [
    "Enter the member email and request a link.",
    "Consume the one-time link and later sign out.",
  ], "The session is member/workspace scoped, uses CSRF protection, and visibly returns to signed-out state.", [browser("runAuthSmoke")]),
  flow("AUTH-02", "Access", "Consume sensitive auth and invite links", "Invited or existing member", "slate", [
    "Open a URL containing a magic-link or invite token fragment.",
    "Allow Film to consume the token.",
  ], "The fragment disappears from browser history before authenticated or invite UI renders.", [browser("runSensitiveLinkSmoke")]),
  flow("TEAM-01", "Collaboration", "Invite and onboard a workspace member", "Owner or producer", "slate", [
    "Review invite readiness and create an invite for an allowed role.",
    "Share the one-time link; the recipient accepts with a display name.",
    "Review or revoke pending invites when necessary.",
  ], "Only eligible operators create or revoke invites; raw addresses and tokens are not persisted in manifests.", [test("apps/web/test/invite-client.test.ts", "acceptWorkspaceInvite")]),
  flow("TEAM-02", "Collaboration", "Manage member status and project membership", "Owner or producer", "slate", [
    "Assign a member and role to a project.",
    "Review current/history manifests, revoke the assignment, or disable/reactivate the member.",
  ], "Scope changes are explicit, auditable, and cannot cross workspace boundaries.", [test("apps/web/test/membership-client.test.ts", "assignProjectMembership")]),
  flow("TEAM-03", "Collaboration", "Transfer ownership and manage record permissions", "Owner or authorized operator", "slate", [
    "Review ownership and permission manifests.",
    "Transfer ownership or grant/revoke a bounded permission with optional expiry.",
  ], "The UI distinguishes ownership from permission and exposes history without private field values.", [test("apps/web/test/membership-client.test.ts", "transferRecordOwner")]),
  flow("TEAM-04", "Collaboration", "Request, review, and apply a protected record change", "Contributor and owner/producer", "slate", [
    "Preflight a record change and request review.",
    "Resolve the request, preview the exact diff, and apply with stale checking.",
    "Review rollback guidance or leave a bounded comment intent.",
  ], "Review, diff, apply, audit, and rollback are distinct states; a stale record never receives a silent write.", [browser("runRecordMutationSmoke")]),
  flow("PROJECT-01", "Projects", "Create and select a film project", "Owner or producer", "projects", [
    "Open New project, enter a title, and choose a project type.",
    "Submit and select the resulting project.",
  ], "A typed film template appears locally and one bounded canonical-sync operation is queued.", [browser("project onboarding")]),
  flow("PROJECT-02", "Projects", "Export a filtered project directory", "Any member", "projects", [
    "Filter the project directory.",
    "Export the visible result as Markdown.",
  ], "The handoff matches the visible rows and omits document bodies and private/provider state.", [browser("Project directory exported")]),
  flow("SYNC-01", "Offline", "Work locally, reconcile tabs, and reconnect", "Any member", "slate", [
    "Create or edit supported records while offline/local-first.",
    "Open another tab and then run reconnect sync.",
  ], "IndexedDB changes mirror across tabs; accepted operations clear while rejected operations remain queued with feedback.", [browser("runMultiTabOperationMirrorSmoke")]),
  flow("AUDIT-01", "Audit", "Review and export activity", "Authorized member", "slate", [
    "Open Activity and optionally filter protected Worker audit events.",
    "Export the local activity log.",
  ], "The local export and protected manifest expose bounded event metadata without raw Worker metadata values.", [browser("activity tab exported")]),
  flow("BREAKDOWN-01", "Breakdown", "Import a Fountain or Final Draft screenplay", "Producer or department lead", "breakdown", [
    "Choose a bounded .fountain or .fdx file.",
    "Review the parsed revision, scenes, elements, warnings, and provenance.",
  ], "Parsing stays local, malformed input fails clearly, and the revision graph persists without a Worker request.", [browser("importScreenplaySmokeFixture")]),
  flow("BREAKDOWN-02", "Breakdown", "Search scenes and add a missed element", "Producer or department lead", "breakdown", [
    "Search headings, source, synopsis, or active element names.",
    "Clear the query and add a normalized manual element to the selected scene.",
  ], "Search remains transient and manual tags deduplicate into the existing review graph.", [browser("screenplay-search")]),
  flow("BREAKDOWN-03", "Breakdown", "Review and reuse scene elements", "Producer or department lead", "breakdown", [
    "Confirm or dismiss parsed elements and inspect occurrence positions.",
    "Apply an existing element or copy a filtered selection to another scene.",
  ], "Single and batch reuse share one deduplicating mutation; copied IDs clear on reload and never reach the Worker.", [browser("screenplay-elements-copy")]),
  flow("BREAKDOWN-04", "Breakdown", "Resolve duplicate names and category mistakes", "Producer or department lead", "breakdown", [
    "Review bounded local duplicate suggestions and choose a canonical element.",
    "Move an element to another category when live resource links permit it.",
  ], "Film never auto-merges; explicit changes preserve occurrence and issued-document integrity.", [browser("screenplay-element-category-move")]),
  flow("BREAKDOWN-05", "Breakdown", "Change scene order and export breakdown handoffs", "Producer or department lead", "breakdown", [
    "Switch between script and matching stripboard order.",
    "Export the breakdown or filtered element report in Markdown/CSV.",
  ], "Order changes are projections only; metadata handoffs omit screenplay source except the explicit full breakdown export.", [browser("screenplay-scene-order")]),
  flow("BREAKDOWN-06", "Breakdown", "Review a new screenplay revision", "Producer", "breakdown", [
    "Import a new draft while the prior revision is selected.",
    "Review unchanged/changed/added/removed scenes and carry matching planning forward once.",
  ], "Planning copies are idempotent, unresolved work stays on the old revision, and issued daily documents remain pinned.", [browser("runScreenplayRevisionSmoke")]),
  flow("SCHEDULE-01", "Schedule", "Create, duplicate, switch, and lock schedule versions", "Producer or AD", "schedule", [
    "Create a version from the selected breakdown.",
    "Duplicate or switch versions and lock the approved version.",
  ], "Versions remain independent, transient selections clear at boundaries, and locking disables edits.", [browser("runScheduleWorkspaceSmoke")]),
  flow("SCHEDULE-02", "Schedule", "Build shoot days and arrange strips", "Producer or AD", "schedule", [
    "Add/date/remove days, set Main or Second unit, assign strips, and reorder within a lane.",
    "Split a long scene into source-bounded parts and merge when needed.",
  ], "Every strip has one location, source text is unchanged, and day/unit identity reaches downstream documents.", [browser("schedule-scene-assign")]),
  flow("SCHEDULE-03", "Schedule", "Move a selected group of strips", "Producer or AD", "schedule", [
    "Select whole scenes or split parts and choose one destination.",
    "Move the bounded group or clear the transient selection.",
  ], "The helper validates every unique reference before one atomic result; reload/version changes clear intent.", [browser("schedule-strip-batch-move")]),
  flow("SCHEDULE-04", "Schedule", "Resolve availability, conflicts, and cast DOOD", "Producer or AD", "schedule", [
    "Add cast/location availability windows and review deterministic conflicts.",
    "Mark non-work cast days Off, Travel, or Hold.",
  ], "Work remains derived and immutable; explicit non-work states survive permitted schedule transitions.", [browser("schedule-dood-status")]),
  flow("SCHEDULE-05", "Schedule", "Compare assumptions, estimate costs, and export", "Producer", "schedule", [
    "Edit explicit micro-budget assumptions and compare schedule versions.",
    "Enter known rates, review the itemized estimate, and export the stripboard or project packet.",
  ], "Metrics remain neutral, arithmetic uses integer cents, and exports state their source/privacy policy.", [browser("schedule-budget-update")]),
  flow("SHOTS-01", "Shots", "Create and maintain a scene-linked shot list", "Director or camera department", "shots", [
    "Filter to a scene, create and edit shots, then reorder them within that scene.",
    "Export Markdown or formula-safe CSV.",
  ], "Shot decisions persist locally and derive schedule/call-sheet use without copying screenplay text.", [browser("runProductionShotsWorkspaceSmoke")]),
  flow("LOCATIONS-01", "Locations", "Scout a location and apply logistics", "Producer or locations department", "locations", [
    "Create a linked/manual location, capture permit/access/facility/safety details, and export a brief.",
    "Apply a confirmed location to a matching draft call sheet.",
  ], "Derived scene/schedule use stays current; final call sheets reject logistics mutation.", [browser("runLocationsWorkspaceSmoke")]),
  flow("TALENT-01", "Talent", "Track casting and apply a performer", "Producer or casting department", "talent", [
    "Create a linked/manual talent record and capture casting, paperwork, contact, deal, and readiness details.",
    "Apply a cast performer to a matching draft call sheet and export a brief.",
  ], "Private details stay local; the workflow does not infer payroll, union, tax, or legal sufficiency.", [browser("runTalentWorkspaceSmoke")]),
  flow("CALLSHEET-01", "Call Sheets", "Generate, edit, sync, and issue a call sheet", "Producer or AD", "call-sheets", [
    "Generate a draft from an assigned schedule day and edit logistics/cast calls.",
    "Review source drift, explicitly sync, finalize or reopen, and export Markdown.",
  ], "Manual fields survive sync, final sheets are immutable, and downstream documents stay pinned until deliberate change.", [browser("runCallSheetsWorkspaceSmoke")]),
  flow("SIDES-01", "Sides", "Review and distribute local sides files", "Cast or production team", "sides", [
    "Choose a generated call sheet and review its pinned scene order/source ranges.",
    "Export source Markdown or standalone print HTML.",
  ], "Only scheduled source appears; missing or stale source is explicit and the HTML loads no external resources.", [browser("runProductionSidesWorkspaceSmoke")]),
  flow("REPORTS-01", "Reports", "Complete and issue a daily production report", "Producer or AD", "reports", [
    "Create a report from a call sheet, enter actual timing/counts/notes, and update scene outcomes.",
    "Finalize or reopen, then export Markdown and scene CSV.",
  ], "Overnight durations calculate correctly, final reports lock, and exports omit screenplay/private state.", [browser("runProductionReportsWorkspaceSmoke")]),
  flow("TASKS-01", "Tasks", "Create, update, complete, and export tasks", "Any authorized project member", "tasks", [
    "Add a task with optional due label, change its status, or complete it.",
    "Export the current project task list.",
  ], "Each transition queues one local operation and the handoff reflects visible status/due data.", [browser("tasks workspace local create")]),
  flow("DOCS-01", "Documents", "Create, edit, reconcile, and export Markdown", "Any authorized project member", "docs", [
    "Create a Markdown document and save its local draft.",
    "When canonical state exists, reconcile exact versions; export the selected draft.",
  ], "Stale canonical writes preserve the local draft and explicit export includes the body by user request.", [browser("docs workspace local create")]),
  flow("PEOPLE-01", "People", "Maintain and export a crew directory", "Producer or department lead", "people", [
    "Add a crew member with role.",
    "Export the project crew directory.",
  ], "The visible roster updates and the handoff omits contact fields.", [browser("people workspace local create")]),
  flow("EQUIPMENT-01", "Equipment", "Maintain and export a gear pull", "Producer or department lead", "equipment", [
    "Add equipment and readiness status.",
    "Export the project gear pull.",
  ], "The visible equipment state and exported handoff agree.", [browser("equipment workspace local create")]),
  flow("EXPENSES-01", "Expenses", "Track costs and export the budget top sheet", "Owner or producer", "expenses", [
    "Add an expense line with spent and budget values.",
    "Review totals/status and export the top sheet.",
  ], "Totals update without conflating schedule estimates and planned/actual expense records.", [browser("expenses workspace local create")]),
  flow("IMPORT-01", "Import", "Preview and apply a Notion export", "Owner or producer", "planning", [
    "Choose an extracted Notion folder or ZIP.",
    "Review safe files, normalized core/planning rows, skipped rows, and attachments before applying locally.",
  ], "Unsafe paths and active HTML are blocked; deterministic local replays do not duplicate records.", [test("apps/web/test/import-preview.test.ts", "Notion")]),
  flow("IMPORT-02", "Import", "Commit reviewed Notion records canonically", "Owner or producer", "planning", [
    "Submit reviewed core records and planning rows through their separate protected routes.",
    "Review create/idempotent/update/rejected summaries.",
  ], "Create-only atomic batches never silently overwrite changed canonical rows.", [test("apps/web/test/notion-core-client.test.ts", "commitNotionCoreRecords")]),
  flow("PLANNING-01", "Planning", "Review, filter, refresh, and export production planning", "Producer or department lead", "planning", [
    "Filter local imported rows by planning kind and optionally refresh the bounded D1 view.",
    "Export the current visible view.",
  ], "Filtering creates no writes and the export excludes raw import source paths.", [browser("runPlanningFilterSmoke")]),
  flow("ATTACHMENTS-01", "Attachments", "Stage and explicitly store imported attachments", "Owner or producer", "docs", [
    "Stage supported Notion attachment bytes locally.",
    "Prepare, upload, and commit an R2 object through Worker verification.",
  ], "Every byte write is bounded, hash-verified, create-only, and separate from import metadata commits.", [test("apps/web/test/attachment-upload.test.ts", "uploadAttachmentObject")]),
  flow("ATTACHMENTS-02", "Attachments", "Export stored attachment objects", "Owner or producer", "backups", [
    "Review a stored manifest and package plan.",
    "Download one object or a verified package using bounded ranges.",
  ], "The package matches its plan and expired or mismatched ranges fail closed.", [test("apps/web/test/attachment-export-client.test.ts", "downloadStoredAttachmentPackage")]),
  flow("BACKUP-01", "Backups", "Create and preview an encrypted local backup", "Owner or producer", "backups", [
    "Export an encrypted ZIP with a passphrase.",
    "Choose the file, decrypt locally, and review the restore preview before writes.",
  ], "The default artifact is encrypted, excludes secrets, and previewing does not mutate workspace state.", [browser("exportBackupForPreview")]),
  flow("BACKUP-02", "Backups", "Store and retrieve an encrypted backup", "Owner or producer", "backups", [
    "Explicitly upload already-encrypted backup bytes to R2.",
    "Review stored metadata or create a bounded download plan.",
  ], "The Worker never receives the passphrase or decrypted workspace and verifies exact ownership/hash metadata.", [test("apps/web/test/backup-client.test.ts", "storeBackupObject")]),
  flow("RESTORE-01", "Restore", "Preview and authorize a workspace restore", "Owner or producer", "backups", [
    "Review the decrypted preview, enter the exact confirmation, and run gate/approval/storage/application preflights.",
    "Stop before apply if any evidence or destination check is stale.",
  ], "Every stage names blockers and remains non-destructive until a separately authorized commit.", [browser("runRestoreApplicationPreflightA11ySmoke")]),
  flow("RESTORE-02", "Restore", "Apply core and planning restore records", "Owner or producer", "backups", [
    "Apply an approved workspace snapshot through its exact table plan.",
    "Restore planning rows through their separate stale-checked preview and commit.",
  ], "Core and planning writes are atomic, scoped, audited, and tied to fresh pre-restore backup proof.", [test("apps/web/test/restore-client.test.ts", "runRestoreApplicationCommit")]),
  flow("RESTORE-03", "Restore", "Restore attachment bytes", "Owner or producer", "backups", [
    "Verify the attachment package, plan destinations, and run object commit preflight.",
    "Commit each missing object with exact package/object hashes.",
  ], "Existing destinations are never overwritten and metadata failures compensate safely.", [test("apps/web/test/restore-client.test.ts", "commitRestoreAttachmentObject")]),
  flow("PROVIDERS-01", "Integrations", "Review provider capability and runtime readiness", "Owner or producer", "slate", [
    "Run provider dry-run preflights and protected runtime readiness.",
    "Review blockers without exposing secret values.",
  ], "Each integration distinguishes dry-run, configured, connected, and live-ready states.", [browser("runProviderChipSmoke")]),
  flow("GOOGLE-01", "Integrations", "Connect Google and review Drive sync", "Owner or producer", "slate", [
    "Start OAuth, check the connection, page through a Drive manifest, and run sync dry-run.",
    "Disconnect when access is no longer needed.",
  ], "OAuth state is Worker-owned; browser results expose bounded metadata and no tokens.", [test("apps/web/test/provider-client.test.ts", "startGoogleOAuth")]),
  flow("META-01", "Integrations", "Connect Meta and review social analytics", "Owner or producer", "slate", [
    "Start OAuth, choose an eligible Facebook page, and review read-only Instagram/Facebook analytics/calendar data.",
    "Disconnect when needed.",
  ], "Film remains read-only and never competes with the Social app for publishing.", [test("apps/web/test/provider-client.test.ts", "startMetaOAuth")]),
  flow("STRIPE-01", "Integrations", "Review Pool/Store funding and sales summaries", "Owner or producer", "slate", [
    "Check summary readiness and fetch the normalized Pool/Store view.",
    "Review an empty configured state when no mapped campaign/product exists.",
  ], "Film never handles direct Stripe secrets or implies missing Big Sword commerce records are errors.", [test("apps/web/test/provider-client.test.ts", "fetchStripeSummary")]),
  flow("SMS-01", "Messaging", "Enroll in crew SMS and send an operational message", "Workspace member or authorized sender", "slate", [
    "Review the fixed disclosure and self-enroll an E.164 number for allowed categories.",
    "Select opaque recipients, compose a bounded message, and send through Telnyx readiness gates.",
  ], "Consent is member-bound, recipients are opaque in the browser send request, and content is not stored in delivery attempts.", [browser("runSmsComposerSmoke")]),
  flow("SMS-02", "Messaging", "Opt out, opt back in, or request help by SMS", "Enrolled recipient", "slate", [
    "Reply STOP, START, or HELP to the Film number.",
    "Receive the configured response and have consent state updated when applicable.",
  ], "Signed Telnyx webhooks deduplicate events, enforce keyword semantics, and retain no message content beyond policy.", [test("apps/worker/test/telnyx-webhook.test.ts", "STOP")]),
];

function flow(id, area, title, persona, section, steps, success, regressions) {
  return {
    id,
    area,
    title,
    persona,
    section,
    steps,
    success,
    uxChecks: [
      "Entry point and current state are visible.",
      "Unavailable or destructive actions explain their gate before mutation.",
      "Success or failure feedback names the resulting state.",
      "Keyboard labels, mobile bounds, and private-data boundaries remain intact.",
    ],
    regressions,
  };
}
