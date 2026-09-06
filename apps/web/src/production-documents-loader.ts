import { createDeferredViewGroup } from "./deferred-view";
import type { ProductionDocumentsSection, ProductionDocumentsViewState } from "./production-documents-state";

export const PRODUCTION_DOCUMENT_VIEWS = { "call-sheets": "Call Sheets", sides: "Sides", reports: "Production Reports" } as const;

export function isProductionDocumentsSection(value: string): value is ProductionDocumentsSection {
  return Object.hasOwn(PRODUCTION_DOCUMENT_VIEWS, value);
}

export function createProductionDocumentsLoader(load = () => import("./production-documents-view")) {
  return createDeferredViewGroup<ProductionDocumentsViewState>({
    titles: PRODUCTION_DOCUMENT_VIEWS, reloadAction: "production-documents-reload",
    load: async () => (await load()).renderProductionDocuments,
  });
}
