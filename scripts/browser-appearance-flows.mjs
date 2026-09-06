import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { clickWorkspaceSection, selectInspectorView, exportEncryptedBackup, previewEncryptedBackup } from "./browser-flow-helpers.mjs";
import { WORKSPACE_FLOW_SECTIONS } from "./user-flow-catalog.mjs";

const appearanceKey = "film.appearance.v1";
const inspectorViews = ["overview", "team", "ownership", "changes", "permissions", "integrations", "imports"];

export async function runOfflineShellSmoke(url, browser, record) {
  const context = await browser.newContext({ colorScheme: "dark" });
  try {
    await context.route("https://api.film.dustwave.xyz/**", (route) => route.abort());
    const page = await context.newPage();
    await page.goto(url);
    await page.locator("[data-appearance]").waitFor();
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).some((registration) => registration.active), null, { timeout: 10_000 });
    await page.reload();
    await page.selectOption("[data-appearance]", "light");
    await page.waitForFunction(async () => (await caches.match(location.href)) !== undefined);
    const cachedPaths = await page.evaluate(async () => (await (await caches.open("film-shell-v2")).keys()).map((request) => new URL(request.url).pathname));
    assert(cachedPaths.includes("/theme.css") && cachedPaths.includes("/appearance.js"));
    assert(cachedPaths.some((path) => path.startsWith("/assets/") && path.endsWith(".js")), "Compiled entry is cached");
    assert(!cachedPaths.some((path) => path.startsWith("/api/") || path.startsWith("/auth/")));
    for (const [section, ready, module] of [["call-sheets", ".call-sheets-workspace-grid", "production-documents-view"], ["shots", ".shots-workspace-grid", "production-resources-view"]]) {
      await clickWorkspaceSection(page, section);
      await page.locator(ready).waitFor();
      await page.waitForFunction(async module => (await (await caches.open("film-shell-v2")).keys()).some(request => new URL(request.url).pathname.startsWith(`/assets/${module}-`)), module);
    }
    await clickWorkspaceSection(page, "backups");
    await page.locator(".backup-restore-workflow").waitFor();
    await page.waitForFunction(async () => (await (await caches.open("film-shell-v2")).keys()).some((request) => /\/assets\/backup-workspace-.*\.js$/.test(new URL(request.url).pathname)));
    const backupOptions = { outputDir: resolve("test-results/offline-backups"), passphrase: "offline fixture passphrase" };
    await exportEncryptedBackup(page, backupOptions);
    await page.getByRole("status").filter({ hasText: "Encrypted ZIP backup exported" }).waitFor();
    await selectInspectorView(page, "integrations");
    await page.locator(".integration-picker").waitFor();
    await page.locator('[data-action="provider-runtime-readiness"]').click();
    await page.getByText(/^Status check failed:/).waitFor();
    await context.setOffline(true);
    await page.reload();
    await page.locator("[data-appearance]").waitFor();
    await page.locator(".backup-restore-workflow").waitFor();
    assert.equal(await page.locator('[data-action="restore-file-preview"]').count(), 1, "Cached recovery controls survive offline reload");
    await page.locator(".integration-picker").waitFor();
    const offlineBackup = await exportEncryptedBackup(page, backupOptions);
    await page.getByRole("status").filter({ hasText: "Encrypted ZIP backup exported" }).waitFor();
    await previewEncryptedBackup(page, {
      backupPath: offlineBackup, passphrase: backupOptions.passphrase,
      expectText: text => page.getByText(text, { exact: false }).first().waitFor(),
    });
    assert.equal(await page.locator('[data-action="restore-application-commit"]').count(), 0, "Offline preview cannot bypass restore approvals");
    for (const [section, ready] of [["call-sheets", ".call-sheets-workspace-grid"], ["sides", ".sides-workspace-grid"], ["reports", ".production-reports-workspace-grid"], ["shots", ".shots-workspace-grid"], ["locations", ".locations-workspace-grid"], ["talent", ".talent-workspace-grid"]]) {
      await clickWorkspaceSection(page, section);
      await page.locator(ready).waitFor();
      await page.reload();
      await page.locator(ready).waitFor();
    }
    await expectTheme(page, "light", "light");
    await page.selectOption("[data-appearance]", "dark");
    await page.goto(`${url}privacy.html`);
    await expectTheme(page, "dark", "dark");
    assert.equal(await page.locator("h1").textContent(), "Film by Dust Wave Privacy Policy");
    await context.setOffline(false);
    await page.goto(`${url}?demo=portfolio`);
    await page.locator(".demo-notice").waitFor();
    assert.equal(await page.locator("button.project-row").count(), 12);
    await page.waitForFunction(async () => (await (await caches.open("film-shell-v2")).keys()).some((request) => /\/assets\/demo-portfolio-.*\.js$/.test(new URL(request.url).pathname)));
    await context.setOffline(true);
    await page.reload();
    await page.locator(".demo-notice").waitFor();
    assert.equal(await page.locator("button.project-row").count(), 12, "Isolated demo and lazy-loaded fixtures survive offline reload");
    assert.equal(await page.evaluate(async () => (await (await caches.open("film-shell-v2")).keys()).some((request) => new URL(request.url).search)), false, "Demo shell caching must not retain query URLs");
    record("compiled app and previously loaded recovery/integration screens reload offline; encrypted backup export and preview work with unavailable Worker routes, approval gates remain enforced, and private API responses stay out of cache");
    record("compiled demo portfolio reloads offline with its lazy-loaded fixtures, without caching query URLs");
    record("previously loaded production document and resource modules retain all six workspaces through offline navigation and reload");
  } finally {
    await context.close();
  }
}

export async function auditWorkspaceAppearance(page, { outputDir, checkAccessibility, checkOverflow, prefix = "" }) {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1280, height: 900 }, { width: 1024, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const theme of ["light", "dark"]) {
      await page.selectOption("[data-appearance]", theme);
      for (const [section] of WORKSPACE_FLOW_SECTIONS) {
        await clickWorkspaceSection(page, section);
        await expectTheme(page, theme, theme);
        assert.equal(await page.evaluate(() => document.activeElement?.tagName), "H1", "Navigation focuses the workspace heading");
        if (section === "call-sheets") await checkCallSheetLayout(page);
        await checkOverflow(page, `${prefix}${viewport.width}px ${theme} ${section}`);
        await checkAccessibility(page, `${prefix}${viewport.width}px ${theme} ${section}`);
        if (viewport.width !== 1024) await page.screenshot({ path: resolve(outputDir, `${prefix}${viewport.width}-${theme}-${section}.png`), fullPage: true });
      }
      for (const view of inspectorViews) {
        await selectInspectorView(page, view);
        await checkOverflow(page, `${prefix}${viewport.width}px ${theme} inspector ${view}`);
        await checkAccessibility(page, `${prefix}${viewport.width}px ${theme} inspector ${view}`);
        if (["team", "integrations"].includes(view)) await page.screenshot({ path: resolve(outputDir, `${prefix}${viewport.width}-${theme}-inspector-${view}.png`), fullPage: true });
      }
      await selectInspectorView(page, "overview");
    }
  }
}

export async function checkCallSheetLayout(page) {
  await page.locator(".call-sheets-workspace-grid").waitFor();
  const clipped = await page.locator(".call-sheet-scene-table, .call-sheet-cast-list, .call-sheet-table").evaluateAll((lists) => lists.flatMap((list) => {
    const bounds = list.getBoundingClientRect();
    const failures = list.scrollWidth > list.clientWidth + 1 ? [list.getAttribute("aria-label")] : [];
    for (const control of list.querySelectorAll("input, button")) {
      const rect = control.getBoundingClientRect();
      const fontSize = Number.parseFloat(getComputedStyle(control).fontSize);
      const minimumWidth = control.type === "time" ? (fontSize >= 16 ? 150 : 110) : 30;
      if (rect.left < bounds.left || rect.right > bounds.right || rect.width < minimumWidth) {
        failures.push(control.getAttribute("aria-label") || control.getAttribute("name") || control.tagName);
      }
    }
    return failures;
  }));
  assert.deepEqual(clipped, [], "Call-sheet lists fit without horizontal scrolling and native time controls retain space for AM/PM and the picker");
}

async function expectTheme(page, theme, preference) {
  await page.waitForFunction(({ theme, preference }) => (
    document.documentElement.dataset.theme === theme
    && document.documentElement.dataset.appearancePreference === preference
  ), { theme, preference });
  const colors = await page.evaluate(() => ({
    background: getComputedStyle(document.documentElement).backgroundColor,
    foreground: getComputedStyle(document.documentElement).color,
    chrome: document.querySelector('meta[name="theme-color"]').content,
  }));
  assert.equal(colors.background, theme === "light" ? "rgb(255, 255, 255)" : "rgb(16, 16, 16)");
  assert.equal(colors.foreground, theme === "light" ? "rgb(17, 17, 17)" : "rgb(248, 248, 248)");
  assert.equal(colors.chrome, colors.background, "Browser chrome follows the resolved theme");
}

async function checkPaletteContrast(page) {
  const pairs = await page.evaluate(() => {
    const probe = document.createElement("span");
    document.body.append(probe);
    const pairs = [];
    for (const background of ["bg", "bg-deep", "surface", "surface-soft", "surface-strong", "selected"]) {
      for (const foreground of ["text", "muted"]) {
        probe.style.backgroundColor = `var(--${background})`;
        probe.style.color = `var(--${foreground})`;
        const style = getComputedStyle(probe);
        pairs.push({ name: `${foreground}/${background}`, foreground: style.color, background: style.backgroundColor });
      }
    }
    probe.remove();
    return pairs;
  });
  const luminance = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }).reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  for (const pair of pairs) {
    const values = [luminance(pair.foreground), luminance(pair.background)].sort((a, b) => a - b);
    const ratio = (values[1] + 0.05) / (values[0] + 0.05);
    assert(ratio >= 4.5, `${pair.name} must meet 4.5:1, received ${ratio}`);
  }
}

export async function runAppearanceSmoke(url, browser, { outputDir, checkAccessibility, checkOverflow, record }) {
  await mkdir(outputDir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: "dark" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const check = async (label) => {
    await checkOverflow(page, label);
    await checkAccessibility(page, label);
  };
  const screenshot = (name) => page.screenshot({ path: resolve(outputDir, `${name}.png`), fullPage: true });
  try {
    await page.goto(url);
    await page.locator("[data-appearance]").waitFor();
    await expectTheme(page, "dark", "system");
    await page.emulateMedia({ colorScheme: "light" });
    await expectTheme(page, "light", "system");

    const draft = page.locator('.project-overview-form textarea');
    await draft.fill("Unsaved project description");
    await page.selectOption("[data-appearance]", "dark");
    await expectTheme(page, "dark", "dark");
    assert.equal(await draft.inputValue(), "Unsaved project description", "Theme changes preserve unsaved fields");
    await page.emulateMedia({ colorScheme: "light" });
    await expectTheme(page, "dark", "dark");
    await page.reload();
    await page.locator("[data-appearance]").waitFor();
    await expectTheme(page, "dark", "dark");
    assert.equal(await page.locator("[data-appearance]").inputValue(), "dark");

    const peer = await context.newPage();
    await peer.goto(`${url}privacy.html`);
    await expectTheme(peer, "dark", "dark");
    await page.selectOption("[data-appearance]", "light");
    await expectTheme(peer, "light", "light");
    await page.selectOption("[data-appearance]", "system");
    await expectTheme(peer, "dark", "system");
    await peer.close();
    record("appearance follows system changes, persists overrides, syncs tabs/legal pages, and preserves draft fields");

    await auditWorkspaceAppearance(page, { outputDir, checkAccessibility, checkOverflow });
    record("17 workspaces and 7 inspector views passed both-theme accessibility and overflow checks at desktop, tablet, and mobile widths");

    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.selectOption("[data-appearance]", theme);
      await checkPaletteContrast(page);
      for (const [section] of WORKSPACE_FLOW_SECTIONS) {
        await clickWorkspaceSection(page, section);
        await page.locator(".content-column details").evaluateAll((details) => details.forEach((detail) => { detail.open = true; }));
        await check(`${theme} ${section} expanded forms`);
      }
      await clickWorkspaceSection(page, "projects");
      await page.locator('[data-action="create-project"]').click();
      assert.equal(await page.getByLabel("Title", { exact: true }).count(), 1, "Visible native labels are preserved");
      for (let step = 0; step < 7; step += 1) {
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => !document.hasFocus() || Boolean(document.activeElement?.closest("dialog"))), true, "Modal focus never enters background app controls");
      }
      await check(`${theme} project creation dialog`);
      await screenshot(`${theme}-create-project`);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("dialog").count(), 0, "Escape dismisses the dialog");
      assert.equal(await page.locator('[data-action="create-project"]').evaluate((button) => button === document.activeElement), true, "Dismissal restores trigger focus");
    }
    await clickWorkspaceSection(page, "call-sheets");
    await page.locator('.call-sheet-generator-panel [data-workspace-section="schedule"]').click();
    assert.equal(await page.locator("main h1").textContent(), "Schedule", "Call-sheet empty state recovers to its canonical prerequisite");

    await page.reload();
    await page.locator("[data-appearance]").waitFor();
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(".skip-link").evaluate((link) => link === document.activeElement), true);
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => document.activeElement.id), "main-content");
    await page.locator("[data-appearance]").focus();
    const outline = await page.locator("[data-appearance]").evaluate((element) => getComputedStyle(element).outlineStyle);
    assert.equal(outline, "solid", "Keyboard controls have a visible focus ring");
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await checkOverflow(page, "forced colors and reduced motion");
    await screenshot("forced-colors");
    await page.emulateMedia({ forcedColors: "none" });
    record("expanded forms, create dialog, prerequisite recovery, skip navigation, and keyboard focus passed");

    for (const theme of ["light", "dark"]) {
      await page.selectOption("[data-appearance]", theme);
      const legal = await context.newPage();
      for (const name of ["privacy", "terms", "sms", "data-deletion"]) {
        await legal.goto(`${url}${name}.html`);
        await expectTheme(legal, theme, theme);
        await checkAccessibility(legal, `${theme} ${name}`);
        await checkOverflow(legal, `${theme} ${name}`);
      }
      await legal.close();
    }
    assert.deepEqual(errors, [], "Theme and navigation changes produce no uncaught browser errors");
  } catch (error) {
    await screenshot("appearance-failure").catch(() => {});
    throw error;
  } finally {
    await context.close();
  }

  const unavailable = await browser.newContext({ colorScheme: "dark" });
  await unavailable.addInitScript((key) => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (name) { if (name === key) throw new Error("Unavailable"); return get.call(this, name); };
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new Error("Unavailable"); return set.call(this, name, value); };
  }, appearanceKey);
  try {
    const page = await unavailable.newPage();
    await page.goto(url);
    await page.locator("[data-appearance]").waitFor();
    await expectTheme(page, "dark", "system");
    await page.selectOption("[data-appearance]", "light");
    await expectTheme(page, "light", "light");
    record("unavailable appearance storage degrades to a working session-only preference");
  } finally {
    await unavailable.close();
  }

  const noScript = await browser.newContext({ javaScriptEnabled: false, colorScheme: "dark" });
  try {
    const page = await noScript.newPage();
    await page.goto(`${url}privacy.html`);
    assert.equal(await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor), "rgb(16, 16, 16)");
    record("legal pages follow system appearance without JavaScript; primary and secondary text meet 4.5:1 on every standard surface");
  } finally {
    await noScript.close();
  }
}
