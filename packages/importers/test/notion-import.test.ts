import { describe, expect, it } from "vitest";
import { seedWorkspace } from "@film/schema";
import {
  applyNotionImport,
  planNotionImport,
  previewNotionExport,
  previewScreenplayFiles,
} from "../src/index";

describe("Notion importer", () => {
  it("summarizes Markdown pages, CSV databases, and assets", () => {
    const preview = previewNotionExport([
      { path: "Projects eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.md", sizeBytes: 1200 },
      { path: "Projects eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee/Tasks.csv", sizeBytes: 900 },
      { path: "Projects eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee/Camera Test.png", sizeBytes: 2048 },
    ]);

    expect(preview.markdownDocuments).toBe(1);
    expect(preview.csvDatabases).toBe(1);
    expect(preview.assets).toBe(1);
    expect(preview.topLevelPages).toEqual(["Projects"]);
    expect(preview.warnings).toEqual([]);
  });

  it("rejects unsafe ZIP paths", () => {
    const preview = previewNotionExport([
      { path: "../private.env" },
      { path: "/absolute/path.md" },
      { path: "safe/page.md" },
      { path: "__MACOSX/._page.md" },
    ]);

    expect(preview.acceptedFiles).toBe(1);
    expect(preview.unsafeFiles).toEqual(["../private.env", "/absolute/path.md", "__MACOSX/._page.md"]);
    expect(preview.warnings).toContain("3 unsafe paths ignored.");
  });

  it("ignores oversized files before import", () => {
    const preview = previewNotionExport(
      [
        { path: "Film.md", sizeBytes: 200 },
        { path: "Film/Archive.mov", sizeBytes: 50 },
      ],
      { maxFileBytes: 10 },
    );

    expect(preview.acceptedFiles).toBe(0);
    expect(preview.oversizedFiles).toEqual(["Film.md", "Film/Archive.mov"]);
    expect(preview.warnings).toContain("2 oversized files ignored.");
  });

  it("warns when no databases are present", () => {
    const preview = previewNotionExport([{ path: "Notes.md" }]);

    expect(preview.warnings).toContain("No CSV database exports found in the manifest.");
  });

  it("ignores HTML exports instead of importing executable page content", () => {
    const result = applyNotionImport(
      seedWorkspace,
      [
        {
          path: "Projects.csv",
          text: "Name,Phase\nHTML Safety,Development\n",
          sizeBytes: 80,
        },
        {
          path: "HTML Safety/Unsafe Export.html",
          text: "<h1>Unsafe</h1><script>alert('xss')</script>",
          sizeBytes: 120,
          contentType: "text/html",
        },
      ],
      seedWorkspace.projects[0]?.id ?? "",
    );
    const project = result.workspace.projects.find((item) => item.title === "HTML Safety");

    expect(project).toBeTruthy();
    expect(project?.docs.map((doc) => doc.name)).not.toContain("Unsafe Export.html");
    expect(JSON.stringify(project?.docs ?? [])).not.toContain("<script>");
    expect(result.summary.docsCreated).toBe(0);
  });

  it("plans page, database, and asset candidates from safe manifest entries", () => {
    const plan = planNotionImport([
      { path: "Projects eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.md", sizeBytes: 1200 },
      { path: "Projects eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee/Tasks.csv", sizeBytes: 900 },
      { path: "Projects eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee/Camera Test.png", sizeBytes: 2048 },
      { path: "../private.env", sizeBytes: 10 },
    ]);

    expect(plan.preview.unsafeFiles).toEqual(["../private.env"]);
    expect(plan.candidates).toEqual([
      {
        kind: "page",
        path: "Projects eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.md",
        title: "Projects",
        parentPath: null,
        sizeBytes: 1200,
        contentType: undefined,
      },
      {
        kind: "database",
        path: "Projects eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee/Tasks.csv",
        title: "Tasks",
        parentPath: "Projects eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        sizeBytes: 900,
        contentType: undefined,
      },
      {
        kind: "asset",
        path: "Projects eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee/Camera Test.png",
        title: "Camera Test",
        parentPath: "Projects eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        sizeBytes: 2048,
        contentType: undefined,
      },
    ]);
  });

  it("applies only the bounded candidate plan and prioritizes project databases", () => {
    const result = applyNotionImport(
      seedWorkspace,
      [
        {
          path: "Tasks.csv",
          text: "Name,Related Project\nShould not import,Bounded Feature\n",
          sizeBytes: 60,
        },
        {
          path: "Projects.csv",
          text: "Name,Phase\nBounded Feature,Development\n",
          sizeBytes: 50,
        },
      ],
      seedWorkspace.projects[0]?.id ?? "",
      { maxCandidates: 1 },
    );

    const project = result.workspace.projects.find((item) => item.title === "Bounded Feature");
    expect(result.plan.candidates.map((candidate) => candidate.path)).toEqual(["Projects.csv"]);
    expect(project).toBeTruthy();
    expect(project?.openTasks.map((task) => task.title)).not.toContain("Should not import");
    expect(result.summary).toMatchObject({ filesRead: 1, projectsCreated: 1, tasksCreated: 0 });
    expect(result.summary.warnings).toContain("1 import candidates omitted by the candidate cap.");
  });

  it("routes top-level project pages and nested unknown databases to the matching imported project", () => {
    const result = applyNotionImport(
      seedWorkspace,
      [
        {
          path: "Projects.csv",
          text: "Name,Phase\nBig Sword,Development\n",
          sizeBytes: 50,
        },
        {
          path: "Big Sword.md",
          text: "# Big Sword\n\nProject overview.",
          sizeBytes: 40,
        },
        {
          path: "Big Sword/Shot List.csv",
          text: "Shot,Notes\n1A,Opening image\n",
          sizeBytes: 50,
        },
      ],
      seedWorkspace.projects[0]?.id ?? "",
    );
    const project = result.workspace.projects.find((item) => item.title === "Big Sword");

    expect(project?.docs).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Big Sword.md", sourcePath: "Big Sword.md" }),
      expect.objectContaining({ name: "Shot List.csv", sourcePath: "Big Sword/Shot List.csv" }),
    ]));
    expect(seedWorkspace.projects[0]?.docs.map((doc) => doc.name)).not.toEqual(expect.arrayContaining([
      "Big Sword.md",
      "Shot List.csv",
    ]));
  });

  it("bounds CSV data rows before mapping records", () => {
    const result = applyNotionImport(
      seedWorkspace,
      [{
        path: "Tasks.csv",
        text: "Name,Status\nFirst,Done\nSecond,Done\nThird,Done\n",
        sizeBytes: 60,
      }],
      seedWorkspace.projects[0]?.id ?? "",
      { maxCsvRows: 2 },
    );

    expect(result.summary.tasksCreated).toBe(2);
    expect(result.summary.warnings).toContain("One or more CSV databases exceeded the 2-row import limit.");
  });

  it("bounds CSV columns and cells while keeping the first duplicate header", () => {
    const result = applyNotionImport(
      seedWorkspace,
      [{
        path: "Tasks.csv",
        text: "Name,name,Status,Extra\nLong task name,Override,Done,Ignored\n",
        sizeBytes: 80,
      }],
      seedWorkspace.projects[0]?.id ?? "",
      { maxCsvColumns: 3, maxCsvCellChars: 8 },
    );

    const importedTasks = result.workspace.projects[0]?.openTasks ?? [];
    expect(importedTasks.map((task) => task.title)).toContain("Long tas");
    expect(importedTasks.map((task) => task.title)).not.toContain("Override");
    expect(result.summary.warnings).toEqual(expect.arrayContaining([
      "One or more CSV rows exceeded the 3-column import limit.",
      "One or more CSV cells were truncated to 8 characters.",
      "One or more CSV databases contained empty or duplicate headers; ambiguous columns were ignored.",
    ]));
  });

  it("discards incomplete quoted CSV rows", () => {
    const result = applyNotionImport(
      seedWorkspace,
      [{
        path: "Tasks.csv",
        text: "Name,Status\nComplete,Done\n\"Incomplete,Todo\n",
        sizeBytes: 60,
      }],
      seedWorkspace.projects[0]?.id ?? "",
    );

    expect(result.summary.tasksCreated).toBe(1);
    expect(result.workspace.projects[0]?.openTasks.map((task) => task.title)).toContain("Complete");
    expect(result.summary.warnings).toContain(
      "One or more CSV databases ended with an incomplete quoted row; that row was ignored.",
    );
  });

  it("discards an incomplete row when a CSV reaches the character cap", () => {
    const result = applyNotionImport(
      seedWorkspace,
      [{
        path: "Tasks.csv",
        text: "Name,Status\nComplete,Done\nTruncated,Done\n",
        sizeBytes: 60,
      }],
      seedWorkspace.projects[0]?.id ?? "",
      { maxCsvChars: 30 },
    );

    expect(result.summary.tasksCreated).toBe(1);
    expect(result.summary.warnings).toContain("One or more CSV databases were truncated to 30 characters.");
  });

  it("preflights screenplay files without parsing content", () => {
    const preview = previewScreenplayFiles([
      { path: "Scripts/Dust Wave.fountain", sizeBytes: 1200, contentType: "text/plain" },
      { path: "Scripts/Dust Wave.fdx", sizeBytes: 2400, contentType: "application/xml" },
      { path: "Scripts/Dust Wave.gwx", sizeBytes: 3600 },
      { path: "../secret.fdx", sizeBytes: 10 },
      { path: "Scripts/notes.pdf", sizeBytes: 100 },
      { path: "Scripts/huge.fountain", sizeBytes: 20 },
    ], { maxFileBytes: 10 });

    expect(preview).toMatchObject({
      source: "screenplay_file_manifest",
      totalFiles: 6,
      acceptedFiles: 0,
      screenplayFiles: 0,
      fountainFiles: 0,
      finalDraftFiles: 0,
      graineryFiles: 0,
    });
    expect(preview.unsafeFiles).toEqual(["../secret.fdx"]);
    expect(preview.oversizedFiles).toEqual([
      "Scripts/Dust Wave.fountain",
      "Scripts/Dust Wave.fdx",
      "Scripts/Dust Wave.gwx",
      "Scripts/huge.fountain",
    ]);
    expect(preview.unsupportedFiles).toEqual(["Scripts/notes.pdf"]);
  });

  it("accepts bounded Fountain, Final Draft, and Grainery screenplay candidates", () => {
    const preview = previewScreenplayFiles([
      { path: "Scripts/Dust Wave.fountain", sizeBytes: 1200, contentType: "text/plain" },
      { path: "Scripts/Dust Wave.fdx", sizeBytes: 2400, contentType: "application/xml" },
      { path: "Scripts/Dust Wave.gwx", sizeBytes: 3600 },
    ]);

    expect(preview).toMatchObject({
      acceptedFiles: 3,
      screenplayFiles: 3,
      fountainFiles: 1,
      finalDraftFiles: 1,
      graineryFiles: 1,
      warnings: [],
    });
    expect(preview.candidates.map((candidate) => candidate.kind)).toEqual(["fountain", "final_draft", "grainery"]);
    expect(preview.candidates[0]).toMatchObject({
      title: "Dust Wave",
      path: "Scripts/Dust Wave.fountain",
      contentType: "text/plain",
    });
  });

  it("imports Notion CSV databases and Markdown pages into Film workspace records", () => {
    const result = applyNotionImport(
      seedWorkspace,
      [
        {
          path: "Tasks.csv",
          text: "Name,Related Project,Due Date,Status\nBook locations,Imported Feature,Aug 1,Todo\n",
          sizeBytes: 90,
        },
        {
          path: "Projects.csv",
          text: "Name,Phase,Budget,Logline\nImported Feature,Pre-Production,\"$45,000\",A test import\n",
          sizeBytes: 80,
        },
        {
          path: "Docs.csv",
          text: "Name,Project\nPitch Deck.pdf,Imported Feature\n",
          sizeBytes: 60,
        },
        {
          path: "Point People.csv",
          text: "Name,Role,Project\nMaya Chen,Producer,Imported Feature\n",
          sizeBytes: 70,
        },
        {
          path: "Equipment.csv",
          text: "Name,Status,Project\nCamera Kit,Held,Imported Feature\n",
          sizeBytes: 70,
        },
        {
          path: "Expenses.csv",
          text: "Category,Amount,Project\nLocations,\"$1,200\",Imported Feature\n",
          sizeBytes: 70,
        },
        {
          path: "Imported Feature/Treatment.md",
          text: "# Treatment\n\nA Markdown page from Notion.",
          sizeBytes: 80,
        },
        {
          path: "Imported Feature/Poster.png",
          sizeBytes: 4096,
          contentType: "image/png",
        },
      ],
      seedWorkspace.projects[0]?.id ?? "",
    );
    const importedProject = result.workspace.projects.find((project) => project.title === "Imported Feature");
    const posterDoc = importedProject?.docs.find((doc) => doc.name === "Poster.png");

    expect(importedProject).toBeTruthy();
    expect(importedProject?.phase).toBe("Pre-Production");
    expect(importedProject?.totalBudget).toBe(45000);
    expect(importedProject?.openTasks.map((task) => task.title)).toContain("Book locations");
    expect(importedProject?.docs.map((doc) => doc.name)).toContain("Pitch Deck.pdf");
    expect(importedProject?.docs.find((doc) => doc.name === "Treatment.md")?.markdownSnapshot).toContain("A Markdown page");
    expect(importedProject?.people.map((person) => person.name)).toContain("Maya Chen");
    expect(importedProject?.equipment.map((item) => item.name)).toContain("Camera Kit");
    expect(importedProject?.expenses.map((expense) => expense.category)).toContain("Locations");
    expect(posterDoc).toMatchObject({
      type: "ASSET",
      sourcePath: "Imported Feature/Poster.png",
      sourceSizeBytes: 4096,
      sourceContentType: "image/png",
    });
    expect(result.summary).toMatchObject({
      projectsCreated: 1,
      tasksCreated: 1,
      docsCreated: 2,
      attachmentsImported: 1,
      peopleCreated: 1,
      equipmentCreated: 1,
      expensesCreated: 1,
    });
    expect(result.coreRecords).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "task", title: "Book locations", sourcePath: "Tasks.csv", sourceKey: "row:0" }),
      expect.objectContaining({ kind: "document", title: "Pitch Deck.pdf", documentType: "uploaded_file" }),
      expect.objectContaining({ kind: "document", title: "Treatment.md", documentType: "markdown" }),
      expect.objectContaining({ kind: "document", title: "Poster.png", documentType: "uploaded_file" }),
      expect.objectContaining({ kind: "person", displayName: "Maya Chen", role: "Producer" }),
      expect.objectContaining({ kind: "equipment", name: "Camera Kit", status: "Held" }),
      expect.objectContaining({ kind: "expense", category: "Locations", spentCents: 120000 }),
    ]));
    expect(result.coreRecords).toHaveLength(7);
  });

  it("maps Dust Wave relation-list CSV fields to Film project records", () => {
    const result = applyNotionImport(
      seedWorkspace,
      [
        {
          path: "Projects.csv",
          text: "Name,Status,Category,Notes\nDust Wave Feature,Pre-Production,Film,A Dust Wave fixture project\n",
          sizeBytes: 120,
        },
        {
          path: "Tasks.csv",
          text: "Name,Related Projects,Due Date,Status\nLock pitch deck,\"Operations, Dust Wave Feature\",Jul 20,In Progress\n",
          sizeBytes: 120,
        },
        {
          path: "Docs.csv",
          text: "Name,Related Project\nLookbook.pdf,\"Archive, Dust Wave Feature\"\n",
          sizeBytes: 80,
        },
        {
          path: "Point People.csv",
          text: "Name,Role Tags,Related Projects\nJordan Vale,Director,\"Dust Wave Feature, Archive\"\n",
          sizeBytes: 100,
        },
        {
          path: "Equipment.csv",
          text: "Name,Location,Projects\nVintage Lens Set,Checkout Closet,\"Other, Dust Wave Feature\"\n",
          sizeBytes: 100,
        },
        {
          path: "Expenses.csv",
          text: "Name,Amount,Related Project\nFestival submission,\"$75\",\"Ops, Dust Wave Feature\"\n",
          sizeBytes: 100,
        },
      ],
      seedWorkspace.projects[0]?.id ?? "",
    );
    const project = result.workspace.projects.find((item) => item.title === "Dust Wave Feature");

    expect(project).toBeTruthy();
    expect(project?.openTasks.map((task) => task.title)).toContain("Lock pitch deck");
    expect(project?.docs.map((doc) => doc.name)).toContain("Lookbook.pdf");
    expect(project?.people).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Jordan Vale", role: "Director" }),
      ]),
    );
    expect(project?.equipment).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Vintage Lens Set", status: "Checkout Closet" }),
      ]),
    );
    expect(project?.expenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "Festival submission", spent: 75 }),
      ]),
    );
    expect(result.summary).toMatchObject({
      projectsCreated: 1,
      tasksCreated: 1,
      docsCreated: 1,
      peopleCreated: 1,
      equipmentCreated: 1,
      expensesCreated: 1,
    });
  });

  it("maps first-class production planning databases for Worker D1 import commits", () => {
    const result = applyNotionImport(
      seedWorkspace,
      [
        {
          path: "Locations.csv",
          text: "Name,Related Project,Type\nWarehouse,\"Archive, Dust Wave Feature\",Interior\n",
          sizeBytes: 100,
        },
        {
          path: "Opportunities.csv",
          text: "Name,Due Date,Website\nIndie Grant,Aug 1,https://example.com\n",
          sizeBytes: 100,
        },
        {
          path: "Meeting Notes.csv",
          text: "Name,Date,Participants\nCreative sync,Jul 10,Team\n",
          sizeBytes: 100,
        },
        {
          path: "Equipment Request.csv",
          text: "Name,Equipment,Checkout Date\nLens checkout,Prime Set,Jul 12\n",
          sizeBytes: 100,
        },
        {
          path: "Shows.csv",
          text: "Name,Channels\nBehind the Scenes,YouTube\n",
          sizeBytes: 100,
        },
        {
          path: "Merch.csv",
          text: "Name,Quantity\nPoster,50\n",
          sizeBytes: 100,
        },
        {
          path: "Reading List.csv",
          text: "Name,URL\nLighting reference,https://example.com\n",
          sizeBytes: 100,
        },
        {
          path: "Roles.csv",
          text: "Name,Department\nGaffer,Lighting\n",
          sizeBytes: 100,
        },
      ],
      seedWorkspace.projects[0]?.id ?? "",
    );

    expect(result.summary).toMatchObject({
      locationsMapped: 1,
      opportunitiesMapped: 1,
      meetingNotesMapped: 1,
      equipmentRequestsMapped: 1,
      showsMapped: 1,
      merchMapped: 1,
      mediaMapped: 1,
      rolesMapped: 1,
    });
    expect(result.summary.docsCreated).toBe(0);
    expect(result.summary.warnings).not.toContain("Imported unknown CSV database as a document: Locations.");
    expect(result.planningRecords.map((record) => record.kind)).toEqual([
      "location",
      "opportunity",
      "meeting_note",
      "equipment_request",
      "show",
      "merch",
      "media",
      "role",
    ]);
    expect(result.planningRecords[0]).toMatchObject({
      kind: "location",
      title: "Warehouse",
      sourcePath: "Locations.csv",
      projectTitle: "Archive, Dust Wave Feature",
      projectTitles: ["Archive", "Dust Wave Feature"],
      fields: {
        Name: "Warehouse",
        Type: "Interior",
      },
    });
  });
});
