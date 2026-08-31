import { describe, expect, it } from "vitest";
import {
  seedWorkspace,
  type ProductionCallSheet,
  type ProductionScheduleVersion,
  type ProductionSidesManifest,
} from "@film/schema";
import {
  createCallSheetMarkdown,
  createProductionSidesHtml,
  createProductionSidesMarkdown,
} from "../src/production-document-export";

describe("production document exports", () => {
  it("creates the legacy call-sheet handoff through the shared serializer", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    const markdown = createCallSheetMarkdown(project, "2026-08-30T12:00:00.000Z");

    expect(markdown).toContain(`# Call Sheet: ${project.title}`);
    expect(markdown).toContain("## Safety And Logistics");
    expect(markdown).toContain("provider secrets, OAuth tokens, raw attachment bytes");
    expect(markdown).not.toContain("screenplay source text");
  });

  it("preserves reviewed source in Markdown and escapes standalone print HTML", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    const callSheet = {
      title: "Night <Signal> - Day 1",
      status: "final",
      date: "2026-09-01",
      dayOrdinal: 1,
      totalShootDays: 2,
      unit: "main",
      sourceScheduleUpdatedAt: "2026-08-30T12:00:00.000Z",
    } as ProductionCallSheet;
    const schedule = {
      title: "Principal & Second Unit",
      updatedAt: callSheet.sourceScheduleUpdatedAt,
    } as ProductionScheduleVersion;
    const manifest = {
      screenplayTitle: "Night Signal",
      missingSceneIds: [],
      scenes: [{
        id: "scene_1",
        ordinal: 1,
        sceneNumber: "1",
        heading: "INT. STUDIO <NIGHT>",
        location: "Community Radio & Archive",
        timeOfDay: "NIGHT",
        sourceStartLine: 1,
        sourceEndLine: 4,
        schedulePartLabel: null,
        sourceText: "MARA\n``` cue\n<script>alert('cut')</script>",
        castCalls: [{ name: "MARA <Lead>", performerName: "A & B" }],
      }],
    } as unknown as ProductionSidesManifest;

    const markdown = createProductionSidesMarkdown(
      project,
      callSheet,
      manifest,
      schedule,
      "2026-08-30T12:30:00.000Z",
    );
    expect(markdown).toContain("# Sides: Night <Signal> - Day 1");
    expect(markdown).toContain("Source schedule changed: no");
    expect(markdown).toContain("````text");
    expect(markdown).toContain("<script>alert('cut')</script>");

    const html = createProductionSidesHtml(
      project,
      callSheet,
      manifest,
      schedule,
      "2026-08-30T12:30:00.000Z",
    );
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("Night &lt;Signal&gt; - Day 1");
    expect(html).toContain("&lt;script&gt;alert(&#039;cut&#039;)&lt;/script&gt;");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("src=");
  });
});
