import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.join(root, "scripts", "live-worker-smoke.mjs");
const providers = ["pool", "store", "stripe", "social", "google", "resend", "sms"];

test("live Worker smoke skips when no origin is configured", () => {
  const result = runSmoke();

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Live Worker smoke skipped/);
});

test("live Worker smoke can require an explicit origin", () => {
  const result = runSmoke(["--require"]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Live Worker smoke skipped/);
});

test("live Worker smoke exercises magic-link auth and provider dry-runs", async () => {
  const serverState = {
    devOnlyToken: "dry_mock_token_1234567890",
    csrfToken: "csrf_mock_token_1234567890",
    sessionCookie: "film_session=sess_mock_worker_smoke",
    providerCalls: new Set(),
  };
  const server = createServer(async (request, response) => {
    try {
      await handleRequest(request, response, serverState);
    } catch (error) {
      json(response, 500, { error: error instanceof Error ? error.message : "test_server_error" });
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");

  try {
    const result = await runSmokeAsync([
      "--origin",
      `http://127.0.0.1:${address.port}`,
      "--email",
      "smoke@example.test",
    ]);

    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /Live Worker smoke passed/);
    assert.match(result.stdout, /provider dry runs/);
    assert.doesNotMatch(result.stdout, /dry_mock_token/);
    assert.doesNotMatch(result.stdout, /csrf_mock_token/);
    assert.deepEqual([...serverState.providerCalls].sort(), [...providers].sort());
  } finally {
    server.close();
    await once(server, "close");
  }
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

function runSmokeAsync(args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: root,
      env: {
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        TMPDIR: process.env.TMPDIR ?? tmpdir(),
        NO_COLOR: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

async function handleRequest(request, response, state) {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (request.method === "GET" && url.pathname === "/health") {
    json(response, 200, { ok: true, service: "film-worker", mode: "dry-run" });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/provider-status") {
    json(response, 200, {
      mode: "dry-run",
      integrations: providers.map((key) => ({ key, label: key })),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/magic-link/request") {
    const body = await readJson(request);
    assert.equal(body.email, "smoke@example.test");
    json(response, 200, {
      ok: true,
      dryRun: true,
      delivery: "not_sent",
      emailHash: "hash_smoke",
      devOnlyToken: state.devOnlyToken,
      expiresInMinutes: 15,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/magic-link/verify") {
    const body = await readJson(request);
    assert.equal(body.token, state.devOnlyToken);
    json(
      response,
      200,
      {
        ok: true,
        dryRun: true,
        session: {
          id: "sess_mock_worker_smoke",
          role: "owner",
          csrfToken: state.csrfToken,
          expiresAt: "2026-07-09T12:00:00.000Z",
        },
      },
      { "set-cookie": `${state.sessionCookie}; HttpOnly; Secure; SameSite=Lax; Path=/` },
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/session") {
    if (!hasSessionCookie(request, state)) {
      json(response, 401, { error: "missing_session" });
      return;
    }
    json(response, 200, {
      ok: true,
      dryRun: true,
      session: {
        id: "sess_mock_worker_smoke",
        role: "owner",
        expiresAt: "2026-07-09T12:00:00.000Z",
      },
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/workspaces/current/snapshot") {
    if (!hasProtectedHeaders(request, state, response)) return;
    json(response, 200, {
      ok: true,
      snapshot: {
        schemaVersion: 1,
        persistence: "dry_run_seed_snapshot",
        workspace: { id: "workspace_acme", name: "Acme Films" },
        projects: [],
        truncatedCollections: [],
      },
    });
    return;
  }

  const providerMatch = url.pathname.match(/^\/api\/providers\/([^/]+)\/dry-run$/);
  if (request.method === "POST" && providerMatch) {
    if (!hasProtectedHeaders(request, state, response)) return;
    const key = providerMatch[1];
    state.providerCalls.add(key);
    json(response, 200, {
      ok: true,
      dryRun: true,
      provider: {
        key,
        label: key,
        mode: "dry-run",
        status: key === "pool" || key === "store" || key === "social" ? "ready" : "needs_scope",
        capabilities: [],
        requiredScopes: [],
        secretsPolicy: "worker_only",
        nextStep: "test",
        complianceNotes: [],
      },
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/providers/stripe/summary-readiness") {
    if (!hasProtectedHeaders(request, state, response)) return;
    const body = await readJson(request);
    assert.equal(body.workspaceId, "workspace_acme");
    json(response, 200, {
      ok: true,
      dryRun: true,
      persistence: "dry_run_memoryless",
      readiness: {
        provider: "stripe",
        source: "pool_store_summary_adapter",
        mode: "readiness_only",
        status: "blocked_summary_adapter",
        dataBoundary: "summary_only",
        directStripeReadAllowed: false,
        liveSummaryReadAllowed: false,
        configured: {},
        requiredConfiguration: [],
        blockers: [],
        complianceNotes: [],
      },
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/providers/google/drive-sync-dry-run") {
    if (!hasProtectedHeaders(request, state, response)) return;
    const body = await readJson(request);
    assert.equal(body.workspaceId, "workspace_acme");
    json(response, 200, {
      ok: true,
      dryRun: true,
      provider: {
        key: "google",
        label: "Google Drive",
        mode: "dry-run",
        workspaceId: "workspace_acme",
        syncMode: "metadata_preflight_only",
        rootFolderId: null,
        rootFolderConfigured: false,
        oauthPolicy: "worker_encrypted_oauth_ready",
        webhookPolicy: "not_configured",
        secretsPolicy: "worker_only",
        requiredScopes: [],
        plannedActions: [],
        blockers: [],
        complianceNotes: [],
      },
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    if (!hasProtectedHeaders(request, state, response)) return;
    json(response, 200, { ok: true, dryRun: true, session: null });
    return;
  }

  json(response, 404, { error: "not_found" });
}

function hasProtectedHeaders(request, state, response) {
  if (header(request, "x-film-csrf") !== state.csrfToken) {
    json(response, 403, { error: "missing_csrf" });
    return false;
  }
  if (!hasSessionCookie(request, state)) {
    json(response, 401, { error: "missing_session" });
    return false;
  }
  return true;
}

function hasSessionCookie(request, state) {
  return header(request, "cookie").split(/;\s*/).includes(state.sessionCookie);
}

function header(request, name) {
  const value = request.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value.join("; ");
  return value ?? "";
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function json(response, status, body, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json",
    ...headers,
  });
  response.end(JSON.stringify(body));
}
