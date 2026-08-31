import { describe, expect, it } from "vitest";
import { seedWorkspace } from "@film/schema";
import { budgetTopSheetForProject } from "../src/project-summary";

describe("project summary projections", () => {
  it("derives one budget top sheet for both UI and local handoffs", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    const summary = budgetTopSheetForProject(project);

    expect(summary.lineBudget).toBe(95_000);
    expect(summary.lineSpent).toBe(63_410);
    expect(summary.remaining).toBe(37_590);
    expect(summary.usedPercent).toBe(69);
    expect(summary.largestLine?.category).toBe("Crew");
    expect(summary.nearBudgetCount).toBe(0);
    expect(summary.overBudgetCount).toBe(0);
  });
});
