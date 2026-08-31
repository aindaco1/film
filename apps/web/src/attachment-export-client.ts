import { openNotionZip, readZipEntryBytes } from "./import-preview";
import { copyBytesToArrayBuffer } from "./binary-buffer";
import type {
  RestoreAttachmentPackageManifestObjectRequest,
  RestoreAttachmentPackageManifestRequest,
} from "./restore-client";
import { parseWorkerJsonResponse as parseJsonResponse, type Fetcher } from "./worker-client";

type AttachmentExportResponseError = {
  error?: string;
};

export type StoredAttachmentExportObject = {
  docId: string;
  objectKey: string;
  name: string;
  sourcePath: string | null;
  sizeBytes: number;
  contentType: string;
  sha256: string;
  committedAt: string | null;
};

export type StoredAttachmentExportManifest = {
  dryRun: true;
  persistence: string;
  auditPersistence?: string;
  workspaceId: string;
  exportPolicy: "stored_r2_manifest_only";
  offset: number;
  nextOffset: number | null;
  rowCount: number;
  truncated: boolean;
  objects: StoredAttachmentExportObject[];
};

export type StoredAttachmentPackageDryRun = {
  dryRun: true;
  persistence: string;
  auditPersistence?: string;
  workspaceId: string;
  packagePolicy: "stored_r2_attachment_package_plan";
  packageMode: "blocked_dry_run" | "zip_download_ready";
  packagePlanId: string | null;
  packageToken: string | null;
  packageTokenExpiresAt: string | null;
  packagePlanPersistence: string;
  byteSource: "r2_binding_available" | "r2_binding_missing";
  offset: number;
  nextOffset: number | null;
  objectCount: number;
  totalSizeBytes: number;
  truncated: boolean;
  canPackage: boolean;
  destructiveWrite: boolean;
  blockers: string[];
  objects: Array<{
    docId: string;
    objectKey: string;
    name: string;
    sizeBytes: number;
    sha256: string;
  }>;
};

export type StoredAttachmentDownload = {
  blob: Blob;
  docId: string | null;
  sha256: string | null;
  filename: string | null;
};

export type StoredAttachmentPackageDownload = {
  blob: Blob;
  filename: string | null;
  objectCount: number;
  totalSourceBytes: number;
  sha256: string | null;
  auditPersistence: string | null;
};

export type VerifiedAttachmentPackageObject = {
  manifest: RestoreAttachmentPackageManifestObjectRequest;
  blob: Blob;
};

const MAX_ATTACHMENT_PACKAGE_MANIFEST_BYTES = 512 * 1024;
const MAX_ATTACHMENT_PACKAGE_MANIFEST_OBJECTS = 1000;

export async function exportStoredAttachmentManifest(
  workerUrl: string,
  workspaceId: string,
  csrfToken: string,
  limit = 100,
  offset = 0,
  fetcher: Fetcher = fetch,
): Promise<StoredAttachmentExportManifest> {
  return parseJsonResponse<StoredAttachmentExportManifest>(
    await fetcher(`${workerUrl}/api/attachments/r2/export-manifest`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId, limit, offset }),
    }),
    "Attachment export manifest failed",
  );
}

export async function createStoredAttachmentPackageDryRun(
  workerUrl: string,
  workspaceId: string,
  csrfToken: string,
  limit = 1000,
  objectKeys: string[] = [],
  offset = 0,
  fetcher: Fetcher = fetch,
): Promise<StoredAttachmentPackageDryRun> {
  return parseJsonResponse<StoredAttachmentPackageDryRun>(
    await fetcher(`${workerUrl}/api/attachments/r2/export-package-dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId, limit, objectKeys, offset }),
    }),
    "Attachment package dry run failed",
  );
}

export async function downloadStoredAttachmentObject(
  workerUrl: string,
  workspaceId: string,
  objectKey: string,
  csrfToken: string,
  fetcher: Fetcher = fetch,
): Promise<StoredAttachmentDownload> {
  const response = await fetcher(
    `${workerUrl}/api/attachments/r2/object?workspaceId=${encodeURIComponent(workspaceId)}&objectKey=${encodeURIComponent(objectKey)}`,
    {
      method: "GET",
      credentials: "include",
      headers: { "x-film-csrf": csrfToken },
    },
  );
  if (!response.ok) {
    const body = (await response.json()) as AttachmentExportResponseError;
    throw new Error(body.error ?? "Attachment download failed");
  }

  return {
    blob: await response.blob(),
    docId: response.headers.get("x-film-doc-id"),
    sha256: response.headers.get("x-film-sha256"),
    filename: filenameFromContentDisposition(response.headers.get("content-disposition")),
  };
}

export async function downloadStoredAttachmentPackage(
  workerUrl: string,
  workspaceId: string,
  csrfToken: string,
  limit = 1000,
  objectKeys: string[] = [],
  packagePlanId = "",
  packageToken = "",
  fetcher: Fetcher = fetch,
): Promise<StoredAttachmentPackageDownload> {
  const response = await fetcher(
    `${workerUrl}/api/attachments/r2/package`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": csrfToken,
      },
      body: JSON.stringify({ workspaceId, limit, objectKeys, packagePlanId, packageToken }),
    },
  );
  if (!response.ok) {
    const body = (await response.json()) as AttachmentExportResponseError;
    throw new Error(body.error ?? "Attachment package download failed");
  }

  return {
    blob: await response.blob(),
    filename: filenameFromContentDisposition(response.headers.get("content-disposition")),
    objectCount: Number(response.headers.get("x-film-package-object-count") ?? "0"),
    totalSourceBytes: Number(response.headers.get("x-film-package-total-source-bytes") ?? "0"),
    sha256: response.headers.get("x-film-package-sha256"),
    auditPersistence: response.headers.get("x-film-audit-persistence"),
  };
}

export async function readStoredAttachmentPackageManifest(blob: Blob): Promise<RestoreAttachmentPackageManifestRequest> {
  const zip = await openNotionZip(new File([blob], "film-attachments.zip", { type: blob.type || "application/zip" }));
  const manifestEntry = zip.entries.find((entry) => entry.path === "manifest.json");
  if (!manifestEntry) {
    throw new Error("Attachment package manifest.json is missing.");
  }
  if (manifestEntry.sizeBytes > MAX_ATTACHMENT_PACKAGE_MANIFEST_BYTES) {
    throw new Error("Attachment package manifest is larger than the local verification limit.");
  }

  const manifestBytes = await readZipEntryBytes(zip.data, manifestEntry);
  let manifest: unknown;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  } catch {
    throw new Error("Attachment package manifest is not valid JSON.");
  }

  return normalizeAttachmentPackageManifest(manifest);
}

export async function readStoredAttachmentPackageObjects(
  blob: Blob,
  manifest: RestoreAttachmentPackageManifestRequest,
): Promise<VerifiedAttachmentPackageObject[]> {
  const zip = await openNotionZip(new File([blob], "film-attachments.zip", { type: blob.type || "application/zip" }));
  const entriesByPath = new Map(zip.entries.map((entry) => [entry.path, entry]));
  const verified: VerifiedAttachmentPackageObject[] = [];

  for (const object of manifest.objects) {
    const entry = entriesByPath.get(object.path);
    if (!entry) throw new Error(`Attachment package entry is missing for ${object.name}.`);
    if (entry.sizeBytes !== object.sizeBytes) {
      throw new Error(`Attachment package entry size does not match for ${object.name}.`);
    }
    const bytes = await readZipEntryBytes(zip.data, entry);
    if (bytes.byteLength !== object.sizeBytes) {
      throw new Error(`Attachment package entry bytes do not match for ${object.name}.`);
    }
    const sha256 = await sha256HexBytes(bytes);
    if (sha256 !== object.sha256.toLowerCase()) {
      throw new Error(`Attachment package entry hash does not match for ${object.name}.`);
    }
    verified.push({
      manifest: object,
      blob: new Blob([copyBytesToArrayBuffer(bytes)], { type: object.contentType ?? "application/octet-stream" }),
    });
  }

  return verified;
}

function filenameFromContentDisposition(value: string | null): string | null {
  const match = value?.match(/filename="([^"]+)"/);
  return match?.[1] ?? null;
}

function normalizeAttachmentPackageManifest(value: unknown): RestoreAttachmentPackageManifestRequest {
  if (!isRecord(value)) {
    throw new Error("Attachment package manifest must be a JSON object.");
  }
  if (value.format !== "film.attachment-package" || value.version !== 1) {
    throw new Error("Attachment package manifest format is not supported.");
  }
  const workspaceId = requireBoundedString(value.workspaceId, "workspaceId", 128);
  const objectCount = requireNonNegativeInteger(value.objectCount, "objectCount");
  const totalSourceBytes = requireNonNegativeInteger(value.totalSourceBytes, "totalSourceBytes");
  if (objectCount > MAX_ATTACHMENT_PACKAGE_MANIFEST_OBJECTS) {
    throw new Error("Attachment package manifest has too many objects for browser verification.");
  }
  if (!Array.isArray(value.objects) || value.objects.length !== objectCount) {
    throw new Error("Attachment package manifest object count does not match its object list.");
  }

  const objects = value.objects.map((object, index) => normalizeAttachmentPackageManifestObject(object, index));
  return {
    format: "film.attachment-package",
    version: 1,
    workspaceId,
    ...(typeof value.createdAt === "string" ? { createdAt: value.createdAt.slice(0, 64) } : {}),
    objectCount,
    totalSourceBytes,
    objects,
  };
}

function normalizeAttachmentPackageManifestObject(
  value: unknown,
  index: number,
): RestoreAttachmentPackageManifestObjectRequest {
  if (!isRecord(value)) {
    throw new Error(`Attachment package manifest object ${index + 1} must be a JSON object.`);
  }
  const sha256 = requireBoundedString(value.sha256, `objects[${index}].sha256`, 64);
  if (!/^[a-f0-9]{64}$/i.test(sha256)) {
    throw new Error(`Attachment package manifest object ${index + 1} has an invalid sha256.`);
  }

  return {
    path: requireSafePackagePath(value.path, `objects[${index}].path`),
    docId: requireBoundedString(value.docId, `objects[${index}].docId`, 160),
    objectKey: requireBoundedString(value.objectKey, `objects[${index}].objectKey`, 512),
    name: requireBoundedString(value.name, `objects[${index}].name`, 255),
    sourcePath: normalizeNullableString(value.sourcePath, 512),
    sizeBytes: requireNonNegativeInteger(value.sizeBytes, `objects[${index}].sizeBytes`),
    contentType: normalizeNullableString(value.contentType, 160),
    sha256: sha256.toLowerCase(),
    committedAt: normalizeNullableString(value.committedAt, 64),
  };
}

function requireSafePackagePath(value: unknown, fieldName: string): string {
  const path = requireBoundedString(value, fieldName, 512);
  if (path.includes("\0") || path.includes("\\") || path.startsWith("/") || /^[a-zA-Z]:/.test(path)) {
    throw new Error(`${fieldName} must be a relative ZIP path.`);
  }
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`${fieldName} must be a safe relative ZIP path.`);
  }
  return path;
}

function requireBoundedString(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Error(`Attachment package manifest ${fieldName} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new Error(`Attachment package manifest ${fieldName} is outside the allowed length.`);
  }
  return trimmed;
}

function normalizeNullableString(value: unknown, maxLength: number): string | null {
  if (value === null || typeof value === "undefined") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function requireNonNegativeInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Attachment package manifest ${fieldName} must be a non-negative integer.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
