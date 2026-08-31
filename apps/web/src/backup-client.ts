import type { BackupPlanningExport } from "@film/schema";
import { copyBytesToArrayBuffer } from "./binary-buffer";
import { parseWorkerJsonResponse as parseJsonResponse, type Fetcher } from "./worker-client";

export type BackupDryRunRestorePoint = {
  id: string;
  label: string;
  snapshotRef: string;
  createdAt: string;
};

export type BackupDryRunResult = {
  persistence: string;
  backup: {
    workspaceId: string;
    createdAt: string;
    secretPolicy: string;
    destination: string;
    retentionPolicy: string;
    restorePoint: BackupDryRunRestorePoint;
  };
};

export type BackupObjectStoreResult = {
  persistence: string;
  restorePointPersistence: string;
  auditPersistence?: string;
  uploadMode: "worker_r2_put";
  backup: BackupDryRunResult["backup"] & {
    objectKey: string;
    sizeBytes: number;
    sha256: string;
  };
};

export type StoredBackupExportObject = {
  restorePointId: string;
  label: string;
  snapshotRef: string;
  objectKey: string;
  createdAt: string;
};

export type StoredBackupExportManifest = {
  persistence: string;
  auditPersistence?: string;
  workspaceId: string;
  exportPolicy: "stored_r2_backup_manifest_only";
  rowCount: number;
  truncated: boolean;
  objects: StoredBackupExportObject[];
};

export type StoredBackupDownload = {
  blob: Blob;
  restorePointId: string | null;
  createdAt: string | null;
  filename: string | null;
  backupDownloadPlanId: string | null;
  backupDownloadTokenExpiresAt: string | null;
};

export type BackupObjectDownloadPlanResult = {
  workspaceId: string;
  restorePointId: string;
  objectKey: string;
  downloadPolicy: "expiring_backup_object_download_plan";
  backupDownloadPlanId: string;
  backupDownloadToken: string;
  backupDownloadTokenExpiresAt: string;
  backupDownloadPlanPersistence: string;
  auditPersistence?: string;
  destructiveWrite: boolean;
};

type BackupDryRunResponse = BackupDryRunResult & {
  dryRun: boolean;
  error?: string;
};
type BackupObjectStoreResponse = BackupObjectStoreResult & {
  dryRun: false;
  error?: string;
};
type BackupExportResponseError = {
  error?: string;
};
type BackupObjectDownloadPlanResponse = BackupObjectDownloadPlanResult & {
  dryRun: true;
  error?: string;
};
type PlanningExportDryRunResponse = {
  dryRun?: boolean;
  planningExport?: BackupPlanningExport;
  error?: string;
};

export async function runBackupDryRun(
  workerUrl: string,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<BackupDryRunResult> {
  const response = await fetcher(`${workerUrl}/api/backups/dry-run`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
  });
  const body = (await response.json()) as BackupDryRunResponse;
  if (!response.ok) {
    throw new Error(body.error ?? `Backup dry run failed with ${response.status}`);
  }
  return {
    persistence: body.persistence,
    backup: body.backup,
  };
}

export async function storeBackupObject(
  workerUrl: string,
  workspaceId: string,
  createdAt: string,
  bytes: Uint8Array,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<BackupObjectStoreResult> {
  const sha256 = await sha256HexBytes(bytes);
  const response = await fetcher(`${workerUrl}/api/backups/r2/upload-object`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "content-type": "application/zip",
      "x-film-csrf": csrfToken,
      "x-film-workspace-id": workspaceId,
      "x-film-backup-created-at": createdAt,
      "x-film-size-bytes": String(bytes.byteLength),
      "x-film-sha256": sha256,
      "x-film-storage-confirmation": `STORE BACKUP ${workspaceId}`,
    },
    body: new Blob([copyBytesToArrayBuffer(bytes)], { type: "application/zip" }),
  });
  const body = (await response.json()) as BackupObjectStoreResponse;
  if (!response.ok) {
    throw new Error(body.error ?? `Backup R2 storage failed with ${response.status}`);
  }
  return {
    persistence: body.persistence,
    restorePointPersistence: body.restorePointPersistence,
    auditPersistence: body.auditPersistence,
    uploadMode: body.uploadMode,
    backup: body.backup,
  };
}

export async function exportStoredBackupManifest(
  workerUrl: string,
  workspaceId: string,
  csrfToken: string,
  limit = 25,
  fetcher: Fetcher = fetch,
): Promise<StoredBackupExportManifest> {
  return parseJsonResponse<StoredBackupExportManifest>(
    await fetcher(`${workerUrl}/api/backups/r2/export-manifest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId, limit }),
    }),
    "Backup export manifest failed",
  );
}

export async function createStoredBackupObjectDownloadPlan(
  workerUrl: string,
  workspaceId: string,
  restorePointId: string,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<BackupObjectDownloadPlanResult> {
  const response = await fetcher(`${workerUrl}/api/backups/r2/object-download-plan`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({ workspaceId, restorePointId }),
  });
  const body = (await response.json()) as BackupObjectDownloadPlanResponse;
  if (!response.ok) {
    throw new Error(body.error ?? `Backup object download plan failed with ${response.status}`);
  }
  return {
    workspaceId: body.workspaceId,
    restorePointId: body.restorePointId,
    objectKey: body.objectKey,
    downloadPolicy: body.downloadPolicy,
    backupDownloadPlanId: body.backupDownloadPlanId,
    backupDownloadToken: body.backupDownloadToken,
    backupDownloadTokenExpiresAt: body.backupDownloadTokenExpiresAt,
    backupDownloadPlanPersistence: body.backupDownloadPlanPersistence,
    auditPersistence: body.auditPersistence,
    destructiveWrite: body.destructiveWrite,
  };
}

export async function downloadStoredBackupObject(
  workerUrl: string,
  workspaceId: string,
  restorePointId: string,
  backupDownloadPlanId: string,
  backupDownloadToken: string,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<StoredBackupDownload> {
  const params = new URLSearchParams({
    workspaceId,
    restorePointId,
    backupDownloadPlanId,
    backupDownloadToken,
  });
  const response = await fetcher(
    `${workerUrl}/api/backups/r2/object?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
      headers: { "x-film-csrf": csrfToken },
    },
  );
  if (!response.ok) {
    const body = (await response.json()) as BackupExportResponseError;
    throw new Error(body.error ?? "Backup download failed");
  }

  return {
    blob: await response.blob(),
    restorePointId: response.headers.get("x-film-restore-point-id"),
    createdAt: response.headers.get("x-film-backup-created-at"),
    filename: filenameFromContentDisposition(response.headers.get("content-disposition")),
    backupDownloadPlanId: response.headers.get("x-film-backup-download-plan-id"),
    backupDownloadTokenExpiresAt: response.headers.get("x-film-backup-download-token-expires-at"),
  };
}

export async function runPlanningExportDryRun(
  workerUrl: string,
  workspaceId: string,
  csrfToken: string,
  limitOrFetcher: number | Fetcher = 1000,
  fetcher: Fetcher = fetch,
): Promise<BackupPlanningExport> {
  const limit = typeof limitOrFetcher === "number" ? limitOrFetcher : 1000;
  const request = typeof limitOrFetcher === "function" ? limitOrFetcher : fetcher;
  const response = await request(`${workerUrl}/api/planning/export/dry-run`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({
      workspaceId,
      limit,
    }),
  });
  const body = (await response.json()) as PlanningExportDryRunResponse;
  if (!response.ok || !body.planningExport) {
    throw new Error(body.error ?? `Planning export dry run failed with ${response.status}`);
  }
  return body.planningExport;
}

function filenameFromContentDisposition(value: string | null): string | null {
  const match = value?.match(/filename="([^"]+)"/);
  return match?.[1] ?? null;
}

async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", copyBytesToArrayBuffer(bytes));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
