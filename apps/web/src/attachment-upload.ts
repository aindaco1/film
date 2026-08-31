import type { WorkspaceData } from "@film/schema";
import type { Fetcher } from "./worker-client";

export type AttachmentUploadCandidate = {
  docId: string;
  name: string;
  sourcePath?: string;
  sizeBytes: number;
  contentType?: string;
  sha256: string;
  storageKey: string;
};

export type AttachmentUploadIntent = {
  docId: string;
  objectKey: string;
  sizeBytes: number;
  contentType?: string;
  commitToken: string;
  idempotencyKey?: string;
};

export type AttachmentCommitRequest = {
  docId: string;
  objectKey: string;
  sizeBytes: number;
  sha256: string;
  commitToken: string;
};

export type AttachmentCommitResult = {
  docId: string;
  objectKey: string;
  status: "r2_dry_run";
  committedAt: string;
  idempotencyKey?: string;
  idempotent?: boolean;
};
export type AttachmentStoreResult = {
  docId: string;
  objectKey: string;
  status: "stored_r2";
  committedAt: string;
  idempotencyKey?: string;
  idempotent?: boolean;
  sizeBytes: number;
};
export type AttachmentObjectUploadResult = {
  dryRun: false;
  uploadMode: "worker_r2_put";
  persistence: string;
  attachment: AttachmentStoreResult;
};

export function collectStagedAttachmentMetadata(workspace: WorkspaceData): AttachmentUploadCandidate[] {
  return collectAttachmentMetadataByStatus(workspace, ["staged_local"]);
}

export function collectUploadableAttachmentMetadata(workspace: WorkspaceData): AttachmentUploadCandidate[] {
  return collectAttachmentMetadataByStatus(workspace, ["staged_local", "r2_dry_run"]);
}

function collectAttachmentMetadataByStatus(
  workspace: WorkspaceData,
  statuses: Array<NonNullable<WorkspaceData["projects"][number]["docs"][number]["attachmentStatus"]>>,
): AttachmentUploadCandidate[] {
  const statusSet = new Set(statuses);
  return workspace.projects.flatMap((project) =>
    project.docs
      .filter((doc) =>
        doc.type === "ASSET"
        && Boolean(doc.attachmentStatus && statusSet.has(doc.attachmentStatus))
        && doc.attachmentStorageKey
        && doc.attachmentSha256
        && typeof doc.sourceSizeBytes === "number"
      )
      .map((doc) => ({
        docId: doc.id,
        name: doc.name,
        sourcePath: doc.sourcePath,
        sizeBytes: doc.sourceSizeBytes ?? 0,
        contentType: doc.sourceContentType,
        sha256: doc.attachmentSha256 ?? "",
        storageKey: doc.attachmentStorageKey ?? "",
      })),
  );
}

export function createAttachmentCommitRequests(
  candidates: AttachmentUploadCandidate[],
  intents: AttachmentUploadIntent[],
): AttachmentCommitRequest[] {
  const candidatesByDocId = new Map(candidates.map((candidate) => [candidate.docId, candidate]));

  return intents.flatMap((intent) => {
    const candidate = candidatesByDocId.get(intent.docId);
    if (!candidate) return [];
    return [{
      docId: intent.docId,
      objectKey: intent.objectKey,
      sizeBytes: intent.sizeBytes,
      sha256: candidate.sha256,
      commitToken: intent.commitToken,
    }];
  });
}

export function applyAttachmentCommitResults(workspace: WorkspaceData, commits: AttachmentCommitResult[]): number {
  const commitsByDocId = new Map(commits.map((commit) => [commit.docId, commit]));
  let updated = 0;

  for (const project of workspace.projects) {
    for (const doc of project.docs) {
      const commit = commitsByDocId.get(doc.id);
      if (!commit) continue;
      doc.attachmentStatus = commit.status;
      doc.attachmentR2ObjectKey = commit.objectKey;
      doc.attachmentCommittedAt = commit.committedAt;
      updated += 1;
    }
  }

  return updated;
}

export function applyAttachmentStoreResults(workspace: WorkspaceData, stored: AttachmentStoreResult[]): number {
  const storedByDocId = new Map(stored.map((result) => [result.docId, result]));
  let updated = 0;

  for (const project of workspace.projects) {
    for (const doc of project.docs) {
      const result = storedByDocId.get(doc.id);
      if (!result) continue;
      doc.attachmentStatus = result.status;
      doc.attachmentR2ObjectKey = result.objectKey;
      doc.attachmentCommittedAt = result.committedAt;
      updated += 1;
    }
  }

  return updated;
}

export async function uploadAttachmentObject(
  workerUrl: string,
  workspaceId: string,
  candidate: AttachmentUploadCandidate,
  intent: AttachmentUploadIntent,
  blob: Blob,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<AttachmentObjectUploadResult> {
  const response = await fetcher(`${workerUrl}/api/attachments/r2/upload-object`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "content-type": (candidate.contentType ?? blob.type) || "application/octet-stream",
      "x-film-csrf": csrfToken,
      "x-film-workspace-id": workspaceId,
      "x-film-doc-id": candidate.docId,
      "x-film-object-key": intent.objectKey,
      "x-film-size-bytes": String(candidate.sizeBytes),
      "x-film-sha256": candidate.sha256,
      "x-film-commit-token": intent.commitToken,
      "x-film-storage-confirmation": `STORE ${workspaceId}`,
    },
    body: blob,
  });
  const body = (await response.json()) as AttachmentObjectUploadResult & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "Attachment upload failed");
  }
  return body;
}
