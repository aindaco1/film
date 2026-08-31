import { describe, expect, it, vi } from "vitest";
import { parseWorkerJsonResponse, postWorkerJson, postWorkerJsonResponse } from "../src/worker-client";

describe("Worker JSON client", () => {
  it("posts JSON with credentials and CSRF through one shared contract", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));

    await expect(postWorkerJson(
      "https://worker.example",
      "/api/example",
      { workspaceId: "workspace_dust_wave" },
      "csrf-token",
      "Example request failed",
      fetcher as typeof fetch,
    )).resolves.toEqual({ ok: true });

    expect(fetcher).toHaveBeenCalledWith("https://worker.example/api/example", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": "csrf-token",
      },
      body: JSON.stringify({ workspaceId: "workspace_dust_wave" }),
    });
  });

  it("supports public JSON posts without inventing a CSRF header", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ accepted: true }), { status: 202 }));
    const result = await postWorkerJsonResponse<{ accepted: boolean }>(
      "https://worker.example",
      "/api/public",
      { token: "opaque" },
      null,
      fetcher as typeof fetch,
    );

    expect(result.body.accepted).toBe(true);
    expect(fetcher.mock.calls[0]?.[1]?.headers).toEqual({ "content-type": "application/json" });
  });

  it("preserves Worker errors and deterministic fallback messages", async () => {
    await expect(parseWorkerJsonResponse(
      new Response(JSON.stringify({ error: "workspace_forbidden" }), { status: 403 }),
      "Request failed",
    )).rejects.toThrow("workspace_forbidden");
    await expect(parseWorkerJsonResponse(
      new Response(JSON.stringify({}), { status: 503 }),
      "Request failed",
    )).rejects.toThrow("Request failed");
  });
});
