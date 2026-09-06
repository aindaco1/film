export const GOOGLE_SCOPE_PREFIX = "https://www.googleapis.com/auth/";
export const GOOGLE_DRIVE_METADATA_SCOPE = `${GOOGLE_SCOPE_PREFIX}drive.metadata.readonly`;
export const GOOGLE_DRIVE_READ_SCOPE = `${GOOGLE_SCOPE_PREFIX}drive.readonly`;
export const GOOGLE_CALENDAR_READ_SCOPE = `${GOOGLE_SCOPE_PREFIX}calendar.events.readonly`;

export type GoogleOAuthRequestedCapabilities = {
  includeDocsExport?: boolean;
  includeCalendarSync?: boolean;
};

export function googleOAuthScopes(capabilities: GoogleOAuthRequestedCapabilities): string[] {
  return [
    capabilities.includeDocsExport ? GOOGLE_DRIVE_READ_SCOPE : GOOGLE_DRIVE_METADATA_SCOPE,
    ...(capabilities.includeCalendarSync ? [GOOGLE_CALENDAR_READ_SCOPE] : []),
  ];
}

export function hasGoogleFolderMetadataScope(scopes: readonly string[]): boolean {
  return scopes.includes(GOOGLE_DRIVE_METADATA_SCOPE) || scopes.includes(GOOGLE_DRIVE_READ_SCOPE);
}

export type GoogleDriveManifestFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  sizeBytes: number | null;
  webViewLink: string | null;
};

export type GoogleDriveManifest = {
  rootFolderId: string;
  files: GoogleDriveManifestFile[];
  nextPageToken: string | null;
  truncated: boolean;
};
