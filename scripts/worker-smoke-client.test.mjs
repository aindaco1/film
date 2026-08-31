import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorkerJsonClient,
  normalizeHttpBaseUrl,
  parseCliArgs,
  sessionCookieFrom,
  timeoutMsFrom,
} from "./worker-smoke-client.mjs";

test("shared Worker smoke client normalizes configuration", () => {
  assert.equal(normalizeHttpBaseUrl("https://film.example/api/"), "https://film.example/api");
  assert.equal(sessionCookieFrom("film_session=session-id; Path=/; HttpOnly"), "film_session=session-id");
  assert.deepEqual(parseCliArgs(["--require", "--origin", "https://film.example"], {
    booleans: ["--require"],
    values: ["--origin"],
  }), { require: true, origin: "https://film.example" });
  assert.equal(timeoutMsFrom("2500", 1000), 2500);
  assert.throws(() => timeoutMsFrom("12", 1000), /between 1000 and 300000/);
});

test("shared Worker smoke client sends JSON and surfaces Worker errors", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  try {
    const requestJson = createWorkerJsonClient("https://film.example");
    const result = await requestJson("POST", "/api/example", {
      headers: { "x-film-csrf": "csrf" },
      body: { workspaceId: "workspace_acme" },
    });
    assert.deepEqual(result.body, { ok: true });
    assert.equal(calls[0].url, "https://film.example/api/example");
    assert.equal(calls[0].init.credentials, undefined);
    assert.equal(calls[0].init.body, JSON.stringify({ workspaceId: "workspace_acme" }));
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = async () => new Response(JSON.stringify({ error: "blocked" }), { status: 403 });
  try {
    await assert.rejects(
      createWorkerJsonClient("https://film.example")("GET", "/api/blocked"),
      /GET \/api\/blocked returned 403: blocked/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
