export type WorkerAuditEventManifestEntry = {
  id: string;
  action: string;
  projectId: string | null;
  actorMemberId: string | null;
  createdAt: string;
  metadataKeys: string[];
  metadataKeyCount: number;
};

export type WorkerAuditEventManifest = {
  dryRun: true;
  persistence: string;
  auditPersistence?: string;
  workspaceId: string;
  exportPolicy: "audit_event_manifest_only";
  metadataPolicy: "keys_only";
  rowCount: number;
  truncated: boolean;
  offset: number;
  nextOffset: number | null;
  actionPrefix: string | null;
  events: WorkerAuditEventManifestEntry[];
};

export type WorkerAuditEventManifestOptions = {
  limit?: number;
  offset?: number;
  actionPrefix?: string;
};

type WorkerAuditEventManifestError = {
  error?: string;
};

type Fetcher = typeof fetch;

export async function exportWorkerAuditEventManifest(
  workerUrl: string,
  workspaceId: string,
  csrfToken: string,
  options: number | WorkerAuditEventManifestOptions = 50,
  fetcher: Fetcher = fetch,
): Promise<WorkerAuditEventManifest> {
  const request = typeof options === "number"
    ? { workspaceId, limit: options }
    : {
      workspaceId,
      limit: options.limit ?? 50,
      offset: options.offset ?? 0,
      ...(options.actionPrefix?.trim() ? { actionPrefix: options.actionPrefix.trim() } : {}),
    };
  const response = await fetcher(`${workerUrl}/api/audit-events/export-dry-run`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify(request),
  });
  const body = (await response.json()) as WorkerAuditEventManifest | WorkerAuditEventManifestError;
  if (!response.ok) {
    throw new Error("error" in body && body.error ? body.error : `Worker audit manifest failed with ${response.status}`);
  }
  return body as WorkerAuditEventManifest;
}
