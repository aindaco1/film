import {
  formatCurrency,
  formatWorkspaceRole,
  type FilmProject,
  type ProjectDoc,
  type WorkspaceData,
} from "@film/schema";
import {
  expenseCategoryLabel,
  formatDocStatus,
  formatShortDateTime,
  formatTaskStatus,
  formatWorkspaceMemberStatus,
  packetText,
  shortHash,
} from "./presentation-format";
import { budgetTopSheetForProject, productionCallSheetStripCount, productionSummaryForProject, taskSummaryForProject, type ProductionSummarySource } from "./project-summary";

export type LocalHandoffPlanningRow = {
  kindLabel: string;
  title: string;
  projectLabel: string;
  fields: Record<string, unknown>;
  sourceLabel: string;
};

type MarkdownHandoff = {
  title: string;
  exportedAt: string;
  workspaceName?: string;
  metadata?: string[];
  policy: string;
  body: string[];
};

function createMarkdownHandoff(handoff: MarkdownHandoff): string {
  const lines = [
    `# ${packetText(handoff.title)}`,
    "",
    `Exported: ${packetText(handoff.exportedAt)}`,
    ...(handoff.workspaceName ? [`Workspace: ${packetText(handoff.workspaceName)}`] : []),
    ...(handoff.metadata ?? []),
    `Policy: ${handoff.policy}`,
    "",
    ...handoff.body,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function planningFields(fields: Record<string, unknown>): string {
  const entries = Object.entries(fields)
    .slice(0, 6)
    .map(([key, value]) => `${packetText(key)}=${packetText(String(value ?? ""))}`)
    .filter((entry) => entry !== "=");
  return entries.length ? entries.join("; ") : "No fields";
}

export function createProjectPacketMarkdown(
  workspaceName: string,
  project: FilmProject,
  planningRows: LocalHandoffPlanningRow[],
  exportedAt: string,
  productionSource?: ProductionSummarySource,
): string {
  const production = productionSummaryForProject(project, productionSource, exportedAt.slice(0, 10));
  const callSheet = production.callSheet;
  const tasks = taskSummaryForProject(project);
  const budget = budgetTopSheetForProject(project);
  return createMarkdownHandoff({
    title: project.title,
    exportedAt,
    workspaceName,
    policy: "provider secrets, OAuth tokens, raw attachment bytes, and private Worker state are excluded.",
    body: [
      "## Summary",
      `- Type: ${packetText(project.type)}`,
      `- Phase: ${packetText(project.phase)}`,
      `- Shoot dates: ${packetText(production.shootDates)}`,
      `- Location: ${packetText(project.location)}`,
      `- Runtime: ${project.runtimeMinutes} minutes`,
      `- Format: ${packetText(project.format)}`,
      `- Tasks completed: ${tasks.done} of ${tasks.total}`,
      `- Budget: ${formatCurrency(budget.spent)} spent of ${formatCurrency(budget.totalBudget)} (${budget.spendSource})`,
      `- Workflow: ${packetText(project.workflow)}`,
      "",
      "## Logline",
      packetText(project.description) || "No logline recorded.",
      "",
      "## Production Overview",
      `- Latest edited schedule: ${packetText(production.schedule?.title ?? "None")}`,
      `- Source scenes: ${production.sceneCount}`,
      `- Shoot days: ${production.days.length}`,
      `- Assigned strips: ${production.assignedStrips}`,
      `- Unassigned strips: ${production.unassignedStrips}`,
      `- Issued reports: ${production.issuedReports}`,
      "",
      "## Call Sheet",
      ...(callSheet ? [
        `- ${production.callSheetLabel}: ${packetText(callSheet.title)} (${callSheet.status})`,
        `- Date: ${callSheet.date ?? "Not set"}`,
        `- Call: ${packetText(callSheet.callTime)}`,
        `- Wrap: ${packetText(callSheet.estimatedWrapTime)}`,
        `- Location: ${packetText(callSheet.primaryLocation)}`,
        `- Day: ${callSheet.dayOrdinal}`,
        `- Scenes: ${callSheet.sceneIds.length}`,
        `- Scheduled strips: ${productionCallSheetStripCount(callSheet)}`,
      ] : ["No generated call sheet."]),
      "",
      "## Planning Rows",
      ...(planningRows.length
        ? planningRows.map((row) => `- ${packetText(row.kindLabel)}: ${packetText(row.title)} - ${planningFields(row.fields)}`)
        : ["No planning rows in the local review cache."]),
      "",
      "## Date-Driven Tasks",
      ...project.openTasks.map((task) => `- [${packetText(formatTaskStatus(task.status))}] ${packetText(task.title)} - due ${packetText(task.due)}`),
      "",
      "## Documents",
      ...project.docs.map((doc) => `- ${packetText(doc.name)} (${packetText(doc.type)}) - ${packetText(formatDocStatus(doc))}`),
      "",
      "## People",
      ...project.people.map((person) => `- ${packetText(person.name)} - ${packetText(person.role)}`),
      "",
      "## Equipment",
      ...project.equipment.map((item) => `- ${packetText(item.name)} - ${packetText(item.status)}`),
      "",
      "## Expenses",
      ...project.expenses.map((expense) => `- ${packetText(expenseCategoryLabel(expense))} - ${formatCurrency(expense.spent)} spent of ${formatCurrency(expense.budget)} (${expense.percent}%)`),
    ],
  });
}

export function createActivityLogMarkdown(
  workspace: Pick<WorkspaceData, "name" | "auditLog">,
  exportedAt: string,
): string {
  return createMarkdownHandoff({
    title: `Activity Log: ${workspace.name}`,
    exportedAt,
    policy: "provider secrets, OAuth tokens, raw attachment bytes, private Worker state, raw Worker audit metadata, raw import source paths, and Markdown document bodies are excluded.",
    body: [
      "## Local Events",
      ...(workspace.auditLog.length
        ? workspace.auditLog.map((event) => `- ${packetText(event.when)} - ${packetText(event.actor)} - ${packetText(event.message)}`)
        : ["No local activity events recorded."]),
    ],
  });
}

export function createTeamRosterMarkdown(
  workspace: Pick<WorkspaceData, "name" | "members">,
  exportedAt: string,
): string {
  const statusCounts = {
    active: workspace.members.filter((member) => member.status === "active").length,
    invited: workspace.members.filter((member) => member.status === "invited").length,
    disabled: workspace.members.filter((member) => member.status === "disabled").length,
  };
  return createMarkdownHandoff({
    title: `Team Roster: ${workspace.name}`,
    exportedAt,
    policy: "raw email addresses, provider secrets, OAuth tokens, raw invite tokens, raw attachment bytes, private Worker state, permission grant details, and Worker audit metadata values are excluded. Email references are short hashes only.",
    body: [
      "## Summary",
      `- Members: ${workspace.members.length}`,
      `- Active: ${statusCounts.active}`,
      `- Invited: ${statusCounts.invited}`,
      `- Disabled: ${statusCounts.disabled}`,
      "",
      "## Members",
      ...(workspace.members.length
        ? workspace.members.map((member) => [
          `### ${packetText(member.displayName)}`,
          `- Role: ${packetText(formatWorkspaceRole(member.role))}`,
          `- Status: ${packetText(formatWorkspaceMemberStatus(member.status))}`,
          `- Email hash: ${packetText(shortHash(member.emailHash))}`,
          `- Last seen: ${packetText(member.lastSeenAt ? formatShortDateTime(member.lastSeenAt) : "Never seen")}`,
          "",
        ].join("\n"))
        : ["No workspace members recorded.", ""]),
    ],
  });
}

export function createProjectDirectoryMarkdown(
  workspace: Pick<WorkspaceData, "name" | "projects" | "archivedProjectCount"> & Partial<ProductionSummarySource>,
  projects: FilmProject[],
  filter: string,
  exportedAt: string,
): string {
  return createMarkdownHandoff({
    title: `Project Directory: ${workspace.name}`,
    exportedAt,
    metadata: [`Filter: ${packetText(filter) || "All projects"}`],
    policy: "provider secrets, OAuth tokens, raw attachment bytes, private Worker state, raw import source paths, and Markdown document bodies are excluded.",
    body: [
      "## Summary",
      `- Visible projects: ${projects.length}`,
      `- Workspace projects: ${workspace.projects.length}`,
      `- Archived projects: ${workspace.archivedProjectCount}`,
      "",
      "## Projects",
      ...(projects.length
        ? projects.map((project) => {
          const tasks = taskSummaryForProject(project);
          const budget = budgetTopSheetForProject(project);
          const production = productionSummaryForProject(project, workspace, exportedAt.slice(0, 10));
          return [
          `### ${packetText(project.title)}`,
          `- Type: ${packetText(project.type)}`,
          `- Phase: ${packetText(project.phase)}`,
          `- Shoot dates: ${packetText(production.shootDates)}`,
          `- Location: ${packetText(project.location)}`,
          `- Runtime: ${project.runtimeMinutes} minutes`,
          `- Format: ${packetText(project.format)}`,
          `- Budget: ${formatCurrency(budget.spent)} spent of ${formatCurrency(budget.totalBudget)} (${budget.spendSource})`,
          `- Tasks: ${tasks.done} done of ${tasks.total}`,
          `- Open tasks: ${project.openTasks.length}`,
          `- Docs: ${project.docs.length}`,
          `- People: ${project.people.length}`,
          `- Equipment: ${project.equipment.length}`,
          `- Expenses: ${project.expenses.length}`,
          "",
        ].join("\n"); })
        : ["No projects match the current filter.", ""]),
    ],
  });
}

export function createTaskListMarkdown(workspaceName: string, project: FilmProject, exportedAt: string): string {
  const tasks = taskSummaryForProject(project);
  const statusCounts = {
    overdue: project.openTasks.filter((task) => task.status === "overdue").length,
    pending: project.openTasks.filter((task) => task.status === "pending").length,
    ready: project.openTasks.filter((task) => task.status === "ready").length,
  };
  return createMarkdownHandoff({
    title: `Task List: ${project.title}`,
    exportedAt,
    workspaceName,
    policy: "provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    body: [
      "## Summary",
      `- Open tasks: ${project.openTasks.length}`,
      `- Completed: ${tasks.done} of ${tasks.total}`,
      `- Overdue: ${statusCounts.overdue}`,
      `- Pending: ${statusCounts.pending}`,
      `- Ready: ${statusCounts.ready}`,
      "",
      "## Open Tasks",
      ...(project.openTasks.length
        ? project.openTasks.map((task) => `- [${packetText(formatTaskStatus(task.status))}] ${packetText(task.title)} - due ${packetText(task.due)}`)
        : ["No open tasks."]),
    ],
  });
}

export function createPlanningViewMarkdown(
  workspaceName: string,
  rows: LocalHandoffPlanningRow[],
  allRowCount: number,
  filterLabel: string,
  source: "canonical" | "local",
  exportedAt: string,
): string {
  return createMarkdownHandoff({
    title: `Planning View: ${filterLabel}`,
    exportedAt,
    workspaceName,
    policy: "provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded. Source labels are included without local file paths.",
    body: [
      "## Summary",
      `- Rows in view: ${rows.length}`,
      `- Rows in workspace source: ${allRowCount}`,
      `- Filter: ${packetText(filterLabel)}`,
      `- Source: ${source === "canonical" ? "D1 planning export" : "Local import review cache"}`,
      "",
      "## Rows",
      ...(rows.length
        ? rows.map((row) => `- ${packetText(row.kindLabel)}: ${packetText(row.title)} - ${packetText(row.projectLabel)} - ${planningFields(row.fields)} - ${packetText(row.sourceLabel)}`)
        : ["No planning rows in current view."]),
    ],
  });
}

export function createDocumentDraftMarkdown(
  workspaceName: string,
  project: FilmProject,
  doc: ProjectDoc,
  markdown: string,
  exportedAt: string,
): string {
  const body = markdown.trim() ? markdown.replace(/\r\n/g, "\n") : "_Empty Markdown draft._";
  return createMarkdownHandoff({
    title: `Document Draft: ${doc.name}`,
    exportedAt,
    workspaceName,
    metadata: [`Project: ${packetText(project.title)}`],
    policy: "provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded. This explicit export includes the selected Markdown body; canonical saves use the Worker-owned document route when available.",
    body: ["## Draft", body],
  });
}

export function createCrewDirectoryMarkdown(workspaceName: string, project: FilmProject, exportedAt: string): string {
  return createMarkdownHandoff({
    title: `Crew Directory: ${project.title}`,
    exportedAt,
    workspaceName,
    policy: "provider secrets, OAuth tokens, raw attachment bytes, private Worker state, raw import source paths, email addresses, and phone numbers are excluded.",
    body: [
      "## Crew",
      ...(project.people.length
        ? project.people.map((person) => `- ${packetText(person.name)} - ${packetText(person.role)} (${packetText(person.initials)})`)
        : ["No crew records."]),
    ],
  });
}

export function createGearPullMarkdown(workspaceName: string, project: FilmProject, exportedAt: string): string {
  return createMarkdownHandoff({
    title: `Gear Pull: ${project.title}`,
    exportedAt,
    workspaceName,
    policy: "provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    body: [
      "## Gear",
      ...(project.equipment.length
        ? project.equipment.map((item) => `- ${packetText(item.name)} - ${packetText(item.status)}`)
        : ["No equipment records."]),
    ],
  });
}

export function createBudgetTopSheetMarkdown(workspaceName: string, project: FilmProject, exportedAt: string): string {
  const budget = budgetTopSheetForProject(project);
  return createMarkdownHandoff({
    title: `Budget Top Sheet: ${project.title}`,
    exportedAt,
    workspaceName,
    policy: "provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    body: [
      "## Summary",
      `- Total budget: ${formatCurrency(budget.totalBudget)}`,
      `- Spent: ${formatCurrency(budget.spent)}`,
      `- Remaining: ${formatCurrency(budget.remaining)}`,
      `- Used: ${budget.usedPercent}%`,
      `- Line budget: ${formatCurrency(budget.lineBudget)}`,
      `- Line spend: ${formatCurrency(budget.lineSpent)}`,
      `- Budget risk: ${budget.overBudgetCount} over budget / ${budget.nearBudgetCount} near budget`,
      "",
      "## Budget Lines",
      ...(project.expenses.length
        ? project.expenses.map((expense) => `- ${packetText(expenseCategoryLabel(expense))} - ${formatCurrency(expense.spent)} spent of ${formatCurrency(expense.budget)} (${expense.percent}%)`)
        : ["No expense rows recorded."]),
    ],
  });
}
