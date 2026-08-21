import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts", "live-provider-adapter-smoke.mjs");

test("live provider adapter smoke skips when no Worker origin is configured", () => {
  const result = runSmoke();

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Live provider adapter smoke skipped/);
});

test("live provider adapter smoke can require an explicit Worker origin", () => {
  const result = runSmoke(["--require"]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Live provider adapter smoke skipped/);
});

test("live provider adapter smoke accepts an explicit request timeout", () => {
  const result = runSmoke(["--timeout-ms", "65000"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Live provider adapter smoke skipped/);
});

function runSmoke(args = []) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      TMPDIR: process.env.TMPDIR ?? tmpdir(),
      NO_COLOR: "1",
    },
    encoding: "utf8",
  });
}
