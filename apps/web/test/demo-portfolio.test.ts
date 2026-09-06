import { describe, expect, it } from "vitest";
import { buildProductionSidesManifest, createBackupSnapshot, seedWorkspace } from "@film/schema";
import { createDemoPortfolio, DEMO_PROJECTS } from "../src/demo-portfolio";

describe("isolated demo portfolio", () => {
  it("covers every project type and phase, including sparse and dense workloads", () => {
    const workspace = createDemoPortfolio();
    expect(workspace.projects).toHaveLength(12);
    expect(new Set(workspace.projects.map((project) => project.type)).size).toBe(6);
    expect(new Set(workspace.projects.map((project) => project.phase)).size).toBe(4);
    expect(workspace.projects.some((project) => project.openTasks.length === 0 && project.totalBudget === 0)).toBe(true);
    expect(workspace.projects.some((project) => project.openTasks.length === 80)).toBe(true);
    expect(workspace.projects.some((project) => project.spentBudget > project.totalBudget)).toBe(true);
    expect(workspace.screenplayBreakdowns.some((breakdown) => breakdown.scenes.length === 72)).toBe(true);
    expect(workspace.productionSchedules.some((schedule) => schedule.shootDays.some((day) => day.unit === "second"))).toBe(true);
    expect(workspace.productionAvailability.some((window) => window.status === "unavailable")).toBe(true);
    expect(workspace.restorePoints).toEqual([]);
  });

  it("uses canonical factories with valid source and project links for daily documents", () => {
    const workspace = createDemoPortfolio();
    for (const sheet of workspace.productionCallSheets) {
      const breakdown = workspace.screenplayBreakdowns.find((item) => item.id === sheet.screenplayBreakdownId)!;
      const schedule = workspace.productionSchedules.find((item) => item.id === sheet.productionScheduleId)!;
      expect(breakdown.projectId).toBe(sheet.projectId);
      expect(schedule.projectId).toBe(sheet.projectId);
      expect(schedule.shootDays.some((day) => day.id === sheet.shootDayId)).toBe(true);
      const sides = buildProductionSidesManifest(sheet, breakdown);
      expect(sides.missingSceneIds).toEqual([]);
      expect(sides.scenes.length).toBeGreaterThan(0);
    }
    for (const report of workspace.productionReports) {
      expect(workspace.productionCallSheets.some((sheet) => sheet.id === report.productionCallSheetId && sheet.projectId === report.projectId)).toBe(true);
    }
    expect(workspace.productionShots.every((shot) => workspace.screenplayBreakdowns.some((source) => source.id === shot.screenplayBreakdownId && source.scenes.some((scene) => scene.id === shot.sceneId)))).toBe(true);
  });

  it("never reuses template record IDs, mutates seed data, or implies real provider/contact state", () => {
    const before = JSON.stringify(seedWorkspace);
    const first = createDemoPortfolio();
    const second = createDemoPortfolio();
    first.projects[0]!.title = "Edited demo";
    expect(second.projects[0]!.title).toBe(DEMO_PROJECTS[0]!.title);
    expect(JSON.stringify(seedWorkspace)).toBe(before);
    const ids = second.projects.flatMap((project) => [project.id, ...[project.openTasks, project.docs, project.people, project.equipment, project.expenses].flatMap((rows) => rows.map((row) => row.id))]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(second.integrations.every((integration) => integration.mode === "dry-run")).toBe(true);
    expect(second.productionTalent.every((talent) => !talent.contactDetails)).toBe(true);
    expect(createBackupSnapshot(second).workspaceId).toBe("workspace_demo_portfolio");
  });
});
