import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { selectInspectorView } from "./browser-flow-helpers.mjs";

export function providerRuntimeFixture() {
  return {
    dryRun: true, persistence: "browser_smoke_mock", auditPersistence: "browser_smoke_mock",
    readiness: {
      policy: "explicit_provider_live_gates", secretValuesExposed: false,
      liveCount: 4, partialLiveCount: 0, blockedCount: 3,
      providers: [
        ["pool", "Pool", "live", "live_summary_only", ["campaign_aggregate_summary"]],
        ["store", "Store", "live", "live_summary_only", ["order_revenue_aggregate_summary"]],
        ["stripe", "Stripe", "live", "live_summary_only", ["pool_store_payment_summary"]],
        ["resend", "Resend", "live", "live_transactional_email", ["member_magic_link_delivery", "workspace_invite_delivery"]],
        ["google", "Google", "blocked", "dry_run_only", []],
        ["social", "Social", "blocked", "dry_run_only", []],
        ["sms", "SMS", "blocked", "dry_run_only", []],
      ].map(([key, label, status, runtimeMode, liveCapabilities]) => ({
        key, label, status, runtimeMode, liveCapabilities,
        blockers: status === "blocked" ? [`${label} browser-smoke blocker.`] : [],
        requiredDecisions: [], dataBoundary: "browser_smoke_boundary",
      })),
    },
  };
}

export async function runGoogleRecoverySmoke(url, browser, { prepare, authenticate, record, checkAccessibility, checkOverflow, outputDir }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  const page = await context.newPage();
  const errors = [];
  let revoked = false;
  let changed = false;
  let reconnectCalls = 0;
  const connection = () => ({
    checkedAt: "now", persistence: "fixture", auditPersistence: null,
    readiness: {
      provider: "google", mode: "oauth_connection", status: "live_oauth_enabled", liveOAuthAllowed: true,
      configured: { clientId: true, clientSecret: true, redirectUri: true, tokenEncryptionKey: true, appOrigin: true, d1: true, kv: true, liveMode: true },
      requiredConfiguration: [], blockers: [], dataBoundary: "drive_metadata_and_explicit_file_content",
    },
    connection: { provider: "google", status: "active", scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"], hasRefreshToken: true,
      tokenExpiresAt: "2026-09-01T12:00:00Z", rootFolderId: "test_folder_id", connectedAt: "2026-09-01", disconnectedAt: null, updatedAt: "2026-09-06", reauthorizationRequired: revoked },
  });
  try {
    page.on("pageerror", error => errors.push(error.message));
    page.on("dialog", dialog => dialog.accept("test_folder_id"));
    await page.route("**/api/**", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Unmocked request blocked"}' }));
    await prepare(page);
    await page.route("**/api/providers/google/connection", route => route.fulfill({ json: connection() }));
    await page.route("**/api/providers/google/drive-manifest", route => route.fulfill({ status: revoked || changed ? 409 : 502, json: { error: changed ? "google_connection_changed" : revoked ? "google_reauthorization_required" : "google_token_refresh_failed" } }));
    await page.route("**/api/providers/google/oauth/start", route => {
      reconnectCalls += 1;
      const request = route.request().postDataJSON();
      assert.equal(request.includeDocsExport, false);
      assert.equal(request.includeCalendarSync, false);
      return route.fulfill({ status: 503, json: { error: "Fixture stopped before Google authorization" } });
    });
    await page.goto(url);
    await authenticate(page);
    await selectInspectorView(page, "integrations");
    await page.locator('[data-integration="google"]').click();
    await page.getByRole("button", { name: "Check Google", exact: true }).click();
    await page.getByRole("button", { name: "Read Drive", exact: true }).click();
    await page.getByText("Google Drive read blocked: google_token_refresh_failed", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Reconnect Google", exact: true }).count(), 0, "An outage must not invalidate consent");
    changed = true;
    await page.getByRole("button", { name: "Read Drive", exact: true }).click();
    await page.getByText("Google connection changed. Check Google before reading again.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Reconnect Google", exact: true }).count(), 0, "A stale refresh must not invalidate a newer connection");
    await page.getByRole("button", { name: "Check Google", exact: true }).click();
    await page.getByText("Google is connected to this workspace.", { exact: true }).waitFor();
    changed = false;
    revoked = true;
    await page.getByRole("button", { name: "Read Drive", exact: true }).click();
    await page.getByRole("button", { name: "Reconnect Google", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Read Drive", exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Disconnect", exact: true }).count(), 1);
    assert.equal(reconnectCalls, 0, "Expired consent must not start OAuth automatically");
    await page.reload();
    await authenticate(page);
    await selectInspectorView(page, "integrations");
    await page.locator('[data-integration="google"]').click();
    await page.getByRole("button", { name: "Check Google", exact: true }).click();
    await page.getByRole("button", { name: "Reconnect Google", exact: true }).waitFor();
    await page.getByText("Google needs to be reconnected.", { exact: true }).waitFor();
    await mkdir(outputDir, { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const theme of ["light", "dark"]) {
        await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
        await checkAccessibility(page, `Google recovery ${width} ${theme}`);
        await checkOverflow(page, `Google recovery ${width} ${theme}`);
        await page.screenshot({ path: resolve(outputDir, `google-recovery-${width}-${theme}.png`), fullPage: true });
      }
    }
    await page.getByRole("button", { name: "Reconnect Google", exact: true }).click();
    await page.getByText("Google connection blocked: Fixture stopped before Google authorization", { exact: true }).waitFor();
    assert.equal(reconnectCalls, 1);
    assert.deepEqual(errors, []);
    record("Google temporary failures and stale refreshes preserve consent, revoked access survives a status refresh as one explicit reconnect action, and reconnect never broadens scopes or runs automatically");
  } finally {
    await context.close();
  }
}

export async function runProviderRuntimeStatusSmoke(url, browser, { prepare, authenticate, record, checkAccessibility, checkOverflow, outputDir }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  const page = await context.newPage();
  let release;
  let held = Promise.resolve();
  let fail = false;
  let calls = 0;
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const hold = () => { held = new Promise(resolve => { release = resolve; }); };
  try {
    await page.route("**/api/**", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Unmocked request blocked"}' }));
    await prepare(page);
    await page.route("**/api/providers/runtime-readiness", async route => {
      calls += 1;
      await held;
      return route.fulfill({ status: fail ? 503 : 200, contentType: "application/json", body: JSON.stringify(fail ? { error: "Offline status fixture" } : providerRuntimeFixture()) });
    });
    await page.goto(url);
    await page.getByText("Not checked", { exact: true }).waitFor();
    await authenticate(page);
    await selectInspectorView(page, "integrations");
    await page.locator('[data-integration="sms"]').click();
    const phone = page.locator('input[name="recipientE164"]');
    await phone.fill("+15055550123");
    assert.equal(calls, 0, "Entering Integrations must not check runtime or contact providers automatically");

    const check = page.getByRole("button", { name: "Check status", exact: true });
    hold();
    const requested = page.waitForRequest("**/api/providers/runtime-readiness");
    await check.click();
    await requested;
    assert(await check.isDisabled(), "An in-flight check must not permit duplicate clicks");
    assert.equal(await page.locator('[data-integration-summary]').innerText(), "Checking...");
    await phone.focus();
    release();
    await page.locator('[data-integration-summary]').getByText("4 enabled, 3 blocked", { exact: true }).waitFor();
    assert.equal(await phone.inputValue(), "+15055550123", "Status success erased a form draft");
    assert(await phone.evaluate(input => input === document.activeElement), "Status success stole focus");
    assert.equal(await page.locator('[data-integration-status="pool"]').innerText(), "Live enabled");
    assert.equal(await page.locator('[data-integration-status="social"]').innerText(), "Live blocked");
    assert.equal(await page.locator('[data-integration]').count(), 7, "There must be one provider picker");
    assert.equal(await page.locator('[data-integration-runtime=""]').locator("li").count(), 0, "Runtime summary must not repeat the provider catalog");

    fail = true;
    hold();
    await check.click();
    await phone.focus();
    release();
    await page.getByRole("alert").getByText("Status check failed: Offline status fixture", { exact: true }).waitFor();
    assert.equal(await page.locator('[data-integration-summary]').innerText(), "Check failed");
    assert.equal(await page.locator('[data-integration-status="pool"]').innerText(), "Check failed");
    assert.equal(await page.getByText(/Last successful check:/).count(), 1);
    assert.equal(await phone.inputValue(), "+15055550123", "Status failure erased a form draft");
    assert(await phone.evaluate(input => input === document.activeElement), "Status failure stole focus");
    fail = false;
    held = Promise.resolve();
    await check.click();
    await page.locator('[data-integration-summary]').getByText("4 enabled, 3 blocked", { exact: true }).waitFor();
    assert.equal(calls, 3, "Each explicit check must make exactly one request");

    await mkdir(outputDir, { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const theme of ["light", "dark"]) {
        await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
        await checkAccessibility(page, `provider status ${width} ${theme}`);
        await checkOverflow(page, `provider status ${width} ${theme}`);
        await page.screenshot({ path: resolve(outputDir, `provider-status-${width}-${theme}.png`), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    hold();
    const lateResponse = page.waitForResponse("**/api/providers/runtime-readiness");
    await check.click();
    await selectInspectorView(page, "overview");
    release();
    await lateResponse;
    await page.locator('[data-integration-summary]').getByText("4 enabled, 3 blocked", { exact: true }).waitFor();
    assert.equal(await page.locator('[data-action="inspector-view"]').inputValue(), "overview", "A completed status check reopened Integrations");

    for (const failed of [false, true]) {
      fail = failed;
      await selectInspectorView(page, "integrations");
      hold();
      const response = page.waitForResponse("**/api/providers/runtime-readiness");
      const request = page.waitForRequest("**/api/providers/runtime-readiness");
      await check.click();
      await request;
      await page.locator('[data-action="auth-sign-out"]').click();
      await authenticate(page);
      release();
      await response;
      await page.waitForTimeout(150);
      assert.equal(await page.locator('[data-integration-summary]').innerText(), "Not checked", "Old-session runtime status leaked into a new session");
      assert(!(await page.locator("body").innerText()).includes("Offline status fixture"), "Old-session failure leaked into a new session");
    }
    assert.deepEqual(errors, []);
    record("runtime badges share checked Worker state; explicit refresh preserves drafts/focus, handles failure/retry and late navigation/sign-out, and stays accessible on desktop/mobile themes");
  } catch (error) {
    await page.screenshot({ path: resolve(outputDir, "provider-status-failure.png"), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    release?.();
    await context.close();
  }
}
