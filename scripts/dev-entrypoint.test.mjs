import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the default local command starts both the web app and Worker", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const source = await readFile(new URL("./dev.mjs", import.meta.url), "utf8");

  assert.equal(packageJson.scripts.dev, "node scripts/dev.mjs");
  assert.equal(packageJson.scripts["dev:web"], "npm run dev -w @film/web");
  assert.equal(packageJson.scripts["dev:worker"], "npm run dev -w @film/worker");
  assert.match(source, /\["run", "dev:worker"\]/);
  assert.match(source, /\["run", "dev:web"\]/);
  assert.match(source, /process\.on\("SIGINT"/);
  assert.match(source, /process\.on\("SIGTERM"/);
});

test("the local Worker smoke suite does not reuse occupied dev ports", async () => {
  const source = await readFile(new URL("./local-worker-smoke-suite.mjs", import.meta.url), "utf8");

  assert.match(source, /await smokePort\("FILM_LOCAL_WORKER_SMOKE_WORKER_PORT", 8787\)/);
  assert.match(source, /await smokePort\("FILM_LOCAL_WORKER_SMOKE_APP_PORT", 5173\)/);
  assert.match(source, /`ALLOWED_ORIGINS:\$\{appOrigin\}`/);
  assert.match(source, /error\?\.code !== "EADDRINUSE"/);
  assert.match(source, /return reservePort\(0\)/);
});
