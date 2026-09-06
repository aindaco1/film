import { afterEach, describe, expect, it, vi } from "vitest";
import { registerOfflineShell } from "../src/offline-shell";

afterEach(() => vi.unstubAllGlobals());

describe("offline shell registration", () => {
  it.each(["loading", "interactive", "complete"])("registers once from %s document state", async (readyState) => {
    const register = vi.fn().mockResolvedValue({});
    const addEventListener = vi.fn();
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    vi.stubGlobal("document", { readyState });
    vi.stubGlobal("window", { addEventListener });
    registerOfflineShell(vi.fn());
    if (readyState !== "complete") {
      expect(register).not.toHaveBeenCalled();
      expect(addEventListener).toHaveBeenCalledWith("load", expect.any(Function), { once: true });
      addEventListener.mock.calls[0][1]();
    }
    expect(register).toHaveBeenCalledExactlyOnceWith("/service-worker.js");
  });

  it("handles unsupported browsers and rejected registration without an uncaught promise", async () => {
    vi.stubGlobal("navigator", {});
    const onError = vi.fn();
    registerOfflineShell(onError);
    expect(onError).not.toHaveBeenCalled();
    vi.stubGlobal("document", { readyState: "complete" });
    vi.stubGlobal("navigator", { serviceWorker: { register: vi.fn().mockRejectedValue(new Error("Blocked")) } });
    registerOfflineShell(onError);
    await Promise.resolve();
    expect(onError).toHaveBeenCalledOnce();
  });
});
