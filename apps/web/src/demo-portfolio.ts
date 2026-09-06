import { parseScreenplayFile } from "@film/importers";
import {
  addProductionShootDay, cloneWorkspace, createFilmProjectFromTemplate,
  createProductionAvailabilityWindow, createProductionBudgetScenario,
  createProductionCallSheetFromScheduleDay, createProductionLocation,
  createProductionReportFromCallSheet, createProductionScheduleFromBreakdown,
  createProductionShot, createProductionTalent, moveProductionScheduleStrips,
  seedWorkspace, setProductionCallSheetStatus, setProductionReportStatus,
  setProductionScheduleStatus, updateProductionBudgetScenario, updateProductionCallSheet,
  updateProductionLocation, updateProductionReport, updateProductionReportSceneResult,
  updateProductionShootDay, updateProductionShot, updateProductionTalent,
  type FilmProject, type WorkspaceData,
} from "@film/schema";

type DemoProject = {
  key: string; title: string; type: string; phase: FilmProject["phase"];
  budget: number; spent: number; scenes: number; days: number; tasks: number;
  offset: number; runtime: number; premise: string;
};

export const DEMO_PROJECTS: DemoProject[] = [
  { key: "night-service", title: "Night Service", type: "Feature Film", phase: "Production", budget: 85000, spent: 46820, scenes: 36, days: 6, tasks: 24, offset: -1, runtime: 88, premise: "An overnight bus driver reconnects with a former friend during the final week of a rural route." },
  { key: "pocket-change", title: "Pocket Change", type: "Short Film", phase: "Pre-Production", budget: 4500, spent: 825, scenes: 7, days: 2, tasks: 8, offset: 12, runtime: 11, premise: "Two siblings turn a laundromat lost-and-found into a very small detective agency." },
  { key: "after-rain", title: "After the Rain", type: "Documentary", phase: "Post-Production", budget: 18000, spent: 21350, scenes: 12, days: 3, tasks: 6, offset: -40, runtime: 52, premise: "Residents document a neighborhood garden through one unusually dry growing season." },
  { key: "signal-noise", title: "Signal / Noise", type: "Music Video", phase: "Production", budget: 1200, spent: 980, scenes: 6, days: 1, tasks: 4, offset: 0, runtime: 4, premise: "A warehouse performance moves between live percussion and found mechanical rhythms." },
  { key: "open-doors", title: "Open Doors: Small Business Portraits", type: "Commercial", phase: "Pre-Production", budget: 8500, spent: 1300, scenes: 5, days: 1, tasks: 10, offset: 7, runtime: 2, premise: "Three independent shopkeepers prepare their storefronts before the city wakes up." },
  { key: "northbound", title: "Northbound", type: "Feature Film", phase: "Development", budget: 95000, spent: 0, scenes: 0, days: 0, tasks: 5, offset: 90, runtime: 95, premise: "A retired surveyor and her daughter follow an unfinished map across northern New Mexico." },
  { key: "block-by-block", title: "Block by Block", type: "Documentary", phase: "Development", budget: 6000, spent: 340, scenes: 10, days: 0, tasks: 9, offset: 30, runtime: 30, premise: "An observational portrait of the volunteers maintaining a community repair library." },
  { key: "juniper", title: "House on Juniper - Season One: The Long Way Home", type: "Series", phase: "Pre-Production", budget: 120000, spent: 34670, scenes: 72, days: 12, tasks: 80, offset: 21, runtime: 144, premise: "Six short episodes follow a changing household through the final month of a shared lease." },
  { key: "last-message", title: "The Last Message We Never Sent to Each Other", type: "Short Film", phase: "Post-Production", budget: 3000, spent: 2975, scenes: 9, days: 3, tasks: 3, offset: -20, runtime: 14, premise: "An unsent voice message returns two old friends to the conversation they kept avoiding." },
  { key: "quiet-room", title: "The Quiet Room", type: "Short Film", phase: "Development", budget: 0, spent: 0, scenes: 0, days: 0, tasks: 0, offset: 60, runtime: 0, premise: "A new project with no schedule, crew, expenses, or screenplay yet." },
  { key: "spring-collection", title: "Spring Collection - 15 / 30 / 60", type: "Commercial", phase: "Post-Production", budget: 7000, spent: 6900, scenes: 4, days: 1, tasks: 12, offset: -10, runtime: 1, premise: "A local maker prepares three delivery lengths from a single practical tabletop shoot." },
  { key: "one-take", title: "One Take, No Place to Hide", type: "Music Video", phase: "Pre-Production", budget: 2500, spent: 200, scenes: 8, days: 2, tasks: 7, offset: 14, runtime: 5, premise: "A continuous performance threads through rehearsal spaces; shoot dates are still unconfirmed." },
];

const CREW = [
  ["Avery Stone", "Director"], ["Sam Rivera", "Producer"], ["Jordan Lee", "Director of Photography"],
  ["Morgan Ellis", "Production Sound Mixer"], ["Taylor Quinn", "Production Designer / Wardrobe"],
  ["Cameron Bell", "Assistant Director"], ["Robin Cruz", "Camera Assistant"], ["Jamie Chen", "Editor"],
];
const TASKS = ["Confirm location access", "Review script changes", "Resolve cast availability", "Reserve camera package", "Check transport plan", "Prepare production paperwork", "Review sound references", "Confirm edit handoff"];
const LOCATIONS = ["COMMUNITY WORKSHOP", "BUS DEPOT", "SHARED APARTMENT", "REHEARSAL ROOM"];
const CAST = ["MARA", "ELI", "DEV", "JO"];

export function createDemoPortfolio(now = new Date()): WorkspaceData {
  const workspace = cloneWorkspace(seedWorkspace);
  workspace.id = "workspace_demo_portfolio";
  workspace.name = "Demo portfolio";
  workspace.projects = [];
  workspace.members = [];
  workspace.restorePoints = [];
  workspace.auditLog = [];
  workspace.archivedProjectCount = 0;
  workspace.backupPolicy = "Manual export";
  workspace.nextBackup = "Not configured";
  const timestamp = now.toISOString();
  const dateAt = (offset: number) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  for (const entry of DEMO_PROJECTS) {
    const project = createFilmProjectFromTemplate(entry.title, entry.type);
    project.id = `demo_${entry.key}`;
    project.phase = entry.phase;
    project.phaseTone = project.color = "gray";
    project.starred = entry.key === "night-service";
    project.runtimeMinutes = entry.runtime;
    project.format = entry.key === "last-message" ? "B&W" : "Color";
    project.description = entry.premise;
    project.workflow = "Demo - local only";
    project.location = entry.tasks ? "Fictional production locations" : "TBD";
    project.timeline = [];
    project.totalBudget = entry.budget;
    project.spentBudget = entry.spent;
    project.shootDates = "TBD";
    project.openTasks = Array.from({ length: entry.tasks }, (_, index) => ({
      id: `${project.id}_task_${index}`, title: `${TASKS[index % TASKS.length]}${entry.tasks > TASKS.length ? ` - unit ${Math.floor(index / TASKS.length) + 1}` : ""}`,
      due: dateAt(index % 9 - 2), status: index % 9 < 2 ? "overdue" : index % 3 === 0 ? "ready" : "pending",
    }));
    const completed = entry.phase === "Post-Production" ? Math.max(0, entry.tasks - 2) : entry.phase === "Production" ? Math.floor(entry.tasks * 0.4) : 0;
    project.tasks = { done: completed, total: project.openTasks.length };
    project.openTasks = project.openTasks.slice(completed);
    project.progress = project.tasks.total ? Math.round(completed / project.tasks.total * 100) : 0;
    project.docs = entry.tasks ? [{
      id: `${project.id}_brief`, name: "Production brief.md", type: "MD", date: "Demo draft",
      markdownSnapshot: `# ${entry.title}\n\n${entry.premise}\n\n## Production notes\n\nAll names, records, and screenplay text in this portfolio are fictional.\n\n- Stage: ${entry.phase}\n- Audience: micro-budget non-union production\n`,
    }] : [];
    project.people = entry.tasks ? CREW.slice(0, entry.type === "Music Video" ? 3 : CREW.length).map(([name, role], index) => ({
      id: `${project.id}_person_${index}`, name: name!, role: role!, initials: name!.split(" ").map((word) => word[0]).join(""),
    })) : [];
    project.equipment = entry.tasks ? ["Mirrorless camera kit", "Prime lens set", "Field recorder and boom", "Battery-powered lighting kit"].map((name, index) => ({
      id: `${project.id}_gear_${index}`, name, status: index % 2 ? "Reserved" : "Ready", statusTone: "gray",
    })) : [];
    project.expenses = entry.budget ? ["Crew", "Equipment", "Locations", "Post-production"].map((category, index) => ({
      id: `${project.id}_expense_${index}`, category, spent: entry.spent * [0.4, 0.2, 0.1, 0.3][index]!,
      budget: entry.budget / 4, percent: 0,
    })).map((expense) => ({ ...expense, spent: Math.round(expense.spent * 100) / 100, percent: Math.round(expense.spent / expense.budget * 100) })) : [];
    workspace.projects.push(project);
    if (!entry.scenes) continue;

    const text = `Title: ${entry.title}\nAuthor: Fictional demo\n\n${Array.from({ length: entry.scenes }, (_, index) => (
      `${index % 2 ? "EXT." : "INT."} ${LOCATIONS[index % LOCATIONS.length]} - ${index % 3 ? "DAY" : "NIGHT"} #${index + 1}#\n\nA rehearsal marks the transition into sequence ${index + 1}. A folded map rests on the worktable.\n\n${CAST[index % CAST.length]}\nWe have time to try this once more.\n\n${CAST[(index + 1) % CAST.length]}\nThen let us start from the doorway.\n`
    )).join("\n")}`;
    const breakdown = parseScreenplayFile({ projectId: project.id, path: `${entry.key}.fountain`, kind: "fountain", text, sourceSizeBytes: new TextEncoder().encode(text).length, importedAt: timestamp, title: entry.title });
    breakdown.elements.forEach((element) => { element.reviewState = "confirmed"; });
    breakdown.occurrences.forEach((occurrence) => { occurrence.reviewState = "confirmed"; });
    workspace.screenplayBreakdowns.push(breakdown);
    const sourceDocId = `${project.id}_screenplay`;
    project.docs.push({ id: sourceDocId, name: `${entry.title}.fountain`, type: "ASSET", date: "Demo source", screenplayBreakdownId: breakdown.id, attachmentStatus: "metadata_only" });
    for (const [index, element] of breakdown.elements.entries()) {
      if (element.category === "location") workspace.productionLocations.push(updateProductionLocation(
        createProductionLocation({ projectId: project.id, breakdown, screenplayElementId: element.id }, timestamp),
        { status: index % 2 ? "hold" : "confirmed", permitStatus: "not_required", address: "Fictional set - no public address", parkingAccess: "Crew parking adjacent to the rehearsal space.", soundNotes: "Recheck ventilation noise before recording dialogue.", accessibilityNotes: "Ground-floor access; review the route during the tech scout." }, timestamp,
      ));
      if (element.category === "cast") workspace.productionTalent.push(updateProductionTalent(
        createProductionTalent({ projectId: project.id, breakdown, screenplayElementId: element.id }, timestamp),
        { performerName: CREW[index % CREW.length]![0]!, status: entry.phase === "Development" ? "prospect" : "cast", paperworkStatus: index % 2 ? "requested" : "complete", rateBasis: "day", agreedRateCents: 12500, generalNotes: "Fictional performer. No contact or messaging consent recorded." }, timestamp,
      ));
    }
    for (const scene of breakdown.scenes.slice(0, entry.key === "juniper" ? 36 : 6)) {
      for (const [index, description] of ["Wide master from doorway", "Close coverage of the exchange"].entries()) {
        workspace.productionShots.push(updateProductionShot(createProductionShot({ projectId: project.id, breakdown, sceneId: scene.id, description, existingShots: workspace.productionShots }, timestamp),
          { shotSize: index ? "Close-up" : "Wide", lens: index ? "50mm" : "24mm", estimatedMinutes: 25, setupGroup: "Doorway", status: entry.phase === "Post-Production" ? "captured" : "planned" }, timestamp));
      }
    }
    if (!entry.days) continue;
    let schedule = createProductionScheduleFromBreakdown(breakdown, "Working schedule", timestamp);
    while (schedule.shootDays.length < entry.days) schedule = addProductionShootDay(schedule, null, timestamp);
    const perDay = Math.ceil(entry.scenes / entry.days);
    for (let index = 0; index < entry.days; index += 1) {
      const day = schedule.shootDays[index]!;
      schedule = updateProductionShootDay(schedule, day.id, { date: entry.key === "one-take" ? null : dateAt(entry.offset + index), unit: entry.key === "juniper" && index % 4 === 3 ? "second" : "main" }, timestamp);
      const scenes = breakdown.scenes.slice(index * perDay, (index + 1) * perDay);
      schedule = moveProductionScheduleStrips(schedule, scenes.map((scene) => ({ kind: "scene", id: scene.id })), day.id, timestamp).schedule;
    }
    if (entry.phase === "Production" || entry.phase === "Post-Production") schedule = setProductionScheduleStatus(schedule, "locked", timestamp);
    workspace.productionSchedules.push(schedule);
    workspace.productionBudgetScenarios.push(updateProductionBudgetScenario(createProductionBudgetScenario(schedule, "Micro-budget estimate", timestamp), {
      crewDayCostCents: 65000, castDayRateCents: 12500, locationDayRateCents: 5000, equipmentDayCostCents: 15000, crewHeadcount: project.people.length, mealCostPerPersonCents: 1500,
    }, timestamp));
    const cast = breakdown.elements.find((element) => element.category === "cast");
    if (cast && entry.key !== "one-take") workspace.productionAvailability.push(createProductionAvailabilityWindow(breakdown, cast.id, entry.key === "juniper" ? "unavailable" : "available", dateAt(entry.offset), dateAt(entry.offset + entry.days), "Demo availability window", timestamp));
    for (const day of schedule.shootDays.slice(0, entry.phase === "Post-Production" ? entry.days : entry.phase === "Production" ? 2 : 0)) {
      let sheet = createProductionCallSheetFromScheduleDay(schedule, breakdown, day.id, `${entry.title} - Day ${day.ordinal}`, timestamp);
      sheet = updateProductionCallSheet(sheet, { callTime: entry.key === "signal-noise" ? "18:00" : "07:00", estimatedWrapTime: entry.key === "signal-noise" ? "02:00" : "17:00", generalNotes: "Fictional demo call sheet. Not for distribution.", weatherNotes: "Forecast not checked", safetyNotes: "Review actual location risks before any real production." }, timestamp);
      if (entry.phase === "Post-Production" || day.ordinal === 1) sheet = setProductionCallSheetStatus(sheet, "final", timestamp);
      workspace.productionCallSheets.push(sheet);
      if (entry.phase !== "Post-Production" && entry.offset + day.ordinal - 1 >= 0) continue;
      let report = createProductionReportFromCallSheet(sheet, project.people.length, `${entry.title} - Day ${day.ordinal} report`, timestamp);
      report = updateProductionReport(report, { firstShotTime: "08:00", mealStartTime: "12:00", mealEndTime: "12:45", cameraWrapTime: "16:30", setupCount: 8, takeCount: 24, productionNotes: "Demo actuals for review." }, timestamp);
      for (const result of report.sceneResults) report = updateProductionReportSceneResult(report, result.sceneId, { status: "completed" }, timestamp);
      workspace.productionReports.push(setProductionReportStatus(report, "final", timestamp));
    }
  }
  return workspace;
}
