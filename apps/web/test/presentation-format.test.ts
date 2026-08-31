import { describe, expect, it } from "vitest";
import { seedWorkspace, type ProjectDoc } from "@film/schema";
import { escapeHtml, formatDocStatus, packetText, productionUnitLabel } from "../src/presentation-format";

describe("shared presentation formatting", () => {
  it("normalizes display text and escapes active HTML characters", () => {
    expect(packetText("  Night\n\tSignal  ")).toBe("Night Signal");
    expect(escapeHtml(`<a title="Rock & Roll">It's live</a>`)).toBe(
      "&lt;a title=&quot;Rock &amp; Roll&quot;&gt;It&#039;s live&lt;/a&gt;",
    );
  });

  it("owns production-unit and document-status labels", () => {
    expect(productionUnitLabel("main")).toBe("Main unit");
    expect(productionUnitLabel("second")).toBe("Second unit");

    const document = structuredClone(seedWorkspace.projects[0]!.docs[0]!) as ProjectDoc;
    expect(formatDocStatus({ ...document, attachmentStatus: "stored_r2" })).toBe("Stored");
    expect(formatDocStatus({ ...document, attachmentStatus: undefined })).toBe(document.date);
  });
});
