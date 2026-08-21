import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts", "check-companion-workers.mjs");

test("companion checker accepts tracked adapter support without printing dev secret values", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "film-companion-check-"));
  const pool = path.join(dir, "pool");
  const store = path.join(dir, "store");
  createCompanion(pool, "pool", "pledge.dustwave.test/*", { devSecret: "pool_secret_should_not_print" });
  createCompanion(store, "store", "checkout.dustwave.test/*", { devSecret: "store_secret_should_not_print" });

  try {
    const result = runCheck(pool, store, ["--strict"]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /No companion Worker readiness blockers found\./);
    assert.doesNotMatch(result.stdout, /pool_secret_should_not_print/);
    assert.doesNotMatch(result.stdout, /store_secret_should_not_print/);
    assert.match(result.stdout, /local worker\/\.dev\.vars declares FILM_STRIPE_SUMMARY_ADAPTER_SECRET by name/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("companion checker strict mode fails when tracked adapter endpoint support is missing", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "film-companion-check-"));
  const pool = path.join(dir, "pool");
  const store = path.join(dir, "store");
  createCompanion(pool, "pool", "pledge.dustwave.test/*", { omitEndpoint: true });
  createCompanion(store, "store", "checkout.dustwave.test/*");

  try {
    const result = runCheck(pool, store, ["--strict"]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Pool Worker source does not appear to route \/film\/stripe-summary/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("companion checker warns when local dev vars omit the adapter secret name", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "film-companion-check-"));
  const pool = path.join(dir, "pool");
  const store = path.join(dir, "store");
  createCompanion(pool, "pool", "pledge.dustwave.test/*", { devSecret: "" });
  createCompanion(store, "store", "checkout.dustwave.test/*", { devSecret: "" });

  try {
    const result = runCheck(pool, store);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /local worker\/\.dev\.vars does not declare FILM_STRIPE_SUMMARY_ADAPTER_SECRET by name/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function runCheck(pool, store, extraArgs = []) {
  return spawnSync(process.execPath, [
    scriptPath,
    "--pool",
    pool,
    "--store",
    store,
    ...extraArgs,
  ], {
    cwd: root,
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      TMPDIR: process.env.TMPDIR ?? tmpdir(),
    },
    encoding: "utf8",
  });
}

function createCompanion(rootDir, source, routePattern, options = {}) {
  const workerDir = path.join(rootDir, "worker");
  const srcDir = path.join(workerDir, "src");
  const scriptsDir = path.join(rootDir, "scripts");
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(scriptsDir, { recursive: true });

  writeFileSync(path.join(workerDir, "wrangler.toml"), `
name = "${source}-worker"
main = "src/index.js"
workers_dev = false
routes = [
  { pattern = "${routePattern}", zone_name = "dustwave.test" }
]

# - FILM_STRIPE_SUMMARY_ADAPTER_SECRET (shared bearer secret for Film summary-only aggregate reads)
`);

  const endpoint = options.omitEndpoint ? "/api/health" : "/film/stripe-summary";
  writeFileSync(path.join(srcDir, "index.js"), `
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "${endpoint}" && request.method === "POST") {
      const secret = env.FILM_STRIPE_SUMMARY_ADAPTER_SECRET || env.STRIPE_SUMMARY_ADAPTER_SECRET;
      const body = { source: "${source}", dataBoundary: "summary_only" };
      if (body.source !== "${source}" || !secret) return new Response("blocked", { status: 403 });
      return Response.json({ status: "ready" });
    }
    return new Response("ok");
  }
};
`);

  writeFileSync(path.join(workerDir, "README.md"), `
### POST /film/stripe-summary
Requires Authorization: Bearer <FILM_STRIPE_SUMMARY_ADAPTER_SECRET>.
`);
  writeFileSync(path.join(scriptsDir, "setup-deploy.mjs"), `
const required = ["FILM_STRIPE_SUMMARY_ADAPTER_SECRET"];
console.log(required.length);
`);
  writeFileSync(path.join(scriptsDir, "configure-dev-secrets.sh"), `
prompt_optional_secret "FILM_STRIPE_SUMMARY_ADAPTER_SECRET" "Film Stripe summary adapter bearer secret"
`);

  if (options.devSecret !== undefined) {
    const contents = options.devSecret
      ? `FILM_STRIPE_SUMMARY_ADAPTER_SECRET=${options.devSecret}\n`
      : "STRIPE_SECRET_KEY=sk_test_placeholder\n";
    writeFileSync(path.join(workerDir, ".dev.vars"), contents);
  }
}
