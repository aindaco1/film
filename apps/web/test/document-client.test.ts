import { describe, expect, it } from "vitest";
import { saveCanonicalDocumentMarkdown } from "../src/document-client";

describe("document client", () => {
  it("saves canonical Markdown with csrf and stale-version metadata", async () => {
    const request = {
      workspaceId: "workspace_acme",
      projectId: "proj_echoes",
      documentId: "doc_notes",
      markdownSnapshot: "# Notes",
      expectedUpdatedAt: "2026-07-09T00:00:00.000Z",
    };
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://worker.test/api/documents/markdown");
      expect(init).toMatchObject({
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-film-csrf": "csrf_document_test",
        },
        body: JSON.stringify(request),
      });
      return new Response(JSON.stringify({
        ok: true,
        document: {
          id: "doc_notes",
          projectId: "proj_echoes",
          markdownLength: 7,
          markdownBytes: 7,
          markdownSha256: "a".repeat(64),
          updatedAt: "2026-07-09T00:00:01.000Z",
        },
      }), { status: 200 });
    };

    const result = await saveCanonicalDocumentMarkdown(
      "https://worker.test",
      "csrf_document_test",
      request,
      fetcher,
    );

    expect(result.updatedAt).toBe("2026-07-09T00:00:01.000Z");
  });

  it("surfaces stale document conflicts", async () => {
    const fetcher: typeof fetch = async () => new Response(
      JSON.stringify({ error: "stale_document_version" }),
      { status: 409 },
    );

    await expect(saveCanonicalDocumentMarkdown(
      "https://worker.test",
      "csrf_document_test",
      {
        workspaceId: "workspace_acme",
        projectId: "proj_echoes",
        documentId: "doc_notes",
        markdownSnapshot: "# Notes",
        expectedUpdatedAt: "2026-07-09T00:00:00.000Z",
      },
      fetcher,
    )).rejects.toThrow("stale_document_version");
  });
});
