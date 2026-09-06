import type { FilmProject, ProductionCallSheet, ProductionDailyReport, ProductionScheduleVersion, ProductionSidesManifest, ScreenplayBreakdown } from "@film/schema";

type SourceOption = { value: string; label: string };
type CallSheetSource = { schedule: ProductionScheduleVersion; breakdown: ScreenplayBreakdown };

export interface CallSheetsViewState {
  section: "call-sheets";
  project: FilmProject;
  callSheets: ProductionCallSheet[];
  callSheet: ProductionCallSheet | null;
  source: CallSheetSource | null;
  sourceOptions: SourceOption[];
}

export interface SidesViewState {
  section: "sides";
  project: FilmProject;
  callSheets: ProductionCallSheet[];
  sides: (CallSheetSource & { callSheet: ProductionCallSheet; manifest: ProductionSidesManifest }) | null;
  latestBreakdown: ScreenplayBreakdown | null;
}

export interface ReportsViewState {
  section: "reports";
  project: FilmProject;
  reports: ProductionDailyReport[];
  report: ProductionDailyReport | null;
  source: { callSheet: ProductionCallSheet; breakdown: ScreenplayBreakdown } | null;
  sourceOptions: SourceOption[];
}

// Render-only local production data. Sessions, provider results, and persistence remain in the controller.
export type ProductionDocumentsViewState = CallSheetsViewState | SidesViewState | ReportsViewState;
export type ProductionDocumentsSection = ProductionDocumentsViewState["section"];
