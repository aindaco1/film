import { escapeHtml, formatShortDateTime } from "./presentation-format";
import { integrationRuntimeStatus, type IntegrationRuntimeState } from "./integration-state";

export function renderIntegrationRuntime(state: IntegrationRuntimeState, demo = false, key?: string): string {
  const model = integrationRuntimeStatus(state, demo);
  if (key && (demo || state.providerRuntimeCheck || !state.providerRuntimeReadiness)) return "";
  const checkedAt = state.providerRuntimeReadiness?.checkedAt;
  const timestamp = !demo && checkedAt ? `<small>${state.providerRuntimeCheck ? "Last successful check" : "Checked"}: ${escapeHtml(formatShortDateTime(checkedAt))}</small>` : "";
  if (demo) return `<p>Provider calls are off in this demo.</p>`;
  if (state.providerRuntimeCheck?.status === "error") {
    return `<p role="alert">Status check failed: ${escapeHtml(state.providerRuntimeCheck.message)}</p>${timestamp}`;
  }
  if (!state.providerRuntimeReadiness || model.checking) {
    return `<p>${model.checking ? "Checking service configuration..." : "Service status has not been checked."}</p>${timestamp}`;
  }
  if (!key) return `<strong>${escapeHtml(model.summary)}</strong>${timestamp}<small>Configuration only; account access and delivery are separate checks.</small>`;
  const provider = model.providers.find(provider => provider.key === key);
  if (!provider?.runtime) return `<p>No checked status for this provider.</p>`;
  const runtime = provider.runtime;
  return `<strong>${escapeHtml(provider.badge)}</strong>
    <span>${escapeHtml(runtime.runtimeMode.replaceAll("_", " "))}</span>
    ${runtime.liveCapabilities.length ? `<small>${escapeHtml(runtime.liveCapabilities.join(", ").replaceAll("_", " "))}</small>` : ""}
    ${runtime.blockers.map(blocker => `<small>${escapeHtml(blocker)}</small>`).join("")}
    ${runtime.requiredDecisions.map(decision => `<small>${escapeHtml(decision)}</small>`).join("")}
    <small>${escapeHtml(runtime.dataBoundary.replaceAll("_", " "))}</small>`;
}

export function updateIntegrationRuntime(scope: ParentNode, state: IntegrationRuntimeState, demo = false): void {
  const model = integrationRuntimeStatus(state, demo);
  scope.querySelectorAll<HTMLElement>("[data-integration-summary]").forEach(element => { element.textContent = model.summary; });
  for (const provider of model.providers) {
    scope.querySelectorAll<HTMLElement>(`[data-integration-status="${provider.key}"]`).forEach(element => { element.textContent = provider.badge; });
  }
  scope.querySelectorAll<HTMLButtonElement>('[data-action="provider-runtime-readiness"]').forEach(button => {
    button.disabled = demo || model.checking;
    button.setAttribute("aria-busy", String(model.checking));
  });
  // Update only status-owned nodes so an async check cannot erase unrelated form drafts or focus.
  scope.querySelectorAll<HTMLElement>("[data-integration-runtime]").forEach(element => {
    element.innerHTML = renderIntegrationRuntime(state, demo, element.dataset.integrationRuntime || undefined);
  });
}
