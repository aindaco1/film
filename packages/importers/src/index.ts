import {
  cloneWorkspace,
  createEquipmentItem,
  createExpenseLine,
  createFilmProjectFromTemplate,
  createProjectDoc,
  createProjectPerson,
  createTask,
  type EquipmentItem,
  type ExpenseLine,
  type FilmProject,
  type ProjectPerson,
  type ProjectDoc,
  type ProjectPhase,
  type Tone,
  type WorkspaceData,
} from "@film/schema";

export * from "./screenplay-parser.ts";

export type NotionExportFile = {
  path: string;
  sizeBytes?: number;
  contentType?: string;
};

export type NotionExportContentFile = NotionExportFile & {
  text: string;
};

export type NotionExportImportFile = NotionExportFile & {
  text?: string;
};

export type NotionImportPreview = {
  source: "notion_zip_manifest";
  totalFiles: number;
  acceptedFiles: number;
  markdownDocuments: number;
  csvDatabases: number;
  assets: number;
  unsafeFiles: string[];
  oversizedFiles: string[];
  topLevelPages: string[];
  warnings: string[];
};

export type NotionImportCandidate = {
  kind: "page" | "database" | "asset";
  path: string;
  title: string;
  parentPath: string | null;
  sizeBytes?: number;
  contentType?: string;
};

export type NotionImportPlan = {
  preview: NotionImportPreview;
  candidates: NotionImportCandidate[];
};

export type AppliedNotionImportSummary = {
  source: "notion_export";
  filesRead: number;
  projectsCreated: number;
  tasksCreated: number;
  docsCreated: number;
  attachmentsImported: number;
  peopleCreated: number;
  equipmentCreated: number;
  expensesCreated: number;
  locationsMapped: number;
  opportunitiesMapped: number;
  meetingNotesMapped: number;
  equipmentRequestsMapped: number;
  showsMapped: number;
  merchMapped: number;
  mediaMapped: number;
  rolesMapped: number;
  skippedRows: number;
  warnings: string[];
};

export type NotionPlanningRecordKind =
  | "location"
  | "opportunity"
  | "meeting_note"
  | "equipment_request"
  | "show"
  | "merch"
  | "media"
  | "role";

export type NotionPlanningRecord = {
  kind: NotionPlanningRecordKind;
  title: string;
  sourcePath: string;
  projectTitle: string | null;
  projectTitles: string[];
  fields: Record<string, string>;
};

type NotionCoreRecordBase = {
  sourcePath: string;
  sourceKey: string;
  projectTitle: string;
};

export type NotionCoreRecord =
  | (NotionCoreRecordBase & {
    kind: "task";
    title: string;
    due: string;
    status: "overdue" | "pending" | "ready";
  })
  | (NotionCoreRecordBase & {
    kind: "document";
    title: string;
    documentType: "markdown" | "uploaded_file";
    markdownSnapshot: string | null;
  })
  | (NotionCoreRecordBase & {
    kind: "person";
    displayName: string;
    role: string;
  })
  | (NotionCoreRecordBase & {
    kind: "equipment";
    name: string;
    status: string;
  })
  | (NotionCoreRecordBase & {
    kind: "expense";
    category: string;
    spentCents: number;
    budgetCents: number;
  });

export type AppliedNotionImport = {
  workspace: WorkspaceData;
  summary: AppliedNotionImportSummary;
  plan: NotionImportPlan;
  coreRecords: NotionCoreRecord[];
  planningRecords: NotionPlanningRecord[];
};

export type NotionImportPreviewOptions = {
  maxFileBytes?: number;
  maxTopLevelPages?: number;
  maxCandidates?: number;
  maxMarkdownChars?: number;
  maxCsvChars?: number;
  maxCsvRows?: number;
  maxCsvColumns?: number;
  maxCsvCellChars?: number;
};

export type ScreenplayImportFile = {
  path: string;
  sizeBytes?: number;
  contentType?: string;
};

export type ScreenplayImportKind = "fountain" | "final_draft" | "grainery";

export type ScreenplayImportCandidate = {
  kind: ScreenplayImportKind;
  path: string;
  title: string;
  sizeBytes?: number;
  contentType?: string;
};

export type ScreenplayImportPreview = {
  source: "screenplay_file_manifest";
  totalFiles: number;
  acceptedFiles: number;
  screenplayFiles: number;
  fountainFiles: number;
  finalDraftFiles: number;
  graineryFiles: number;
  unsafeFiles: string[];
  oversizedFiles: string[];
  unsupportedFiles: string[];
  candidates: ScreenplayImportCandidate[];
  warnings: string[];
};

export type ScreenplayImportPreviewOptions = {
  maxFileBytes?: number;
  maxCandidates?: number;
};

const DEFAULT_MAX_FILE_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_SCREENPLAY_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_TOP_LEVEL_PAGES = 12;
const DEFAULT_MAX_MARKDOWN_CHARS = 100_000;
const DEFAULT_MAX_CSV_CHARS = 5_000_000;
const DEFAULT_MAX_CSV_ROWS = 2_000;
const DEFAULT_MAX_CSV_COLUMNS = 100;
const DEFAULT_MAX_CSV_CELL_CHARS = 8_192;
const SCREENPLAY_EXTENSIONS: Record<string, ScreenplayImportKind> = {
  ".fountain": "fountain",
  ".fdx": "final_draft",
  ".gwx": "grainery",
};
const ASSET_EXTENSIONS = new Set([
  ".aiff",
  ".doc",
  ".docx",
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".json",
  ".m4a",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".svg",
  ".tif",
  ".tiff",
  ".txt",
  ".wav",
  ".webp",
  ".xlsx",
]);

export function previewNotionExport(
  files: NotionExportFile[],
  options: NotionImportPreviewOptions = {},
): NotionImportPreview {
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxTopLevelPages = options.maxTopLevelPages ?? DEFAULT_MAX_TOP_LEVEL_PAGES;
  const unsafeFiles: string[] = [];
  const oversizedFiles: string[] = [];
  const topLevelPages = new Set<string>();
  let markdownDocuments = 0;
  let csvDatabases = 0;
  let assets = 0;
  let acceptedFiles = 0;

  for (const file of files) {
    const normalizedPath = normalizeImportPath(file.path);
    if (!normalizedPath) {
      unsafeFiles.push(file.path);
      continue;
    }

    if ((file.sizeBytes ?? 0) > maxFileBytes) {
      oversizedFiles.push(normalizedPath);
      continue;
    }

    acceptedFiles += 1;
    const extension = getExtension(normalizedPath);
    if (extension === ".md") {
      markdownDocuments += 1;
    } else if (extension === ".csv") {
      csvDatabases += 1;
    } else if (ASSET_EXTENSIONS.has(extension)) {
      assets += 1;
    }

    const pageName = inferTopLevelPageName(normalizedPath);
    if (pageName) topLevelPages.add(pageName);
  }

  const warnings: string[] = [];
  if (markdownDocuments === 0) {
    warnings.push("No Markdown pages found in the manifest.");
  }
  if (csvDatabases === 0) {
    warnings.push("No CSV database exports found in the manifest.");
  }
  if (unsafeFiles.length > 0) {
    warnings.push(`${unsafeFiles.length} unsafe paths ignored.`);
  }
  if (oversizedFiles.length > 0) {
    warnings.push(`${oversizedFiles.length} oversized files ignored.`);
  }

  return {
    source: "notion_zip_manifest",
    totalFiles: files.length,
    acceptedFiles,
    markdownDocuments,
    csvDatabases,
    assets,
    unsafeFiles,
    oversizedFiles,
    topLevelPages: [...topLevelPages].sort().slice(0, maxTopLevelPages),
    warnings,
  };
}

export function planNotionImport(
  files: NotionExportFile[],
  options: NotionImportPreviewOptions = {},
): NotionImportPlan {
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxCandidates = options.maxCandidates ?? 50;
  const candidates: NotionImportCandidate[] = [];

  for (const file of files) {
    const normalizedPath = normalizeImportPath(file.path);
    if (!normalizedPath || (file.sizeBytes ?? 0) > maxFileBytes) {
      continue;
    }

    const kind = classifyImportCandidate(normalizedPath);
    if (!kind) continue;

    candidates.push({
      kind,
      path: normalizedPath,
      title: inferItemTitle(normalizedPath),
      parentPath: inferParentPath(normalizedPath),
      sizeBytes: file.sizeBytes,
      contentType: file.contentType,
    });
  }

  const preview = previewNotionExport(files, options);
  const candidateLimit = Number.isFinite(maxCandidates) ? Math.max(0, Math.floor(maxCandidates)) : 50;
  const prioritizedCandidates = candidates.length > candidateLimit
    ? [...candidates].sort((left, right) => importWeight(left.path) - importWeight(right.path))
    : candidates;
  const acceptedCandidates = prioritizedCandidates.slice(0, candidateLimit);
  if (candidates.length > acceptedCandidates.length) {
    preview.warnings.push(`${candidates.length - acceptedCandidates.length} import candidates omitted by the candidate cap.`);
  }

  return { preview, candidates: acceptedCandidates };
}

export function previewScreenplayFiles(
  files: ScreenplayImportFile[],
  options: ScreenplayImportPreviewOptions = {},
): ScreenplayImportPreview {
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_SCREENPLAY_FILE_BYTES;
  const maxCandidates = options.maxCandidates ?? 20;
  const unsafeFiles: string[] = [];
  const oversizedFiles: string[] = [];
  const unsupportedFiles: string[] = [];
  const candidates: ScreenplayImportCandidate[] = [];

  for (const file of files) {
    const normalizedPath = normalizeImportPath(file.path);
    if (!normalizedPath) {
      unsafeFiles.push(file.path);
      continue;
    }
    const kind = SCREENPLAY_EXTENSIONS[getExtension(normalizedPath)];
    if (!kind) {
      unsupportedFiles.push(normalizedPath);
      continue;
    }
    if ((file.sizeBytes ?? 0) > maxFileBytes) {
      oversizedFiles.push(normalizedPath);
      continue;
    }

    candidates.push({
      kind,
      path: normalizedPath,
      title: inferItemTitle(normalizedPath),
      sizeBytes: file.sizeBytes,
      contentType: file.contentType,
    });
  }

  const acceptedCandidates = candidates.slice(0, maxCandidates);
  const warnings: string[] = [];
  if (acceptedCandidates.length === 0) {
    warnings.push("No supported screenplay files found.");
  }
  if (unsafeFiles.length > 0) {
    warnings.push(`${unsafeFiles.length} unsafe screenplay paths ignored.`);
  }
  if (oversizedFiles.length > 0) {
    warnings.push(`${oversizedFiles.length} oversized screenplay files ignored.`);
  }
  if (unsupportedFiles.length > 0) {
    warnings.push(`${unsupportedFiles.length} unsupported screenplay files ignored.`);
  }
  if (candidates.length > acceptedCandidates.length) {
    warnings.push(`${candidates.length - acceptedCandidates.length} screenplay files omitted by the candidate cap.`);
  }

  return {
    source: "screenplay_file_manifest",
    totalFiles: files.length,
    acceptedFiles: acceptedCandidates.length,
    screenplayFiles: acceptedCandidates.length,
    fountainFiles: acceptedCandidates.filter((candidate) => candidate.kind === "fountain").length,
    finalDraftFiles: acceptedCandidates.filter((candidate) => candidate.kind === "final_draft").length,
    graineryFiles: acceptedCandidates.filter((candidate) => candidate.kind === "grainery").length,
    unsafeFiles,
    oversizedFiles,
    unsupportedFiles,
    candidates: acceptedCandidates,
    warnings,
  };
}

export function applyNotionImport(
  currentWorkspace: WorkspaceData,
  files: NotionExportImportFile[],
  selectedProjectId: string,
  options: NotionImportPreviewOptions = {},
): AppliedNotionImport {
  const workspace = cloneWorkspace(currentWorkspace);
  const plan = planNotionImport(files, options);
  const plannedPaths = new Set(plan.candidates.map((candidate) => candidate.path));
  const selectedProject = findProject(workspace, selectedProjectId) ?? workspace.projects[0];
  const coreRecords: NotionCoreRecord[] = [];
  const planningRecords: NotionPlanningRecord[] = [];
  const summary: AppliedNotionImportSummary = {
    source: "notion_export",
    filesRead: 0,
    projectsCreated: 0,
    tasksCreated: 0,
    docsCreated: 0,
    attachmentsImported: 0,
    peopleCreated: 0,
    equipmentCreated: 0,
    expensesCreated: 0,
    locationsMapped: 0,
    opportunitiesMapped: 0,
    meetingNotesMapped: 0,
    equipmentRequestsMapped: 0,
    showsMapped: 0,
    merchMapped: 0,
    mediaMapped: 0,
    rolesMapped: 0,
    skippedRows: 0,
    warnings: [...plan.preview.warnings],
  };

  if (!selectedProject) {
    return {
      workspace,
      summary: {
        ...summary,
        warnings: [...summary.warnings, "No Film project is available to receive imported records."],
      },
      plan,
      coreRecords,
      planningRecords,
    };
  }

  for (const file of sortContentFilesForImport(files)) {
    const normalizedPath = normalizeImportPath(file.path);
    if (
      !normalizedPath
      || !plannedPaths.has(normalizedPath)
      || (file.sizeBytes ?? 0) > (options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES)
    ) {
      continue;
    }
    plannedPaths.delete(normalizedPath);

    const extension = getExtension(normalizedPath);
    if (extension === ".md" && typeof file.text === "string") {
      summary.filesRead += 1;
      const title = inferItemTitle(normalizedPath);
      const project = findProjectByPathParent(workspace, normalizedPath)
        ?? findProjectByPageTitle(workspace, normalizedPath)
        ?? selectedProject;
      const markdownSnapshot = truncateMarkdown(file.text, options.maxMarkdownChars ?? DEFAULT_MAX_MARKDOWN_CHARS, summary);
      const doc = createProjectDoc(title, "MD", {
        date: "Imported",
        sourcePath: normalizedPath,
        markdownSnapshot,
      });
      if (addDoc(project, doc.name, () => doc)) {
        summary.docsCreated += 1;
        coreRecords.push({
          kind: "document",
          sourcePath: normalizedPath,
          sourceKey: "page",
          projectTitle: project.title,
          title: doc.name,
          documentType: "markdown",
          markdownSnapshot,
        });
      }
    } else if (extension === ".csv" && typeof file.text === "string") {
      summary.filesRead += 1;
      applyCsvDatabase(workspace, selectedProject, normalizedPath, file.text, summary, coreRecords, planningRecords, options);
    } else if (classifyImportCandidate(normalizedPath) === "asset") {
      const project = findProjectByPathParent(workspace, normalizedPath) ?? selectedProject;
      const fileName = inferFileName(normalizedPath);
      const doc = createProjectDoc(fileName, docTypeFromName(fileName), {
        date: "Imported asset",
        sourcePath: normalizedPath,
        sourceSizeBytes: file.sizeBytes,
        sourceContentType: file.contentType,
        attachmentStatus: "metadata_only",
      });
      if (addDoc(project, doc.name, () => doc)) {
        summary.attachmentsImported += 1;
        coreRecords.push({
          kind: "document",
          sourcePath: normalizedPath,
          sourceKey: "asset",
          projectTitle: project.title,
          title: doc.name,
          documentType: "uploaded_file",
          markdownSnapshot: null,
        });
      }
    }
  }

  return { workspace, summary, plan, coreRecords, planningRecords };
}

function normalizeImportPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("\0") || trimmed.includes("\\") || trimmed.startsWith("/")) {
    return null;
  }
  if (/^[a-zA-Z]:/.test(trimmed)) {
    return null;
  }

  const segments = trimmed.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return null;
  }
  if (segments[0] === "__MACOSX") {
    return null;
  }

  return segments.join("/");
}

function classifyImportCandidate(value: string): NotionImportCandidate["kind"] | null {
  const extension = getExtension(value);
  if (extension === ".md") return "page";
  if (extension === ".csv") return "database";
  if (ASSET_EXTENSIONS.has(extension)) return "asset";
  return null;
}

function applyCsvDatabase(
  workspace: WorkspaceData,
  fallbackProject: FilmProject,
  path: string,
  text: string,
  summary: AppliedNotionImportSummary,
  coreRecords: NotionCoreRecord[],
  planningRecords: NotionPlanningRecord[],
  options: NotionImportPreviewOptions,
): void {
  const rows = parseCsv(text, summary, options);
  const tableName = inferItemTitle(path).toLowerCase();

  if (tableName.includes("project")) {
    for (const row of rows) {
      const title = firstValue(row, ["Name", "Project", "Project Name", "Title"]);
      if (!title) {
        summary.skippedRows += 1;
        continue;
      }
      if (workspace.projects.some((project) => sameText(project.title, title))) {
        summary.skippedRows += 1;
        continue;
      }

      const project = createFilmProjectFromTemplate(title);
      const phase = mapPhase(firstValue(row, ["Phase", "Status"]));
      const totalBudget = parseMoney(firstValue(row, ["Budget", "Total Budget", "Budget Total"]));
      project.description = firstValue(row, ["Description", "Logline", "Notes"]) || project.description;
      if (phase) {
        project.phase = phase;
        project.phaseTone = phaseTone(phase);
        project.color = project.phaseTone;
      }
      if (totalBudget > 0) project.totalBudget = totalBudget;
      workspace.projects.unshift(project);
      summary.projectsCreated += 1;
    }
    return;
  }

  if (tableName.includes("task")) {
    for (const [rowIndex, row] of rows.entries()) {
      const title = firstValue(row, ["Name", "Task", "Title"]);
      if (!title) {
        summary.skippedRows += 1;
        continue;
      }
      const project = findProjectByRow(workspace, row) ?? fallbackProject;
      const task = createTask(title);
      task.due = firstValue(row, ["Due Date", "Due", "Date"]) || "Imported";
      task.status = mapTaskStatus(firstValue(row, ["Status", "Done", "Priority"]));
      project.openTasks.unshift(task);
      project.tasks.total += 1;
      summary.tasksCreated += 1;
      coreRecords.push({
        kind: "task",
        sourcePath: path,
        sourceKey: `row:${rowIndex}`,
        projectTitle: project.title,
        title: task.title,
        due: task.due,
        status: task.status,
      });
    }
    return;
  }

  if (tableName.includes("doc")) {
    for (const [rowIndex, row] of rows.entries()) {
      const title = firstValue(row, ["Name", "Document", "Title"]);
      if (!title) {
        summary.skippedRows += 1;
        continue;
      }
      const project = findProjectByRow(workspace, row) ?? fallbackProject;
      const doc = createProjectDoc(title, docTypeFromName(title), { date: "Imported", sourcePath: path });
      if (addDoc(project, title, () => doc)) {
        summary.docsCreated += 1;
        coreRecords.push({
          kind: "document",
          sourcePath: path,
          sourceKey: `row:${rowIndex}`,
          projectTitle: project.title,
          title: doc.name,
          documentType: doc.type === "MD" ? "markdown" : "uploaded_file",
          markdownSnapshot: doc.markdownSnapshot ?? null,
        });
      }
    }
    return;
  }

  if (tableName.includes("people") || tableName.includes("person") || tableName.includes("crew")) {
    for (const [rowIndex, row] of rows.entries()) {
      const name = firstValue(row, ["Name", "Person", "Display Name"]);
      if (!name) {
        summary.skippedRows += 1;
        continue;
      }
      const project = findProjectByRow(workspace, row) ?? fallbackProject;
      const person: ProjectPerson = createProjectPerson(
        name,
        firstValue(row, ["Role", "Role Tags", "Project Role"]) || "Imported",
      );
      if (!project.people.some((item) => sameText(item.name, person.name))) {
        project.people.unshift(person);
        summary.peopleCreated += 1;
        coreRecords.push({
          kind: "person",
          sourcePath: path,
          sourceKey: `row:${rowIndex}`,
          projectTitle: project.title,
          displayName: person.name,
          role: person.role,
        });
      }
    }
    return;
  }

  if (tableName.includes("equipment request") || tableName.includes("checkout")) {
    summary.equipmentRequestsMapped += collectPlanningRows(rows, ["Name", "Equipment", "Request", "Title"], summary, planningRecords, "equipment_request", path);
    return;
  }

  if (tableName.includes("equipment")) {
    for (const [rowIndex, row] of rows.entries()) {
      const name = firstValue(row, ["Name", "Equipment", "Item"]);
      if (!name) {
        summary.skippedRows += 1;
        continue;
      }
      const project = findProjectByRow(workspace, row) ?? fallbackProject;
      const item: EquipmentItem = {
        ...createEquipmentItem(name, firstValue(row, ["Status", "Location"]) || "Imported"),
        statusTone: "blue",
      };
      if (!project.equipment.some((existing) => sameText(existing.name, item.name))) {
        project.equipment.unshift(item);
        summary.equipmentCreated += 1;
        coreRecords.push({
          kind: "equipment",
          sourcePath: path,
          sourceKey: `row:${rowIndex}`,
          projectTitle: project.title,
          name: item.name,
          status: item.status,
        });
      }
    }
    return;
  }

  if (tableName.includes("location")) {
    summary.locationsMapped += collectPlanningRows(rows, ["Name", "Location", "City", "Title"], summary, planningRecords, "location", path);
    return;
  }

  if (tableName.includes("opportunit") || tableName.includes("grant") || tableName.includes("festival")) {
    summary.opportunitiesMapped += collectPlanningRows(rows, ["Name", "Opportunity", "Title"], summary, planningRecords, "opportunity", path);
    return;
  }

  if (tableName.includes("meeting")) {
    summary.meetingNotesMapped += collectPlanningRows(rows, ["Name", "Meeting", "Title", "Date"], summary, planningRecords, "meeting_note", path);
    return;
  }

  if (tableName.includes("show")) {
    summary.showsMapped += collectPlanningRows(rows, ["Name", "Show", "Title"], summary, planningRecords, "show", path);
    return;
  }

  if (tableName.includes("merch")) {
    summary.merchMapped += collectPlanningRows(rows, ["Name", "Merch", "Item", "Title"], summary, planningRecords, "merch", path);
    return;
  }

  if (tableName.includes("media") || tableName.includes("reading")) {
    summary.mediaMapped += collectPlanningRows(rows, ["Name", "Media", "Article", "Title"], summary, planningRecords, "media", path);
    return;
  }

  if (tableName === "roles" || tableName.includes("production roles")) {
    summary.rolesMapped += collectPlanningRows(rows, ["Name", "Role", "Title"], summary, planningRecords, "role", path);
    return;
  }

  if (tableName.includes("expense") || tableName.includes("budget")) {
    for (const [rowIndex, row] of rows.entries()) {
      const category = firstValue(row, ["Category", "Type", "Name", "Expense"]) || "Imported";
      const spent = parseMoney(firstValue(row, ["Amount", "Cost", "Spent"]));
      if (spent <= 0) {
        summary.skippedRows += 1;
        continue;
      }
      const project = findProjectByRow(workspace, row) ?? fallbackProject;
      const budget = parseMoney(firstValue(row, ["Budget"])) || spent;
      const expense: ExpenseLine = createExpenseLine(category, spent, budget);
      project.expenses.unshift(expense);
      summary.expensesCreated += 1;
      coreRecords.push({
        kind: "expense",
        sourcePath: path,
        sourceKey: `row:${rowIndex}`,
        projectTitle: project.title,
        category: expense.category,
        spentCents: Math.round(expense.spent * 100),
        budgetCents: Math.round(expense.budget * 100),
      });
    }
    return;
  }

  const docName = inferItemTitle(path);
  const project = findProjectByPathParent(workspace, path) ?? fallbackProject;
  const doc = createProjectDoc(docName, "CSV", { date: "Imported", sourcePath: path });
  if (addDoc(project, docName, () => doc)) {
    summary.docsCreated += 1;
    coreRecords.push({
      kind: "document",
      sourcePath: path,
      sourceKey: "database",
      projectTitle: project.title,
      title: doc.name,
      documentType: "uploaded_file",
      markdownSnapshot: null,
    });
  }
  summary.warnings.push(`Imported unknown CSV database as a document: ${docName}.`);
}

function collectPlanningRows(
  rows: Record<string, string>[],
  titleKeys: string[],
  summary: AppliedNotionImportSummary,
  planningRecords: NotionPlanningRecord[],
  kind: NotionPlanningRecordKind,
  sourcePath: string,
): number {
  let mapped = 0;
  for (const row of rows) {
    const title = firstValue(row, titleKeys);
    if (!title) {
      summary.skippedRows += 1;
      continue;
    }

    const projectTitle = firstValue(row, ["Related Project", "Related Projects", "Project", "Projects", "Film"]) || null;
    planningRecords.push({
      kind,
      title,
      sourcePath,
      projectTitle,
      projectTitles: projectTitle ? relationListTitles(projectTitle).slice(0, 20) : [],
      fields: normalizePlanningFields(row),
    });
    mapped += 1;
  }
  return mapped;
}

function normalizePlanningFields(row: Record<string, string>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(row).slice(0, 40)) {
    const normalizedKey = key.trim().slice(0, 80);
    const normalizedValue = value.trim().slice(0, 500);
    if (normalizedKey && normalizedValue) {
      fields[normalizedKey] = normalizedValue;
    }
  }
  return fields;
}

function sortContentFilesForImport<T extends NotionExportFile>(files: T[]): T[] {
  return [...files].sort((left, right) => importWeight(left.path) - importWeight(right.path));
}

function importWeight(path: string): number {
  const title = inferItemTitle(path).toLowerCase();
  const extension = getExtension(path);
  if (extension === ".csv" && title.includes("project")) return 0;
  if (extension === ".csv") return 1;
  if (extension === ".md") return 2;
  return 3;
}

function parseCsv(
  text: string,
  summary: AppliedNotionImportSummary,
  options: NotionImportPreviewOptions,
): Record<string, string>[] {
  const maxChars = boundedCsvLimit(options.maxCsvChars, DEFAULT_MAX_CSV_CHARS);
  const maxRows = boundedCsvLimit(options.maxCsvRows, DEFAULT_MAX_CSV_ROWS);
  const maxColumns = boundedCsvLimit(options.maxCsvColumns, DEFAULT_MAX_CSV_COLUMNS);
  const maxCellChars = boundedCsvLimit(options.maxCsvCellChars, DEFAULT_MAX_CSV_CELL_CHARS);
  const input = text.slice(0, maxChars);
  const inputWasTruncated = input.length < text.length;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let stoppedAtRowLimit = false;

  if (inputWasTruncated) {
    pushUniqueWarning(summary, `One or more CSV databases were truncated to ${maxChars.toLocaleString("en-US")} characters.`);
  }

  const appendCell = (value: string): void => {
    const remaining = maxCellChars - cell.length;
    if (remaining > 0) cell += value.slice(0, remaining);
    if (value.length > Math.max(0, remaining)) {
      pushUniqueWarning(summary, `One or more CSV cells were truncated to ${maxCellChars.toLocaleString("en-US")} characters.`);
    }
  };

  const finishCell = (): void => {
    if (row.length < maxColumns) {
      row.push(cell);
    } else {
      pushUniqueWarning(summary, `One or more CSV rows exceeded the ${maxColumns.toLocaleString("en-US")}-column import limit.`);
    }
    cell = "";
  };

  const finishRow = (): boolean => {
    finishCell();
    if (row.some((value) => value.trim())) {
      if (rows.length >= maxRows + 1) {
        pushUniqueWarning(summary, `One or more CSV databases exceeded the ${maxRows.toLocaleString("en-US")}-row import limit.`);
        row = [];
        return false;
      }
      rows.push(row);
    }
    row = [];
    return true;
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      appendCell("\"");
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      finishCell();
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      if (!finishRow()) {
        stoppedAtRowLimit = true;
        break;
      }
    } else {
      appendCell(char);
    }
  }

  if (!stoppedAtRowLimit && inQuotes) {
    pushUniqueWarning(summary, "One or more CSV databases ended with an incomplete quoted row; that row was ignored.");
  } else if (!stoppedAtRowLimit && !inputWasTruncated && (row.length > 0 || cell.length > 0)) {
    finishRow();
  }

  const [rawHeaders = [], ...dataRows] = rows;
  const headers: Array<{ name: string; index: number }> = [];
  const headerNames = new Set<string>();
  let ambiguousHeaders = false;
  rawHeaders.forEach((rawHeader, index) => {
    const name = sanitizeCsvValue(index === 0 ? rawHeader.replace(/^\uFEFF/, "") : rawHeader).trim();
    const key = name.toLowerCase();
    if (!name || headerNames.has(key)) {
      ambiguousHeaders = true;
      return;
    }
    headerNames.add(key);
    headers.push({ name, index });
  });
  if (ambiguousHeaders) {
    pushUniqueWarning(summary, "One or more CSV databases contained empty or duplicate headers; ambiguous columns were ignored.");
  }

  return dataRows.map((values) => {
    const record = Object.create(null) as Record<string, string>;
    headers.forEach((header) => {
      record[header.name] = sanitizeCsvValue(values[header.index] ?? "").trim();
    });
    return record;
  });
}

function boundedCsvLimit(value: number | undefined, defaultLimit: number): number {
  if (value === undefined || !Number.isFinite(value)) return defaultLimit;
  return Math.min(defaultLimit, Math.max(0, Math.floor(value)));
}

function sanitizeCsvValue(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function pushUniqueWarning(summary: AppliedNotionImportSummary, warning: string): void {
  if (!summary.warnings.includes(warning)) summary.warnings.push(warning);
}

function addDoc(project: FilmProject, _name: string, create: () => ReturnType<typeof createProjectDoc>): boolean {
  const doc = create();
  const existing = project.docs.find((item) => sameText(item.name, doc.name));
  if (existing) {
    if (
      doc.sourcePath
      || doc.markdownSnapshot
      || typeof doc.sourceSizeBytes === "number"
      || doc.sourceContentType
    ) {
      existing.date = doc.date;
      existing.type = doc.type;
      existing.sourcePath = doc.sourcePath;
      existing.sourceSizeBytes = doc.sourceSizeBytes;
      existing.sourceContentType = doc.sourceContentType;
      existing.attachmentStatus = doc.attachmentStatus;
      existing.attachmentStorageKey = doc.attachmentStorageKey;
      existing.attachmentSha256 = doc.attachmentSha256;
      existing.attachmentStagedAt = doc.attachmentStagedAt;
      existing.markdownSnapshot = doc.markdownSnapshot;
      return true;
    }
    return false;
  }
  project.docs.unshift(doc);
  return true;
}

function findProjectByRow(workspace: WorkspaceData, row: Record<string, string>): FilmProject | undefined {
  const relatedProject = firstValue(row, ["Related Project", "Related Projects", "Project", "Projects", "Related Show", "Show", "Film"]);
  if (!relatedProject) return undefined;
  const relationTitles = relationListTitles(relatedProject);
  return workspace.projects.find((project) => relationTitles.some((title) => sameText(project.title, title)));
}

function findProjectByPathParent(workspace: WorkspaceData, path: string): FilmProject | undefined {
  const parentPath = inferParentPath(path);
  if (!parentPath) return undefined;
  const parentTitle = inferItemTitle(parentPath);
  return workspace.projects.find((project) => sameText(project.title, parentTitle));
}

function findProjectByPageTitle(workspace: WorkspaceData, path: string): FilmProject | undefined {
  if (inferParentPath(path) || getExtension(path) !== ".md") return undefined;
  const title = inferItemTitle(path);
  return workspace.projects.find((project) => sameText(project.title, title));
}

function findProject(workspace: WorkspaceData, id: string): FilmProject | undefined {
  return workspace.projects.find((project) => project.id === id);
}

function firstValue(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const exact = row[key]?.trim();
    if (exact) return exact;
    const foundKey = Object.keys(row).find((candidate) => sameText(candidate, key));
    const found = foundKey ? row[foundKey]?.trim() : "";
    if (found) return found;
  }
  return "";
}

function mapPhase(value: string): ProjectPhase | null {
  const normalized = value.toLowerCase();
  if (normalized.includes("post")) return "Post-Production";
  if (normalized.includes("pre")) return "Pre-Production";
  if (normalized.includes("production")) return "Production";
  if (normalized.includes("development") || normalized.includes("pitch")) return "Development";
  return null;
}

function phaseTone(phase: ProjectPhase): Tone {
  if (phase === "Production") return "teal";
  if (phase === "Pre-Production") return "amber";
  if (phase === "Development") return "blue";
  return "gray";
}

function mapTaskStatus(value: string): ReturnType<typeof createTask>["status"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("overdue") || normalized.includes("urgent")) return "overdue";
  if (normalized.includes("done") || normalized.includes("complete") || normalized.includes("ready")) return "ready";
  return "pending";
}

function docTypeFromName(value: string): ProjectDoc["type"] {
  const extension = getExtension(value);
  if (extension === ".pdf") return "PDF";
  if (extension === ".xlsx" || extension === ".xls") return "XLSX";
  if (extension === ".csv") return "CSV";
  if (extension === ".md") return "MD";
  if (extension) return "ASSET";
  return "MD";
}

function parseMoney(value: string): number {
  const normalized = value.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function truncateMarkdown(
  value: string,
  maxChars: number,
  summary: AppliedNotionImportSummary,
): string {
  if (value.length <= maxChars) return value;
  summary.warnings.push("One or more Markdown pages were truncated for local import.");
  return value.slice(0, maxChars);
}

function relationListTitles(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => inferItemTitle(item.trim()))
    .filter(Boolean);
}

function sameText(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function inferTopLevelPageName(value: string): string | null {
  const [firstSegment] = value.split("/");
  if (!firstSegment) return null;

  const withoutExtension = firstSegment.replace(/\.[^.]+$/, "");
  const withoutNotionId = withoutExtension.replace(/\s+[0-9a-f]{32}$/i, "");
  return withoutNotionId.trim() || null;
}

function inferItemTitle(value: string): string {
  const fileName = value.split("/").at(-1) ?? value;
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const withoutNotionId = withoutExtension.replace(/\s+[0-9a-f]{32}$/i, "");
  return withoutNotionId.trim() || fileName;
}

function inferFileName(value: string): string {
  const fileName = value.split("/").at(-1) ?? value;
  const extension = getExtension(fileName);
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
  const withoutNotionId = baseName.replace(/\s+[0-9a-f]{32}$/i, "").trim() || baseName;
  return `${withoutNotionId}${extension}`;
}

function inferParentPath(value: string): string | null {
  const segments = value.split("/");
  if (segments.length <= 1) return null;
  return segments.slice(0, -1).join("/");
}

function getExtension(value: string): string {
  const dotIndex = value.lastIndexOf(".");
  return dotIndex >= 0 ? value.slice(dotIndex).toLowerCase() : "";
}
