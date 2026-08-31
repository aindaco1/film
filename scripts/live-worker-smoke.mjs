#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createWorkerJsonClient,
  normalizeHttpBaseUrl,
  parseCliArgs,
  sessionCookieFrom,
} from "./worker-smoke-client.mjs";

const PROVIDER_KEYS = ["pool", "store", "stripe", "social", "google", "resend", "sms"];
const DEFAULT_EMAIL = "film-smoke@example.invalid";
const REQUEST_TIMEOUT_MS = 10_000;

const args = parseCliArgs(process.argv.slice(2), {
  booleans: ["--require", "--strict"],
  values: ["--origin", "--email"],
});
const required = Boolean(args.require || args.strict || process.env.FILM_WORKER_SMOKE_REQUIRED === "1");
const configuredOrigin = args.origin ?? process.env.FILM_WORKER_SMOKE_ORIGIN ?? process.env.VITE_WORKER_URL ?? "";

if (!configuredOrigin) {
  const message = "Live Worker smoke skipped: set FILM_WORKER_SMOKE_ORIGIN or pass --origin.";
  console.log(message);
  process.exit(required ? 1 : 0);
}

const baseUrl = normalizeHttpBaseUrl(configuredOrigin);
const requestJson = createWorkerJsonClient(baseUrl, { requestTimeoutMs: REQUEST_TIMEOUT_MS });
const email = args.email ?? process.env.FILM_WORKER_SMOKE_EMAIL ?? DEFAULT_EMAIL;

try {
  const evidence = [];

  const health = await requestJson("GET", "/health");
  assert.equal(health.body.ok, true);
  assert.equal(health.body.service, "film-worker");
  evidence.push("health");

  const providerStatus = await requestJson("GET", "/api/provider-status");
  const providerStatusKeys = new Set((providerStatus.body.integrations ?? []).map((provider) => provider.key));
  for (const key of PROVIDER_KEYS) {
    assert(providerStatusKeys.has(key), `provider status missing ${key}`);
  }
  evidence.push("provider status");

  const magic = await requestJson("POST", "/api/auth/magic-link/request", {
    body: { email },
  });
  assert.equal(magic.body.dryRun, true);
  assert.equal(magic.body.delivery, "not_sent");
  assert.match(magic.body.devOnlyToken, /^dry_/);
  assert.equal(typeof magic.body.emailHash, "string");
  evidence.push("magic link request");

  const verify = await requestJson("POST", "/api/auth/magic-link/verify", {
    body: { token: magic.body.devOnlyToken },
  });
  const sessionCookie = sessionCookieFrom(verify.response.headers.get("set-cookie"));
  assert.equal(verify.body.dryRun, true);
  assert.equal(typeof verify.body.session?.id, "string");
  assert.equal(typeof verify.body.session?.csrfToken, "string");
  assert(verify.body.session.csrfToken.length >= 12, "session csrf token should be present");
  evidence.push("magic link verify");

  const authHeaders = {
    cookie: sessionCookie,
    "x-film-csrf": verify.body.session.csrfToken,
  };

  const session = await requestJson("GET", "/api/auth/session", {
    headers: { cookie: sessionCookie },
  });
  assert.equal(session.body.dryRun, true);
  assert(Object.hasOwn(session.body, "session"), "session metadata response should include session");
  evidence.push("session metadata");

  const workspaceSnapshot = await requestJson("POST", "/api/workspaces/current/snapshot", {
    headers: authHeaders,
    body: { workspaceId: "workspace_acme" },
  });
  assert.equal(workspaceSnapshot.body.snapshot?.schemaVersion, 1);
  assert.equal(workspaceSnapshot.body.snapshot?.workspace?.id, "workspace_acme");
  assert(Array.isArray(workspaceSnapshot.body.snapshot?.projects), "workspace snapshot should include projects");
  assert(Array.isArray(workspaceSnapshot.body.snapshot?.truncatedCollections), "workspace snapshot should report truncation state");
  evidence.push("canonical workspace snapshot");

  for (const key of PROVIDER_KEYS) {
    const provider = await requestJson("POST", `/api/providers/${key}/dry-run`, {
      headers: authHeaders,
    });
    assert.equal(provider.body.dryRun, true);
    assert.equal(provider.body.provider?.key, key);
    assert.equal(provider.body.provider?.secretsPolicy, "worker_only");
  }
  evidence.push("provider dry runs");

  const stripeReadiness = await requestJson("POST", "/api/providers/stripe/summary-readiness", {
    headers: authHeaders,
    body: { workspaceId: "workspace_acme" },
  });
  assert.equal(stripeReadiness.body.dryRun, true);
  assert.equal(stripeReadiness.body.readiness?.provider, "stripe");
  assert.equal(stripeReadiness.body.readiness?.directStripeReadAllowed, false);
  assert.equal(stripeReadiness.body.readiness?.dataBoundary, "summary_only");
  evidence.push("Stripe readiness");

  const googleDrive = await requestJson("POST", "/api/providers/google/drive-sync-dry-run", {
    headers: authHeaders,
    body: {
      workspaceId: "workspace_acme",
      includeDocsExport: true,
      includeCalendarSync: true,
    },
  });
  assert.equal(googleDrive.body.dryRun, true);
  assert.equal(googleDrive.body.provider?.key, "google");
  assert.equal(googleDrive.body.provider?.secretsPolicy, "worker_only");
  assert.equal(googleDrive.body.provider?.oauthPolicy, "worker_encrypted_oauth_ready");
  evidence.push("Google Drive sync plan");

  const logout = await requestJson("POST", "/api/auth/logout", {
    headers: authHeaders,
  });
  assert.equal(logout.body.ok, true);
  evidence.push("logout");

  console.log(`Live Worker smoke passed: ${evidence.join(", ")}`);
} catch (error) {
  console.error(`Live Worker smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
