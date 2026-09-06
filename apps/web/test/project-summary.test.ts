import { describe, expect, it } from "vitest";
import { createOperation, seedWorkspace } from "@film/schema";
import { budgetTopSheetForProject, localBackupSummary, productionSummaryForProject, taskSummaryForProject } from "../src/project-summary";
import { createDemoPortfolio } from "../src/demo-portfolio";

describe("project summary projections", () => {
  it("derives one budget top sheet for both UI and local handoffs", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    const summary = budgetTopSheetForProject(project);

    expect(summary.lineBudget).toBe(95_000);
    expect(summary.lineSpent).toBe(63_410);
    expect(summary.remaining).toBe(56_590);
    expect(summary.usedPercent).toBe(53);
    expect(summary.largestLine?.category).toBe("Crew");
    expect(summary.nearBudgetCount).toBe(0);
    expect(summary.overBudgetCount).toBe(0);
  });

  it("counts actual open tasks and handles an empty project without NaN", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    project.tasks.total = 900;
    expect(taskSummaryForProject(project)).toEqual({ done: 18, open: 5, total: 23, percent: 78 });
    project.tasks.done = 0;
    project.openTasks = [];
    expect(taskSummaryForProject(project)).toEqual({ done: 0, open: 0, total: 0, percent: 0 });
  });

  it("uses a zero-spend ledger instead of falling back to an old entered total", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    project.expenses.forEach((expense) => { expense.spent = 0; });
    expect(budgetTopSheetForProject(project).spent).toBe(0);
    project.expenses = [];
    expect(budgetTopSheetForProject(project).spent).toBe(project.spentBudget);
  });

  it("does not turn legacy timeline, call-sheet, or restore-point metadata into live evidence", () => {
    const summary = productionSummaryForProject(seedWorkspace.projects[0]!, seedWorkspace, "2026-09-05");
    expect(summary.schedule).toBeNull();
    expect(summary.callSheet).toBeNull();
    expect(summary.days).toEqual([]);
    expect(summary.sceneCount).toBe(0);
    expect(localBackupSummary([])).toEqual({ exportedAt: null, automatic: "Not configured" });
  });

  it("derives dated and undated schedules, upcoming and historical sheets, and report counts", () => {
    const workspace = createDemoPortfolio(new Date("2026-09-05T12:00:00Z"));
    const project = workspace.projects.find((item) => item.id === "demo_night-service")!;
    const summary = productionSummaryForProject(project, workspace, "2026-09-05");
    expect(summary.sceneCount).toBe(36);
    expect(summary.days).toHaveLength(6);
    expect(summary.assignedStrips).toBe(36);
    expect(summary.issuedReports).toBe(1);
    expect(summary.callSheet?.date).toBe("2026-09-05");
    expect(summary.callSheetLabel).toBe("Upcoming call sheet");
    expect(summary.shootDates).toBe("Sep 4, 2026 - Sep 9, 2026");
    expect(productionSummaryForProject(project, workspace, "2027-01-01").callSheetLabel).toBe("Latest call sheet");
    const undated = workspace.projects.find((item) => item.id === "demo_one-take")!;
    expect(productionSummaryForProject(undated, workspace).shootDates).toBe("Dates not set");
  });

  it("only reports completed encrypted exports as local backup evidence", () => {
    const dryRun = createOperation(seedWorkspace.id, "restore.dry_run", "backup", "old", "Preview");
    const exported = createOperation(seedWorkspace.id, "backup.exported", "backup", "export", "Export", { encrypted: true });
    expect(localBackupSummary([dryRun, exported]).exportedAt).toBe(exported.createdAt);
  });

  it("selects the newest revision when historical call sheets share a shoot date", () => {
    const workspace = createDemoPortfolio(new Date("2026-09-05T12:00:00Z"));
    const project = workspace.projects[0]!;
    const sheet = workspace.productionCallSheets.find((item) => item.projectId === project.id)!;
    workspace.productionCallSheets = [
      { ...sheet, id: "older", date: "2026-09-01", updatedAt: "2026-09-01T10:00:00Z" },
      { ...sheet, id: "newer", date: "2026-09-01", updatedAt: "2026-09-01T12:00:00Z" },
    ];
    expect(productionSummaryForProject(project, workspace, "2026-09-05").callSheet?.id).toBe("newer");
  });
});
