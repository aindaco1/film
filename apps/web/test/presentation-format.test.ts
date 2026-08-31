import { describe, expect, it } from "vitest";
import { seedWorkspace, type ProjectDoc } from "@film/schema";
import {
  expenseCategoryLabel,
  escapeHtml,
  formatDocStatus,
  formatProductionMinutes,
  formatShortDateTime,
  formatTaskStatus,
  formatWorkspaceMemberStatus,
  markdownTableCell,
  packetText,
  productionUnitLabel,
  productionValueLabel,
  safeCsvCell,
  shortHash,
} from "../src/presentation-format";

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

  it("shares export-safe value formatting without duplicating serializer rules", () => {
    expect(formatProductionMinutes(0)).toBe("--");
    expect(formatProductionMinutes(90)).toBe("1h 30m");
    expect(productionValueLabel("not_started")).toBe("Not Started");
    expect(markdownTableCell("Signal | Noise")).toBe("Signal \\| Noise");
    expect(safeCsvCell("=CMD()")).toBe("\"'=CMD()\"");
    expect(safeCsvCell('A "quoted" value')).toBe('"A ""quoted"" value"');
  });

  it("shares operational labels and redacted member references", () => {
    expect(formatTaskStatus("overdue")).toBe("Overdue");
    expect(formatWorkspaceMemberStatus("invited")).toBe("Invited");
    expect(expenseCategoryLabel({ id: "expense", category: "", spent: 0, budget: 0, percent: 0 })).toBe("Uncategorized");
    expect(shortHash("1234567890abcdefghijklmnop")).toBe("12345678...klmnop");
    expect(formatShortDateTime("not-a-date")).toBe("not-a-date");
  });
});
