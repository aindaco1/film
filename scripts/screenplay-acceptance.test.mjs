import test from "node:test";
import assert from "node:assert/strict";
import { runScreenplayAcceptance } from "./screenplay-acceptance-core.mjs";

const fixture = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
    <Paragraph Type="Scene Heading" Number="1"><Text>INT. WORKSHOP - DAY</Text></Paragraph>
    <Paragraph Type="Character"><Text>AVA</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>Ready.</Text></Paragraph>
    <Paragraph Type="Scene Heading" Number="2"><Text>EXT. YARD - NIGHT</Text></Paragraph>
    <Paragraph Type="Character"><Text>BEN</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>Rolling.</Text></Paragraph>
  </Content>
</FinalDraft>`;

test("screenplay acceptance exercises the private planning and daily-document chain", () => {
  const evidence = runScreenplayAcceptance({
    kind: "final_draft",
    text: fixture,
    sourceSizeBytes: Buffer.byteLength(fixture),
  });

  assert.equal(evidence.policy, "source_free_local_screenplay_acceptance");
  assert.equal(evidence.screenplay.sceneCount, 2);
  assert.equal(evidence.schedule.assignedStripCount, 2);
  assert.equal(evidence.schedule.unassignedStripCount, 0);
  assert.equal(evidence.budget.lineCount, 6);
  assert.equal(evidence.callSheet.sceneCount, 2);
  assert.equal(evidence.sides.sceneCount, 2);
  assert.equal(evidence.report.plannedSceneCount, 2);
  assert(!JSON.stringify(evidence).includes("Ready."));
  assert(!JSON.stringify(evidence).includes("WORKSHOP"));
  assert(!JSON.stringify(evidence).includes("AVA"));
});

test("screenplay acceptance rejects a source with no parsed scenes", () => {
  assert.throws(() => runScreenplayAcceptance({
    kind: "fountain",
    text: "An unformatted production note.",
    sourceSizeBytes: 31,
  }), /at least one parsed scene/);
});
