import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { clickWorkspaceSection, selectInspectorView } from "./browser-flow-helpers.mjs";

const views = {
  shots: {
    title: "Shots", module: "production-resources-view", ready: ".shots-workspace-grid",
    enter: (page) => clickWorkspaceSection(page, "shots"),
    leave: (page) => clickWorkspaceSection(page, "tasks"),
    async verify(page) {
      assert(await page.locator('[data-action="production-shots-csv-export"]').isDisabled());
      assert.equal(await page.locator('[data-action="production-shot-update"]').count(), 0);
    },
  },
  locations: {
    title: "Locations", module: "production-resources-view", ready: ".locations-workspace-grid",
    enter: (page) => clickWorkspaceSection(page, "locations"),
    leave: (page) => clickWorkspaceSection(page, "tasks"),
    async verify(page) { await verifyResourceCreate(page, "location", "Add scouting record", "name", "Deferred scouting record"); },
  },
  talent: {
    title: "Talent", module: "production-resources-view", ready: ".talent-workspace-grid",
    enter: (page) => clickWorkspaceSection(page, "talent"),
    leave: (page) => clickWorkspaceSection(page, "tasks"),
    async verify(page) { await verifyResourceCreate(page, "talent", "Add character record", "characterName", "Deferred character"); },
  },
  "call-sheets": {
    title: "Call Sheets", module: "production-documents-view", ready: ".call-sheets-workspace-grid",
    enter: (page) => clickWorkspaceSection(page, "call-sheets"),
    leave: (page) => clickWorkspaceSection(page, "tasks"),
    async verify(page) {
      const download = page.waitForEvent("download");
      await page.locator('[data-action="export-call-sheet"]').click();
      assert.match((await download).suggestedFilename(), /call-sheet/);
      await page.locator('.call-sheet-generator-panel [data-workspace-section="schedule"]').click();
      await page.getByRole("heading", { name: "Schedule", exact: true }).waitFor();
      await clickWorkspaceSection(page, "call-sheets");
    },
  },
  sides: {
    title: "Sides", module: "production-documents-view", ready: ".sides-workspace-grid",
    enter: (page) => clickWorkspaceSection(page, "sides"),
    leave: (page) => clickWorkspaceSection(page, "tasks"),
    async verify(page) {
      assert(await page.locator('[data-action="production-sides-markdown-export"]').isDisabled());
      await page.getByRole("button", { name: "Open Call Sheets", exact: true }).click();
      await page.locator(".call-sheets-workspace-grid").waitFor();
      await clickWorkspaceSection(page, "sides");
    },
  },
  reports: {
    title: "Production Reports", module: "production-documents-view", ready: ".production-reports-workspace-grid",
    enter: (page) => clickWorkspaceSection(page, "reports"),
    leave: (page) => clickWorkspaceSection(page, "tasks"),
    async verify(page) {
      assert(await page.locator('[data-action="production-report-export"]').isDisabled());
      assert(await page.locator('[data-action="production-report-csv-export"]').isDisabled());
    },
  },
  backups: {
    title: "Backups", module: "backup-workspace", ready: ".backup-restore-workflow",
    enter: (page) => clickWorkspaceSection(page, "backups"),
    leave: (page) => clickWorkspaceSection(page, "tasks"),
    async verify(page) {
      const chooser = page.waitForEvent("filechooser");
      await page.locator('[data-action="restore-file-preview"]').click();
      await (await chooser).setFiles([]);
      assert.equal(await page.locator('[data-action="restore-application-commit"]').count(), 0);
    },
  },
  integrations: {
    title: "Integrations", module: "integration-view", ready: ".integration-picker",
    enter: (page) => selectInspectorView(page, "integrations"),
    leave: (page) => selectInspectorView(page, "overview"),
    async verify(page) {
      assert.equal(await page.locator('[data-integration]').count(), 7);
      let calls = 0;
      await page.route("**/api/providers/runtime-readiness", (route) => {
        calls += 1;
        return route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Offline fixture"}' });
      });
      await page.locator('[data-action="provider-runtime-readiness"]').click();
      await page.getByText("Status check failed: Offline fixture", { exact: true }).waitFor();
      assert.equal(calls, 1, "A deferred provider control must bind once");
      assert.equal(await page.locator('[data-action="sms-send"]').count(), 0);
    },
  },
};

async function verifyResourceCreate(page, resource, disclosure, field, value) {
  await page.locator(".create-disclosure > summary").filter({ hasText: disclosure }).click();
  const form = page.locator(`[data-action="production-${resource}-create"]`);
  await form.locator(`[name="${field}"]`).fill(value);
  await form.getByRole("button", { name: "Add record", exact: true }).click();
  await page.locator(`[data-action="production-${resource}-update"]`).waitFor();
  assert.equal(await page.locator(`[data-action="production-${resource}-row-select"]`).count(), 1, "Deferred actions must bind exactly once");
  assert.equal(await page.locator(`[data-action="production-${resource}-update"] [name="${field}"]`).inputValue(), value);
}

export async function runDeferredViewSmoke(url, browser, { outputDir, checkAccessibility, checkOverflow, record, only }) {
  await mkdir(outputDir, { recursive: true });
  for (const [name, view] of Object.entries(views).filter(([name]) => !only || only === name)) {
  const modulePattern = new RegExp(`/(?:src/${view.module}\\.ts|assets/${view.module}-[\\w-]+\\.js)(?:\\?.*)?$`);
  for (const scenario of ["preserve-draft", "leave-while-loading", "retry"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
    const page = await context.newPage();
    const errors = [];
    let requests = 0;
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.route("**/api/**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Offline fixture"}' }));
      await page.route(modulePattern, async (route) => {
        requests += 1;
        if (scenario === "retry" && requests === 1) return route.abort();
        await held;
        await route.continue();
      });
      await page.goto(url);
      await page.locator(".content-column h1").waitFor();
      assert.equal(requests, 0, `${view.title} must not load at startup`);
      await view.enter(page);

      if (scenario === "retry") {
        const retry = page.getByRole("button", { name: `Reload ${view.title}`, exact: true });
        await retry.waitFor();
        assert.equal(requests, 1);
        assert.match(await page.getByRole("alert").innerText(), /Saved local data is unchanged/);
        release();
        await retry.click();
      } else {
        await page.getByText(`Loading ${view.title.toLowerCase()}...`, { exact: true }).waitFor();
        assert.equal(requests, 1);
        if (scenario === "leave-while-loading") await view.leave(page);
        await page.locator("details.auth-disclosure > summary").click();
        const email = page.locator("form[data-action='auth-request'] input[name='email']");
        await email.fill("unsent-draft@example.test");
        await email.focus();
        const completed = page.waitForResponse(modulePattern);
        release();
        await completed;
        if (scenario === "leave-while-loading") {
          await page.waitForTimeout(150);
          assert.equal(await page.locator(view.ready).count(), 0, "Late load replaced the new view");
        } else {
          await page.locator(view.ready).waitFor();
        }
        assert.equal(await email.inputValue(), "unsent-draft@example.test");
        assert(await email.evaluate((input) => input === document.activeElement), "Lazy completion stole focus from account input");
        if (scenario === "leave-while-loading") await view.enter(page);
      }

      await page.locator(view.ready).waitFor();
      const loadedRequests = requests;
      await view.leave(page);
      await view.enter(page);
      await page.locator(view.ready).waitFor();
      assert.equal(requests, loadedRequests, `Revisiting ${view.title} downloaded another module`);
      await view.verify(page);

      if (scenario === "preserve-draft") {
        await page.reload();
        await page.locator(view.ready).waitFor();
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
          for (const theme of ["light", "dark"]) {
            await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
            await checkAccessibility(page, `${name} lazy ${width} ${theme}`);
            await checkOverflow(page, `${name} lazy ${width} ${theme}`);
            await page.screenshot({ path: resolve(outputDir, `${name}-${width}-${theme}.png`), fullPage: true });
          }
        }
      }
      assert.deepEqual(errors, [], `${view.title} loading raised an uncaught browser error`);
    } catch (error) {
      await page.screenshot({ path: resolve(outputDir, `${name}-loading-${scenario}-failure.png`), fullPage: true }).catch(() => {});
      throw error;
    } finally {
      release();
      await context.close();
    }
  }
  record(`${view.title} loads on demand, preserves drafts/focus, ignores stale navigation, recovers failed chunks with an explicit reload, and retains bound controls across desktop/mobile themes`);
  }
}
