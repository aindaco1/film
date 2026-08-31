import type { NotionExportImportFile } from "@film/importers";
import type { ProjectDoc, WorkspaceData } from "@film/schema";
import type { AttachmentBlobRecord } from "./local-mirror";
import { copyBytesToArrayBuffer } from "./binary-buffer";

export type StagedNotionImportFile = NotionExportImportFile & {
  readBlob?: () => Promise<Blob>;
};

export type AttachmentStageSummary = {
  stagedCount: number;
  stagedBytes: number;
  skippedCount: number;
  warnings: string[];
};

type PendingDocStage = {
  doc: ProjectDoc;
  storageKey: string;
  sha256: string;
  stagedAt: string;
  contentType: string;
};

type AttachmentValidation =
  | { ok: true; contentType: string }
  | { ok: false };

const MAX_STAGED_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ATTACHMENT_TYPES: Record<string, { contentType: string; aliases?: string[] }> = {
  ".aiff": { contentType: "audio/aiff", aliases: ["audio/x-aiff"] },
  ".doc": { contentType: "application/msword" },
  ".docx": { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", aliases: ["application/zip"] },
  ".gif": { contentType: "image/gif" },
  ".heic": { contentType: "image/heic", aliases: ["image/heif"] },
  ".jpeg": { contentType: "image/jpeg", aliases: ["image/jpg"] },
  ".jpg": { contentType: "image/jpeg", aliases: ["image/jpg"] },
  ".json": { contentType: "application/json", aliases: ["text/json"] },
  ".m4a": { contentType: "audio/mp4", aliases: ["audio/x-m4a"] },
  ".mov": { contentType: "video/quicktime" },
  ".mp3": { contentType: "audio/mpeg", aliases: ["audio/mp3"] },
  ".mp4": { contentType: "video/mp4" },
  ".pdf": { contentType: "application/pdf" },
  ".png": { contentType: "image/png" },
  ".ppt": { contentType: "application/vnd.ms-powerpoint" },
  ".pptx": { contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", aliases: ["application/zip"] },
  ".svg": { contentType: "image/svg+xml" },
  ".tif": { contentType: "image/tiff" },
  ".tiff": { contentType: "image/tiff" },
  ".txt": { contentType: "text/plain" },
  ".wav": { contentType: "audio/wav", aliases: ["audio/x-wav"] },
  ".webp": { contentType: "image/webp" },
  ".xlsx": { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", aliases: ["application/zip"] },
};

export async function stageNotionAttachmentBlobs(
  workspace: WorkspaceData,
  files: StagedNotionImportFile[],
  persist: (records: AttachmentBlobRecord[]) => Promise<void>,
): Promise<AttachmentStageSummary> {
  const filesByPath = new Map(files.map((file) => [file.path.trim(), file]));
  const records: AttachmentBlobRecord[] = [];
  const pendingDocs: PendingDocStage[] = [];
  let skippedCount = 0;
  let unavailableCount = 0;
  let rejectedCount = 0;
  const warnings: string[] = [];

  for (const project of workspace.projects) {
    for (const doc of project.docs) {
      if (doc.type !== "ASSET" || !doc.sourcePath || doc.attachmentStatus !== "metadata_only") continue;

      const file = filesByPath.get(doc.sourcePath);
      if (!file?.readBlob) {
        skippedCount += 1;
        unavailableCount += 1;
        continue;
      }

      const blob = await file.readBlob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const validation = validateAttachmentBlob(file, doc, blob, bytes);
      if (!validation.ok) {
        skippedCount += 1;
        rejectedCount += 1;
        continue;
      }
      const sha256 = await sha256Bytes(bytes);
      const stagedAt = new Date().toISOString();
      const storageKey = `attachment_${workspace.id}_${doc.id}_${sha256.slice(0, 16)}`;

      records.push({
        key: storageKey,
        workspaceId: workspace.id,
        projectId: project.id,
        docId: doc.id,
        name: doc.name,
        sourcePath: doc.sourcePath,
        sizeBytes: blob.size,
        contentType: validation.contentType,
        sha256,
        createdAt: stagedAt,
        blob,
      });
      pendingDocs.push({ doc, storageKey, sha256, stagedAt, contentType: validation.contentType });
    }
  }

  if (records.length > 0) {
    await persist(records);
    for (const item of pendingDocs) {
      item.doc.attachmentStatus = "staged_local";
      item.doc.attachmentStorageKey = item.storageKey;
      item.doc.attachmentSha256 = item.sha256;
      item.doc.attachmentStagedAt = item.stagedAt;
      item.doc.sourceContentType = item.contentType;
    }
  }

  if (unavailableCount > 0) {
    warnings.push(`${unavailableCount} imported attachments have metadata only; bytes were unavailable locally.`);
  }
  if (rejectedCount > 0) {
    warnings.push(`${rejectedCount} imported attachments failed local size, type, or file-signature validation and remain metadata only.`);
  }

  return {
    stagedCount: records.length,
    stagedBytes: records.reduce((total, record) => total + record.sizeBytes, 0),
    skippedCount,
    warnings,
  };
}

function validateAttachmentBlob(
  file: StagedNotionImportFile,
  doc: ProjectDoc,
  blob: Blob,
  bytes: Uint8Array,
): AttachmentValidation {
  const extension = fileExtension(doc.sourcePath ?? file.path);
  const type = ATTACHMENT_TYPES[extension];
  if (
    !type
    || blob.size <= 0
    || blob.size > MAX_STAGED_ATTACHMENT_BYTES
    || blob.size !== file.sizeBytes
    || blob.size !== doc.sourceSizeBytes
  ) {
    return { ok: false };
  }

  const allowedTypes = new Set([type.contentType, ...(type.aliases ?? []), "application/octet-stream"]);
  const reportedTypes = [file.contentType, doc.sourceContentType, blob.type]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
  if (reportedTypes.some((value) => !allowedTypes.has(value))) return { ok: false };
  if (!hasExpectedSignature(extension, bytes)) return { ok: false };

  return { ok: true, contentType: type.contentType };
}

function hasExpectedSignature(extension: string, bytes: Uint8Array): boolean {
  if (extension === ".png") return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (extension === ".jpg" || extension === ".jpeg") return startsWith(bytes, [0xff, 0xd8, 0xff]);
  if (extension === ".gif") return ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a";
  if (extension === ".pdf") return ascii(bytes, 0, 5) === "%PDF-";
  if (extension === ".webp") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP";
  if (extension === ".wav") return ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE";
  if (extension === ".aiff") {
    return ascii(bytes, 0, 4) === "FORM" && ["AIFF", "AIFC"].includes(ascii(bytes, 8, 4));
  }
  if (extension === ".tif" || extension === ".tiff") {
    return startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a]);
  }
  if ([".docx", ".pptx", ".xlsx"].includes(extension)) {
    return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])
      || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])
      || startsWith(bytes, [0x50, 0x4b, 0x07, 0x08]);
  }
  if (extension === ".doc" || extension === ".ppt") {
    return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  }
  if ([".m4a", ".mov", ".mp4"].includes(extension)) return ascii(bytes, 4, 4) === "ftyp";
  if (extension === ".heic") {
    return ascii(bytes, 4, 4) === "ftyp"
      && ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(ascii(bytes, 8, 4));
  }
  if (extension === ".mp3") {
    return ascii(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0);
  }
  if (extension === ".json") {
    try {
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      return true;
    } catch {
      return false;
    }
  }
  if (extension === ".svg") {
    try {
      const markup = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const rootMarkup = markup.replace(/^\uFEFF/, "").trimStart();
      return /^(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg(?:\s|>)/i.test(rootMarkup)
        && !/<script(?:\s|>)/i.test(markup)
        && !/<(?:foreignObject|iframe|object|embed)(?:\s|>)/i.test(markup)
        && !/\son[a-z]+\s*=/i.test(markup)
        && !/javascript\s*:/i.test(markup)
        && !/<!\s*(?:doctype|entity)/i.test(markup)
        && !/\s(?:(?:xlink:)?href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:text\/html)/i.test(markup)
        && !/url\(\s*["']?\s*(?:https?:|\/\/)/i.test(markup);
    } catch {
      return false;
    }
  }
  return extension === ".txt";
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

function fileExtension(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", copyBytesToArrayBuffer(bytes));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
