import type {
  FilmProject,
  ProductionCallSheet,
  ProductionCallSheetManifest,
  ProductionScheduleVersion,
  ProductionSidesManifest,
} from "@film/schema";
import { escapeHtml, formatDocStatus, packetText, productionUnitLabel } from "./presentation-format";

export function createCallSheetMarkdown(
  project: FilmProject,
  exportedAt: string,
  productionCallSheet: ProductionCallSheet | null = null,
  manifest: ProductionCallSheetManifest | null = null,
  sourceSchedule: ProductionScheduleVersion | null = null,
): string {
  const legacyCallSheet = project.callSheet;
  const callDate = productionCallSheet?.date ?? `${legacyCallSheet.day} ${legacyCallSheet.month}`;
  const callTime = productionCallSheet?.callTime ?? legacyCallSheet.callTime;
  const wrapTime = productionCallSheet?.estimatedWrapTime ?? legacyCallSheet.wrapTime;
  const location = productionCallSheet?.primaryLocation ?? legacyCallSheet.location;
  const dayNumber = productionCallSheet?.dayOrdinal ?? legacyCallSheet.dayNumber;
  const totalDays = productionCallSheet?.totalShootDays ?? legacyCallSheet.totalDays;
  const sceneCount = manifest?.scenes.length ?? legacyCallSheet.scenes;
  const lines = [
    `# Call Sheet: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    "Policy: provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    "## Call",
    ...(productionCallSheet ? [`- Title: ${packetText(productionCallSheet.title)}`, `- Status: ${packetText(productionCallSheet.status)}`] : []),
    `- Date: ${packetText(callDate)}`,
    `- Call: ${packetText(callTime)}`,
    `- Estimated wrap: ${packetText(wrapTime)}`,
    `- Location: ${packetText(location || "TBD")}`,
    `- Shoot day: ${dayNumber} of ${totalDays}`,
    ...(productionCallSheet ? [`- Unit: ${packetText(productionUnitLabel(productionCallSheet.unit))}`] : []),
    `- Scenes: ${sceneCount}`,
    ...(productionCallSheet && sourceSchedule ? [
      `- Source schedule: ${packetText(sourceSchedule.title)}`,
      `- Source changed after generation: ${sourceSchedule.updatedAt === productionCallSheet.sourceScheduleUpdatedAt ? "no" : "yes"}`,
    ] : [
      `- Pages: ${packetText(legacyCallSheet.pages)}`,
      `- People: ${legacyCallSheet.people}`,
      `- Weather: ${packetText(legacyCallSheet.weather)}`,
    ]),
    "",
    "## Scenes",
    ...(manifest?.scenes.length ? manifest.scenes.map((scene) => {
      const parts = (productionCallSheet?.sceneParts ?? []).filter((part) => part.sceneId === scene.id);
      const partLabel = parts.length
        ? ` | ${parts.map((part) => `Part ${packetText(part.label)} lines ${part.sourceStartLine}-${part.sourceEndLine}`).join(", ")}`
        : "";
      return `- ${packetText(scene.sceneNumber ?? String(scene.ordinal))}: ${packetText(scene.heading)} | ${packetText(scene.location ?? "TBD")} | ${packetText(scene.timeOfDay ?? "TBD")}${partLabel}${scene.synopsis ? ` | ${packetText(scene.synopsis)}` : ""}`;
    }) : ["No schedule-derived scene snapshot available."]),
    "",
    "## Cast Calls",
    ...(manifest?.castCalls.length ? manifest.castCalls.map((castCall) => (
      `- ${packetText(castCall.name)}${castCall.performerName ? ` (${packetText(castCall.performerName)})` : ""} - ${packetText(castCall.callTime)} - ${castCall.sceneIds.length} scene${castCall.sceneIds.length === 1 ? "" : "s"}${castCall.notes ? ` - ${packetText(castCall.notes)}` : ""}`
    )) : ["No reviewed cast requirements recorded."]),
    "",
    "## Safety And Logistics",
    `- Parking / access: ${packetText(productionCallSheet?.parkingInstructions || "TBD")}`,
    `- Nearest hospital: ${packetText(productionCallSheet?.nearestHospital || "TBD")}`,
    `- Weather notes: ${packetText(productionCallSheet?.weatherNotes || legacyCallSheet.weather || "TBD")}`,
    `- General notes: ${packetText(productionCallSheet?.generalNotes || "None")}`,
    `- Safety notes: ${packetText(productionCallSheet?.safetyNotes || "None")}`,
    "",
    "## Crew",
    ...(project.people.length ? project.people.slice(0, 20).map((person) => `- ${packetText(person.name)} - ${packetText(person.role)}`) : ["No crew rows recorded."]),
    "",
    "## Gear",
    ...(project.equipment.length ? project.equipment.slice(0, 20).map((item) => `- ${packetText(item.name)} - ${packetText(item.status)}`) : ["No equipment rows recorded."]),
    "",
    "## Attachments To Review",
    ...(project.docs.length ? project.docs.slice(0, 20).map((doc) => `- ${packetText(doc.name)} (${packetText(doc.type)}) - ${packetText(formatDocStatus(doc))}`) : ["No documents attached."]),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function productionSidesExportMetadata(
  project: FilmProject,
  callSheet: ProductionCallSheet,
  manifest: ProductionSidesManifest,
  schedule: ProductionScheduleVersion,
  exportedAt: string,
): Array<[string, string]> {
  return [
    ["Project", project.title],
    ["Call sheet", callSheet.title],
    ["Call-sheet status", callSheet.status],
    ["Shoot date", callSheet.date ?? "TBD"],
    ["Shoot day", `${callSheet.dayOrdinal} of ${callSheet.totalShootDays}`],
    ["Unit", productionUnitLabel(callSheet.unit)],
    ["Source schedule", schedule.title],
    ["Source schedule changed", schedule.updatedAt === callSheet.sourceScheduleUpdatedAt ? "no" : "yes"],
    ["Screenplay revision", manifest.screenplayTitle],
    ["Scene strips", String(manifest.scenes.length)],
    ["Missing source scenes", String(manifest.missingSceneIds.length)],
    ["Exported", exportedAt],
  ];
}

export function createProductionSidesMarkdown(
  project: FilmProject,
  callSheet: ProductionCallSheet,
  manifest: ProductionSidesManifest,
  schedule: ProductionScheduleVersion,
  exportedAt: string,
): string {
  const metadata = productionSidesExportMetadata(project, callSheet, manifest, schedule, exportedAt);
  const lines = [
    `# Sides: ${packetText(callSheet.title)}`,
    "",
    "Policy: user-requested local source export. This file includes the scheduled screenplay scene text below and excludes contact fields, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths.",
    "",
    "## Source",
    ...metadata.map(([label, value]) => `- ${packetText(label)}: ${packetText(value)}`),
    "",
    ...manifest.scenes.flatMap((scene) => [
      `## Scene ${packetText(scene.sceneNumber ?? String(scene.ordinal))}${scene.schedulePartLabel ? ` - Part ${packetText(scene.schedulePartLabel)}` : ""}: ${packetText(scene.heading)}`,
      "",
      `- Source lines: ${scene.sourceStartLine}-${scene.sourceEndLine}`,
      `- Location: ${packetText(scene.location ?? "TBD")}`,
      `- Time of day: ${packetText(scene.timeOfDay ?? "TBD")}`,
      `- Cast: ${scene.castCalls.length ? scene.castCalls.map((castCall) => `${packetText(castCall.name)}${castCall.performerName ? ` (${packetText(castCall.performerName)})` : ""}`).join(", ") : "No reviewed cast"}`,
      "",
      markdownSourceBlock(scene.sourceText),
      "",
    ]),
  ];
  return `${lines.join("\n")}\n`;
}

export function createProductionSidesHtml(
  project: FilmProject,
  callSheet: ProductionCallSheet,
  manifest: ProductionSidesManifest,
  schedule: ProductionScheduleVersion,
  exportedAt: string,
): string {
  const metadata = productionSidesExportMetadata(project, callSheet, manifest, schedule, exportedAt);
  const sceneHtml = manifest.scenes.map((scene) => `
    <section class="scene">
      <header>
        <p class="scene-number">Scene ${escapeHtml(scene.sceneNumber ?? String(scene.ordinal))}${scene.schedulePartLabel ? ` - Part ${escapeHtml(scene.schedulePartLabel)}` : ""}</p>
        <h2>${escapeHtml(scene.heading)}</h2>
        <p>${escapeHtml(scene.location ?? "TBD")} | ${escapeHtml(scene.timeOfDay ?? "TBD")} | source lines ${scene.sourceStartLine}-${scene.sourceEndLine}</p>
        <p class="cast">Cast: ${scene.castCalls.length ? scene.castCalls.map((castCall) => `${escapeHtml(castCall.name)}${castCall.performerName ? ` (${escapeHtml(castCall.performerName)})` : ""}`).join(", ") : "No reviewed cast"}</p>
      </header>
      <pre>${escapeHtml(scene.sourceText || "Source text is empty for this scene.")}</pre>
    </section>
  `).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
  <title>${escapeHtml(`Sides - ${callSheet.title}`)}</title>
  <style>
    :root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
    body { max-width: 8.5in; margin: 0 auto; padding: 0.45in; }
    h1, h2, p { margin: 0; }
    .cover { min-height: 9.5in; display: grid; align-content: center; gap: 18px; break-after: page; }
    .cover h1 { font-size: 30px; }
    .policy { max-width: 7in; font-size: 12px; line-height: 1.5; }
    dl { display: grid; grid-template-columns: 1.6in 1fr; gap: 6px 12px; margin: 0; font-size: 12px; }
    dt { font-weight: 700; } dd { margin: 0; }
    .scene { break-after: page; }
    .scene:last-child { break-after: auto; }
    .scene header { padding-bottom: 14px; border-bottom: 2px solid #111; }
    .scene-number { font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .scene h2 { margin-top: 5px; font-size: 18px; }
    .scene header > p:not(.scene-number) { margin-top: 5px; font-size: 11px; }
    .cast { font-weight: 700; }
    pre { margin: 20px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.55 Courier, monospace; }
    @page { size: letter; margin: 0.55in; }
    @media print { body { max-width: none; padding: 0; } }
  </style>
</head>
<body>
  <section class="cover">
    <h1>${escapeHtml(callSheet.title)}</h1>
    <p class="policy">User-requested local source export. This file includes only the scheduled screenplay scene text and bounded call-sheet metadata. Contact fields, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.</p>
    <dl>${metadata.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>
  </section>
  ${sceneHtml}
</body>
</html>
`;
}

function markdownSourceBlock(value: string): string {
  const source = value.replace(/\r\n?/g, "\n").trimEnd() || "Source text is empty for this scene.";
  let fence = "```";
  while (source.includes(fence)) fence += "`";
  return `${fence}text\n${source}\n${fence}`;
}
