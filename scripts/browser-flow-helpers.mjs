import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export async function revealForm(form) {
  const disclosure = form.locator("xpath=ancestor::details[1]");
  if (await disclosure.count() && !(await disclosure.evaluate((element) => element.open))) {
    await disclosure.locator(":scope > summary").click();
  }
  await form.waitFor({ state: "visible" });
}

export async function submitForm(page, formSelector, fields) {
  const form = page.locator(formSelector).first();
  await revealForm(form);
  for (const [name, value] of Object.entries(fields)) {
    await form.locator(`[name="${name}"]`).fill(value);
  }
  await form.locator("button[type='submit']").click();
  await page.waitForTimeout(75);
}

export async function clickWorkspaceSection(page, section) {
  const destination = page.locator(`[data-workspace-section="${section}"]`);
  const visibleDestination = page.locator(`[data-workspace-section="${section}"]:visible`);
  const mobilePicker = page.locator("[data-action='workspace-section-select']:visible");
  if (await visibleDestination.count()) {
    await visibleDestination.first().click();
  } else if (await mobilePicker.count()) {
    await mobilePicker.selectOption(section);
  } else if (await destination.count()) {
    const target = destination.first();
    const disclosure = target.locator("xpath=ancestor::details[1]");
    if (await disclosure.count() && !(await disclosure.evaluate((element) => element.open))) {
      await disclosure.locator(":scope > summary").click();
    }
    await target.click();
  } else {
    throw new Error(`Workspace section ${section} has no navigation control`);
  }
  await page.waitForTimeout(75);
}

export async function selectInspectorView(page, view) {
  const selector = page.locator("[data-action='inspector-view']:visible");
  await selector.selectOption(view);
  await page.waitForTimeout(75);
  await expectInspectorView(page, view);
}

export async function expectInspectorView(page, view) {
  const selector = page.locator("[data-action='inspector-view']:visible");
  if (await selector.inputValue() !== view) {
    throw new Error(`Expected Inspector view ${view}`);
  }
  const activeViews = await page.locator(".inspector-view-panel:not([hidden])").evaluateAll((panels) => (
    panels.map((panel) => panel.getAttribute("data-inspector-view-panel"))
  ));
  if (activeViews.length === 0 || activeViews.some((activeView) => activeView !== view)) {
    throw new Error(`Inspector view ${view} leaked panels: ${activeViews.join(", ")}`);
  }
}

export async function exportEncryptedBackup(page, { outputDir, passphrase }) {
  await clickWorkspaceSection(page, "backups");
  await mkdir(outputDir, { recursive: true });
  const dialogPromise = page.waitForEvent("dialog", { timeout: 5_000 });
  const clickPromise = page.locator("[data-action='backup']:visible").first().click();
  const dialog = await dialogPromise;
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await dialog.accept(passphrase);
  await clickPromise;
  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  if (!filename.endsWith(".filmbackup.zip")) {
    throw new Error(`Expected encrypted ZIP backup download, received ${filename}`);
  }
  const backupPath = resolve(outputDir, filename);
  await download.saveAs(backupPath);
  return backupPath;
}

export async function previewEncryptedBackup(page, { backupPath, passphrase, expectText }) {
  await clickWorkspaceSection(page, "backups");
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.locator("[data-action='restore-file-preview']:visible").first().click();
  const fileChooser = await fileChooserPromise;
  const dialogPromise = page.waitForEvent("dialog");
  const setFilesPromise = fileChooser.setFiles(backupPath);
  const dialog = await dialogPromise;
  await dialog.accept(passphrase);
  await setFilesPromise;
  await expectText("Encrypted backup decrypted for preview only");
  await expectText("No records were overwritten");
}
