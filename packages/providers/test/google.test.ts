import { describe, expect, it } from "vitest";
import {
  createGoogleDriveSyncDryRunStatus,
  googleOAuthScopes,
  hasGoogleFolderMetadataScope,
  GOOGLE_SCOPE_PREFIX,
  GOOGLE_DRIVE_METADATA_SCOPE,
  GOOGLE_DRIVE_READ_SCOPE,
  GOOGLE_CALENDAR_READ_SCOPE,
} from "../src/index";

describe("shared Google access contract", () => {
  it("defaults to metadata without file bodies, write access, or Calendar", () => {
    expect(googleOAuthScopes({})).toEqual([GOOGLE_DRIVE_METADATA_SCOPE]);
  });

  it.each([
    [false, false, [GOOGLE_DRIVE_METADATA_SCOPE]],
    [true, false, [GOOGLE_DRIVE_READ_SCOPE]],
    [false, true, [GOOGLE_DRIVE_METADATA_SCOPE, GOOGLE_CALENDAR_READ_SCOPE]],
    [true, true, [GOOGLE_DRIVE_READ_SCOPE, GOOGLE_CALENDAR_READ_SCOPE]],
  ] as const)("keeps planner and consent aligned (Docs %s, Calendar %s)", (includeDocsExport, includeCalendarSync, expected) => {
    const capabilities = { includeDocsExport, includeCalendarSync };
    const scopes = googleOAuthScopes(capabilities);
    expect(scopes).toEqual(expected);
    expect(createGoogleDriveSyncDryRunStatus({ workspaceId: "workspace_test", ...capabilities }).requiredScopes)
      .toEqual(scopes.map(scope => scope.slice(GOOGLE_SCOPE_PREFIX.length)));
  });

  it("requires exact Google scopes and never mistakes per-file access for folder access", () => {
    expect(hasGoogleFolderMetadataScope([GOOGLE_DRIVE_METADATA_SCOPE])).toBe(true);
    expect(hasGoogleFolderMetadataScope([GOOGLE_DRIVE_READ_SCOPE])).toBe(true);
    for (const scopes of [[], [`${GOOGLE_SCOPE_PREFIX}drive.file`], ["https://example.com/drive.readonly"], ["drive.metadata.readonly"]]) {
      expect(hasGoogleFolderMetadataScope(scopes)).toBe(false);
    }
  });
});
