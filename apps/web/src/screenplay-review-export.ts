import type {
  FilmProject,
  ScreenplayBreakdown,
  ScreenplayElementReport,
  ScreenplayElementReportOccurrence,
  ScreenplayRevisionComparison,
} from "@film/schema";
import { markdownTableCell, packetText, safeCsvCell } from "./presentation-format";
import { SCREENPLAY_ELEMENT_LABELS } from "./screenplay-element-format";

export function createScreenplayElementReportMarkdown(
  project: FilmProject,
  breakdown: ScreenplayBreakdown,
  report: ScreenplayElementReport,
  exportedAt: string,
): string {
  const categoryLabel = report.category ? SCREENPLAY_ELEMENT_LABELS[report.category] : "All categories";
  const lines = [
    `# Element List: ${markdownTableCell(project.title)}`,
    "",
    `Exported: ${markdownTableCell(exportedAt)}`,
    `Revision: ${markdownTableCell(breakdown.revision.title)}`,
    `Filter: ${markdownTableCell(categoryLabel)}`,
    "Policy: metadata-only local export; screenplay source text, contacts, provider credentials, OAuth values, raw attachments, raw import paths, and private Worker state are excluded.",
    "",
    "## Summary",
    `- Elements: ${report.rows.length}`,
    `- Active occurrences: ${report.occurrenceCount}`,
    `- Scene uses: ${report.sceneUseCount}`,
    "",
    "## Elements",
    "| Category | Element | State | Source | Occurrences | Confirmed | Scenes | First Scene | Positions |",
    "| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |",
    ...report.rows.map((row) => {
      const scenes = row.scenes.map((scene) => scene.sceneNumber ?? String(scene.ordinal)).join(", ") || "-";
      const firstScene = row.firstScene
        ? `${row.firstScene.sceneNumber ?? row.firstScene.ordinal} - ${row.firstScene.heading}`
        : "-";
      const positions = row.occurrences.map(formatScreenplayElementOccurrencePosition).join("; ") || "-";
      return `| ${markdownTableCell(SCREENPLAY_ELEMENT_LABELS[row.category])} | ${markdownTableCell(row.name)} | ${markdownTableCell(row.reviewState)} | ${markdownTableCell(row.source.replaceAll("_", " "))} | ${row.occurrenceCount} | ${row.confirmedOccurrenceCount} | ${markdownTableCell(scenes)} | ${markdownTableCell(firstScene)} | ${markdownTableCell(positions)} |`;
    }),
    ...(report.rows.length ? [] : ["| - | No active elements | - | - | 0 | 0 | - | - | - |"]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export function createScreenplayElementReportCsv(report: ScreenplayElementReport): string {
  const rows = [
    ["Category", "Element", "State", "Source", "Occurrences", "Confirmed occurrences", "Scene count", "Scenes", "First scene", "First heading", "Occurrence positions"],
    ...report.rows.map((row) => [
      SCREENPLAY_ELEMENT_LABELS[row.category],
      row.name,
      row.reviewState,
      row.source.replaceAll("_", " "),
      String(row.occurrenceCount),
      String(row.confirmedOccurrenceCount),
      String(row.sceneCount),
      row.scenes.map((scene) => scene.sceneNumber ?? String(scene.ordinal)).join(", "),
      row.firstScene?.sceneNumber ?? (row.firstScene ? String(row.firstScene.ordinal) : ""),
      row.firstScene?.heading ?? "",
      row.occurrences.map(formatScreenplayElementOccurrencePosition).join("; "),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(safeCsvCell).join(",")).join("\r\n")}\r\n`;
}

function formatScreenplayElementOccurrencePosition(occurrence: ScreenplayElementReportOccurrence): string {
  return `${occurrence.sceneNumber ?? occurrence.sceneOrdinal} line ${occurrence.sourceLine} (${occurrence.reviewState})`;
}

export function createScreenplayRevisionMarkdown(
  project: FilmProject,
  previous: ScreenplayBreakdown,
  next: ScreenplayBreakdown,
  comparison: ScreenplayRevisionComparison,
  exportedAt: string,
): string {
  const lines = [
    `# Screenplay Revision Report: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    `Previous: ${packetText(previous.revision.title)} (${packetText(previous.revision.sourceFileName)})`,
    `Next: ${packetText(next.revision.title)} (${packetText(next.revision.sourceFileName)})`,
    "Policy: metadata-only local export; screenplay source text, contacts, provider credentials, OAuth values, raw attachments, and private Worker state are excluded.",
    "",
    "## Summary",
    `- Unchanged scenes: ${comparison.unchangedSceneCount}`,
    `- Changed scenes: ${comparison.changedSceneCount}`,
    `- Added scenes: ${comparison.addedSceneCount}`,
    `- Removed scenes: ${comparison.removedSceneCount}`,
    `- Matched production elements: ${comparison.elementMatches.length}`,
    "",
    "## Scene Changes",
    ...comparison.sceneChanges.filter((change) => change.status !== "unchanged").map((change) => {
      const previousNumber = change.previousSceneNumber ?? (change.previousOrdinal === null ? "-" : String(change.previousOrdinal));
      const nextNumber = change.nextSceneNumber ?? (change.nextOrdinal === null ? "-" : String(change.nextOrdinal));
      const heading = change.nextHeading ?? change.previousHeading ?? "Untitled scene";
      const basis = change.matchBasis?.replaceAll("_", " ") ?? "unmatched";
      return `- ${packetText(change.status.toUpperCase())}: ${packetText(previousNumber)} -> ${packetText(nextNumber)} - ${packetText(heading)} (${packetText(basis)})`;
    }),
    ...(comparison.sceneChanges.some((change) => change.status !== "unchanged") ? [] : ["No scene changes detected."]),
    "",
    "## Carry-Forward Policy",
    "- Existing schedules are preserved; Film creates draft copies against the new revision.",
    "- Matching budget assumptions and cast/location availability are copied to those draft schedules.",
    "- Matching shot, talent, and location records are relinked; unresolved records remain on the previous revision for manual review.",
    "- Final call sheets, sides, and production reports remain pinned to the revision used when they were created.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}
