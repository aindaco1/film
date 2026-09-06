import { describe, expect, it } from "vitest";
import { emptyIntegrationResults, INTEGRATION_DEFINITIONS, integrationRuntimeStatus, type IntegrationRuntimeState } from "../src/integration-state";
import { renderIntegrationRuntime } from "../src/integration-runtime-view";

function checked(): IntegrationRuntimeState {
  return {
    ...emptyIntegrationResults(),
    providerRuntimeReadiness: {
      policy: "explicit_provider_live_gates", secretValuesExposed: false,
      liveCount: 999, partialLiveCount: 999, blockedCount: 999,
      checkedAt: "2026-09-06T12:00:00Z", persistence: "d1_audit_events", auditPersistence: null,
      providers: INTEGRATION_DEFINITIONS.map(({ key, label }, index) => ({
        key, label, status: index < 3 ? "live" : index === 3 ? "partial_live" : "blocked",
        runtimeMode: index < 4 ? "live_oauth" : "dry_run_only", liveCapabilities: [],
        blockers: index >= 3 ? ["Explicit live gate is closed"] : [], requiredDecisions: [], dataBoundary: "metadata_only",
      })),
    },
  };
}

describe("integration runtime status", () => {
  it("does not infer configuration or connections from saved workspace labels", () => {
    const state = { ...emptyIntegrationResults(), workspace: { integrations: [{ key: "social", mode: "connected" }] } };
    const model = integrationRuntimeStatus(state);
    expect(model.summary).toBe("Not checked");
    expect(model.providers.every(provider => provider.badge === "Not checked")).toBe(true);
  });

  it("derives one summary from known provider entries rather than trusting aggregate counts", () => {
    const model = integrationRuntimeStatus(checked());
    expect(model.summary).toBe("3 enabled, 1 partial, 3 blocked");
    expect(model.providers.map(provider => provider.badge)).toEqual([
      "Live enabled", "Live enabled", "Live enabled", "Partly enabled", "Live blocked", "Live blocked", "Live blocked",
    ]);
    expect(renderIntegrationRuntime(checked())).toContain("account access and delivery are separate checks");
    expect(renderIntegrationRuntime(checked())).not.toContain("connected");
  });

  it("does not invent status for missing or ambiguous provider entries", () => {
    const state = checked();
    state.providerRuntimeReadiness!.providers.pop();
    state.providerRuntimeReadiness!.providers.push(state.providerRuntimeReadiness!.providers[0]);
    const model = integrationRuntimeStatus(state);
    expect(model.summary).toBe("2 enabled, 1 partial, 2 blocked, 2 unchecked");
    expect(model.providers.find(provider => provider.key === "pool")?.badge).toBe("Not checked");
    expect(model.providers.find(provider => provider.key === "sms")?.badge).toBe("Not checked");
  });

  it.each(["checking", "error"] as const)("does not represent an old success as current while %s", status => {
    const state = checked();
    state.providerRuntimeCheck = status === "checking" ? { status } : { status, message: "Worker offline" };
    const expected = status === "checking" ? "Checking..." : "Check failed";
    expect(integrationRuntimeStatus(state).summary).toBe(expected);
    expect(integrationRuntimeStatus(state).providers.every(provider => provider.badge === expected)).toBe(true);
    expect(renderIntegrationRuntime(state)).toContain("Last successful check");
    expect(renderIntegrationRuntime(state, false, "social")).toBe("");
  });

  it("keeps demo mode explicitly offline even with stale checked state", () => {
    const state = checked();
    expect(integrationRuntimeStatus(state, true).summary).toBe("Offline demo");
    expect(integrationRuntimeStatus(state, true).providers.every(provider => provider.badge === "Offline demo")).toBe(true);
    expect(renderIntegrationRuntime(state, true)).not.toContain("Checked");
  });

  it("escapes failure and runtime details without duplicating the provider catalog", () => {
    const state = checked();
    const selected = state.providerRuntimeReadiness!.providers.find(provider => provider.key === "social")!;
    selected.blockers = ['<img src=x onerror="bad">'];
    selected.requiredDecisions = ["Confirm ownership & review"];
    expect(renderIntegrationRuntime(state, false, "social")).toContain("&lt;img");
    expect(renderIntegrationRuntime(state, false, "social")).toContain("Confirm ownership &amp; review");
    expect(renderIntegrationRuntime(state, false, "google")).not.toContain("Confirm ownership");
    expect(renderIntegrationRuntime(state)).not.toContain("provider-runtime-list");
    state.providerRuntimeCheck = { status: "error", message: "<script>secret</script>" };
    expect(renderIntegrationRuntime(state)).not.toContain("<script>");
    expect(renderIntegrationRuntime(state)).toContain("&lt;script&gt;");
  });
});
