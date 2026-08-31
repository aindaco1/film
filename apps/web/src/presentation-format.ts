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
