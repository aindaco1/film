import { describe, expect, it, vi } from "vitest";
import { listGoogleDriveFolder } from "../src/google-drive";

describe("google drive", () => {
  it("returns a bounded normalized folder manifest", async () => {
    const requests: Array<{ url: string | URL | Request; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url, init });
      return Response.json({
        nextPageToken: "next_page_token",
        files: [
          {
            id: "drive_file_12345",
            name: "Production bible",
            mimeType: "application/vnd.google-apps.document",
            modifiedTime: "2026-07-09T20:00:00.000Z",
            size: "2048",
            webViewLink: "https://docs.google.com/document/d/drive_file_12345/edit",
          },
        ],
      });
    });

    const result = await listGoogleDriveFolder(
      "private-access-token",
      "drive_folder_12345",
      null,
      fetcher as typeof fetch,
    );
    expect(result).toEqual({
      rootFolderId: "drive_folder_12345",
      files: [{
        id: "drive_file_12345",
        name: "Production bible",
        mimeType: "application/vnd.google-apps.document",
        modifiedTime: "2026-07-09T20:00:00.000Z",
        sizeBytes: 2048,
        webViewLink: "https://docs.google.com/document/d/drive_file_12345/edit",
      }],
      nextPageToken: "next_page_token",
      truncated: true,
    });
    expect(String(requests[0]?.url)).toContain("www.googleapis.com/drive/v3/files");
    expect(String(requests[0]?.url)).toContain("pageSize=100");
    expect((requests[0]?.init?.headers as Record<string, string>).authorization).toBe("Bearer private-access-token");
  });

  it("rejects provider errors and malformed file metadata", async () => {
    await expect(listGoogleDriveFolder(
      "token",
      "drive_folder_12345",
      null,
      async () => new Response(null, { status: 401 }),
    )).rejects.toThrow("google_drive_access_denied");
    await expect(listGoogleDriveFolder(
      "token",
      "drive_folder_12345",
      null,
      async () => Response.json({ files: [{ id: "short", name: "Bad", mimeType: "text/plain" }] }),
    )).rejects.toThrow("google_drive_invalid_response");
  });

  it("drops unsafe view links", async () => {
    const result = await listGoogleDriveFolder(
      "token",
      "drive_folder_12345",
      null,
      async () => Response.json({
        files: [{
          id: "drive_file_12345",
          name: "Safe metadata",
          mimeType: "text/plain",
          webViewLink: "https://example.com/private",
        }],
      }),
    );
    expect(result.files[0]?.webViewLink).toBeNull();
  });
});
