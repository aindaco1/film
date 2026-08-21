import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts", "bootstrap-production-owner.mjs");

test("owner bootstrap dry run redacts identity and documents rotation safeguards", async (context) => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "film-owner-bootstrap-"));
  context.after(() => rmSync(tempDir, { recursive: true, force: true }));
  const ownerValue = "owner-private@example.test";
  const sourcePath = path.join(tempDir, ".dev.vars");
  writeFileSync(sourcePath, `ADMIN_BOOTSTRAP_EMAILS=${ownerValue}\n`);

  const result = await runScript(["--source-dev-vars", sourcePath]);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /expire prior owner links/);
  assert.match(result.stdout, /revoke target and workspace-less sessions/);
  assert.equal(`${result.stdout}\n${result.stderr}`.includes(ownerValue), false);

  const source = readFileSync(scriptPath, "utf8");
  assert.match(source, /UPDATE magic_links/);
  assert.match(source, /WHERE member_id = '\$\{memberId\}'/);
  assert.match(source, /operator\.owner_bootstrapped/);
  assert.equal(source.includes("emailHash,"), false);
});

function runScript(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
