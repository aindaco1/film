import {
  formatCurrency,
  summarizeProductionReport,
  type FilmProject,
  type ProductionCallSheet,
  type ProductionCallSheetManifest,
  type ProductionDailyReport,
  type ProductionLocation,
  type ProductionLocationManifest,
  type ProductionTalent,
  type ProductionTalentManifest,
} from "@film/schema";
import {
  formatDocStatus,
  formatProductionMinutes,
  packetText,
  productionUnitLabel,
  productionValueLabel,
  safeCsvCell,
} from "./presentation-format";

export type ProductionShotExportRow = {
  order: number;
  shotNumber: string;
  sceneNumber: string;
  sceneHeading: string;
  screenplayRevision: string;
  description: string;
  status: string;
  shotSize: string;
  angle: string;
  movement: string;
  lens: string;
  cameraSupport: string;
  frameRate: string;
  estimatedMinutes: number;
  setupGroup: string;
  audioNotes: string;
  lightingNotes: string;
  notes: string;
  scheduleDays: string;
  callSheets: string;
  documents: string;
};

export function createProductionShotMarkdown(
  project: FilmProject,
  rows: ProductionShotExportRow[],
  exportedAt: string,
): string {
  const lines = [
    `# Shot List: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    "Policy: screenplay source text, contact fields, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    ...rows.flatMap((row) => [
      `## Scene ${packetText(row.sceneNumber)} - Shot ${packetText(row.shotNumber || String(row.order))}`,
      `- Heading: ${packetText(row.sceneHeading)}`,
      `- Revision: ${packetText(row.screenplayRevision)}`,
      `- Description: ${packetText(row.description)}`,
      `- Status: ${packetText(row.status)}`,
      `- Frame: ${packetText([row.shotSize, row.angle, row.movement].filter(Boolean).join(" / ") || "Not set")}`,
      `- Camera: ${packetText([row.lens, row.cameraSupport, row.frameRate].filter(Boolean).join(" / ") || "Not set")}`,
      `- Setup: ${packetText(row.setupGroup || "Not set")} - ${row.estimatedMinutes ? `${row.estimatedMinutes} min` : "duration not set"}`,
      `- Sound: ${packetText(row.audioNotes || "None")}`,
      `- Lighting: ${packetText(row.lightingNotes || "None")}`,
      `- Notes: ${packetText(row.notes || "None")}`,
      `- Schedule use: ${packetText(row.scheduleDays || "Not scheduled")}`,
      `- Call sheets: ${packetText(row.callSheets || "None generated")}`,
      `- Documents: ${packetText(row.documents || "None selected")}`,
      "",
    ]),
  ];
  return `${lines.join("\n")}\n`;
}

export function createProductionShotCsv(rows: ProductionShotExportRow[]): string {
  const headers = [
    "Order", "Shot", "Scene", "Heading", "Revision", "Description", "Status", "Size", "Angle", "Movement",
    "Lens", "Camera / support", "Frame rate", "Setup minutes", "Setup group", "Sound", "Lighting", "Notes",
    "Schedule days", "Call sheets", "Documents",
  ];
  const cells = rows.map((row) => [
    String(row.order), row.shotNumber, row.sceneNumber, row.sceneHeading, row.screenplayRevision, row.description,
    row.status, row.shotSize, row.angle, row.movement, row.lens, row.cameraSupport, row.frameRate,
    String(row.estimatedMinutes), row.setupGroup, row.audioNotes, row.lightingNotes, row.notes, row.scheduleDays,
    row.callSheets, row.documents,
  ]);
  return `\uFEFF${[headers, ...cells].map((row) => row.map(safeCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function createProductionReportMarkdown(
  project: FilmProject,
  report: ProductionDailyReport,
  manifest: ProductionCallSheetManifest,
  callSheet: ProductionCallSheet,
  exportedAt: string,
): string {
  const summary = summarizeProductionReport(report);
  const scenesById = new Map(manifest.scenes.map((scene) => [scene.id, scene]));
  const lines = [
    `# Daily Production Report: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    "Policy: screenplay source text, contact fields, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    "## Day",
    `- Report: ${packetText(report.title)}`,
    `- Status: ${packetText(report.status)}`,
    `- Date: ${packetText(report.date ?? "TBD")}`,
    `- Shoot day: ${report.dayOrdinal}`,
    `- Unit: ${packetText(productionUnitLabel(report.unit))}`,
    `- Primary location: ${packetText(report.primaryLocation || "TBD")}`,
    `- Source call sheet: ${packetText(callSheet.title)}`,
    `- Source changed after report creation: ${callSheet.updatedAt === report.sourceCallSheetUpdatedAt ? "no" : "yes"}`,
    "",
    "## Progress",
    `- Planned scenes: ${summary.plannedSceneCount}`,
    `- Completed: ${summary.completedSceneCount}`,
    `- Partial: ${summary.partialSceneCount}`,
    `- Held: ${summary.heldSceneCount}`,
    `- Remaining: ${summary.remainingSceneCount}`,
    `- Completion: ${summary.completionPercent}%`,
    "",
    "## Actual Timings",
    `- Crew call: ${packetText(report.actualCrewCallTime ?? "Not recorded")}`,
    `- First shot: ${packetText(report.firstShotTime ?? "Not recorded")}`,
    `- Meal: ${packetText(report.mealStartTime ?? "Not recorded")} to ${packetText(report.mealEndTime ?? "Not recorded")}`,
    `- Camera wrap: ${packetText(report.cameraWrapTime ?? "Not recorded")}`,
    `- Crew wrap: ${packetText(report.crewWrapTime ?? "Not recorded")}`,
    `- Gross day: ${formatProductionMinutes(summary.grossDayMinutes)}`,
    `- Meal duration: ${formatProductionMinutes(summary.mealMinutes)}`,
    `- Working time: ${formatProductionMinutes(summary.workingMinutes)}`,
    "",
    "## Counts",
    `- Crew: ${report.crewCount}`,
    `- Cast: ${report.castCount}`,
    `- Background: ${report.backgroundCount}`,
    `- Meals: ${report.mealCount}`,
    `- Setups: ${report.setupCount}`,
    `- Takes: ${report.takeCount}`,
    `- Recorded minutes: ${report.footageMinutes}`,
    "",
    "## Scene Results",
    ...report.sceneResults.map((result) => {
      const scene = scenesById.get(result.sceneId);
      return `- ${packetText(scene?.sceneNumber ?? String(scene?.ordinal ?? "?"))}: ${packetText(scene?.heading ?? "Source scene missing")} - ${packetText(result.status)}${result.notes ? ` - ${packetText(result.notes)}` : ""}`;
    }),
    "",
    "## Notes",
    `- Actual weather: ${packetText(report.weatherActual || "Not recorded")}`,
    `- Delays: ${packetText(report.delayNotes || "None recorded")}`,
    `- Production: ${packetText(report.productionNotes || "None recorded")}`,
    `- Safety / incidents: ${packetText(report.safetyIncidentNotes || "None recorded")}`,
    `- Tomorrow / pickups: ${packetText(report.tomorrowNotes || "None recorded")}`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export function createProductionReportSceneCsv(
  report: ProductionDailyReport,
  manifest: ProductionCallSheetManifest,
): string {
  const scenesById = new Map(manifest.scenes.map((scene) => [scene.id, scene]));
  const rows: string[][] = [["Date", "Shoot day", "Unit", "Scene", "Heading", "Location", "Time of day", "Status", "Notes"]];
  for (const result of report.sceneResults) {
    const scene = scenesById.get(result.sceneId);
    rows.push([
      report.date ?? "",
      String(report.dayOrdinal),
      productionUnitLabel(report.unit),
      scene?.sceneNumber ?? String(scene?.ordinal ?? ""),
      scene?.heading ?? "Source scene missing",
      scene?.location ?? "",
      scene?.timeOfDay ?? "",
      result.status,
      result.notes,
    ]);
  }
  return `\uFEFF${rows.map((row) => row.map(safeCsvCell).join(",")).join("\r\n")}\r\n`;
}

export function createProductionLocationMarkdown(
  project: FilmProject,
  location: ProductionLocation,
  manifest: ProductionLocationManifest,
  exportedAt: string,
): string {
  const documents = location.documentIds.flatMap((documentId) => {
    const document = project.docs.find((candidate) => candidate.id === documentId);
    return document ? [document] : [];
  });
  const lines = [
    `# Location Brief: ${packetText(location.name)}`,
    "",
    `Project: ${packetText(project.title)}`,
    `Exported: ${packetText(exportedAt)}`,
    "Policy: this user-triggered local handoff includes the contact details selected for this scouting record. Screenplay source text, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    "## Status",
    `- Scouting: ${packetText(productionValueLabel(location.status))}`,
    `- Permit: ${packetText(productionValueLabel(location.permitStatus))}`,
    `- Permit notes: ${packetText(location.permitNotes || "None")}`,
    `- Linked source missing: ${manifest.sourceMissing ? "yes" : "no"}`,
    `- Linked source changed: ${manifest.sourceChanged ? "yes" : "no"}`,
    "",
    "## Address And Contact",
    `- Address: ${packetText(location.address || "TBD")}`,
    `- Contact: ${packetText(location.contactName || "TBD")}`,
    `- Contact details: ${packetText(location.contactDetails || "TBD")}`,
    "",
    "## Logistics",
    `- Parking / access / load-in: ${packetText(location.parkingAccess || "TBD")}`,
    `- Power: ${packetText(location.powerNotes || "TBD")}`,
    `- Sound: ${packetText(location.soundNotes || "TBD")}`,
    `- Restrooms: ${packetText(location.restroomNotes || "TBD")}`,
    `- Accessibility: ${packetText(location.accessibilityNotes || "TBD")}`,
    `- Nearest hospital: ${packetText(location.nearestHospital || "TBD")}`,
    `- Manual weather notes: ${packetText(location.weatherNotes || "TBD")}`,
    `- Safety: ${packetText(location.safetyNotes || "None")}`,
    `- General: ${packetText(location.generalNotes || "None")}`,
    "",
    "## Scenes",
    ...(manifest.scenes.length ? manifest.scenes.map((scene) => (
      `- ${packetText(scene.sceneNumber ?? String(scene.ordinal))}: ${packetText(scene.heading)} | ${packetText(scene.timeOfDay ?? "TBD")}`
    )) : ["No linked scenes."]),
    "",
    "## Schedule Use",
    ...(manifest.scheduleUses.length ? manifest.scheduleUses.map((use) => (
      `- ${packetText(use.scheduleTitle)} - Day ${use.dayOrdinal} - ${packetText(productionUnitLabel(use.unit))} - ${packetText(use.date ?? "Undated")} - ${use.sceneIds.length} scenes - ${packetText(use.scheduleStatus)}`
    )) : ["No scheduled use."]),
    "",
    "## Availability",
    ...(manifest.availability.length ? manifest.availability.map((window) => (
      `- ${packetText(productionValueLabel(window.status))}: ${packetText(window.startDate)} through ${packetText(window.endDate)}${window.notes ? ` - ${packetText(window.notes)}` : ""}`
    )) : ["No linked availability windows."]),
    "",
    "## Documents",
    ...(documents.length ? documents.map((document) => `- ${packetText(document.name)} (${packetText(document.type)}) - ${packetText(formatDocStatus(document))}`) : ["No location documents selected."]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

export function createProductionTalentMarkdown(
  project: FilmProject,
  talent: ProductionTalent,
  manifest: ProductionTalentManifest,
  exportedAt: string,
): string {
  const documents = talent.documentIds.flatMap((documentId) => {
    const document = project.docs.find((candidate) => candidate.id === documentId);
    return document ? [document] : [];
  });
  const enteredRate = talent.rateBasis === "not_set"
    ? "Not set"
    : `${formatCurrency(talent.agreedRateCents / 100)} - ${productionValueLabel(talent.rateBasis)}`;
  const lines = [
    `# Talent Brief: ${packetText(talent.characterName)}`,
    "",
    `Project: ${packetText(project.title)}`,
    `Exported: ${packetText(exportedAt)}`,
    "Policy: this user-triggered local handoff includes the contact, representative, entered deal, dietary, accessibility, wardrobe, and travel details selected for this record. It is not a union, payroll, tax, legal, or labor-compliance calculation. Screenplay source text, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    "## Casting",
    `- Character: ${packetText(talent.characterName)}`,
    `- Performer: ${packetText(talent.performerName || "TBD")}`,
    `- Status: ${packetText(productionValueLabel(talent.status))}`,
    `- Paperwork: ${packetText(productionValueLabel(talent.paperworkStatus))}`,
    `- Linked source missing: ${manifest.sourceMissing ? "yes" : "no"}`,
    `- Linked source changed: ${manifest.sourceChanged ? "yes" : "no"}`,
    "",
    "## Contact",
    `- Direct contact: ${packetText(talent.contactName || "TBD")}`,
    `- Direct details: ${packetText(talent.contactDetails || "TBD")}`,
    `- Representative: ${packetText(talent.representativeName || "TBD")}`,
    `- Representative details: ${packetText(talent.representativeDetails || "TBD")}`,
    "",
    "## Entered Terms",
    `- Rate: ${packetText(enteredRate)}`,
    `- Deal notes: ${packetText(talent.dealNotes || "None")}`,
    "",
    "## Readiness",
    `- Travel / lodging: ${packetText(talent.travelNotes || "None")}`,
    `- Dietary: ${packetText(talent.dietaryNotes || "None")}`,
    `- Accessibility: ${packetText(talent.accessibilityNotes || "None")}`,
    `- Wardrobe / fitting: ${packetText(talent.wardrobeNotes || "None")}`,
    `- General: ${packetText(talent.generalNotes || "None")}`,
    "",
    "## Scenes",
    ...(manifest.scenes.length ? manifest.scenes.map((scene) => (
      `- ${packetText(scene.sceneNumber ?? String(scene.ordinal))}: ${packetText(scene.heading)} | ${packetText(scene.location ?? "TBD")} | ${packetText(scene.timeOfDay ?? "TBD")}`
    )) : ["No linked scenes."]),
    "",
    "## Schedule Use",
    ...(manifest.scheduleUses.length ? manifest.scheduleUses.map((use) => (
      `- ${packetText(use.scheduleTitle)} - Day ${use.dayOrdinal} - ${packetText(productionUnitLabel(use.unit))} - ${packetText(use.date ?? "Undated")} - ${use.sceneIds.length} scenes - ${packetText(use.scheduleStatus)}`
    )) : ["No scheduled use."]),
    "",
    "## Availability",
    ...(manifest.availability.length ? manifest.availability.map((window) => (
      `- ${packetText(productionValueLabel(window.status))}: ${packetText(window.startDate)} through ${packetText(window.endDate)}${window.notes ? ` - ${packetText(window.notes)}` : ""}`
    )) : ["No linked availability windows."]),
    "",
    "## Documents",
    ...(documents.length ? documents.map((document) => `- ${packetText(document.name)} (${packetText(document.type)}) - ${packetText(formatDocStatus(document))}`) : ["No talent documents selected."]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}
