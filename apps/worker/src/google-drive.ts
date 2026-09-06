import type { GoogleDriveManifest, GoogleDriveManifestFile } from "@film/providers";
export type { GoogleDriveManifest, GoogleDriveManifestFile } from "@film/providers";

export const GOOGLE_DRIVE_MANIFEST_PAGE_SIZE = 100;
export const GOOGLE_DRIVE_METADATA_FIELDS = "id,name,mimeType,modifiedTime,size,webViewLink";

export async function listGoogleDriveFolder(
  accessToken: string,
  rootFolderId: string,
  pageToken: string | null,
  fetcher: typeof fetch = fetch,
): Promise<GoogleDriveManifest> {
  if (!isGoogleDriveId(rootFolderId) || (pageToken !== null && (!pageToken || pageToken.length > 2_048))) {
    throw new Error("invalid_google_drive_manifest_request");
  }
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", `'${rootFolderId}' in parents and trashed = false`);
  url.searchParams.set("pageSize", String(GOOGLE_DRIVE_MANIFEST_PAGE_SIZE));
  url.searchParams.set("spaces", "drive");
  url.searchParams.set("orderBy", "folder,name_natural");
  url.searchParams.set("includeItemsFromAllDrives", "true");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set(
    "fields",
    `nextPageToken,files(${GOOGLE_DRIVE_METADATA_FIELDS})`,
  );
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const payload = await readGoogleDriveMetadata(url, accessToken, fetcher);
  if (!isObject(payload) || !Array.isArray(payload.files) || payload.files.length > GOOGLE_DRIVE_MANIFEST_PAGE_SIZE) {
    throw new Error("google_drive_invalid_response");
  }
  const files = payload.files.map(normalizeDriveFile);
  if (files.some((file) => file === null)) {
    throw new Error("google_drive_invalid_response");
  }
  if (payload.nextPageToken !== undefined && payload.nextPageToken !== null
    && (typeof payload.nextPageToken !== "string" || !payload.nextPageToken || payload.nextPageToken.length > 2_048)) {
    throw new Error("google_drive_invalid_response");
  }
  const nextPageToken = typeof payload.nextPageToken === "string" ? payload.nextPageToken : null;
  return {
    rootFolderId,
    files: files as GoogleDriveManifestFile[],
    nextPageToken,
    truncated: Boolean(nextPageToken),
  };
}

// Feasibility adapter only: no production route or Picker token endpoint is enabled.
// A selected folder does not authorize reading its unselected children.
export async function readSelectedGoogleDriveFiles(
  accessToken: string,
  selectedIds: readonly string[],
  fetcher: typeof fetch = fetch,
): Promise<GoogleDriveManifestFile[]> {
  if (selectedIds.length > 20 || selectedIds.some(id => !isGoogleDriveId(id))) {
    throw new Error("invalid_google_drive_selection");
  }
  const files: GoogleDriveManifestFile[] = [];
  for (const id of new Set(selectedIds)) {
    const url = new URL(`https://www.googleapis.com/drive/v3/files/${id}`);
    url.searchParams.set("fields", GOOGLE_DRIVE_METADATA_FIELDS);
    url.searchParams.set("supportsAllDrives", "true");
    const file = normalizeDriveFile(await readGoogleDriveMetadata(url, accessToken, fetcher));
    if (!file || file.id !== id) throw new Error("google_drive_invalid_response");
    files.push(file);
  }
  return files;
}

async function readGoogleDriveMetadata(url: URL, accessToken: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(url, {
    method: "GET",
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403
      ? "google_drive_access_denied" : "google_drive_request_failed");
  }
  try {
    return await response.json() as unknown;
  } catch {
    throw new Error("google_drive_invalid_response");
  }
}

function isGoogleDriveId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,256}$/.test(value);
}

function normalizeDriveFile(value: unknown): GoogleDriveManifestFile | null {
  if (!isObject(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const mimeType = typeof value.mimeType === "string" ? value.mimeType.trim() : "";
  if (
    !isGoogleDriveId(id)
    || !name
    || name.length > 512
    || !mimeType
    || mimeType.length > 255
  ) {
    return null;
  }
  const sizeBytes = parseSize(value.size);
  const modifiedTime = typeof value.modifiedTime === "string" && !Number.isNaN(Date.parse(value.modifiedTime))
    ? value.modifiedTime
    : null;
  const webViewLink = safeWebViewLink(value.webViewLink);
  return { id, name, mimeType, modifiedTime, sizeBytes, webViewLink };
}

function parseSize(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function safeWebViewLink(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "drive.google.com" || url.hostname.endsWith(".google.com"))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
