import {
  type CanonicalDocument,
  type CanonicalEquipment,
  type CanonicalExpense,
  type CanonicalFilmProfile,
  type CanonicalProject,
  type CanonicalTask,
  type CanonicalWorkspaceSnapshot,
  type FilmProject,
  type OperationRecord,
  type ProjectDoc,
  type ProjectPhase,
  type Tone,
  type WorkspaceData,
} from "@film/schema";

export function reconcileCanonicalWorkspace(
  local: WorkspaceData,
  snapshot: CanonicalWorkspaceSnapshot,
  operations: OperationRecord[],
): WorkspaceData {
  const queued = operations.filter((operation) => operation.status === "queued");
  const localProjects = new Map(local.projects.map((project) => [project.id, project]));
  const profiles = new Map(snapshot.filmProfiles.map((profile) => [profile.projectId, profile]));
  const canonicalProjectIds = new Set(snapshot.projects.map((project) => project.id));
  const projects = snapshot.projects
    .filter((project) => project.status !== "archived")
    .map((project) => reconcileProject(
      project,
      profiles.get(project.id) ?? null,
      localProjects.get(project.id) ?? null,
      snapshot,
      queued,
    ));

  for (const operation of queued) {
    if (operation.kind !== "project.created" || canonicalProjectIds.has(operation.entityId)) continue;
    const project = localProjects.get(operation.entityId);
    if (project) projects.push(project);
  }

  return {
    ...local,
    id: snapshot.workspace.id,
    name: snapshot.workspace.name,
    archivedProjectCount: snapshot.projects.filter((project) => project.status === "archived").length,
    members: snapshot.members.map((member) => {
      const localMember = local.members.find((candidate) => candidate.id === member.id);
      return {
        id: member.id,
        displayName: member.displayName || localMember?.displayName || fallbackMemberName(member.role),
        emailHash: member.emailHash ?? localMember?.emailHash ?? "",
        role: member.role,
        status: member.status,
        lastSeenAt: member.lastSeenAt,
      };
    }),
    projects,
    restorePoints: snapshot.restorePoints,
  };
}

function reconcileProject(
  canonical: CanonicalProject,
  profile: CanonicalFilmProfile | null,
  local: FilmProject | null,
  snapshot: CanonicalWorkspaceSnapshot,
  queued: OperationRecord[],
): FilmProject {
  const canonicalTasks = snapshot.tasks.filter((task) => task.projectId === canonical.id);
  const canonicalDocuments = snapshot.documents.filter((document) => document.projectId === canonical.id);
  const canonicalEquipment = snapshot.equipment.filter((item) => item.projectId === canonical.id);
  const canonicalExpenses = snapshot.expenses.filter((expense) => expense.projectId === canonical.id);
  const peopleIds = new Set(snapshot.projectPeople
    .filter((item) => item.projectId === canonical.id)
    .map((item) => item.personId));
  const completedCount = canonicalTasks.filter((task) => isCompletedTaskStatus(task.status)).length;
  const openTasks = canonicalTasks
    .filter((task) => !isCompletedTaskStatus(task.status))
    .map((task) => canonicalTaskToLocal(task, local, queued));
  appendQueuedCreates(openTasks, local?.openTasks ?? [], queued, canonical.id, "task.created");
  const docs = canonicalDocuments.map((document) => canonicalDocumentToLocal(document, local, queued));
  appendQueuedCreates(docs, local?.docs ?? [], queued, canonical.id, "document.created");
  const equipment = canonicalEquipment.map((item) => canonicalEquipmentToLocal(item, local));
  appendQueuedCreates(equipment, local?.equipment ?? [], queued, canonical.id, "equipment.created");
  const expenses = canonicalExpenses.map((expense) => canonicalExpenseToLocal(expense));
  appendQueuedCreates(expenses, local?.expenses ?? [], queued, canonical.id, "expense.created");
  const people = snapshot.people
    .filter((person) => peopleIds.has(person.id))
    .map((person) => ({
      id: person.id,
      name: person.displayName,
      role: person.roleTags[0] ?? "Crew",
      initials: initialsFor(person.displayName),
    }));
  appendQueuedCreates(people, local?.people ?? [], queued, canonical.id, "person.created");
  const phase = localProjectPhase(canonical.phase);
  const totalTasks = completedCount + openTasks.length;

  return {
    id: canonical.id,
    title: canonical.title,
    type: canonical.projectType,
    runtimeMinutes: profile?.runtimeMinutes ?? local?.runtimeMinutes ?? 0,
    format: profile?.format ?? local?.format ?? "TBD",
    phase,
    phaseTone: toneForPhase(phase),
    color: local?.color ?? toneForPhase(phase),
    starred: local?.starred ?? false,
    progress: totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0,
    shootDates: formatShootDates(profile, local?.shootDates),
    spentBudget: (profile?.spentCents ?? 0) / 100,
    totalBudget: (profile?.budgetCents ?? 0) / 100,
    location: local?.location ?? "TBD",
    workflow: "Canonical workspace",
    description: canonical.logline ?? local?.description ?? "",
    tasks: { done: completedCount, total: totalTasks },
    timeline: local?.timeline ?? [],
    openTasks,
    docs,
    people,
    equipment,
    expenses,
    callSheet: local?.callSheet ?? emptyCallSheet(),
  };
}

function canonicalTaskToLocal(
  task: CanonicalTask,
  localProject: FilmProject | null,
  queued: OperationRecord[],
): FilmProject["openTasks"][number] {
  const local = localProject?.openTasks.find((candidate) => candidate.id === task.id);
  const hasQueuedUpdate = queued.some((operation) =>
    operation.entityId === task.id && (operation.kind === "task.updated" || operation.kind === "task.completed")
  );
  return {
    id: task.id,
    title: task.title,
    due: task.dueAt ?? "Unscheduled",
    status: hasQueuedUpdate && local ? local.status : localTaskStatus(task),
  };
}

function canonicalDocumentToLocal(
  document: CanonicalDocument,
  localProject: FilmProject | null,
  queued: OperationRecord[],
): ProjectDoc {
  const local = localProject?.docs.find((candidate) => candidate.id === document.id);
  const hasQueuedUpdate = queued.some((operation) => operation.entityId === document.id && operation.kind === "document.updated");
  return {
    ...local,
    id: document.id,
    name: document.title,
    date: document.updatedAt.slice(0, 10),
    type: localDocumentType(document.documentType, document.title),
    canonicalUpdatedAt: document.updatedAt,
    markdownSnapshot: hasQueuedUpdate || document.markdownTruncated
      ? local?.markdownSnapshot
      : document.markdownSnapshot ?? undefined,
  };
}

function canonicalEquipmentToLocal(
  item: CanonicalEquipment,
  localProject: FilmProject | null,
): FilmProject["equipment"][number] {
  const local = localProject?.equipment.find((candidate) => candidate.id === item.id);
  return {
    id: item.id,
    name: item.name,
    status: item.status,
    statusTone: isTone(item.equipmentType) ? item.equipmentType : local?.statusTone ?? "gray",
  };
}

function canonicalExpenseToLocal(expense: CanonicalExpense): FilmProject["expenses"][number] {
  const spent = expense.spentCents / 100;
  const budget = expense.budgetCents / 100;
  return {
    id: expense.id,
    category: expense.category,
    spent,
    budget,
    percent: budget > 0 ? Math.round((spent / budget) * 100) : 0,
  };
}

function appendQueuedCreates<T extends { id: string }>(
  target: T[],
  local: T[],
  queued: OperationRecord[],
  projectId: string,
  kind: OperationRecord["kind"],
): void {
  const ids = new Set(target.map((item) => item.id));
  for (const operation of queued) {
    if (operation.kind !== kind || operation.payload.projectId !== projectId || ids.has(operation.entityId)) continue;
    const item = local.find((candidate) => candidate.id === operation.entityId);
    if (!item) continue;
    target.push(item);
    ids.add(item.id);
  }
}

function localTaskStatus(task: CanonicalTask): FilmProject["openTasks"][number]["status"] {
  const status = task.status.toLowerCase();
  if (status === "ready" || status === "in_progress") return "ready";
  if (status === "overdue" || status === "blocked") return "overdue";
  if (task.dueAt && isPastDate(task.dueAt)) return "overdue";
  return "pending";
}

function isCompletedTaskStatus(status: string): boolean {
  return status === "done" || status === "completed";
}

function isPastDate(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

function localDocumentType(type: string, title: string): ProjectDoc["type"] {
  const normalized = type.toLowerCase();
  if (normalized === "markdown" || normalized === "native" || title.toLowerCase().endsWith(".md")) return "MD";
  if (title.toLowerCase().endsWith(".pdf")) return "PDF";
  if (title.toLowerCase().endsWith(".xlsx")) return "XLSX";
  if (title.toLowerCase().endsWith(".csv")) return "CSV";
  return "ASSET";
}

function localProjectPhase(value: string): ProjectPhase {
  const normalized = value.toLowerCase().replaceAll("_", "-");
  if (normalized === "pre-production") return "Pre-Production";
  if (normalized === "production") return "Production";
  if (normalized === "post-production") return "Post-Production";
  return "Development";
}

function toneForPhase(phase: ProjectPhase): Tone {
  if (phase === "Production") return "teal";
  if (phase === "Pre-Production") return "amber";
  if (phase === "Post-Production") return "blue";
  return "gray";
}

function isTone(value: string | null): value is Tone {
  return value === "teal" || value === "amber" || value === "blue" || value === "gray" || value === "red";
}

function formatShootDates(profile: CanonicalFilmProfile | null, fallback?: string): string {
  if (profile?.shootStart && profile.shootEnd) return `${profile.shootStart} - ${profile.shootEnd}`;
  return profile?.shootStart ?? profile?.shootEnd ?? fallback ?? "Unscheduled";
}

function fallbackMemberName(role: string): string {
  return role.split("_").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
}

function initialsFor(value: string): string {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "P";
}

function emptyCallSheet(): FilmProject["callSheet"] {
  return {
    day: "TBD",
    month: "Unscheduled",
    callTime: "TBD",
    wrapTime: "TBD",
    location: "TBD",
    dayNumber: 0,
    totalDays: 0,
    scenes: 0,
    pages: "0",
    people: 0,
    weather: "TBD",
  };
}
