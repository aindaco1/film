import { describe, expect, it } from "vitest";
import {
  seedWorkspace,
  type ScreenplayBreakdown,
  type ScreenplayElementReport,
  type ScreenplayRevisionComparison,
} from "@film/schema";
import {
  createScreenplayElementReportCsv,
  createScreenplayElementReportMarkdown,
  createScreenplayRevisionMarkdown,
} from "../src/screenplay-review-export";

const exportedAt = "2026-08-30T19:00:00.000Z";

function breakdown(id: string, title: string, sourceFileName: string): ScreenplayBreakdown {
  return {
    id,
    revision: { id: `${id}_revision`, title, sourceFileName },
  } as ScreenplayBreakdown;
}

describe("screenplay review exports", () => {
  it("exports metadata-only element reports with table and spreadsheet escaping", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    project.title = "Signal | Noise";
    const current = breakdown("breakdown_2", "Blue | Draft", "signal-blue.fountain");
    const report = {
      screenplayBreakdownId: current.id,
      screenplayRevisionId: current.revision.id,
      category: "prop",
      rows: [{
        elementId: "element_recorder",
        category: "prop",
        name: "=FIELD | RECORDER",
        source: "manual",
        reviewState: "confirmed",
        occurrenceCount: 1,
        confirmedOccurrenceCount: 1,
        sceneCount: 1,
        scenes: [{ id: "scene_1", ordinal: 1, sceneNumber: "1", heading: "INT. STATION - NIGHT" }],
        occurrences: [{ id: "occ_1", sceneId: "scene_1", sceneOrdinal: 1, sceneNumber: "1", sceneHeading: "INT. STATION - NIGHT", sourceLine: 8, reviewState: "confirmed" }],
        firstScene: { id: "scene_1", ordinal: 1, sceneNumber: "1", heading: "INT. STATION - NIGHT" },
      }],
      occurrenceCount: 1,
      sceneUseCount: 1,
    } satisfies ScreenplayElementReport;

    const markdown = createScreenplayElementReportMarkdown(project, current, report, exportedAt);
    expect(markdown).toContain("# Element List: Signal \\| Noise");
    expect(markdown).toContain("=FIELD \\| RECORDER");
    expect(markdown).toContain("1 line 8 (confirmed)");
    expect(markdown).toContain("screenplay source text");

    const csv = createScreenplayElementReportCsv(report);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\"'=FIELD | RECORDER\"");
  });

  it("exports revision metadata and the immutable-issued-document policy", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    const previous = breakdown("breakdown_1", "White Draft", "signal-white.fountain");
    const next = breakdown("breakdown_2", "Blue Draft", "signal-blue.fountain");
    const comparison = {
      previousBreakdownId: previous.id,
      nextBreakdownId: next.id,
      unchangedSceneCount: 2,
      changedSceneCount: 1,
      addedSceneCount: 1,
      removedSceneCount: 0,
      sceneChanges: [{
        status: "changed",
        matchBasis: "scene_number",
        previousSceneId: "scene_2",
        nextSceneId: "scene_2_blue",
        previousOrdinal: 2,
        nextOrdinal: 2,
        previousSceneNumber: "2",
        nextSceneNumber: "2",
        previousHeading: "EXT. ROAD - NIGHT",
        nextHeading: "EXT. ROAD - PRE-DAWN",
      }],
      elementMatches: [],
    } satisfies ScreenplayRevisionComparison;

    const markdown = createScreenplayRevisionMarkdown(project, previous, next, comparison, exportedAt);
    expect(markdown).toContain("- CHANGED: 2 -> 2 - EXT. ROAD - PRE-DAWN (scene number)");
    expect(markdown).toContain("Final call sheets, sides, and production reports remain pinned");
    expect(markdown).toContain("metadata-only local export");
    expect(markdown).not.toContain("The signal is back.");
  });
});
