import type { ProductionUnit, ProjectDoc } from "@film/schema";

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
