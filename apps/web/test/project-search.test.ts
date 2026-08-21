import { describe, expect, it } from "vitest";
import { seedWorkspace, type FilmProject } from "@film/schema";
import { filterProjectsBySearch, projectMatchesSearch } from "../src/project-search";

describe("project metadata search", () => {
  it("matches nested operational metadata across selected projects", () => {
    const results = filterProjectsBySearch(seedWorkspace.projects, "ARRI prepped");

    expect(results.map((project) => project.id)).toEqual(["proj_echoes"]);
  });

  it("matches task, document, person, equipment, expense, and call-sheet fields", () => {
    const project = seedWorkspace.projects[0];

    expect(projectMatchesSearch(project, "final shot overdue")).toBe(true);
    expect(projectMatchesSearch(project, "shot list xlsx")).toBe(true);
    expect(projectMatchesSearch(project, "mateo dp")).toBe(true);
    expect(projectMatchesSearch(project, "sennheiser kit")).toBe(true);
    expect(projectMatchesSearch(project, "equipment 24000")).toBe(true);
    expect(projectMatchesSearch(project, "riverside warehouse")).toBe(true);
  });

  it("keeps local Markdown body text out of the searchable metadata", () => {
    const project = structuredClone(seedWorkspace.projects[0]) as FilmProject;
    project.docs[0] = {
      ...project.docs[0],
      type: "MD",
      markdownSnapshot: "ultramarine confidential draft body",
      attachmentStatus: "metadata_only",
    };

    expect(projectMatchesSearch(project, "metadata only")).toBe(true);
    expect(projectMatchesSearch(project, "ultramarine confidential")).toBe(false);
  });
});
