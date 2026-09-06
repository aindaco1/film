import { describe, expect, it } from "vitest";
import { buildProductionLocationManifest, buildProductionShotManifest, buildProductionTalentManifest, seedWorkspace } from "@film/schema";
import { createDemoPortfolio } from "../src/demo-portfolio";
import { isProductionResourcesSection, PRODUCTION_RESOURCE_VIEWS } from "../src/production-resources-loader";
import { renderProductionResources } from "../src/production-resources-view";
import type { ProductionResourcesSection, ProductionResourcesViewState } from "../src/production-resources-state";

function resourceState(section: ProductionResourcesSection): ProductionResourcesViewState {
  const workspace = createDemoPortfolio(new Date("2026-09-06T12:00:00Z"));
  const source = { shots: workspace.productionShots, locations: workspace.productionLocations, talent: workspace.productionTalent }[section][0]!;
  const project = workspace.projects.find(project => project.id === source.projectId)!;
  const breakdown = workspace.screenplayBreakdowns.find(item => item.id === source.screenplayBreakdownId) ?? null;
  const schedules = workspace.productionSchedules.filter(item => item.projectId === project.id);
  const callSheets = workspace.productionCallSheets.filter(item => item.projectId === project.id);
  const callSheet = callSheets[0] ?? null;
  if (section === "shots") {
    const rows = workspace.productionShots.filter(item => item.projectId === project.id)
      .map(shot => ({ shot, manifest: buildProductionShotManifest(shot, breakdown, schedules, callSheets) }));
    return { section, project, breakdown, rows, selectedId: rows[0]!.shot.id, sceneFilter: null };
  }
  if (section === "locations") {
    const records = workspace.productionLocations.filter(item => item.projectId === project.id);
    const location = records[0]!;
    return { section, project, breakdown, callSheet, records, location, locationRows: [],
      manifest: buildProductionLocationManifest(location, breakdown, schedules, workspace.productionAvailability) };
  }
  const records = workspace.productionTalent.filter(item => item.projectId === project.id);
  const talent = records[0]!;
  return { section, project, breakdown, callSheet, records, talent,
    manifest: buildProductionTalentManifest(talent, breakdown, schedules, workspace.productionAvailability) };
}

const sections: ProductionResourcesSection[] = ["shots", "locations", "talent"];

describe("deferred production resources", () => {
  it("recognizes only the three resource screens", () => {
    for (const section of sections) expect(isProductionResourcesSection(section)).toBe(true);
    for (const section of ["constructor", "toString", "reports", ""]) expect(isProductionResourcesSection(section)).toBe(false);
  });

  it.each(sections)("renders %s with no mutation of local production data", section => {
    const state = resourceState(section);
    const before = JSON.stringify(state);
    const html = renderProductionResources(state);
    expect(html).toContain(`<h1>${PRODUCTION_RESOURCE_VIEWS[section]}</h1>`);
    expect(html).toContain(state.project.title);
    expect(html).not.toContain("undefined");
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each(sections)("escapes project and document content in %s", section => {
    const state = resourceState(section);
    state.project.title = '<script>alert("project")</script>';
    state.project.docs[0]!.name = "<script>document</script>";
    state.project.docs[0]!.id = '\" onclick="alert(1)';
    const html = renderProductionResources(state);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('value="" onclick=');
    expect(html).toContain("&lt;script&gt;document&lt;/script&gt;");
  });

  it("preserves empty-source and export gates", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    const shared = { project, breakdown: null, callSheet: null };
    const shots = renderProductionResources({ ...shared, section: "shots", rows: [], selectedId: null, sceneFilter: null });
    expect(shots).toContain("Import a screenplay before adding scene-linked shots.");
    expect(shots).toContain('data-action="production-shots-csv-export" disabled');
    const locations = renderProductionResources({ ...shared, section: "locations", records: [], location: null, manifest: null, locationRows: [] });
    const talent = renderProductionResources({ ...shared, section: "talent", records: [], talent: null, manifest: null });
    expect(locations).toContain('data-action="production-location-export" disabled');
    expect(talent).toContain('data-action="production-talent-export" disabled');
  });

  it.each(["locations", "talent"] as const)("filters linked and dismissed %s candidates without reordering the source", section => {
    const state = resourceState(section);
    if (state.section === "shots") throw new Error("Unexpected state");
    const element = state.breakdown!.elements.find(element => element.category === (section === "locations" ? "location" : "cast"))!;
    state.records[0]!.screenplayElementId = element.id;
    state.breakdown!.elements.push({ ...element, id: "dismissed-element", name: "Dismissed", reviewState: "dismissed" });
    state.breakdown!.elements.push({ ...element, id: "available-element", name: "Available", reviewState: "confirmed" });
    const before = JSON.stringify(state);
    const html = renderProductionResources(state);
    expect(html).not.toContain(`<option value="${element.id}">`);
    expect(html).not.toContain('<option value="dismissed-element">');
    expect(html).toContain('<option value="available-element">Available</option>');
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each(["locations", "talent"] as const)("preserves final call-sheet protection and stale-source warnings in %s", section => {
    const state = resourceState(section);
    if (state.section === "shots") throw new Error("Unexpected state");
    state.callSheet!.status = "final";
    state.manifest!.sourceChanged = true;
    const html = renderProductionResources(state);
    expect(html).toContain("is final; reopen it");
    expect(html).toContain("linked screenplay breakdown changed");
    expect(html).toMatch(/data-action="production-(location|talent)-apply-call-sheet" disabled/);
  });
});
