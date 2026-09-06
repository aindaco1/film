import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { seedWorkspace } from "@film/schema";
import { createDemoPortfolio } from "../src/demo-portfolio";
import { createProjectPacketMarkdown } from "../src/local-handoff-export";
import { renderOperationsGrid, renderOverviewBottom, renderProductionOverview } from "../src/project-overview";

describe("project-derived overview", () => {
  it("bounds each shared list and keeps record editing on canonical destinations", () => {
    const workspace = createDemoPortfolio();
    const project = workspace.projects.find((project) => project.id === "demo_juniper")!;
    const markup = renderOperationsGrid(project, project.docs[0]!.id);
    expect(markup).toContain("75 more");
    expect(markup.match(/class="panel compact-panel"/g)).toHaveLength(4);
    expect(markup.match(/<li>/g)!.length).toBeLessThanOrEqual(20);
    expect(markup).not.toContain("<form");
    expect(markup).not.toContain("<input");
    expect(markup).toContain('data-workspace-section="tasks"');
    expect(markup).toContain('data-open-doc="demo_juniper_brief"');
  });

  it("renders real schedule/report counts and preserves source-free project handoffs", () => {
    const workspace = createDemoPortfolio(new Date("2026-09-05T12:00:00Z"));
    const project = workspace.projects[0]!;
    const markup = renderProductionOverview(project, workspace);
    expect(markup).toContain("<strong>36</strong><small>Source scenes</small>");
    expect(markup).toContain("<strong>6</strong><small>Shoot days</small>");
    const packet = createProjectPacketMarkdown(workspace.name, project, [], "2026-09-05T12:00:00Z", workspace);
    expect(packet).toContain("- Assigned strips: 36");
    expect(packet).toContain("- Issued reports: 1");
    expect(packet).toContain("Night Service - Day 2");
    expect(packet).not.toContain("We have time to try this once more");
    expect(packet).not.toContain("## Phase Timeline");
  });

  it("does not display stale sample call-sheet metadata or arbitrary progress", () => {
    const markup = renderOverviewBottom(seedWorkspace.projects[0]!, seedWorkspace);
    expect(markup).toContain("No call sheet has been generated");
    expect(markup).not.toContain("Riverside Warehouse");
    expect(renderProductionOverview(seedWorkspace.projects[0]!, seedWorkspace)).not.toContain("Phase timeline");
  });

  it("does not count a split source scene twice in call-sheet summaries", () => {
    const workspace = createDemoPortfolio();
    const project = workspace.projects[0]!;
    const sheet = workspace.productionCallSheets[0]!;
    const splitSceneId = sheet.sceneIds[0]!;
    sheet.sceneParts = [
      { id: "part-a", sceneId: splitSceneId, label: "A", sourceStartLine: 1, sourceEndLine: 4 },
      { id: "part-b", sceneId: splitSceneId, label: "B", sourceStartLine: 5, sourceEndLine: 8 },
    ];
    workspace.productionCallSheets = [sheet];
    const stripCount = sheet.sceneIds.length + 1;
    expect(renderOverviewBottom(project, workspace)).toContain(`${stripCount} strips`);
    expect(createProjectPacketMarkdown(workspace.name, project, [], new Date().toISOString(), workspace)).toContain(`- Scheduled strips: ${stripCount}`);
  });

  it("escapes long/user-supplied records through the shared renderer", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    project.docs[0]!.name = '<img src=x onerror="bad">';
    expect(renderOperationsGrid(project, null)).toContain("&lt;img");
    expect(renderOperationsGrid(project, null)).not.toContain("<img");
  });

  it("loads import, demo, and backup runtime only at their feature boundaries", () => {
    const source = readFileSync("src/main.ts", "utf8");
    for (const path of ["@film/backup", "./import-preview", "./demo-portfolio"]) {
      expect(source.includes(`import("${path}")`), path).toBe(true);
    }
    expect(source).not.toMatch(/import\s*\{\s*createEncryptedBackupZipBundle/);
    expect(source).not.toMatch(/import\s*\{\s*createNotionManifest/);
  });
});
