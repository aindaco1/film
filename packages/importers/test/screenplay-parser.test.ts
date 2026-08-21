import { describe, expect, it } from "vitest";
import { parseScreenplayFile, ScreenplayParseError } from "../src/index";

describe("screenplay parser", () => {
  it("builds a reviewable scene and element graph from Fountain locally", () => {
    const breakdown = parseScreenplayFile({
      projectId: "proj_micro",
      path: "Scripts/Signal.fountain",
      kind: "fountain",
      importedAt: "2026-08-20T12:00:00.000Z",
      text: `Title: Signal

INT. KITCHEN - NIGHT #12#

=Mara hears the tape start.

MARA (V.O.)
Keep quiet.

She pockets the [[prop: Field recorder]].

EXT. COUNTY ROAD - DAWN

MARA
Run.

[[vehicle: Pickup truck]]`,
    });

    expect(breakdown.revision).toMatchObject({
      title: "Signal",
      format: "fountain",
      parserVersion: "film-screenplay-1",
      warnings: [],
    });
    expect(breakdown.scenes).toHaveLength(2);
    expect(breakdown.scenes[0]).toMatchObject({
      ordinal: 1,
      sceneNumber: "12",
      interiorExterior: "INT",
      location: "KITCHEN",
      timeOfDay: "NIGHT",
      synopsis: "Mara hears the tape start.",
      sourceStartLine: 3,
    });
    expect(breakdown.elements.map((element) => [element.category, element.name, element.reviewState])).toEqual([
      ["location", "KITCHEN", "suggested"],
      ["cast", "MARA", "suggested"],
      ["prop", "Field recorder", "suggested"],
      ["location", "COUNTY ROAD", "suggested"],
      ["vehicle", "Pickup truck", "suggested"],
    ]);
    expect(breakdown.elements.filter((element) => element.category === "cast")).toHaveLength(1);
    expect(breakdown.occurrences.filter((occurrence) =>
      occurrence.elementId === breakdown.elements.find((element) => element.category === "cast")?.id
    )).toHaveLength(2);
  });

  it("parses Final Draft XML paragraphs without evaluating entities", () => {
    const breakdown = parseScreenplayFile({
      projectId: "proj_micro",
      path: "Scripts/Signal.fdx",
      kind: "final_draft",
      importedAt: "2026-08-20T12:00:00.000Z",
      text: `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
    <Paragraph Type="Scene Heading" Number="4"><Text>INT. GARAGE - NIGHT</Text></Paragraph>
    <Paragraph Type="Action"><Text>A bare work light hums. [[equipment: Work light]]</Text></Paragraph>
    <Paragraph Type="Character"><Text>LEO (O.S.)</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>Kill it.</Text></Paragraph>
  </Content>
</FinalDraft>`,
    });

    expect(breakdown.scenes).toHaveLength(1);
    expect(breakdown.scenes[0]).toMatchObject({
      sceneNumber: "4",
      location: "GARAGE",
      timeOfDay: "NIGHT",
    });
    expect(breakdown.elements.map((element) => [element.category, element.name])).toEqual([
      ["location", "GARAGE"],
      ["equipment", "Work light"],
      ["cast", "LEO"],
    ]);
  });

  it("produces stable graph ids when the same revision is parsed again", () => {
    const input = {
      projectId: "proj_micro",
      path: "Script.fountain",
      kind: "fountain" as const,
      text: "INT. ROOM - DAY\n\nAVA\nHello.",
    };
    const first = parseScreenplayFile({ ...input, importedAt: "2026-08-20T12:00:00.000Z" });
    const second = parseScreenplayFile({ ...input, importedAt: "2026-08-21T12:00:00.000Z" });

    expect(second.id).toBe(first.id);
    expect(second.revision.id).toBe(first.revision.id);
    expect(second.scenes.map((scene) => scene.id)).toEqual(first.scenes.map((scene) => scene.id));
    expect(second.elements.map((element) => element.id)).toEqual(first.elements.map((element) => element.id));
  });

  it("reports missing scene headings instead of inventing scenes", () => {
    const breakdown = parseScreenplayFile({
      projectId: "proj_micro",
      path: "notes.fountain",
      kind: "fountain",
      text: "A loose production note with no formatted scene heading.",
    });

    expect(breakdown.scenes).toEqual([]);
    expect(breakdown.revision.warnings[0]).toContain("No Fountain scene headings");
  });

  it("rejects XML entity declarations before Final Draft parsing", () => {
    expect(() => parseScreenplayFile({
      projectId: "proj_micro",
      path: "unsafe.fdx",
      kind: "final_draft",
      text: "<!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><FinalDraft>&xxe;</FinalDraft>",
    })).toThrowError(ScreenplayParseError);
  });
});
