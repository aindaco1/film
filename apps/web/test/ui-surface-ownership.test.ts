import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

function functionSource(source: string, name: string): string {
  const start = source.indexOf(`function ${name}`);
  expect(start, `${name} should exist`).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

function countStaticAttributes(source: string, attribute: string): Map<string, number> {
  const counts = new Map<string, number>();
  const pattern = new RegExp(`${attribute}=["']([^"'$]+)["']`, "g");
  for (const match of source.matchAll(pattern)) {
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  return counts;
}

describe("canonical UI surface ownership", () => {
  it("renders each singleton user command on one canonical surface", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const renderSource = source.slice(0, source.indexOf("function bindEvents(): void"));
    const actionCounts = countStaticAttributes(renderSource, "data-action");

    for (const action of [
      "create-project",
      "filter",
      "screenplay-import",
      "planning-export-refresh",
      "backup",
      "backup-r2-manifest",
      "backup-r2-preview",
      "restore-file-preview",
    ]) {
      expect(actionCounts.get(action), `${action} should have one canonical UI owner`).toBe(1);
    }
  });

  it("allows repeated static commands only for contextual row controls", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const renderSource = source.slice(0, source.indexOf("function bindEvents(): void"));
    const repeatedActions = [...countStaticAttributes(renderSource, "data-action")]
      .filter(([, count]) => count > 1)
      .sort(([left], [right]) => left.localeCompare(right));

    expect(repeatedActions).toEqual([
      ["call-sheet-select", 2],
      ["contextual-record-update", 4],
      ["permission-manifest", 2],
      ["production-shot-reorder", 2],
      ["schedule-scene-reorder", 2],
      ["screenplay-element-merge", 2],
      ["screenplay-scene-order", 2],
    ]);
  });

  it("keeps Overview summary-only and Projects as the project directory owner", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const overview = functionSource(source, "renderSlateWorkspace");
    const projects = functionSource(source, "renderProjectsWorkspace");
    const sidebar = functionSource(source, "renderSidebar");
    const mobileNavigation = functionSource(source, "renderMobileWorkspaceNav");

    expect(overview).not.toContain("renderProjectList");
    expect(overview).not.toContain("renderProjectBoard");
    expect(overview).not.toContain('data-action="create-project"');
    expect(overview).not.toContain('data-action="filter"');
    expect(projects).toContain("renderProjectWorkspaceHeader");
    expect(projects).toContain("renderProjectList");
    expect(projects).toContain("renderProjectBoard");
    expect(sidebar).not.toContain("data-project-id");
    expect(sidebar).not.toContain('data-action="create-project"');
    expect(mobileNavigation).not.toContain('data-action="create-project"');
    expect(mobileNavigation).toContain(">Projects</option>");
  });

  it("keeps backup recovery in Backups instead of the inspector or top bar", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const backups = functionSource(source, "renderBackupsWorkspace");
    const topbar = functionSource(source, "renderTopbar");

    expect(backups).toContain("renderBackupRestoreWorkflow");
    expect(backups).toContain('data-action="backup"');
    expect(source).not.toContain('inspectorViewPanelAttributes("backups")');
    expect(topbar).not.toContain('data-action="backup"');
    expect(topbar).toContain("Manage backups in the Backups workspace");
  });

  it("limits direct workspace links to summary drilldowns and prerequisite recovery", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const renderSource = source.slice(0, source.indexOf("function bindEvents(): void"));
    const linkCounts = [...countStaticAttributes(renderSource, "data-workspace-section")].sort(([left], [right]) =>
      left.localeCompare(right),
    );

    expect(linkCounts).toEqual([
      ["breakdown", 1],
      ["call-sheets", 2],
      ["docs", 1],
      ["equipment", 1],
      ["expenses", 1],
      ["people", 1],
      ["planning", 1],
      ["tasks", 1],
    ]);
  });

  it("does not repeat Overview timeline and task summaries in Schedule", async () => {
    const source = await readFile("src/main.ts", "utf8");
    const schedule = functionSource(source, "renderScheduleWorkspace");

    expect(schedule).toContain("renderProductionStripboard");
    expect(schedule).toContain("renderProductionAvailability");
    expect(schedule).toContain("renderProductionScheduleScenarios");
    expect(schedule).toContain("renderProductionBudgetEstimate");
    expect(schedule).not.toContain("renderTimeline");
    expect(source).not.toContain("renderScheduleTimelinePanel");
  });
});
