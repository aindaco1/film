import { describe, expect, it, vi } from "vitest";
import { commitNotionCoreRecords } from "../src/notion-core-client";

describe("Notion core import client", () => {
  it("sends bounded core records with credentials and returns count-only state", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as { records: unknown[] };
      expect(init).toMatchObject({ method: "POST", credentials: "include" });
      expect((init?.headers as Record<string, string>)["x-film-csrf"]).toBe("csrf_test_value");
      expect(payload.records).toHaveLength(1);
      return new Response(JSON.stringify({
        persistence: "d1_notion_core_import",
        auditPersistence: "d1_audit_events",
        destructiveWrite: true,
        committed: [{ id: "notion_task_123", kind: "task" }],
        idempotent: [],
        updatePreview: [],
        rejected: [],
      }), { status: 200, headers: { "content-type": "application/json" } });
    });

    const result = await commitNotionCoreRecords(
      "https://worker.test",
      "csrf_test_value",
      {
        workspaceId: "workspace_acme",
        projectId: "project_big_sword",
        records: [{
          kind: "task",
          sourcePath: "Tasks.csv",
          sourceKey: "row:0",
          projectTitle: "Big Sword",
          title: "Lock picture",
          due: "Jul 30",
          status: "pending",
        }],
      },
      fetcher as typeof fetch,
    );

    expect(result).toEqual({
      committedCount: 1,
      idempotentCount: 0,
      updatePreviewCount: 0,
      rejectedCount: 0,
      persistence: "d1_notion_core_import",
      auditPersistence: "d1_audit_events",
      destructiveWrite: true,
      truncated: false,
    });
    expect(JSON.stringify(result)).not.toContain("Tasks.csv");
  });

  it("returns an empty summary without a request and preserves fail-closed errors", async () => {
    const fetcher = vi.fn();
    const empty = await commitNotionCoreRecords("https://worker.test", "csrf", {
      workspaceId: "workspace_acme",
      projectId: "project_big_sword",
      records: [],
    }, fetcher as typeof fetch);
    expect(empty.persistence).toBe("not_applicable");
    expect(fetcher).not.toHaveBeenCalled();

    await expect(commitNotionCoreRecords("https://worker.test", "csrf", {
      workspaceId: "workspace_acme",
      projectId: "project_big_sword",
      records: [{
        kind: "task",
        sourcePath: "Tasks.csv",
        sourceKey: "row:0",
        projectTitle: "Big Sword",
        title: "Lock picture",
        due: "Jul 30",
        status: "pending",
      }],
    }, (async () => new Response(JSON.stringify({ error: "notion_core_import_storage_unavailable" }), {
      status: 503,
      headers: { "content-type": "application/json" },
    })) as typeof fetch)).rejects.toThrow("notion_core_import_storage_unavailable");
  });
});
