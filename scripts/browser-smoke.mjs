import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createServer } from "node:net";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { spawnManagedProcess, stopManagedProcess } from "./managed-process.mjs";
import { WORKSPACE_FLOW_SECTIONS } from "./user-flow-catalog.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failureDir = resolve(rootDir, "test-results");
const smokePassphrase = "browser smoke passphrase";
const screenplaySmokeFountain = `Title: Night Signal

INT. COMMUNITY RADIO STATION - NIGHT #1#

=Mara discovers an impossible transmission.

MARA
The signal is back.

She checks the [[prop: Field recorder]] beside a [[equipment: Shortwave radio]].

ELI (O.S.)
Then we leave now.

EXT. DESERT ACCESS ROAD - PRE-DAWN #2#

MARA
Kill the lights.

A [[vehicle: Pickup truck]] rolls past the [[location: Abandoned relay tower]].

INT. PICKUP TRUCK - CONTINUOUS #3#

ELI
Did it follow us?`;
const screenplayRevisionSmokeFountain = `Title: Night Signal

INT. COMMUNITY RADIO STATION - NIGHT #1#

=Mara discovers an impossible transmission.

MARA
The signal is back.

She checks the [[prop: Field recorder]] beside a [[equipment: Shortwave radio]].

ELI (O.S.)
Then we leave now.

EXT. DESERT ACCESS ROAD - PRE-DAWN #2#

MARA
Kill the lights. We only get one chance.

A [[vehicle: Pickup truck]] rolls past the [[location: Abandoned relay tower]].

EXT. ABANDONED RELAY TOWER - DAWN #4#

MARA
Start recording.`;
const require = createRequire(import.meta.url);
const axeCorePath = require.resolve("axe-core/axe.min.js");
const viteCliPath = resolve(dirname(require.resolve("vite/package.json")), "bin", "vite.js");

const checks = [];
const providerSmokeLabels = {
  pool: "Pool",
  store: "Store",
  stripe: "Stripe",
  social: "Social",
  google: "Google",
  resend: "Resend",
  sms: "SMS",
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function record(message) {
  checks.push(message);
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function findFreePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createServer();
    server.on("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => rejectPort(new Error("Could not allocate a TCP port")));
        return;
      }
      const { port } = address;
      server.close(() => resolvePort(port));
    });
  });
}

async function waitForServer(url, serverProcess, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Vite server exited early with code ${serverProcess.exitCode}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : "unknown error"}`);
}

async function startWebServer() {
  const port = await findFreePort();
  const url = `http://127.0.0.1:${port}/`;
  const serverProcess = spawnManagedProcess(
    process.execPath,
    [viteCliPath, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: resolve(rootDir, "apps", "web"),
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let logs = "";
  serverProcess.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  serverProcess.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });

  await waitForServer(url, serverProcess);
  return { serverProcess, url, getLogs: () => logs };
}

async function stopWebServer(serverProcess) {
  await stopManagedProcess(serverProcess);
}

async function expectBodyText(page, text, timeoutMs = 5_000) {
  await page.waitForFunction(
    (expectedText) => document.body.innerText.includes(expectedText),
    text,
    { timeout: timeoutMs },
  );
}

async function expectMainHeading(page, heading, timeoutMs = 5_000) {
  await page.locator("main h1", { hasText: heading }).first().waitFor({ state: "visible", timeout: timeoutMs });
}

async function expectNoDocumentOverflow(page, label) {
  const metrics = await page.evaluate(() => {
    const clientWidth = document.documentElement.clientWidth;
    const overflowElements = [...document.querySelectorAll("body *")].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.right <= clientWidth + 1 || rect.left >= clientWidth) return [];
      const style = getComputedStyle(element);
      return [{
        tag: element.tagName.toLowerCase(),
        className: element.className,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        overflowX: style.overflowX,
      }];
    }).slice(0, 8);
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      overflowElements,
    };
  });

  assert(
    metrics.scrollWidth <= metrics.clientWidth && metrics.bodyScrollWidth <= metrics.bodyClientWidth,
    `${label} has horizontal document overflow: ${JSON.stringify(metrics)}`,
  );
}

async function expectNoSeriousA11yViolations(page, label, selector = null) {
  const axeLoaded = await page.evaluate(() => Boolean(window.axe));
  if (!axeLoaded) await page.addScriptTag({ path: axeCorePath });
  const violations = await page.evaluate(async (targetSelector) => {
    const target = targetSelector ? document.querySelector(targetSelector) : document;
    if (!target) throw new Error(`Accessibility target not found: ${targetSelector}`);
    const results = await window.axe.run(target, {
      resultTypes: ["violations"],
    });
    return results.violations
      .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
      }));
  }, selector);

  assert(violations.length === 0, `${label} has serious/critical accessibility violations: ${JSON.stringify(violations)}`);
}

async function workspaceProjectIds(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return [];
    return Array.from(
      main.querySelectorAll(".project-table [data-project-id], .project-grid [data-project-id], .project-card[data-project-id]"),
    )
      .map((element) => element.getAttribute("data-project-id"))
      .filter(Boolean);
  });
}

async function clickWorkspaceSection(page, section) {
  await page.locator(`[data-workspace-section="${section}"]:visible`).first().click();
  await page.waitForTimeout(75);
}

async function selectInspectorView(page, view) {
  const selector = page.locator("[data-action='inspector-view']:visible");
  await selector.selectOption(view);
  await page.waitForTimeout(75);
  const activeViews = await page.locator(".inspector-view-panel:not([hidden])").evaluateAll((panels) => (
    panels.map((panel) => panel.getAttribute("data-inspector-view-panel"))
  ));
  assert(activeViews.length > 0, `Inspector view ${view} should render a panel`);
  assert(activeViews.every((activeView) => activeView === view), `Inspector view ${view} leaked panels: ${activeViews.join(", ")}`);
  assert(await selector.inputValue() === view, `Inspector selector should retain ${view}`);
}

async function auditInspectorNavigation(page) {
  const expectedHeadings = {
    overview: "Description",
    team: "Team",
    ownership: "Ownership",
    changes: "Change requests",
    permissions: "Permissions",
    backups: "Backups",
    integrations: "Integrations",
    imports: "Imports",
  };

  for (const [view, heading] of Object.entries(expectedHeadings)) {
    await selectInspectorView(page, view);
    await page.locator(`.inspector-view-panel[data-inspector-view-panel='${view}']:not([hidden]) h3`, { hasText: heading }).first().waitFor({ state: "visible" });
  }

  await selectInspectorView(page, "overview");
}

async function expectVisibleControlsHaveContracts(page, label) {
  const controls = await page.locator("main button:visible:not(:disabled)").evaluateAll((buttons) => buttons.flatMap((button) => {
    const hasDirectContract = [
      "action",
      "workspaceSection",
      "projectId",
      "docId",
      "view",
      "tab",
    ].some((key) => Boolean(button.dataset[key]));
    const hasFormContract = button.type === "submit" && Boolean(button.closest("form[data-action]"));
    if (hasDirectContract || hasFormContract) return [];
    return [{
      text: button.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "",
      html: button.outerHTML.slice(0, 240),
    }];
  }));
  assert(controls.length === 0, `${label} exposes visible controls without behavior contracts: ${JSON.stringify(controls)}`);
}

async function auditWorkspaceNavigation(page, label) {
  for (const [section, heading] of WORKSPACE_FLOW_SECTIONS) {
    await clickWorkspaceSection(page, section);
    await expectMainHeading(page, heading);
    const activeDestinations = await page.locator(`[data-workspace-section="${section}"].is-active:visible`).count();
    assert(activeDestinations >= 1, `${label} ${section} should expose an active navigation destination`);
    await expectVisibleControlsHaveContracts(page, `${label} ${section}`);
    await expectNoDocumentOverflow(page, `${label} ${section}`);
  }
}

async function submitForm(page, formSelector, fields) {
  const form = page.locator(formSelector).first();
  await form.waitFor({ state: "visible" });
  for (const [name, value] of Object.entries(fields)) {
    await form.locator(`[name="${name}"]`).fill(value);
  }
  await form.locator("button[type='submit']").click();
  await page.waitForTimeout(75);
}

async function mockAuthRoutes(page) {
  const issuedLinkCode = "dry_browser_smoke_link_code";
  const csrfValue = "csrf_browser_smoke";
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  await page.route("**/api/auth/magic-link/request", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(payload.email === "owner@example.com", "Magic-link request should send the entered email");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dryRun: true,
        delivery: "not_sent",
        persistence: "browser_smoke_mock",
        emailHash: "0123456789abcdef0123456789abcdef",
        devOnlyToken: issuedLinkCode,
        expiresAt,
        expiresInMinutes: 30,
      }),
    });
  });

  await page.route("**/api/auth/magic-link/verify", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(payload.token === issuedLinkCode, "Magic-link verification should submit the issued link code");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dryRun: true,
        persistence: "browser_smoke_mock",
        session: {
          id: "session_browser_smoke",
          role: "owner",
          csrfToken: csrfValue,
          expiresAt,
        },
      }),
    });
  });

  await page.route("**/api/auth/logout", async (route) => {
    assert(route.request().headers()["x-film-csrf"] === csrfValue, "Logout should send the active CSRF value");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

async function mockProviderRoutes(page) {
  await page.route("**/api/providers/*/dry-run", async (route) => {
    const url = new URL(route.request().url());
    const key = url.pathname.split("/").at(-2);
    const label = key ? providerSmokeLabels[key] : undefined;

    if (!key || !label) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "unknown_provider" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dryRun: true,
        auditPersistence: "browser_smoke_mock",
        provider: {
          key,
          label,
          mode: "dry-run",
          status: key === "pool" || key === "store" || key === "social" ? "ready" : "needs_scope",
          capabilities: [`${key}_metadata_preflight`],
          requiredScopes: [`${key}:read`],
          secretsPolicy: "worker_only",
          nextStep: `${label} browser-smoke next step.`,
          complianceNotes: [`${label} browser-smoke compliance note.`],
          productionReadPolicy: key === "stripe"
            ? {
                mode: "summary_adapter_first",
                source: "pool_store_summary_adapter",
                liveReadAllowed: false,
                dataBoundary: "summary_only",
                blockers: ["Browser smoke keeps Stripe reads summary-only."],
              }
            : undefined,
        },
      }),
    });
  });

  await page.route("**/api/providers/runtime-readiness", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dryRun: true,
        persistence: "browser_smoke_mock",
        auditPersistence: "browser_smoke_mock",
        readiness: {
          policy: "explicit_provider_live_gates",
          secretValuesExposed: false,
          liveCount: 4,
          partialLiveCount: 0,
          blockedCount: 3,
          providers: [
            ["pool", "Pool", "live", "live_summary_only", ["campaign_aggregate_summary"]],
            ["store", "Store", "live", "live_summary_only", ["order_revenue_aggregate_summary"]],
            ["stripe", "Stripe", "live", "live_summary_only", ["pool_store_payment_summary"]],
            ["resend", "Resend", "live", "live_transactional_email", ["member_magic_link_delivery", "workspace_invite_delivery"]],
            ["google", "Google", "blocked", "dry_run_only", []],
            ["social", "Social", "blocked", "dry_run_only", []],
            ["sms", "SMS", "blocked", "dry_run_only", []],
          ].map(([key, label, status, runtimeMode, liveCapabilities]) => ({
            key,
            label,
            status,
            runtimeMode,
            liveCapabilities,
            blockers: status === "blocked" ? [`${label} browser-smoke blocker.`] : [],
            requiredDecisions: [],
            dataBoundary: "browser_smoke_boundary",
          })),
        },
      }),
    });
  });

  await page.route("**/api/providers/sms/consent/manifest", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "SMS manifest should send CSRF");
    assert(payload.workspaceId === "workspace_acme", "SMS manifest should use the signed workspace");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        persistence: "d1_sms_compliance",
        recipients: [{
          id: "sms_recipient_0123456789abcdef0123456789abcdef",
          memberId: "member_producer",
          status: "active",
          disclosureVersion: "crew-sms-v1-2026-07-13",
          categories: ["call_sheet", "schedule_change", "safety_location_alert"],
          consentedAt: "2026-07-10T16:00:00.000Z",
          revokedAt: null,
          updatedAt: "2026-07-10T16:00:00.000Z",
        }],
        count: 1,
        truncated: false,
        secretValuesExposed: false,
      }),
    });
  });

  await page.route("**/api/providers/sms/provider-readiness", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "Telnyx readiness should send CSRF");
    assert(payload.workspaceId === "workspace_acme", "Telnyx readiness should use the signed workspace");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dryRun: true,
        persistence: "d1_kv_auth_records",
        auditPersistence: "d1_audit_events",
        readiness: {
          provider: "telnyx",
          mode: "read_only_provider_preflight",
          status: "pending_campaign_review",
          providerApiChecked: true,
          profile: { reachable: true, enabled: true, nameMatches: true, webhookMatches: true, webhookApiV2: true },
          campaign: {
            reachable: true,
            status: "PENDING_MNO_REVIEW",
            active: false,
            rejectedOrSuspended: false,
            mno: { approved: 1, review: 1, rejected: 0, other: 0, total: 2 },
          },
          number: {
            reachable: true,
            smsCapable: true,
            profileAssigned: true,
            campaignAssigned: false,
            assignmentStatus: null,
          },
          configured: {
            apiKey: true,
            messagingProfile: true,
            campaign: true,
            senderMapping: true,
            webhookPublicKey: true,
            recipientEncryptionKey: true,
            recipientHashKey: true,
            quietHours: true,
            retention: true,
            d1: true,
          },
          activationGates: { webhookLive: false, sendLive: false },
          readyForOwnedNumberSmoke: false,
          blockers: [],
          secretValuesExposed: false,
        },
      }),
    });
  });

  await page.route("**/api/providers/sms/consent/commit", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "SMS consent should send CSRF");
    assert(payload.workspaceId === "workspace_acme", "SMS consent should use the signed workspace");
    assert(payload.recipientE164 === "+15055550100", "SMS consent should submit the member-entered E.164 number");
    assert(payload.source === "workspace_form", "SMS consent should use the workspace form source");
    assert(payload.disclosureAcknowledged === true, "SMS consent should require disclosure acknowledgment");
    assert(payload.disclosureVersion === "crew-sms-v1-2026-07-13", "SMS consent should pin the reviewed disclosure");
    assert(payload.memberId === undefined, "SMS consent should not accept browser-supplied member identity");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        persistence: "d1_sms_compliance",
        auditPersistence: "d1_audit_events",
        destructiveWrite: true,
        idempotent: false,
        recipient: {
          id: "sms_recipient_0123456789abcdef0123456789abcdef",
          memberId: "member_owner",
          status: "active",
          disclosureVersion: "crew-sms-v1-2026-07-13",
          categories: ["call_sheet", "schedule_change", "safety_location_alert"],
          consentedAt: "2026-07-13T18:00:00.000Z",
          revokedAt: null,
          updatedAt: "2026-07-13T18:00:00.000Z",
        },
        eventType: "consented",
        secretValuesExposed: false,
      }),
    });
  });

  await page.route("**/api/providers/sms/send", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "SMS send should send CSRF");
    assert(payload.workspaceId === "workspace_acme", "SMS send should use the signed workspace");
    assert(payload.projectId === "proj_echoes", "SMS send should use the selected project");
    assert(payload.category === "call_sheet", "SMS send should use the selected category");
    assert(payload.messageBody === "Crew call is 6:00 AM. Reply STOP to opt out.", "SMS send should forward transient content");
    assert(payload.recipientIds.length === 1, "SMS send should use one opaque recipient ID");
    assert(!JSON.stringify(payload).includes("+1555"), "SMS send should not include a phone number");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        provider: {
          status: "sent",
          persistence: "d1_sms_delivery_attempts",
          recipientCount: 1,
          segmentCountPerRecipient: 1,
          totalSegmentCount: 1,
          queuedCount: 1,
          failedCount: 0,
          replayedCount: 0,
          emergencyOverrideApplied: false,
          attempts: [{ id: "sms_attempt_browser_smoke", status: "queued" }],
          secretValuesExposed: false,
        },
      }),
    });
  });
}

async function mockOperationSyncRoute(page) {
  await page.route("**/api/operations/dry-run-sync", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    const operations = Array.isArray(payload.operations) ? payload.operations : [];
    assert(operations.length > 1, "Operation sync smoke should submit multiple queued operations");
    const accepted = [operations[0].id];
    const rejected = operations.slice(1).map((operation) => ({
      id: operation.id,
      reason: "browser_smoke_reconnect_conflict",
    }));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accepted,
        rejected,
        replayed: accepted,
        idempotent: [],
        canonicalApplied: [],
        persistence: "d1_operation_log",
        auditPersistence: "browser_smoke_mock",
      }),
    });
  });
}

function browserSmokeMutationRequest(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: "mutation_browser_smoke_doc",
    workspaceId: "workspace_acme",
    entityType: "document",
    entityId: "doc_pitch_deck",
    mutation: "update",
    actorMemberId: "member_owner",
    allowedBy: "owner_producer",
    status: "pending_owner_producer_review",
    summaryPreview: "Attach browser-smoke external URL and sensitivity.",
    summarySha256: "a".repeat(64),
    fieldKeys: ["externalUrl", "sensitive"],
    expectedUpdatedAt: "2026-07-08T00:00:00.000Z",
    resolvedByMemberId: null,
    resolvedAt: null,
    resolutionNotePreview: null,
    resolutionNoteSha256: null,
    appliedByMemberId: null,
    appliedAt: null,
    application: null,
    destructiveWrite: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function browserSmokeMutationDiffs() {
  return [
    { key: "externalUrl", before: null, after: "https://docs.example.com/browser-smoke-deck", changed: true },
    { key: "sensitive", before: false, after: true, changed: true },
  ];
}

function browserSmokeRollbackGuidance() {
  return {
    strategy: "apply_inverse_update_request",
    fieldKeys: ["externalUrl", "sensitive"],
    requiresApproval: true,
    requiresFreshRecord: true,
    notes: ["Browser smoke rollback remains approval gated."],
  };
}

async function mockRecordMutationRoutes(page) {
  let currentRequest = browserSmokeMutationRequest();

  await page.route("**/api/records/mutations/preflight", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "Mutation preflight should send CSRF");
    assert(payload.entityType === "document", "Mutation smoke should target a document");
    assert(payload.mutation === "update", "Mutation smoke should preflight an update");
    currentRequest = browserSmokeMutationRequest({ entityId: payload.entityId });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dryRun: false,
        persistence: "d1_record_mutation_authorization",
        auditPersistence: "browser_smoke_mock",
        mutationPolicy: "core_record_mutation_authorization_preflight",
        preflight: {
          workspaceId: payload.workspaceId,
          entityType: payload.entityType,
          entityId: payload.entityId,
          mutation: payload.mutation,
          allowedBy: "owner_producer",
        },
      }),
    });
  });

  await page.route("**/api/records/mutations/request-dry-run", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "Mutation request should send CSRF");
    assert(payload.entityType === "document", "Mutation request should target a document");
    assert(payload.fieldKeys.includes("externalUrl"), "Mutation request should include externalUrl");
    assert(payload.fieldKeys.includes("sensitive"), "Mutation request should include sensitive");
    currentRequest = browserSmokeMutationRequest({
      entityId: payload.entityId,
      summaryPreview: payload.summary,
      fieldKeys: payload.fieldKeys,
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dryRun: true,
        destructiveWrite: false,
        persistence: "d1_record_mutation_requests",
        auditPersistence: "browser_smoke_mock",
        requestPolicy: "record_mutation_request_metadata_only",
        request: currentRequest,
      }),
    });
  });

  await page.route("**/api/records/mutations/requests/resolve-dry-run", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "Mutation resolution should send CSRF");
    assert(payload.requestId === currentRequest.id, "Mutation resolution should use the created request ID");
    assert(payload.decision === "approve", "Mutation smoke should approve the request");
    currentRequest = {
      ...currentRequest,
      status: "approved_pending_apply",
      resolvedByMemberId: "member_owner",
      resolvedAt: new Date().toISOString(),
      resolutionNotePreview: payload.note ?? null,
      resolutionNoteSha256: "b".repeat(64),
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dryRun: true,
        destructiveWrite: false,
        persistence: "d1_record_mutation_requests",
        auditPersistence: "browser_smoke_mock",
        resolutionPolicy: "record_mutation_owner_producer_resolution",
        request: currentRequest,
      }),
    });
  });

  await page.route("**/api/records/mutations/diff-dry-run", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "Mutation diff should send CSRF");
    assert(payload.requestId === currentRequest.id, "Mutation diff should use the approved request ID");
    assert(payload.updates.externalUrl === "https://docs.example.com/browser-smoke-deck", "Mutation diff should submit externalUrl");
    assert(payload.updates.sensitive === true, "Mutation diff should submit sensitive=true");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dryRun: true,
        destructiveWrite: false,
        persistence: "d1_record_mutation_requests",
        auditPersistence: "browser_smoke_mock",
        diffPolicy: "approved_record_mutation_diff_preview",
        request: currentRequest,
        stale: false,
        currentUpdatedAt: currentRequest.expectedUpdatedAt,
        expectedUpdatedAt: currentRequest.expectedUpdatedAt,
        fieldDiffs: browserSmokeMutationDiffs(),
        rollbackGuidance: browserSmokeRollbackGuidance(),
      }),
    });
  });

  await page.route("**/api/records/mutations/apply", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "Mutation apply should send CSRF");
    assert(payload.requestId === currentRequest.id, "Mutation apply should use the approved request ID");
    assert(payload.confirmation === `APPLY MUTATION ${currentRequest.id}`, "Mutation apply should include exact confirmation");
    assert(payload.updates.externalUrl === "https://docs.example.com/browser-smoke-deck", "Mutation apply should submit externalUrl");
    assert(payload.updates.sensitive === true, "Mutation apply should submit sensitive=true");
    const appliedAt = new Date().toISOString();
    const application = {
      action: "update",
      applied: true,
      idempotent: false,
      fieldKeys: ["externalUrl", "sensitive"],
      previousUpdatedAt: currentRequest.expectedUpdatedAt,
      updatedAt: appliedAt,
      deletedAt: null,
      fieldDiffs: browserSmokeMutationDiffs(),
      rollbackGuidance: browserSmokeRollbackGuidance(),
    };
    currentRequest = {
      ...currentRequest,
      status: "applied",
      appliedByMemberId: "member_owner",
      appliedAt,
      application,
      destructiveWrite: true,
      updatedAt: appliedAt,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dryRun: false,
        destructiveWrite: true,
        persistence: "d1_record_mutation_requests",
        auditPersistence: "browser_smoke_mock",
        applicationPolicy: "approved_record_mutation_stale_checked",
        request: currentRequest,
        application,
      }),
    });
  });
}

function browserSmokeRestoreBase(payload, overrides = {}) {
  return {
    ok: true,
    dryRun: true,
    workspaceId: payload.workspaceId,
    snapshotWorkspaceId: payload.snapshotWorkspaceId,
    backupCreatedAt: payload.backupCreatedAt ?? null,
    confirmationAccepted: true,
    confirmationPhrase: `RESTORE ${payload.workspaceId}`,
    restoreMode: "workspace_snapshot_restore",
    destructiveWrite: false,
    preRestoreBackupRequired: true,
    preRestoreBackupId: "restore_point_browser_smoke",
    preRestoreBackupVerified: true,
    preRestoreBackupPersistence: "browser_smoke_mock",
    preRestoreBackupBlocker: null,
    commitStatus: "blocked_until_restore_approval",
    authorizationPolicy: "owner_producer_restore_commit_gate",
    auditPersistence: "browser_smoke_mock",
    preview: payload.preview,
    ...overrides,
  };
}

async function mockRestoreRoutes(page) {
  let approvalId = null;
  let commitAttemptId = null;

  await page.route("**/api/restores/commit-dry-run", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "Restore gate should send CSRF");
    assert(payload.confirmation === `RESTORE ${payload.workspaceId}`, "Restore gate should send exact confirmation");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(browserSmokeRestoreBase(payload)),
    });
  });

  await page.route("**/api/restores/approval-dry-run", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "Restore approval should send CSRF");
    assert(payload.confirmation === `RESTORE ${payload.workspaceId}`, "Restore approval should send exact confirmation");
    approvalId = "restore_approval_browser_smoke";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(browserSmokeRestoreBase(payload, {
        commitStatus: "approved_pending_commit",
        approvalId,
        approvalStatus: "approved_pending_commit",
        approvalPersistence: "browser_smoke_mock",
        approvalBlockers: [],
      })),
    });
  });

  await page.route("**/api/restores/commit-storage-dry-run", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "Restore commit storage should send CSRF");
    assert(payload.confirmation === `RESTORE ${payload.workspaceId}`, "Restore commit storage should send exact confirmation");
    assert(payload.approvalId === approvalId, "Restore commit storage should use the approval ID");
    commitAttemptId = "restore_commit_attempt_browser_smoke";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(browserSmokeRestoreBase(payload, {
        commitStatus: "blocked_until_restore_apply",
        approvalId,
        approvalStatus: "approved_pending_commit",
        approvalPersistence: "browser_smoke_mock",
        commitAttemptId,
        commitAttemptStatus: "blocked_until_restore_apply",
        commitAttemptPersistence: "browser_smoke_mock",
      })),
    });
  });

  await page.route("**/api/restores/application-dry-run", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    assert(route.request().headers()["x-film-csrf"] === "csrf_browser_smoke", "Restore application preflight should send CSRF");
    assert(payload.confirmation === `RESTORE ${payload.workspaceId}`, "Restore application preflight should send exact confirmation");
    assert(payload.approvalId === approvalId, "Restore application preflight should use the approval ID");
    assert(payload.commitAttemptId === commitAttemptId, "Restore application preflight should use the commit-attempt ID");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(browserSmokeRestoreBase(payload, {
        commitStatus: "blocked_until_restore_apply_implementation",
        approvalId,
        approvalStatus: "approved_pending_commit",
        approvalPersistence: "browser_smoke_mock",
        commitAttemptId,
        commitAttemptStatus: "blocked_until_restore_apply",
        commitAttemptPersistence: "browser_smoke_mock",
        applicationPreflightId: "restore_application_preflight_browser_smoke",
        applicationPreflightStatus: "blocked_until_restore_apply_implementation",
        applicationPreflightPersistence: "browser_smoke_mock",
        rollbackGuidance: {
          rollbackMode: "pre_restore_backup_required",
          preRestoreBackupId: "restore_point_browser_smoke",
          destructiveWrite: false,
          requiredBeforeApply: ["review_snapshot_rows", "confirm_restore_phrase"],
          blockers: ["Browser smoke stops before destructive apply."],
          previewCounts: payload.preview,
          applicationTablePlan: payload.applicationTablePlan ?? [],
        },
      })),
    });
  });
}

async function runAuthSmoke(page, { signOut = true } = {}) {
  await submitForm(page, "form[data-action='auth-request']", { email: "owner@example.com" });
  await expectBodyText(page, "Dry-run link ready");
  await page.locator("[data-action='auth-verify']").click();
  await expectBodyText(page, "owner session");
  await expectBodyText(page, "Sign out");
  if (!signOut) return;
  await runSignOutSmoke(page);
}

async function runSignOutSmoke(page) {
  await page.locator("[data-action='auth-sign-out']").click();
  await expectBodyText(page, "Signed out of Film.");
}

async function runProviderChipSmoke(page) {
  for (const [key, label] of Object.entries(providerSmokeLabels)) {
    await page.locator(`[data-integration="${key}"]:visible`).first().click();
    assert(
      await page.locator("[data-action='inspector-view']").inputValue() === "integrations",
      `Provider chip ${key} should reveal the Integrations inspector view`,
    );
    await expectBodyText(page, `${label} dry run`);
    await expectBodyText(page, `${key}_metadata_preflight`);
    await expectBodyText(page, `${key}:read`);
    await expectBodyText(page, `${label} browser-smoke compliance note.`);
  }
  await page.locator("[data-action='provider-runtime-readiness']").click();
  await expectBodyText(page, "Provider runtime readiness: 4 live, 3 blocked.");
  await expectBodyText(page, "4 live");
  await expectBodyText(page, "3 blocked");
  await expectBodyText(page, "live summary only");
  await expectBodyText(page, "Google browser-smoke blocker.");
}

async function runSmsComposerSmoke(page) {
  await page.locator('[data-integration="sms"]:visible').first().click();
  await page.locator("[data-action='telnyx-provider-readiness']").click();
  await expectBodyText(page, "Telnyx: pending campaign review.");
  await expectBodyText(page, "PENDING MNO REVIEW");
  await expectBodyText(page, "1 approved - 1 review - 0 rejected");
  const telnyxReadiness = page.locator(".provider-runtime-readiness").filter({ hasText: "Film profile" });
  await expectNoSeriousA11yViolations(page, "desktop Telnyx readiness");
  await mkdir(failureDir, { recursive: true });
  await telnyxReadiness.screenshot({ path: resolve(failureDir, "telnyx-readiness-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await telnyxReadiness.scrollIntoViewIfNeeded();
  await expectNoDocumentOverflow(page, "mobile Telnyx readiness");
  await telnyxReadiness.screenshot({ path: resolve(failureDir, "telnyx-readiness-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 950 });
  const consentForm = page.locator("form[data-action='sms-consent-enroll']");
  await mkdir(failureDir, { recursive: true });
  await consentForm.screenshot({ path: resolve(failureDir, "sms-consent-review.png") });
  await consentForm.locator("input[name='recipientE164']").fill("+15055550100");
  await consentForm.locator("input[name='disclosureAcknowledged']").check();
  await expectNoSeriousA11yViolations(page, "desktop SMS consent enrollment");
  await consentForm.screenshot({ path: resolve(failureDir, "sms-consent-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await consentForm.scrollIntoViewIfNeeded();
  await expectNoDocumentOverflow(page, "mobile SMS consent enrollment");
  await consentForm.screenshot({ path: resolve(failureDir, "sms-consent-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 950 });
  await consentForm.locator("button[type='submit']").click();
  await expectBodyText(page, "1 consent record");
  assert(await page.locator("form[data-action='sms-consent-enroll'] input[name='recipientE164']").inputValue() === "", "SMS consent number should clear after enrollment");
  const form = page.locator("form[data-action='sms-send']");
  await form.locator("input[name='recipientId']").check();
  await form.locator("textarea[name='messageBody']").fill("Crew call is 6:00 AM. Reply STOP to opt out.");
  await expectNoSeriousA11yViolations(page, "desktop SMS composer");
  await mkdir(failureDir, { recursive: true });
  await form.screenshot({ path: resolve(failureDir, "sms-composer-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await form.scrollIntoViewIfNeeded();
  await expectNoDocumentOverflow(page, "mobile SMS composer");
  await form.screenshot({ path: resolve(failureDir, "sms-composer-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 950 });
  await form.locator("button[type='submit']").click();
  await expectBodyText(page, "SMS send: 1 queued, 0 failed, 0 replayed.");
  assert(await page.locator("form[data-action='sms-send'] textarea[name='messageBody']").inputValue() === "", "SMS content should clear after render");
}

async function runRecordMutationSmoke(page) {
  await selectInspectorView(page, "ownership");
  const ownerForm = page.locator("form[data-action='record-owner-transfer']").first();
  await ownerForm.locator("select[name='entityType']").selectOption("document");
  await page.waitForTimeout(100);

  await selectInspectorView(page, "changes");
  await page.locator("form[data-action='record-mutation-preflight'] button[type='submit']").click();
  await expectBodyText(page, "update access allowed");

  const requestForm = page.locator("form[data-action='record-mutation-request']").first();
  await requestForm.locator("input[name='fieldKeys'][value='externalUrl']").check();
  await requestForm.locator("input[name='fieldKeys'][value='sensitive']").check();
  await requestForm.locator("input[name='summary']").fill("Attach browser-smoke external URL and sensitivity.");
  await requestForm.locator("button[type='submit']").click();
  await expectBodyText(page, "mutation requested");

  const resolutionForm = page.locator("form[data-action='record-mutation-resolve']").first();
  await resolutionForm.locator("input[name='note']").fill("Browser smoke approval.");
  await resolutionForm.locator("button[type='submit']").click();
  await expectBodyText(page, "approved pending apply");

  const diffForm = page.locator("form[data-action='record-mutation-diff-preview']").first();
  await diffForm.locator("input[name='update:externalUrl']").fill("https://docs.example.com/browser-smoke-deck");
  await diffForm.locator("select[name='update:sensitive']").selectOption("true");
  await diffForm.locator("button[type='submit']").click();
  await expectBodyText(page, "externalUrl");
  await expectBodyText(page, "https://docs.example.com/browser-smoke-deck");

  const applyForm = page.locator("form[data-action='record-mutation-apply']").first();
  await applyForm.locator("input[name='update:externalUrl']").fill("https://docs.example.com/browser-smoke-deck");
  await applyForm.locator("select[name='update:sensitive']").selectOption("true");
  await applyForm.locator("button[type='submit']").click();
  await expectBodyText(page, "mutation applied");
  await expectBodyText(page, "externalUrl, sensitive - destructive write");
}

async function runScheduleWorkspaceSmoke(page) {
  await clickWorkspaceSection(page, "schedule");
  await expectBodyText(page, "No stripboard version");
  await page.locator("[data-action='schedule-create']").click();
  await page.locator(".stripboard-workspace").waitFor({ state: "visible" });
  assert(
    await page.locator(".stripboard-lane.unassigned .stripboard-scene").count() === 3,
    "New stripboard should start with all screenplay scenes unassigned",
  );
  assert(await page.locator(".stripboard-lane.shoot-day").count() === 1, "New stripboard should start with one shoot day");

  const firstDayInput = page.locator("[data-action='schedule-day-date']").first();
  const firstDayId = await firstDayInput.getAttribute("data-schedule-day-id");
  assert(firstDayId, "Expected first stripboard shoot-day ID");
  await firstDayInput.fill("2026-09-02");
  await firstDayInput.press("Tab");
  await expectBodyText(page, "Shoot day dated 2026-09-02.");

  await page.locator(".stripboard-lane.unassigned [data-action='schedule-scene-assign']").first().selectOption(firstDayId);
  await expectBodyText(page, "Scene assigned to Day 1.");
  assert(
    await page.locator(".stripboard-lane.shoot-day .stripboard-scene").count() === 1,
    "Assigning a scene should move it into the selected shoot day",
  );

  await page.locator("[data-action='schedule-add-day']").click();
  await expectBodyText(page, "Day 2 added to Schedule 1.");
  assert(await page.locator(".stripboard-lane.shoot-day").count() === 2, "Add day should append a second shoot day");
  await page.locator("[data-action='schedule-day-unit']").nth(1).selectOption("second");
  await expectBodyText(page, "Day 2 assigned to Second unit.");
  assert(
    await page.locator(".stripboard-lane.shoot-day[data-production-unit='second']").count() === 1,
    "A shoot day should switch to the second unit without creating another schedule store",
  );
  const secondDayId = await page.locator("[data-action='schedule-day-unit']").nth(1).getAttribute("data-schedule-day-id");
  assert(secondDayId, "Expected second stripboard shoot-day ID");
  for (let index = 0; index < 2; index += 1) {
    await page.locator(".stripboard-lane.unassigned [data-action='schedule-strip-select']:not(:checked)").first()
      .evaluate((checkbox) => checkbox.click());
  }
  await expectBodyText(page, "2 strips selected");
  await page.locator(".stripboard-workspace").screenshot({ path: resolve(failureDir, "film-strip-batch-move-desktop.png") });
  const batchMoveForm = page.locator("form[data-action='schedule-strip-batch-move']");
  await batchMoveForm.locator("select[name='targetDayId']").selectOption(secondDayId);
  await batchMoveForm.locator("button[type='submit']").click();
  await expectBodyText(page, "2 strips moved to Day 2.");
  assert(
    await page.locator(".stripboard-lane.shoot-day").nth(1).locator(".stripboard-scene").count() === 2,
    "Batch movement should move both selected strips to the destination day",
  );
  for (let index = 0; index < 2; index += 1) {
    await page.locator(".stripboard-lane.shoot-day").nth(1)
      .locator("[data-action='schedule-strip-select']:not(:checked)").first()
      .evaluate((checkbox) => checkbox.click());
  }
  await page.locator("form[data-action='schedule-strip-batch-move'] select[name='targetDayId']").selectOption("unassigned");
  await page.locator("form[data-action='schedule-strip-batch-move'] button[type='submit']").click();
  await expectBodyText(page, "2 strips moved to Unassigned.");
  assert(
    await page.locator(".stripboard-lane.unassigned .stripboard-scene").count() === 2,
    "Batch movement should return selected strips to the unassigned pool",
  );
  await page.locator(".stripboard-lane.unassigned [data-action='schedule-strip-select']").first()
    .evaluate((checkbox) => checkbox.click());
  await expectBodyText(page, "1 strip selected");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".stripboard-workspace").waitFor({ state: "visible" });
  assert(
    await page.locator("form[data-action='schedule-strip-batch-move']").count() === 0,
    "Transient strip selection should clear on reload",
  );
  assert(
    await page.locator("[data-action='schedule-strip-select']:checked").count() === 0,
    "Reloaded strip checkboxes should not retain transient selection",
  );
  await page.locator(".stripboard-lane.unassigned [data-action='schedule-scene-assign']").first().selectOption(firstDayId);
  await expectBodyText(page, "Scene assigned to Day 1.");
  const dayOneRows = page.locator(".stripboard-lane.shoot-day").first().locator(".stripboard-scene");
  assert(await dayOneRows.count() === 2, "Day one should accept multiple scene assignments");
  const orderBefore = await dayOneRows.locator(".stripboard-scene-copy strong").allTextContents();
  await dayOneRows.first().locator("[data-schedule-direction='1']").click();
  await expectBodyText(page, "Scene moved down.");
  const orderAfter = await page.locator(".stripboard-lane.shoot-day").first()
    .locator(".stripboard-scene-copy strong")
    .allTextContents();
  assert(orderAfter[0] === orderBefore[1] && orderAfter[1] === orderBefore[0], "Scene ordering should persist within a shoot day");

  await page.locator("[data-action='schedule-duplicate']").click();
  await expectBodyText(page, "Schedule 2 duplicated from Schedule 1.");
  assert(
    await page.locator("[data-action='schedule-version-select'] option").count() === 2,
    "Duplicating should create a second independent schedule version",
  );
  const selectedScheduleId = await page.locator("[data-action='schedule-version-select']").inputValue();
  const comparisonScheduleId = await page.locator("[data-action='schedule-version-select']").evaluate((select) => (
    [...select.options].find((option) => option.value !== select.value)?.value ?? ""
  ));
  assert(comparisonScheduleId, "Expected another schedule version for transient selection clearing");
  await page.locator("[data-action='schedule-strip-select']").first().evaluate((checkbox) => checkbox.click());
  await expectBodyText(page, "1 strip selected");
  await page.locator("[data-action='schedule-version-select']").selectOption(comparisonScheduleId);
  assert(
    await page.locator("form[data-action='schedule-strip-batch-move']").count() === 0,
    "Switching schedule versions should clear transient strip selection",
  );
  await page.locator("[data-action='schedule-version-select']").selectOption(selectedScheduleId);
  await page.locator("[data-action='schedule-lock-toggle']").click();
  await expectBodyText(page, "Schedule 2 locked");
  assert(
    await page.locator("[data-action='schedule-scene-assign']:disabled").count() === 3,
    "Locking a stripboard should disable all scene assignments",
  );
  assert(
    await page.locator("[data-action='schedule-day-unit']:disabled").count() === 2,
    "Locking a stripboard should disable unit changes",
  );
  assert(
    await page.locator("[data-action='schedule-strip-select']:disabled").count() === 3,
    "Locking a stripboard should disable batch strip selection",
  );

  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".stripboard-workspace").waitFor({ state: "visible" });
  assert(
    await page.locator("[data-action='schedule-version-select'] option").count() === 2,
    "Schedule versions should persist through IndexedDB reload",
  );
  assert(
    await page.locator("[data-action='schedule-scene-assign']:disabled").count() === 3,
    "Locked state should persist through IndexedDB reload",
  );
  assert(
    await page.locator(".stripboard-lane.shoot-day").first().locator(".stripboard-scene").count() === 2,
    "Scene assignments should persist through IndexedDB reload",
  );
  assert(
    await page.locator("[data-action='schedule-day-date']").first().inputValue() === "2026-09-02",
    "Shoot-day dates should persist through IndexedDB reload",
  );
  assert(
    await page.locator("[data-action='schedule-day-unit']").nth(1).inputValue() === "second",
    "Second-unit assignments should persist through IndexedDB reload",
  );

  const availabilityForm = page.locator("form[data-action='schedule-availability-add']");
  await availabilityForm.locator("select[name='elementId']").selectOption({ label: "Cast - MARA" });
  await availabilityForm.locator("select[name='status']").selectOption("unavailable");
  await availabilityForm.locator("input[name='notes']").fill("Unavailable during radio-station shoot");
  await availabilityForm.locator("button[type='submit']").click();
  await expectBodyText(page, "MARA marked unavailable from 2026-09-02 through 2026-09-02.");
  assert(await page.locator(".schedule-availability-row").count() === 1, "Availability window should render after local persistence");
  assert(await page.locator(".schedule-conflict-row.blocking").count() === 1, "Unavailable cast should create one blocking conflict");
  await expectBodyText(page, "MARA is unavailable on 2026-09-02.");
  assert(await page.locator(".schedule-dood tbody tr").count() === 2, "DOOD should include both cast resources assigned to shoot days");

  assert(await page.locator(".schedule-scenario-table tbody tr").count() === 10, "Scenario comparison should render ten observed metrics");
  await page.locator("[data-action='schedule-lock-toggle']").click();
  await expectBodyText(page, "Schedule 2 unlocked.");
  const maraDoodStatus = page.locator(".schedule-dood tbody tr").filter({ hasText: "MARA" })
    .locator("[data-action='schedule-dood-status']");
  assert(await maraDoodStatus.count() === 1, "MARA should expose one editable non-work DOOD day");
  await maraDoodStatus.selectOption("travel");
  await expectBodyText(page, "MARA: Day 2 marked Travel.");
  assert(
    await page.locator(".schedule-dood tbody tr").filter({ hasText: "MARA" })
      .locator("[data-action='schedule-dood-status']").inputValue() === "travel",
    "Travel should render immediately in the DOOD matrix",
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".schedule-dood").waitFor({ state: "visible" });
  assert(
    await page.locator(".schedule-dood tbody tr").filter({ hasText: "MARA" })
      .locator("[data-action='schedule-dood-status']").inputValue() === "travel",
    "Travel should persist through IndexedDB reload",
  );
  const assumptionForm = page.locator("form[data-action='schedule-assumptions-update']");
  await assumptionForm.locator("input[name='maxScenesPerDay']").fill("1");
  await assumptionForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Schedule 2 assumptions updated.");
  await expectBodyText(page, "Day 1 has 2 scene strips; the current assumption is 1.");
  assert(await page.locator(".schedule-assumption-breaches span").count() === 1, "Tightened scene limit should produce one explicit breach");
  await page.locator("[data-action='schedule-lock-toggle']").click();
  await expectBodyText(page, "Schedule 2 locked.");

  await page.locator("[data-action='schedule-budget-create']").click();
  await expectBodyText(page, "Schedule 2 Estimate created with zero-value rates.");
  const budgetForm = page.locator("form[data-action='schedule-budget-update']");
  await budgetForm.locator("input[name='crewDayCost']").fill("1000");
  await budgetForm.locator("input[name='castDayRate']").fill("100");
  await budgetForm.locator("input[name='locationDayRate']").fill("200");
  await budgetForm.locator("input[name='equipmentDayCost']").fill("300");
  await budgetForm.locator("input[name='companyMoveCost']").fill("50");
  await budgetForm.locator("input[name='crewHeadcount']").fill("8");
  await budgetForm.locator("input[name='mealCostPerPerson']").fill("10");
  await budgetForm.locator("input[name='contingencyPercent']").fill("10");
  await budgetForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Schedule 2 Estimate updated from schedule metrics.");
  await expectBodyText(page, "$2,255");
  assert(await page.locator(".schedule-budget-table tbody tr").count() === 9, "Schedule budget should render six basis lines plus subtotal, contingency, and total");

  const stripboardDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='schedule-export']").click();
  const stripboardDownload = await stripboardDownloadPromise;
  const stripboardStream = await stripboardDownload.createReadStream();
  const stripboardChunks = [];
  for await (const chunk of stripboardStream) stripboardChunks.push(chunk);
  const stripboardExport = JSON.parse(Buffer.concat(stripboardChunks).toString("utf8"));
  assert(
    stripboardExport.sourcePolicy === "user_requested_schedule_metadata_export",
    "Stripboard export should declare its metadata-only policy",
  );
  assert(stripboardExport.schedule.status === "locked", "Stripboard export should preserve the selected version's lock state");
  assert(stripboardExport.schedule.shootDays.length === 2, "Stripboard export should preserve shoot days");
  assert(stripboardExport.schedule.shootDays[1].unit === "second", "Stripboard export should preserve second-unit identity");
  assert(stripboardExport.availabilityWindows.length === 1, "Stripboard export should preserve availability windows");
  assert(stripboardExport.analysis.blockingConflictCount === 1, "Stripboard export should preserve deterministic conflict analysis");
  assert(stripboardExport.analysis.doodRows.length === 2, "Stripboard export should preserve cast DOOD rows");
  assert(
    stripboardExport.analysis.doodRows.some((row) => row.name === "MARA" && row.travelDays === 1),
    "Stripboard export should preserve cast travel days",
  );
  assert(stripboardExport.schedule.assumptions.maxScenesPerDay === 1, "Stripboard export should preserve versioned assumptions");
  assert(stripboardExport.scenarioAnalysis.assumptionBreaches.length === 1, "Stripboard export should preserve assumption breaches");
  assert(stripboardExport.budgetScenario.assumptions.crewDayCostCents === 100_000, "Stripboard export should preserve budget assumptions");
  assert(stripboardExport.budgetEstimate.totalCents === 225_500, "Stripboard export should preserve schedule-derived budget math");
  assert(stripboardExport.scenes.length === 3, "Stripboard export should include scene metadata");
  assert(!JSON.stringify(stripboardExport).includes("sourceText"), "Stripboard export should omit screenplay source text");
  await expectBodyText(page, "Stripboard exported for Schedule 2.");
  await mkdir(failureDir, { recursive: true });
  await page.locator("main").screenshot({ path: resolve(failureDir, "film-schedule-desktop.png") });

  await page.locator("[data-action='schedule-lock-toggle']").click();
  await expectBodyText(page, "Schedule 2 unlocked.");
  page.once("dialog", (dialog) => {
    const range = dialog.message().match(/source line (\d+)-(\d+)/);
    assert(range, "Scene split prompt should include the source-line range");
    void dialog.accept(range[1]);
  });
  await page.locator(".stripboard-lane.unassigned [data-action='schedule-scene-split']").click();
  await expectBodyText(page, "Scene 3 split into parts A and B.");
  assert(
    await page.locator(".stripboard-lane.unassigned .stripboard-scene[data-schedule-scene-part-id]").count() === 2,
    "Scene splitting should replace one source scene with two schedule-only strips",
  );
  const selectedDayTwoId = await page.locator("[data-action='schedule-day-unit']").nth(1).getAttribute("data-schedule-day-id");
  assert(selectedDayTwoId, "Expected a selected-schedule second shoot day");
  await page.locator(".stripboard-lane.unassigned .stripboard-scene[data-schedule-scene-part-id]").nth(1)
    .locator("[data-action='schedule-scene-assign']").selectOption(selectedDayTwoId);
  await expectBodyText(page, "Scene part B assigned to Day 2.");
  assert(
    await page.locator(".stripboard-lane.shoot-day").nth(1).locator(".stripboard-scene[data-schedule-scene-part-id]").count() === 1,
    "A split scene part should move independently to another shoot day",
  );
  await page.reload({ waitUntil: "networkidle" });
  assert(
    await page.locator(".stripboard-scene[data-schedule-scene-part-id]").count() === 2,
    "Split source ranges and assignments should persist through IndexedDB reload",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".stripboard-lane.unassigned [data-action='schedule-scene-merge']").click();
  await expectBodyText(page, "Scene 3 merged and returned to Unassigned.");
  assert(await page.locator(".stripboard-scene[data-schedule-scene-part-id]").count() === 0, "Merging should remove all schedule-only parts");
  assert(
    await page.locator(".stripboard-lane.unassigned .stripboard-scene").count() === 1,
    "Merging should restore the source scene to Unassigned",
  );
  await page.locator("[data-action='schedule-lock-toggle']").click();
  await expectBodyText(page, "Schedule 2 locked.");

  await expectBodyText(page, "Production Clock");
  await expectBodyText(page, "Phase Lanes");
  await expectBodyText(page, "Date-Driven Tasks");
  await expectBodyText(page, "Scenes on deck");
  await expectBodyText(page, "Call:");
  await mkdir(failureDir, { recursive: true });
  const downloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='export-project-packet']").click();
  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  assert(filename.startsWith("film-project-packet-"), `Expected project packet filename, received ${filename}`);
  assert(filename.endsWith(".md"), `Expected Markdown project packet download, received ${filename}`);
  const packetPath = resolve(failureDir, filename);
  await download.saveAs(packetPath);
  const packet = await readFile(packetPath, "utf8");
  assert(packet.includes("# Echoes in the Static"), "Project packet should include the selected project title");
  assert(packet.includes("Policy: provider secrets"), "Project packet should include the export policy");
  assert(packet.includes("## Upcoming Call Sheet"), "Project packet should include call-sheet metadata");
  assert(packet.includes("## Planning Rows"), "Project packet should include the planning section");
  await expectBodyText(page, "Project packet exported for Echoes in the Static.");
  await expectNoDocumentOverflow(page, "desktop schedule workspace");
  await expectNoSeriousA11yViolations(page, "desktop schedule workspace");

  await clickWorkspaceSection(page, "breakdown");
  await page.locator("[data-screenplay-scene-order='schedule']").click();
  const scheduleOrderedHeadings = await page.locator(".screenplay-scene-row .screenplay-scene-copy strong").allTextContents();
  assert(scheduleOrderedHeadings[0] === orderAfter[0], "Breakdown schedule order should follow the selected stripboard's first shoot day");
  assert(scheduleOrderedHeadings.length === 3, "Schedule order should emit every source scene once");
  await page.locator("[data-screenplay-scene-order='script']").click();
  const scriptOrderedHeadings = await page.locator(".screenplay-scene-row .screenplay-scene-copy strong").allTextContents();
  assert(scriptOrderedHeadings[0] === orderBefore[0], "Breakdown script order should restore screenplay scene order");
}

async function runScreenplayBreakdownSmoke(page) {
  const sourceLeakRequests = [];
  const captureSourceLeak = (request) => {
    if ((request.postData() ?? "").includes("The signal is back.")) sourceLeakRequests.push(request.url());
  };
  page.on("request", captureSourceLeak);

  await importScreenplaySmokeFixture(page);
  await expectBodyText(page, "Night Signal");
  await expectBodyText(page, "Mara discovers an impossible transmission.");
  assert(await page.locator(".screenplay-scene-row").count() === 3, "Breakdown should render three parsed Fountain scenes");
  assert(await page.locator(".screenplay-element-row").count() === 5, "First scene should render five deduplicated element rows");
  assert(
    await page.locator("[data-screenplay-scene-order='schedule']").isDisabled(),
    "Schedule order should be unavailable until the selected revision has a stripboard",
  );

  await page.locator("[data-screenplay-review='confirmed']").first().click();
  await page.locator(".screenplay-review-controls .is-active").waitFor({ state: "visible" });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".screenplay-workspace-grid").waitFor({ state: "visible" });
  assert(
    await page.locator(".screenplay-review-controls .is-active").count() === 1,
    "Breakdown review state should persist through IndexedDB reload",
  );

  await page.locator("[data-action='screenplay-element-filter']").selectOption("prop");
  assert(await page.locator(".screenplay-element-row").count() === 1, "Element filter should isolate the scene prop row");
  await expectBodyText(page, "Field recorder");
  await expectBodyText(page, "Element List");
  assert(await page.locator("[data-screenplay-element-report-id]").count() === 1, "Element list should reuse the selected category filter across the full revision");
  const fieldRecorderReportRow = page.locator("[data-screenplay-element-report-id]", { hasText: "Field recorder" });
  const applyFieldRecorder = fieldRecorderReportRow.locator("[data-action='screenplay-element-apply-selected']");
  assert(await applyFieldRecorder.isDisabled(), "Element reuse should be disabled when the element is already active in the selected scene");
  await fieldRecorderReportRow.locator(".screenplay-element-occurrences summary").click();
  assert(await fieldRecorderReportRow.locator("[data-screenplay-occurrence-scene-id]").count() === 1, "Element occurrence details should show every active source position");

  await page.locator(".screenplay-scene-row").nth(1).click();
  assert(!(await applyFieldRecorder.isDisabled()), "Element reuse should become available for a scene without that element");
  await applyFieldRecorder.click();
  await expectBodyText(page, "Field recorder: added to scene 2.");
  const reusedFieldRecorderRow = page.locator("[data-screenplay-element-report-id]", { hasText: "Field recorder" });
  await reusedFieldRecorderRow.locator(".screenplay-element-occurrences summary").click();
  assert(await reusedFieldRecorderRow.locator("[data-screenplay-occurrence-scene-id]").count() === 2, "Reusing an element should add one deduplicated occurrence to the shared graph");
  assert(await page.locator(".screenplay-element-row", { hasText: "Field recorder" }).count() === 1, "The reused element should appear in the selected scene breakdown");
  await reusedFieldRecorderRow.locator("[data-screenplay-occurrence-scene-id]").first().click();
  await expectBodyText(page, "Opened Field recorder occurrence in the screenplay.");
  assert(await page.locator(".screenplay-scene-row.is-selected", { hasText: "COMMUNITY RADIO STATION" }).count() === 1, "Occurrence navigation should select its source scene");

  const duplicateForm = page.locator("form[data-action='screenplay-manual-element']");
  await duplicateForm.locator("select[name='category']").selectOption("prop");
  await duplicateForm.locator("input[name='name']").fill("Field recorder unit");
  await duplicateForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Field recorder unit: added to the selected scene as Props.");
  const duplicatePair = page.locator("[data-screenplay-duplicate-pair]", { hasText: "Field recorder unit" });
  assert(await duplicatePair.count() === 1, "Local duplicate review should surface a deterministic same-category name match");
  await duplicatePair.locator(".screenplay-duplicate-actions summary").click();
  await duplicatePair.getByRole("button", { name: "Keep Field recorder", exact: true }).click();
  await expectBodyText(page, "Merged Field recorder unit into Field recorder:");
  assert(await page.locator("[data-screenplay-duplicate-pair]").count() === 0, "Explicit merge should clear the resolved duplicate suggestion");
  assert(await page.locator("[data-screenplay-element-report-id]", { hasText: "Field recorder unit" }).count() === 0, "Explicit merge should remove the non-canonical element row");
  const mergedFieldRecorderRow = page.locator("[data-screenplay-element-report-id]", { hasText: "Field recorder" });
  await mergedFieldRecorderRow.locator(".screenplay-element-occurrences summary").click();
  assert(await mergedFieldRecorderRow.locator("[data-screenplay-occurrence-scene-id]").count() === 3, "Explicit merge should preserve and combine source-free occurrence positions");

  await page.locator("[data-action='screenplay-elements-copy']").click();
  await expectBodyText(page, "Copied 1 active element from Scene 1.");
  await page.locator(".screenplay-scene-row").nth(2).click();
  await page.locator("[data-action='screenplay-elements-paste']").click();
  await expectBodyText(page, "Pasted 1 element into scene 3: 1 added, 0 reactivated, 0 already present.");
  assert(
    await page.locator(".screenplay-element-row", { hasText: "Field recorder" }).count() === 1,
    "Pasting visible active elements should add them to the selected scene",
  );
  await page.locator("[data-action='screenplay-elements-paste']").click();
  await expectBodyText(page, "Pasted 1 element into scene 3: 0 added, 0 reactivated, 1 already present.");
  assert(
    await page.locator(".screenplay-element-row", { hasText: "Field recorder" }).count() === 1,
    "Repeated element paste should not duplicate the target occurrence",
  );
  await mkdir(failureDir, { recursive: true });
  await page.locator(".screenplay-workspace-grid").screenshot({ path: resolve(failureDir, "film-element-copy-paste-desktop.png") });

  const elementMarkdownPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='screenplay-element-report-markdown']").click();
  const elementMarkdownDownload = await elementMarkdownPromise;
  assert(elementMarkdownDownload.suggestedFilename().includes("film-element-list-echoes_in_the_static-prop-"), "Element Markdown filename should include project and category");
  const elementMarkdownStream = await elementMarkdownDownload.createReadStream();
  const elementMarkdownChunks = [];
  for await (const chunk of elementMarkdownStream) elementMarkdownChunks.push(chunk);
  const elementMarkdown = Buffer.concat(elementMarkdownChunks).toString("utf8");
  assert(elementMarkdown.includes("# Element List: Echoes in the Static"), "Element Markdown should include its project heading");
  assert(elementMarkdown.includes("Filter: Props"), "Element Markdown should declare the selected category");
  assert(elementMarkdown.includes("Field recorder"), "Element Markdown should include the filtered element");
  assert(elementMarkdown.includes("1 line") && elementMarkdown.includes("2 line"), "Element Markdown should include every source-free occurrence position");
  assert(elementMarkdown.includes("metadata-only local export"), "Element Markdown should declare its export policy");
  assert(!elementMarkdown.includes("The signal is back."), "Element Markdown should omit screenplay source text");

  const elementCsvPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='screenplay-element-report-csv']").click();
  const elementCsvDownload = await elementCsvPromise;
  assert(elementCsvDownload.suggestedFilename().endsWith(".csv"), "Element CSV should use a CSV filename");
  const elementCsvStream = await elementCsvDownload.createReadStream();
  const elementCsvChunks = [];
  for await (const chunk of elementCsvStream) elementCsvChunks.push(chunk);
  const elementCsv = Buffer.concat(elementCsvChunks).toString("utf8");
  assert(elementCsv.startsWith("\uFEFF\"Category\",\"Element\""), "Element CSV should be UTF-8 BOM-prefixed with stable quoted headers");
  assert(elementCsv.includes("\"Props\",\"Field recorder\""), "Element CSV should include the filtered element row");
  assert(elementCsv.includes("1 line") && elementCsv.includes("2 line"), "Element CSV should include every source-free occurrence position");
  assert(!elementCsv.includes("The signal is back."), "Element CSV should omit screenplay source text");
  await expectBodyText(page, "Element list exported for Echoes in the Static.");

  const downloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='screenplay-export']").click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  assert(exported.sourcePolicy === "user_requested_plaintext_export", "Breakdown export should declare its plaintext policy");
  assert(exported.breakdown.revision.title === "Night Signal", "Breakdown export should preserve the Fountain title");
  assert(exported.breakdown.scenes.length === 3, "Breakdown export should include parsed scenes");
  await expectBodyText(page, "Breakdown exported for Night Signal.");

  const searchForm = page.locator("form[data-action='screenplay-search']");
  await searchForm.locator("input[name='query']").fill("Abandoned relay tower");
  const typedSearchQuery = await searchForm.locator("input[name='query']").inputValue();
  assert(
    typedSearchQuery === "Abandoned relay tower",
    `Screenplay search input should retain the typed query before submit; received ${JSON.stringify(typedSearchQuery)}`,
  );
  await searchForm.locator("button[type='submit']").click();
  await expectBodyText(page, "1 local screenplay match for Abandoned relay tower.");
  assert(await page.locator(".screenplay-scene-row").count() === 1, "Local script search should filter to the matching scene");
  await page.locator("[data-action='screenplay-search-clear']").click();
  assert(await page.locator(".screenplay-scene-row").count() === 3, "Clearing local script search should restore every scene");

  const manualForm = page.locator("form[data-action='screenplay-manual-element']");
  await manualForm.locator("select[name='category']").selectOption("sound");
  await manualForm.locator("input[name='name']").fill("Generator hum");
  await manualForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Generator hum: added to the selected scene as Sound.");
  await expectBodyText(page, "manual");
  assert(await page.locator(".screenplay-element-row.confirmed").count() === 1, "Manual scene tag should start confirmed");
  assert(
    await page.locator("[data-screenplay-element-report-id]", { hasText: "Generator hum" }).count() === 1,
    "Manual tags should feed the shared element inventory immediately",
  );

  const generatorReportRow = page.locator("[data-screenplay-element-report-id]", { hasText: "Generator hum" });
  await generatorReportRow.locator(".screenplay-element-category-move summary").click();
  await generatorReportRow.locator("select[name='category']").selectOption("equipment");
  await generatorReportRow.locator("form[data-action='screenplay-element-category-move'] button[type='submit']").click();
  await expectBodyText(page, "Generator hum: moved from Sound to Equipment.");
  assert(await page.locator("[data-action='screenplay-element-filter']").inputValue() === "equipment", "Category move should keep the moved element visible in its destination filter");
  assert(
    await page.locator("[data-screenplay-element-report-id]", { hasText: "Generator hum" }).count() === 1,
    "Category move should preserve the existing element identity and occurrence row",
  );

  await page.locator("form[data-action='screenplay-search'] input[name='query']").fill("Generator hum");
  await page.locator("form[data-action='screenplay-search'] button[type='submit']").click();
  await expectBodyText(page, "1 local screenplay match for Generator hum.");
  assert(await page.locator(".screenplay-scene-row").count() === 1, "Search should include active manual graph elements");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".screenplay-workspace-grid").waitFor({ state: "visible" });
  assert(await page.locator(".screenplay-scene-row").count() === 3, "Screenplay search query should not persist through reload");
  assert(await page.locator("[data-action='screenplay-elements-paste']").count() === 0, "Copied element state should clear on reload");
  await expectBodyText(page, "Generator hum");
  await mkdir(failureDir, { recursive: true });
  await page.locator("main").screenshot({ path: resolve(failureDir, "film-element-list-desktop.png") });
  assert(sourceLeakRequests.length === 0, `Screenplay source leaked into Worker request bodies: ${sourceLeakRequests.join(", ")}`);
  page.off("request", captureSourceLeak);
  await expectNoDocumentOverflow(page, "desktop screenplay breakdown workspace");
  await expectNoSeriousA11yViolations(page, "desktop screenplay breakdown workspace");
}

async function importScreenplaySmokeFixture(
  page,
  source = screenplaySmokeFountain,
  name = "night-signal.fountain",
) {
  await clickWorkspaceSection(page, "breakdown");
  const chooserPromise = page.waitForEvent("filechooser", { timeout: 10_000 });
  await page.locator("[data-action='screenplay-import']:visible").first().click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name,
    mimeType: "text/plain",
    buffer: Buffer.from(source),
  });
  await expectBodyText(page, "Night Signal");
}

async function runScreenplayRevisionSmoke(page) {
  await clickWorkspaceSection(page, "breakdown");
  await importScreenplaySmokeFixture(page, screenplayRevisionSmokeFountain, "night-signal-blue.fountain");
  await page.locator(".screenplay-revision-panel").waitFor({ state: "visible" });
  assert(await page.locator("[data-action='screenplay-revision-select'] option").count() === 2, "Revision import should preserve both breakdowns");
  assert(await page.locator(".screenplay-revision-summary .unchanged strong").textContent() === "1", "Revision review should detect one unchanged scene");
  assert(await page.locator(".screenplay-revision-summary .changed strong").textContent() === "1", "Revision review should detect one changed scene");
  assert(await page.locator(".screenplay-revision-summary .added strong").textContent() === "1", "Revision review should detect one added scene");
  assert(await page.locator(".screenplay-revision-summary .removed strong").textContent() === "1", "Revision review should detect one removed scene");
  await page.locator("[data-action='screenplay-element-filter']").selectOption("all");
  assert(
    await page.locator(".screenplay-review-controls .is-active").count() >= 1,
    "Revision import should carry a matching reviewed occurrence from the selected base",
  );

  const reportDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='screenplay-revision-export']").click();
  const reportDownload = await reportDownloadPromise;
  const reportStream = await reportDownload.createReadStream();
  const reportChunks = [];
  for await (const chunk of reportStream) reportChunks.push(chunk);
  const report = Buffer.concat(reportChunks).toString("utf8");
  assert(report.includes("# Screenplay Revision Report:"), "Revision export should include its heading");
  assert(report.includes("- Changed scenes: 1"), "Revision export should include deterministic counts");
  assert(report.includes("metadata-only local export"), "Revision export should declare its policy");
  assert(!report.includes("The signal is back."), "Revision export should omit screenplay source text");

  await page.locator("[data-action='screenplay-revision-carry-forward']").click();
  await expectBodyText(page, "Revision carried forward:");
  await clickWorkspaceSection(page, "schedule");
  assert(
    await page.locator("[data-action='schedule-version-select'] option").count() === 4,
    "Revision carry-forward should create one draft copy for each prior schedule",
  );
  await clickWorkspaceSection(page, "sides");
  await expectBodyText(page, "A newer screenplay revision is available");
  await expectBodyText(page, "The signal is back.");
  await clickWorkspaceSection(page, "breakdown");
  await page.locator("[data-action='screenplay-revision-carry-forward']").click();
  await expectBodyText(page, "Revision planning was already carried forward.");
  await clickWorkspaceSection(page, "schedule");
  assert(
    await page.locator("[data-action='schedule-version-select'] option").count() === 4,
    "Repeated revision carry-forward should not duplicate draft schedules",
  );
  await clickWorkspaceSection(page, "breakdown");
  await expectNoDocumentOverflow(page, "desktop screenplay revision review");
  await expectNoSeriousA11yViolations(page, "desktop screenplay revision review");
  await mkdir(failureDir, { recursive: true });
  await page.locator("main").screenshot({ path: resolve(failureDir, "film-screenplay-revision-desktop.png") });
}

async function runCallSheetsWorkspaceSmoke(page) {
  await clickWorkspaceSection(page, "call-sheets");
  await expectBodyText(page, "Generate from schedule");
  const generator = page.locator("form[data-action='call-sheet-create']");
  assert(await generator.locator("select[name='sourceRef'] option").count() >= 1, "Assigned schedule days should be available for call-sheet generation");
  await generator.locator("button[type='submit']").click();
  await expectBodyText(page, "generated from Schedule 2");
  await expectBodyText(page, "Upcoming Call Sheet");
  await expectBodyText(page, "Scenes");
  await expectBodyText(page, "Cast Calls");
  assert(await page.locator(".call-sheet-scene-row").count() === 3, "Generated call sheet should include a header plus two scheduled scenes");
  assert(await page.locator(".call-sheet-cast-row").count() === 2, "Generated call sheet should include both reviewed cast requirements");

  const editor = page.locator("form[data-action='call-sheet-update']");
  await editor.locator("input[name='title']").fill("Night Signal - Day 1");
  await editor.locator("input[name='callTime']").fill("06:30");
  await editor.locator("input[name='estimatedWrapTime']").fill("18:30");
  await editor.locator("input[name='primaryLocation']").fill("Community Radio Station");
  await editor.locator("textarea[name='parkingInstructions']").fill("Crew parking in the east lot.");
  await editor.locator("input[name='nearestHospital']").fill("County Medical Center");
  await editor.locator("textarea[name='weatherNotes']").fill("Cold morning; clear by noon.");
  await editor.locator("textarea[name='generalNotes']").fill("Breakfast available at crew call.");
  await editor.locator("textarea[name='safetyNotes']").fill("Use high visibility vests near the access road.");
  await editor.locator("button[type='submit']").click();
  await expectBodyText(page, "Night Signal - Day 1 details saved locally.");

  const maraCall = page.locator("form[data-action='call-sheet-cast-update']", { hasText: "MARA" });
  await maraCall.locator("input[name='callTime']").fill("06:45");
  await maraCall.locator("input[name='notes']").fill("HMU complete by 07:00.");
  await maraCall.locator("button[type='submit']").click();
  await expectBodyText(page, "MARA call saved locally.");

  await clickWorkspaceSection(page, "schedule");
  await page.locator("[data-action='schedule-lock-toggle']").click();
  await expectBodyText(page, "Schedule 2 unlocked.");
  const sourceDayDate = page.locator("[data-action='schedule-day-date']").first();
  await sourceDayDate.fill("2026-09-03");
  await sourceDayDate.dispatchEvent("change");
  await expectBodyText(page, "Shoot day dated 2026-09-03.");
  await page.locator("[data-action='schedule-lock-toggle']").click();
  await expectBodyText(page, "Schedule 2 locked.");

  await clickWorkspaceSection(page, "call-sheets");
  await expectBodyText(page, "The source schedule changed after this sheet was generated.");
  await expectNoDocumentOverflow(page, "desktop stale draft call sheet");
  await expectNoSeriousA11yViolations(page, "desktop stale draft call sheet");
  await mkdir(failureDir, { recursive: true });
  await page.locator("main").screenshot({ path: resolve(failureDir, "film-call-sheet-sync-desktop.png") });
  await page.locator("[data-action='call-sheet-sync']").click();
  await expectBodyText(page, "Night Signal - Day 1 synced from Schedule 2; manual details preserved.");
  assert(await editor.locator("input[name='date']").inputValue() === "2026-09-03", "Call-sheet sync should refresh the source shoot date");
  assert(await editor.locator("input[name='primaryLocation']").inputValue() === "Community Radio Station", "Call-sheet sync should preserve manual logistics");
  const syncedMaraCall = page.locator("form[data-action='call-sheet-cast-update']", { hasText: "MARA" });
  assert(await syncedMaraCall.locator("input[name='callTime']").inputValue() === "06:45", "Call-sheet sync should preserve matching cast call edits");
  assert(await page.locator("[data-action='call-sheet-sync']").count() === 0, "Call-sheet sync should clear the source-change action");

  await page.locator("[data-action='call-sheet-status-toggle']").click();
  await expectBodyText(page, "Night Signal - Day 1 finalized.");
  assert(await editor.locator("fieldset:disabled").count() === 1, "Finalized call-sheet details should be read-only");
  await expectBodyText(page, "Crew Snapshot");
  await expectBodyText(page, "Gear Pull");
  await expectBodyText(page, "Attachments To Review");
  await expectBodyText(page, "Community Radio Station");
  await expectNoSeriousA11yViolations(page, "desktop generated call sheet");
  await mkdir(failureDir, { recursive: true });
  await page.locator("main").screenshot({ path: resolve(failureDir, "film-call-sheet-desktop.png") });
  const downloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='export-call-sheet']").click();
  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  assert(filename.startsWith("film-call-sheet-"), `Expected call sheet filename, received ${filename}`);
  assert(filename.endsWith(".md"), `Expected Markdown call sheet download, received ${filename}`);
  const callSheetPath = resolve(failureDir, filename);
  await download.saveAs(callSheetPath);
  const callSheet = await readFile(callSheetPath, "utf8");
  assert(callSheet.includes("# Call Sheet: Echoes in the Static"), "Call sheet should include the selected project title");
  assert(callSheet.includes("Policy: provider secrets"), "Call sheet should include the export policy");
  assert(callSheet.includes("- Title: Night Signal - Day 1"), "Call sheet should include editable generated details");
  assert(callSheet.includes("- Unit: Main unit"), "Call sheet should include its schedule-day unit snapshot");
  assert(callSheet.includes("## Scenes"), "Call sheet should include the schedule-day scene snapshot");
  assert(callSheet.includes("INT. COMMUNITY RADIO STATION - NIGHT"), "Call sheet should include scheduled scene headings");
  assert(callSheet.includes("## Cast Calls"), "Call sheet should include reviewed cast calls");
  assert(callSheet.includes("MARA - 06:45"), "Call sheet should include edited cast call times");
  assert(callSheet.includes("## Safety And Logistics"), "Call sheet should include safety and logistics metadata");
  assert(callSheet.includes("Use high visibility vests near the access road."), "Call sheet should include edited safety notes");
  assert(callSheet.includes("## Crew"), "Call sheet should include crew metadata");
  assert(callSheet.includes("## Gear"), "Call sheet should include gear metadata");
  assert(callSheet.includes("## Attachments To Review"), "Call sheet should include attachment review metadata");
  assert(!callSheet.includes("The signal is back."), "Call sheet should not include screenplay source text");
  await expectBodyText(page, "Call sheet exported for Echoes in the Static.");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".call-sheet-editor-panel").waitFor({ state: "visible" });
  await expectBodyText(page, "Night Signal - Day 1");
  assert(await page.locator("form[data-action='call-sheet-update'] fieldset:disabled").count() === 1, "Finalized call sheet should persist through reload");
  await expectNoDocumentOverflow(page, "desktop call sheets workspace");
}

async function runProductionShotsWorkspaceSmoke(page) {
  await clickWorkspaceSection(page, "shots");
  await expectBodyText(page, "Shot List");
  const createForm = page.locator("form[data-action='production-shot-create']");
  await createForm.locator("select[name='sceneId']").selectOption({ label: "1 - INT. COMMUNITY RADIO STATION - NIGHT" });
  await createForm.locator("input[name='description']").fill("Establish community radio station");
  await createForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Shot 1 added to scene 1.");

  let editor = page.locator("form[data-action='production-shot-update']");
  await editor.locator("input[name='shotNumber']").fill("1A");
  await editor.locator("select[name='status']").selectOption("ready");
  await editor.locator("input[name='estimatedMinutes']").fill("12");
  await editor.locator("input[name='shotSize']").fill("Wide");
  await editor.locator("input[name='angle']").fill("Eye-level");
  await editor.locator("input[name='movement']").fill("Slow dolly in");
  await editor.locator("input[name='lens']").fill("35mm");
  await editor.locator("input[name='cameraSupport']").fill("Dana dolly");
  await editor.locator("input[name='frameRate']").fill("23.976");
  await editor.locator("input[name='setupGroup']").fill("Station master");
  await editor.locator("textarea[name='audioNotes']").fill("Protect Mara dialogue.");
  await editor.locator("textarea[name='lightingNotes']").fill("Console practicals with soft moon push.");
  await editor.locator("textarea[name='notes']").fill("Hold for clean plate.");
  await editor.locator("input[name='documentId'][value='doc_script_v7']").check();
  await editor.locator("button[type='submit']").click();
  await expectBodyText(page, "Shot 1A saved locally.");

  await createForm.locator("input[name='description']").fill("=Formula-safe transmitter insert");
  await createForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Shot 2 added to scene 1.");
  editor = page.locator("form[data-action='production-shot-update']");
  await editor.locator("input[name='shotNumber']").fill("1B");
  await editor.locator("select[name='status']").selectOption("captured");
  await editor.locator("input[name='estimatedMinutes']").fill("4");
  await editor.locator("button[type='submit']").click();
  await expectBodyText(page, "Shot 1B saved locally.");
  await page.locator("[data-action='production-shot-reorder'][data-direction='-1']").click();
  await expectBodyText(page, "Shot 1B moved to order 1.");
  assert(await page.locator("[data-action='production-shot-row-select']").count() === 2, "Shot roster should contain both scene-linked shots");
  assert((await page.locator("[data-action='production-shot-row-select']").first().innerText()).includes("Formula-safe"), "Reordered shot should render first within its scene");
  await expectBodyText(page, "Night Signal - Day 1");
  await expectBodyText(page, "Schedule 2");

  await mkdir(failureDir, { recursive: true });
  const markdownDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='production-shots-markdown-export']").click();
  const markdownDownload = await markdownDownloadPromise;
  const markdownFilename = markdownDownload.suggestedFilename();
  assert(markdownFilename.endsWith(".md"), `Expected Markdown shot list, received ${markdownFilename}`);
  const markdownPath = resolve(failureDir, markdownFilename);
  await markdownDownload.saveAs(markdownPath);
  const markdown = await readFile(markdownPath, "utf8");
  assert(markdown.includes("# Shot List: Echoes in the Static"), "Shot list should include the selected project");
  assert(markdown.includes("Shot 1A"), "Shot list should include the edited shot number");
  assert(markdown.includes("Slow dolly in"), "Shot list should include camera decisions");
  assert(markdown.includes("Script v7.pdf"), "Shot list should resolve selected project-document references");
  assert(markdown.includes("Night Signal - Day 1 (Main unit, final)"), "Shot list should include derived call-sheet unit and status");
  assert(!markdown.includes("The signal is back."), "Shot list should omit screenplay source text");
  await expectBodyText(page, "Markdown shot list exported for Echoes in the Static.");

  const csvDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='production-shots-csv-export']").click();
  const csvDownload = await csvDownloadPromise;
  const csvFilename = csvDownload.suggestedFilename();
  assert(csvFilename.endsWith(".csv"), `Expected CSV shot list, received ${csvFilename}`);
  const csvPath = resolve(failureDir, csvFilename);
  await csvDownload.saveAs(csvPath);
  const csv = await readFile(csvPath, "utf8");
  assert(csv.startsWith("\uFEFF\"Order\",\"Shot\",\"Scene\""), "Shot CSV should be UTF-8 and quote stable columns");
  assert(csv.includes("\"'=Formula-safe transmitter insert\""), "Shot CSV should neutralize formula-leading descriptions");
  assert(!csv.includes("The signal is back."), "Shot CSV should omit screenplay source text");
  await expectBodyText(page, "CSV shot list exported for Echoes in the Static.");

  await page.locator("main").screenshot({ path: resolve(failureDir, "film-shots-desktop.png") });
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".production-shot-editor-panel").waitFor({ state: "visible" });
  assert(await page.locator("[data-action='production-shot-row-select']").count() === 2, "Shots should persist through IndexedDB reload");
  assert(await page.locator("form[data-action='production-shot-update'] input[name='shotNumber']").inputValue() === "1B", "Selected reordered shot should persist through reload");
  await expectNoDocumentOverflow(page, "desktop shots workspace");
  await expectNoSeriousA11yViolations(page, "desktop shots workspace");
}

async function runProductionSidesWorkspaceSmoke(page) {
  await clickWorkspaceSection(page, "sides");
  await expectBodyText(page, "Local source text");
  await expectBodyText(page, "The signal is back.");
  assert(await page.locator(".sides-scene").count() === 2, "Sides should preserve the two-scene call-sheet snapshot");
  assert(await page.locator(".sides-source-text").count() === 2, "Sides should render one source block per scheduled scene");
  assert(await page.locator("[data-action='call-sheet-select'] option").count() === 1, "Sides should reuse the generated call-sheet selection");

  await mkdir(failureDir, { recursive: true });
  const markdownDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='production-sides-markdown-export']").click();
  const markdownDownload = await markdownDownloadPromise;
  const markdownFilename = markdownDownload.suggestedFilename();
  assert(markdownFilename.startsWith("film-sides-"), `Expected sides filename, received ${markdownFilename}`);
  assert(markdownFilename.endsWith(".md"), `Expected Markdown sides download, received ${markdownFilename}`);
  const markdownPath = resolve(failureDir, markdownFilename);
  await markdownDownload.saveAs(markdownPath);
  const markdown = await readFile(markdownPath, "utf8");
  assert(markdown.includes("# Sides: Night Signal - Day 1"), "Markdown sides should include the call-sheet title");
  assert(markdown.includes("user-requested local source export"), "Markdown sides should declare the source-text export policy");
  assert(markdown.includes("The signal is back."), "Markdown sides should include scheduled screenplay source text");
  assert(markdown.includes("## Scene 1: INT. COMMUNITY RADIO STATION - NIGHT"), "Markdown sides should include scene headings");
  assert(!markdown.includes("private contact"), "Markdown sides should omit private talent contact fields");
  await expectBodyText(page, "Markdown sides exported for Night Signal - Day 1.");

  const htmlDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='production-sides-html-export']").click();
  const htmlDownload = await htmlDownloadPromise;
  const htmlFilename = htmlDownload.suggestedFilename();
  assert(htmlFilename.endsWith(".html"), `Expected print HTML sides download, received ${htmlFilename}`);
  const htmlPath = resolve(failureDir, htmlFilename);
  await htmlDownload.saveAs(htmlPath);
  const html = await readFile(htmlPath, "utf8");
  assert(html.startsWith("<!doctype html>"), "Print sides should be a standalone HTML document");
  assert(html.includes("Content-Security-Policy"), "Print sides should block external content and scripts");
  assert(html.includes("@page { size: letter"), "Print sides should declare letter-sized print output");
  assert(html.includes("The signal is back."), "Print sides should include scheduled screenplay source text");
  assert(!html.includes("<script"), "Print sides should contain no executable scripts");
  await expectBodyText(page, "Print HTML sides exported for Night Signal - Day 1.");
  await page.locator("main").screenshot({ path: resolve(failureDir, "film-sides-desktop.png") });
  await expectNoDocumentOverflow(page, "desktop sides workspace");
  await expectNoSeriousA11yViolations(page, "desktop sides workspace");
}

async function runProductionReportsWorkspaceSmoke(page) {
  await clickWorkspaceSection(page, "reports");
  await expectBodyText(page, "Production Reports");
  const generator = page.locator("form[data-action='production-report-create']");
  assert(await generator.locator("select[name='callSheetId'] option").count() === 1, "Finalized generated call sheet should be available for one daily report");
  await generator.locator("button[type='submit']").click();
  await expectBodyText(page, "created from Night Signal - Day 1");
  await expectBodyText(page, "Daily Production Report");
  assert(await page.locator(".production-report-scene-row").count() === 2, "Daily report should preserve both planned scene IDs");

  const editor = page.locator("form[data-action='production-report-update']");
  await editor.locator("input[name='title']").fill("Night Signal DPR - Day 1");
  await editor.locator("input[name='actualCrewCallTime']").fill("06:30");
  await editor.locator("input[name='firstShotTime']").fill("07:30");
  await editor.locator("input[name='mealStartTime']").fill("12:00");
  await editor.locator("input[name='mealEndTime']").fill("12:30");
  await editor.locator("input[name='cameraWrapTime']").fill("17:45");
  await editor.locator("input[name='crewWrapTime']").fill("18:30");
  await editor.locator("input[name='crewCount']").fill("5");
  await editor.locator("input[name='castCount']").fill("2");
  await editor.locator("input[name='backgroundCount']").fill("3");
  await editor.locator("input[name='mealCount']").fill("10");
  await editor.locator("input[name='setupCount']").fill("18");
  await editor.locator("input[name='takeCount']").fill("54");
  await editor.locator("input[name='footageMinutes']").fill("90");
  await editor.locator("textarea[name='weatherActual']").fill("Clear and cold.");
  await editor.locator("textarea[name='delayNotes']").fill("Twenty-minute generator reset.");
  await editor.locator("textarea[name='productionNotes']").fill("Radio station coverage complete.");
  await editor.locator("textarea[name='safetyIncidentNotes']").fill("No incidents reported.");
  await editor.locator("textarea[name='tomorrowNotes']").fill("Pickup insert of the recorder display.");
  await editor.locator("button[type='submit']").click();
  await expectBodyText(page, "Night Signal DPR - Day 1 details saved locally.");
  await expectBodyText(page, "12h");
  await expectBodyText(page, "11h 30m");

  const sceneRows = page.locator("form[data-action='production-report-scene-update']");
  await sceneRows.nth(0).locator("select[name='status']").selectOption("completed");
  await sceneRows.nth(0).locator("input[name='notes']").fill("Printed after three takes.");
  await sceneRows.nth(0).locator("button[type='submit']").click();
  await expectBodyText(page, "Scene result saved as completed.");
  await sceneRows.nth(1).locator("select[name='status']").selectOption("partial");
  await sceneRows.nth(1).locator("input[name='notes']").fill("=PICKUP required");
  await sceneRows.nth(1).locator("button[type='submit']").click();
  await expectBodyText(page, "Scene result saved as partial.");
  await expectBodyText(page, "1/2");
  await expectBodyText(page, "50%");

  await page.locator("[data-action='production-report-status-toggle']").click();
  await expectBodyText(page, "Night Signal DPR - Day 1 finalized.");
  assert(await editor.locator("fieldset:disabled").count() === 1, "Finalized production report should be read-only");
  await expectNoSeriousA11yViolations(page, "desktop production reports workspace");
  await mkdir(failureDir, { recursive: true });
  await page.locator("main").screenshot({ path: resolve(failureDir, "film-production-report-desktop.png") });

  const markdownDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='production-report-export']").click();
  const markdownDownload = await markdownDownloadPromise;
  assert(markdownDownload.suggestedFilename().startsWith("film-production-report-"), "Production report should use the handoff filename prefix");
  const markdownPath = resolve(failureDir, markdownDownload.suggestedFilename());
  await markdownDownload.saveAs(markdownPath);
  const markdown = await readFile(markdownPath, "utf8");
  assert(markdown.includes("# Daily Production Report: Echoes in the Static"), "Production report should include the project title");
  assert(markdown.includes("- Completion: 50%"), "Production report should include deterministic progress");
  assert(markdown.includes("- Working time: 11h 30m"), "Production report should include deterministic working duration");
  assert(markdown.includes("- Unit: Main unit"), "Production report should preserve its call-sheet unit snapshot");
  assert(markdown.includes("Twenty-minute generator reset."), "Production report should include delay notes");
  assert(!markdown.includes("The signal is back."), "Production report should omit screenplay source text");

  const csvDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='production-report-csv-export']").click();
  const csvDownload = await csvDownloadPromise;
  assert(csvDownload.suggestedFilename().startsWith("film-production-scenes-"), "Scene CSV should use the handoff filename prefix");
  const csvPath = resolve(failureDir, csvDownload.suggestedFilename());
  await csvDownload.saveAs(csvPath);
  const csv = await readFile(csvPath, "utf8");
  assert(csv.includes('"Date","Shoot day","Unit","Scene","Heading","Location","Time of day","Status","Notes"'), "Scene CSV should include stable unit-aware columns");
  assert(csv.includes('"completed"'), "Scene CSV should include completed status");
  assert(csv.includes("'=PICKUP required"), "Scene CSV should neutralize spreadsheet formulas");

  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".production-report-editor-panel").waitFor({ state: "visible" });
  await expectBodyText(page, "Night Signal DPR - Day 1");
  assert(await page.locator("form[data-action='production-report-update'] fieldset:disabled").count() === 1, "Finalized production report should persist through reload");
  await expectNoDocumentOverflow(page, "desktop production reports workspace");
}

async function runLocationsWorkspaceSmoke(page) {
  await clickWorkspaceSection(page, "locations");
  await expectBodyText(page, "Add Scouting Record");
  await expectBodyText(page, "Imported Locations");
  await expectBodyText(page, "No imported location rows for this project yet.");
  const createForm = page.locator("form[data-action='production-location-create']");
  const elementSelect = createForm.locator("select[name='screenplayElementId']");
  assert(await elementSelect.locator("option").count() > 1, "Screenplay breakdown should expose location candidates for scouting");
  await elementSelect.selectOption({ index: 1 });
  const selectedLocationName = await elementSelect.locator("option:checked").textContent();
  assert(selectedLocationName, "Expected a selected screenplay location name");
  await createForm.locator("button[type='submit']").click();
  await expectBodyText(page, "added to local scouting records.");
  await expectBodyText(page, "Scouting Details");
  await expectBodyText(page, "Production Usage");

  const editor = page.locator("form[data-action='production-location-update']");
  await editor.locator("select[name='status']").selectOption("confirmed");
  await editor.locator("select[name='permitStatus']").selectOption("approved");
  await editor.locator("input[name='address']").fill("1420 Dock St, Los Angeles, CA");
  await editor.locator("input[name='contactName']").fill("Lee Location Owner");
  await editor.locator("input[name='contactDetails']").fill("505-555-0100");
  await editor.locator("textarea[name='permitNotes']").fill("Filming permit approved for the scheduled day.");
  await editor.locator("textarea[name='parkingAccess']").fill("Crew lot B. Load-in through the west roll-up door.");
  await editor.locator("textarea[name='powerNotes']").fill("Two isolated 20A circuits near stage left.");
  await editor.locator("textarea[name='soundNotes']").fill("Freight traffic every thirty minutes.");
  await editor.locator("textarea[name='restroomNotes']").fill("Two restrooms inside the production entrance.");
  await editor.locator("textarea[name='accessibilityNotes']").fill("Step-free access through the west door.");
  await editor.locator("input[name='nearestHospital']").fill("County Medical, 800 Hope St");
  await editor.locator("textarea[name='weatherNotes']").fill("Manual forecast review required 24 hours before call.");
  await editor.locator("textarea[name='safetyNotes']").fill("High visibility vests required during load-in.");
  await editor.locator("textarea[name='generalNotes']").fill("Owner opens the site thirty minutes before crew call.");
  await editor.locator("label", { hasText: "Location Scout.pdf" }).locator("input[name='documentId']").check();
  await editor.locator("button[type='submit']").click();
  await expectBodyText(page, "scouting details saved locally.");
  await expectBodyText(page, "Confirmed - permit Approved");

  const applyButton = page.locator("[data-action='production-location-apply-call-sheet']");
  assert(await applyButton.isDisabled(), "Final call sheet should block location logistics application");
  await clickWorkspaceSection(page, "call-sheets");
  await page.locator("[data-action='call-sheet-status-toggle']").click();
  await expectBodyText(page, "reopened.");
  await clickWorkspaceSection(page, "locations");
  assert(await page.locator("[data-action='production-location-apply-call-sheet']").isEnabled(), "Confirmed location should apply to a draft call sheet");
  await page.locator("[data-action='production-location-apply-call-sheet']").click();
  await expectBodyText(page, "logistics applied to Night Signal - Day 1.");

  await mkdir(failureDir, { recursive: true });
  await page.locator("main").screenshot({ path: resolve(failureDir, "film-location-desktop.png") });
  const downloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='production-location-export']").click();
  const download = await downloadPromise;
  assert(download.suggestedFilename().startsWith("film-location-"), "Location brief should use the local handoff filename prefix");
  const path = resolve(failureDir, download.suggestedFilename());
  await download.saveAs(path);
  const brief = await readFile(path, "utf8");
  assert(brief.includes("# Location Brief:"), "Location brief should include a stable heading");
  assert(brief.includes("Lee Location Owner"), "Location brief should include the explicitly entered contact");
  assert(brief.includes("Crew lot B"), "Location brief should include access logistics");
  assert(brief.includes("## Schedule Use"), "Location brief should include schedule-derived usage");
  assert(brief.includes("Location Scout.pdf"), "Location brief should include selected existing document references");
  assert(!brief.includes("The signal is back."), "Location brief should omit screenplay source text");

  await clickWorkspaceSection(page, "call-sheets");
  assert(
    await page.locator("form[data-action='call-sheet-update'] input[name='primaryLocation']").inputValue() === `${selectedLocationName.trim()} - 1420 Dock St, Los Angeles, CA`,
    "Applying a location should snapshot its name and address into the draft call sheet",
  );
  await clickWorkspaceSection(page, "locations");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".production-location-editor-panel").waitFor({ state: "visible" });
  assert(
    await page.locator("form[data-action='production-location-update'] input[name='contactName']").inputValue() === "Lee Location Owner",
    "Location contact should persist through IndexedDB reload",
  );
  assert(await page.locator("[data-action='production-location-select'] option").count() === 1, "Location record should persist through IndexedDB reload");
  await expectNoSeriousA11yViolations(page, "desktop production locations workspace");
  await expectNoDocumentOverflow(page, "desktop locations workspace");
}

async function runTalentWorkspaceSmoke(page) {
  await clickWorkspaceSection(page, "talent");
  await expectBodyText(page, "Add Character Record");
  await expectBodyText(page, "Casting Roster");
  const createForm = page.locator("form[data-action='production-talent-create']");
  await createForm.locator("select[name='screenplayElementId']").selectOption({ label: "MARA" });
  await createForm.locator("button[type='submit']").click();
  await expectBodyText(page, "MARA added to local talent records.");
  await expectBodyText(page, "Casting Details");
  await expectBodyText(page, "Production Usage");
  await expectBodyText(page, "Unavailable during radio-station shoot");

  const editor = page.locator("form[data-action='production-talent-update']");
  await editor.locator("input[name='performerName']").fill("Avery Stone");
  await editor.locator("select[name='status']").selectOption("cast");
  await editor.locator("select[name='paperworkStatus']").selectOption("complete");
  await editor.locator("input[name='contactName']").fill("Avery Stone");
  await editor.locator("input[name='contactDetails']").fill("avery@example.test / 505-555-0142");
  await editor.locator("input[name='representativeName']").fill("Morgan Lee");
  await editor.locator("input[name='representativeDetails']").fill("morgan@example.test");
  await editor.locator("select[name='rateBasis']").selectOption("day");
  await editor.locator("input[name='agreedRate']").fill("250");
  await editor.locator("textarea[name='dealNotes']").fill("Entered one-day rate; no payroll or compliance calculation.");
  await editor.locator("textarea[name='travelNotes']").fill("Local hire; no lodging required.");
  await editor.locator("textarea[name='dietaryNotes']").fill("Vegetarian meals.");
  await editor.locator("textarea[name='accessibilityNotes']").fill("Quiet holding area requested.");
  await editor.locator("textarea[name='wardrobeNotes']").fill("Fitting complete; hero jacket approved.");
  await editor.locator("textarea[name='generalNotes']").fill("Available for one pickup morning.");
  await editor.locator("label", { hasText: "Script v7.pdf" }).locator("input[name='documentId']").check();
  await editor.locator("button[type='submit']").click();
  await expectBodyText(page, "MARA talent details saved locally.");
  await expectBodyText(page, "Cast - paperwork Complete");
  await expectBodyText(page, "Avery Stone");

  const applyButton = page.locator("[data-action='production-talent-apply-call-sheet']");
  assert(await applyButton.isEnabled(), "Cast linked talent should apply to a draft call sheet that requires the character");
  await applyButton.click();
  await expectBodyText(page, "Avery Stone applied to MARA on Night Signal - Day 1.");

  await mkdir(failureDir, { recursive: true });
  await page.locator("main").screenshot({ path: resolve(failureDir, "film-talent-desktop.png") });
  const downloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='production-talent-export']").click();
  const download = await downloadPromise;
  assert(download.suggestedFilename().startsWith("film-talent-"), "Talent brief should use the local handoff filename prefix");
  const path = resolve(failureDir, download.suggestedFilename());
  await download.saveAs(path);
  const brief = await readFile(path, "utf8");
  assert(brief.includes("# Talent Brief: MARA"), "Talent brief should include the linked character");
  assert(brief.includes("Avery Stone"), "Talent brief should include the entered performer");
  assert(brief.includes("$250 - Day"), "Talent brief should include entered deal terms without inferred costs");
  assert(brief.includes("Vegetarian meals."), "Talent brief should include explicit readiness details");
  assert(brief.includes("Script v7.pdf"), "Talent brief should include selected existing document references");
  assert(!brief.includes("The signal is back."), "Talent brief should omit screenplay source text");

  await clickWorkspaceSection(page, "call-sheets");
  const maraCall = page.locator("form[data-action='call-sheet-cast-update']", { hasText: "MARA" });
  assert(await maraCall.locator("input[name='performerName']").inputValue() === "Avery Stone", "Talent application should snapshot performer name into the call sheet");
  await clickWorkspaceSection(page, "talent");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".production-talent-editor-panel").waitFor({ state: "visible" });
  assert(await page.locator("form[data-action='production-talent-update'] input[name='performerName']").inputValue() === "Avery Stone", "Talent record should persist through IndexedDB reload");
  assert(await page.locator("[data-action='production-talent-select'] option").count() === 1, "Talent selector should retain the persisted record");
  await expectNoSeriousA11yViolations(page, "desktop talent workspace");
  await expectNoDocumentOverflow(page, "desktop talent workspace");
}

async function runPlanningFilterSmoke(page) {
  await clickWorkspaceSection(page, "planning");
  await expectBodyText(page, "Planning Rows");
  await page.locator("[data-action='planning-kind-filter']").selectOption("location");
  await expectBodyText(page, "0 of 0 rows shown - Locations");
  await mkdir(failureDir, { recursive: true });
  const planningDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
  await page.locator("[data-action='export-planning-view']").click();
  const planningDownload = await planningDownloadPromise;
  const planningFilename = planningDownload.suggestedFilename();
  assert(planningFilename.startsWith("film-planning-view-"), `Expected planning view filename, received ${planningFilename}`);
  assert(planningFilename.endsWith(".md"), `Expected Markdown planning view download, received ${planningFilename}`);
  const planningPath = resolve(failureDir, planningFilename);
  await planningDownload.saveAs(planningPath);
  const planningView = await readFile(planningPath, "utf8");
  assert(planningView.includes("# Planning View: Locations"), "Planning view should include the selected filter label");
  assert(planningView.includes("raw import source paths are excluded"), "Planning view should include the export policy");
  assert(planningView.includes("No planning rows in current view."), "Planning view should include an empty state");
  await expectBodyText(page, "Planning view exported for Locations.");
  await expectNoDocumentOverflow(page, "desktop planning kind filter");
}

async function queuedOperationCount(page) {
  const text = await page.locator("[data-action='sync-dry-run']").innerText();
  if (text.includes("Synced locally")) return 0;
  const match = text.match(/(\d+)\s+local ops queued/);
  assert(match, `Could not parse queued operation count from "${text}"`);
  return Number(match[1]);
}

async function exportBackupForPreview(page) {
  await mkdir(failureDir, { recursive: true });
  const dialogPromise = page.waitForEvent("dialog", { timeout: 5_000 });
  const clickPromise = page.locator("[data-action='backup']:visible").first().click();
  const dialog = await dialogPromise;
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await dialog.accept(smokePassphrase);
  await clickPromise;
  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  assert(filename.endsWith(".filmbackup.zip"), `Expected encrypted ZIP backup download, received ${filename}`);
  const backupPath = resolve(failureDir, filename);
  await download.saveAs(backupPath);
  return backupPath;
}

async function previewEncryptedBackup(page, backupPath) {
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.locator("[data-action='restore-file-preview']:visible").first().click();
  const fileChooser = await fileChooserPromise;
  const dialogPromise = page.waitForEvent("dialog");
  const setFilesPromise = fileChooser.setFiles(backupPath);
  const dialog = await dialogPromise;
  await dialog.accept(smokePassphrase);
  await setFilesPromise;
  await expectBodyText(page, "Encrypted backup decrypted for preview only");
  await expectBodyText(page, "No records were overwritten");
}

async function clickRestoreActionWithConfirmation(page, action) {
  const dialogPromise = page.waitForEvent("dialog", { timeout: 5_000 });
  const clickPromise = page.locator(`[data-action='${action}']:visible`).first().click();
  const dialog = await dialogPromise;
  await dialog.accept("RESTORE workspace_acme");
  await clickPromise;
  await page.waitForTimeout(75);
}

async function runRestoreApplicationPreflightA11ySmoke(page) {
  await clickRestoreActionWithConfirmation(page, "restore-gate-check");
  await expectBodyText(page, "Restore gate checked");
  await expectBodyText(page, "No records were overwritten");

  await clickRestoreActionWithConfirmation(page, "restore-approval-record");
  await expectBodyText(page, "Restore approval recorded");
  await expectBodyText(page, "approved pending commit");

  await clickRestoreActionWithConfirmation(page, "restore-commit-storage-check");
  await expectBodyText(page, "Restore commit storage checked");
  await expectBodyText(page, "blocked until restore apply");

  await clickRestoreActionWithConfirmation(page, "restore-application-preflight-check");
  await expectBodyText(page, "Application preflight");
  await expectBodyText(page, "blocked until restore apply implementation");
  await expectNoSeriousA11yViolations(page, "desktop restore application preflight");
}

async function runDesktopSmoke(url, browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await mockAuthRoutes(page);
  await mockProviderRoutes(page);
  await mockOperationSyncRoute(page);
  await mockRecordMutationRoutes(page);
  await mockRestoreRoutes(page);

  try {
    await page.goto(url, { waitUntil: "networkidle" });
    await expectBodyText(page, "Film");
    await expectBodyText(page, "Pool dry run");
    await expectNoDocumentOverflow(page, "desktop initial");
    await expectNoSeriousA11yViolations(page, "desktop initial");
    const initialInspectorMetrics = await page.evaluate(() => ({
      activePanels: document.querySelectorAll(".inspector-view-panel:not([hidden])").length,
      selectedView: document.querySelector("[data-action='inspector-view']")?.value ?? null,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    }));
    assert(initialInspectorMetrics.activePanels === 1, "Initial inspector should expose one workflow panel");
    assert(initialInspectorMetrics.selectedView === "overview", "Initial inspector should open on Overview");
    assert(
      initialInspectorMetrics.documentHeight < initialInspectorMetrics.viewportHeight * 4,
      `Initial inspector should not drive an excessive page height: ${JSON.stringify(initialInspectorMetrics)}`,
    );
    await auditInspectorNavigation(page);
    await mkdir(failureDir, { recursive: true });
    await page.locator("aside.inspector").screenshot({ path: resolve(failureDir, "inspector-overview-desktop.png") });
    record("desktop app shell loaded without document overflow");
    record("desktop inspector exposed one persistent, grouped workflow view at a time");

    assert(await page.locator("button.workspace-switch").count() === 0, "Current workspace identity must not be an inert button");
    assert(await page.getByRole("button", { name: "Settings" }).count() === 0, "Unimplemented Settings must not be presented as an action");
    assert(await page.getByRole("button", { name: "Trash" }).count() === 0, "Unimplemented Trash must not be presented as an action");
    await auditWorkspaceNavigation(page, "desktop workspace audit");
    await clickWorkspaceSection(page, "slate");
    record("desktop workspace audit covered every section with active navigation, headings, command contracts, and document bounds");

    const queuedBeforeProjectCreate = await queuedOperationCount(page);
    await page.locator("[data-action='create-project']:visible").first().click();
    await expectBodyText(page, "Create project");
    await expectNoSeriousA11yViolations(page, "project creation dialog");
    const projectCreateForm = page.locator("form[data-action='project-create-form']");
    await projectCreateForm.locator("input[name='title']").fill("Browser Smoke Documentary");
    await projectCreateForm.locator("select[name='projectType']").selectOption({ label: "Documentary" });
    await projectCreateForm.locator("button[type='submit']").click();
    await expectBodyText(page, "Documentary created from the film template and queued for sync.");
    assert(await queuedOperationCount(page) === queuedBeforeProjectCreate + 1, "Project creation should queue one operation");
    await page.locator("[data-project-id='proj_echoes']").first().click();
    record("desktop project onboarding captured title and type before queuing canonical sync metadata");

    await runAuthSmoke(page, { signOut: false });
    record("desktop magic-link request and verify UI flow completed with mocked Worker auth");

    await runRecordMutationSmoke(page);
    record("desktop protected record mutation request, approval, diff, and apply flow completed with mocked Worker routes");

    await runSmsComposerSmoke(page);
    record("desktop/mobile SMS self-enrollment required reviewed consent and the composer used opaque recipients");

    await runSignOutSmoke(page);
    record("desktop sign-out UI flow completed with mocked Worker auth");

    await runProviderChipSmoke(page);
    record("desktop provider dry-run chips and protected runtime live-gate manifest rendered every MVP provider boundary");

    await page.locator("[data-action='filter']").fill("ARRI prepped");
    await page.waitForTimeout(100);
    const searchIds = await workspaceProjectIds(page);
    assert(searchIds.includes("proj_echoes"), "Expected nested equipment search to include Echoes");
    assert(!searchIds.includes("proj_midnight"), "Expected nested equipment search to filter out Midnight Roads");
    record("desktop nested metadata search filtered the workspace project list");

    await clickWorkspaceSection(page, "projects");
    await page.locator("[data-action='filter']").fill("equipment 24000");
    await page.waitForTimeout(100);
    const budgetIds = await workspaceProjectIds(page);
    assert(budgetIds.includes("proj_echoes"), "Expected expense metadata search to include Echoes");
    assert(!budgetIds.includes("proj_glassline"), "Expected expense metadata search to filter out Glassline");
    await mkdir(failureDir, { recursive: true });
    const directoryDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await page.locator("[data-action='export-project-directory']").click();
    const directoryDownload = await directoryDownloadPromise;
    const directoryFilename = directoryDownload.suggestedFilename();
    assert(directoryFilename.startsWith("film-project-directory-"), `Expected project directory filename, received ${directoryFilename}`);
    assert(directoryFilename.endsWith(".md"), `Expected Markdown project directory download, received ${directoryFilename}`);
    const directoryPath = resolve(failureDir, directoryFilename);
    await directoryDownload.saveAs(directoryPath);
    const directory = await readFile(directoryPath, "utf8");
    assert(directory.includes("# Project Directory:"), "Project directory should include a heading");
    assert(directory.includes("Filter: equipment 24000"), "Project directory should include the current filter");
    assert(directory.includes("### Echoes in the Static"), "Project directory should include the filtered project");
    assert(!directory.includes("### Glassline"), "Project directory should exclude non-matching projects");
    assert(directory.includes("Markdown document bodies are excluded"), "Project directory should include the export policy");
    await expectBodyText(page, "Project directory exported for 1 visible projects.");
    record("projects workspace uses metadata search and exported the filtered project directory");

    await page.locator("[data-action='filter']").fill("");
    await runScreenplayBreakdownSmoke(page);
    record("screenplay breakdown parsed locally, persisted review/manual tags, copied and idempotently pasted source-free element selections, navigated and reused occurrences, explicitly merged a local duplicate, moved a category, switched between script and stripboard scene order, exported JSON plus filtered element-list Markdown/CSV, and kept source out of Worker requests");

    await runScheduleWorkspaceSmoke(page);
    record("schedule workspace created, batch-moved transient strip selections, assigned, reordered, versioned, locked, persisted, analyzed availability/DOOD, compared assumptions, and exported a local stripboard plus project packet");

    await runCallSheetsWorkspaceSmoke(page);
    record("call sheets workspace generated, edited, explicitly synced source drift with manual-field preservation, finalized, persisted, and exported a schedule-linked Markdown call sheet");

    await runProductionShotsWorkspaceSmoke(page);
    record("shots workspace created, edited, reordered, persisted, derived production use, and exported Markdown plus formula-safe CSV");

    await runProductionSidesWorkspaceSmoke(page);
    record("sides workspace derived scheduled screenplay text locally and exported Markdown plus script-free print HTML");

    await runProductionReportsWorkspaceSmoke(page);
    record("production reports workspace created, edited, finalized, persisted, and exported Markdown plus formula-safe scene CSV handoffs");

    await runLocationsWorkspaceSmoke(page);
    record("locations workspace created, edited, persisted, exported, and applied a schedule-linked scouting record to a draft call sheet");

    await runTalentWorkspaceSmoke(page);
    record("talent workspace created, cast, persisted, exported, and applied a schedule-linked performer to a draft call sheet");

    await runScreenplayRevisionSmoke(page);
    record("screenplay revision review carried tags and matched planning forward once while preserving historical daily documents");

    await runPlanningFilterSmoke(page);
    record("planning workspace kind filter updated and exported the bounded planning view");

    await clickWorkspaceSection(page, "tasks");
    await submitForm(page, "form[data-action='add-task']", { title: "Browser smoke task", due: "Jun 4" });
    await expectBodyText(page, "Browser smoke task");
    const queuedBeforeStatusUpdate = await queuedOperationCount(page);
    const smokeTaskRow = page.locator(".tasks-table-row", { hasText: "Browser smoke task" }).first();
    await smokeTaskRow.locator("[data-action='task-status-update']").selectOption("ready");
    await expectBodyText(page, "Task status queued in the IndexedDB operation log.");
    assert(
      await queuedOperationCount(page) === queuedBeforeStatusUpdate + 1,
      "Task status updates should queue a local operation",
    );
    await submitForm(page, "form[data-action='add-task']", { title: "Browser completed task" });
    await expectBodyText(page, "Browser completed task");
    const queuedBeforeComplete = await queuedOperationCount(page);
    const completedTaskRow = page.locator(".tasks-table-row", { hasText: "Browser completed task" }).first();
    await completedTaskRow.locator("[data-action='task-complete']").click();
    await expectBodyText(page, "Task completed and queued in the IndexedDB operation log.");
    assert(
      await queuedOperationCount(page) === queuedBeforeComplete + 1,
      "Task completion should queue a local operation",
    );
    await mkdir(failureDir, { recursive: true });
    const taskDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await page.locator("[data-action='export-task-list']").click();
    const taskDownload = await taskDownloadPromise;
    const taskFilename = taskDownload.suggestedFilename();
    assert(taskFilename.startsWith("film-task-list-"), `Expected task list filename, received ${taskFilename}`);
    assert(taskFilename.endsWith(".md"), `Expected Markdown task list download, received ${taskFilename}`);
    const taskPath = resolve(failureDir, taskFilename);
    await taskDownload.saveAs(taskPath);
    const taskList = await readFile(taskPath, "utf8");
    assert(taskList.includes("# Task List: Echoes in the Static"), "Task list should include the selected project title");
    assert(taskList.includes("Browser smoke task"), "Task list should include the local task row");
    assert(taskList.includes("[Ready] Browser smoke task"), "Task list should include the edited task status");
    assert(taskList.includes("due Jun 4"), "Task list should include the captured due label");
    assert(taskList.includes("Policy: provider secrets"), "Task list should include the export policy");
    await expectBodyText(page, "Task list exported for Echoes in the Static.");
    record("tasks workspace local create/due/status/completion flow rendered and exported the task list");

    await clickWorkspaceSection(page, "docs");
    await submitForm(page, "form[data-action='add-doc']", { name: "Browser Smoke Notes" });
    await expectBodyText(page, "Browser Smoke Notes.md");
    await submitForm(page, "form[data-action='doc-save']", { markdown: "# Browser Smoke Notes\n\nLocal draft body for export." });
    await expectBodyText(page, "Document draft saved locally and queued until its canonical record is available.");
    await mkdir(failureDir, { recursive: true });
    const docDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await page.locator("[data-action='export-selected-doc']").click();
    const docDownload = await docDownloadPromise;
    const docFilename = docDownload.suggestedFilename();
    assert(docFilename.startsWith("film-doc-"), `Expected document draft filename, received ${docFilename}`);
    assert(docFilename.endsWith(".md"), `Expected Markdown document draft download, received ${docFilename}`);
    const docPath = resolve(failureDir, docFilename);
    await docDownload.saveAs(docPath);
    const docDraft = await readFile(docPath, "utf8");
    assert(docDraft.includes("# Document Draft: Browser Smoke Notes.md"), "Document export should include the selected document title");
    assert(docDraft.includes("This explicit export includes the selected Markdown body"), "Document export should include the body policy");
    assert(docDraft.includes("Local draft body for export."), "Document export should include the local draft body");
    await expectBodyText(page, "Document draft exported for Browser Smoke Notes.md.");
    record("docs workspace local create flow rendered, saved metadata, and exported the Markdown draft");

    await clickWorkspaceSection(page, "people");
    await submitForm(page, "form[data-action='add-person']", { name: "Riley Smoke", role: "Gaffer" });
    await expectBodyText(page, "Riley Smoke");
    await expectBodyText(page, "Gaffer");
    await mkdir(failureDir, { recursive: true });
    const crewDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await page.locator("[data-action='export-crew-directory']").click();
    const crewDownload = await crewDownloadPromise;
    const crewFilename = crewDownload.suggestedFilename();
    assert(crewFilename.startsWith("film-crew-directory-"), `Expected crew directory filename, received ${crewFilename}`);
    assert(crewFilename.endsWith(".md"), `Expected Markdown crew directory download, received ${crewFilename}`);
    const crewPath = resolve(failureDir, crewFilename);
    await crewDownload.saveAs(crewPath);
    const crewDirectory = await readFile(crewPath, "utf8");
    assert(crewDirectory.includes("# Crew Directory: Echoes in the Static"), "Crew directory should include the selected project title");
    assert(crewDirectory.includes("Riley Smoke"), "Crew directory should include the local person row");
    assert(crewDirectory.includes("email addresses, and phone numbers are excluded"), "Crew directory should include contact redaction policy");
    await expectBodyText(page, "Crew directory exported for Echoes in the Static.");
    record("people workspace local create flow rendered and exported the crew directory");

    await clickWorkspaceSection(page, "equipment");
    await submitForm(page, "form[data-action='add-equipment']", { name: "Smoke Lens Kit", status: "Packed" });
    await expectBodyText(page, "Smoke Lens Kit");
    await expectBodyText(page, "Packed");
    const gearDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await page.locator("[data-action='export-gear-pull']").click();
    const gearDownload = await gearDownloadPromise;
    const gearFilename = gearDownload.suggestedFilename();
    assert(gearFilename.startsWith("film-gear-pull-"), `Expected gear pull filename, received ${gearFilename}`);
    assert(gearFilename.endsWith(".md"), `Expected Markdown gear pull download, received ${gearFilename}`);
    const gearPath = resolve(failureDir, gearFilename);
    await gearDownload.saveAs(gearPath);
    const gearPull = await readFile(gearPath, "utf8");
    assert(gearPull.includes("# Gear Pull: Echoes in the Static"), "Gear pull should include the selected project title");
    assert(gearPull.includes("Smoke Lens Kit"), "Gear pull should include the local equipment row");
    assert(gearPull.includes("Policy: provider secrets"), "Gear pull should include the export policy");
    await expectBodyText(page, "Gear pull exported for Echoes in the Static.");
    record("equipment workspace local create flow rendered and exported the gear pull");

    await clickWorkspaceSection(page, "expenses");
    await submitForm(page, "form[data-action='add-expense']", { category: "Smoke meals", spent: "125", budget: "250" });
    await expectBodyText(page, "Budget Top Sheet");
    await expectBodyText(page, "Near means 85% or higher");
    await expectBodyText(page, "Smoke meals");
    await expectBodyText(page, "$125");
    await mkdir(failureDir, { recursive: true });
    const budgetDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await page.locator("[data-action='export-budget-top-sheet']").click();
    const budgetDownload = await budgetDownloadPromise;
    const budgetFilename = budgetDownload.suggestedFilename();
    assert(budgetFilename.startsWith("film-budget-top-sheet-"), `Expected budget top sheet filename, received ${budgetFilename}`);
    assert(budgetFilename.endsWith(".md"), `Expected Markdown budget top sheet download, received ${budgetFilename}`);
    const budgetPath = resolve(failureDir, budgetFilename);
    await budgetDownload.saveAs(budgetPath);
    const budgetSheet = await readFile(budgetPath, "utf8");
    assert(budgetSheet.includes("# Budget Top Sheet: Echoes in the Static"), "Budget top sheet should include the selected project title");
    assert(budgetSheet.includes("Policy: provider secrets"), "Budget top sheet should include the export policy");
    assert(budgetSheet.includes("## Budget Lines"), "Budget top sheet should include budget lines");
    assert(budgetSheet.includes("Smoke meals"), "Budget top sheet should include the local expense row");
    await expectBodyText(page, "Budget top sheet exported for Echoes in the Static.");
    record("expenses workspace local create flow rendered and exported the budget top sheet");

    await page.locator("[data-tab='activity']").click();
    await expectBodyText(page, "Audit Log");
    const activityDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await page.locator("[data-action='export-activity-log']").click();
    const activityDownload = await activityDownloadPromise;
    const activityFilename = activityDownload.suggestedFilename();
    assert(activityFilename.startsWith("film-activity-log-"), `Expected activity log filename, received ${activityFilename}`);
    assert(activityFilename.endsWith(".md"), `Expected Markdown activity log download, received ${activityFilename}`);
    const activityPath = resolve(failureDir, activityFilename);
    await activityDownload.saveAs(activityPath);
    const activityLog = await readFile(activityPath, "utf8");
    assert(activityLog.includes("# Activity Log:"), "Activity log should include a heading");
    assert(activityLog.includes("raw Worker audit metadata"), "Activity log should include the export policy");
    assert(activityLog.includes("Budget top sheet exported"), "Activity log should include local audit events");
    await expectBodyText(page, "Activity log exported with");
    record("activity tab exported the local audit log without Worker metadata");
    await page.locator("[data-tab='details']").click();

    await selectInspectorView(page, "team");
    const teamDownloadPromise = page.waitForEvent("download", { timeout: 10_000 });
    await page.locator("[data-action='export-team-roster']").click();
    const teamDownload = await teamDownloadPromise;
    const teamFilename = teamDownload.suggestedFilename();
    assert(teamFilename.startsWith("film-team-roster-"), `Expected team roster filename, received ${teamFilename}`);
    assert(teamFilename.endsWith(".md"), `Expected Markdown team roster download, received ${teamFilename}`);
    const teamPath = resolve(failureDir, teamFilename);
    await teamDownload.saveAs(teamPath);
    const teamRoster = await readFile(teamPath, "utf8");
    assert(teamRoster.includes("# Team Roster:"), "Team roster should include a heading");
    assert(teamRoster.includes("raw email addresses"), "Team roster should include the export policy");
    assert(teamRoster.includes("Email references are short hashes only"), "Team roster should describe short hash references");
    assert(teamRoster.includes("### Alonso"), "Team roster should include the owner display name");
    assert(teamRoster.includes("- Role: Owner"), "Team roster should include member roles");
    assert(teamRoster.includes("- Status: Active"), "Team roster should include member status");
    assert(teamRoster.includes("9b11d8ec...7169d6"), "Team roster should include short hash references");
    await expectBodyText(page, "Team roster exported with");
    record("team section exported a redacted workspace roster");

    const syncText = await page.locator("[data-action='sync-dry-run']").innerText();
    assert(syncText.includes("local ops queued"), "Expected local create flows to increase queued operations");
    await expectNoDocumentOverflow(page, "desktop after local creates");
    record("desktop local create flows kept the layout within the viewport");

    const queuedBeforeSync = await queuedOperationCount(page);
    await page.locator("[data-action='sync-dry-run']").click();
    await expectBodyText(page, "D1 replay accepted 1 operations");
    const queuedAfterSync = await queuedOperationCount(page);
    assert(
      queuedAfterSync === queuedBeforeSync - 1,
      `Expected partial reconnect sync to leave rejected operations queued; before ${queuedBeforeSync}, after ${queuedAfterSync}`,
    );
    record("desktop partial reconnect sync kept rejected local operations queued");

    await selectInspectorView(page, "backups");
    const backupPath = await exportBackupForPreview(page);
    await previewEncryptedBackup(page, backupPath);
    await expectNoDocumentOverflow(page, "desktop after backup preview");
    await expectNoSeriousA11yViolations(page, "desktop backup restore preview");
    record("desktop encrypted backup export and restore preview completed without destructive writes and passed axe checks");

    await runAuthSmoke(page, { signOut: false });
    await runRestoreApplicationPreflightA11ySmoke(page);
    record("desktop restore gate through application preflight rendered mocked Worker states and passed axe checks");
  } catch (error) {
    await mkdir(failureDir, { recursive: true });
    await page
      .screenshot({ path: resolve(failureDir, "browser-smoke-desktop-failure.png"), fullPage: true, timeout: 5_000 })
      .catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

async function runMultiTabOperationMirrorSmoke(url, browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1,
  });
  const pageA = await context.newPage();
  const pageB = await context.newPage();

  await pageA.route("**/api/operations/dry-run-sync", async (route) => {
    const payload = JSON.parse(route.request().postData() || "{}");
    const operations = Array.isArray(payload.operations) ? payload.operations : [];
    assert(operations.length > 0, "Multi-tab sync should submit queued operations from the syncing tab");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        dryRun: true,
        accepted: operations.map((operation) => operation.id),
        rejected: [],
        replayed: operations.map((operation) => operation.id),
        idempotent: [],
        canonicalApplied: [],
        persistence: "browser_smoke_multitab",
      }),
    });
  });

  try {
    await pageA.goto(url, { waitUntil: "networkidle" });
    await clickWorkspaceSection(pageA, "tasks");
    await submitForm(pageA, "form[data-action='add-task']", { title: "Tab A sync task" });
    await expectBodyText(pageA, "Tab A sync task");

    await pageB.goto(url, { waitUntil: "networkidle" });
    await clickWorkspaceSection(pageB, "people");
    await submitForm(pageB, "form[data-action='add-person']", { name: "Tab B Producer", role: "Producer" });
    await expectBodyText(pageB, "Tab B Producer");

    await pageA.locator("[data-action='sync-dry-run']").click();
    await expectBodyText(pageA, "Dry-run sync accepted");

    const pageC = await context.newPage();
    await pageC.goto(url, { waitUntil: "networkidle" });
    const queuedAfterSync = await queuedOperationCount(pageC);
    assert(queuedAfterSync >= 1, "Expected the second tab's queued operation to survive the first tab sync");
    await clickWorkspaceSection(pageC, "tasks");
    await expectBodyText(pageC, "Tab A sync task");
    await clickWorkspaceSection(pageC, "people");
    await expectBodyText(pageC, "Tab B Producer");
    record("multi-tab IndexedDB sync preserved another tab's queued operation and workspace record");
  } catch (error) {
    await mkdir(failureDir, { recursive: true });
    await pageA
      .screenshot({ path: resolve(failureDir, "browser-smoke-multitab-failure.png"), fullPage: true, timeout: 5_000 })
      .catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

async function runMobileSmoke(url, browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator("[data-action='create-project']:visible").first().click();
    await expectBodyText(page, "Create project");
    const dialogBox = await page.locator(".project-create-dialog").boundingBox();
    assert(
      dialogBox && dialogBox.x >= 0 && dialogBox.y >= 0 && dialogBox.x + dialogBox.width <= 390 && dialogBox.y + dialogBox.height <= 844,
      "Project creation dialog should fit the mobile viewport",
    );
    await expectNoSeriousA11yViolations(page, "mobile project creation dialog");
    await page.locator("[data-action='project-create-cancel']:visible").first().click();
    record("mobile project onboarding action and dialog remained reachable and within the viewport");

    await auditWorkspaceNavigation(page, "mobile workspace audit");
    await clickWorkspaceSection(page, "slate");
    record("mobileWorkspaceAudit covered every section with active navigation, headings, command contracts, and document bounds");

    await page.locator("[data-action='filter']").fill("riverside warehouse");
    await page.waitForTimeout(100);
    await expectBodyText(page, "Echoes in the Static");
    await expectNoDocumentOverflow(page, "mobile filtered slate");
    record("mobile slate search did not create document overflow");

    await clickWorkspaceSection(page, "backups");
    await expectBodyText(page, "Restore Points");
    await expectNoDocumentOverflow(page, "mobile backups workspace");
    await expectNoSeriousA11yViolations(page, "mobile backups workspace");
    record("mobile backups workspace rendered without document overflow");

    await page.locator("[data-action='filter']").fill("");
    await importScreenplaySmokeFixture(page);
    const mobileSearchForm = page.locator("form[data-action='screenplay-search']");
    await mobileSearchForm.locator("input[name='query']").fill("The signal is back");
    await mobileSearchForm.locator("input[name='query']").press("Enter");
    await expectBodyText(page, "1 local screenplay match for The signal is back.");
    await mobileSearchForm.locator("input[name='query']").press("Escape");
    await expectBodyText(page, "Screenplay search cleared.");
    const mobileManualElement = page.locator("form[data-action='screenplay-manual-element']");
    await mobileManualElement.locator("select[name='category']").selectOption("prop");
    await mobileManualElement.locator("input[name='name']").fill("Mobile continuity marker");
    await mobileManualElement.locator("input[name='name']").press("Enter");
    await expectBodyText(page, "Mobile continuity marker: added to the selected scene as Props.");
    await page.locator("main").screenshot({ path: resolve(failureDir, "film-breakdown-search-manual-mobile.png") });
    await expectNoDocumentOverflow(page, "mobile screenplay search and manual tagging");
    await expectNoSeriousA11yViolations(page, "mobile screenplay search and manual tagging");
    await clickWorkspaceSection(page, "schedule");
    await page.locator("[data-action='schedule-create']").click();
    await page.locator(".stripboard-workspace").waitFor({ state: "visible" });
    await expectBodyText(page, "Availability & conflicts");
    await expectBodyText(page, "Scenario comparison");
    await mkdir(failureDir, { recursive: true });
    await page.locator("main").screenshot({ path: resolve(failureDir, "film-schedule-mobile.png") });
    await expectNoDocumentOverflow(page, "mobile schedule workspace");
    await expectNoSeriousA11yViolations(page, "mobile schedule workspace");
    const mobileDayId = await page.locator("[data-action='schedule-day-date']").first().getAttribute("data-schedule-day-id");
    assert(mobileDayId, "Mobile schedule should expose its first shoot day");
    await page.locator(".stripboard-lane.unassigned [data-action='schedule-scene-assign']").first().selectOption(mobileDayId);
    await clickWorkspaceSection(page, "call-sheets");
    await page.locator("form[data-action='call-sheet-create'] button[type='submit']").click();
    await page.locator(".call-sheet-editor-panel").waitFor({ state: "visible" });
    await expectNoDocumentOverflow(page, "mobile generated call sheet");
    await expectNoSeriousA11yViolations(page, "mobile generated call sheet");
    await clickWorkspaceSection(page, "shots");
    const mobileShotCreate = page.locator("form[data-action='production-shot-create']");
    await mobileShotCreate.locator("input[name='description']").fill("Mobile shot plan");
    await mobileShotCreate.locator("button[type='submit']").click();
    await page.locator(".production-shot-editor-panel").waitFor({ state: "visible" });
    await page.locator("main").screenshot({ path: resolve(failureDir, "film-shots-mobile.png") });
    await expectNoDocumentOverflow(page, "mobile production shots");
    await expectNoSeriousA11yViolations(page, "mobile production shots");
    await clickWorkspaceSection(page, "sides");
    await page.locator(".sides-scene").first().waitFor({ state: "visible" });
    await expectBodyText(page, "The signal is back.");
    await page.locator("main").screenshot({ path: resolve(failureDir, "film-sides-mobile.png") });
    await expectNoDocumentOverflow(page, "mobile production sides");
    await expectNoSeriousA11yViolations(page, "mobile production sides");
    await clickWorkspaceSection(page, "reports");
    await page.locator("form[data-action='production-report-create'] button[type='submit']").click();
    await page.locator(".production-report-editor-panel").waitFor({ state: "visible" });
    await page.locator("main").screenshot({ path: resolve(failureDir, "film-production-report-mobile.png") });
    await expectNoDocumentOverflow(page, "mobile production report");
    await expectNoSeriousA11yViolations(page, "mobile production report");
    await clickWorkspaceSection(page, "locations");
    const mobileLocationCreate = page.locator("form[data-action='production-location-create']");
    await mobileLocationCreate.locator("select[name='screenplayElementId']").selectOption({ index: 1 });
    await mobileLocationCreate.locator("button[type='submit']").click();
    await page.locator(".production-location-editor-panel").waitFor({ state: "visible" });
    await page.locator("main").screenshot({ path: resolve(failureDir, "film-location-mobile.png") });
    await expectNoDocumentOverflow(page, "mobile production location");
    await expectNoSeriousA11yViolations(page, "mobile production location");
    await clickWorkspaceSection(page, "talent");
    const mobileTalentCreate = page.locator("form[data-action='production-talent-create']");
    await mobileTalentCreate.locator("select[name='screenplayElementId']").selectOption({ label: "MARA" });
    await mobileTalentCreate.locator("button[type='submit']").click();
    await page.locator(".production-talent-editor-panel").waitFor({ state: "visible" });
    await page.locator("main").screenshot({ path: resolve(failureDir, "film-talent-mobile.png") });
    await expectNoDocumentOverflow(page, "mobile production talent");
    await expectNoSeriousA11yViolations(page, "mobile production talent");
    record("mobile screenplay search/manual tagging, schedule, shots, call-sheet, sides, production-report, location, and talent workspaces remained reachable, accessible, and within document bounds");
  } catch (error) {
    await mkdir(failureDir, { recursive: true });
    await page
      .screenshot({ path: resolve(failureDir, "browser-smoke-mobile-failure.png"), fullPage: true, timeout: 5_000 })
      .catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

async function runSensitiveLinkSmoke(url, browser) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await context.newPage();
  await mockAuthRoutes(page);

  try {
    await page.goto(`${url}#magicLinkToken=dry_browser_smoke_link_code`, { waitUntil: "networkidle" });
    await expectBodyText(page, "owner session");
    assert(new URL(page.url()).hash === "", "Magic-link fragment should be removed before the session renders");
    await runSignOutSmoke(page);

    const inviteToken = ["dry_invite", "browser_smoke", "token", "123456"].join("_");
    const invitePage = await context.newPage();
    await invitePage.goto(`${url}#inviteToken=${inviteToken}`, { waitUntil: "networkidle" });
    assert(
      await invitePage.locator('input[name="inviteToken"]').inputValue() === inviteToken,
      "Invite fragment should prefill the invite token control",
    );
    assert(new URL(invitePage.url()).hash === "", "Invite-token fragment should be removed before rendering");
    record("auth and invite deep links consumed one-time tokens from fragments without retaining them in the URL");
  } catch (error) {
    await mkdir(failureDir, { recursive: true });
    await page
      .screenshot({ path: resolve(failureDir, "browser-smoke-sensitive-link-failure.png"), fullPage: true, timeout: 5_000 })
      .catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

let webServer = null;
let browser = null;

try {
  webServer = await startWebServer();
  browser = await chromium.launch({ headless: true });
  await runSensitiveLinkSmoke(webServer.url, browser);
  await runMultiTabOperationMirrorSmoke(webServer.url, browser);
  await runDesktopSmoke(webServer.url, browser);
  await runMobileSmoke(webServer.url, browser);
  console.log(`Browser smoke passed: ${checks.join("; ")}`);
} catch (error) {
  if (webServer) {
    console.error(webServer.getLogs());
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (webServer) await stopWebServer(webServer.serverProcess);
}
