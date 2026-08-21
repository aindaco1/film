import type { FilmProject, ProjectDoc } from "@film/schema";

type SearchTerm = string | number | boolean | null | undefined;

export function filterProjectsBySearch(projects: FilmProject[], query: string): FilmProject[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return projects;

  return projects.filter((project) => projectMatchesSearch(project, normalizedQuery));
}

export function projectMatchesSearch(project: FilmProject, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const haystack = collectProjectSearchTerms(project)
    .map((term) => normalizeSearchText(term))
    .filter(Boolean)
    .join(" ");

  if (haystack.includes(normalizedQuery)) return true;

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return tokens.length > 1 && tokens.every((token) => haystack.includes(token));
}

function collectProjectSearchTerms(project: FilmProject): SearchTerm[] {
  return [
    project.id,
    project.title,
    project.type,
    project.format,
    project.phase,
    project.phaseTone,
    project.color,
    project.runtimeMinutes,
    project.progress,
    project.shootDates,
    project.spentBudget,
    project.totalBudget,
    project.location,
    project.workflow,
    project.description,
    project.tasks.done,
    project.tasks.total,
    project.callSheet.day,
    project.callSheet.month,
    project.callSheet.callTime,
    project.callSheet.wrapTime,
    project.callSheet.location,
    project.callSheet.dayNumber,
    project.callSheet.totalDays,
    project.callSheet.scenes,
    project.callSheet.pages,
    project.callSheet.people,
    project.callSheet.weather,
    ...project.timeline.flatMap((item) => [
      item.month,
      item.label,
      item.tone,
    ]),
    ...project.openTasks.flatMap((task) => [
      task.id,
      task.title,
      task.due,
      task.status,
    ]),
    ...project.docs.flatMap((doc) => [
      doc.id,
      doc.name,
      doc.date,
      doc.type,
      doc.sourcePath,
      doc.sourceContentType,
      doc.attachmentStatus,
      formatAttachmentStatus(doc),
      doc.attachmentStorageKey,
      doc.attachmentR2ObjectKey,
    ]),
    ...project.people.flatMap((person) => [
      person.id,
      person.name,
      person.role,
      person.initials,
    ]),
    ...project.equipment.flatMap((item) => [
      item.id,
      item.name,
      item.status,
      item.statusTone,
    ]),
    ...project.expenses.flatMap((line) => [
      line.id,
      line.category,
      line.spent,
      line.budget,
      line.percent,
    ]),
  ];
}

function formatAttachmentStatus(doc: ProjectDoc): string | undefined {
  if (doc.attachmentStatus === "staged_local") return "Staged local";
  if (doc.attachmentStatus === "metadata_only") return "Metadata only";
  if (doc.attachmentStatus === "r2_dry_run") return "R2 dry run";
  if (doc.attachmentStatus === "stored_r2") return "Stored R2";
  return undefined;
}

function normalizeSearchText(value: SearchTerm): string {
  if (value === null || value === undefined) return "";

  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
