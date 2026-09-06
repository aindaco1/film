import type { FilmProject, ProductionCallSheet, ProductionLocation, ProductionLocationManifest, ProductionShot, ProductionShotManifest, ProductionTalent, ProductionTalentManifest, ScreenplayBreakdown } from "@film/schema";

interface ResourceViewState {
  project: FilmProject;
  breakdown: ScreenplayBreakdown | null;
}

export interface ShotsViewState extends ResourceViewState {
  section: "shots";
  rows: Array<{ shot: ProductionShot; manifest: ProductionShotManifest }>;
  selectedId: string | null;
  sceneFilter: string | null;
}

export interface LocationsViewState extends ResourceViewState {
  section: "locations";
  records: ProductionLocation[];
  location: ProductionLocation | null;
  manifest: ProductionLocationManifest | null;
  callSheet: ProductionCallSheet | null;
  locationRows: Array<{ title: string; projectLabel: string; fieldSummary: string; sourceLabel: string }>;
}

export interface TalentViewState extends ResourceViewState {
  section: "talent";
  records: ProductionTalent[];
  talent: ProductionTalent | null;
  manifest: ProductionTalentManifest | null;
  callSheet: ProductionCallSheet | null;
}

// Rendering receives only project-local production data, never sessions or provider credentials.
export type ProductionResourcesViewState = ShotsViewState | LocationsViewState | TalentViewState;
export type ProductionResourcesSection = ProductionResourcesViewState["section"];
