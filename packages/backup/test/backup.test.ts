import { describe, expect, it } from "vitest";
import {
  cloneWorkspace,
  createBackupSnapshot,
  createFilmProjectFromTemplate,
  createProductionAvailabilityWindow,
  createProductionBudgetScenario,
  createProductionCallSheetFromScheduleDay,
  createProductionLocation,
  createProductionShot,
  createProductionTalent,
  createProductionReportFromCallSheet,
  createProductionScheduleFromBreakdown,
  createProjectDoc,
  dustWaveWorkspace,
  moveProductionScheduleScene,
  seedWorkspace,
  updateProductionBudgetScenario,
  updateProductionCallSheet,
  updateProductionLocation,
  updateProductionShot,
  updateProductionTalent,
  updateProductionReport,
  type ScreenplayBreakdown,
} from "@film/schema";
import {
  createEncryptedBackupBundle,
  createEncryptedBackupZipBundle,
  decryptEncryptedBackupBundle,
  decryptEncryptedBackupZipBundle,
  readEncryptedBackupZipManifest,
  summarizeRestorePreview,
} from "../src/index";

describe("encrypted backup bundles", () => {
  it("encrypts and decrypts a workspace backup snapshot", async () => {
    const snapshot = createBackupSnapshot(seedWorkspace);
    const bundle = await createEncryptedBackupBundle(snapshot, "correct horse battery staple");
    const decrypted = await decryptEncryptedBackupBundle(bundle, "correct horse battery staple");

    expect(bundle.format).toBe("film.encrypted-backup");
    expect(bundle.payload).not.toContain(seedWorkspace.projects[0]?.title ?? "Echoes");
    expect(decrypted.workspaceId).toBe(snapshot.workspaceId);
    expect(decrypted.data.projects[0]?.title).toBe(seedWorkspace.projects[0]?.title);
  });

  it("keeps local screenplay source encrypted while restoring its review graph", async () => {
    const workspace = cloneWorkspace(seedWorkspace);
    const projectId = workspace.projects[0]?.id;
    if (!projectId) throw new Error("Expected seed project");
    const breakdown = screenplayBreakdownFixture(projectId);
    workspace.screenplayBreakdowns.push(breakdown);
    const schedule = createProductionScheduleFromBreakdown(breakdown, "Principal photography");
    const firstDayId = schedule.shootDays[0]?.id;
    if (!firstDayId) throw new Error("Expected first shoot day");
    const assignedSchedule = moveProductionScheduleScene(schedule, breakdown.scenes[0]!.id, firstDayId);
    workspace.productionSchedules.push(assignedSchedule);
    workspace.productionAvailability.push(createProductionAvailabilityWindow(
      breakdown,
      breakdown.elements[0]!.id,
      "unavailable",
      "2026-09-02",
      "2026-09-02",
      "Private hold",
    ));
    workspace.productionBudgetScenarios.push(updateProductionBudgetScenario(
      createProductionBudgetScenario(assignedSchedule),
      { crewDayCostCents: 100_000, contingencyBasisPoints: 1_000 },
    ));
    const callSheet = updateProductionCallSheet(
      createProductionCallSheetFromScheduleDay(assignedSchedule, breakdown, firstDayId),
      { primaryLocation: "Private interior", safetyNotes: "Restricted access." },
    );
    workspace.productionCallSheets.push(callSheet);
    workspace.productionReports.push(updateProductionReport(
      createProductionReportFromCallSheet(callSheet, 6),
      { crewWrapTime: "20:00", productionNotes: "Private production notes." },
    ));
    workspace.productionLocations.push(updateProductionLocation(
      createProductionLocation({
        projectId,
        name: "Private interior",
        breakdown,
      }),
      { status: "confirmed", contactDetails: "private-location-contact", parkingAccess: "Private load-in notes." },
    ));
    workspace.productionTalent.push(updateProductionTalent(
      createProductionTalent({
        projectId,
        breakdown,
        screenplayElementId: breakdown.elements[0]!.id,
      }),
      {
        status: "cast",
        performerName: "Private Performer",
        contactDetails: "private-talent-contact",
        dietaryNotes: "Private dietary note.",
      },
    ));
    workspace.productionShots.push(updateProductionShot(
      createProductionShot({
        projectId,
        breakdown,
        sceneId: breakdown.scenes[0]!.id,
        description: "Private shot description",
      }),
      { lens: "Private 50mm", lightingNotes: "Private lighting plan." },
    ));

    const snapshot = createBackupSnapshot(workspace);
    const bundle = await createEncryptedBackupBundle(snapshot, "correct horse battery staple");
    const decrypted = await decryptEncryptedBackupBundle(bundle, "correct horse battery staple");

    expect(bundle.payload).not.toContain("Keep the recorder hidden.");
    expect(bundle.payload).not.toContain("private-location-contact");
    expect(bundle.payload).not.toContain("private-talent-contact");
    expect(bundle.payload).not.toContain("Private shot description");
    expect(decrypted.data.screenplayBreakdowns[0]?.revision.sourceText).toContain("Keep the recorder hidden.");
    expect(decrypted.data.screenplayBreakdowns[0]?.elements[0]?.reviewState).toBe("confirmed");
    expect(decrypted.data.productionSchedules[0]).toMatchObject({
      title: "Principal photography",
      screenplayBreakdownId: breakdown.id,
      unassignedSceneIds: [],
    });
    expect(decrypted.data.productionSchedules[0]?.shootDays[0]?.sceneIds).toEqual([breakdown.scenes[0]!.id]);
    expect(decrypted.data.productionAvailability[0]).toMatchObject({
      elementId: breakdown.elements[0]!.id,
      status: "unavailable",
      notes: "Private hold",
    });
    expect(decrypted.data.productionBudgetScenarios[0]).toMatchObject({
      productionScheduleId: assignedSchedule.id,
      assumptions: expect.objectContaining({ crewDayCostCents: 100_000, contingencyBasisPoints: 1_000 }),
    });
    expect(decrypted.data.productionCallSheets[0]).toMatchObject({
      productionScheduleId: assignedSchedule.id,
      sceneIds: [breakdown.scenes[0]!.id],
      primaryLocation: "Private interior",
      safetyNotes: "Restricted access.",
    });
    expect(decrypted.data.productionReports[0]).toMatchObject({
      productionCallSheetId: callSheet.id,
      crewCount: 6,
      crewWrapTime: "20:00",
      productionNotes: "Private production notes.",
    });
    expect(decrypted.data.productionLocations[0]).toMatchObject({
      name: "Private interior",
      status: "confirmed",
      contactDetails: "private-location-contact",
      parkingAccess: "Private load-in notes.",
    });
    expect(decrypted.data.productionTalent[0]).toMatchObject({
      performerName: "Private Performer",
      status: "cast",
      contactDetails: "private-talent-contact",
      dietaryNotes: "Private dietary note.",
    });
    expect(decrypted.data.productionShots[0]).toMatchObject({
      sceneId: breakdown.scenes[0]!.id,
      description: "Private shot description",
      lens: "Private 50mm",
      lightingNotes: "Private lighting plan.",
    });
  });

  it("creates ZIP backup containers with a manifest and encrypted workspace payload", async () => {
    const workspace = cloneWorkspace(seedWorkspace);
    const project = workspace.projects[0];
    if (!project) throw new Error("Expected seed project");
    project.docs.unshift(
      createProjectDoc("Poster.png", "ASSET", {
        sourcePath: "Feature/Poster.png",
        sourceSizeBytes: 4,
        attachmentStatus: "r2_dry_run",
        attachmentSha256: "a".repeat(64),
      }),
    );

    const snapshot = createBackupSnapshot(workspace, {
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
            workspaceId: workspace.id,
            projectId: project.id,
            title: "Desert Motel",
            sourcePath: "Planning/Locations.csv",
            fields: { Type: "Interior" },
          },
        ],
      },
    });
    const archive = await createEncryptedBackupZipBundle(snapshot, "correct horse battery staple");
    const manifest = readEncryptedBackupZipManifest(archive.bytes);
    const archiveText = new TextDecoder().decode(archive.bytes);
    const decrypted = await decryptEncryptedBackupZipBundle(archive.bytes, "correct horse battery staple");

    expect(archive.format).toBe("film.encrypted-backup.zip");
    expect(manifest.format).toBe("film.encrypted-backup.zip");
    expect(manifest.payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "payload/workspace.snapshot.enc",
          kind: "workspace_snapshot",
          encrypted: true,
        }),
        expect.objectContaining({
          path: "payload/attachment-restore-policy.enc",
          kind: "attachment_restore_policy",
          recordCount: 1,
          encryption: expect.objectContaining({
            kdf: expect.objectContaining({ name: "PBKDF2" }),
            cipher: expect.objectContaining({ name: "AES-GCM" }),
          }),
        }),
      ]),
    );
    expect(manifest.attachmentPolicySummary).toEqual({
      policy: "metadata_only_payload",
      totalAssets: 1,
      payloadPath: "payload/attachment-restore-policy.enc",
    });
    expect(manifest.attachmentSummary.totalAssets).toBe(1);
    expect(manifest.planningSummary).toMatchObject({
      policy: "d1_planning_rows",
      totalRecords: 1,
      persistence: "d1_planning_export",
    });
    expect(archiveText).toContain("manifest.json");
    expect(archiveText).not.toContain(seedWorkspace.projects[0]?.title ?? "Echoes");
    expect(archiveText).not.toContain("Feature/Poster.png");
    expect(archiveText).not.toContain("Desert Motel");
    expect(decrypted.workspaceId).toBe(snapshot.workspaceId);
    expect(decrypted.data.projects[0]?.docs[0]?.name).toBe("Poster.png");
    expect(decrypted.planningExport?.records[0]?.title).toBe("Desert Motel");
  });

  it("stores markdown document bodies in a separate encrypted ZIP payload", async () => {
    const workspace = cloneWorkspace(seedWorkspace);
    const project = workspace.projects[0];
    if (!project) throw new Error("Expected seed project");
    project.docs.unshift(
      createProjectDoc("Director notes", "MD", {
        markdownSnapshot: "# Private notes\n\nKeep the final location confidential.",
      }),
    );

    const snapshot = createBackupSnapshot(workspace);
    const archive = await createEncryptedBackupZipBundle(snapshot, "correct horse battery staple");
    const manifest = readEncryptedBackupZipManifest(archive.bytes);
    const archiveText = new TextDecoder().decode(archive.bytes);
    const decrypted = await decryptEncryptedBackupZipBundle(archive.bytes, "correct horse battery staple");

    expect(manifest.payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "payload/workspace.snapshot.enc",
          kind: "workspace_snapshot",
        }),
        expect.objectContaining({
          path: "payload/document-bodies.enc",
          kind: "document_bodies",
          recordCount: 1,
          encryption: expect.objectContaining({
            kdf: expect.objectContaining({ name: "PBKDF2" }),
            cipher: expect.objectContaining({ name: "AES-GCM" }),
          }),
        }),
      ]),
    );
    expect(manifest.documentBodySummary).toEqual({
      policy: "split_encrypted_payload",
      totalDocuments: 1,
      payloadPath: "payload/document-bodies.enc",
    });
    expect(archiveText).toContain("payload/document-bodies.enc");
    expect(archiveText).not.toContain("Keep the final location confidential");
    expect(decrypted.data.projects[0]?.docs[0]?.markdownSnapshot).toBe(
      "# Private notes\n\nKeep the final location confidential.",
    );
  });

  it("rejects encrypted, ZIP64, and malformed backup ZIP central directory entries", async () => {
    const snapshot = createBackupSnapshot(seedWorkspace);
    const archive = await createEncryptedBackupZipBundle(snapshot, "correct horse battery staple");

    expect(() => readEncryptedBackupZipManifest(tamperFirstCentralHeader(archive.bytes, (view, offset) => {
      view.setUint16(offset + 8, 0x0801, true);
    }))).toThrow(/Encrypted ZIP entries/);

    expect(() => readEncryptedBackupZipManifest(tamperFirstCentralHeader(archive.bytes, (view, offset) => {
      view.setUint32(offset + 20, 0xffffffff, true);
    }))).toThrow(/ZIP64 backup containers/);

    expect(() => readEncryptedBackupZipManifest(tamperFirstCentralHeader(archive.bytes, (view, offset) => {
      view.setUint32(offset, 0x12345678, true);
    }))).toThrow(/central directory is malformed/);
  });

  it("rejects short backup passphrases", async () => {
    const snapshot = createBackupSnapshot(seedWorkspace);

    await expect(createEncryptedBackupBundle(snapshot, "too-short")).rejects.toThrow(/12 characters/);
    await expect(createEncryptedBackupZipBundle(snapshot, "too-short")).rejects.toThrow(/12 characters/);
  });

  it("summarizes restore previews against the current workspace", () => {
    const snapshot = createBackupSnapshot({
      ...seedWorkspace,
      projects: [
        seedWorkspace.projects[0],
        createFilmProjectFromTemplate("New Import Film"),
      ],
    });
    const summary = summarizeRestorePreview(seedWorkspace, snapshot);

    expect(summary.currentProjectCount).toBe(seedWorkspace.projects.length);
    expect(summary.incomingProjectCount).toBe(2);
    expect(summary.matchingProjectCount).toBe(1);
    expect(summary.newProjectCount).toBe(1);
    expect(summary.newRecordCount).toBeGreaterThan(1);
    expect(summary.warnings).toEqual([]);
  });

  it("surfaces planning rows in restore previews without claiming D1 restore support", () => {
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
            fields: { Type: "Interior" },
          },
        ],
      },
    });
    const summary = summarizeRestorePreview(seedWorkspace, snapshot);

    expect(summary.planningRecordCount).toBe(1);
    expect(summary.incomingRecordCount).toBe(summary.records.length + 1);
    expect(summary.planningKindCounts).toEqual([{ kind: "location", count: 1 }]);
    expect(summary.planningTableCoverage).toHaveLength(8);
    expect(summary.planningTableCoverage).toEqual(
      expect.arrayContaining([
        {
          kind: "location",
          tableName: "locations",
          recordCount: 1,
          included: true,
          restoreSupport: "preview_only",
        },
        {
          kind: "role",
          tableName: "production_roles",
          recordCount: 0,
          included: false,
          restoreSupport: "not_included",
        },
      ]),
    );
    expect(summary.planningRecords).toEqual([
      {
        kind: "location",
        id: "notion_location_1",
        title: "Desert Motel",
        projectId: seedWorkspace.projects[0]?.id ?? null,
        sourcePath: null,
        fieldCount: 1,
        fieldKeys: ["Type"],
      },
    ]);
    expect(summary.applicationPlan).toMatchObject({
      mode: "preview_only",
      destructiveWrite: false,
      canApply: false,
      requiresWorkerCommit: true,
      operationPolicy: "preview_only",
      operationCount: summary.records.length + 1,
      planningPolicy: "preview_only",
      planningRecordCount: 1,
    });
    expect(summary.applicationPlan.operationSamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "planning",
          entityId: "notion_location_1",
          label: "Planning: Desert Motel",
          action: "skip",
          status: "preview_only",
          blockers: ["D1 planning rows require the Worker planning commit gate after approval and preflight."],
        }),
      ]),
    );
    expect(summary.applicationPlan.tablePlan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tableName: "locations",
          source: "d1_planning_export",
          entityType: "planning",
          operationCount: 1,
          previewOnlyCount: 1,
          restoreSupport: "preview_only",
          blockers: ["D1 planning rows require the Worker planning commit gate after approval and preflight."],
        }),
      ]),
    );
    expect(summary.applicationPlan.blockers).toContain(
      "Destructive restore commits require Worker approval, application preflight, exact confirmation, and pre-restore backup proof.",
    );
    expect(summary.applicationPlan.blockers).toContain(
      "D1 planning rows require the Worker planning commit gate after approval and preflight.",
    );
    expect(summary.warnings).toContain(
      "Backup includes 1 D1 planning rows; planning restore requires the Worker planning commit gate after approval and preflight.",
    );
  });

  it("reports per-record restore preview field conflicts", () => {
    const incoming = cloneWorkspace(seedWorkspace);
    const project = incoming.projects[0];
    if (!project) throw new Error("Expected seed project");
    project.location = "Albuquerque, NM";
    project.openTasks[0] = { ...project.openTasks[0]!, due: "Tomorrow" };
    project.docs[0] = { ...project.docs[0]!, date: "May 3" };
    project.people[0] = { ...project.people[0]!, role: "Writer-Director" };
    project.expenses[0] = { ...project.expenses[0]!, budget: project.expenses[0]!.budget + 500 };

    const summary = summarizeRestorePreview(seedWorkspace, createBackupSnapshot(incoming));

    expect(summary.changedRecordCount).toBeGreaterThanOrEqual(5);
    expect(summary.fieldConflictCount).toBeGreaterThanOrEqual(5);
    expect(summary.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "project",
          label: "Project: Echoes in the Static",
          status: "changed",
          fieldChanges: expect.arrayContaining([
            expect.objectContaining({
              field: "Location",
              currentValue: "Los Angeles, CA",
              incomingValue: "Albuquerque, NM",
            }),
          ]),
        }),
        expect.objectContaining({
          entityType: "task",
          label: "Task: Review final shot list",
          status: "changed",
          fieldChanges: expect.arrayContaining([
            expect.objectContaining({
              field: "Due",
              currentValue: "Overdue",
              incomingValue: "Tomorrow",
            }),
          ]),
        }),
      ]),
    );
    expect(summary.applicationPlan.operationSamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "project",
          label: "Project: Echoes in the Static",
          action: "update",
          status: "changed",
          blockers: ["Workspace snapshot writes require the Worker application commit gate after approval and preflight."],
        }),
        expect.objectContaining({
          entityType: "task",
          label: "Task: Review final shot list",
          action: "update",
          status: "changed",
          fieldConflictCount: 1,
        }),
      ]),
    );
    expect(summary.applicationPlan.tablePlan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tableName: "projects",
          entityType: "project",
          updateCount: 1,
          fieldConflictCount: expect.any(Number),
          restoreSupport: "commit_supported",
          blockers: ["Workspace snapshot writes require the Worker application commit gate after approval and preflight."],
        }),
        expect.objectContaining({
          tableName: "tasks",
          entityType: "task",
          updateCount: 1,
          fieldConflictCount: 1,
          restoreSupport: "commit_supported",
        }),
      ]),
    );
  });

  it("warns that attachment bytes are not restored from metadata-only backups", () => {
    const workspace = cloneWorkspace(seedWorkspace);
    const project = workspace.projects[0];
    if (!project) throw new Error("Expected seed project");
    project.docs.unshift(
      createProjectDoc("Poster.png", "ASSET", {
        sourcePath: "Feature/Poster.png",
        sourceSizeBytes: 4,
        attachmentStatus: "r2_dry_run",
        attachmentSha256: "a".repeat(64),
      }),
    );
    const summary = summarizeRestorePreview(seedWorkspace, createBackupSnapshot(workspace));

    expect(summary.applicationPlan).toMatchObject({
      attachmentPolicy: "metadata_only",
      attachmentAssetCount: 1,
      attachmentPackagePlan: {
        policy: "metadata_only",
        packageRequired: true,
        byteRestoreSupport: "blocked",
        metadataRecordCount: 1,
        stagedLocalRecordCount: 0,
        r2DryRunRecordCount: 1,
        storedR2RecordCount: 0,
        totalSourceBytes: 4,
      },
    });
    expect(summary.applicationPlan.attachmentPackagePlan.blockers).toContain(
      "Attachment metadata can be previewed, but byte restore requires a verified attachment package.",
    );
    expect(summary.applicationPlan.blockers).toContain(
      "Attachment bytes are metadata-only in this backup preview and require a separate restore packaging path.",
    );
    expect(summary.warnings).toContain(
      "Backup includes attachment metadata only; attachment bytes are not restored by this preview.",
    );
  });

  it("smoke-tests the Dust Wave fixture through encrypted ZIP backup and restore preview", async () => {
    const snapshot = createBackupSnapshot(dustWaveWorkspace);
    const archive = await createEncryptedBackupZipBundle(snapshot, "correct horse battery staple");
    const manifest = readEncryptedBackupZipManifest(archive.bytes);
    const decrypted = await decryptEncryptedBackupZipBundle(archive.bytes, "correct horse battery staple");
    const summary = summarizeRestorePreview(seedWorkspace, decrypted);

    expect(manifest.workspaceId).toBe("workspace_dust_wave");
    expect(manifest.attachmentSummary).toMatchObject({
      totalAssets: 1,
      storedR2: 1,
      totalSourceBytes: 4096,
    });
    expect(decrypted.data.projects.map((project) => project.title)).toEqual([
      "Dust Wave Feature",
      "Dust Wave Operations",
    ]);
    expect(summary.newProjectCount).toBe(2);
    expect(summary.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: "project", label: "Project: Dust Wave Feature", status: "new" }),
        expect.objectContaining({ entityType: "task", label: "Task: Lock pitch deck", status: "new" }),
        expect.objectContaining({ entityType: "person", label: "Person: Jordan Vale", status: "new" }),
        expect.objectContaining({ entityType: "document", label: "Document: Poster still.png", status: "new" }),
      ]),
    );
    expect(summary.warnings).toEqual(
      expect.arrayContaining([
        "Backup workspace ID differs from the current workspace.",
        "Backup includes attachment metadata only; attachment bytes are not restored by this preview.",
      ]),
    );
  });
});

function screenplayBreakdownFixture(projectId: string): ScreenplayBreakdown {
  return {
    schemaVersion: 1,
    id: "screenplay_breakdown_fixture",
    projectId,
    revision: {
      id: "screenplay_revision_fixture",
      projectId,
      title: "Private Script",
      format: "fountain",
      sourceFileName: "Private Script.fountain",
      sourceSizeBytes: 54,
      sourceText: "INT. ROOM - NIGHT\n\nMARA\nKeep the recorder hidden.",
      importedAt: "2026-08-20T12:00:00.000Z",
      parserVersion: "film-screenplay-1",
      warnings: [],
    },
    scenes: [{
      id: "screenplay_scene_fixture_1",
      revisionId: "screenplay_revision_fixture",
      ordinal: 1,
      sceneNumber: "1",
      heading: "INT. ROOM - NIGHT",
      interiorExterior: "INT",
      location: "ROOM",
      timeOfDay: "NIGHT",
      synopsis: null,
      sourceStartLine: 1,
      sourceEndLine: 4,
      sourceText: "INT. ROOM - NIGHT\n\nMARA\nKeep the recorder hidden.",
    }],
    elements: [{
      id: "production_element_fixture_mara",
      projectId,
      revisionId: "screenplay_revision_fixture",
      category: "cast",
      name: "MARA",
      normalizedName: "MARA",
      source: "character_cue",
      reviewState: "confirmed",
    }],
    occurrences: [{
      id: "scene_element_fixture_mara",
      sceneId: "screenplay_scene_fixture_1",
      elementId: "production_element_fixture_mara",
      sourceLine: 3,
      excerpt: "MARA",
      reviewState: "confirmed",
    }],
    updatedAt: "2026-08-20T12:00:00.000Z",
  };
}

function tamperFirstCentralHeader(bytes: Uint8Array, mutate: (view: DataView, offset: number) => void): Uint8Array {
  const copy = new Uint8Array(bytes);
  const view = new DataView(copy.buffer, copy.byteOffset, copy.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);
  if (eocdOffset < 0) throw new Error("Expected a ZIP end of central directory");
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  mutate(view, centralDirectoryOffset);
  return copy;
}

function findEndOfCentralDirectory(view: DataView): number {
  for (let offset = view.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  return -1;
}
