import assert from "node:assert/strict";
import test from "node:test";
import {
  checkedOpaqueId,
  createLocalWorkerProofClient,
  normalizeHttpOrigin,
  sessionCookieFrom,
} from "./local-worker-proof-client.mjs";

test("local Worker proof client normalizes origins and authenticated JSON requests", async () => {
  let captured;
  const client = createLocalWorkerProofClient({
    origin: "http://127.0.0.1:8787/path",
    fetcher: async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "set-cookie": "film_session=test; Path=/" },
      });
    },
  });
  const result = await client.requestJson("POST", "/api/test", { value: 1 }, true, { cookie: "film_session=test" });

  assert.equal(client.origin, "http://127.0.0.1:8787");
  assert.equal(captured.url, "http://127.0.0.1:8787/api/test");
  assert.equal(captured.init.headers.cookie, "film_session=test");
  assert.deepEqual(JSON.parse(captured.init.body), { value: 1 });
  assert.deepEqual(result.body, { ok: true });
});

test("local Worker proof client shares D1 invocation and identity guards", () => {
  let invocation;
  const client = createLocalWorkerProofClient({
    spawnSyncImpl(command, args, options) {
      invocation = { command, args, options };
      return { status: 0, stdout: '[{"results":[{"count":1}]}]', stderr: "" };
    },
  });
  const result = client.executeLocalD1("SELECT 1;", true);

  assert.equal(invocation.command, "npx");
  assert.deepEqual(invocation.args.slice(0, 6), ["wrangler", "d1", "execute", "DB", "--local", "--yes"]);
  assert.equal(invocation.args.at(-1), "SELECT 1;");
  assert.equal(result[0].results[0].count, 1);
  assert.equal(sessionCookieFrom("film_session=abc; Path=/"), "film_session=abc");
  assert.equal(checkedOpaqueId("restore_approval_123", /^restore_approval_/), "restore_approval_123");
  assert.equal(normalizeHttpOrigin("https://film.example/path"), "https://film.example");
  assert.throws(() => normalizeHttpOrigin("file:///tmp/film"), /HTTP\(S\)/);
  assert.throws(() => checkedOpaqueId("../bad", /^restore_/), /invalid opaque ID/);
});

test("local Worker proof client provisions and disposes a scoped owner session", async () => {
  const commands = [];
  const requests = [];
  const client = createLocalWorkerProofClient({
    spawnSyncImpl(_command, args) {
      commands.push(args.at(-1));
      return { status: 0, stdout: "", stderr: "" };
    },
    fetcher: async (url, init) => {
      requests.push({ url, init });
      if (url.endsWith("/api/auth/magic-link/request")) {
        return new Response(JSON.stringify({ devOnlyToken: "dry_local_owner_token_123456789" }));
      }
      if (url.endsWith("/api/auth/magic-link/verify")) {
        return new Response(JSON.stringify({ session: { csrfToken: "csrf_local_owner_token" } }), {
          headers: { "set-cookie": "film_session=local-owner; Path=/" },
        });
      }
      return new Response(JSON.stringify({ ok: true }));
    },
  });

  const session = await client.createOwnerSession("test_probe");
  assert.equal(session.memberId, "member_local_test_probe_owner");
  assert.equal(session.email, "film-test_probe@example.invalid");
  assert.equal(session.headers.cookie, "film_session=local-owner");
  assert.match(commands.join("\n"), /workspace_members/);
  assert.match(commands.join("\n"), /'owner'/);

  await client.disposeOwnerSession(session);
  assert(requests.at(-1).url.endsWith("/api/auth/logout"));
  assert.match(commands.at(-1), /DELETE FROM sessions/);
});

test("local Worker proof client can provision a browser-owned member without creating a session", () => {
  const commands = [];
  const client = createLocalWorkerProofClient({
    spawnSyncImpl(_command, args) {
      commands.push(args.at(-1));
      return { status: 0, stdout: "", stderr: "" };
    },
  });

  const member = client.provisionOwnerMember("browser_probe");
  assert.equal(member.email, "film-browser_probe@example.invalid");
  assert.equal(member.workspaceId, "workspace_acme");
  assert.match(commands.join("\n"), /workspace_members/);

  client.disposeOwnerMember(member);
  assert.match(commands.at(-1), /member_local_browser_probe_owner/);
  assert.throws(() => client.provisionOwnerMember("Browser Probe"), /lowercase letters/);
  assert.throws(() => client.provisionOwnerMember("browser_probe", "bad workspace"), /opaque identifier/);
});
