import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("web app shell", () => {
  it("boots from a static app root and TypeScript entrypoint", async () => {
    const html = await readFile("index.html", "utf8");

    expect(html).toContain("<div id=\"app\"></div>");
    expect(html).toContain("/src/main.ts");
    expect(html).toContain("manifest.webmanifest");
    expect(html).toContain("Film by Dust Wave");
    expect(html).toContain('href="/sms.html"');
  });

  it("binds production builds to the deployed Film API", async () => {
    const productionEnv = await readFile(".env.production", "utf8");
    const rootIgnore = await readFile("../../.gitignore", "utf8");

    expect(productionEnv.trim()).toBe("VITE_WORKER_URL=https://api.film.dustwave.xyz");
    expect(rootIgnore).toContain("!apps/web/.env.production");
  });

  it("serves explicit legal HTML assets without SPA path rewriting", async () => {
    const wrangler = await readFile("wrangler.toml", "utf8");

    expect(wrangler).toContain('html_handling = "none"');
    expect(wrangler).toContain('not_found_handling = "single-page-application"');
  });

  it("registers a PWA manifest named Film", async () => {
    const manifest = JSON.parse(await readFile("public/manifest.webmanifest", "utf8")) as {
      name: string;
      display: string;
    };

    expect(manifest.name).toBe("Film");
    expect(manifest.display).toBe("standalone");
  });

  it("exposes workspace sections for project navigation", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const styles = await readFile("src/styles.css", "utf8");

    expect(source).toContain("case \"projects\"");
    expect(source).toContain('data-project-surface="board"');
    expect(source).toContain('data-project-surface="list"');
    expect(source).toContain("section: \"schedule\"");
    expect(source).toContain("section: \"shots\"");
    expect(source).toContain("section: \"call-sheets\"");
    expect(source).toContain("section: \"sides\"");
    expect(source).toContain("section: \"reports\"");
    expect(source).toContain("section: \"locations\"");
    expect(source).toContain("section: \"talent\"");
    expect(source).toContain("renderProjectsWorkspace");
    expect(source).toContain("data-action=\"export-project-directory\"");
    expect(source).toContain("createProjectDirectoryMarkdown");
    expect(source).toContain("Project directory exported");
    expect(source).toContain("Markdown document bodies are excluded");
    expect(source).toContain("renderScheduleWorkspace");
    expect(source).toContain("Stripboard");
    expect(source).toContain("Availability &amp; conflicts");
    expect(source).toContain("Budget from schedule");
    expect(source).not.toContain("renderScheduleTimelinePanel");
    expect(source).toContain("data-action=\"export-project-packet\"");
    expect(source).toContain("createProjectPacketMarkdown");
    expect(source).toContain("## Planning Rows");
    expect(source).toContain("packetPlanningFields");
    expect(source).toContain("provider secrets, OAuth tokens, raw attachment bytes, and private Worker state are excluded");
    expect(source).toContain("Project packet exported");
    expect(source).toContain("renderShotsWorkspace");
    expect(source).toContain("Shots workspace");
    expect(source).toContain("createProductionShot");
    expect(source).toContain("updateProductionShot");
    expect(source).toContain("reorderProductionShot");
    expect(source).toContain("buildProductionShotManifest");
    expect(source).toContain("data-action=\"production-shot-update\"");
    expect(source).toContain("data-action=\"production-shot-reorder\"");
    expect(source).toContain("data-action=\"production-shots-markdown-export\"");
    expect(source).toContain("data-action=\"production-shots-csv-export\"");
    expect(source).toContain("createProductionShotMarkdown");
    expect(source).toContain("createProductionShotCsv");
    expect(source).toContain("Production shot list exported");
    expect(source).toContain("renderCallSheetsWorkspace");
    expect(source).toContain("Call Sheets workspace");
    expect(source).toContain("Upcoming Call Sheet");
    expect(source).toContain("Generate from schedule");
    expect(source).toContain("createProductionCallSheetFromScheduleDay");
    expect(source).toContain("syncProductionCallSheetFromScheduleDay");
    expect(source).toContain("buildProductionCallSheetManifest");
    expect(source).toContain("data-action=\"call-sheet-update\"");
    expect(source).toContain("data-action=\"call-sheet-cast-update\"");
    expect(source).toContain("data-action=\"call-sheet-status-toggle\"");
    expect(source).toContain("data-action=\"call-sheet-sync\"");
    expect(source).toContain("manual details preserved");
    expect(source).toContain("source schedule changed");
    expect(source).toContain("## Cast Calls");
    expect(source).toContain("## Safety And Logistics");
    expect(source).toContain("Crew Snapshot");
    expect(source).toContain("Gear Pull");
    expect(source).toContain("Attachments To Review");
    expect(source).toContain("data-action=\"export-call-sheet\"");
    expect(source).toContain("createCallSheetMarkdown");
    expect(source).toContain("provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded");
    expect(source).toContain("Call sheet exported");
    expect(source).toContain("renderSidesWorkspace");
    expect(source).toContain("Sides workspace");
    expect(source).toContain("buildProductionSidesManifest");
    expect(source).toContain("data-action=\"production-sides-markdown-export\"");
    expect(source).toContain("data-action=\"production-sides-html-export\"");
    expect(source).toContain("createProductionSidesMarkdown");
    expect(source).toContain("createProductionSidesHtml");
    expect(source).toContain("user-requested local source export");
    expect(source).toContain("Content-Security-Policy");
    expect(source).toContain("Production sides exported");
    expect(source).toContain("renderProductionReportsWorkspace");
    expect(source).toContain("Production Reports workspace");
    expect(source).toContain("createProductionReportFromCallSheet");
    expect(source).toContain("summarizeProductionReport");
    expect(source).toContain("data-action=\"production-report-update\"");
    expect(source).toContain("data-action=\"production-report-scene-update\"");
    expect(source).toContain("data-action=\"production-report-export\"");
    expect(source).toContain("data-action=\"production-report-csv-export\"");
    expect(source).toContain("createProductionReportMarkdown");
    expect(source).toContain("createProductionReportSceneCsv");
    expect(source).toContain("safeCsvCell");
    expect(source).toContain("renderLocationsWorkspace");
    expect(source).toContain("Locations workspace");
    expect(source).toContain("Add scouting record");
    expect(source).toContain("Scouting Details");
    expect(source).toContain("Production Usage");
    expect(source).toContain("Imported Locations");
    expect(source).toContain("createProductionLocation");
    expect(source).toContain("buildProductionLocationManifest");
    expect(source).toContain("applyProductionLocationToCallSheet");
    expect(source).toContain("data-action=\"production-location-update\"");
    expect(source).toContain("data-action=\"production-location-export\"");
    expect(source).toContain("createProductionLocationMarkdown");
    expect(source).toContain("renderTalentWorkspace");
    expect(source).toContain("Talent workspace");
    expect(source).toContain("Add character record");
    expect(source).toContain("Casting Details");
    expect(source).toContain("Casting Roster");
    expect(source).toContain("createProductionTalent");
    expect(source).toContain("buildProductionTalentManifest");
    expect(source).toContain("applyProductionTalentToCallSheet");
    expect(source).toContain("data-action=\"production-talent-update\"");
    expect(source).toContain("data-action=\"production-talent-export\"");
    expect(source).toContain("createProductionTalentMarkdown");
    expect(source).toContain("planningFieldKeySummary");
    expect(source).toContain("locations-workspace-grid");
    expect(source).toContain("renderWorkspaceSection");
    expect(source).toContain("renderMobileWorkspaceNav");
    expect(source).toContain("mobile-workspace-nav");
    expect(source).toContain("applyAccessibleControlNames");
    expect(source).toContain("tabindex=\"0\"");
    expect(source).toContain('aria-label="Project view"');
    expect(source).toContain("projects-workspace-head");
    expect(styles).toContain(".projects-workspace-head .view-controls");
    expect(styles).toContain(".tasks-table-row:not(.tasks-table-head)");
    expect(styles).toContain('grid-template-areas:\n      "status title actions"');
    expect(source).toContain("data-workspace-section");
    expect(source).toContain("filterProjectsBySearch");
    expect(source).toContain("Search project metadata");
  });

  it("keeps every MVP provider behind one consolidated integration status", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("const INTEGRATION_DEFINITIONS");
    for (const label of ["Pool", "Store", "Stripe", "Meta insights", "Google", "Resend", "Telnyx SMS"]) {
      expect(source).toContain(`label: "${label}"`);
    }
    expect(source).toContain('data-action="integrations-open"');
    expect(source).toContain('aria-label="Integration providers"');
    expect(source).toContain('data-integration="${definition.key}"');
  });

  it("links public privacy, terms, SMS, and data deletion pages from the app shell", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain('href="/privacy.html"');
    expect(source).toContain('href="/terms.html"');
    expect(source).toContain('href="/sms.html"');
    expect(source).toContain('href="/data-deletion.html"');
  });

  it("publishes the crew SMS disclosure used by self-enrollment", async () => {
    const smsTerms = await readFile("public/sms.html", "utf8");
    const source = await readFile("src/main.ts", "utf8");

    for (const requiredText of [
      "Message frequency varies",
      "Message and data rates may apply",
      "Reply STOP to opt out",
      "Reply HELP for help",
      "not a condition of employment or participation",
    ]) {
      expect(smsTerms).toContain(requiredText);
    }
    expect(source).toContain("SMS_DISCLOSURE_VERSION");
    expect(source).toContain("disclosureAcknowledged");
    expect(source).toContain("Enable crew texts");
    expect(source).toContain("TELNYX_SMS_CONSENT_DISCLOSURE");
    expect(smsTerms).toContain("Dust Wave operates Film");
    expect(smsTerms).toContain("https://dustwave.xyz/contact.html");
  });

  it("uses the registered operator identity instead of a placeholder workspace", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("by Dust Wave");
    expect(source).toContain('<div class="workspace-switch" aria-label="Current workspace">');
    expect(source).not.toContain('<button class="workspace-switch"');
    expect(source).not.toContain("<span>Settings</span>");
    expect(source).not.toContain("<span>Trash</span>");
    expect(source).not.toContain("Acme Films");
  });

  it("does not advertise template actions without a binding contract", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const actions = [...source.matchAll(/data-action=["']([^"'$]+)["']/g)].map((match) => match[1]);

    expect(new Set(actions).size).toBeGreaterThan(190);
    for (const action of new Set(actions)) {
      expect(source.split(action).length - 1, `${action} should appear in markup and event binding`).toBeGreaterThanOrEqual(2);
    }
  });

  it("consumes auth and invite tokens from URL fragments before rendering them", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain('consumeSensitiveLinkToken("magicLinkToken")');
    expect(source).toContain('consumeSensitiveLinkToken("inviteToken")');
    expect(source).toContain("window.history.replaceState");
  });

  it("renders provider scopes and compliance notes in the inspector", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("requiredScopes");
    expect(source).toContain("complianceNotes");
    expect(source).toContain("Scopes:");
    expect(source).toContain("Plan Drive sync");
    expect(source).toContain("Drive sync plan");
    expect(source).toContain("Check Stripe summaries");
    expect(source).toContain("Fetch summary aggregates");
    expect(source).toContain("Stripe summary readiness");
    expect(source).toContain("checkStripeSummaryReadiness");
    expect(source).toContain("fetchStripeSummary");
    expect(source).toContain("productionReadPolicy");
    expect(source).toContain("Live reads:");
    expect(source).toContain("Live reads blocked");
  });

  it("keeps inspector workflows in one persistent, grouped view system", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const styles = await readFile("src/styles.css", "utf8");
    const viewIds = ["overview", "team", "ownership", "changes", "permissions", "integrations", "imports"];

    expect(source).toContain("const INSPECTOR_VIEW_GROUPS");
    expect(source).toContain('data-action="inspector-view"');
    expect(source).toContain("isInspectorView(next.inspectorView)");
    expect(source).toContain('state.ui.inspectorView = "integrations"');
    for (const viewId of viewIds) {
      expect(source).toContain(`id: "${viewId}"`);
      expect(source).toContain(`inspectorViewPanelAttributes("${viewId}")`);
    }
    expect(source).not.toContain('inspectorViewPanelAttributes("backups")');
    expect(styles).toContain(".inspector-view-panel[hidden]");
  });

  it("groups production navigation without duplicating the project destination", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("const WORKSPACE_NAV_GROUPS");
    for (const group of ["Development", "Pre-production", "Production", "Operations"]) {
      expect(source).toContain(`label: "${group}"`);
    }
    expect(source).toContain("renderProjectWorkspaceHeader");
    expect(source).toContain("const OVERVIEW_NAV_ITEM");
    expect(source).toContain("const PROJECTS_NAV_ITEM");
    expect(source).not.toContain('data-project-surface="overview"');
    expect(source).toContain(">Board</button>");
    expect(source).toContain(">List</button>");
    expect(source).not.toContain(">Directory</button>");
    expect(source).not.toContain("<h1>Slate</h1>");
  });

  it("uses progressive disclosure for account and governance utilities", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const styles = await readFile("src/styles.css", "utf8");

    expect(source).toContain("auth-disclosure");
    expect(source).toContain("Sign in or join");
    expect(source).toContain("Audit and recovery");
    expect(source).toContain("Review existing access");
    expect(styles).toContain(".workflow-stage.is-current");
    expect(styles).toContain(".advanced-disclosure");
  });

  it("resets project context to Overview and removes scaffold-only commands", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain('state.ui.inspectorView = "overview"');
    expect(source).not.toContain("view-dry-run");
    expect(source).not.toContain("edit-dry-run");
    expect(source).not.toContain("This path is scaffolded as a dry-run action");
  });

  it("keeps scoped access assignment DRY", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source.match(/data-action="permission-assign"/g)).toHaveLength(1);
    expect(source.match(/async function handlePermissionAssign/g)).toHaveLength(1);
    expect(source).not.toContain("handleTaskPermissionAssign");
    expect(source).not.toContain("handleDocumentPermissionAssign");
    expect(source).not.toContain("handleRecordPermissionAssign");
  });

  it("edits routine records in context through one shared handler", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const styles = await readFile("src/styles.css", "utf8");

    expect(source.match(/async function handleContextualRecordUpdate/g)).toHaveLength(1);
    for (const kind of ["task", "person", "equipment", "expense"]) {
      expect(source).toContain(`data-record-kind="${kind}"`);
    }
    expect(source).toContain('data-action="project-inline-update"');
    expect(source).toContain('data-action="membership-assign"');
    expect(source).toContain("renderTeamMemberRow");
    expect(source).toContain("teamAssignmentFor");
    expect(source).toContain('data-action="auth-open"');
    expect(source).toContain("Sign in to edit the team");
    expect(source).toContain("Owner or producer access required");
    expect(source).toContain("renderInlineSaveButton");
    expect(source).toContain('>${icon("save")}</button>`');
    expect(source).toContain("function expenseCategoryLabel");
    expect(source).toContain("function normalizeContextualWorkspaceData");
    expect(source).toContain("normalizeContextualWorkspaceData(localMirror.workspace)");
    for (const collection of ["openTasks", "people", "equipment", "expenses"]) {
      expect(source).toContain(`const ${collection} = project.${collection}.map`);
    }
    expect(source).toContain('"Uncategorized"');
    expect(source).toContain("renderCreateDisclosure");
    expect(styles).toContain(".contextual-field");
    expect(styles).toContain(".create-disclosure");
    expect(source).not.toContain("member-status-form");
    expect(source).not.toContain('class="invite-form assignment-form"');
    expect(source).not.toContain("if (member) member.role = result.membership.role");
  });

  it("selects production records from the visible roster instead of detached dropdowns", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const styles = await readFile("src/styles.css", "utf8");

    expect(source).toContain('data-action="production-location-row-select"');
    expect(source).toContain('data-action="production-talent-row-select"');
    expect(source).not.toContain('data-action="production-location-select"');
    expect(source).not.toContain('data-action="production-talent-select"');
    expect(source).toContain('aria-label="Scouting records"');
    expect(source).toContain('aria-label="Talent casting roster"');
    expect(source).toContain('locations-workspace-grid ${location ? "" : "is-empty"}');
    expect(styles).toContain(".production-record-row.is-selected");
    expect(source.match(/class="production-record-row/g)).toHaveLength(2);
    expect(source).not.toContain("talent-roster-row");
    expect(styles).toContain(".locations-workspace-grid.is-empty .location-planning-panel");
  });

  it("keeps dashboard cards summary-only and routes editing to workspaces", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const dashboardStart = source.indexOf("function renderTaskPanel");
    const dashboardEnd = source.indexOf("function renderDocumentEditor");
    const dashboardPanels = source.slice(dashboardStart, dashboardEnd);

    expect(dashboardPanels).not.toContain('data-action="add-task"');
    expect(dashboardPanels).not.toContain('data-action="add-person"');
    expect(dashboardPanels).not.toContain('data-action="add-equipment"');
    expect(dashboardPanels).not.toContain('data-action="add-doc"');
    expect(dashboardPanels).toContain('data-open-doc=');
    expect(dashboardPanels).toContain('data-workspace-section="docs"');
  });

  it("exposes stored backup manifest and preview controls", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("section: \"backups\"");
    expect(source).toContain("renderBackupsWorkspace");
    expect(source).toContain("backup-workspace-grid");
    expect(source).toContain("Restore Points");
    expect(source).toContain("Safety State");
    expect(source).toContain("Stored backups");
    expect(source).toContain("Preview stored backup");
    expect(source).toContain("createStoredBackupObjectDownloadPlan");
    expect(source).toContain("downloadStoredBackupObject");
    expect(source).toContain("backupDownloadPlanId");
    expect(source).toContain("optionalWorkerFetch");
    expect(source).toContain("OPTIONAL_WORKER_TIMEOUT_MS");
    expect(source).toContain("document.body.append(link)");
    expect(source).toContain("URL.revokeObjectURL(url)");
    expect(source).toContain("Worker audit");
    expect(source).toContain('escapeHtml(latestBackup?.label ?? "None")');
    expect(source).toContain("data-action=\"export-activity-log\"");
    expect(source).toContain("createActivityLogMarkdown");
    expect(source).toContain("raw Worker audit metadata");
    expect(source).toContain("Local activity log exported");
    expect(source).toContain("exportWorkerAuditEventManifest");
    expect(source).toContain("data-action=\"worker-audit-filter\"");
    expect(source).toContain("Action prefix");
    expect(source).toContain("Next audit page");
  });

  it("exposes the Worker restore confirmation gate after previews", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("Check restore gate");
    expect(source).toContain("Record approval");
    expect(source).toContain("Check commit storage");
    expect(source).toContain("Check application preflight");
    expect(source).toContain("Apply snapshot records");
    expect(source).toContain("Check planning restore");
    expect(source).toContain("Apply planning rows");
    expect(source).toContain("runRestoreCommitDryRun");
    expect(source).toContain("runRestoreApprovalDryRun");
    expect(source).toContain("runRestoreCommitStorageDryRun");
    expect(source).toContain("runRestoreApplicationDryRun");
    expect(source).toContain("runRestoreApplicationCommit");
    expect(source).toContain("runRestorePlanningDryRun");
    expect(source).toContain("runRestorePlanningCommit");
    expect(source).toContain("No records were overwritten");
    expect(source).toContain("Restore application blocked");
    expect(source).toContain("Planning restore preview");
    expect(source).toContain("Planning restore rows");
    expect(source).toContain("renderRestorePlanningReviewTable");
    expect(source).toContain("Planning commit");
    expect(source).toContain("commitPolicy");
    expect(source).toContain("restorePlanningRecords");
    expect(source).toContain("Application preflight");
    expect(source).toContain("Application commit");
    expect(source).toContain("Application operations:");
    expect(source).toContain("Application table plan:");
    expect(source).toContain("Workspace snapshot restore rows");
    expect(source).toContain("renderRestoreSnapshotReviewTable");
    expect(source).toContain("Snapshot row review:");
    expect(source).toContain("createRestoreSnapshotRecords");
    expect(source).toContain("restoreSnapshot");
    expect(source).toContain("apply workspace snapshot rows");
    expect(source).toContain("Check attachment package");
    expect(source).toContain("Attachment package preflight");
    expect(source).toContain("Verify package manifest");
    expect(source).toContain("Attachment package verification");
    expect(source).toContain("Plan attachment object restore");
    expect(source).toContain("Attachment object plan");
    expect(source).toContain("Check attachment commit preflight");
    expect(source).toContain("Attachment commit preflight");
    expect(source).toContain("runRestoreAttachmentPackageDryRun");
    expect(source).toContain("runRestoreAttachmentPackageVerificationDryRun");
    expect(source).toContain("runRestoreAttachmentObjectPlanDryRun");
    expect(source).toContain("runRestoreAttachmentObjectCommitPreflight");
    expect(source).toContain("Restore attachment bytes");
    expect(source).toContain("Attachment byte restore");
    expect(source).toContain("commitRestoreAttachmentObject");
    expect(source).toContain("readStoredAttachmentPackageObjects");
    expect(source).toContain("readyForByteCommit");
    expect(source).toContain("Preflight table plan:");
    expect(source).toContain("Planning D1 tables:");
    expect(source).toContain("Planning update preview:");
    expect(source).toContain("update previews");
    expect(source).toContain("Planning kind coverage:");
    expect(source).toContain("Planning table coverage:");
    expect(source).toContain("fieldKeys");
    expect(source).toContain("Pre-restore backup:");
    expect(source).toContain("preRestoreBackupVerified");
  });

  it("exposes protected stored attachment manifest and byte download controls", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("Export manifest");
    expect(source).toContain("Download latest attachment");
    expect(source).toContain("Package attachments");
    expect(source).toContain("Download package");
    expect(source).toContain("Plan expires");
    expect(source).toContain("createStoredAttachmentPackageDryRun");
    expect(source).toContain("downloadStoredAttachmentObject");
    expect(source).toContain("downloadStoredAttachmentPackage");
    expect(source).toContain("readStoredAttachmentPackageManifest");
    expect(source).toContain("packageManifest");
    expect(source).toContain("downloaded attachment hash did not match");
    expect(source).toContain("downloaded attachment package hash did not match");
    expect(source).toContain("Import screenplay");
    expect(source).toContain("previewScreenplayFiles");
  });

  it("exposes a local screenplay breakdown and review workspace", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("section: \"breakdown\"");
    expect(source).toContain("parseScreenplayFile");
    expect(source).toContain("renderScreenplayBreakdown");
    expect(source).toContain("screenplayElementRowsForScene");
    expect(source).toContain("refreshScreenplayElementReviewStates");
    expect(source).toContain("user_requested_plaintext_export");
    expect(source).toContain("Source and parsed graph stored in the local workspace.");
  });

  it("reviews screenplay revisions and explicitly carries matched planning forward", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("renderScreenplayRevisionReview");
    expect(source).toContain("compareScreenplayRevisions");
    expect(source).toContain("carryForwardScreenplayReviewState");
    expect(source).toContain("carryForwardScreenplayRevisionPlanning");
    expect(source).toContain("data-action=\"screenplay-revision-carry-forward\"");
    expect(source).toContain("data-action=\"screenplay-revision-export\"");
    expect(source).toContain("createScreenplayRevisionMarkdown");
    expect(source).toContain("Final call sheets, sides, and production reports remain pinned");
    expect(source).toContain("metadata-only local export");
  });

  it("searches the local screenplay graph and adds missed scene elements through shared helpers", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("searchScreenplayScenes");
    expect(source).toContain("addManualScreenplayElementOccurrence");
    expect(source).toContain("data-action=\"screenplay-search\"");
    expect(source).toContain('type="submit" title="Search screenplay" aria-label="Search screenplay"');
    expect(source).toContain("data-action=\"screenplay-search-clear\"");
    expect(source).toContain("data-action=\"screenplay-manual-element\"");
    expect(source).toContain("Add missed element");
    expect(source).toContain("local screenplay match");
    expect(source).toContain("screenplaySearch: _screenplaySearch");
    expect(source).toContain("buildScreenplayElementReport");
    expect(source).toContain("renderScreenplayElementReport");
    expect(source).toContain("data-action=\"screenplay-element-report-markdown\"");
    expect(source).toContain("data-action=\"screenplay-element-report-csv\"");
    expect(source).toContain("data-screenplay-occurrence-scene-id");
    expect(source).toContain("data-action=\"screenplay-element-apply-selected\"");
    expect(source).toContain("applyScreenplayElementToSelectedScene");
    expect(source).toContain("suggestScreenplayElementDuplicates");
    expect(source).toContain("data-action=\"screenplay-element-merge\"");
    expect(source).toContain("mergeScreenplayElementsInWorkspace");
    expect(source).toContain("Issued documents remain unchanged");
    expect(source).toContain("data-action=\"screenplay-element-category-move\"");
    expect(source).toContain("moveScreenplayElementCategoryInWorkspace");
    expect(source).toContain("combine existing");
    expect(source).toContain("orderScreenplayScenesByProductionSchedule");
    expect(source).toContain("data-action=\"screenplay-scene-order\"");
    expect(source).toContain("data-screenplay-scene-order=\"schedule\"");
    expect(source).toContain("Occurrence positions");
    expect(source).toContain("createScreenplayElementReportMarkdown");
    expect(source).toContain("createScreenplayElementReportCsv");
    expect(source).toContain("metadata-only local export");
  });

  it("exposes a local versioned stripboard backed by shared schedule helpers", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("renderProductionStripboard");
    expect(source).toContain("createProductionScheduleFromBreakdown");
    expect(source).toContain("moveProductionScheduleScene");
    expect(source).toContain("reorderProductionScheduleScene");
    expect(source).toContain("setProductionScheduleStatus");
    expect(source).toContain("updateProductionShootDay");
    expect(source).toContain("data-action=\"schedule-day-unit\"");
    expect(source).toContain("productionUnitLabel");
    expect(source).toContain("Second unit");
    expect(source).toContain("Unit for day");
    expect(source).toContain("splitProductionScheduleScene");
    expect(source).toContain("moveProductionScheduleScenePart");
    expect(source).toContain("moveProductionScheduleStrips");
    expect(source).toContain("mergeProductionScheduleSceneParts");
    expect(source).toContain("schedule-scene-split");
    expect(source).toContain("schedule-scene-merge");
    expect(source).toContain("data-action=\"schedule-strip-select\"");
    expect(source).toContain("data-action=\"schedule-strip-batch-move\"");
    expect(source).toContain("productionScheduleStripSelection");
    expect(source).toContain("Scene part");
    expect(source).toContain("user_requested_schedule_metadata_export");
    expect(source).toContain("Schedule source missing");
    expect(source).toContain("renderProductionAvailability");
    expect(source).toContain("analyzeProductionSchedule");
    expect(source).toContain("createProductionAvailabilityWindow");
    expect(source).toContain("Cast day-out-of-days");
    expect(source).toContain("setProductionScheduleCastDayStatus");
    expect(source).toContain("data-action=\"schedule-dood-status\"");
    expect(source).toContain("T = travel - H = hold");
    expect(source).toContain("renderProductionScheduleScenarios");
    expect(source).toContain("compareProductionScheduleScenarios");
    expect(source).toContain("updateProductionScheduleAssumptions");
    expect(source).toContain("Micro-budget assumptions - observed metrics only");
    expect(source).toContain("renderProductionBudgetEstimate");
    expect(source).toContain("createProductionBudgetScenario");
    expect(source).toContain("estimateProductionBudget");
    expect(source).toContain("estimate only - no union rates or fringes");
    expect(source).toContain("applyScreenplayElementsToScene");
    expect(source).toContain("data-action=\"screenplay-elements-copy\"");
    expect(source).toContain("data-action=\"screenplay-elements-paste\"");
    expect(source).toContain("screenplayElementClipboard");
  });

  it("exposes local-first Markdown editing with canonical stale-checked saves", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("section: \"docs\"");
    expect(source).toContain("renderDocsWorkspace");
    expect(source).toContain("docs-workspace-grid");
    expect(source).toContain("Document workspace");
    expect(source).toContain("data-action=\"doc-save\"");
    expect(source).toContain("data-action=\"export-selected-doc\"");
    expect(source).toContain("createDocumentDraftMarkdown");
    expect(source).toContain("saveCanonicalDocumentMarkdown");
    expect(source).toContain("This explicit export includes the selected Markdown body");
    expect(source).toContain("Document draft exported");
    expect(source).toContain("Save draft");
    expect(source).toContain("document.updated");
    expect(source).toContain("markdownLength");
    expect(source).toContain(".doc-row-button[data-doc-id]");
    expect(source).not.toContain("markdownPreview");
  });

  it("exposes local people, equipment, and expense create flows", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("section: \"tasks\"");
    expect(source).toContain("renderTasksWorkspace");
    expect(source).toContain("tasks-workspace-panel");
    expect(source).toContain("Project tasks");
    expect(source).toContain("data-action=\"contextual-record-update\"");
    expect(source).toContain("data-record-kind=\"task\"");
    expect(source).toContain("data-contextual-autosave");
    expect(source).toContain("`${kind}.updated`");
    expect(source).toContain("data-action=\"task-complete\"");
    expect(source).toContain("Task completed and queued in the IndexedDB operation log.");
    expect(source).toContain("task.completed");
    expect(source).toContain("name=\"due\"");
    expect(source).toContain("dueAt: task.due");
    expect(source).toContain("data-action=\"export-task-list\"");
    expect(source).toContain("createTaskListMarkdown");
    expect(source).toContain("Task list exported");
    expect(source).toContain("section: \"people\"");
    expect(source).toContain("section: \"equipment\"");
    expect(source).toContain("section: \"expenses\"");
    expect(source).toContain("renderPeopleWorkspace");
    expect(source).toContain("renderEquipmentWorkspace");
    expect(source).toContain("renderExpensesWorkspace");
    expect(source).toContain("operational-workspace-panel");
    expect(source).toContain("Budget Top Sheet");
    expect(source).toContain("expenses-workspace-grid");
    expect(source).toContain("data-action=\"export-budget-top-sheet\"");
    expect(source).toContain("createBudgetTopSheetMarkdown");
    expect(source).toContain("Budget top sheet exported");
    expect(source).toContain("data-action=\"add-person\"");
    expect(source).toContain("data-action=\"export-crew-directory\"");
    expect(source).toContain("createCrewDirectoryMarkdown");
    expect(source).toContain("Crew directory exported");
    expect(source).toContain("Person added to the local operation log.");
    expect(source).toContain("person.created");
    expect(source).toContain("createProjectPerson");
    expect(source).toContain("data-action=\"add-equipment\"");
    expect(source).toContain("data-action=\"export-gear-pull\"");
    expect(source).toContain("createGearPullMarkdown");
    expect(source).toContain("Gear pull exported");
    expect(source).toContain("Equipment added to the local operation log.");
    expect(source).toContain("equipment.created");
    expect(source).toContain("createEquipmentItem");
    expect(source).toContain("data-action=\"add-expense\"");
    expect(source).toContain("Expense added to the local operation log.");
    expect(source).toContain("expense.created");
    expect(source).toContain("createExpenseLine");
  });

  it("captures a real project title and type before queuing onboarding", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("renderProjectCreateDialog");
    expect(source).toContain("data-action=\"project-create-form\"");
    expect(source).not.toContain("mobile-project-create");
    expect(source).toContain("name=\"projectType\"");
    expect(source).toContain("projectType: project.type");
    expect(source).not.toContain("createFilmProjectFromTemplate(`Untitled Film");
  });

  it("renders protected provider runtime live gates", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("provider-runtime-readiness");
    expect(source).toContain("checkProviderRuntimeReadiness");
    expect(source).toContain("readiness.policy.replaceAll");
    expect(source).toContain("no secret values");
  });

  it("renders the redacted Telnyx campaign and number readiness check", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("telnyx-provider-readiness");
    expect(source).toContain("checkTelnyxProviderStatus");
    expect(source).toContain("renderTelnyxProviderReadiness");
    expect(source).toContain("505 sender");
  });

  it("exposes a local planning review panel for imported Notion planning rows", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("workspaceSection");
    expect(source).toContain("section: \"planning\"");
    expect(source).toContain("data-workspace-section");
    expect(source).toContain("renderPlanningWorkspace");
    expect(source).toContain("renderPlanningPanel");
    expect(source).toContain("planningPanelRowsForWorkspace");
    expect(source).toContain("planning-panel");
    expect(source).toContain("Planning Rows");
    expect(source).toContain("Review planning");
    expect(source).toContain("Workspace planning rows");
    expect(source).toContain("collectLocalPlanningRows");
    expect(source).toContain("planningRowsForProject");
    expect(source).toContain("planningRecordsTotal");
    expect(source).toContain("PLANNING_KIND_LABELS");
    expect(source).toContain("planning-export-refresh");
    expect(source).toContain("planning-kind-filter");
    expect(source).toContain("Planning kind filter");
    expect(source).toContain("data-action=\"export-planning-view\"");
    expect(source).toContain("createPlanningViewMarkdown");
    expect(source).toContain("raw import source paths are excluded. Source labels are included without local file paths.");
    expect(source).toContain("Planning view exported");
    expect(source).toContain("planningKindFilter");
    expect(source).toContain("isPlanningKindFilter");
    expect(source).toContain("refreshPlanningExportForReview");
    expect(source).toContain("runPlanningExportDryRun(WORKER_URL, state.workspace.id, csrfToken, 100)");
    expect(source).toContain("D1 planning refresh ready");
    expect(source).toContain("Sign in before refreshing D1 planning rows.");
    expect(source).toContain("state.planningRows = collectLocalPlanningRows(state.operations)");
    expect(source).toContain("state.planningExportView = null");
  });

  it("exposes one scoped record permission workflow", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("const PERMISSION_SCOPES");
    expect(source).toContain('data-action="permission-assign"');
    expect(source).toContain('data-permission-assignment-scope="${scope}"');
    expect(source).toContain("Grant access");
    expect(source).toContain("Review existing access");
    expect(source).toContain('data-action="permission-manifest"');
    expect(source).toContain('data-permission-mode="active"');
    expect(source).toContain('data-permission-mode="expired"');
    expect(source).toContain('data-action="permission-history"');
    expect(source).toContain("Access saved");
    expect(source).toContain("handlePermissionAssign");
    expect(source).toContain("updatePermissionAssignmentState");
    expect(source).toContain("assignRecordPermission");
    expect(source).toContain("exportRecordPermissionManifest");
    expect(source).toContain("exportExpiredRecordPermissionManifest");
    expect(source).toContain("revokeRecordPermission");
    expect(source).toContain("record-permission-revoke");
    expect(source).toContain("Revoke");
    expect(source).toContain("entityType: scope");
  });

  it("exposes protected workspace member status controls", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("data-action=\"export-team-roster\"");
    expect(source).toContain("createTeamRosterMarkdown");
    expect(source).toContain("Team roster exported");
    expect(source).toContain("raw email addresses");
    expect(source).toContain("Email references are short hashes only");
    expect(source).toContain("data-action=\"member-status-update\"");
    expect(source).toContain("team-status-form");
    expect(source).toContain("inline-status-button");
    expect(source).toContain("canManageTeam");
    expect(source).toContain("member.status !== \"invited\"");
    expect(source).toContain("Disable");
    expect(source).toContain("Reactivate");
    expect(source).toContain("updateWorkspaceMemberStatus");
    expect(source).toContain("Member status updated");
  });

  it("exposes protected project team manifest and removal controls", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("Current assignments");
    expect(source).toContain("Assignment history");
    expect(source).toContain("data-action=\"project-membership-manifest\"");
    expect(source).toContain("data-action=\"project-membership-history\"");
    expect(source).toContain("data-action=\"project-membership-revoke\"");
    expect(source).toContain("exportProjectMembershipManifest");
    expect(source).toContain("exportProjectMembershipHistory");
    expect(source).toContain("revokeProjectMembership");
    expect(source).toContain("Project team assignment removed");
  });

  it("exposes core record owner transfer controls", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("data-action=\"record-owner-transfer\"");
    expect(source).toContain("Transfer owner");
    expect(source).toContain("Review owner");
    expect(source).toContain("Review owner history");
    expect(source).toContain("Access history");
    expect(source).toContain("Owner transferred");
    expect(source).toContain("Current owner");
    expect(source).toContain("transferRecordOwner");
    expect(source).toContain("exportRecordOwnerManifest");
    expect(source).toContain("exportRecordOwnerHistory");
    expect(source).toContain("Owner transfer:");
    expect(source).toContain("owner history");
    expect(source).toContain("data-action=\"record-mutation-preflight\"");
    expect(source).toContain('data-change-request-kind="record"');
    expect(source).toContain('data-change-request-kind="profile"');
    expect(source).toContain("workflowStageClass");
    expect(source).toContain('"Draft", "Choose the change and request review"');
    expect(source).toContain('"Review", "Approve or reject the pending request"');
    expect(source).toContain('"Preview", "Confirm exactly what will change"');
    expect(source).toContain('"Apply", "Commit the approved change"');
    expect(source).toContain("Audit and recovery");
    expect(source).toContain("Check mutation access");
    expect(source).toContain("data-action=\"record-mutation-request\"");
    expect(source).toContain("Request mutation review");
    expect(source).toContain("mutation-field-grid");
    expect(source).toContain("renderRecordMutationFieldSelector");
    expect(source).toContain("normalizeRecordMutationFieldKeysForEntity");
    expect(source).toContain("data-action=\"record-mutation-request-manifest\"");
    expect(source).toContain("Review mutation requests");
    expect(source).toContain("data-action=\"record-mutation-resolve\"");
    expect(source).toContain("Resolve mutation");
    expect(source).toContain("data-action=\"record-mutation-apply\"");
    expect(source).toContain("Apply mutation");
    expect(source).toContain("preflightRecordMutation");
    expect(source).toContain("createRecordMutationRequest");
    expect(source).toContain("exportRecordMutationRequestManifest");
    expect(source).toContain("resolveRecordMutationRequest");
    expect(source).toContain("data-action=\"record-mutation-diff-preview\"");
    expect(source).toContain("Preview mutation diff");
    expect(source).toContain("mutation-value-grid");
    expect(source).toContain("renderRecordMutationUpdateControls");
    expect(source).toContain("parseRecordMutationUpdateForm");
    expect(source).toContain("recordMutationDefaultValue");
    expect(source).toContain("renderRecordMutationRelationshipInput");
    expect(source).toContain("previewRecordMutationDiff");
    expect(source).toContain("applyRecordMutationRequest");
    expect(source).toContain("data-action=\"record-mutation-audit-manifest\"");
    expect(source).toContain("Review mutation audit");
    expect(source).toContain("exportRecordMutationAuditManifest");
    expect(source).toContain("data-action=\"record-mutation-rollback-request\"");
    expect(source).toContain("Request rollback");
    expect(source).toContain("createRecordMutationRollbackRequest");
    expect(source).toContain("data-action=\"record-mutation-delete-recovery\"");
    expect(source).toContain("Plan delete recovery");
    expect(source).toContain("previewRecordMutationDeleteRecoveryPlan");
    expect(source).toContain("data-action=\"film-profile-mutation-request\"");
    expect(source).toContain("Request profile review");
    expect(source).toContain("renderFilmProfileMutationFieldSelector");
    expect(source).toContain("normalizeFilmProfileMutationFieldKeys");
    expect(source).toContain("getFilmProfileMutationFieldDefinitions");
    expect(source).toContain("data-action=\"film-profile-mutation-request-manifest\"");
    expect(source).toContain("Review profile requests");
    expect(source).toContain("data-action=\"film-profile-mutation-resolve\"");
    expect(source).toContain("Resolve profile mutation");
    expect(source).toContain("data-action=\"film-profile-mutation-diff-preview\"");
    expect(source).toContain("Preview profile diff");
    expect(source).toContain("data-action=\"film-profile-mutation-apply\"");
    expect(source).toContain("Apply profile mutation");
    expect(source).toContain("createFilmProfileMutationRequest");
    expect(source).toContain("exportFilmProfileMutationRequestManifest");
    expect(source).toContain("resolveFilmProfileMutationRequest");
    expect(source).toContain("previewFilmProfileMutationDiff");
    expect(source).toContain("applyFilmProfileMutationRequest");
    expect(source).toContain("renderRecordMutationPreflight");
    expect(source).toContain("exportRecordPermissionHistory");
    expect(source).toContain("renderRecordPermissionHistory");
    expect(source).toContain("data-action=\"record-comment-create\"");
    expect(source).toContain("Add comment intent");
    expect(source).toContain("data-action=\"record-comment-manifest\"");
    expect(source).toContain("Review comment intents");
    expect(source).toContain("Comment intent saved");
    expect(source).toContain("createRecordCommentIntent");
    expect(source).toContain("exportRecordCommentManifest");
    expect(source).toContain("renderRecordCommentManifest");
    expect(source).toContain("\"person\", \"equipment\", \"expense\"");
    expect(source).toContain("Person owner");
    expect(source).toContain("Equipment owner");
    expect(source).toContain("Expense owner");
  });

  it("exposes explicit document record permission controls", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain('{ id: "document", label: "Specific document" }');
    expect(source).toContain('if (scope === "document") return project.docs.map');
    expect(source).toContain('scope === "document" ? selectedTargetId');
    expect(source).toContain('assignedDocumentId: update.assignedEntityId');
  });

  it("exposes explicit task record permission controls", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain('{ id: "task", label: "Specific task" }');
    expect(source).toContain('if (scope === "task") return project.openTasks.map');
    expect(source).toContain('scope === "task" ? selectedTargetId');
    expect(source).toContain('assignedTaskId: update.assignedEntityId');
  });

  it("exposes invite delivery readiness checks", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("data-action=\"invite-delivery-readiness\"");
    expect(source).toContain("Check invite delivery");
    expect(source).toContain("Invite delivery readiness");
    expect(source).toContain("checkInviteDeliveryReadiness");
    expect(source).toContain("Token is not exposed after live delivery.");
  });

  it("exposes pending invite manifest and revoke controls", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("Review pending invites");
    expect(source).toContain("data-action=\"invite-manifest\"");
    expect(source).toContain("data-action=\"invite-revoke\"");
    expect(source).toContain("exportWorkspaceInviteManifest");
    expect(source).toContain("revokeWorkspaceInvite");
    expect(source).toContain("Pending invite revoked");
  });

  it("exposes invite delivery suppression review controls", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("Review delivery suppressions");
    expect(source).toContain("data-action=\"invite-delivery-suppressions\"");
    expect(source).toContain("renderInviteDeliverySuppressions");
    expect(source).toContain("exportInviteDeliverySuppressions");
    expect(source).toContain("Invite delivery suppressions ready");
  });

  it("maps suppressed invite errors to operator-facing copy", async () => {
    const source = await readFile("src/main.ts", "utf8");

    expect(source).toContain("invite_delivery_suppressed");
    expect(source).toContain("recipient has a delivery suppression on file");
  });
});
