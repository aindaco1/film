import { describe, expect, it, vi } from "vitest";
import { GOOGLE_DRIVE_METADATA_FIELDS, listGoogleDriveFolder, readSelectedGoogleDriveFiles } from "../src/google-drive";

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
    const requestUrl = new URL(String(requests[0]?.url));
    expect(requestUrl.searchParams.get("fields")).toBe(`nextPageToken,files(${GOOGLE_DRIVE_METADATA_FIELDS})`);
    expect(requestUrl.searchParams.get("q")).toBe("'drive_folder_12345' in parents and trashed = false");
    expect(requestUrl.searchParams.has("alt")).toBe(false);
    expect(requests[0]?.init?.method).toBe("GET");
    expect(requests[0]?.init?.redirect).toBe("error");
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

  it.each([12, "", "x".repeat(2049)])("rejects malformed pagination rather than claiming a complete folder", async nextPageToken => {
    await expect(listGoogleDriveFolder("token", "drive_folder_12345", null,
      async () => Response.json({ files: [], nextPageToken })))
      .rejects.toThrow("google_drive_invalid_response");
  });

  it("validates folder and cursor before making a provider request", async () => {
    const fetcher = vi.fn();
    for (const [folder, cursor] of [["folder' or trashed = true", null], ["drive_folder_12345", "x".repeat(2049)]]) {
      await expect(listGoogleDriveFolder("token", folder!, cursor, fetcher))
        .rejects.toThrow("invalid_google_drive_manifest_request");
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("selected-file feasibility adapter (not a live Picker integration)", () => {
  const metadata = (id: string) => ({ id, name: "Selected reference", mimeType: "text/plain" });

  it("reads only deduplicated, explicitly selected IDs and projects the existing metadata contract", async () => {
    const ids = ["drive_file_12345", "drive_file_67890", "drive_file_12345"];
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const id = new URL(String(input)).pathname.split("/").at(-1)!;
      return Response.json({ ...metadata(id), description: "not retained", content: "not retained" });
    });
    const files = await readSelectedGoogleDriveFiles("fixture-token", ids, fetcher);
    expect(files.map(file => file.id)).toEqual(ids.slice(0, 2));
    expect(ids).toHaveLength(3);
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [input, init] of fetcher.mock.calls as unknown as [URL, RequestInit][]) {
      expect(input.origin).toBe("https://www.googleapis.com");
      expect(input.searchParams.get("fields")).toBe(GOOGLE_DRIVE_METADATA_FIELDS);
      expect([...input.searchParams.keys()].sort()).toEqual(["fields", "supportsAllDrives"]);
      expect(init).toMatchObject({ method: "GET", redirect: "error" });
      expect(init.body).toBeUndefined();
    }
    expect(JSON.stringify(files)).not.toContain("not retained");
  });

  it("does not enumerate children when a folder itself is selected", async () => {
    const fetcher = vi.fn(async () => Response.json({ ...metadata("drive_folder_12345"), mimeType: "application/vnd.google-apps.folder" }));
    const result = await readSelectedGoogleDriveFiles("token", ["drive_folder_12345"], fetcher);
    expect(result).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("makes no request on cancellation or invalid/oversized selections", async () => {
    const fetcher = vi.fn();
    await expect(readSelectedGoogleDriveFiles("token", [], fetcher)).resolves.toEqual([]);
    for (const ids of [["bad/id?alt=media"], Array.from({ length: 21 }, (_, i) => `drive_file_${i}`)]) {
      await expect(readSelectedGoogleDriveFiles("token", ids, fetcher)).rejects.toThrow("invalid_google_drive_selection");
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 429, 500])("fails closed for provider HTTP %s without partial success", async status => {
    const fetcher = vi.fn(async () => new Response(null, { status }));
    await expect(readSelectedGoogleDriveFiles("token", ["drive_file_12345", "drive_file_67890"], fetcher))
      .rejects.toThrow(status === 401 || status === 403 ? "google_drive_access_denied" : "google_drive_request_failed");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    metadata("other_file_12345"),
    { ...metadata("drive_file_12345"), name: "" },
    null,
  ])("rejects mismatched or malformed metadata", async payload => {
    await expect(readSelectedGoogleDriveFiles("token", ["drive_file_12345"], async () => Response.json(payload)))
      .rejects.toThrow("google_drive_invalid_response");
  });

  it("redacts invalid JSON and never follows redirects", async () => {
    await expect(readSelectedGoogleDriveFiles("token", ["drive_file_12345"], async () => new Response("provider secret detail")))
      .rejects.toThrow("google_drive_invalid_response");
    await expect(readSelectedGoogleDriveFiles("token", ["drive_file_12345"], async () => new Response(null, { status: 302, headers: { location: "https://example.com" } })))
      .rejects.toThrow("google_drive_request_failed");
  });
});
