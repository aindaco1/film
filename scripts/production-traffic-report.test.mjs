import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts", "production-traffic-report.mjs");

test("production traffic report aggregates metrics without printing credentials or identity hashes", async (context) => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "film-production-traffic-"));
  context.after(() => rmSync(tempDir, { recursive: true, force: true }));
  const accountValue = "account_test_value";
  const analyticsValue = "analytics_private_value";
  const kvValue = "kv_private_value";
  const identityValue = "identity_private_hash";
  const namespaceValue = "a".repeat(32);
  const varsPath = path.join(tempDir, ".dev.vars");
  const configPath = path.join(tempDir, "wrangler.toml");
  writeFileSync(varsPath, `CLOUDFLARE_ACCOUNT_ID=${accountValue}\nCLOUDFLARE_USAGE_API_TOKEN=${analyticsValue}\nCLOUDFLARE_API_TOKEN=${kvValue}\n`);
  writeFileSync(configPath, `[[kv_namespaces]]\nbinding = "SESSIONS"\nid = "${namespaceValue}"\n`);

  let apiOrigin = "";
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", apiOrigin);
    const json = (value) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(value));
    };
    if (request.method === "POST" && url.pathname === "/client/v4/graphql") {
      json({ data: { viewer: { accounts: [{ workersInvocationsAdaptive: [
        { sum: { requests: 7, errors: 0, subrequests: 2 }, quantiles: { cpuTimeP99: 12 }, dimensions: { status: "success" } },
        { sum: { requests: 1, errors: 1, subrequests: 0 }, quantiles: { cpuTimeP99: 20 }, dimensions: { status: "exception" } },
      ] }] } }, errors: null });
      return;
    }
    if (request.method === "GET" && url.pathname.endsWith("/keys")) {
      json({ success: true, result: [{ name: `rl:auth_magic_link_request:${identityValue}` }], result_info: { cursor: "" } });
      return;
    }
    if (request.method === "GET" && url.pathname.includes("/values/")) {
      json({ count: 2, resetAt: Date.now() + 60_000 });
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const address = server.address();
  assert(address && typeof address === "object");
  apiOrigin = `http://127.0.0.1:${address.port}`;

  const result = await runScript([
    "--json",
    "--source-dev-vars", varsPath,
    "--config", configPath,
    "--api-origin", `${apiOrigin}/client/v4`,
  ]);
  assert.equal(result.code, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.worker.requests, 8);
  assert.equal(report.worker.runtimeErrors, 1);
  assert.equal(report.worker.subrequests, 2);
  assert.deepEqual(report.worker.statuses, { success: 7, exception: 1 });
  assert.equal(report.rateLimits.buckets.auth_magic_link_request.maxRequestsInWindow, 2);
  for (const sensitiveValue of [accountValue, analyticsValue, kvValue, identityValue, namespaceValue]) {
    assert.equal(`${result.stdout}\n${result.stderr}`.includes(sensitiveValue), false);
  }
});

function runScript(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: root,
      env: {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: "",
        CLOUDFLARE_USAGE_API_TOKEN: "",
        CLOUDFLARE_API_TOKEN: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

