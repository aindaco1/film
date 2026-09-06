import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

async function workerHarness() {
  const listeners: Record<string, (event: any) => void> = {};
  const cache = { put: vi.fn(), addAll: vi.fn().mockResolvedValue(undefined) };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    match: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue(["film-shell-v1", "film-shell-v2", "other-cache"]),
    delete: vi.fn(),
  };
  const fetch = vi.fn().mockImplementation(async () => new Response("public asset"));
  runInNewContext(await readFile("public/service-worker.js", "utf8"), {
    self: { location: { origin: "https://film.example" }, addEventListener: (name: string, listener: any) => { listeners[name] = listener; }, skipWaiting: vi.fn(), clients: { claim: vi.fn() } },
    URL, Response, caches, fetch,
  });
  const request = (path: string, init?: RequestInit, navigation = false) => {
    const respondWith = vi.fn();
    const request = new Request(new URL(path, "https://film.example"), init);
    if (navigation) Object.defineProperty(request, "mode", { value: "navigate" });
    listeners.fetch({ request, respondWith });
    return respondWith;
  };
  return { cache, caches, fetch, request, listeners };
}

describe("private-by-default offline cache", () => {
  it("does not intercept API, foreign-origin, credentialed, query, or write requests", async () => {
    const worker = await workerHarness();
    for (const path of ["/api/session", "/auth/session", "https://api.film.example/workspace", "/?token=private", "/assets/app.js?token=private", "/unknown"]) {
      expect(worker.request(path)).not.toHaveBeenCalled();
    }
    expect(worker.request("/", { headers: { authorization: "Bearer example" } })).not.toHaveBeenCalled();
    expect(worker.request("/", { method: "POST" })).not.toHaveBeenCalled();
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it("caches successful public assets and preserves the network result if storage fails", async () => {
    const worker = await workerHarness();
    for (const path of ["/", "/theme.css", "/appearance.js", "/assets/app-hash.js", "/privacy.html"]) {
      const result = worker.request(path);
      expect(await (await result.mock.calls[0][0]).text()).toBe("public asset");
    }
    expect(worker.cache.put).toHaveBeenCalledTimes(5);
    worker.cache.put.mockRejectedValue(new Error("Full"));
    expect((await worker.request("/").mock.calls[0][0]).ok).toBe(true);
  });

  it("does not cache private or failed responses and does not serve HTML as a missing script", async () => {
    const worker = await workerHarness();
    for (const response of [new Response("private", { headers: { "cache-control": "private, no-store" } }), new Response("failed", { status: 503 })]) {
      worker.fetch.mockResolvedValueOnce(response);
      await worker.request("/").mock.calls[0][0];
    }
    expect(worker.cache.put).not.toHaveBeenCalled();
    worker.fetch.mockRejectedValue(new Error("Offline"));
    const response = await worker.request("/assets/missing.js").mock.calls[0][0];
    expect(response.type).toBe("error");
    expect(worker.caches.match).toHaveBeenCalledTimes(1);
  });

  it("returns the exact cached resource offline and only removes old Film shell caches", async () => {
    const worker = await workerHarness();
    worker.fetch.mockRejectedValue(new Error("Offline"));
    worker.caches.match.mockResolvedValue(new Response("cached theme"));
    expect(await (await worker.request("/theme.css").mock.calls[0][0]).text()).toBe("cached theme");
    let activation: Promise<void> | undefined;
    worker.listeners.activate({ waitUntil: (promise: Promise<void>) => { activation = promise; } });
    await activation;
    expect(worker.caches.delete.mock.calls).toEqual([["film-shell-v1"]]);
  });

  it("reuses the public shell for the exact demo navigation without caching query URLs", async () => {
    const worker = await workerHarness();
    await worker.request("/?demo=portfolio", undefined, true).mock.calls[0][0];
    expect(worker.cache.put).toHaveBeenCalledWith("https://film.example/", expect.any(Response));
    expect(worker.request("/?demo=portfolio&token=private", undefined, true)).not.toHaveBeenCalled();
    expect(worker.request("/?demo=portfolio")).not.toHaveBeenCalled();
    worker.fetch.mockRejectedValue(new Error("Offline"));
    worker.caches.match.mockResolvedValue(new Response("public shell"));
    expect(await (await worker.request("/?demo=portfolio", undefined, true).mock.calls[0][0]).text()).toBe("public shell");
    expect(worker.caches.match).toHaveBeenCalledWith("https://film.example/");
  });
});
