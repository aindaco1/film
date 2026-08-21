#!/usr/bin/env node
import assert from "node:assert/strict";

const PROVIDER_KEYS = ["pool", "store", "stripe", "social", "google", "resend", "sms"];
const DEFAULT_EMAIL = "film-provider-smoke@example.invalid";
const DEFAULT_WORKSPACE_ID = "workspace_acme";
const DEFAULT_PROJECT_ID = "proj_echoes";
const DEFAULT_REQUEST_TIMEOUT_MS = 90_000;

const args = parseArgs(process.argv.slice(2));
const requestTimeoutMs = timeoutMsFrom(
  args["timeout-ms"] ?? process.env.FILM_LIVE_PROVIDER_SMOKE_TIMEOUT_MS,
  DEFAULT_REQUEST_TIMEOUT_MS,
);
const required = Boolean(
  args.require
    || args.strict
    || process.env.FILM_LIVE_PROVIDER_SMOKE_REQUIRED === "1"
    || process.env.FILM_WORKER_SMOKE_REQUIRED === "1",
);
const configuredOrigin = args.origin
  ?? process.env.FILM_LIVE_PROVIDER_SMOKE_ORIGIN
  ?? process.env.FILM_WORKER_SMOKE_ORIGIN
  ?? process.env.VITE_WORKER_URL
  ?? "";

if (!configuredOrigin) {
  const message = "Live provider adapter smoke skipped: set FILM_LIVE_PROVIDER_SMOKE_ORIGIN or FILM_WORKER_SMOKE_ORIGIN.";
  console.log(message);
  process.exit(required ? 1 : 0);
}

const baseUrl = normalizeBaseUrl(configuredOrigin);
const email = args.email ?? process.env.FILM_LIVE_PROVIDER_SMOKE_EMAIL ?? DEFAULT_EMAIL;
const workspaceId = args.workspace ?? process.env.FILM_LIVE_PROVIDER_SMOKE_WORKSPACE_ID ?? DEFAULT_WORKSPACE_ID;
const projectId = args.project ?? process.env.FILM_LIVE_PROVIDER_SMOKE_PROJECT_ID ?? DEFAULT_PROJECT_ID;
const allowStripeSummary = args["allow-stripe"] || process.env.FILM_LIVE_PROVIDER_SMOKE_ALLOW_STRIPE === "1";
const sendInvite = args["send-invite"] || process.env.FILM_LIVE_PROVIDER_SMOKE_SEND_INVITE === "1";
const inviteEmail = args["invite-email"] ?? process.env.FILM_LIVE_PROVIDER_SMOKE_INVITE_EMAIL ?? "";

try {
  const evidence = [];

  const health = await requestJson("GET", "/health");
  assert.equal(health.body.ok, true);
  evidence.push("health");

  const magic = await requestJson("POST", "/api/auth/magic-link/request", {
    body: { email },
  });
  assert.match(magic.body.devOnlyToken, /^dry_/);

  const verify = await requestJson("POST", "/api/auth/magic-link/verify", {
    body: { token: magic.body.devOnlyToken },
  });
  const sessionCookie = sessionCookieFrom(verify.response.headers.get("set-cookie"));
  const csrfToken = verify.body.session?.csrfToken;
  assert.equal(typeof csrfToken, "string");

  const authHeaders = {
    cookie: sessionCookie,
    "x-film-csrf": csrfToken,
  };
  evidence.push("auth");

  const providerStatus = await requestJson("GET", "/api/provider-status");
  const statusKeys = new Set((providerStatus.body.integrations ?? []).map((provider) => provider.key));
  for (const key of PROVIDER_KEYS) {
    assert(statusKeys.has(key), `provider status missing ${key}`);
  }

  for (const key of PROVIDER_KEYS) {
    const provider = await requestJson("POST", `/api/providers/${key}/dry-run`, {
      headers: authHeaders,
    });
    assert.equal(provider.body.provider?.key, key);
    assert.equal(provider.body.provider?.secretsPolicy, "worker_only");
  }
  evidence.push("provider dry-run surfaces");

  const googleDrive = await requestJson("POST", "/api/providers/google/drive-sync-dry-run", {
    headers: authHeaders,
    body: {
      workspaceId,
      includeDocsExport: true,
      includeCalendarSync: true,
    },
  });
  assert.equal(googleDrive.body.provider?.key, "google");
  assert.equal(googleDrive.body.provider?.secretsPolicy, "worker_only");
  assert(googleDrive.body.provider?.plannedActions?.every((action) => action.liveReadAllowed === false));
  evidence.push("Google dry-run plan");

  const stripeReadiness = await requestJson("POST", "/api/providers/stripe/summary-readiness", {
    headers: authHeaders,
    body: { workspaceId },
  });
  const stripe = stripeReadiness.body.readiness;
  assert.equal(stripe?.provider, "stripe");
  assert.equal(stripe?.directStripeReadAllowed, false);
  assert.equal(stripe?.dataBoundary, "summary_only");
  if (stripe.liveSummaryReadAllowed) {
    if (!allowStripeSummary) {
      evidence.push("Stripe live summary ready; fetch skipped until FILM_LIVE_PROVIDER_SMOKE_ALLOW_STRIPE=1");
    } else {
      const summary = await requestJson("POST", "/api/providers/stripe/summary", {
        headers: authHeaders,
        body: { workspaceId, projectId },
      });
      assert.equal(summary.body.summary?.source, "pool_store_summary_adapter");
      assert.equal(summary.body.summary?.mode, "live_summary_adapter");
      assert.equal(summary.body.summary?.dataBoundary, "summary_only");
      assert.equal(summary.body.summary?.directStripeReadAllowed, false);
      assert.equal(summary.body.summary?.liveSummaryReadAllowed, true);
      const adapters = summary.body.summary?.adapters ?? [];
      assert(adapters.some((adapter) => adapter.source === "pool"), "Stripe summary should include Pool adapter status");
      assert(adapters.some((adapter) => adapter.source === "store"), "Stripe summary should include Store adapter status");
      evidence.push("Stripe Pool/Store summary adapters");
    }
  } else {
    if (allowStripeSummary) {
      throw new Error("Stripe live summary fetch was requested, but Worker readiness does not allow live summary reads.");
    }
    evidence.push(`Stripe live summary blocked (${stripe.status})`);
  }

  const inviteReadiness = await requestJson("POST", "/api/invites/delivery-readiness", {
    headers: authHeaders,
    body: { workspaceId },
  });
  const resend = inviteReadiness.body.readiness;
  assert.equal(resend?.provider, "resend");
  if (resend.liveDeliveryAllowed) {
    if (!sendInvite) {
      evidence.push("Resend live delivery ready; send skipped until FILM_LIVE_PROVIDER_SMOKE_SEND_INVITE=1");
    } else {
      if (!inviteEmail) throw new Error("Set FILM_LIVE_PROVIDER_SMOKE_INVITE_EMAIL before sending a live invite.");
      const invite = await requestJson("POST", "/api/invites/create-dry-run", {
        headers: authHeaders,
        body: {
          workspaceId,
          email: inviteEmail,
          role: "reviewer",
        },
      });
      assert.equal(invite.body.deliveryAttempt?.deliveryMode, "live_resend");
      assert.equal(invite.body.invite?.devOnlyInviteToken, null);
      assert.equal(invite.body.delivery, "sent_live");
      evidence.push("Resend live invite delivery");
    }
  } else {
    if (sendInvite) {
      throw new Error("Resend live send was requested, but Worker readiness does not allow live delivery.");
    }
    evidence.push(`Resend live delivery blocked (${resend.status})`);
  }

  evidence.push("Social/SMS dry-run only");

  const logout = await requestJson("POST", "/api/auth/logout", {
    headers: authHeaders,
  });
  assert.equal(logout.body.ok, true);
  evidence.push("logout");

  console.log(`Live provider adapter smoke passed: ${evidence.join(", ")}`);
} catch (error) {
  console.error(`Live provider adapter smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

async function requestJson(method, path, options = {}) {
  let response;
  try {
    response = await fetchWithTimeout(`${baseUrl}${path}`, {
      method,
      headers: {
        accept: "application/json",
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    throw new Error(`${method} ${path} request failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const text = await response.text();
  const body = parseJson(text);
  if (!response.ok) {
    const error = body && typeof body.error === "string" ? body.error : response.statusText;
    throw new Error(`${method} ${path} returned ${response.status}: ${error}`);
  }
  return { response, body };
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Worker returned a non-JSON response");
  }
}

function sessionCookieFrom(setCookie) {
  const cookie = setCookie?.split(";")[0]?.trim() ?? "";
  if (!cookie.startsWith("film_session=")) {
    throw new Error("Magic-link verification did not return a film_session cookie");
  }
  return cookie;
}

function normalizeBaseUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Provider smoke origin must be an http(s) URL");
  }
  const pathname = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${pathname}`;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--require" || arg === "--strict" || arg === "--allow-stripe" || arg === "--send-invite") {
      parsed[arg.slice(2)] = true;
      continue;
    }
    if (arg === "--origin" || arg === "--email" || arg === "--workspace" || arg === "--project" || arg === "--invite-email" || arg === "--timeout-ms") {
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

function timeoutMsFrom(value, fallback) {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const timeoutMs = Number(raw);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 300_000) {
    throw new Error("Provider smoke timeout must be an integer between 1000 and 300000 milliseconds.");
  }
  return timeoutMs;
}
