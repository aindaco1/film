import { describe, expect, it } from "vitest";
import { cloneWorkspace, createProjectDoc, seedWorkspace } from "@film/schema";
import {
  applyAttachmentCommitResults,
  applyAttachmentStoreResults,
  collectStagedAttachmentMetadata,
  collectUploadableAttachmentMetadata,
  createAttachmentCommitRequests,
  uploadAttachmentObject,
} from "../src/attachment-upload";

describe("attachment upload dry-run helpers", () => {
  it("collects staged attachment metadata and applies commit results", () => {
    const workspace = cloneWorkspace(seedWorkspace);
    const project = workspace.projects[0];
    if (!project) throw new Error("Expected seed project");
    const doc = createProjectDoc("Poster.png", "ASSET", {
      sourcePath: "Feature/Poster.png",
      sourceSizeBytes: 4096,
      sourceContentType: "image/png",
      attachmentStatus: "staged_local",
      attachmentStorageKey: "attachment_workspace_doc_hash",
      attachmentSha256: "b".repeat(64),
      attachmentStagedAt: "2026-07-08T00:00:00.000Z",
    });
    project.docs.unshift(doc);

    const candidates = collectStagedAttachmentMetadata(workspace);
    const commitRequests = createAttachmentCommitRequests(candidates, [
      {
        docId: doc.id,
        objectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
        sizeBytes: 4096,
        commitToken: "dry_commit_token",
      },
    ]);
    const updated = applyAttachmentCommitResults(workspace, [
      {
        docId: doc.id,
        objectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
        status: "r2_dry_run",
        committedAt: "2026-07-08T00:10:00.000Z",
      },
    ]);

    expect(candidates).toEqual([
      {
        docId: doc.id,
        name: "Poster.png",
        sourcePath: "Feature/Poster.png",
        sizeBytes: 4096,
        contentType: "image/png",
        sha256: "b".repeat(64),
        storageKey: "attachment_workspace_doc_hash",
      },
    ]);
    expect(commitRequests).toEqual([
      {
        docId: doc.id,
        objectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
        sizeBytes: 4096,
        sha256: "b".repeat(64),
        commitToken: "dry_commit_token",
      },
    ]);
    expect(updated).toBe(1);
    expect(doc.attachmentStatus).toBe("r2_dry_run");
    expect(doc.attachmentR2ObjectKey).toContain("workspaces/");
    expect(doc.attachmentCommittedAt).toBe("2026-07-08T00:10:00.000Z");
    expect(collectStagedAttachmentMetadata(workspace)).toEqual([]);
    expect(collectUploadableAttachmentMetadata(workspace)).toHaveLength(1);
  });

  it("uploads staged attachment bytes through the Worker and applies stored results", async () => {
    const workspace = cloneWorkspace(seedWorkspace);
    const project = workspace.projects[0];
    if (!project) throw new Error("Expected seed project");
    const doc = createProjectDoc("Poster.png", "ASSET", {
      sourcePath: "Feature/Poster.png",
      sourceSizeBytes: 12,
      sourceContentType: "image/png",
      attachmentStatus: "r2_dry_run",
      attachmentStorageKey: "attachment_workspace_doc_hash",
      attachmentSha256: "b".repeat(64),
      attachmentStagedAt: "2026-07-08T00:00:00.000Z",
      attachmentR2ObjectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
    });
    project.docs.unshift(doc);
    const candidate = collectUploadableAttachmentMetadata(workspace)[0];
    if (!candidate) throw new Error("Expected uploadable candidate");
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/attachments/r2/upload-object");
      expect(init?.method).toBe("PUT");
      expect(init?.credentials).toBe("include");
      expect(init?.headers).toEqual({
        "content-type": "image/png",
        "x-film-csrf": "csrf_1234567890",
        "x-film-workspace-id": "workspace_acme",
        "x-film-doc-id": doc.id,
        "x-film-object-key": "workspaces/workspace_acme/attachments/doc_poster/poster.png",
        "x-film-size-bytes": "12",
        "x-film-sha256": "b".repeat(64),
        "x-film-commit-token": "dry_commit_token",
        "x-film-storage-confirmation": "STORE workspace_acme",
      });
      expect(init?.body).toBeInstanceOf(Blob);

      return new Response(
        JSON.stringify({
          dryRun: false,
          uploadMode: "worker_r2_put",
          persistence: "r2_attachment_object",
          attachment: {
            docId: doc.id,
            objectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
            status: "stored_r2",
            committedAt: "2026-07-08T00:20:00.000Z",
            sizeBytes: 12,
            idempotent: false,
          },
        }),
        { status: 200 },
      );
    };

    const result = await uploadAttachmentObject(
      "https://worker.test",
      "workspace_acme",
      candidate,
      {
        docId: doc.id,
        objectKey: "workspaces/workspace_acme/attachments/doc_poster/poster.png",
        sizeBytes: 12,
        contentType: "image/png",
        commitToken: "dry_commit_token",
      },
      new Blob(["poster bytes!"], { type: "image/png" }),
      "csrf_1234567890",
      fetcher,
    );
    const updated = applyAttachmentStoreResults(workspace, [result.attachment]);

    expect(result.persistence).toBe("r2_attachment_object");
    expect(updated).toBe(1);
    expect(doc.attachmentStatus).toBe("stored_r2");
    expect(doc.attachmentCommittedAt).toBe("2026-07-08T00:20:00.000Z");
  });
});
