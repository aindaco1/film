import { describe, expect, it } from "vitest";
import {
  commitRestoreAttachmentObject,
  runRestoreApprovalDryRun,
  runRestoreApplicationCommit,
  runRestoreApplicationDryRun,
  runRestoreAttachmentObjectCommitPreflight,
  runRestoreAttachmentObjectPlanDryRun,
  runRestoreAttachmentPackageDryRun,
  runRestoreAttachmentPackageVerificationDryRun,
  runRestoreCommitDryRun,
  runRestoreCommitStorageDryRun,
  runRestorePlanningCommit,
  runRestorePlanningDryRun,
} from "../src/restore-client";

describe("restore client", () => {
  it("posts restore commit dry-run requests with csrf metadata", async () => {
    const request = {
      workspaceId: "workspace_acme",
      snapshotWorkspaceId: "workspace_acme",
      backupCreatedAt: "2026-07-08T00:00:00.000Z",
      preRestoreBackupId: "restore_current",
      confirmation: "RESTORE workspace_acme",
      preview: {
        incomingRecordCount: 10,
        changedRecordCount: 2,
        newRecordCount: 3,
        fieldConflictCount: 4,
        warnings: [],
      },
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/commit-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          ...request,
          backupCreatedAt: request.backupCreatedAt,
          confirmationAccepted: true,
          confirmationPhrase: "RESTORE workspace_acme",
          restoreMode: "confirmation_gate_only",
          destructiveWrite: false,
          preRestoreBackupRequired: true,
          preRestoreBackupId: "restore_current",
          preRestoreBackupVerified: true,
          preRestoreBackupPersistence: "d1_restore_point_metadata",
          preRestoreBackupBlocker: null,
          commitStatus: "blocked_until_restore_commit_storage",
          authorizationPolicy: "owner_or_producer",
        }),
        { status: 200 },
      );
    };

    const result = await runRestoreCommitDryRun("https://worker.test", "csrf_1234567890", request, fetcher);

    expect(result.destructiveWrite).toBe(false);
    expect(result.preRestoreBackupVerified).toBe(true);
    expect(result.commitStatus).toBe("blocked_until_restore_commit_storage");
  });

  it("throws expected confirmation phrases when provided by the Worker", async () => {
    const fetcher: typeof fetch = async () => new Response(
      JSON.stringify({
        error: "restore_confirmation_required",
        expectedConfirmation: "RESTORE workspace_acme",
      }),
      { status: 422 },
    );

    await expect(runRestoreCommitDryRun(
      "https://worker.test",
      "csrf_1234567890",
      {
        workspaceId: "workspace_acme",
        snapshotWorkspaceId: "workspace_acme",
        confirmation: "restore workspace_acme",
        preview: {
          incomingRecordCount: 1,
          changedRecordCount: 0,
          newRecordCount: 1,
          fieldConflictCount: 0,
          warnings: [],
        },
      },
      fetcher,
    )).rejects.toThrow("RESTORE workspace_acme");
  });

  it("posts restore approval dry-run requests with csrf metadata", async () => {
    const request = {
      workspaceId: "workspace_acme",
      snapshotWorkspaceId: "workspace_acme",
      backupCreatedAt: "2026-07-08T00:00:00.000Z",
      preRestoreBackupId: "restore_current",
      confirmation: "RESTORE workspace_acme",
      preview: {
        incomingRecordCount: 10,
        changedRecordCount: 2,
        newRecordCount: 3,
        fieldConflictCount: 4,
        warnings: [],
      },
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/approval-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          ...request,
          backupCreatedAt: request.backupCreatedAt,
          confirmationAccepted: true,
          confirmationPhrase: "RESTORE workspace_acme",
          restoreMode: "approval_record_only",
          destructiveWrite: false,
          preRestoreBackupRequired: true,
          preRestoreBackupId: "restore_current",
          preRestoreBackupVerified: true,
          preRestoreBackupPersistence: "d1_restore_point_metadata",
          preRestoreBackupBlocker: null,
          approvalId: "restore_approval_123",
          approvalStatus: "approved_pending_commit",
          approvalPersistence: "d1_restore_approvals",
          approvalBlockers: [],
          commitStatus: "blocked_until_restore_commit_storage",
          authorizationPolicy: "owner_or_producer",
        }),
        { status: 200 },
      );
    };

    const result = await runRestoreApprovalDryRun("https://worker.test", "csrf_1234567890", request, fetcher);

    expect(result.destructiveWrite).toBe(false);
    expect(result.approvalId).toBe("restore_approval_123");
    expect(result.approvalStatus).toBe("approved_pending_commit");
    expect(result.approvalPersistence).toBe("d1_restore_approvals");
  });

  it("posts restore commit storage dry-run requests with approval metadata", async () => {
    const request = {
      workspaceId: "workspace_acme",
      snapshotWorkspaceId: "workspace_acme",
      backupCreatedAt: "2026-07-08T00:00:00.000Z",
      preRestoreBackupId: "restore_current",
      approvalId: "restore_approval_123",
      confirmation: "RESTORE workspace_acme",
      preview: {
        incomingRecordCount: 10,
        changedRecordCount: 2,
        newRecordCount: 3,
        fieldConflictCount: 4,
        warnings: [],
      },
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/commit-storage-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          ...request,
          backupCreatedAt: request.backupCreatedAt,
          confirmationAccepted: true,
          confirmationPhrase: "RESTORE workspace_acme",
          restoreMode: "commit_storage_only",
          destructiveWrite: false,
          preRestoreBackupRequired: true,
          preRestoreBackupId: "restore_current",
          preRestoreBackupVerified: true,
          preRestoreBackupPersistence: "d1_restore_point_metadata",
          preRestoreBackupBlocker: null,
          approvalId: "restore_approval_123",
          approvalStatus: "approved_pending_commit",
          approvalPersistence: "d1_restore_approvals",
          commitAttemptId: "restore_commit_attempt_123",
          commitAttemptStatus: "blocked_until_restore_apply",
          commitAttemptPersistence: "d1_restore_commit_attempts",
          commitStatus: "blocked_until_restore_apply",
          authorizationPolicy: "owner_or_producer",
        }),
        { status: 200 },
      );
    };

    const result = await runRestoreCommitStorageDryRun(
      "https://worker.test",
      "csrf_1234567890",
      request,
      fetcher,
    );

    expect(result.destructiveWrite).toBe(false);
    expect(result.approvalId).toBe("restore_approval_123");
    expect(result.commitAttemptId).toBe("restore_commit_attempt_123");
    expect(result.commitAttemptPersistence).toBe("d1_restore_commit_attempts");
  });

  it("posts restore application dry-run requests with commit attempt metadata", async () => {
    const request = {
      workspaceId: "workspace_acme",
      snapshotWorkspaceId: "workspace_acme",
      backupCreatedAt: "2026-07-08T00:00:00.000Z",
      preRestoreBackupId: "restore_current",
      approvalId: "restore_approval_123",
      commitAttemptId: "restore_commit_attempt_123",
      confirmation: "RESTORE workspace_acme",
      applicationTablePlan: [
        {
          tableName: "projects",
          source: "workspace_snapshot",
          entityType: "project",
          operationCount: 1,
          createCount: 0,
          updateCount: 1,
          skipCount: 0,
          previewOnlyCount: 0,
          fieldConflictCount: 2,
          restoreSupport: "blocked",
          blockers: ["Workspace snapshot writes require the Worker application commit gate after approval and preflight."],
        },
      ],
      preview: {
        incomingRecordCount: 10,
        changedRecordCount: 2,
        newRecordCount: 3,
        fieldConflictCount: 4,
        warnings: [],
      },
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/application-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          ...request,
          backupCreatedAt: request.backupCreatedAt,
          confirmationAccepted: true,
          confirmationPhrase: "RESTORE workspace_acme",
          restoreMode: "application_preflight_only",
          destructiveWrite: false,
          preRestoreBackupRequired: true,
          preRestoreBackupId: "restore_current",
          preRestoreBackupVerified: true,
          preRestoreBackupPersistence: "d1_restore_point_metadata",
          preRestoreBackupBlocker: null,
          approvalId: "restore_approval_123",
          approvalStatus: "approved_pending_commit",
          approvalPersistence: "d1_restore_approvals",
          commitAttemptId: "restore_commit_attempt_123",
          commitAttemptStatus: "blocked_until_restore_apply",
          commitAttemptPersistence: "d1_restore_commit_attempts",
          applicationPreflightId: "restore_application_preflight_123",
          applicationPreflightStatus: "blocked_until_restore_apply_implementation",
          applicationPreflightPersistence: "d1_restore_application_preflights",
          rollbackGuidance: {
            rollbackMode: "pre_restore_backup_required",
            preRestoreBackupId: "restore_current",
            destructiveWrite: false,
            blockers: ["Workspace snapshot writes require the Worker application commit gate after approval and preflight."],
            applicationTablePlan: request.applicationTablePlan,
          },
          commitStatus: "blocked_until_restore_apply_implementation",
          authorizationPolicy: "owner_or_producer",
        }),
        { status: 200 },
      );
    };

    const result = await runRestoreApplicationDryRun(
      "https://worker.test",
      "csrf_1234567890",
      request,
      fetcher,
    );

    expect(result.destructiveWrite).toBe(false);
    expect(result.commitAttemptId).toBe("restore_commit_attempt_123");
    expect(result.applicationPreflightId).toBe("restore_application_preflight_123");
    expect(result.applicationPreflightPersistence).toBe("d1_restore_application_preflights");
    expect(result.rollbackGuidance.blockers).toContain("Workspace snapshot writes require the Worker application commit gate after approval and preflight.");
    expect(result.rollbackGuidance.applicationTablePlan).toEqual(request.applicationTablePlan);
  });

  it("posts restore application commit requests with preflight and workspace snapshot records", async () => {
    const request = {
      workspaceId: "workspace_acme",
      snapshotWorkspaceId: "workspace_acme",
      backupCreatedAt: "2026-07-08T00:00:00.000Z",
      preRestoreBackupId: "restore_current",
      approvalId: "restore_approval_123",
      commitAttemptId: "restore_commit_attempt_123",
      applicationPreflightId: "restore_application_preflight_123",
      confirmation: "RESTORE workspace_acme",
      applicationTablePlan: [],
      preview: {
        incomingRecordCount: 2,
        changedRecordCount: 1,
        newRecordCount: 1,
        fieldConflictCount: 0,
        warnings: [],
      },
      records: [
        {
          entityType: "workspace" as const,
          entityId: "workspace_acme",
          action: "update" as const,
          title: "Restored Workspace",
          archivedProjectCount: 2,
          backupPolicy: "Manual",
          nextBackup: "Not scheduled",
        },
        {
          entityType: "project" as const,
          entityId: "proj_restored",
          action: "create" as const,
          title: "Restored Project",
          phase: "Production",
        },
      ],
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/application-commit");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: false,
          ...request,
          backupCreatedAt: request.backupCreatedAt,
          confirmationAccepted: true,
          confirmationPhrase: "RESTORE workspace_acme",
          restoreMode: "workspace_snapshot_records_commit",
          destructiveWrite: true,
          preRestoreBackupRequired: true,
          preRestoreBackupId: "restore_current",
          preRestoreBackupVerified: true,
          preRestoreBackupPersistence: "d1_restore_point_metadata",
          preRestoreBackupBlocker: null,
          approvalStatus: "approved_pending_commit",
          approvalPersistence: "d1_restore_approvals",
          commitAttemptStatus: "blocked_until_restore_apply",
          commitAttemptPersistence: "d1_restore_commit_attempts",
          applicationPreflightStatus: "blocked_until_restore_apply_implementation",
          applicationPreflightPersistence: "d1_restore_application_preflights",
          applicationCommitId: "restore_application_commit_123",
          applicationCommitStatus: "applied_workspace_snapshot_records",
          applicationCommitPersistence: "d1_restore_application_commits",
          commitStatus: "applied_workspace_snapshot_records",
          authorizationPolicy: "owner_or_producer",
          rollbackGuidance: {},
          recordSummary: { recordCount: 2, createCount: 1, updateCount: 1, skipCount: 0 },
          result: { appliedCount: 2, skippedCount: 0 },
          unsupportedRestoreDomains: ["planning"],
        }),
        { status: 200 },
      );
    };

    const result = await runRestoreApplicationCommit(
      "https://worker.test",
      "csrf_1234567890",
      request,
      fetcher,
    );

    expect(result.dryRun).toBe(false);
    expect(result.destructiveWrite).toBe(true);
    expect(result.applicationCommitId).toBe("restore_application_commit_123");
    expect(result.applicationCommitPersistence).toBe("d1_restore_application_commits");
    expect(result.recordSummary.createCount).toBe(1);
  });

  it("posts planning restore dry-run records with csrf metadata", async () => {
    const request = {
      workspaceId: "workspace_acme",
      snapshotWorkspaceId: "workspace_acme",
      backupCreatedAt: "2026-07-08T00:00:00.000Z",
      records: [
        {
          kind: "location" as const,
          id: "restore_location_same",
          workspaceId: "workspace_acme",
          projectId: "proj_planning",
          title: "Desert Motel",
          fields: { locationType: "Interior" },
        },
      ],
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/planning-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          restoreMode: "planning_restore_preview_only",
          commitPolicy: "planning_rows_preview_only",
          destructiveWrite: false,
          authorizationPolicy: "owner_or_producer",
          planningPreviewId: "restore_planning_preview_123",
          planningPreviewStatus: "preview_only",
          planningPreviewPersistence: "d1_restore_planning_previews",
          persistence: "d1_planning_restore_preview",
          auditPersistence: "d1_audit_events",
          accepted: [{ id: "restore_location_same", kind: "location", title: "Desert Motel" }],
          rejected: [],
          createPreview: [],
          idempotent: ["restore_location_same"],
          updatePreview: [],
          updatePreviewDetails: [],
          tableSummary: [
            {
              kind: "location",
              tableName: "locations",
              acceptedCount: 1,
              createPreviewCount: 0,
              idempotentCount: 1,
              updatePreviewCount: 0,
              rejectedCount: 0,
            },
          ],
        }),
        { status: 200 },
      );
    };

    const result = await runRestorePlanningDryRun("https://worker.test", "csrf_1234567890", request, fetcher);

    expect(result.destructiveWrite).toBe(false);
    expect(result.planningPreviewId).toBe("restore_planning_preview_123");
    expect(result.planningPreviewPersistence).toBe("d1_restore_planning_previews");
    expect(result.idempotent).toEqual(["restore_location_same"]);
    expect(result.tableSummary[0]?.tableName).toBe("locations");
  });

  it("posts planning restore commit records with durable gate metadata", async () => {
    const request = {
      workspaceId: "workspace_acme",
      snapshotWorkspaceId: "workspace_acme",
      backupCreatedAt: "2026-07-08T00:00:00.000Z",
      preRestoreBackupId: "restore_current",
      approvalId: "restore_approval_123",
      commitAttemptId: "restore_commit_attempt_123",
      applicationPreflightId: "restore_application_preflight_123",
      planningPreviewId: "restore_planning_preview_123",
      confirmation: "RESTORE workspace_acme",
      preview: {
        incomingRecordCount: 10,
        changedRecordCount: 2,
        newRecordCount: 3,
        fieldConflictCount: 4,
        warnings: [],
      },
      applicationTablePlan: [
        {
          tableName: "locations",
          source: "d1_planning_export",
          entityType: "planning",
          operationCount: 1,
          createCount: 0,
          updateCount: 0,
          skipCount: 0,
          previewOnlyCount: 1,
          fieldConflictCount: 0,
          restoreSupport: "preview_only",
          blockers: ["D1 planning rows require the Worker planning commit gate after approval and preflight."],
        },
      ],
      records: [
        {
          kind: "location" as const,
          id: "restore_location_changed",
          workspaceId: "workspace_acme",
          projectId: "proj_planning",
          title: "Warehouse",
          fields: { locationType: "Exterior" },
        },
      ],
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/planning-commit");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: false,
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          confirmationAccepted: true,
          confirmationPhrase: "RESTORE workspace_acme",
          destructiveWrite: true,
          preRestoreBackupRequired: true,
          preRestoreBackupId: "restore_current",
          preRestoreBackupVerified: true,
          preRestoreBackupPersistence: "d1_restore_point_metadata",
          preRestoreBackupBlocker: null,
          approvalId: "restore_approval_123",
          approvalStatus: "approved_pending_commit",
          approvalPersistence: "d1_restore_approvals",
          commitAttemptId: "restore_commit_attempt_123",
          commitAttemptStatus: "blocked_until_restore_apply",
          commitAttemptPersistence: "d1_restore_commit_attempts",
          applicationPreflightId: "restore_application_preflight_123",
          applicationPreflightStatus: "blocked_until_restore_apply_implementation",
          applicationPreflightPersistence: "d1_restore_application_preflights",
          planningPreviewId: "restore_planning_preview_123",
          planningPreviewStatus: "preview_only",
          planningPreviewPersistence: "d1_restore_planning_previews",
          planningCommitId: "restore_planning_commit_123",
          planningCommitStatus: "applied_planning_records",
          planningCommitPersistence: "d1_restore_planning_commits",
          restoreMode: "planning_records_commit",
          commitStatus: "applied_planning_records",
          authorizationPolicy: "owner_or_producer",
          auditPersistence: "d1_audit_events",
          preview: request.preview,
          result: {
            applied: ["restore_location_changed"],
            skipped: [],
            appliedCount: 1,
            skippedCount: 0,
            createCount: 0,
            updateCount: 1,
            idempotentCount: 0,
            tableSummary: [
              {
                kind: "location",
                tableName: "locations",
                acceptedCount: 1,
                createPreviewCount: 0,
                idempotentCount: 0,
                updatePreviewCount: 1,
                rejectedCount: 0,
                appliedCount: 1,
                skippedCount: 0,
              },
            ],
          },
          unsupportedRestoreDomains: ["attachment_bytes"],
        }),
        { status: 200 },
      );
    };

    const result = await runRestorePlanningCommit("https://worker.test", "csrf_1234567890", request, fetcher);

    expect(result.dryRun).toBe(false);
    expect(result.destructiveWrite).toBe(true);
    expect(result.planningCommitId).toBe("restore_planning_commit_123");
    expect(result.planningCommitPersistence).toBe("d1_restore_planning_commits");
    expect(result.result.updateCount).toBe(1);
    expect(result.result.tableSummary[0]?.appliedCount).toBe(1);
  });

  it("posts restore attachment package dry-run requests with csrf metadata", async () => {
    const request = {
      workspaceId: "workspace_acme",
      snapshotWorkspaceId: "workspace_acme",
      backupCreatedAt: "2026-07-08T00:00:00.000Z",
      attachmentPackagePlan: {
        policy: "metadata_only",
        packageRequired: true,
        byteRestoreSupport: "blocked",
        metadataRecordCount: 1,
        stagedLocalRecordCount: 0,
        r2DryRunRecordCount: 1,
        storedR2RecordCount: 0,
        totalSourceBytes: 4096,
        blockers: ["Attachment metadata can be previewed, but byte restore requires a verified attachment package."],
      },
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/attachment-package-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          restoreMode: "attachment_restore_package_preflight_only",
          commitPolicy: "attachment_bytes_blocked_until_package_verification",
          destructiveWrite: false,
          canRestoreBytes: false,
          authorizationPolicy: "owner_or_producer",
          attachmentPackagePreflightId: "restore_attachment_package_preflight_123",
          attachmentPackagePreflightStatus: "blocked_until_attachment_package_verification",
          attachmentPackagePreflightPersistence: "d1_restore_attachment_package_preflights",
          auditPersistence: "d1_audit_events",
          attachmentPackagePlan: request.attachmentPackagePlan,
          blockers: request.attachmentPackagePlan.blockers,
        }),
        { status: 200 },
      );
    };

    const result = await runRestoreAttachmentPackageDryRun("https://worker.test", "csrf_1234567890", request, fetcher);

    expect(result.destructiveWrite).toBe(false);
    expect(result.canRestoreBytes).toBe(false);
    expect(result.attachmentPackagePreflightId).toBe("restore_attachment_package_preflight_123");
    expect(result.attachmentPackagePreflightPersistence).toBe("d1_restore_attachment_package_preflights");
  });

  it("posts restore attachment package verification dry-run requests with csrf metadata", async () => {
    const request = {
      workspaceId: "workspace_acme",
      snapshotWorkspaceId: "workspace_acme",
      backupCreatedAt: "2026-07-08T00:00:00.000Z",
      attachmentPackagePreflightId: "restore_attachment_package_preflight_123",
      packageSha256: "c".repeat(64),
      manifestSha256: "d".repeat(64),
      attachmentPackagePlan: {
        policy: "metadata_only",
        packageRequired: true,
        byteRestoreSupport: "blocked",
        metadataRecordCount: 1,
        stagedLocalRecordCount: 0,
        r2DryRunRecordCount: 1,
        storedR2RecordCount: 0,
        totalSourceBytes: 4096,
        blockers: ["Attachment metadata can be previewed, but byte restore requires a verified attachment package."],
      },
      packageManifest: {
        format: "film.attachment-package" as const,
        version: 1 as const,
        workspaceId: "workspace_acme",
        createdAt: "2026-07-08T00:01:00.000Z",
        objectCount: 1,
        totalSourceBytes: 4096,
        objects: [
          {
            path: "attachments/001-doc_pkg_a-call-sheet.pdf",
            docId: "doc_pkg_a",
            objectKey: "workspaces/workspace_acme/attachments/doc_pkg_a/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-call-sheet.pdf",
            name: "call-sheet.pdf",
            sourcePath: "Files/call-sheet.pdf",
            sizeBytes: 4096,
            contentType: "application/pdf",
            sha256: "a".repeat(64),
            committedAt: "2026-07-08T00:01:00.000Z",
          },
        ],
      },
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/attachment-package-verify-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          workspaceId: "workspace_acme",
          snapshotWorkspaceId: "workspace_acme",
          backupCreatedAt: "2026-07-08T00:00:00.000Z",
          restoreMode: "attachment_restore_package_verification_only",
          commitPolicy: "attachment_bytes_blocked_until_destination_write_rules",
          destructiveWrite: false,
          canRestoreBytes: false,
          authorizationPolicy: "owner_or_producer",
          attachmentPackagePreflightId: "restore_attachment_package_preflight_123",
          attachmentPackagePreflightPersistence: "d1_restore_attachment_package_preflights",
          attachmentPackageVerificationId: "restore_attachment_package_verification_123",
          attachmentPackageVerificationStatus: "verified_until_destination_rules",
          attachmentPackageVerificationPersistence: "d1_restore_attachment_package_verifications",
          auditPersistence: "d1_audit_events",
          packageSha256: "c".repeat(64),
          manifestSha256: "d".repeat(64),
          packageManifest: {
            format: "film.attachment-package",
            version: 1,
            workspaceId: "workspace_acme",
            objectCount: 1,
            totalSourceBytes: 4096,
          },
          blockers: ["Attachment package metadata is verified, but byte restore still requires destination write rules."],
        }),
        { status: 200 },
      );
    };

    const result = await runRestoreAttachmentPackageVerificationDryRun("https://worker.test", "csrf_1234567890", request, fetcher);

    expect(result.destructiveWrite).toBe(false);
    expect(result.canRestoreBytes).toBe(false);
    expect(result.attachmentPackageVerificationId).toBe("restore_attachment_package_verification_123");
    expect(result.attachmentPackageVerificationPersistence).toBe("d1_restore_attachment_package_verifications");
  });

  it("posts restore attachment object plan dry-run requests with csrf metadata", async () => {
    const packageManifest = {
      format: "film.attachment-package" as const,
      version: 1 as const,
      workspaceId: "workspace_acme",
      createdAt: "2026-07-08T00:01:00.000Z",
      objectCount: 1,
      totalSourceBytes: 4096,
      objects: [
        {
          path: "attachments/001-doc_pkg_a-call-sheet.pdf",
          docId: "doc_pkg_a",
          objectKey: "workspaces/workspace_acme/attachments/doc_pkg_a/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-call-sheet.pdf",
          name: "call-sheet.pdf",
          sourcePath: "Files/call-sheet.pdf",
          sizeBytes: 4096,
          contentType: "application/pdf",
          sha256: "a".repeat(64),
          committedAt: "2026-07-08T00:01:00.000Z",
        },
      ],
    };
    const request = {
      workspaceId: "workspace_acme",
      attachmentPackageVerificationId: "restore_attachment_package_verification_123",
      packageSha256: "c".repeat(64),
      manifestSha256: "d".repeat(64),
      packageManifest,
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/attachment-objects-plan-dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          workspaceId: "workspace_acme",
          restoreMode: "attachment_restore_object_plan_only",
          commitPolicy: "attachment_bytes_blocked_until_destination_write_rules",
          destructiveWrite: false,
          canRestoreBytes: false,
          authorizationPolicy: "owner_or_producer",
          attachmentPackageVerificationId: "restore_attachment_package_verification_123",
          attachmentPackageVerificationPersistence: "d1_restore_attachment_package_verifications",
          attachmentObjectPlanId: "restore_attachment_object_plan_123",
          attachmentObjectPlanStatus: "blocked_until_attachment_destination_write_rules",
          attachmentObjectPlanPersistence: "d1_restore_attachment_object_plans",
          auditPersistence: "d1_audit_events",
          result: {
            objectCount: 1,
            totalSourceBytes: 4096,
            blockedDestinationCount: 1,
            destinationPolicy: "workspace_scoped_deterministic_object_keys",
            overwritePolicy: "blocked_until_explicit_overwrite_rules",
            byteSourcePolicy: "verified_package_manifest_only",
            sourceVerificationStatus: "metadata_hash_verified_without_bytes",
            objects: [
              {
                docId: "doc_pkg_a",
                name: "call-sheet.pdf",
                sourceObjectKey: packageManifest.objects[0].objectKey,
                destinationObjectKey: packageManifest.objects[0].objectKey,
                sizeBytes: 4096,
                sha256: "a".repeat(64),
                destinationStatus: "candidate_workspace_key",
                overwriteStatus: "blocked_until_overwrite_policy",
                byteSourceStatus: "requires_package_object_bytes_at_commit",
                sourceVerificationStatus: "sha256_declared_in_verified_manifest",
                action: "blocked_destination_write_rules",
                blocker: "Attachment destination write rules are required before byte restore.",
              },
            ],
          },
          blockers: ["Attachment object destinations are planned, but byte restore still requires explicit destination write rules."],
        }),
        { status: 200 },
      );
    };

    const result = await runRestoreAttachmentObjectPlanDryRun("https://worker.test", "csrf_1234567890", request, fetcher);

    expect(result.destructiveWrite).toBe(false);
    expect(result.canRestoreBytes).toBe(false);
    expect(result.attachmentObjectPlanId).toBe("restore_attachment_object_plan_123");
    expect(result.result.blockedDestinationCount).toBe(1);
    expect(result.result.destinationPolicy).toBe("workspace_scoped_deterministic_object_keys");
    expect(result.result.objects[0].byteSourceStatus).toBe("requires_package_object_bytes_at_commit");
  });

  it("posts restore attachment object commit preflight requests with csrf metadata", async () => {
    const packageManifest = {
      format: "film.attachment-package" as const,
      version: 1 as const,
      workspaceId: "workspace_acme",
      createdAt: "2026-07-08T00:01:00.000Z",
      objectCount: 1,
      totalSourceBytes: 4096,
      objects: [
        {
          path: "attachments/001-doc_pkg_a-call-sheet.pdf",
          docId: "doc_pkg_a",
          objectKey: "workspaces/workspace_acme/attachments/doc_pkg_a/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-call-sheet.pdf",
          name: "call-sheet.pdf",
          sourcePath: "Files/call-sheet.pdf",
          sizeBytes: 4096,
          contentType: "application/pdf",
          sha256: "a".repeat(64),
          committedAt: "2026-07-08T00:01:00.000Z",
        },
      ],
    };
    const request = {
      workspaceId: "workspace_acme",
      attachmentPackageVerificationId: "restore_attachment_package_verification_123",
      attachmentObjectPlanId: "restore_attachment_object_plan_123",
      packageSha256: "c".repeat(64),
      manifestSha256: "d".repeat(64),
      packageManifest,
      confirmation: "RESTORE workspace_acme",
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/attachment-objects-commit-preflight");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(init?.body).toBe(JSON.stringify(request));

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          workspaceId: "workspace_acme",
          confirmationAccepted: true,
          confirmationPhrase: "RESTORE workspace_acme",
          restoreMode: "attachment_restore_object_commit_preflight_only",
          commitPolicy: "attachment_bytes_ready_for_explicit_commit_endpoint",
          destructiveWrite: false,
          canRestoreBytes: false,
          readyForByteCommit: true,
          authorizationPolicy: "owner_or_producer",
          attachmentPackageVerificationId: "restore_attachment_package_verification_123",
          attachmentPackageVerificationPersistence: "d1_restore_attachment_package_verifications",
          attachmentObjectPlanId: "restore_attachment_object_plan_123",
          attachmentObjectPlanStatus: "blocked_until_attachment_destination_write_rules",
          attachmentObjectPlanPersistence: "d1_restore_attachment_object_plans",
          attachmentObjectCommitPreflightId: "restore_attachment_object_commit_preflight_123",
          attachmentObjectCommitPreflightStatus: "ready_for_attachment_byte_commit",
          attachmentObjectCommitPreflightPersistence: "d1_restore_attachment_object_commit_preflights",
          auditPersistence: "d1_audit_events",
          packageSha256: "c".repeat(64),
          manifestSha256: "d".repeat(64),
          result: {
            objectCount: 1,
            totalSourceBytes: 4096,
            readyDestinationCount: 1,
            blockedDestinationCount: 0,
            destinationPolicy: "workspace_scoped_new_object_keys_only",
            overwritePolicy: "overwrite_blocked_existing_destinations",
            byteSourcePolicy: "package_object_bytes_required_at_commit",
            sourceVerificationStatus: "metadata_hash_verified_without_bytes",
            objects: [
              {
                docId: "doc_pkg_a",
                name: "call-sheet.pdf",
                sourceObjectKey: packageManifest.objects[0].objectKey,
                destinationObjectKey: packageManifest.objects[0].objectKey,
                sizeBytes: 4096,
                sha256: "a".repeat(64),
                destinationStatus: "destination_absent",
                overwriteStatus: "new_object_allowed",
                byteSourceStatus: "requires_package_object_bytes_at_commit",
                sourceVerificationStatus: "sha256_declared_in_verified_manifest",
                action: "ready_for_explicit_byte_commit",
                existingR2Object: false,
                existingStoredRecord: false,
                blocker: null,
              },
            ],
            blockers: [],
          },
          blockers: [],
        }),
        { status: 200 },
      );
    };

    const result = await runRestoreAttachmentObjectCommitPreflight("https://worker.test", "csrf_1234567890", request, fetcher);

    expect(result.destructiveWrite).toBe(false);
    expect(result.canRestoreBytes).toBe(false);
    expect(result.readyForByteCommit).toBe(true);
    expect(result.attachmentObjectCommitPreflightId).toBe("restore_attachment_object_commit_preflight_123");
    expect(result.result.readyDestinationCount).toBe(1);
    expect(result.result.objects[0].action).toBe("ready_for_explicit_byte_commit");
  });

  it("uploads verified attachment bytes through the restore commit boundary", async () => {
    const bytes = new Blob(["attachment bytes"], { type: "application/pdf" });
    const request = {
      workspaceId: "workspace_acme",
      attachmentPackageVerificationId: "restore_attachment_package_verification_123",
      attachmentObjectPlanId: "restore_attachment_object_plan_123",
      attachmentObjectCommitPreflightId: "restore_attachment_object_commit_preflight_123",
      docId: "doc_pkg_a",
      destinationObjectKey: "workspaces/workspace_acme/attachments/doc_pkg_a/hash-call-sheet.pdf",
      sizeBytes: bytes.size,
      contentType: "application/pdf",
      sha256: "a".repeat(64),
      packageSha256: "c".repeat(64),
      manifestSha256: "d".repeat(64),
      confirmation: "RESTORE workspace_acme",
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/restores/attachment-object-commit");
      expect(init?.method).toBe("PUT");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/pdf",
        "x-film-csrf": "csrf_1234567890",
        "x-film-workspace-id": request.workspaceId,
        "x-film-attachment-package-verification-id": request.attachmentPackageVerificationId,
        "x-film-attachment-object-plan-id": request.attachmentObjectPlanId,
        "x-film-attachment-object-commit-preflight-id": request.attachmentObjectCommitPreflightId,
        "x-film-doc-id": request.docId,
        "x-film-destination-object-key": request.destinationObjectKey,
        "x-film-size-bytes": String(request.sizeBytes),
        "x-film-sha256": request.sha256,
        "x-film-package-sha256": request.packageSha256,
        "x-film-manifest-sha256": request.manifestSha256,
        "x-film-storage-confirmation": request.confirmation,
      });
      expect(init?.body).toBe(bytes);
      return new Response(JSON.stringify({
        ok: true,
        dryRun: false,
        restoreMode: "attachment_object_byte_commit",
        destructiveWrite: true,
        idempotent: false,
        persistence: "r2_restore_attachment_object",
        commit: {
          id: "restore_attachment_object_commit_123",
          workspaceId: request.workspaceId,
          attachmentPackageVerificationId: request.attachmentPackageVerificationId,
          attachmentObjectPlanId: request.attachmentObjectPlanId,
          attachmentObjectCommitPreflightId: request.attachmentObjectCommitPreflightId,
          docId: request.docId,
          sourceObjectKey: request.destinationObjectKey,
          destinationObjectKey: request.destinationObjectKey,
          sizeBytes: request.sizeBytes,
          contentType: request.contentType,
          sha256: request.sha256,
          status: "stored_r2",
          destructiveWrite: true,
          createdAt: "2026-07-09T00:00:00.000Z",
        },
      }), { status: 200 });
    };

    const result = await commitRestoreAttachmentObject(
      "https://worker.test",
      "csrf_1234567890",
      request,
      bytes,
      fetcher,
    );

    expect(result.destructiveWrite).toBe(true);
    expect(result.commit.status).toBe("stored_r2");
    expect(result.idempotent).toBe(false);
  });

  it("returns planning restore rejected-record previews from 422 responses", async () => {
    const request = {
      workspaceId: "workspace_acme",
      snapshotWorkspaceId: "workspace_acme",
      records: [
        {
          kind: "location" as const,
          id: "restore_location_wrong_workspace",
          workspaceId: "workspace_other",
          projectId: null,
          title: "Wrong workspace",
          fields: {},
        },
      ],
    };
    const fetcher: typeof fetch = async () => new Response(
      JSON.stringify({
        ok: false,
        dryRun: true,
        workspaceId: "workspace_acme",
        snapshotWorkspaceId: "workspace_acme",
        backupCreatedAt: null,
        restoreMode: "planning_restore_preview_only",
        commitPolicy: "planning_rows_preview_only",
        destructiveWrite: false,
        authorizationPolicy: "owner_or_producer",
        planningPreviewId: "restore_planning_preview_123",
        planningPreviewStatus: "preview_only",
        planningPreviewPersistence: "d1_restore_planning_previews",
        persistence: "d1_planning_restore_preview",
        accepted: [],
        rejected: [{ index: 0, reason: "workspace_mismatch" }],
        createPreview: [],
        idempotent: [],
        updatePreview: [],
        updatePreviewDetails: [],
        tableSummary: [
          {
            kind: "location",
            tableName: "locations",
            acceptedCount: 0,
            createPreviewCount: 0,
            idempotentCount: 0,
            updatePreviewCount: 0,
            rejectedCount: 1,
          },
        ],
      }),
      { status: 422 },
    );

    const result = await runRestorePlanningDryRun("https://worker.test", "csrf_1234567890", request, fetcher);

    expect(result.ok).toBe(false);
    expect(result.rejected).toEqual([{ index: 0, reason: "workspace_mismatch" }]);
    expect(result.tableSummary[0]?.rejectedCount).toBe(1);
  });
});
