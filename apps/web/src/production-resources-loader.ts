import { createDeferredViewGroup } from "./deferred-view";
import type { ProductionResourcesSection, ProductionResourcesViewState } from "./production-resources-state";

export const PRODUCTION_RESOURCE_VIEWS = { shots: "Shots", locations: "Locations", talent: "Talent" } as const;

export function isProductionResourcesSection(value: string): value is ProductionResourcesSection {
  return Object.hasOwn(PRODUCTION_RESOURCE_VIEWS, value);
}

export function createProductionResourcesLoader(load = () => import("./production-resources-view")) {
  return createDeferredViewGroup<ProductionResourcesViewState>({
    titles: PRODUCTION_RESOURCE_VIEWS, reloadAction: "production-resources-reload",
    load: async () => (await load()).renderProductionResources,
  });
}
