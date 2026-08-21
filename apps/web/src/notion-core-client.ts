import type { NotionCoreRecord } from "@film/importers";

export type NotionCoreCommitRequest = {
  workspaceId: string;
  projectId: string;
  records: NotionCoreRecord[];
};

export type NotionCoreCommitSummary = {
  committedCount: number;
  idempotentCount: number;
  updatePreviewCount: number;
  rejectedCount: number;
  persistence: string;
  auditPersistence: string;
  destructiveWrite: boolean;
  truncated: boolean;
};

type NotionCoreCommitResponse = {
  persistence?: string;
  auditPersistence?: string;
  destructiveWrite?: boolean;
  committed?: Array<{ id: string; kind: string }>;
  idempotent?: Array<{ id: string; kind: string }>;
  updatePreview?: Array<{ id: string; kind: string; fieldKeys: string[] }>;
  rejected?: Array<{ index: number; reason: string }>;
  error?: string;
};

export async function commitNotionCoreRecords(
  workerUrl: string,
  csrfToken: string,
  request: NotionCoreCommitRequest,
  fetcher: typeof fetch = fetch,
): Promise<NotionCoreCommitSummary> {
  const records = request.records.slice(0, 200);
  if (records.length === 0) {
    return {
      committedCount: 0,
      idempotentCount: 0,
      updatePreviewCount: 0,
      rejectedCount: 0,
      persistence: "not_applicable",
      auditPersistence: "not_applicable",
      destructiveWrite: false,
      truncated: false,
    };
  }

  const response = await fetcher(`${workerUrl}/api/imports/notion/core/commit`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": csrfToken,
    },
    body: JSON.stringify({
      workspaceId: request.workspaceId,
      projectId: request.projectId,
      records,
    }),
  });
  const body = await response.json() as NotionCoreCommitResponse;
  if (!response.ok && response.status !== 422) {
    throw new Error(body.error ?? `Notion core import commit failed with ${response.status}`);
  }
  return {
    committedCount: body.committed?.length ?? 0,
    idempotentCount: body.idempotent?.length ?? 0,
    updatePreviewCount: body.updatePreview?.length ?? 0,
    rejectedCount: body.rejected?.length ?? 0,
    persistence: body.persistence ?? "dry_run_memoryless",
    auditPersistence: body.auditPersistence ?? "not_applicable",
    destructiveWrite: body.destructiveWrite === true,
    truncated: request.records.length > records.length,
  };
}
