import { describe, expect, it } from "vitest";
import { cloneWorkspace, createProjectDoc, seedWorkspace, type WorkspaceData } from "@film/schema";
import { stageNotionAttachmentBlobs } from "../src/attachment-stage";
import type { AttachmentBlobRecord } from "../src/local-mirror";

describe("attachment staging", () => {
  it("stages imported Notion attachment bytes without embedding them in workspace JSON", async () => {
    const workspace = cloneWorkspace(seedWorkspace);
    const project = workspace.projects[0];
    if (!project) throw new Error("Expected seed project");

    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const doc = createProjectDoc("Poster.png", "ASSET", {
      date: "Imported asset",
      sourcePath: "Feature/Poster.png",
      sourceSizeBytes: pngBytes.byteLength,
      sourceContentType: "image/png",
      attachmentStatus: "metadata_only",
    });
    project.docs.unshift(doc);

    const persisted: AttachmentBlobRecord[] = [];
    const summary = await stageNotionAttachmentBlobs(
      workspace,
      [
        {
          path: "Feature/Poster.png",
          sizeBytes: pngBytes.byteLength,
          contentType: "image/png",
          readBlob: async () => new Blob([pngBytes], { type: "image/png" }),
        },
      ],
      async (records) => {
        persisted.push(...records);
      },
    );

    expect(summary).toMatchObject({
      stagedCount: 1,
      stagedBytes: 8,
      skippedCount: 0,
      warnings: [],
    });
    expect(persisted).toHaveLength(1);
    expect(persisted[0]?.blob.size).toBe(8);
    expect(persisted[0]?.sha256).toHaveLength(64);
    expect(doc.attachmentStatus).toBe("staged_local");
    expect(doc.attachmentStorageKey).toMatch(/^attachment_/);
    expect(doc.attachmentSha256).toBe(persisted[0]?.sha256);
    expect(workspaceJson(workspace)).not.toContain("AQIDBA");
  });

  it("leaves size, type, signature, and active SVG mismatches as metadata only", async () => {
    const workspace = cloneWorkspace(seedWorkspace);
    const project = workspace.projects[0];
    if (!project) throw new Error("Expected seed project");

    const htmlBytes = new TextEncoder().encode("<html>not a pdf</html>");
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const svgBytes = new TextEncoder().encode('<svg onload="alert(1)"><path /></svg>');
    const docs = [
      createProjectDoc("Contract.pdf", "ASSET", {
        date: "Imported asset",
        sourcePath: "Feature/Contract.pdf",
        sourceSizeBytes: htmlBytes.byteLength,
        sourceContentType: "application/pdf",
        attachmentStatus: "metadata_only",
      }),
      createProjectDoc("Mismatch.png", "ASSET", {
        date: "Imported asset",
        sourcePath: "Feature/Mismatch.png",
        sourceSizeBytes: pngBytes.byteLength + 1,
        sourceContentType: "image/png",
        attachmentStatus: "metadata_only",
      }),
      createProjectDoc("Wrong type.png", "ASSET", {
        date: "Imported asset",
        sourcePath: "Feature/Wrong type.png",
        sourceSizeBytes: pngBytes.byteLength,
        sourceContentType: "image/png",
        attachmentStatus: "metadata_only",
      }),
      createProjectDoc("Active.svg", "ASSET", {
        date: "Imported asset",
        sourcePath: "Feature/Active.svg",
        sourceSizeBytes: svgBytes.byteLength,
        sourceContentType: "image/svg+xml",
        attachmentStatus: "metadata_only",
      }),
    ];
    project.docs.unshift(...docs);
    let persistCalls = 0;

    const summary = await stageNotionAttachmentBlobs(
      workspace,
      [
        {
          path: "Feature/Contract.pdf",
          sizeBytes: htmlBytes.byteLength,
          contentType: "application/pdf",
          readBlob: async () => new Blob([htmlBytes], { type: "application/pdf" }),
        },
        {
          path: "Feature/Mismatch.png",
          sizeBytes: pngBytes.byteLength + 1,
          contentType: "image/png",
          readBlob: async () => new Blob([pngBytes], { type: "image/png" }),
        },
        {
          path: "Feature/Wrong type.png",
          sizeBytes: pngBytes.byteLength,
          contentType: "text/html",
          readBlob: async () => new Blob([pngBytes], { type: "text/html" }),
        },
        {
          path: "Feature/Active.svg",
          sizeBytes: svgBytes.byteLength,
          contentType: "image/svg+xml",
          readBlob: async () => new Blob([svgBytes], { type: "image/svg+xml" }),
        },
      ],
      async () => {
        persistCalls += 1;
      },
    );

    expect(summary).toEqual({
      stagedCount: 0,
      stagedBytes: 0,
      skippedCount: 4,
      warnings: [
        "4 imported attachments failed local size, type, or file-signature validation and remain metadata only.",
      ],
    });
    expect(persistCalls).toBe(0);
    expect(docs.every((doc) => doc.attachmentStatus === "metadata_only" && !doc.attachmentSha256)).toBe(true);
  });
});

function workspaceJson(workspace: WorkspaceData): string {
  return JSON.stringify(workspace);
}
