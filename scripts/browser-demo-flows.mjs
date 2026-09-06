import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { clickWorkspaceSection, exportEncryptedBackup, selectInspectorView } from "./browser-flow-helpers.mjs";
import { WORKSPACE_FLOW_SECTIONS } from "./user-flow-catalog.mjs";
import { checkCallSheetLayout } from "./browser-appearance-flows.mjs";

export async function runDemoPortfolioSmoke(url, browser, { outputDir, checkAccessibility, checkOverflow, record }) {
  await mkdir(outputDir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const apiRequests = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.route("**/api/**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Provider networking blocked for demo test"}' }));
    await page.goto(url);
    await page.locator(".content-column h1").waitFor();
    const before = await readWorkspace(page, "film-offline-v1", "workspace_acme");
    assert(before, "Normal workspace must exist before demo isolation check");
    page.on("request", (request) => { if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url()); });
    await clickWorkspaceSection(page, "projects");
    await page.getByRole("link", { name: "Demo portfolio", exact: true }).click();
    await page.getByRole("heading", { name: "Projects", exact: true }).first().waitFor();
    await page.locator(".demo-notice").waitFor();
    assert.equal(await page.locator("button.project-row").count(), 12);
    assert.equal(await page.locator(".auth-form").count(), 0, "Demo must not expose real sign-in forms");
    const initial = await readWorkspace(page, "film-offline-v1.demo-portfolio", "workspace_demo_portfolio");
    assert.equal(new Set(initial.projects.map((project) => project.type)).size, 6);
    assert.equal(new Set(initial.projects.map((project) => project.phase)).size, 4);

    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
      for (const theme of ["light", "dark"]) {
        await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
        await clickWorkspaceSection(page, "projects");
        for (const mode of ["list", "board"]) {
          await page.locator(`[data-project-surface="${mode}"]`).click();
          await checkAccessibility(page, `demo ${width} ${theme} project ${mode}`);
          await checkOverflow(page, `demo ${width} ${theme} project ${mode}`);
          if (mode === "list") {
            const clipped = await page.locator("button.project-row").evaluateAll((rows) => rows.flatMap((row) => {
              const bounds = row.getBoundingClientRect();
              return [...row.children, row.querySelector(".project-title-name")].filter((cell) => {
                const rect = cell.getBoundingClientRect();
                return rect.width === 0 || rect.height === 0 || rect.left < bounds.left || rect.right > bounds.right + 1 || cell.scrollWidth > cell.clientWidth + 1;
              }).map((cell) => cell.textContent.trim());
            }));
            assert.deepEqual(clipped, [], `Project metadata must be visible and unclipped at ${width}px`);
          }
          await page.screenshot({ path: resolve(outputDir, `demo-${width}-${theme}-${mode}.png`), fullPage: true });
        }
      }
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('[data-project-surface="list"]').click();
    for (const project of initial.projects) {
      await selectProject(page, project.id);
      await clickWorkspaceSection(page, "slate");
      assert.equal(await page.locator(".compact-panel").count(), 4);
      for (const list of await page.locator(".compact-panel .line-list").all()) assert((await list.locator("li").count()) <= 5, "Overview must remain bounded for dense projects");
      await checkOverflow(page, `demo overview ${project.id}`);
      await checkAccessibility(page, `demo overview ${project.id}`);
    }

    await selectProject(page, "demo_juniper");
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
      for (const theme of ["light", "dark"]) {
        await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
        for (const [section] of WORKSPACE_FLOW_SECTIONS) {
          await clickWorkspaceSection(page, section);
          await checkOverflow(page, `dense demo ${width} ${theme} ${section}`);
          await checkAccessibility(page, `dense demo ${width} ${theme} ${section}`);
          if (["slate", "schedule", "sides"].includes(section)) await page.screenshot({ path: resolve(outputDir, `demo-${width}-${theme}-${section}.png`), fullPage: true });
        }
        await clickWorkspaceSection(page, "sides");
        const spacing = await page.locator(".sides-empty-panel").evaluate((panel) => {
          const title = panel.querySelector("h2").getBoundingClientRect();
          const copy = panel.querySelector("p").getBoundingClientRect();
          const action = panel.querySelector("button").getBoundingClientRect();
          return { titleGap: copy.top - title.bottom, actionGap: action.top - copy.bottom };
        });
        assert(spacing.titleGap >= 4 && spacing.actionGap >= 16, `Empty-state spacing collapsed: ${JSON.stringify(spacing)}`);
      }
    }

    await selectProject(page, "demo_night-service");
    await clickWorkspaceSection(page, "slate");
    const sheetId = await page.locator("[data-open-call-sheet]").getAttribute("data-open-call-sheet");
    await page.locator("[data-open-call-sheet]").click();
    assert.equal(await page.locator('[data-action="call-sheet-select"]').first().inputValue(), sheetId, "Overview must open the exact displayed sheet");
    for (const width of [1440, 1024, 390]) {
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
      for (const theme of ["light", "dark"]) {
        await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
        await checkCallSheetLayout(page);
        await checkAccessibility(page, `populated demo call sheet ${width} ${theme}`);
        await checkOverflow(page, `populated demo call sheet ${width} ${theme}`);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: resolve(outputDir, `demo-${width}-${theme}-call-sheets.png`), fullPage: true });
        if (width === 390 && theme === "light") await page.locator(".call-sheet-cast-panel").screenshot({ path: resolve(outputDir, "demo-mobile-cast-calls.png") });
      }
    }
    await clickWorkspaceSection(page, "tasks");
    const beforeCount = await page.locator('[data-action="task-complete"]').count();
    await page.locator('[data-action="task-complete"]').first().click();
    await page.waitForFunction((count) => document.querySelectorAll('[data-action="task-complete"]').length === count - 1, beforeCount);
    await page.reload();
    await page.locator('[data-action="task-complete"]').first().waitFor();
    assert.equal(await page.locator('[data-action="task-complete"]').count(), beforeCount - 1, "Demo edits must persist");
    await selectInspectorView(page, "integrations");
    const readiness = page.locator('[data-action="provider-runtime-check"]:visible');
    if (await readiness.count()) await readiness.click();
    await exportEncryptedBackup(page, { outputDir, passphrase: "demo-regression-backup-only" });
    await page.waitForFunction(() => document.querySelector(".backup-state")?.textContent?.includes("Exported"));
    assert.equal(apiRequests.length, 0, "Demo app attempted a Worker/provider request");
    assert.deepEqual(await readWorkspace(page, "film-offline-v1", "workspace_acme"), before, "Demo changed the normal workspace");
    assert.deepEqual(errors, []);
    await page.getByRole("link", { name: "Return to workspace", exact: true }).click();
    await page.locator(".content-column h1").waitFor();
    assert.equal(await page.locator(".demo-notice").count(), 0);
    record("demo portfolio covers all types/phases, dense responsive flows, empty-state spacing, exact call-sheet drilldown, persistent edits, encrypted export, and zero provider writes without changing the normal workspace");
  } catch (error) {
    await page.screenshot({ path: resolve(outputDir, "demo-failure.png"), fullPage: true }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

async function selectProject(page, id) {
  await clickWorkspaceSection(page, "projects");
  await page.locator('[data-project-surface="list"]').click();
  await page.locator(`[data-project-id="${id}"][data-action="project-select"]`).click();
}

async function readWorkspace(page, dbName, workspaceId) {
  return page.evaluate(({ dbName, workspaceId }) => new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("workspaces", "readonly").objectStore("workspaces").get(workspaceId);
      read.onsuccess = () => { resolve(read.result); db.close(); };
      read.onerror = () => { reject(read.error); db.close(); };
    };
  }), { dbName, workspaceId });
}
