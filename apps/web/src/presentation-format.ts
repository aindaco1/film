import type { FilmProject, ProductionUnit, ProjectDoc, WorkspaceData } from "@film/schema";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

export function packetText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function productionUnitLabel(unit: ProductionUnit | undefined): string {
  return unit === "second" ? "Second unit" : "Main unit";
}

export function formatDocStatus(doc: ProjectDoc): string {
  if (doc.attachmentStatus === "staged_local") return "Staged local";
  if (doc.attachmentStatus === "metadata_only") return "Metadata only";
  if (doc.attachmentStatus === "r2_dry_run") return "R2 dry run";
  if (doc.attachmentStatus === "stored_r2") return "Stored";
  return doc.date;
}

export function formatTaskStatus(status: FilmProject["openTasks"][number]["status"]): string {
  if (status === "overdue") return "Overdue";
  if (status === "pending") return "Pending";
  return "Ready";
}

export function expenseCategoryLabel(expense: FilmProject["expenses"][number]): string {
  const legacyName = (expense as FilmProject["expenses"][number] & { name?: unknown }).name;
  return typeof expense.category === "string" && expense.category.trim()
    ? expense.category.trim()
    : typeof legacyName === "string" && legacyName.trim()
      ? legacyName.trim()
      : "Uncategorized";
}

export function formatWorkspaceMemberStatus(value: WorkspaceData["members"][number]["status"]): string {
  if (value === "active") return "Active";
  if (value === "disabled") return "Disabled";
  return "Invited";
}

export function shortHash(value: string | null): string {
  return value ? `${value.slice(0, 8)}...${value.slice(-6)}` : "pending";
}

export function formatShortDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatProductionMinutes(minutes: number): string {
  if (minutes <= 0) return "--";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function productionValueLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function safeCsvCell(value: string): string {
  const formulaSafe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${formulaSafe.replaceAll('"', '""')}"`;
}

export function markdownTableCell(value: string): string {
  return packetText(value).replaceAll("|", "\\|");
}
