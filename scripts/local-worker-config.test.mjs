import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LOCAL_PROVIDER_MODES, localWorkerArgs } from "./local-worker-config.mjs";

test("local Worker commands explicitly override every configured provider mode without live delivery", () => {
  const config = readFileSync(new URL("../apps/worker/wrangler.toml", import.meta.url), "utf8");
  const configuredModes = [...config.matchAll(/^([A-Z_]+_MODE)\s*=/gm)].map((match) => match[1]);
  const args = localWorkerArgs();
  assert(args.includes("--local"));
  assert(!args.includes("--remote"));
  for (const mode of configuredModes) {
    assert(Object.hasOwn(LOCAL_PROVIDER_MODES, mode), `Missing explicit local override for ${mode}`);
    assert(args.includes(`${mode}:${LOCAL_PROVIDER_MODES[mode]}`));
    assert.notEqual(LOCAL_PROVIDER_MODES[mode], "live");
  }
});

test("dev and real-Worker smoke reuse one mode policy while allowing disposable ports and rate limits", () => {
  for (const script of ["dev-worker.mjs", "local-worker-smoke-suite.mjs"]) {
    assert(readFileSync(new URL(script, import.meta.url), "utf8").includes('from "./local-worker-config.mjs"'));
  }
  const args = localWorkerArgs({ port: 9876, allowedOrigin: "http://127.0.0.1:9877", rateLimitOverrides: { auth_magic_link_request: { limit: 100, windowSeconds: 10 } } });
  assert.equal(args[args.indexOf("--port") + 1], "9876");
  assert(args.includes("ALLOWED_ORIGINS:http://127.0.0.1:9877"));
  assert(args.includes('RATE_LIMIT_OVERRIDES:{"auth_magic_link_request":{"limit":100,"windowSeconds":10}}'));
  assert(args.includes("SMS_MODE:disabled"));
});
