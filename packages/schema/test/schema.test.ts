import { describe, expect, it } from "vitest";
import {
  addManualScreenplayElementOccurrence,
  applyScreenplayElementsToScene,
  addProductionShootDay,
  analyzeProductionSchedule,
  analyzeProductionScheduleScenario,
  applyProductionLocationToCallSheet,
  applyProductionTalentToCallSheet,
  buildScreenplayElementReport,
  buildProductionCallSheetManifest,
  buildProductionLocationManifest,
  buildProductionShotManifest,
  buildProductionSidesManifest,
  buildProductionTalentManifest,
  carryForwardScreenplayRevisionPlanning,
  carryForwardScreenplayReviewState,
  cloneWorkspace,
  compareScreenplayRevisions,
  compareProductionScheduleScenarios,
  createBackupSnapshot,
  createAttachmentBackupManifest,
  createEquipmentItem,
  createExpenseLine,
  createFilmProjectFromTemplate,
  createOperation,
  createProductionAvailabilityWindow,
  createProductionBudgetScenario,
  createProductionCallSheetFromScheduleDay,
  createProductionLocation,
  createProductionShot,
  createProductionTalent,
  createProductionReportFromCallSheet,
  createProductionScheduleFromBreakdown,
  createProjectDoc,
  createProjectPerson,
  createTask,
  dustWaveWorkspace,
  duplicateProductionSchedule,
  estimateProductionBudget,
  formatCurrency,
  formatWorkspaceRole,
  getFilmProfileMutationFieldDefinitions,
  getFilmProfileMutationFieldKeys,
  getRecordMutationFieldDefinitions,
  getRecordMutationFieldKeys,
  isFilmProfileMutationFieldKey,
  isRecordMutationFieldKeyForEntity,
  moveProductionScheduleScene,
  moveProductionScheduleScenePart,
  moveProductionScheduleStrips,
  moveScreenplayElementCategoryInWorkspace,
  mergeScreenplayElementsInWorkspace,
  normalizeFilmProfileMutationFieldKeys,
  normalizeProductionScheduleVersion,
  normalizeRecordMutationFieldKeysForEntity,
  orderScreenplayScenesByProductionSchedule,
  reconcileProductionScheduleScenes,
  mergeProductionScheduleSceneParts,
  removeProductionAvailabilityWindow,
  removeProductionShootDay,
  reorderProductionScheduleScene,
  reorderProductionScheduleScenePart,
  reorderProductionShot,
  rebaseProductionScheduleToRevision,
  searchScreenplayScenes,
  seedWorkspace,
  setProductionScheduleStatus,
  setProductionScheduleCastDayStatus,
  setProductionCallSheetStatus,
  setProductionReportStatus,
  summarizeProductionReport,
  splitProductionScheduleScene,
  suggestScreenplayElementDuplicates,
  syncProductionCallSheetFromScheduleDay,
  updateProductionScheduleAssumptions,
  updateProductionBudgetScenario,
  updateProductionCallSheet,
  updateProductionCallSheetCastCall,
  updateProductionLocation,
  updateProductionShot,
  updateProductionTalent,
  updateProductionReport,
  updateProductionReportSceneResult,
  updateProductionShootDay,
  validateOperationBatchForSync,
  type ScreenplayBreakdown,
} from "../src/index";

describe("schema helpers", () => {
  it("creates backup snapshots without provider secrets", () => {
    const stripeSecret = `${["sk", "live"].join("_")}_supersecretproviderkey`;
    const googleApiKey = `${["AI", "za"].join("")}SyD-example-provider-key-material`;
    const privateKey = `${["-----BEGIN", "PRIVATE KEY-----"].join(" ")}\nabc\n-----END PRIVATE KEY-----`;
    const workspace = cloneWorkspace(seedWorkspace) as typeof seedWorkspace & {
      providerSecrets?: unknown;
    };
    workspace.providerSecrets = {
      stripeSecretKey: stripeSecret,
      googleApiKey,
      privateKey,
    };
    workspace.integrations[0] = {
      ...workspace.integrations[0]!,
      oauth: {
        accessToken: "provider-access-token",
        refreshToken: "provider-refresh-token",
        expiresAt: "2026-07-08T00:00:00.000Z",
      },
      secretsPolicy: "worker_only",
    } as typeof workspace.integrations[number] & {
      oauth: unknown;
      secretsPolicy: string;
    };
    workspace.projects[0] = {
      ...workspace.projects[0]!,
      delivery: {
        publicId: "dist_public_1",
        webhookSecret: "whsec_supersecret",
        signingSecret: "signing_supersecret",
      },
    } as typeof workspace.projects[number] & {
      delivery: {
        publicId: string;
        webhookSecret: string;
        signingSecret: string;
      };
    };

    const snapshot = createBackupSnapshot(workspace);
    const snapshotJson = JSON.stringify(snapshot);

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.workspaceId).toBe(seedWorkspace.id);
    expect(snapshot.secretPolicy).toBe("provider_secrets_excluded");
    expect(snapshotJson).not.toContain(stripeSecret);
    expect(snapshotJson).not.toContain(googleApiKey);
    expect(snapshotJson).not.toContain(privateKey);
    expect(snapshotJson).not.toContain("provider-access-token");
    expect(snapshotJson).not.toContain("provider-refresh-token");
    expect(snapshotJson).not.toContain("whsec_supersecret");
    expect(snapshotJson).not.toContain("signing_supersecret");
    expect(snapshotJson).toContain("dist_public_1");
    expect(snapshotJson).toContain("worker_only");
  });

  it("formats currency for dashboard display", () => {
    expect(formatCurrency(82410)).toBe("$82,410");
  });

  it("creates film projects from the reusable template", () => {
    const project = createFilmProjectFromTemplate("  New Short Film  ", "  Short Film  ");

    expect(project.title).toBe("New Short Film");
    expect(project.type).toBe("Short Film");
    expect(project.phase).toBe("Development");
    expect(project.docs.map((doc) => doc.name)).toContain("Treatment.md");
  });

  it("creates queued operation records for offline sync", () => {
    const operation = createOperation(
      seedWorkspace.id,
      "project.created",
      "project",
      "proj_test",
      "Project created: Test",
    );

    expect(operation.status).toBe("queued");
    expect(operation.workspaceId).toBe(seedWorkspace.id);
    expect(operation.kind).toBe("project.created");
  });

  it("creates native Markdown document records with safe defaults", () => {
    const doc = createProjectDoc("Treatment");

    expect(doc.id).toMatch(/^doc_/);
    expect(doc.name).toBe("Treatment.md");
    expect(doc.type).toBe("MD");
    expect(doc.date).toBe("Draft");
  });

  it("creates imported asset document records with source metadata", () => {
    const doc = createProjectDoc("Poster.png", "ASSET", {
      date: "Imported asset",
      sourcePath: "Feature/Poster.png",
      sourceSizeBytes: 4096,
      sourceContentType: "image/png",
      attachmentStatus: "metadata_only",
      attachmentR2ObjectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
    });

    expect(doc.name).toBe("Poster.png");
    expect(doc.type).toBe("ASSET");
    expect(doc.sourcePath).toBe("Feature/Poster.png");
    expect(doc.sourceSizeBytes).toBe(4096);
    expect(doc.sourceContentType).toBe("image/png");
    expect(doc.attachmentStatus).toBe("metadata_only");
    expect(doc.attachmentR2ObjectKey).toContain("workspaces/");
  });

  it("creates local person, equipment, and expense records with bounded defaults", () => {
    expect(createTask("  Scout rooftop  ", "  Jul 30  ")).toEqual({
      id: expect.stringMatching(/^task_/),
      title: "Scout rooftop",
      due: "Jul 30",
      status: "pending",
    });
    expect(createTask("Untimed", "   ").due).toBe("Unscheduled");

    expect(createProjectPerson("  Rina Holt  ", "  Script Supervisor  ")).toEqual({
      id: expect.stringMatching(/^person_rina_holt_/),
      name: "Rina Holt",
      role: "Script Supervisor",
      initials: "RH",
    });

    expect(createEquipmentItem("  LED Wall  ", "  Reserved  ")).toEqual({
      id: expect.stringMatching(/^equipment_led_wall_/),
      name: "LED Wall",
      status: "Reserved",
      statusTone: "gray",
    });

    expect(createExpenseLine("  Art materials  ", 125.455, 500)).toEqual({
      id: expect.stringMatching(/^expense_art_materials_/),
      category: "Art materials",
      spent: 125.46,
      budget: 500,
      percent: 25,
    });
  });

  it("applies versioned stripboard transitions through shared schedule helpers", () => {
    const breakdown = scheduleBreakdownFixture("proj_schedule");
    const createdAt = "2026-08-20T12:00:00.000Z";
    const schedule = createProductionScheduleFromBreakdown(breakdown, "  Main   schedule  ", createdAt);
    const firstDayId = schedule.shootDays[0]?.id;
    if (!firstDayId) throw new Error("Expected first shoot day");

    expect(schedule).toMatchObject({
      projectId: "proj_schedule",
      screenplayBreakdownId: breakdown.id,
      title: "Main schedule",
      status: "draft",
      unassignedSceneIds: ["scene_1", "scene_2", "scene_3"],
    });

    const withDate = updateProductionShootDay(
      schedule,
      firstDayId,
      { date: "2026-09-02", notes: "  Company move after lunch.  " },
      "2026-08-20T12:01:00.000Z",
    );
    const withSecondDay = addProductionShootDay(withDate, "2026-09-03", "2026-08-20T12:02:00.000Z");
    const secondDayId = withSecondDay.shootDays[1]?.id;
    if (!secondDayId) throw new Error("Expected second shoot day");
    const assigned = moveProductionScheduleScene(
      moveProductionScheduleScene(
        moveProductionScheduleScene(withSecondDay, "scene_1", firstDayId),
        "scene_2",
        firstDayId,
      ),
      "scene_3",
      secondDayId,
    );
    const reordered = reorderProductionScheduleScene(assigned, "scene_2", -1);

    expect(reordered.shootDays[0]).toMatchObject({
      date: "2026-09-02",
      notes: "Company move after lunch.",
      sceneIds: ["scene_2", "scene_1"],
    });
    expect(reordered.shootDays[1]?.sceneIds).toEqual(["scene_3"]);
    expect(reordered.unassignedSceneIds).toEqual([]);

    const removed = removeProductionShootDay(reordered, secondDayId);
    expect(removed.shootDays).toHaveLength(1);
    expect(removed.unassignedSceneIds).toEqual(["scene_3"]);

    const duplicate = duplicateProductionSchedule(removed, "Alternate schedule", "2026-08-20T12:02:30.000Z");
    expect(duplicate.id).not.toBe(removed.id);
    expect(duplicate.shootDays[0]?.id).not.toBe(removed.shootDays[0]?.id);
    expect(duplicate).toMatchObject({ title: "Alternate schedule", status: "draft" });
    expect(duplicate.shootDays[0]?.sceneIds).toEqual(removed.shootDays[0]?.sceneIds);

    const locked = setProductionScheduleStatus(removed, "locked", "2026-08-20T12:03:00.000Z");
    expect(moveProductionScheduleScene(locked, "scene_3", firstDayId)).toBe(locked);
    expect(updateProductionShootDay(locked, firstDayId, { date: null })).toBe(locked);
    expect(addProductionShootDay(locked)).toBe(locked);

    const corrupt = {
      ...setProductionScheduleStatus(locked, "draft"),
      unassignedSceneIds: ["scene_1", "unknown_scene"],
      shootDays: [{ ...locked.shootDays[0]!, ordinal: 9, sceneIds: ["scene_1", "scene_2", "scene_2"] }],
    };
    const reconciled = reconcileProductionScheduleScenes(corrupt, breakdown);
    expect(reconciled.shootDays[0]).toMatchObject({ ordinal: 1, sceneIds: ["scene_1", "scene_2"] });
    expect(reconciled.unassignedSceneIds).toEqual(["scene_3"]);
  });

  it("compares screenplay revisions and carries reviewed occurrences across stable scene and element matches", () => {
    const previous = scheduleBreakdownFixture("proj_schedule");
    previous.occurrences = previous.occurrences.map((occurrence) => ({ ...occurrence, reviewState: "confirmed" }));
    previous.elements = previous.elements.map((element) => ({ ...element, reviewState: "confirmed" }));
    const next = scheduleRevisionFixture(previous);
    const comparison = compareScreenplayRevisions(previous, next);

    expect(comparison).toMatchObject({
      unchangedSceneCount: 1,
      changedSceneCount: 1,
      addedSceneCount: 1,
      removedSceneCount: 1,
    });
    expect(comparison.sceneChanges.find((change) => change.nextSceneId === "next_scene_2")).toMatchObject({
      previousSceneId: "scene_2",
      status: "changed",
      matchBasis: "scene_number",
    });
    expect(comparison.elementMatches).toEqual(expect.arrayContaining([
      expect.objectContaining({ previousElementId: "element_mara", nextElementId: "next_element_mara" }),
      expect.objectContaining({ previousElementId: "element_station", nextElementId: "next_element_station" }),
    ]));

    const carried = carryForwardScreenplayReviewState(previous, next, comparison);
    expect(carried.occurrences.find((occurrence) => occurrence.id === "next_occ_mara_1")?.reviewState).toBe("confirmed");
    expect(carried.occurrences.find((occurrence) => occurrence.id === "next_occ_new_4")?.reviewState).toBe("suggested");
    expect(carried.elements.find((element) => element.id === "next_element_mara")?.reviewState).toBe("confirmed");
    expect(carried.elements.find((element) => element.id === "next_element_new")?.reviewState).toBe("suggested");
  });

  it("adds deduplicated manual scene tags and searches source plus active graph elements locally", () => {
    const breakdown = scheduleBreakdownFixture("proj_schedule");
    const tagged = addManualScreenplayElementOccurrence(
      breakdown,
      "scene_1",
      "prop",
      "  Field   Recorder  ",
      { excerpt: "Field recorder on the desk", sourceLine: 1 },
      "2026-08-21T12:00:00.000Z",
    );
    const manualElement = tagged.elements.find((element) => element.category === "prop");
    expect(manualElement).toMatchObject({
      name: "Field Recorder",
      normalizedName: "FIELD RECORDER",
      source: "manual",
      reviewState: "confirmed",
    });
    expect(tagged.occurrences.at(-1)).toMatchObject({
      sceneId: "scene_1",
      elementId: manualElement?.id,
      excerpt: "Field recorder on the desk",
      reviewState: "confirmed",
    });

    const duplicate = addManualScreenplayElementOccurrence(tagged, "scene_1", "prop", "field recorder");
    expect(duplicate.elements).toHaveLength(tagged.elements.length);
    expect(duplicate.occurrences).toHaveLength(tagged.occurrences.length);
    const reused = addManualScreenplayElementOccurrence(duplicate, "scene_2", "prop", "FIELD RECORDER");
    expect(reused.elements).toHaveLength(tagged.elements.length);
    expect(reused.occurrences).toHaveLength(tagged.occurrences.length + 1);

    expect(searchScreenplayScenes(reused, "field recorder")).toEqual([
      expect.objectContaining({ sceneId: "scene_1", matchKinds: ["element"] }),
      expect.objectContaining({ sceneId: "scene_2", matchKinds: ["element"] }),
    ]);
    expect(searchScreenplayScenes(reused, "LOCATION 3")).toEqual([
      expect.objectContaining({ sceneId: "scene_3", matchKinds: ["heading", "source"] }),
    ]);
    expect(searchScreenplayScenes(reused, "   ")).toEqual([]);
  });

  it("applies a bounded active element batch to one scene through the shared occurrence mutation", () => {
    const breakdown = addManualScreenplayElementOccurrence(
      scheduleBreakdownFixture("proj_element_copy"),
      "scene_1",
      "prop",
      "Field Recorder",
    );
    const fieldRecorder = breakdown.elements.find((element) => element.name === "Field Recorder");
    if (!fieldRecorder) throw new Error("Expected manual prop");
    const withDismissedTarget = {
      ...breakdown,
      occurrences: [...breakdown.occurrences, {
        id: "occ_station_2_dismissed",
        sceneId: "scene_2",
        elementId: "element_station",
        sourceLine: 2,
        excerpt: "LOCATION 1",
        reviewState: "dismissed" as const,
      }],
    };

    const result = applyScreenplayElementsToScene(
      withDismissedTarget,
      "scene_2",
      ["element_mara", "element_station", fieldRecorder.id, fieldRecorder.id],
      "2026-08-21T13:00:00.000Z",
    );

    expect(result.summary).toEqual({
      targetSceneId: "scene_2",
      requestedCount: 3,
      addedCount: 1,
      reactivatedCount: 1,
      alreadyPresentCount: 1,
    });
    expect(result.breakdown.occurrences.filter((occurrence) => (
      occurrence.sceneId === "scene_2" && occurrence.reviewState !== "dismissed"
    ))).toEqual(expect.arrayContaining([
      expect.objectContaining({ elementId: "element_mara", sourceLine: 2, reviewState: "confirmed" }),
      expect.objectContaining({ elementId: "element_station", sourceLine: 2, reviewState: "confirmed" }),
      expect.objectContaining({ elementId: fieldRecorder.id, sourceLine: 2, reviewState: "confirmed" }),
    ]));
    expect(JSON.stringify(result.summary)).not.toContain("INT. LOCATION");
    expect(() => applyScreenplayElementsToScene(breakdown, "scene_2", ["missing_element"])).toThrow(/active elements/);
    expect(() => applyScreenplayElementsToScene(
      breakdown,
      "scene_2",
      Array.from({ length: 101 }, (_, index) => `element_${index}`),
    )).toThrow(/100 elements/);
  });

  it("builds filtered element inventory rows from active reviewed occurrences without copying source text", () => {
    const breakdown = scheduleBreakdownFixture("proj_element_report");
    const tagged = addManualScreenplayElementOccurrence(
      addManualScreenplayElementOccurrence(breakdown, "scene_1", "prop", "Field Recorder"),
      "scene_2",
      "prop",
      "Field Recorder",
    );
    const report = buildScreenplayElementReport(tagged, "prop");

    expect(report).toMatchObject({
      screenplayBreakdownId: tagged.id,
      screenplayRevisionId: tagged.revision.id,
      category: "prop",
      occurrenceCount: 2,
      sceneUseCount: 2,
      rows: [{
        category: "prop",
        name: "Field Recorder",
        source: "manual",
        reviewState: "confirmed",
        occurrenceCount: 2,
        confirmedOccurrenceCount: 2,
        sceneCount: 2,
        firstScene: expect.objectContaining({ id: "scene_1", sceneNumber: "1" }),
        scenes: [
          expect.objectContaining({ id: "scene_1", heading: "INT. LOCATION 1 - DAY" }),
          expect.objectContaining({ id: "scene_2", heading: "INT. LOCATION 2 - DAY" }),
        ],
        occurrences: [
          expect.objectContaining({ sceneId: "scene_1", sceneNumber: "1", sceneHeading: "INT. LOCATION 1 - DAY", reviewState: "confirmed" }),
          expect.objectContaining({ sceneId: "scene_2", sceneNumber: "2", sceneHeading: "INT. LOCATION 2 - DAY", reviewState: "confirmed" }),
        ],
      }],
    });
    expect(JSON.stringify(report)).not.toContain("sourceText");
    expect(JSON.stringify(report)).not.toContain("excerpt");

    const withDismissals = {
      ...tagged,
      elements: tagged.elements.map((element) => element.id === "element_eli" ? { ...element, reviewState: "dismissed" as const } : element),
      occurrences: tagged.occurrences.map((occurrence) => (
        occurrence.sceneId === "scene_2" && occurrence.elementId === report.rows[0]?.elementId
          ? { ...occurrence, reviewState: "dismissed" as const }
          : occurrence
      )),
    };
    const active = buildScreenplayElementReport(withDismissals);
    expect(active.rows.some((row) => row.elementId === "element_eli")).toBe(false);
    expect(active.rows.find((row) => row.category === "prop")).toMatchObject({ occurrenceCount: 1, sceneCount: 1 });
    expect(active.rows.find((row) => row.category === "prop")?.occurrences).toHaveLength(1);
  });

  it("suggests local duplicate elements and explicitly merges live references without rewriting issued call sheets", () => {
    const breakdown = scheduleBreakdownFixture("proj_element_merge");
    const withDuplicate = addManualScreenplayElementOccurrence(
      addManualScreenplayElementOccurrence(breakdown, "scene_1", "cast", "MARA UNIT", { sourceLine: 1 }),
      "scene_3",
      "cast",
      "MARA UNIT",
      { sourceLine: 3 },
      "2026-08-21T12:00:00.000Z",
    );
    const source = withDuplicate.elements.find((element) => element.name === "MARA UNIT");
    if (!source) throw new Error("Expected duplicate cast element");
    const suggestions = suggestScreenplayElementDuplicates(withDuplicate, "cast");
    expect(suggestions).toMatchObject({
      screenplayBreakdownId: withDuplicate.id,
      category: "cast",
      activeElementCount: 3,
      truncated: false,
      suggestions: [expect.objectContaining({
        firstElementId: "element_mara",
        firstName: "MARA",
        secondElementId: source.id,
        secondName: "MARA UNIT",
        firstOccurrenceCount: 2,
        secondOccurrenceCount: 2,
        reasons: expect.arrayContaining(["name_containment"]),
      })],
    });
    expect(JSON.stringify(suggestions)).not.toContain("sourceText");
    expect(JSON.stringify(suggestions)).not.toContain("excerpt");

    const targetAvailability = createProductionAvailabilityWindow(
      withDuplicate,
      "element_mara",
      "available",
      "2026-09-01",
      "2026-09-02",
    );
    const duplicateAvailability = createProductionAvailabilityWindow(
      withDuplicate,
      source.id,
      "available",
      "2026-09-01",
      "2026-09-02",
    );
    const uniqueAvailability = createProductionAvailabilityWindow(
      withDuplicate,
      source.id,
      "preferred",
      "2026-09-03",
      "2026-09-03",
    );
    const talent = createProductionTalent({
      projectId: withDuplicate.projectId,
      breakdown: withDuplicate,
      screenplayElementId: source.id,
    });
    const schedule = createProductionScheduleFromBreakdown(withDuplicate);
    const shootDayId = schedule.shootDays[0]?.id;
    if (!shootDayId) throw new Error("Expected a shoot day");
    const assigned = moveProductionScheduleScene(schedule, "scene_3", shootDayId);
    const annotatedSchedule = addProductionShootDay(assigned);
    const secondDayId = annotatedSchedule.shootDays[1]?.id;
    if (!secondDayId) throw new Error("Expected second shoot day");
    annotatedSchedule.castDayAnnotations = [
      { elementId: "element_mara", dayId: shootDayId, status: "hold" },
      { elementId: source.id, dayId: shootDayId, status: "travel" },
      { elementId: source.id, dayId: secondDayId, status: "hold" },
    ];
    const callSheet = createProductionCallSheetFromScheduleDay(annotatedSchedule, withDuplicate, shootDayId);
    const workspace = cloneWorkspace(seedWorkspace);
    workspace.screenplayBreakdowns = [withDuplicate];
    workspace.productionAvailability = [targetAvailability, duplicateAvailability, uniqueAvailability];
    workspace.productionTalent = [talent];
    workspace.productionCallSheets = [callSheet];
    workspace.productionSchedules = [annotatedSchedule];

    const merged = mergeScreenplayElementsInWorkspace(
      workspace,
      withDuplicate.id,
      "element_mara",
      source.id,
      "2026-08-21T13:00:00.000Z",
    );
    expect(merged.summary).toEqual({
      targetElementId: "element_mara",
      targetName: "MARA",
      sourceElementId: source.id,
      sourceName: "MARA UNIT",
      occurrencesReassigned: 1,
      occurrenceDuplicatesRemoved: 1,
      castDayAnnotationsRelinked: 1,
      castDayAnnotationDuplicatesRemoved: 1,
      availabilityWindowsRelinked: 1,
      availabilityDuplicatesRemoved: 1,
      locationsRelinked: 0,
      talentRelinked: 1,
      historicalCastCallsPreserved: 1,
    });
    const mergedBreakdown = merged.workspace.screenplayBreakdowns[0];
    expect(mergedBreakdown?.elements.some((element) => element.id === source.id)).toBe(false);
    expect(mergedBreakdown?.occurrences.filter((occurrence) => occurrence.elementId === "element_mara")).toHaveLength(3);
    expect(mergedBreakdown?.occurrences.find((occurrence) => occurrence.sceneId === "scene_1" && occurrence.elementId === "element_mara"))
      .toMatchObject({ reviewState: "confirmed" });
    expect(merged.workspace.productionAvailability).toHaveLength(2);
    expect(merged.workspace.productionAvailability.every((window) => window.elementId === "element_mara")).toBe(true);
    expect(merged.workspace.productionTalent[0]).toMatchObject({ screenplayElementId: "element_mara" });
    expect(merged.workspace.productionCallSheets[0]?.castCalls.some((castCall) => castCall.elementId === source.id)).toBe(true);
    expect(merged.workspace.productionSchedules[0]?.castDayAnnotations).toEqual([
      { elementId: "element_mara", dayId: shootDayId, status: "hold" },
      { elementId: "element_mara", dayId: secondDayId, status: "hold" },
    ]);

    const withLocationDuplicate = addManualScreenplayElementOccurrence(
      mergedBreakdown!,
      "scene_2",
      "location",
      "LOCATION 1 ANNEX",
    );
    const sourceLocationElement = withLocationDuplicate.elements.find((element) => element.name === "LOCATION 1 ANNEX");
    if (!sourceLocationElement) throw new Error("Expected duplicate location element");
    const location = createProductionLocation({
      projectId: withLocationDuplicate.projectId,
      breakdown: withLocationDuplicate,
      screenplayElementId: sourceLocationElement.id,
    });
    const locationWorkspace = {
      ...merged.workspace,
      screenplayBreakdowns: [withLocationDuplicate],
      productionLocations: [location],
    };
    const locationMerged = mergeScreenplayElementsInWorkspace(
      locationWorkspace,
      withLocationDuplicate.id,
      "element_station",
      sourceLocationElement.id,
      "2026-08-21T14:00:00.000Z",
    );
    expect(locationMerged.summary.locationsRelinked).toBe(1);
    expect(locationMerged.workspace.productionLocations[0]).toMatchObject({ screenplayElementId: "element_station" });
  });

  it("moves elements across categories, merges destination collisions, and guards incompatible live resources", () => {
    const breakdown = scheduleBreakdownFixture("proj_element_category");
    const withElements = addManualScreenplayElementOccurrence(
      addManualScreenplayElementOccurrence(
        addManualScreenplayElementOccurrence(breakdown, "scene_1", "prop", "Field Recorder", { sourceLine: 1 }),
        "scene_2",
        "prop",
        "Field Recorder",
        { sourceLine: 2 },
      ),
      "scene_1",
      "equipment",
      "Field Recorder",
      { sourceLine: 1 },
    );
    const source = withElements.elements.find((element) => element.category === "prop" && element.name === "Field Recorder");
    const destination = withElements.elements.find((element) => element.category === "equipment" && element.name === "Field Recorder");
    if (!source || !destination) throw new Error("Expected category-move elements");
    const workspace = cloneWorkspace(seedWorkspace);
    workspace.screenplayBreakdowns = [withElements];
    const moved = moveScreenplayElementCategoryInWorkspace(
      workspace,
      withElements.id,
      source.id,
      "equipment",
      "2026-08-21T15:00:00.000Z",
    );
    expect(moved.summary).toMatchObject({
      elementId: source.id,
      previousCategory: "prop",
      nextCategory: "equipment",
      canonicalElementId: destination.id,
      mergedWithExistingElement: true,
      occurrencesReassigned: 1,
      occurrenceDuplicatesRemoved: 1,
    });
    const equipmentReport = buildScreenplayElementReport(moved.workspace.screenplayBreakdowns[0]!, "equipment");
    expect(equipmentReport.rows.filter((row) => row.name === "Field Recorder")).toHaveLength(1);
    expect(equipmentReport.rows.find((row) => row.name === "Field Recorder")).toMatchObject({ occurrenceCount: 2, sceneCount: 2 });

    const location = createProductionLocation({
      projectId: breakdown.projectId,
      breakdown,
      screenplayElementId: "element_station",
    });
    const locationWorkspace = cloneWorkspace(seedWorkspace);
    locationWorkspace.screenplayBreakdowns = [breakdown];
    locationWorkspace.productionLocations = [location];
    expect(() => moveScreenplayElementCategoryInWorkspace(
      locationWorkspace,
      breakdown.id,
      "element_station",
      "prop",
    )).toThrow(/1 location record/);

    const schedule = createProductionScheduleFromBreakdown(breakdown);
    const shootDayId = schedule.shootDays[0]?.id;
    if (!shootDayId) throw new Error("Expected a shoot day");
    const assigned = moveProductionScheduleScene(schedule, "scene_1", shootDayId);
    const callSheet = createProductionCallSheetFromScheduleDay(assigned, breakdown, shootDayId);
    const historicalWorkspace = cloneWorkspace(seedWorkspace);
    historicalWorkspace.screenplayBreakdowns = [breakdown];
    historicalWorkspace.productionCallSheets = [callSheet];
    const historicalMove = moveScreenplayElementCategoryInWorkspace(
      historicalWorkspace,
      breakdown.id,
      "element_mara",
      "background",
    );
    expect(historicalMove.summary).toMatchObject({
      previousCategory: "cast",
      nextCategory: "background",
      mergedWithExistingElement: false,
      historicalCastCallsPreserved: 1,
    });
    expect(historicalMove.workspace.productionCallSheets[0]?.castCalls.some((castCall) => castCall.elementId === "element_mara")).toBe(true);
  });

  it("projects screenplay scenes in selected stripboard order without duplicating split sources", () => {
    const breakdown = scheduleBreakdownFixture("proj_scene_order");
    const schedule = createProductionScheduleFromBreakdown(breakdown);
    const shootDayId = schedule.shootDays[0]?.id;
    if (!shootDayId) throw new Error("Expected a shoot day");
    const assigned = reorderProductionScheduleScene(
      moveProductionScheduleScene(
        moveProductionScheduleScene(schedule, "scene_1", shootDayId),
        "scene_2",
        shootDayId,
      ),
      "scene_2",
      -1,
    );
    const withSplitSource: typeof assigned = {
      ...assigned,
      unassignedSceneIds: [],
      unassignedSceneParts: [
        { id: "part_scene_3_a", sceneId: "scene_3", label: "A", sourceStartLine: 3, sourceEndLine: 3 },
        { id: "part_scene_3_b", sceneId: "scene_3", label: "B", sourceStartLine: 3, sourceEndLine: 3 },
      ],
    };
    expect(orderScreenplayScenesByProductionSchedule(breakdown, withSplitSource).map((scene) => scene.id)).toEqual([
      "scene_2",
      "scene_1",
      "scene_3",
    ]);
    expect(orderScreenplayScenesByProductionSchedule(breakdown, null).map((scene) => scene.id)).toEqual([
      "scene_1",
      "scene_2",
      "scene_3",
    ]);
    expect(orderScreenplayScenesByProductionSchedule(
      { ...breakdown, id: "different_breakdown" },
      withSplitSource,
    ).map((scene) => scene.id)).toEqual(["scene_1", "scene_2", "scene_3"]);
  });

  it("creates idempotent draft planning copies and relinks matched production resources to a new revision", () => {
    const previous = scheduleBreakdownFixture("proj_schedule");
    const next = scheduleRevisionFixture(previous);
    const schedule = createProductionScheduleFromBreakdown(previous, "Principal", "2026-08-20T13:00:00.000Z");
    const dayId = schedule.shootDays[0]?.id;
    if (!dayId) throw new Error("Expected first shoot day");
    const assigned = moveProductionScheduleScene(
      moveProductionScheduleScene(schedule, "scene_1", dayId),
      "scene_2",
      dayId,
    );
    const rebased = rebaseProductionScheduleToRevision(
      assigned,
      previous,
      next,
      undefined,
      "Revision schedule",
      "2026-08-21T12:00:00.000Z",
    );
    expect(rebased).toMatchObject({
      screenplayBreakdownId: next.id,
      derivedFromScheduleId: assigned.id,
      title: "Revision schedule",
      status: "draft",
    });
    expect(rebased.shootDays[0]?.sceneIds).toEqual(["next_scene_1", "next_scene_2"]);
    expect(rebased.unassignedSceneIds).toEqual(["next_scene_4"]);

    const budget = updateProductionBudgetScenario(createProductionBudgetScenario(assigned, "Working estimate"), {
      crewDayCostCents: 75_000,
    });
    const availability = createProductionAvailabilityWindow(
      previous,
      "element_mara",
      "available",
      "2026-09-02",
      "2026-09-03",
    );
    const location = createProductionLocation({
      projectId: previous.projectId,
      breakdown: previous,
      screenplayElementId: "element_station",
    });
    const talent = createProductionTalent({
      projectId: previous.projectId,
      breakdown: previous,
      screenplayElementId: "element_mara",
    });
    const changedShot = createProductionShot({
      projectId: previous.projectId,
      breakdown: previous,
      sceneId: "scene_2",
      description: "Revised close-up",
    });
    const removedShot = createProductionShot({
      projectId: previous.projectId,
      breakdown: previous,
      sceneId: "scene_3",
      description: "Removed scene insert",
    });
    const first = carryForwardScreenplayRevisionPlanning({
      productionSchedules: [assigned],
      productionAvailability: [availability],
      productionBudgetScenarios: [budget],
      productionLocations: [location],
      productionTalent: [talent],
      productionShots: [changedShot, removedShot],
    }, previous, next, "2026-08-21T12:00:00.000Z");

    expect(first.summary).toEqual({
      schedulesCreated: 1,
      budgetScenariosCreated: 1,
      availabilityWindowsCreated: 1,
      locationsRelinked: 1,
      talentRelinked: 1,
      shotsRelinked: 1,
      locationsUnresolved: 0,
      talentUnresolved: 0,
      shotsUnresolved: 1,
    });
    expect(first.productionLocations[0]).toMatchObject({
      screenplayBreakdownId: next.id,
      screenplayElementId: "next_element_station",
    });
    expect(first.productionTalent[0]).toMatchObject({
      screenplayBreakdownId: next.id,
      screenplayElementId: "next_element_mara",
    });
    expect(first.productionShots.find((shot) => shot.id === changedShot.id)).toMatchObject({
      screenplayBreakdownId: next.id,
      sceneId: "next_scene_2",
      sourceBreakdownUpdatedAt: previous.updatedAt,
    });
    expect(first.productionShots.find((shot) => shot.id === removedShot.id)).toMatchObject({
      screenplayBreakdownId: previous.id,
      sceneId: "scene_3",
    });
    expect(first.productionBudgetScenarios[0]).toMatchObject({
      derivedFromBudgetScenarioId: budget.id,
      assumptions: expect.objectContaining({ crewDayCostCents: 75_000 }),
    });

    const second = carryForwardScreenplayRevisionPlanning(first, previous, next, "2026-08-21T12:05:00.000Z");
    expect(second.summary.schedulesCreated).toBe(0);
    expect(second.summary.budgetScenariosCreated).toBe(0);
    expect(second.summary.availabilityWindowsCreated).toBe(0);
    expect(second.summary.locationsRelinked).toBe(0);
    expect(second.summary.talentRelinked).toBe(0);
    expect(second.summary.shotsRelinked).toBe(0);
  });

  it("derives availability conflicts and cast work/off rows from scene occurrences", () => {
    const breakdown = scheduleBreakdownFixture("proj_schedule");
    const base = createProductionScheduleFromBreakdown(breakdown);
    const dayOneId = base.shootDays[0]?.id;
    if (!dayOneId) throw new Error("Expected first shoot day");
    const dated = updateProductionShootDay(base, dayOneId, { date: "2026-09-02" });
    const withSecondDay = addProductionShootDay(dated, "2026-09-03");
    const dayTwoId = withSecondDay.shootDays[1]?.id;
    if (!dayTwoId) throw new Error("Expected second shoot day");
    const assigned = moveProductionScheduleScene(
      moveProductionScheduleScene(
        moveProductionScheduleScene(withSecondDay, "scene_1", dayOneId),
        "scene_2",
        dayOneId,
      ),
      "scene_3",
      dayTwoId,
    );
    const windows = [
      createProductionAvailabilityWindow(breakdown, "element_mara", "unavailable", "2026-09-02", "2026-09-02"),
      createProductionAvailabilityWindow(breakdown, "element_station", "available", "2026-09-02", "2026-09-02"),
      createProductionAvailabilityWindow(breakdown, "element_eli", "preferred", "2026-09-03", "2026-09-03"),
    ];
    const analysis = analyzeProductionSchedule(assigned, breakdown, windows);

    expect(analysis.blockingConflictCount).toBe(1);
    expect(analysis.warningConflictCount).toBe(0);
    expect(analysis.conflicts[0]).toMatchObject({
      kind: "resource_unavailable",
      dayOrdinal: 1,
      resourceId: "element_mara",
      sceneIds: ["scene_1", "scene_2"],
    });
    expect(analysis.doodRows).toEqual([
      expect.objectContaining({
        elementId: "element_eli",
        totalWorkDays: 1,
        firstWorkDay: 2,
        lastWorkDay: 2,
        idleDays: 0,
        days: [expect.objectContaining({ state: "off" }), expect.objectContaining({ state: "work", sceneIds: ["scene_3"] })],
      }),
      expect.objectContaining({
        elementId: "element_mara",
        totalWorkDays: 1,
        firstWorkDay: 1,
        lastWorkDay: 1,
        idleDays: 0,
        days: [expect.objectContaining({ state: "work", sceneIds: ["scene_1", "scene_2"] }), expect.objectContaining({ state: "off" })],
      }),
    ]);

    const withTravel = setProductionScheduleCastDayStatus(
      setProductionScheduleCastDayStatus(assigned, breakdown, "element_mara", dayTwoId, "travel"),
      breakdown,
      "element_eli",
      dayOneId,
      "hold",
    );
    const annotatedAnalysis = analyzeProductionSchedule(withTravel, breakdown, windows);
    expect(annotatedAnalysis.doodRows.find((row) => row.elementId === "element_mara")).toMatchObject({
      travelDays: 1,
      holdDays: 0,
      days: [expect.objectContaining({ state: "work" }), expect.objectContaining({ state: "travel" })],
    });
    expect(annotatedAnalysis.doodRows.find((row) => row.elementId === "element_eli")).toMatchObject({
      travelDays: 0,
      holdDays: 1,
      days: [expect.objectContaining({ state: "hold" }), expect.objectContaining({ state: "work" })],
    });
    expect(() => setProductionScheduleCastDayStatus(
      withTravel,
      breakdown,
      "element_mara",
      dayOneId,
      "hold",
    )).toThrow(/Work is derived from assigned scenes/);
    const duplicate = duplicateProductionSchedule(withTravel);
    expect(duplicate.castDayAnnotations).toHaveLength(2);
    expect(duplicate.castDayAnnotations?.every((annotation) => duplicate.shootDays.some((day) => day.id === annotation.dayId))).toBe(true);
    expect(duplicate.castDayAnnotations?.some((annotation) => annotation.dayId === dayOneId || annotation.dayId === dayTwoId)).toBe(false);
    expect(removeProductionShootDay(withTravel, dayTwoId).castDayAnnotations).toEqual([
      expect.objectContaining({ elementId: "element_eli", status: "hold" }),
    ]);
    const nextBreakdown = scheduleRevisionFixture(breakdown);
    const rebased = rebaseProductionScheduleToRevision(withTravel, breakdown, nextBreakdown);
    expect(rebased.castDayAnnotations).toContainEqual(expect.objectContaining({ elementId: "next_element_mara", status: "travel" }));
    expect(rebased.castDayAnnotations).toHaveLength(1);
    expect(rebased.castDayAnnotations?.some((annotation) => annotation.elementId === "element_eli")).toBe(false);

    const unknownAnalysis = analyzeProductionSchedule(assigned, breakdown, windows.slice(0, 2));
    expect(unknownAnalysis.conflicts).toEqual([
      expect.objectContaining({ kind: "resource_unavailable", resourceId: "element_mara" }),
      expect.objectContaining({ kind: "availability_unknown", resourceId: "element_eli" }),
    ]);
    expect(removeProductionAvailabilityWindow(windows, windows[0]!.id)).toHaveLength(2);
    expect(() => createProductionAvailabilityWindow(
      breakdown,
      "element_mara",
      "available",
      "2026-09-03",
      "2026-09-02",
    )).toThrow(/on or after/);
    expect(() => createProductionAvailabilityWindow(
      breakdown,
      "element_mara",
      "available",
      "2026-02-31",
      "2026-03-01",
    )).toThrow(/YYYY-MM-DD/);

    const scenario = analyzeProductionScheduleScenario(assigned, breakdown, windows);
    expect(scenario).toMatchObject({
      shootDayCount: 2,
      assignedSceneCount: 3,
      companyMoveCount: 1,
      estimatedCompanyMoveMinutes: 90,
      maxScenesInDay: 2,
      maxLocationsInDay: 2,
      maxCastInDay: 1,
      maxConsecutiveShootDays: 2,
      blockingConflictCount: 1,
      warningConflictCount: 0,
      assumptionBreaches: [],
    });

    const constrained = updateProductionScheduleAssumptions(assigned, {
      maxScenesPerDay: 1,
      maxLocationsPerDay: 1,
      maxCastPerDay: 200,
      maxConsecutiveShootDays: 1,
      companyMoveMinutes: 75,
    });
    const constrainedAnalysis = analyzeProductionScheduleScenario(constrained, breakdown, windows);
    expect(constrained.assumptions.maxCastPerDay).toBe(50);
    expect(constrainedAnalysis.estimatedCompanyMoveMinutes).toBe(75);
    expect(constrainedAnalysis.assumptionBreaches.map((breach) => breach.kind)).toEqual([
      "scene_limit",
      "location_limit",
      "consecutive_day_limit",
    ]);

    const alternate = moveProductionScheduleScene(assigned, "scene_2", null);
    const comparison = compareProductionScheduleScenarios(constrained, alternate, breakdown, windows);
    expect(comparison.metrics.find((metric) => metric.key === "assignedSceneCount")).toMatchObject({ left: 3, right: 2, delta: -1 });
    expect(comparison.metrics.find((metric) => metric.key === "companyMoveCount")).toMatchObject({ left: 1, right: 0, delta: -1 });
    const lockedScenario = setProductionScheduleStatus(constrained, "locked");
    expect(updateProductionScheduleAssumptions(lockedScenario, { maxScenesPerDay: 4 })).toBe(lockedScenario);

    const emptyBudget = createProductionBudgetScenario(assigned, "  Working   estimate  ");
    expect(emptyBudget).toMatchObject({
      projectId: breakdown.projectId,
      productionScheduleId: assigned.id,
      title: "Working estimate",
      assumptions: expect.objectContaining({ crewDayCostCents: 0, contingencyBasisPoints: 0 }),
    });
    const budget = updateProductionBudgetScenario(emptyBudget, {
      crewDayCostCents: 100_000,
      castDayRateCents: 20_000,
      locationDayRateCents: 50_000,
      equipmentDayCostCents: 30_000,
      companyMoveCostCents: 25_000,
      crewHeadcount: 10,
      mealCostPerPersonCents: 1_500,
      contingencyBasisPoints: 1_000,
    });
    const estimate = estimateProductionBudget(budget, assigned, breakdown);
    expect(estimate).toMatchObject({
      scheduledShootDays: 2,
      castWorkDays: 2,
      locationDayUses: 3,
      companyMoves: 1,
      mealPersonDays: 22,
      subtotalCents: 508_000,
      contingencyCents: 50_800,
      totalCents: 558_800,
    });
    expect(estimate.lines).toEqual([
      expect.objectContaining({ key: "crew", units: 2, totalCents: 200_000 }),
      expect.objectContaining({ key: "cast", units: 2, totalCents: 40_000 }),
      expect.objectContaining({ key: "locations", units: 3, totalCents: 150_000 }),
      expect.objectContaining({ key: "equipment", units: 2, totalCents: 60_000 }),
      expect.objectContaining({ key: "company_moves", units: 1, totalCents: 25_000 }),
      expect.objectContaining({ key: "meals", units: 22, totalCents: 33_000 }),
    ]);
    expect(updateProductionBudgetScenario(budget, { contingencyBasisPoints: 10_000 }).assumptions.contingencyBasisPoints).toBe(5_000);
  });

  it("keeps unit scheduling local, normalizes legacy days, and blocks same-date cross-unit cast work", () => {
    const breakdown = scheduleBreakdownFixture("proj_units");
    const base = createProductionScheduleFromBreakdown(breakdown, "Unit plan", "2026-08-21T13:00:00.000Z");
    const mainDayId = base.shootDays[0]?.id;
    if (!mainDayId) throw new Error("Expected main-unit shoot day");
    const dated = updateProductionShootDay(base, mainDayId, { date: "2026-09-02" });
    const withSecondDay = addProductionShootDay(dated, "2026-09-02");
    const secondDayId = withSecondDay.shootDays[1]?.id;
    if (!secondDayId) throw new Error("Expected second-unit shoot day");
    const unitSchedule = updateProductionShootDay(withSecondDay, secondDayId, { unit: "second" });
    const assigned = moveProductionScheduleScene(
      moveProductionScheduleScene(unitSchedule, "scene_1", mainDayId),
      "scene_2",
      secondDayId,
    );

    const analysis = analyzeProductionSchedule(assigned, breakdown, []);
    expect(analysis.conflicts).toContainEqual(expect.objectContaining({
      kind: "cast_cross_unit_conflict",
      severity: "blocking",
      resourceId: "element_mara",
      dayOrdinal: 2,
      sceneIds: ["scene_1", "scene_2"],
    }));
    expect(analysis.doodRows.find((row) => row.elementId === "element_mara")?.days).toEqual([
      expect.objectContaining({ unit: "main", state: "work" }),
      expect.objectContaining({ unit: "second", state: "work" }),
    ]);
    expect(analyzeProductionScheduleScenario(assigned, breakdown).maxConsecutiveShootDays).toBe(1);

    const secondUnitCallSheet = createProductionCallSheetFromScheduleDay(
      assigned,
      breakdown,
      secondDayId,
      undefined,
      "2026-08-21T13:05:00.000Z",
    );
    expect(secondUnitCallSheet).toMatchObject({ unit: "second", title: "Unit plan - Day 2 - Second Unit" });
    expect(createProductionReportFromCallSheet(secondUnitCallSheet)).toMatchObject({ unit: "second", dayOrdinal: 2 });

    const legacy = normalizeProductionScheduleVersion({
      ...assigned,
      shootDays: assigned.shootDays.map(({ unit: _unit, ...day }) => day),
    } as typeof assigned);
    expect(legacy.shootDays.every((day) => day.unit === "main")).toBe(true);
  });

  it("splits one screenplay scene into movable source-range strips without copying source", () => {
    const breakdown = scheduleBreakdownFixture("proj_split");
    breakdown.scenes[0] = {
      ...breakdown.scenes[0]!,
      sourceStartLine: 1,
      sourceEndLine: 4,
      sourceText: "INT. LOCATION 1 - DAY\nMARA enters.\nShe checks the recorder.\nThe signal returns.",
    };
    const base = createProductionScheduleFromBreakdown(breakdown, "Split plan");
    const dayOneId = base.shootDays[0]?.id;
    if (!dayOneId) throw new Error("Expected first split shoot day");
    const withSecondDay = addProductionShootDay(base);
    const dayTwoId = withSecondDay.shootDays[1]?.id;
    if (!dayTwoId) throw new Error("Expected second split shoot day");
    const assigned = moveProductionScheduleScene(withSecondDay, "scene_1", dayOneId);
    const split = splitProductionScheduleScene(assigned, breakdown, "scene_1", 2, "2026-08-21T14:00:00.000Z");
    const parts = split.shootDays[0]?.sceneParts ?? [];

    expect(parts).toEqual([
      expect.objectContaining({ sceneId: "scene_1", label: "A", sourceStartLine: 1, sourceEndLine: 2 }),
      expect.objectContaining({ sceneId: "scene_1", label: "B", sourceStartLine: 3, sourceEndLine: 4 }),
    ]);
    expect(split.shootDays[0]?.sceneIds).not.toContain("scene_1");
    expect(split.unassignedSceneIds).not.toContain("scene_1");
    expect(() => splitProductionScheduleScene(split, breakdown, "scene_1", 2)).toThrow(/already split/);
    expect(() => splitProductionScheduleScene(assigned, breakdown, "scene_1", 4)).toThrow(/Split after/);

    const partBId = parts[1]?.id;
    if (!partBId) throw new Error("Expected scene part B");
    const reordered = reorderProductionScheduleScenePart(split, partBId, -1);
    expect(reordered.shootDays[0]?.sceneParts?.[0]?.label).toBe("B");
    const acrossDays = moveProductionScheduleScenePart(reordered, partBId, dayTwoId);
    expect(acrossDays.shootDays[0]?.sceneParts).toHaveLength(1);
    expect(acrossDays.shootDays[1]?.sceneParts).toEqual([expect.objectContaining({ id: partBId, sceneId: "scene_1" })]);
    expect(analyzeProductionScheduleScenario(acrossDays, breakdown).assignedSceneCount).toBe(2);

    const dayOneCallSheet = createProductionCallSheetFromScheduleDay(acrossDays, breakdown, dayOneId);
    const dayTwoCallSheet = createProductionCallSheetFromScheduleDay(acrossDays, breakdown, dayTwoId);
    expect(dayOneCallSheet.sceneParts).toEqual([expect.objectContaining({ label: "A", sourceStartLine: 1, sourceEndLine: 2 })]);
    expect(dayTwoCallSheet.sceneParts).toEqual([expect.objectContaining({ label: "B", sourceStartLine: 3, sourceEndLine: 4 })]);
    expect(buildProductionSidesManifest(dayOneCallSheet, breakdown).scenes[0]).toMatchObject({
      schedulePartLabel: "A",
      sourceStartLine: 1,
      sourceEndLine: 2,
      sourceText: "INT. LOCATION 1 - DAY\nMARA enters.",
    });
    expect(buildProductionSidesManifest(dayTwoCallSheet, breakdown).scenes[0]).toMatchObject({
      schedulePartLabel: "B",
      sourceStartLine: 3,
      sourceEndLine: 4,
      sourceText: "She checks the recorder.\nThe signal returns.",
    });

    const nextRevision = scheduleRevisionFixture(breakdown);
    const rebased = rebaseProductionScheduleToRevision(acrossDays, breakdown, nextRevision);
    expect(rebased.shootDays.flatMap((day) => day.sceneParts ?? [])).toEqual([
      expect.objectContaining({ sceneId: "next_scene_1", label: "A" }),
      expect.objectContaining({ sceneId: "next_scene_1", label: "B" }),
    ]);

    const merged = mergeProductionScheduleSceneParts(acrossDays, "scene_1");
    expect(merged.unassignedSceneIds).toContain("scene_1");
    expect(merged.shootDays.every((day) => (day.sceneParts ?? []).length === 0)).toBe(true);
    const locked = setProductionScheduleStatus(acrossDays, "locked");
    expect(mergeProductionScheduleSceneParts(locked, "scene_1")).toBe(locked);
  });

  it("moves a bounded mixed strip selection atomically through shared transitions", () => {
    const breakdown = scheduleBreakdownFixture("proj_batch_strips");
    breakdown.scenes[0] = {
      ...breakdown.scenes[0]!,
      sourceStartLine: 1,
      sourceEndLine: 4,
      sourceText: "INT. LOCATION 1 - DAY\nMARA enters.\nShe checks the recorder.\nThe signal returns.",
    };
    const base = addProductionShootDay(createProductionScheduleFromBreakdown(breakdown, "Batch strip plan"));
    const dayOneId = base.shootDays[0]?.id;
    const dayTwoId = base.shootDays[1]?.id;
    if (!dayOneId || !dayTwoId) throw new Error("Expected two batch-move shoot days");
    const split = splitProductionScheduleScene(
      moveProductionScheduleScene(base, "scene_1", dayOneId),
      breakdown,
      "scene_1",
      2,
    );
    const partBId = split.shootDays[0]?.sceneParts?.find((part) => part.label === "B")?.id;
    if (!partBId) throw new Error("Expected batch-move scene part B");
    const references = [
      { kind: "scene" as const, id: "scene_2" },
      { kind: "scene_part" as const, id: partBId },
      { kind: "scene" as const, id: "scene_2" },
    ];

    const result = moveProductionScheduleStrips(
      split,
      references,
      dayTwoId,
      "2026-08-21T15:00:00.000Z",
    );
    expect(result.summary).toEqual({
      targetDayId: dayTwoId,
      requestedCount: 2,
      movedCount: 2,
      alreadyInTargetCount: 0,
    });
    expect(result.schedule.shootDays[0]?.sceneParts).toEqual([expect.objectContaining({ label: "A" })]);
    expect(result.schedule.shootDays[1]?.sceneIds).toEqual(["scene_2"]);
    expect(result.schedule.shootDays[1]?.sceneParts).toEqual([expect.objectContaining({ id: partBId, label: "B" })]);
    expect(result.schedule.updatedAt).toBe("2026-08-21T15:00:00.000Z");
    expect(JSON.stringify(result.summary)).not.toContain("sourceText");

    const repeated = moveProductionScheduleStrips(result.schedule, references, dayTwoId);
    expect(repeated.schedule).toBe(result.schedule);
    expect(repeated.summary).toMatchObject({ requestedCount: 2, movedCount: 0, alreadyInTargetCount: 2 });
    expect(() => moveProductionScheduleStrips(split, [references[0]!, { kind: "scene", id: "missing" }], dayTwoId))
      .toThrow(/selected strip was not found/);
    expect(() => moveProductionScheduleStrips(split, references, "missing_day")).toThrow(/destination was not found/);
    expect(() => moveProductionScheduleStrips(split, [], dayTwoId)).toThrow(/at least one strip/);
    expect(() => moveProductionScheduleStrips(
      split,
      Array.from({ length: 201 }, (_, index) => ({ kind: "scene" as const, id: `scene_${index}` })),
      dayTwoId,
    )).toThrow(/limited to 200 strips/);

    const locked = setProductionScheduleStatus(split, "locked");
    const lockedResult = moveProductionScheduleStrips(locked, references, dayTwoId);
    expect(lockedResult.schedule).toBe(locked);
    expect(lockedResult.summary).toMatchObject({ requestedCount: 2, movedCount: 0, alreadyInTargetCount: 0 });
  });

  it("generates editable call sheets from a stable schedule-day scene snapshot", () => {
    const breakdown = scheduleBreakdownFixture("proj_call_sheet");
    const base = createProductionScheduleFromBreakdown(breakdown, "Principal");
    const dayId = base.shootDays[0]?.id;
    if (!dayId) throw new Error("Expected first shoot day");
    const dated = updateProductionShootDay(base, dayId, { date: "2026-09-02", notes: "Company move after lunch." });
    const assigned = moveProductionScheduleScene(
      moveProductionScheduleScene(dated, "scene_1", dayId),
      "scene_2",
      dayId,
    );
    const callSheet = createProductionCallSheetFromScheduleDay(
      assigned,
      breakdown,
      dayId,
      "  Day   One  ",
      "2026-08-20T13:00:00.000Z",
    );

    expect(callSheet).toMatchObject({
      title: "Day One",
      status: "draft",
      date: "2026-09-02",
      callTime: "07:00",
      estimatedWrapTime: "19:00",
      primaryLocation: "LOCATION 1",
      sceneIds: ["scene_1", "scene_2"],
      dayOrdinal: 1,
      totalShootDays: 1,
      generalNotes: "Company move after lunch.",
    });
    expect(callSheet.castCalls).toEqual([
      expect.objectContaining({ elementId: "element_mara", name: "MARA", sceneIds: ["scene_1", "scene_2"], callTime: "07:00" }),
    ]);

    const edited = updateProductionCallSheet(callSheet, {
      callTime: "06:30",
      estimatedWrapTime: "invalid",
      primaryLocation: "  Riverside Warehouse  ",
      parkingInstructions: "Crew lot on 4th.",
      nearestHospital: "County Medical",
      weatherNotes: "Cold morning",
      safetyNotes: "High visibility vests near traffic.",
    });
    const withCastCall = updateProductionCallSheetCastCall(edited, "element_mara", {
      callTime: "06:45",
      notes: "HMU complete by 07:00.",
    });
    const manifest = buildProductionCallSheetManifest(withCastCall, breakdown);
    const sides = buildProductionSidesManifest(withCastCall, breakdown);

    expect(edited.estimatedWrapTime).toBe("19:00");
    expect(manifest.scenes).toHaveLength(2);
    expect(manifest.locations).toEqual(["LOCATION 1", "LOCATION 2"]);
    expect(manifest.missingSceneIds).toEqual([]);
    expect(manifest.castCalls[0]).toMatchObject({ callTime: "06:45", notes: "HMU complete by 07:00." });
    expect(sides).toMatchObject({
      callSheetId: withCastCall.id,
      screenplayBreakdownId: breakdown.id,
      screenplayRevisionId: breakdown.revision.id,
      screenplayTitle: "Schedule Fixture",
      missingSceneIds: [],
      scenes: [
        expect.objectContaining({ id: "scene_1", sourceText: "INT. LOCATION 1 - DAY" }),
        expect.objectContaining({ id: "scene_2", sourceText: "INT. LOCATION 2 - DAY" }),
      ],
    });
    expect(sides.scenes[0]?.castCalls).toEqual([
      expect.objectContaining({ elementId: "element_mara", callTime: "06:45" }),
    ]);
    expect(() => buildProductionSidesManifest(withCastCall, {
      ...breakdown,
      projectId: "different-project",
    })).toThrow(/must match/);

    const finalized = setProductionCallSheetStatus(withCastCall, "final");
    expect(updateProductionCallSheet(finalized, { primaryLocation: "Changed" })).toBe(finalized);
    expect(updateProductionCallSheetCastCall(finalized, "element_mara", { callTime: "08:00" })).toBe(finalized);
    expect(setProductionCallSheetStatus(finalized, "draft").status).toBe("draft");

    const report = createProductionReportFromCallSheet(finalized, 8, "  Day   One Report  ", "2026-09-02T20:00:00.000Z");
    expect(report).toMatchObject({
      title: "Day One Report",
      status: "draft",
      date: "2026-09-02",
      crewCount: 8,
      castCount: 1,
      mealCount: 9,
      sceneResults: [
        { sceneId: "scene_1", status: "planned", notes: "" },
        { sceneId: "scene_2", status: "planned", notes: "" },
      ],
    });
    const timed = updateProductionReport(report, {
      actualCrewCallTime: "18:00",
      firstShotTime: "19:00",
      mealStartTime: "23:00",
      mealEndTime: "23:30",
      cameraWrapTime: "01:00",
      crewWrapTime: "02:00",
      setupCount: 12.4,
      takeCount: 42,
      footageMinutes: 87,
      safetyIncidentNotes: "No incidents.",
    });
    const completed = updateProductionReportSceneResult(
      updateProductionReportSceneResult(timed, "scene_1", { status: "completed", notes: "Printed." }),
      "scene_2",
      { status: "partial", notes: "Pickup held." },
    );
    expect(summarizeProductionReport(completed)).toMatchObject({
      plannedSceneCount: 2,
      completedSceneCount: 1,
      partialSceneCount: 1,
      heldSceneCount: 0,
      remainingSceneCount: 1,
      completionPercent: 50,
      grossDayMinutes: 480,
      mealMinutes: 30,
      workingMinutes: 450,
    });
    expect(completed.setupCount).toBe(12);
    const finalReport = setProductionReportStatus(completed, "final");
    expect(updateProductionReport(finalReport, { takeCount: 99 })).toBe(finalReport);
    expect(updateProductionReportSceneResult(finalReport, "scene_1", { status: "held" })).toBe(finalReport);
  });

  it("explicitly syncs draft call-sheet schedule data while preserving manual logistics and matching cast calls", () => {
    const breakdown = scheduleBreakdownFixture("proj_call_sheet_sync");
    const base = createProductionScheduleFromBreakdown(breakdown, "Principal");
    const dayId = base.shootDays[0]?.id;
    if (!dayId) throw new Error("Expected first shoot day");
    const assigned = moveProductionScheduleScene(
      moveProductionScheduleScene(
        updateProductionShootDay(base, dayId, { date: "2026-09-02", notes: "Schedule note." }, "2026-08-20T12:10:00.000Z"),
        "scene_1",
        dayId,
        "2026-08-20T12:11:00.000Z",
      ),
      "scene_2",
      dayId,
      "2026-08-20T12:12:00.000Z",
    );
    const generated = createProductionCallSheetFromScheduleDay(
      assigned,
      breakdown,
      dayId,
      "Night Signal - Day 1",
      "2026-08-20T12:13:00.000Z",
    );
    const edited = updateProductionCallSheet(generated, {
      callTime: "06:30",
      primaryLocation: "Community Radio Station",
      parkingInstructions: "Crew lot B.",
      generalNotes: "Breakfast at crew call.",
      safetyNotes: "High visibility vests.",
    }, "2026-08-20T12:14:00.000Z");
    const withCast = updateProductionCallSheetCastCall(edited, "element_mara", {
      performerName: "Avery Stone",
      callTime: "06:45",
      notes: "HMU complete by 07:00.",
    }, "2026-08-20T12:15:00.000Z");
    const changed = moveProductionScheduleScene(
      moveProductionScheduleScene(
        updateProductionShootDay(assigned, dayId, {
          date: "2026-09-03",
          notes: "Changed schedule note.",
          unit: "second",
        }, "2026-08-20T13:00:00.000Z"),
        "scene_2",
        null,
        "2026-08-20T13:01:00.000Z",
      ),
      "scene_3",
      dayId,
      "2026-08-20T13:02:00.000Z",
    );
    const synced = syncProductionCallSheetFromScheduleDay(
      withCast,
      changed,
      breakdown,
      "2026-08-20T13:03:00.000Z",
    );

    expect(synced).toMatchObject({
      id: generated.id,
      title: "Night Signal - Day 1",
      status: "draft",
      date: "2026-09-03",
      unit: "second",
      sourceScheduleUpdatedAt: "2026-08-20T13:02:00.000Z",
      sceneIds: ["scene_1", "scene_3"],
      primaryLocation: "Community Radio Station",
      parkingInstructions: "Crew lot B.",
      generalNotes: "Breakfast at crew call.",
      safetyNotes: "High visibility vests.",
    });
    expect(synced.castCalls).toEqual([
      expect.objectContaining({
        elementId: "element_eli",
        sceneIds: ["scene_3"],
        performerName: "",
        callTime: "06:30",
        notes: "",
      }),
      expect.objectContaining({
        elementId: "element_mara",
        sceneIds: ["scene_1"],
        performerName: "Avery Stone",
        callTime: "06:45",
        notes: "HMU complete by 07:00.",
      }),
    ]);
    const final = setProductionCallSheetStatus(synced, "final");
    expect(syncProductionCallSheetFromScheduleDay(final, changed, breakdown)).toBe(final);
    expect(() => syncProductionCallSheetFromScheduleDay(synced, { ...changed, id: "other_schedule" }, breakdown)).toThrow(/original schedule/);
  });

  it("keeps scouting records DRY while deriving scenes, schedule use, and availability", () => {
    const breakdown = scheduleBreakdownFixture("proj_location");
    const schedule = createProductionScheduleFromBreakdown(breakdown, "Principal");
    const dayId = schedule.shootDays[0]?.id;
    if (!dayId) throw new Error("Expected first shoot day");
    const assigned = moveProductionScheduleScene(
      updateProductionShootDay(schedule, dayId, { date: "2026-09-02" }),
      "scene_1",
      dayId,
    );
    const availability = createProductionAvailabilityWindow(
      breakdown,
      "element_station",
      "available",
      "2026-09-02",
      "2026-09-03",
      "Owner hold confirmed.",
    );
    const location = createProductionLocation({
      projectId: breakdown.projectId,
      breakdown,
      screenplayElementId: "element_station",
      documentIds: ["doc_scout", "doc_scout", ""],
    }, "2026-08-20T12:30:00.000Z");
    const confirmed = updateProductionLocation(location, {
      status: "confirmed",
      permitStatus: "approved",
      address: "  1420 Dock St  ",
      contactName: "  Lee Owner  ",
      contactDetails: "505-555-0100",
      parkingAccess: "Use crew lot B.",
      nearestHospital: "County Medical",
      weatherNotes: "Manual forecast review required.",
      safetyNotes: "High visibility vests near loading traffic.",
    }, "2026-08-20T13:00:00.000Z");
    const manifest = buildProductionLocationManifest(confirmed, breakdown, [assigned], [availability]);

    expect(confirmed).toMatchObject({
      name: "LOCATION 1",
      status: "confirmed",
      permitStatus: "approved",
      address: "1420 Dock St",
      documentIds: ["doc_scout"],
    });
    expect(manifest).toMatchObject({
      sourceMissing: false,
      sourceChanged: false,
      scenes: [expect.objectContaining({ id: "scene_1" })],
      scheduleUses: [expect.objectContaining({ scheduleTitle: "Principal", dayOrdinal: 1, sceneIds: ["scene_1"] })],
      availability: [expect.objectContaining({ status: "available", notes: "Owner hold confirmed." })],
    });

    const callSheet = createProductionCallSheetFromScheduleDay(assigned, breakdown, dayId);
    expect(applyProductionLocationToCallSheet(confirmed, callSheet)).toMatchObject({
      primaryLocation: "LOCATION 1 - 1420 Dock St",
      parkingInstructions: "Use crew lot B.",
      nearestHospital: "County Medical",
      weatherNotes: "Manual forecast review required.",
      safetyNotes: "High visibility vests near loading traffic.",
    });
    expect(() => applyProductionLocationToCallSheet(
      updateProductionLocation(confirmed, { status: "released" }),
      callSheet,
    )).toThrow(/confirmed/);
    expect(() => applyProductionLocationToCallSheet(confirmed, setProductionCallSheetStatus(callSheet, "final"))).toThrow(/reopened/);
    expect(buildProductionLocationManifest(
      confirmed,
      { ...breakdown, updatedAt: "2026-08-21T00:00:00.000Z" },
      [assigned],
      [availability],
    ).sourceChanged).toBe(true);

    const manual = createProductionLocation({ projectId: breakdown.projectId, name: " location 2 ", breakdown });
    expect(buildProductionLocationManifest(manual, breakdown, [assigned], []).scenes).toEqual([
      expect.objectContaining({ id: "scene_2" }),
    ]);
  });

  it("keeps shot decisions DRY while deriving scene, schedule, and call-sheet use", () => {
    const breakdown = scheduleBreakdownFixture("proj_shots");
    const schedule = createProductionScheduleFromBreakdown(breakdown, "Principal");
    const dayId = schedule.shootDays[0]?.id;
    if (!dayId) throw new Error("Expected first shoot day");
    const assigned = moveProductionScheduleScene(
      updateProductionShootDay(schedule, dayId, { date: "2026-09-02" }),
      "scene_1",
      dayId,
    );
    const first = createProductionShot({
      projectId: breakdown.projectId,
      breakdown,
      sceneId: "scene_1",
      description: "  Establish the room  ",
      documentIds: ["doc_board", "doc_board", ""],
    }, "2026-08-20T12:00:00.000Z");
    const second = createProductionShot({
      projectId: breakdown.projectId,
      breakdown,
      sceneId: "scene_1",
      description: "Mara finds the transmitter",
      existingShots: [first],
    }, "2026-08-20T12:01:00.000Z");
    const detailed = updateProductionShot(second, {
      status: "ready",
      shotNumber: "1B",
      shotSize: "Medium close-up",
      movement: "Slow push",
      lens: "50mm",
      estimatedMinutes: 12.6,
      lightingNotes: "Practical console glow.",
    }, "2026-08-20T12:02:00.000Z");
    const reordered = reorderProductionShot([first, detailed], detailed.id, -1, "2026-08-20T12:03:00.000Z");
    const moved = reordered.find((shot) => shot.id === detailed.id);
    const callSheet = createProductionCallSheetFromScheduleDay(assigned, breakdown, dayId);
    const manifest = buildProductionShotManifest(moved!, breakdown, [assigned], [callSheet]);

    expect(first).toMatchObject({
      ordinal: 1,
      shotNumber: "1",
      description: "Establish the room",
      status: "planned",
      documentIds: ["doc_board"],
    });
    expect(detailed).toMatchObject({
      ordinal: 2,
      shotNumber: "1B",
      status: "ready",
      shotSize: "Medium close-up",
      movement: "Slow push",
      lens: "50mm",
      estimatedMinutes: 13,
    });
    expect(moved?.ordinal).toBe(1);
    expect(reordered.find((shot) => shot.id === first.id)?.ordinal).toBe(2);
    expect(manifest).toMatchObject({
      sourceMissing: false,
      sourceChanged: false,
      scene: expect.objectContaining({ id: "scene_1", heading: "INT. LOCATION 1 - DAY" }),
      scheduleUses: [expect.objectContaining({ scheduleTitle: "Principal", dayOrdinal: 1, sceneIds: ["scene_1"] })],
      callSheetUses: [expect.objectContaining({ callSheetId: callSheet.id, dayOrdinal: 1 })],
    });
    expect(JSON.stringify(detailed)).not.toContain("INT. LOCATION 1 - DAY");
    expect(JSON.stringify(detailed)).not.toContain("sourceText");
    expect(buildProductionShotManifest(
      detailed,
      { ...breakdown, updatedAt: "2026-08-21T00:00:00.000Z" },
      [assigned],
      [callSheet],
    ).sourceChanged).toBe(true);
    expect(buildProductionShotManifest(detailed, null, [assigned], [callSheet]).sourceMissing).toBe(true);
    expect(() => createProductionShot({
      projectId: breakdown.projectId,
      breakdown,
      sceneId: "missing",
      description: "Missing scene",
    })).toThrow(/require a scene/);
    expect(() => updateProductionShot(first, { description: "  " })).toThrow(/description/);
  });

  it("keeps talent records DRY while deriving cast use and mapping performers to draft call sheets", () => {
    const breakdown = scheduleBreakdownFixture("proj_talent");
    const schedule = createProductionScheduleFromBreakdown(breakdown, "Principal");
    const dayId = schedule.shootDays[0]?.id;
    if (!dayId) throw new Error("Expected first shoot day");
    const assigned = moveProductionScheduleScene(
      moveProductionScheduleScene(updateProductionShootDay(schedule, dayId, { date: "2026-09-02" }), "scene_1", dayId),
      "scene_2",
      dayId,
    );
    const availability = createProductionAvailabilityWindow(
      breakdown,
      "element_mara",
      "preferred",
      "2026-09-02",
      "2026-09-02",
      "Local hold.",
    );
    const talent = createProductionTalent({
      projectId: breakdown.projectId,
      breakdown,
      screenplayElementId: "element_mara",
      documentIds: ["doc_release", "doc_release", ""],
    }, "2026-08-20T14:00:00.000Z");
    const cast = updateProductionTalent(talent, {
      performerName: "  Avery Stone  ",
      status: "cast",
      paperworkStatus: "complete",
      rateBasis: "day",
      agreedRateCents: 25_000.4,
      contactName: "Avery Stone",
      contactDetails: "private contact",
      dealNotes: "One entered shoot-day rate; no compliance inference.",
    }, "2026-08-20T15:00:00.000Z");
    const manifest = buildProductionTalentManifest(cast, breakdown, [assigned], [availability]);

    expect(cast).toMatchObject({
      characterName: "MARA",
      performerName: "Avery Stone",
      status: "cast",
      paperworkStatus: "complete",
      rateBasis: "day",
      agreedRateCents: 25_000,
      documentIds: ["doc_release"],
    });
    expect(manifest).toMatchObject({
      sourceMissing: false,
      sourceChanged: false,
      scenes: [expect.objectContaining({ id: "scene_1" }), expect.objectContaining({ id: "scene_2" })],
      scheduleUses: [expect.objectContaining({ dayOrdinal: 1, sceneIds: ["scene_1", "scene_2"] })],
      availability: [expect.objectContaining({ status: "preferred", notes: "Local hold." })],
    });

    const callSheet = createProductionCallSheetFromScheduleDay(assigned, breakdown, dayId);
    expect(applyProductionTalentToCallSheet(cast, callSheet).castCalls).toEqual([
      expect.objectContaining({ elementId: "element_mara", performerName: "Avery Stone" }),
    ]);
    expect(() => applyProductionTalentToCallSheet(
      updateProductionTalent(cast, { status: "offered" }),
      callSheet,
    )).toThrow(/cast talent/);
    expect(() => applyProductionTalentToCallSheet(cast, setProductionCallSheetStatus(callSheet, "final"))).toThrow(/reopened/);

    const manual = createProductionTalent({ projectId: breakdown.projectId, characterName: " eli ", breakdown });
    expect(buildProductionTalentManifest(manual, breakdown, [assigned], []).scenes).toEqual([
      expect.objectContaining({ id: "scene_3" }),
    ]);
  });

  it("creates attachment backup manifests without raw attachment bytes", () => {
    const workspace = cloneWorkspace(seedWorkspace);
    const project = workspace.projects[0];
    if (!project) throw new Error("Expected seed project");
    project.docs.unshift(
      createProjectDoc("Poster.png", "ASSET", {
        date: "Imported asset",
        sourcePath: "Feature/Poster.png",
        sourceSizeBytes: 4,
        sourceContentType: "image/png",
        attachmentStatus: "r2_dry_run",
        attachmentSha256: "a".repeat(64),
        attachmentR2ObjectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
      }),
    );

    const manifest = createAttachmentBackupManifest(workspace);
    const snapshot = createBackupSnapshot(workspace);

    expect(manifest).toMatchObject({
      policy: "metadata_only",
      totalAssets: 1,
      r2DryRun: 1,
      totalSourceBytes: 4,
    });
    expect(snapshot.attachmentManifest.items[0]?.sha256).toBe("a".repeat(64));
    expect(JSON.stringify(snapshot)).not.toContain("AQIDBA");
    expect(JSON.stringify(snapshot)).not.toContain("137,80,78,71");
  });

  it("includes optional planning exports in encrypted backup snapshots", () => {
    const snapshot = createBackupSnapshot(seedWorkspace, {
      planningExport: {
        policy: "d1_planning_rows",
        persistence: "d1_planning_export",
        exportedAt: "2026-07-08T00:00:00.000Z",
        rowCount: 1,
        truncated: false,
        records: [
          {
            kind: "location",
            id: "notion_location_1",
            workspaceId: seedWorkspace.id,
            projectId: seedWorkspace.projects[0]?.id ?? null,
            title: "Desert Motel",
            sourcePath: "Planning/Locations.csv",
            fields: {
              Type: "Interior",
              apiKey: `${["sk", "live"].join("_")}_planningsecret`,
            },
            createdAt: "2026-07-08T00:00:00.000Z",
            updatedAt: "2026-07-08T00:00:00.000Z",
          },
        ],
      },
    });
    const snapshotJson = JSON.stringify(snapshot);

    expect(snapshot.planningExport?.rowCount).toBe(1);
    expect(snapshot.planningExport?.records[0]?.title).toBe("Desert Motel");
    expect(snapshotJson).not.toContain("planningsecret");
  });

  it("includes first-class workspace roles without raw emails", () => {
    expect(seedWorkspace.members.map((member) => member.role)).toEqual(["owner", "producer", "director"]);
    expect(formatWorkspaceRole("department_lead")).toBe("Department Lead");
    expect(JSON.stringify(seedWorkspace.members)).not.toContain("@");
  });

  it("exports a Dust Wave fixture workspace for relation-heavy smoke data", () => {
    const snapshot = createBackupSnapshot(dustWaveWorkspace);

    expect(dustWaveWorkspace.id).toBe("workspace_dust_wave");
    expect(dustWaveWorkspace.projects.map((project) => project.title)).toEqual([
      "Dust Wave Feature",
      "Dust Wave Operations",
    ]);
    expect(dustWaveWorkspace.projects[0]?.openTasks.map((task) => task.title)).toContain("Lock pitch deck");
    expect(dustWaveWorkspace.projects[0]?.people).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Jordan Vale", role: "Director" }),
      ]),
    );
    expect(snapshot.attachmentManifest).toMatchObject({
      policy: "metadata_only",
      totalAssets: 1,
      storedR2: 1,
      totalSourceBytes: 4096,
    });
    expect(JSON.stringify(dustWaveWorkspace.members)).not.toContain("@");
  });

  it("validates allowed operation batches for future sync", () => {
    const operation = createOperation(
      seedWorkspace.id,
      "document.created",
      "document",
      "doc_test",
      "Document created: Test.md",
    );

    expect(validateOperationBatchForSync([operation])).toEqual({
      accepted: [operation.id],
      rejected: [],
    });
  });

  it("validates document update operations for local Markdown drafts", () => {
    const operation = createOperation(
      seedWorkspace.id,
      "document.updated",
      "document",
      "doc_test",
      "Document updated: Test.md",
      { markdownLength: 42 },
    );

    expect(validateOperationBatchForSync([operation])).toEqual({
      accepted: [operation.id],
      rejected: [],
    });
  });

  it("validates task update operations for local status edits", () => {
    const operation = createOperation(
      seedWorkspace.id,
      "task.updated",
      "task",
      "task_test",
      "Task status updated: Find locations",
      { projectId: "proj_echoes", title: "Find locations", status: "ready", previousStatus: "pending" },
    );

    expect(validateOperationBatchForSync([operation])).toEqual({
      accepted: [operation.id],
      rejected: [],
    });
  });

  it("validates task completion operations for local open-task closure", () => {
    const operation = createOperation(
      seedWorkspace.id,
      "task.completed",
      "task",
      "task_test",
      "Task completed: Find locations",
      { projectId: "proj_echoes", title: "Find locations", previousStatus: "ready" },
    );

    expect(validateOperationBatchForSync([operation])).toEqual({
      accepted: [operation.id],
      rejected: [],
    });
  });

  it("validates local operational create operations for future sync", () => {
    const operations = [
      createOperation(seedWorkspace.id, "person.created", "person", "person_test", "Person created"),
      createOperation(seedWorkspace.id, "equipment.created", "equipment", "equipment_test", "Equipment created"),
      createOperation(seedWorkspace.id, "expense.created", "expense", "expense_test", "Expense created"),
    ];

    expect(validateOperationBatchForSync(operations)).toEqual({
      accepted: operations.map((operation) => operation.id),
      rejected: [],
    });
  });

  it("rejects operation kind and entity mismatches", () => {
    const operation = {
      ...createOperation(seedWorkspace.id, "task.created", "task", "task_test", "Task created"),
      entityType: "project" as const,
    };

    expect(validateOperationBatchForSync([operation])).toEqual({
      accepted: [],
      rejected: [{ id: operation.id, reason: "invalid_kind_entity" }],
    });
  });

  it("defines allowlisted typed record mutation fields per core entity", () => {
    expect(getRecordMutationFieldKeys("project")).toContain("projectType");
    expect(getRecordMutationFieldKeys("task")).toEqual([
      "title",
      "status",
      "priority",
      "dueAt",
      "projectId",
      "assigneeMemberId",
    ]);
    expect(getRecordMutationFieldKeys("document")).toEqual([
      "title",
      "documentType",
      "projectId",
      "sensitive",
      "externalUrl",
    ]);
    expect(getRecordMutationFieldKeys("equipment")).toContain("notes");
    expect(getRecordMutationFieldKeys("expense")).toContain("comment");
    expect(getRecordMutationFieldDefinitions("expense").find((field) => field.key === "amountCents")).toMatchObject({
      input: "number",
      min: 0,
    });
    expect(getRecordMutationFieldDefinitions("document").find((field) => field.key === "externalUrl")).toMatchObject({
      input: "text",
      nullable: true,
      maxLength: 500,
    });
    expect(getRecordMutationFieldDefinitions("person").find((field) => field.key === "sensitive")).toMatchObject({
      input: "boolean",
      nullable: false,
    });
    expect(isRecordMutationFieldKeyForEntity("document", "sensitive")).toBe(true);
    expect(isRecordMutationFieldKeyForEntity("person", "amountCents")).toBe(false);
    expect(normalizeRecordMutationFieldKeysForEntity("task", ["status", "bad", "title", "status"])).toEqual(["status", "title"]);
  });

  it("defines film-profile mutation fields separately from core record fields", () => {
    expect(getFilmProfileMutationFieldKeys()).toEqual([
      "runtimeMinutes",
      "format",
      "shootStart",
      "shootEnd",
      "budgetCents",
      "spentCents",
    ]);
    expect(getFilmProfileMutationFieldDefinitions().find((field) => field.key === "budgetCents")).toMatchObject({
      input: "number",
      min: 0,
    });
    expect(isFilmProfileMutationFieldKey("runtimeMinutes")).toBe(true);
    expect(isFilmProfileMutationFieldKey("projectType")).toBe(false);
    expect(normalizeFilmProfileMutationFieldKeys(["runtimeMinutes", "bad", "format", "runtimeMinutes"])).toEqual([
      "runtimeMinutes",
      "format",
    ]);
  });
});

function scheduleBreakdownFixture(projectId: string): ScreenplayBreakdown {
  const revisionId = "revision_schedule";
  return {
    schemaVersion: 1,
    id: "breakdown_schedule",
    projectId,
    revision: {
      id: revisionId,
      projectId,
      title: "Schedule Fixture",
      format: "fountain",
      sourceFileName: "schedule.fountain",
      sourceSizeBytes: 0,
      sourceText: "",
      importedAt: "2026-08-20T12:00:00.000Z",
      parserVersion: "fixture",
      warnings: [],
    },
    scenes: ["scene_1", "scene_2", "scene_3"].map((id, index) => ({
      id,
      revisionId,
      ordinal: index + 1,
      sceneNumber: String(index + 1),
      heading: `INT. LOCATION ${index + 1} - DAY`,
      interiorExterior: "INT",
      location: `LOCATION ${index + 1}`,
      timeOfDay: "DAY",
      synopsis: null,
      sourceStartLine: index + 1,
      sourceEndLine: index + 1,
      sourceText: `INT. LOCATION ${index + 1} - DAY`,
    })),
    elements: [
      {
        id: "element_mara",
        projectId,
        revisionId,
        category: "cast",
        name: "MARA",
        normalizedName: "MARA",
        source: "character_cue",
        reviewState: "confirmed",
      },
      {
        id: "element_eli",
        projectId,
        revisionId,
        category: "cast",
        name: "ELI",
        normalizedName: "ELI",
        source: "character_cue",
        reviewState: "suggested",
      },
      {
        id: "element_station",
        projectId,
        revisionId,
        category: "location",
        name: "LOCATION 1",
        normalizedName: "LOCATION 1",
        source: "scene_heading",
        reviewState: "confirmed",
      },
    ],
    occurrences: [
      { id: "occ_mara_1", sceneId: "scene_1", elementId: "element_mara", sourceLine: 1, excerpt: "MARA", reviewState: "confirmed" },
      { id: "occ_mara_2", sceneId: "scene_2", elementId: "element_mara", sourceLine: 2, excerpt: "MARA", reviewState: "confirmed" },
      { id: "occ_eli_3", sceneId: "scene_3", elementId: "element_eli", sourceLine: 3, excerpt: "ELI", reviewState: "suggested" },
      { id: "occ_station_1", sceneId: "scene_1", elementId: "element_station", sourceLine: 1, excerpt: "LOCATION 1", reviewState: "confirmed" },
    ],
    updatedAt: "2026-08-20T12:00:00.000Z",
  };
}

function scheduleRevisionFixture(previous: ScreenplayBreakdown): ScreenplayBreakdown {
  const revisionId = "revision_schedule_next";
  const sceneOne = previous.scenes[0];
  const sceneTwo = previous.scenes[1];
  if (!sceneOne || !sceneTwo) throw new Error("Expected revision fixture scenes");
  return {
    schemaVersion: 1,
    id: "breakdown_schedule_next",
    projectId: previous.projectId,
    revision: {
      ...previous.revision,
      id: revisionId,
      title: "Schedule Fixture Blue Pages",
      sourceFileName: "schedule-blue.fountain",
      sourceText: `${sceneOne.sourceText}\n${sceneTwo.sourceText}\nMARA changes the plan.\nINT. LOCATION 4 - NIGHT`,
      importedAt: "2026-08-21T12:00:00.000Z",
    },
    scenes: [
      { ...sceneOne, id: "next_scene_1", revisionId },
      {
        ...sceneTwo,
        id: "next_scene_2",
        revisionId,
        sourceText: `${sceneTwo.sourceText}\nMARA changes the plan.`,
        sourceEndLine: sceneTwo.sourceEndLine + 1,
      },
      {
        id: "next_scene_4",
        revisionId,
        ordinal: 3,
        sceneNumber: "4",
        heading: "INT. LOCATION 4 - NIGHT",
        interiorExterior: "INT",
        location: "LOCATION 4",
        timeOfDay: "NIGHT",
        synopsis: null,
        sourceStartLine: 4,
        sourceEndLine: 4,
        sourceText: "INT. LOCATION 4 - NIGHT",
      },
    ],
    elements: [
      {
        ...previous.elements.find((element) => element.id === "element_mara")!,
        id: "next_element_mara",
        revisionId,
        reviewState: "suggested",
      },
      {
        ...previous.elements.find((element) => element.id === "element_station")!,
        id: "next_element_station",
        revisionId,
        reviewState: "suggested",
      },
      {
        id: "next_element_new",
        projectId: previous.projectId,
        revisionId,
        category: "cast",
        name: "NEW CHARACTER",
        normalizedName: "NEW CHARACTER",
        source: "character_cue",
        reviewState: "suggested",
      },
    ],
    occurrences: [
      { id: "next_occ_mara_1", sceneId: "next_scene_1", elementId: "next_element_mara", sourceLine: 1, excerpt: "MARA", reviewState: "suggested" },
      { id: "next_occ_mara_2", sceneId: "next_scene_2", elementId: "next_element_mara", sourceLine: 2, excerpt: "MARA", reviewState: "suggested" },
      { id: "next_occ_station_1", sceneId: "next_scene_1", elementId: "next_element_station", sourceLine: 1, excerpt: "LOCATION 1", reviewState: "suggested" },
      { id: "next_occ_new_4", sceneId: "next_scene_4", elementId: "next_element_new", sourceLine: 4, excerpt: "NEW CHARACTER", reviewState: "suggested" },
    ],
    updatedAt: "2026-08-21T12:00:00.000Z",
  };
}
