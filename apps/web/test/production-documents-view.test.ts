import { describe, expect, it } from "vitest";
import { buildProductionSidesManifest, seedWorkspace } from "@film/schema";
import { createDemoPortfolio } from "../src/demo-portfolio";
import { isProductionDocumentsSection, PRODUCTION_DOCUMENT_VIEWS } from "../src/production-documents-loader";
import { renderProductionDocuments } from "../src/production-documents-view";
import type { ProductionDocumentsViewState } from "../src/production-documents-state";

function documentStates(): ProductionDocumentsViewState[] {
  const workspace = createDemoPortfolio(new Date("2026-09-06T12:00:00Z"));
  const report = workspace.productionReports[0]!;
  const callSheet = workspace.productionCallSheets.find(sheet => sheet.id === report.productionCallSheetId)!;
  const project = workspace.projects.find(project => project.id === callSheet.projectId)!;
  const breakdown = workspace.screenplayBreakdowns.find(item => item.id === callSheet.screenplayBreakdownId)!;
  const schedule = workspace.productionSchedules.find(item => item.id === callSheet.productionScheduleId)!;
  const callSheets = workspace.productionCallSheets.filter(sheet => sheet.projectId === project.id);
  return [
    { section: "call-sheets", project, callSheets, callSheet, source: { schedule, breakdown }, sourceOptions: [] },
    { section: "sides", project, callSheets, sides: { callSheet, schedule, breakdown, manifest: buildProductionSidesManifest(callSheet, breakdown) }, latestBreakdown: breakdown },
    { section: "reports", project, reports: [report], report, source: { callSheet, breakdown }, sourceOptions: [] },
  ];
}

describe("deferred daily production documents", () => {
  it("recognizes only the three document workspaces", () => {
    for (const section of Object.keys(PRODUCTION_DOCUMENT_VIEWS)) expect(isProductionDocumentsSection(section)).toBe(true);
    for (const section of ["constructor", "toString", "schedule", ""]) expect(isProductionDocumentsSection(section)).toBe(false);
  });

  it.each(documentStates().map(state => [state.section, state] as const))("renders %s without mutating its production inputs", (_section, state) => {
    const before = JSON.stringify(state);
    const html = renderProductionDocuments(state);
    expect(html).toContain(`<h1>${PRODUCTION_DOCUMENT_VIEWS[state.section]}</h1>`);
    expect(html).toContain(state.project.title);
    expect(JSON.stringify(state)).toBe(before);
    expect(html).not.toContain("undefined");
  });

  it("keeps empty sources honest and exposes the existing prerequisite navigation", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    const calls = renderProductionDocuments({ section: "call-sheets", project, callSheets: [], callSheet: null, source: null, sourceOptions: [] });
    expect(calls).toContain('data-workspace-section="schedule"');
    expect(calls).not.toContain('data-action="call-sheet-update"');
    const sides = renderProductionDocuments({ section: "sides", project, callSheets: [], sides: null, latestBreakdown: null });
    expect(sides).toContain("No sides source");
    expect(sides).toContain('data-workspace-section="call-sheets"');
    expect(sides).toContain('data-action="production-sides-html-export" disabled');
    const reports = renderProductionDocuments({ section: "reports", project, reports: [], report: null, source: null, sourceOptions: [] });
    expect(reports).not.toContain('data-action="production-report-update"');
    expect(reports).toContain('data-action="production-report-export" disabled');
  });

  it("preserves final-sheet and final-report edit gates", () => {
    for (const state of documentStates()) {
      if (state.section === "sides") continue;
      if (state.section === "call-sheets") state.callSheet!.status = "final";
      else state.report!.status = "final";
      const html = renderProductionDocuments(state);
      expect(html).toContain("<fieldset disabled>");
      expect(html).toContain("Reopen");
      expect(html).toContain("read-only");
    }
  });

  it("escapes project, option, and local screenplay content", () => {
    for (const state of documentStates()) {
      state.project.title = '<script>alert("project")</script>';
      if (state.section === "sides") state.sides!.manifest.scenes[0]!.sourceText = '<script>alert("source")</script>';
      else state.sourceOptions = [{ value: '\" onclick="alert(1)', label: "<script>option</script>" }];
      const html = renderProductionDocuments(state);
      expect(html).not.toContain("<script>");
      expect(html).not.toContain('value="" onclick=');
      expect(html).toContain("&lt;script&gt;");
    }
  });
});
