#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  clickWorkspaceSection,
  exportEncryptedBackup,
  expectInspectorView,
  previewEncryptedBackup,
  revealForm,
  selectInspectorView,
  submitForm,
} from "./browser-flow-helpers.mjs";

const PROVIDER_LABELS = {
  pool: "Pool",
  store: "Store",
  stripe: "Stripe",
  social: "Meta Insights",
  google: "Google",
  resend: "Resend",
  sms: "SMS",
};
const DEFAULT_APP_ORIGIN = "http://127.0.0.1:5173";
const DEFAULT_EMAIL = "film-browser-smoke@example.invalid";
const REQUEST_TIMEOUT_MS = 10_000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failureDir = path.join(root, "test-results");
const smokePassphrase = "browser worker smoke passphrase";

const args = parseArgs(process.argv.slice(2));
const required = Boolean(
  args.require
    || args.strict
    || process.env.FILM_BROWSER_WORKER_SMOKE_REQUIRED === "1"
    || process.env.FILM_WORKER_SMOKE_REQUIRED === "1",
);
const workerOrigin = args["worker-origin"]
  ?? process.env.FILM_BROWSER_WORKER_SMOKE_WORKER_ORIGIN
  ?? process.env.FILM_WORKER_SMOKE_ORIGIN
  ?? process.env.VITE_WORKER_URL
  ?? "";

if (!workerOrigin) {
  const message = "Browser Worker smoke skipped: set FILM_BROWSER_WORKER_SMOKE_WORKER_ORIGIN or FILM_WORKER_SMOKE_ORIGIN.";
  console.log(message);
  process.exit(required ? 1 : 0);
}

const appOrigin = normalizeBaseUrl(args["app-origin"] ?? process.env.FILM_BROWSER_WORKER_SMOKE_APP_ORIGIN ?? DEFAULT_APP_ORIGIN);
const normalizedWorkerOrigin = normalizeBaseUrl(workerOrigin);
const email = args.email ?? process.env.FILM_BROWSER_WORKER_SMOKE_EMAIL ?? DEFAULT_EMAIL;

let appServer = null;
let browser = null;

try {
  appServer = await ensureAppServer(appOrigin, normalizedWorkerOrigin);
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    deviceScaleFactor: 1,
    acceptDownloads: true,
  });
  const page = await context.newPage();

  await page.goto(appOrigin, { waitUntil: "networkidle" });
  await expectBodyText(page, "Film");
  await expectBodyText(page, "7 dry-run");

  await submitForm(page, "form[data-action='auth-request']", { email });
  await expectBodyText(page, "Dry-run link ready");
  await page.locator("[data-action='auth-verify']").click();
  await expectBodyText(page, "owner session");
  await expectBodyText(page, "Sign out");
  await page.reload({ waitUntil: "networkidle" });
  await expectBodyText(page, "Signed-in workspace restored.");
  await expectBodyText(page, "owner session");

  await runCanonicalContextualReplayFlow(page);

  await page.locator("[data-action='integrations-open']:visible").click();
  await expectInspectorView(page, "integrations");
  for (const [key, label] of Object.entries(PROVIDER_LABELS)) {
    await page.locator(`[data-integration="${key}"]:visible`).first().click();
    await expectBodyText(page, `${label} dry run`);
    await expectBodyText(page, "Scopes:");
  }

  await page.locator(`[data-integration="social"]:visible`).first().click();
  await page.locator("[data-action='meta-connection-check']").click();
  await expectBodyText(page, "Meta connection");
  await expectBodyText(page, "Missing or invalid META_OAUTH_CLIENT_ID");
  await mkdir(failureDir, { recursive: true });
  const metaInspector = page.locator("section.inspector-section").filter({ hasText: "Meta connection" }).last();
  await metaInspector.scrollIntoViewIfNeeded();
  await metaInspector.screenshot({ path: path.join(failureDir, "meta-inspector-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMetaInspector = page.locator("section.inspector-section").filter({ hasText: "Meta connection" }).last();
  await mobileMetaInspector.scrollIntoViewIfNeeded();
  await mobileMetaInspector.screenshot({ path: path.join(failureDir, "meta-inspector-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 950 });

  await page.locator(`[data-integration="stripe"]:visible`).first().click();
  await page.locator("[data-action='stripe-summary-readiness']").click();
  await expectBodyText(page, "Stripe summary readiness");
  await expectBodyText(page, "direct Stripe reads blocked");

  await page.locator(`[data-integration="google"]:visible`).first().click();
  const driveDialogPromise = page.waitForEvent("dialog");
  const driveClickPromise = page.locator("[data-action='google-drive-sync-dry-run']").click();
  const driveDialog = await driveDialogPromise;
  await driveDialog.accept("");
  await driveClickPromise;
  await expectBodyText(page, "Drive sync plan");
  await expectBodyText(page, "metadata preflight only");

  await runProtectedMutationFlow(page);

  const backupPath = await exportEncryptedBackup(page, {
    outputDir: failureDir,
    passphrase: smokePassphrase,
  });
  await expectBodyText(page, "Encrypted ZIP backup exported");
  await expectAnyBodyText(page, ["Worker R2 backup storage", "Worker restore-point metadata"]);
  await previewEncryptedBackup(page, {
    backupPath,
    passphrase: smokePassphrase,
    expectText: (text) => expectBodyText(page, text),
  });

  await page.locator("[data-action='auth-sign-out']").click();
  await expectBodyText(page, "Signed out of Film.");

	  console.log("Browser Worker smoke passed: app shell, resumable Worker auth, canonical workspace hydration, real-D1 contextual record replay, provider dry-runs, disabled Meta inspector, Stripe readiness, Google Drive sync plan, canonical document save, protected mutation apply, protected profile mutation apply, encrypted backup export, restore preview, logout");
} catch (error) {
  console.error(`Browser Worker smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (appServer?.child) {
    appServer.child.kill("SIGTERM");
    await new Promise((resolve) => appServer.child.once("exit", resolve));
  }
}

async function ensureAppServer(appOriginValue, workerOriginValue) {
  if (await isReachable(appOriginValue)) {
    return { started: false, child: null };
  }

  const url = new URL(appOriginValue);
  if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("App origin is not reachable and cannot be auto-started unless it is localhost.");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("Auto-started local app origins must not include a path.");
  }

  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  const child = spawn("npx", ["vite", "--host", url.hostname, "--port", port, "--strictPort"], {
    cwd: path.join(root, "apps", "web"),
    env: {
      ...process.env,
      VITE_WORKER_URL: workerOriginValue,
      NO_COLOR: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForReachable(appOriginValue);
  } catch (error) {
    child.kill("SIGTERM");
    throw new Error(`Vite app did not start at ${appOriginValue}: ${error instanceof Error ? error.message : String(error)} ${output.trim()}`);
  }

  return { started: true, child };
}

async function expectBodyText(page, text) {
  await page.locator("body").filter({ hasText: text }).waitFor({ timeout: REQUEST_TIMEOUT_MS });
}

async function expectAnyBodyText(page, texts) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
    const bodyText = await page.locator("body").innerText();
    if (texts.some((text) => bodyText.includes(text))) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Expected body to contain one of: ${texts.join(", ")}`);
}

async function runCanonicalContextualReplayFlow(page) {
  const projectTitle = `Browser Worker Contextual ${Date.now()}`;
  await clickWorkspaceSection(page, "projects");
  await page.locator("[data-action='create-project']:visible").first().click();
  const createProjectForm = page.locator("form[data-action='project-create-form']");
  await createProjectForm.locator("input[name='title']").fill(projectTitle);
  await createProjectForm.locator("select[name='projectType']").selectOption({ label: "Feature Film" });
  await createProjectForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Feature Film created from the film template and queued for sync.");
  await syncOneCanonicalOperation(page, "project create");

  await selectInspectorView(page, "overview");
  const projectForm = page.locator("form[data-action='project-inline-update']");
  await projectForm.locator("input[name='shootDates']").fill("Sep 14 - Sep 16");
  await projectForm.locator("input[name='totalBudget']").fill("15000");
  await projectForm.locator("input[name='location']").fill("Browser Worker Stage");
  await projectForm.locator("textarea[name='description']").fill("Canonical contextual replay smoke.");
  await projectForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Project details saved locally.");
  await syncOneCanonicalOperation(page, "project update");
  await expectEditableValue(page, "form[data-action='project-inline-update'] input[name='location']", "Browser Worker Stage");

  await clickWorkspaceSection(page, "tasks");
  await submitForm(page, "form[data-action='add-task']", { title: "Contextual task", due: "Sep 1" });
  await expectBodyText(page, "Task added to the IndexedDB operation log.");
  await syncOneCanonicalOperation(page, "task create");
  const taskForm = page.locator("form[data-record-kind='task']").filter({ has: page.locator("input[value='Contextual task']") }).first();
  await taskForm.locator("input[name='title']").fill("Edited contextual task");
  await taskForm.locator("input[name='due']").fill("Sep 2");
  await taskForm.locator("select[name='status']").selectOption("ready");
  await expectBodyText(page, "Task updated: Edited contextual task Saved locally.");
  await syncOneCanonicalOperation(page, "task update");
  await expectEditableValue(page, "form[data-record-kind='task'] input[name='title']", "Edited contextual task");

  await clickWorkspaceSection(page, "people");
  await submitForm(page, "form[data-action='add-person']", { name: "Context Person", role: "Crew" });
  await expectBodyText(page, "Person added to the local operation log.");
  await syncOneCanonicalOperation(page, "person create");
  const personForm = page.locator("form[data-record-kind='person']").first();
  await personForm.locator("input[name='name']").fill("Edited Context Person");
  await personForm.locator("input[name='role']").fill("Gaffer");
  await personForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Person updated: Edited Context Person Saved locally.");
  await syncOneCanonicalOperation(page, "person update");
  await expectEditableValue(page, "form[data-record-kind='person'] input[name='role']", "Gaffer");

  await clickWorkspaceSection(page, "equipment");
  await submitForm(page, "form[data-action='add-equipment']", { name: "Context Camera", status: "Planned" });
  await expectBodyText(page, "Equipment added to the local operation log.");
  await syncOneCanonicalOperation(page, "equipment create");
  const equipmentForm = page.locator("form[data-record-kind='equipment']").first();
  await equipmentForm.locator("input[name='name']").fill("Edited Context Camera");
  await equipmentForm.locator("input[name='status']").fill("Checked out");
  await equipmentForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Equipment updated: Edited Context Camera Saved locally.");
  await syncOneCanonicalOperation(page, "equipment update");
  await expectEditableValue(page, "form[data-record-kind='equipment'] input[name='status']", "Checked out");

  await clickWorkspaceSection(page, "expenses");
  await submitForm(page, "form[data-action='add-expense']", { category: "Context rental", spent: "100", budget: "200" });
  await expectBodyText(page, "Expense added to the local operation log.");
  await syncOneCanonicalOperation(page, "expense create");
  const expenseForm = page.locator("form[data-record-kind='expense']").first();
  await expenseForm.locator("input[name='category']").fill("Edited context rental");
  await expenseForm.locator("input[name='spent']").fill("150");
  await expenseForm.locator("input[name='budget']").fill("300");
  await expenseForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Expense updated: Edited context rental Saved locally.");
  await syncOneCanonicalOperation(page, "expense update");
  await expectEditableValue(page, "form[data-record-kind='expense'] input[name='spent']", "150");
}

async function syncOneCanonicalOperation(page, label) {
  await page.locator("[data-action='sync-dry-run']").click();
  try {
    await expectBodyText(page, "D1 replay accepted");
    await expectBodyText(page, "1 record applied");
  } catch (error) {
    const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(-1000);
    throw new Error(`${label} canonical sync failed: ${error instanceof Error ? error.message : String(error)}; UI: ${bodyText}`);
  }
}

async function expectEditableValue(page, selector, value) {
  await page.waitForFunction(
    ({ controlSelector, expectedValue }) => Array.from(document.querySelectorAll(controlSelector)).some((control) => (
      (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement || control instanceof HTMLSelectElement)
      && control.value === expectedValue
    )),
    { controlSelector: selector, expectedValue: value },
    { timeout: REQUEST_TIMEOUT_MS },
  );
}

async function runProtectedMutationFlow(page) {
  await clickWorkspaceSection(page, "docs");
  await submitForm(page, "form[data-action='add-doc']", { name: "Browser Worker Mutation Notes" });
  await expectBodyText(page, "Document draft added to the local operation log.");

  await page.locator("[data-action='sync-dry-run']").click();
  await expectBodyText(page, "D1 replay accepted");
  await expectBodyText(page, "1 record applied");

  const documentForm = page.locator("form[data-action='doc-save']").first();
  await documentForm.locator("textarea[name='markdown']").fill("# Browser Worker Mutation Notes\n\nCanonical body smoke.");
  await documentForm.locator("button[type='submit']").click();
  await expectBodyText(page, "Document draft saved locally and to the canonical workspace.");

  await selectInspectorView(page, "ownership");
  const ownerForm = page.locator("form[data-action='record-owner-transfer']").first();
  await revealForm(ownerForm);
  await ownerForm.locator("select[name='entityType']").selectOption("document");
  const targetOption = ownerForm.locator("select[name='entityId'] option", { hasText: "Browser Worker Mutation Notes" }).first();
  await targetOption.waitFor({ state: "attached", timeout: REQUEST_TIMEOUT_MS });
  const targetId = await targetOption.getAttribute("value");
  if (!targetId) throw new Error("Could not find synced mutation target document");
  await ownerForm.locator("select[name='entityId']").selectOption(targetId);

  await selectInspectorView(page, "changes");
  const preflightForm = page.locator("form[data-action='record-mutation-preflight']").first();
  await revealForm(preflightForm);
  await preflightForm.locator("button[type='submit']").click();
  await expectBodyText(page, "update access allowed");

  const requestForm = page.locator("form[data-action='record-mutation-request']").first();
  await revealForm(requestForm);
  await requestForm.locator("input[name='fieldKeys'][value='externalUrl']").check();
  await requestForm.locator("input[name='fieldKeys'][value='sensitive']").check();
  await requestForm.locator("input[name='summary']").fill("Attach browser-worker-smoke external URL and sensitivity.");
  await requestForm.locator("button[type='submit']").click();
  await expectBodyText(page, "mutation requested");

  const resolutionForm = page.locator("form[data-action='record-mutation-resolve']").first();
  await revealForm(resolutionForm);
  await resolutionForm.locator("input[name='note']").fill("Browser Worker smoke approval.");
  await resolutionForm.locator("button[type='submit']").click();
  await expectBodyText(page, "approved pending apply");

  const diffForm = page.locator("form[data-action='record-mutation-diff-preview']").first();
  await revealForm(diffForm);
  await diffForm.locator("input[name='update:externalUrl']").fill("https://docs.example.com/browser-worker-smoke-deck");
  await diffForm.locator("select[name='update:sensitive']").selectOption("true");
  await diffForm.locator("button[type='submit']").click();
  await expectBodyText(page, "externalUrl");
  await expectBodyText(page, "https://docs.example.com/browser-worker-smoke-deck");

  const applyForm = page.locator("form[data-action='record-mutation-apply']").first();
  await revealForm(applyForm);
  await applyForm.locator("input[name='update:externalUrl']").fill("https://docs.example.com/browser-worker-smoke-deck");
  await applyForm.locator("select[name='update:sensitive']").selectOption("true");
  await applyForm.locator("button[type='submit']").click();
  await expectBodyText(page, "mutation applied");
  await expectAnyBodyText(page, [
    "externalUrl, sensitive - destructive write",
    "sensitive, externalUrl - destructive write",
  ]);

  await page.locator("[data-change-request-kind='profile']").click();
  const profileRequestForm = page.locator("form[data-action='film-profile-mutation-request']").first();
  await revealForm(profileRequestForm);
  await profileRequestForm.locator("input[name='fieldKeys'][value='format']").check();
  await profileRequestForm.locator("input[name='fieldKeys'][value='budgetCents']").check();
  await profileRequestForm.locator("input[name='summary']").fill("Update browser-worker-smoke profile metadata.");
  await profileRequestForm.locator("button[type='submit']").click();
  await expectBodyText(page, "profile review requested");

  const profileResolutionForm = page.locator("form[data-action='film-profile-mutation-resolve']").first();
  await revealForm(profileResolutionForm);
  await profileResolutionForm.locator("input[name='note']").fill("Browser Worker smoke profile approval.");
  await profileResolutionForm.locator("button[type='submit']").click();
  await expectBodyText(page, "profile mutation approved pending apply");

  const profileDiffForm = page.locator("form[data-action='film-profile-mutation-diff-preview']").first();
  await revealForm(profileDiffForm);
  await profileDiffForm.locator("input[name='update:format']").fill("B&W");
  await profileDiffForm.locator("input[name='update:budgetCents']").fill("2600000");
  await profileDiffForm.locator("button[type='submit']").click();
  await expectBodyText(page, "profile mutation diff");
  await expectBodyText(page, "B&W");

  const profileApplyForm = page.locator("form[data-action='film-profile-mutation-apply']").first();
  await revealForm(profileApplyForm);
  await profileApplyForm.locator("input[name='update:format']").fill("B&W");
  await profileApplyForm.locator("input[name='update:budgetCents']").fill("2600000");
  await profileApplyForm.locator("button[type='submit']").click();
  await expectBodyText(page, "profile mutation applied");
  await expectAnyBodyText(page, [
    "format, budgetCents - destructive write",
    "budgetCents, format - destructive write",
  ]);
}

async function waitForReachable(url) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < REQUEST_TIMEOUT_MS) {
    if (await isReachable(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("timed out waiting for HTTP 200");
}

async function isReachable(url) {
  try {
    const response = await fetchWithTimeout(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBaseUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Smoke origins must be http(s) URLs");
  }
  const pathname = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${pathname}`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--require" || arg === "--strict") {
      parsed[arg.slice(2)] = true;
      continue;
    }
    if (arg === "--worker-origin" || arg === "--app-origin" || arg === "--email") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      parsed[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}
