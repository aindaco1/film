import type { IntegrationViewState } from "./integration-state";
import { createDeferredView } from "./deferred-view";

export function createIntegrationViewLoader(load = () => import("./integration-view")) {
  return createDeferredView<IntegrationViewState>({
    title: "Integrations",
    heading: "h3",
    reloadAction: "integration-view-reload",
    load: async () => (await load()).renderIntegrationView,
  });
}
