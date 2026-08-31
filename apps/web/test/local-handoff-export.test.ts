import { describe, expect, it } from "vitest";
import { seedWorkspace, type FilmProject } from "@film/schema";
import {
  createActivityLogMarkdown,
  createBudgetTopSheetMarkdown,
  createCrewDirectoryMarkdown,
  createDocumentDraftMarkdown,
  createGearPullMarkdown,
  createPlanningViewMarkdown,
  createProjectDirectoryMarkdown,
  createProjectPacketMarkdown,
  createTaskListMarkdown,
  createTeamRosterMarkdown,
  type LocalHandoffPlanningRow,
} from "../src/local-handoff-export";

const exportedAt = "2026-08-31T06:00:00.000Z";

function workspace() {
  return structuredClone(seedWorkspace);
}

function project(): FilmProject {
  return structuredClone(seedWorkspace.projects[0]!);
}

function planningRow(overrides: Partial<LocalHandoffPlanningRow> = {}): LocalHandoffPlanningRow {
  return {
    kindLabel: "Locations",
    title: "Radio Station",
    projectLabel: "Echoes in the Static",
    fields: { status: "Confirmed", contact: "Excluded from source path" },
    sourceLabel: "D1 planning_location_1",
    ...overrides,
  };
}

describe("local handoff exports", () => {
  it("creates one explicit project packet from the selected project and bounded planning rows", () => {
    const selected = project();
    selected.title = "  Signal\nNoise  ";
    const markdown = createProjectPacketMarkdown("Dust Wave", selected, [planningRow()], exportedAt);

    expect(markdown).toContain("# Signal Noise");
    expect(markdown).toContain("Workspace: Dust Wave");
    expect(markdown).toContain("## Upcoming Call Sheet");
    expect(markdown).toContain("- Locations: Radio Station - status=Confirmed; contact=Excluded from source path");
    expect(markdown).toContain("## Date-Driven Tasks");
    expect(markdown).toContain("provider secrets, OAuth tokens, raw attachment bytes, and private Worker state are excluded");
  });

  it("keeps project, task, crew, gear, and budget handoffs on the same project data", () => {
    const currentWorkspace = workspace();
    const selected = project();
    selected.expenses.push({
      id: "expense_legacy",
      category: "",
      spent: 100,
      budget: 50,
      percent: 200,
    });

    const directory = createProjectDirectoryMarkdown(currentWorkspace, [selected], "Signal", exportedAt);
    expect(directory).toContain("# Project Directory: Acme Films");
    expect(directory).toContain("Filter: Signal");
    expect(directory).toContain("Markdown document bodies are excluded");

    const tasks = createTaskListMarkdown(currentWorkspace.name, selected, exportedAt);
    expect(tasks).toContain("# Task List: Echoes in the Static");
    expect(tasks).toContain("- Overdue: 1");
    expect(tasks).toContain("[Overdue] Review final shot list");

    const crew = createCrewDirectoryMarkdown(currentWorkspace.name, selected, exportedAt);
    expect(crew).toContain("Julia Lee - Director (JL)");
    expect(crew).toContain("email addresses, and phone numbers are excluded");

    const gear = createGearPullMarkdown(currentWorkspace.name, selected, exportedAt);
    expect(gear).toContain("ARRI Alexa Mini LF - Prepped");

    const budget = createBudgetTopSheetMarkdown(currentWorkspace.name, selected, exportedAt);
    expect(budget).toContain("- Budget risk: 1 over budget / 0 near budget");
    expect(budget).toContain("- Uncategorized - $100 spent of $50 (200%)");
  });

  it("identifies canonical versus local planning sources without exposing source paths", () => {
    const row = planningRow({ sourceLabel: "Local import operation_1" });
    const canonical = createPlanningViewMarkdown("Dust Wave", [row], 4, "Locations", "canonical", exportedAt);
    const local = createPlanningViewMarkdown("Dust Wave", [row], 4, "Locations", "local", exportedAt);

    expect(canonical).toContain("- Source: D1 planning export");
    expect(local).toContain("- Source: Local import review cache");
    expect(local).toContain("Source labels are included without local file paths");
    expect(local).not.toContain("/Users/");
  });

  it("includes a selected Markdown body only in the explicit document handoff", () => {
    const currentWorkspace = workspace();
    const selected = project();
    const doc = {
      ...selected.docs[0]!,
      id: "doc_notes",
      name: "Notes.md",
      type: "MD" as const,
      markdownSnapshot: "PRIVATE BODY",
    };
    selected.docs.push(doc);
    const draft = createDocumentDraftMarkdown(currentWorkspace.name, selected, doc, "Line one\r\nLine two", exportedAt);
    const activity = createActivityLogMarkdown(currentWorkspace, exportedAt);

    expect(draft).toContain("# Document Draft: Notes.md");
    expect(draft).toContain("This explicit export includes the selected Markdown body");
    expect(draft).toContain("Line one\nLine two");
    expect(activity).toContain("# Activity Log: Acme Films");
    expect(activity).toContain("raw Worker audit metadata");
    expect(activity).not.toContain("PRIVATE BODY");
  });

  it("exports team status and short hashes without raw addresses or invite tokens", () => {
    const currentWorkspace = workspace();
    const rawAddress = "producer@example.invalid";
    const rawInviteToken = ["invite", "secret", "123"].join("_");
    const roster = createTeamRosterMarkdown(currentWorkspace, exportedAt);

    expect(roster).toContain("# Team Roster: Acme Films");
    expect(roster).toContain("- Active: 2");
    expect(roster).toContain("- Invited: 1");
    expect(roster).toContain("- Role: Owner");
    expect(roster).toContain("- Email hash: 9b11d8ec...7169d6");
    expect(roster).toContain("Email references are short hashes only");
    expect(roster).not.toContain(rawAddress);
    expect(roster).not.toContain(rawInviteToken);
  });
});
