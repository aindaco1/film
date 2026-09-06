import type { FilmProject, OperationRecord, ProductionCallSheet, WorkspaceData } from "@film/schema";

export type ProductionSummarySource = Pick<WorkspaceData, "productionSchedules" | "productionCallSheets" | "productionReports" | "screenplayBreakdowns">;

export function taskSummaryForProject(project: FilmProject) {
  const done = Math.max(0, Math.floor(project.tasks.done));
  const total = done + project.openTasks.length;
  return { done, total, open: project.openTasks.length, percent: total ? Math.round(done / total * 100) : 0 };
}

export function productionCallSheetStripCount(callSheet: ProductionCallSheet): number {
  const splitSceneIds = new Set((callSheet.sceneParts ?? []).map((part) => part.sceneId));
  return callSheet.sceneIds.filter((sceneId) => !splitSceneIds.has(sceneId)).length + (callSheet.sceneParts?.length ?? 0);
}

export function formatShootDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date)
    : "Undated";
}

function localToday(): string {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function productionSummaryForProject(project: FilmProject, source?: Partial<ProductionSummarySource>, today = localToday()) {
  const schedules = (source?.productionSchedules ?? []).filter((item) => item.projectId === project.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const schedule = schedules[0] ?? null;
  const breakdowns = (source?.screenplayBreakdowns ?? []).filter((item) => item.projectId === project.id)
    .sort((a, b) => b.revision.importedAt.localeCompare(a.revision.importedAt));
  const breakdown = breakdowns.find((item) => item.id === schedule?.screenplayBreakdownId) ?? breakdowns[0] ?? null;
  const days = schedule?.shootDays ?? [];
  const dates = days.flatMap((day) => day.date ? [day.date] : []).sort();
  const datedSheets = (source?.productionCallSheets ?? []).filter((item) => item.projectId === project.id && item.date)
    .sort((a, b) => a.date!.localeCompare(b.date!) || b.updatedAt.localeCompare(a.updatedAt));
  const upcoming = datedSheets.find((item) => item.date! >= today);
  const latestDated = datedSheets.find((item) => item.date === datedSheets.at(-1)?.date);
  const callSheet = upcoming ?? latestDated ?? (source?.productionCallSheets ?? []).find((item) => item.projectId === project.id) ?? null;
  const shootDates = dates.length
    ? dates[0] === dates.at(-1) ? formatShootDate(dates[0]!) : `${formatShootDate(dates[0]!)} - ${formatShootDate(dates.at(-1)!)}`
    : schedule ? "Dates not set" : project.shootDates === "TBD" ? "Not scheduled" : project.shootDates;
  return {
    schedule, breakdown, days, shootDates, callSheet,
    callSheetLabel: upcoming ? "Upcoming call sheet" : callSheet?.date ? "Latest call sheet" : "Call sheet",
    sceneCount: breakdown?.scenes.length ?? 0,
    assignedStrips: days.reduce((total, day) => total + day.sceneIds.length + (day.sceneParts?.length ?? 0), 0),
    unassignedStrips: schedule ? schedule.unassignedSceneIds.length + (schedule.unassignedSceneParts?.length ?? 0) : 0,
    issuedReports: (source?.productionReports ?? []).filter((item) => item.projectId === project.id && item.status === "final").length,
  };
}

export function localBackupSummary(operations: OperationRecord[]) {
  const latest = operations.filter((operation) => operation.kind === "backup.exported" && operation.payload.encrypted === true)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return { exportedAt: latest?.createdAt ?? null, automatic: "Not configured" };
}

export type ProjectBudgetTopSheet = {
  lineBudget: number;
  lineSpent: number;
  remaining: number;
  usedPercent: number;
  largestLine: FilmProject["expenses"][number] | null;
  nearBudgetCount: number;
  overBudgetCount: number;
  totalBudget: number;
  spent: number;
  spendSource: "Expense ledger" | "Entered spend";
};

export function budgetTopSheetForProject(project: FilmProject): ProjectBudgetTopSheet {
  const lineBudget = project.expenses.reduce((total, expense) => total + expense.budget, 0);
  const lineSpent = project.expenses.reduce((total, expense) => total + expense.spent, 0);
  const totalBudget = project.totalBudget > 0 ? project.totalBudget : lineBudget;
  const spent = project.expenses.length ? lineSpent : project.spentBudget;
  const largestLine = [...project.expenses].sort((left, right) => right.spent - left.spent)[0] ?? null;

  return {
    totalBudget,
    spent,
    spendSource: project.expenses.length ? "Expense ledger" : "Entered spend",
    lineBudget,
    lineSpent,
    remaining: totalBudget - spent,
    usedPercent: totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0,
    largestLine,
    nearBudgetCount: project.expenses.filter((expense) => (
      expense.budget > 0
      && expense.spent <= expense.budget
      && expense.spent / expense.budget >= 0.85
    )).length,
    overBudgetCount: project.expenses.filter((expense) => (
      expense.budget > 0 && expense.spent > expense.budget
    )).length,
  };
}
