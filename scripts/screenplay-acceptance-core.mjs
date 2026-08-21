import { parseScreenplayFile } from "@film/importers";
import {
  addProductionShootDay,
  analyzeProductionSchedule,
  analyzeProductionScheduleScenario,
  buildProductionSidesManifest,
  createProductionBudgetScenario,
  createProductionCallSheetFromScheduleDay,
  createProductionReportFromCallSheet,
  createProductionScheduleFromBreakdown,
  estimateProductionBudget,
  moveProductionScheduleStrips,
  updateProductionBudgetScenario,
} from "@film/schema";

const ACCEPTANCE_TIMESTAMP = "2026-08-21T00:00:00.000Z";
const SCENES_PER_DAY = 6;

export function runScreenplayAcceptance(input) {
  const breakdown = parseScreenplayFile({
    projectId: "project_private_acceptance",
    path: input.kind === "final_draft" ? "acceptance.fdx" : "acceptance.fountain",
    kind: input.kind,
    text: input.text,
    sourceSizeBytes: input.sourceSizeBytes,
    importedAt: ACCEPTANCE_TIMESTAMP,
    title: "Private acceptance screenplay",
  });
  if (!breakdown.scenes.length) throw new Error("Acceptance requires at least one parsed scene.");

  const targetDayCount = Math.ceil(breakdown.scenes.length / SCENES_PER_DAY);
  let schedule = createProductionScheduleFromBreakdown(breakdown, "Private acceptance schedule", ACCEPTANCE_TIMESTAMP);
  while (schedule.shootDays.length < targetDayCount) {
    schedule = addProductionShootDay(schedule, null, ACCEPTANCE_TIMESTAMP);
  }
  for (let index = 0; index < breakdown.scenes.length; index += SCENES_PER_DAY) {
    const day = schedule.shootDays[Math.floor(index / SCENES_PER_DAY)];
    if (!day) throw new Error("Acceptance could not allocate a shoot day.");
    const references = breakdown.scenes
      .slice(index, index + SCENES_PER_DAY)
      .map((scene) => ({ kind: "scene", id: scene.id }));
    schedule = moveProductionScheduleStrips(
      schedule,
      references,
      day.id,
      ACCEPTANCE_TIMESTAMP,
    ).schedule;
  }

  const analysis = analyzeProductionSchedule(schedule, breakdown, []);
  const scenario = analyzeProductionScheduleScenario(schedule, breakdown);
  const budgetScenario = updateProductionBudgetScenario(
    createProductionBudgetScenario(schedule, "Private acceptance estimate", ACCEPTANCE_TIMESTAMP),
    {
      crewDayCostCents: 100_000,
      castDayRateCents: 10_000,
      locationDayRateCents: 20_000,
      equipmentDayCostCents: 30_000,
      companyMoveCostCents: 5_000,
      crewHeadcount: 10,
      mealCostPerPersonCents: 1_000,
      contingencyBasisPoints: 1_000,
    },
    ACCEPTANCE_TIMESTAMP,
  );
  const estimate = estimateProductionBudget(budgetScenario, schedule, breakdown);
  const firstDay = schedule.shootDays[0];
  if (!firstDay) throw new Error("Acceptance schedule has no first shoot day.");
  const callSheet = createProductionCallSheetFromScheduleDay(
    schedule,
    breakdown,
    firstDay.id,
    "Private acceptance call sheet",
    ACCEPTANCE_TIMESTAMP,
  );
  const sides = buildProductionSidesManifest(callSheet, breakdown);
  const report = createProductionReportFromCallSheet(
    callSheet,
    10,
    "Private acceptance production report",
    ACCEPTANCE_TIMESTAMP,
  );
  const categories = [...new Set(breakdown.elements.map((element) => element.category))].sort();

  const evidence = {
    policy: "source_free_local_screenplay_acceptance",
    format: input.kind,
    sourceSizeBytes: input.sourceSizeBytes,
    screenplay: {
      sceneCount: breakdown.scenes.length,
      numberedSceneCount: breakdown.scenes.filter((scene) => scene.sceneNumber).length,
      locatedSceneCount: breakdown.scenes.filter((scene) => scene.location).length,
      elementCount: breakdown.elements.length,
      occurrenceCount: breakdown.occurrences.length,
      elementCountsByCategory: Object.fromEntries(categories.map((category) => [
        category,
        breakdown.elements.filter((element) => element.category === category).length,
      ])),
      warningCount: breakdown.revision.warnings.length,
    },
    schedule: {
      shootDayCount: schedule.shootDays.length,
      assignedStripCount: schedule.shootDays.reduce((total, day) => total + day.sceneIds.length + (day.sceneParts?.length ?? 0), 0),
      unassignedStripCount: schedule.unassignedSceneIds.length + (schedule.unassignedSceneParts?.length ?? 0),
      blockingConflictCount: analysis.blockingConflictCount,
      warningConflictCount: analysis.warningConflictCount,
      assumptionBreachCount: scenario.assumptionBreaches.length,
    },
    budget: {
      lineCount: estimate.lines.length,
      scheduledShootDays: estimate.scheduledShootDays,
      castWorkDays: estimate.castWorkDays,
      locationDayUses: estimate.locationDayUses,
      totalCents: estimate.totalCents,
    },
    callSheet: {
      sceneCount: callSheet.sceneIds.length,
      castCallCount: callSheet.castCalls.length,
    },
    sides: {
      sceneCount: sides.scenes.length,
      missingSceneCount: sides.missingSceneIds.length,
    },
    report: {
      plannedSceneCount: report.sceneResults.length,
      castCount: report.castCount,
      crewCount: report.crewCount,
    },
  };
  assertScreenplayAcceptanceEvidence(evidence);
  return evidence;
}

export function assertScreenplayAcceptanceEvidence(evidence) {
  if (evidence.policy !== "source_free_local_screenplay_acceptance") throw new Error("Acceptance evidence policy is missing.");
  if (evidence.screenplay.sceneCount < 1) throw new Error("Acceptance parsed no screenplay scenes.");
  if (evidence.schedule.assignedStripCount !== evidence.screenplay.sceneCount) throw new Error("Acceptance did not schedule every scene.");
  if (evidence.schedule.unassignedStripCount !== 0) throw new Error("Acceptance left strips unassigned.");
  if (evidence.callSheet.sceneCount < 1) throw new Error("Acceptance produced an empty call sheet.");
  if (evidence.sides.sceneCount !== evidence.callSheet.sceneCount || evidence.sides.missingSceneCount !== 0) {
    throw new Error("Acceptance sides do not match the call sheet.");
  }
  if (evidence.report.plannedSceneCount !== evidence.callSheet.sceneCount) {
    throw new Error("Acceptance report does not match the call sheet.");
  }
  if (evidence.budget.lineCount !== 6 || evidence.budget.scheduledShootDays !== evidence.schedule.shootDayCount) {
    throw new Error("Acceptance budget does not match the schedule.");
  }
}
