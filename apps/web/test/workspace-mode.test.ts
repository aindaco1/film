import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("demo workspace boundary", () => {
  it("requires the explicit portfolio mode and namespaces workspace persistence", async () => {
    vi.stubGlobal("location", { search: "?demo=portfolio" });
    const mode = await import("../src/workspace-mode");
    expect(mode.DEMO_MODE).toBe(true);
    expect(mode.isDemoLocation("?demo=false")).toBe(false);
    expect(mode.isDemoLocation("?film_auth_token=sample")).toBe(false);
    expect(mode.workspaceStorageKey("film.ui.v1")).toBe("film.ui.v1.demo-portfolio");
  });

  it("blocks provider requests before fetch, including inherited auth cookies", async () => {
    vi.stubGlobal("location", { search: "?demo=portfolio" });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { requestMagicLink } = await import("../src/auth-client");
    const { postWorkerJsonRequest } = await import("../src/worker-client");
    await expect(requestMagicLink("https://film.example", "fiction@example.com")).rejects.toThrow("local only");
    await expect(postWorkerJsonRequest("https://film.example", "/api/operations/dry-run-sync", {}, null)).rejects.toThrow("local only");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("preserves normal workspace keys and the native fetch contract outside demo", async () => {
    vi.stubGlobal("location", { search: "" });
    const response = new Response("ok");
    const fetcher = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetcher);
    const mode = await import("../src/workspace-mode");
    expect(mode.workspaceStorageKey("film.ui.v1")).toBe("film.ui.v1");
    expect(await mode.workerFetch("/api/test", { method: "POST" })).toBe(response);
    expect(fetcher).toHaveBeenCalledWith("/api/test", { method: "POST" });
  });

  it("keeps the network guard in one owner without unguarded browser-client defaults", () => {
    const directory = new URL("../src/", import.meta.url);
    for (const name of readdirSync(directory).filter((name) => name.endsWith(".ts") && name !== "workspace-mode.ts")) {
      const source = readFileSync(new URL(name, directory), "utf8");
      expect(source, name).not.toMatch(/= fetch[,)]|await fetch\(/);
    }
  });
});
