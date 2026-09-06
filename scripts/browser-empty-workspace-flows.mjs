import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { clickWorkspaceSection } from "./browser-flow-helpers.mjs";

export async function runEmptyWorkspaceSmoke(url, browser, { prepare, authenticate, record, checkAccessibility, checkOverflow, outputDir }) {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, serviceWorkers: "block" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unmocked request blocked" } }));
      const session = await prepare(page);
      await page.route("**/api/auth/session", route => route.fulfill({ json: { dryRun: true, session: { id: session.id, role: session.role, expiresAt: session.expiresAt } } }));
      await page.route("**/api/workspaces/current/snapshot", route => route.fulfill({ json: { snapshot: {
        schemaVersion: 1, generatedAt: "2026-09-06T12:00:00Z", persistence: "d1_canonical_workspace_snapshot", readPolicy: "workspace_role_and_record_scope",
        workspace: { id: "workspace_acme", name: "New Film Workspace", updatedAt: "2026-09-06T12:00:00Z" },
        currentMember: { id: "member_empty_owner", role: "owner" },
        members: [{ id: "member_empty_owner", displayName: "Owner", emailHash: null, role: "owner", status: "active", lastSeenAt: null }],
        projects: [], filmProfiles: [], tasks: [], documents: [], people: [], projectPeople: [], equipment: [], expenses: [], restorePoints: [], truncatedCollections: [],
      } } }));
      await page.goto(url);
      await authenticate(page);
      await page.getByRole("heading", { name: "Projects", exact: true, level: 1 }).waitFor();
      await page.getByText("No projects yet.", { exact: true }).waitFor();
      await page.reload();
      await page.getByText("owner session", { exact: true }).waitFor();
      await page.getByText("No projects yet.", { exact: true }).waitFor();
      assert(await page.locator('[data-workspace-section="tasks"]').isDisabled());
      assert.notEqual(await page.locator('[data-action="workspace-section-select"] option[value="tasks"]').getAttribute("disabled"), null);
      for (const theme of ["light", "dark"]) {
        await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
        await checkAccessibility(page, `Empty workspace ${width} ${theme}`);
        await checkOverflow(page, `Empty workspace ${width} ${theme}`);
        await mkdir(outputDir, { recursive: true });
        await page.screenshot({ path: resolve(outputDir, `empty-workspace-${width}-${theme}.png`), fullPage: true });
      }
      await clickWorkspaceSection(page, "backups");
      await page.getByRole("heading", { name: "Backups", exact: true, level: 1 }).waitFor();
      await clickWorkspaceSection(page, "planning");
      await page.getByRole("heading", { name: "Planning", exact: true, level: 1 }).waitFor();
      await page.locator('[data-action="integrations-open"]').click();
      await page.locator('[data-integration="google"]').click();
      await page.getByRole("button", { name: "Check Google", exact: true }).waitFor();
      await checkOverflow(page, `Empty workspace integrations ${width}`);
      await clickWorkspaceSection(page, "projects");
      await page.getByRole("button", { name: "Create project", exact: true }).click();
      await page.getByRole("dialog").getByLabel("Title", { exact: true }).fill("Uncommitted first project");
      await page.getByRole("button", { name: "Close project creation", exact: true }).click();
      assert.equal(await page.getByRole("dialog").count(), 0);
      await page.getByText("No projects yet.", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Create project", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Title", { exact: true }).fill("First Production");
      await dialog.locator('select[name="projectType"]').selectOption({ label: "Feature Film" });
      await dialog.getByRole("button", { name: "Create project", exact: true }).click();
      await page.getByText("Feature Film created from the film template and queued for sync.", { exact: true }).waitFor();
      assert.equal(await page.getByText("No projects yet.", { exact: true }).count(), 0);
      assert.equal(await page.locator('[data-workspace-section="tasks"]').isDisabled(), false);
      await clickWorkspaceSection(page, "slate");
      await page.getByRole("heading", { name: "Overview", exact: true, level: 1 }).waitFor();
      await page.reload();
      await page.getByText("owner session", { exact: true }).waitFor();
      await page.locator(".overview-workspace-head").filter({ hasText: "First Production - Feature Film" }).waitFor();
      await page.getByRole("button", { name: "Sign out", exact: true }).click();
      await page.getByText("Signed out of Film.", { exact: true }).waitFor();
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  record("an empty canonical workspace retains authentication, appearance, recovery and integrations; first-project creation/cancel/reload works on desktop/mobile without invented project records");
}
