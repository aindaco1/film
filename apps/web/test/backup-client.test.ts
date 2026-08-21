import { describe, expect, it } from "vitest";
import {
  createStoredBackupObjectDownloadPlan,
  downloadStoredBackupObject,
  exportStoredBackupManifest,
  runBackupDryRun,
  runPlanningExportDryRun,
  storeBackupObject,
} from "../src/backup-client";

describe("backup client", () => {
  it("posts backup dry-run requests with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/backups/dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          persistence: "d1_restore_point_metadata",
          backup: {
            workspaceId: "workspace_acme",
            createdAt: "2026-07-08T00:00:00.000Z",
            secretPolicy: "provider_secrets_excluded",
            destination: "R2 placeholder binding",
            retentionPolicy: "last_5_restore_points",
            restorePoint: {
              id: "restore_1",
              label: "Jul 8, 2026, 12:00 AM UTC",
              snapshotRef: "r2://dry-run-backups/workspace_acme/backup.filmbackup.zip",
              createdAt: "2026-07-08T00:00:00.000Z",
            },
          },
        }),
        { status: 200 },
      );
    };

    const result = await runBackupDryRun("https://worker.test", "csrf_1234567890", fetcher);

    expect(result.persistence).toBe("d1_restore_point_metadata");
    expect(result.backup.restorePoint.id).toBe("restore_1");
  });

  it("throws backup dry-run errors", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ error: "missing_session" }), { status: 401 });

    await expect(runBackupDryRun("https://worker.test", "", fetcher)).rejects.toThrow("missing_session");
  });

  it("uploads encrypted backup ZIP bytes with explicit storage metadata", async () => {
    const bytes = new TextEncoder().encode("backup bytes");
    const expectedHash = await sha256Hex(bytes);
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/backups/r2/upload-object");
      expect(init?.method).toBe("PUT");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/zip",
        "x-film-csrf": "csrf_1234567890",
        "x-film-workspace-id": "workspace_acme",
        "x-film-backup-created-at": "2026-07-08T00:00:00.000Z",
        "x-film-size-bytes": String(bytes.byteLength),
        "x-film-sha256": expectedHash,
        "x-film-storage-confirmation": "STORE BACKUP workspace_acme",
      });
      expect(init?.body).toBeInstanceOf(Blob);

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: false,
          uploadMode: "worker_r2_put",
          persistence: "r2_backup_object",
          restorePointPersistence: "d1_restore_point_metadata",
          backup: {
            workspaceId: "workspace_acme",
            createdAt: "2026-07-08T00:00:00.000Z",
            secretPolicy: "provider_secrets_excluded",
            destination: "R2 BACKUPS binding",
            retentionPolicy: "last_5_restore_points",
            restorePoint: {
              id: "restore_1",
              label: "Jul 8, 2026, 12:00 AM UTC",
              snapshotRef: "r2://film-backups/workspaces/workspace_acme/backups/backup.filmbackup.zip",
              createdAt: "2026-07-08T00:00:00.000Z",
            },
            objectKey: "workspaces/workspace_acme/backups/backup.filmbackup.zip",
            sizeBytes: bytes.byteLength,
            sha256: expectedHash,
          },
        }),
        { status: 200 },
      );
    };

    const result = await storeBackupObject(
      "https://worker.test",
      "workspace_acme",
      "2026-07-08T00:00:00.000Z",
      bytes,
      "csrf_1234567890",
      fetcher,
    );

    expect(result.persistence).toBe("r2_backup_object");
    expect(result.backup.sha256).toBe(expectedHash);
  });

  it("throws backup R2 storage errors", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ error: "r2_binding_unavailable" }), { status: 503 });

    await expect(
      storeBackupObject(
        "https://worker.test",
        "workspace_acme",
        "2026-07-08T00:00:00.000Z",
        new TextEncoder().encode("backup bytes"),
        "csrf_1234567890",
        fetcher,
      ),
    ).rejects.toThrow("r2_binding_unavailable");
  });

  it("requests a stored backup manifest with csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/backups/r2/export-manifest");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        workspaceId: "workspace_acme",
        limit: 25,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          persistence: "d1_restore_point_metadata",
          workspaceId: "workspace_acme",
          exportPolicy: "stored_r2_backup_manifest_only",
          rowCount: 1,
          truncated: false,
          objects: [
            {
              restorePointId: "restore_1",
              label: "Jul 8, 2026, 12:00 AM UTC",
              snapshotRef: "r2://film-backups/workspaces/workspace_acme/backups/backup.filmbackup.zip",
              objectKey: "workspaces/workspace_acme/backups/backup.filmbackup.zip",
              createdAt: "2026-07-08T00:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      );
    };

    const result = await exportStoredBackupManifest(
      "https://worker.test",
      "workspace_acme",
      "csrf_1234567890",
      25,
      fetcher,
    );

    expect(result.rowCount).toBe(1);
    expect(result.objects[0]?.restorePointId).toBe("restore_1");
  });

  it("creates an expiring stored backup object download plan", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/backups/r2/object-download-plan");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        workspaceId: "workspace_acme",
        restorePointId: "restore_1",
      });

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          destructiveWrite: false,
          workspaceId: "workspace_acme",
          restorePointId: "restore_1",
          objectKey: "backups/workspace_acme/2026-07-08T00-00-00-000Z.filmbackup.zip",
          downloadPolicy: "expiring_backup_object_download_plan",
          backupDownloadPlanId: "backup_object_download_plan_1234567890",
          backupDownloadToken: "bdl_token_1234567890",
          backupDownloadTokenExpiresAt: "2026-07-08T00:15:00.000Z",
          backupDownloadPlanPersistence: "d1_backup_object_download_plans",
          auditPersistence: "d1_audit_events",
        }),
        { status: 200 },
      );
    };

    const result = await createStoredBackupObjectDownloadPlan(
      "https://worker.test",
      "workspace_acme",
      "restore_1",
      "csrf_1234567890",
      fetcher,
    );

    expect(result.backupDownloadPlanId).toBe("backup_object_download_plan_1234567890");
    expect(result.backupDownloadToken).toBe("bdl_token_1234567890");
    expect(result.destructiveWrite).toBe(false);
  });

  it("downloads a stored backup object with csrf and download-plan metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe(
        "https://worker.test/api/backups/r2/object?workspaceId=workspace_acme&restorePointId=restore_1&backupDownloadPlanId=backup_object_download_plan_1234567890&backupDownloadToken=bdl_token_1234567890",
      );
      expect(init?.method).toBe("GET");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({ "x-film-csrf": "csrf_1234567890" });

      return new Response(new Blob(["backup bytes"], { type: "application/zip" }), {
        status: 200,
        headers: {
          "content-disposition": "attachment; filename=\"film-backup-2026-07-08.filmbackup.zip\"",
          "x-film-restore-point-id": "restore_1",
          "x-film-backup-created-at": "2026-07-08T00:00:00.000Z",
          "x-film-backup-download-plan-id": "backup_object_download_plan_1234567890",
          "x-film-backup-download-token-expires-at": "2026-07-08T00:15:00.000Z",
        },
      });
    };

    const result = await downloadStoredBackupObject(
      "https://worker.test",
      "workspace_acme",
      "restore_1",
      "backup_object_download_plan_1234567890",
      "bdl_token_1234567890",
      "csrf_1234567890",
      fetcher,
    );

    expect(result.filename).toBe("film-backup-2026-07-08.filmbackup.zip");
    expect(result.restorePointId).toBe("restore_1");
    expect(result.backupDownloadPlanId).toBe("backup_object_download_plan_1234567890");
    expect(result.backupDownloadTokenExpiresAt).toBe("2026-07-08T00:15:00.000Z");
    expect(await result.blob.text()).toBe("backup bytes");
  });

  it("posts planning export dry-run requests with workspace and csrf metadata", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/planning/export/dry-run");
      expect(init?.method).toBe("POST");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
        "x-film-csrf": "csrf_1234567890",
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        workspaceId: "workspace_acme",
        limit: 1000,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
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
                workspaceId: "workspace_acme",
                projectId: null,
                title: "Desert Motel",
                fields: { Type: "Interior" },
              },
            ],
          },
        }),
        { status: 200 },
      );
    };

    const result = await runPlanningExportDryRun(
      "https://worker.test",
      "workspace_acme",
      "csrf_1234567890",
      fetcher,
    );

    expect(result.rowCount).toBe(1);
    expect(result.records[0]?.title).toBe("Desert Motel");
  });

  it("can request a bounded planning export dry-run limit", async () => {
    const fetcher: typeof fetch = async (_input, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        workspaceId: "workspace_acme",
        limit: 100,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          planningExport: {
            policy: "d1_planning_rows",
            persistence: "d1_planning_export",
            exportedAt: "2026-07-08T00:00:00.000Z",
            rowCount: 0,
            truncated: false,
            records: [],
          },
        }),
        { status: 200 },
      );
    };

    const result = await runPlanningExportDryRun(
      "https://worker.test",
      "workspace_acme",
      "csrf_1234567890",
      100,
      fetcher,
    );

    expect(result.rowCount).toBe(0);
  });

  it("throws planning export dry-run errors", async () => {
    const fetcher: typeof fetch = async () => new Response(JSON.stringify({ error: "insufficient_role" }), { status: 403 });

    await expect(runPlanningExportDryRun("https://worker.test", "workspace_acme", "", fetcher)).rejects.toThrow("insufficient_role");
  });
});

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
