import { describe, expect, it } from "vitest";
import {
  seedWorkspace,
  type ProductionCallSheet,
  type ProductionCallSheetManifest,
  type ProductionDailyReport,
  type ProductionLocation,
  type ProductionLocationManifest,
  type ProductionTalent,
  type ProductionTalentManifest,
} from "@film/schema";
import {
  createProductionLocationMarkdown,
  createProductionReportMarkdown,
  createProductionReportSceneCsv,
  createProductionShotCsv,
  createProductionShotMarkdown,
  createProductionTalentMarkdown,
  type ProductionShotExportRow,
} from "../src/production-resource-export";

const exportedAt = "2026-08-30T18:00:00.000Z";

function shotRow(overrides: Partial<ProductionShotExportRow> = {}): ProductionShotExportRow {
  return {
    order: 1,
    shotNumber: "1A",
    sceneNumber: "12",
    sceneHeading: "INT. RADIO STATION - NIGHT",
    screenplayRevision: "Blue Draft",
    description: "Mara crosses to the console",
    status: "Ready",
    shotSize: "Wide",
    angle: "Eye level",
    movement: "Dolly",
    lens: "35mm",
    cameraSupport: "Dana dolly",
    frameRate: "24",
    estimatedMinutes: 20,
    setupGroup: "Station master",
    audioNotes: "Wild track",
    lightingNotes: "Practical console lights",
    notes: "Protect the insert",
    scheduleDays: "Principal Day 1 Main unit",
    callSheets: "Night Signal - Day 1 (Main unit, final)",
    documents: "Treatment.md",
    ...overrides,
  };
}

describe("production resource exports", () => {
  it("serializes shot lists without exposing source text and protects CSV formulas", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    const rows = [shotRow({ description: "=HYPERLINK(\"https://invalid.example\")" })];

    const markdown = createProductionShotMarkdown(project, rows, exportedAt);
    expect(markdown).toContain(`# Shot List: ${project.title}`);
    expect(markdown).toContain("screenplay source text");
    expect(markdown).toContain("Schedule use: Principal Day 1 Main unit");

    const csv = createProductionShotCsv(rows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\"'=HYPERLINK(\"\"https://invalid.example\"\")\"");
  });

  it("serializes daily report summaries and formula-safe scene CSV rows", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    const callSheet = {
      title: "Night Signal - Day 1",
      updatedAt: "2026-08-30T17:00:00.000Z",
    } as ProductionCallSheet;
    const report = {
      schemaVersion: 1,
      id: "report_1",
      projectId: project.id,
      productionCallSheetId: "call_sheet_1",
      productionScheduleId: "schedule_1",
      screenplayBreakdownId: "breakdown_1",
      sourceCallSheetUpdatedAt: callSheet.updatedAt,
      title: "Night Signal - Day 1 Report",
      status: "final",
      date: "2026-09-01",
      dayOrdinal: 1,
      unit: "main",
      primaryLocation: "Community Radio Station",
      sceneResults: [{ sceneId: "scene_12", status: "completed", notes: "=CMD()" }],
      actualCrewCallTime: "06:00",
      firstShotTime: "07:00",
      mealStartTime: "12:00",
      mealEndTime: "12:30",
      cameraWrapTime: "18:00",
      crewWrapTime: "18:30",
      crewCount: 8,
      castCount: 2,
      backgroundCount: 0,
      mealCount: 10,
      setupCount: 12,
      takeCount: 24,
      footageMinutes: 48,
      weatherActual: "Clear",
      delayNotes: "None",
      productionNotes: "Completed planned work",
      safetyIncidentNotes: "None",
      tomorrowNotes: "Desert access road",
      createdAt: exportedAt,
      updatedAt: exportedAt,
    } satisfies ProductionDailyReport;
    const manifest = {
      callSheetId: "call_sheet_1",
      scenes: [{ id: "scene_12", ordinal: 12, sceneNumber: "12", heading: "INT. RADIO STATION - NIGHT", location: "RADIO STATION", timeOfDay: "NIGHT", synopsis: null }],
      castCalls: [],
      locations: ["RADIO STATION"],
      missingSceneIds: [],
    } satisfies ProductionCallSheetManifest;

    const markdown = createProductionReportMarkdown(project, report, manifest, callSheet, exportedAt);
    expect(markdown).toContain("- Completion: 100%");
    expect(markdown).toContain("- Working time: 12h");
    expect(markdown).toContain("Source changed after report creation: no");

    const csv = createProductionReportSceneCsv(report, manifest);
    expect(csv).toContain("\"'=CMD()\"");
    expect(csv).not.toContain("screenplay source text");
  });

  it("makes sensitive location and talent details explicit only in requested briefs", () => {
    const project = structuredClone(seedWorkspace.projects[0]!);
    const location = {
      name: "Relay Tower",
      status: "confirmed",
      address: "100 Signal Road",
      contactName: "Location Owner",
      contactDetails: "owner@example.invalid",
      permitStatus: "approved",
      permitNotes: "Permit 42",
      parkingAccess: "South gate",
      powerNotes: "Generator",
      soundNotes: "Road noise after 5 PM",
      restroomNotes: "Portable unit",
      accessibilityNotes: "Level route",
      nearestHospital: "County General",
      weatherNotes: "High wind",
      safetyNotes: "Tie down stands",
      generalNotes: "Lock gate on wrap",
      documentIds: [project.docs[0]!.id],
    } as ProductionLocation;
    const locationManifest = {
      scenes: [],
      scheduleUses: [],
      availability: [],
      sourceMissing: false,
      sourceChanged: false,
    } as ProductionLocationManifest;
    const locationBrief = createProductionLocationMarkdown(project, location, locationManifest, exportedAt);
    expect(locationBrief).toContain("user-triggered local handoff includes the contact details");
    expect(locationBrief).toContain("owner@example.invalid");
    expect(locationBrief).toContain(`${project.docs[0]!.name} (${project.docs[0]!.type})`);

    const talent = {
      characterName: "Mara",
      performerName: "Avery Stone",
      status: "cast",
      contactName: "Avery",
      contactDetails: "avery@example.invalid",
      representativeName: "Independent",
      representativeDetails: "rep@example.invalid",
      paperworkStatus: "complete",
      rateBasis: "day",
      agreedRateCents: 25000,
      dealNotes: "Two shoot days",
      travelNotes: "Self report",
      dietaryNotes: "Vegetarian",
      accessibilityNotes: "None",
      wardrobeNotes: "Fitting complete",
      generalNotes: "Available for pickups",
      documentIds: [],
    } as ProductionTalent;
    const talentManifest = {
      scenes: [],
      scheduleUses: [],
      availability: [],
      sourceMissing: false,
      sourceChanged: false,
    } as ProductionTalentManifest;
    const talentBrief = createProductionTalentMarkdown(project, talent, talentManifest, exportedAt);
    expect(talentBrief).toContain("user-triggered local handoff includes the contact");
    expect(talentBrief).toContain("avery@example.invalid");
    expect(talentBrief).toContain("$250 - Day");
    expect(talentBrief).toContain("not a union, payroll, tax, legal, or labor-compliance calculation");
  });
});
