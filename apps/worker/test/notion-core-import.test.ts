import { describe, expect, it } from "vitest";
import {
  commitNotionCoreImport,
  normalizeNotionCoreRecord,
  notionCoreRecordId,
} from "../src/notion-core-import";

const records = [
  {
    kind: "task",
    sourcePath: "Tasks.csv",
    sourceKey: "row:0",
    projectTitle: "Big Sword",
    title: "Lock picture",
    due: "Jul 30",
    status: "pending",
  },
  {
    kind: "document",
    sourcePath: "Big Sword/Treatment.md",
    sourceKey: "page",
    projectTitle: "Big Sword",
    title: "Treatment.md",
    documentType: "markdown",
    markdownSnapshot: "# Treatment\n\nPrivate production notes.",
  },
  {
    kind: "person",
    sourcePath: "Point People.csv",
    sourceKey: "row:0",
    projectTitle: "Big Sword",
    displayName: "Maya Chen",
    role: "Producer",
  },
  {
    kind: "equipment",
    sourcePath: "Equipment.csv",
    sourceKey: "row:0",
    projectTitle: "Big Sword",
    name: "Camera Kit",
    status: "Held",
  },
  {
    kind: "expense",
    sourcePath: "Expenses.csv",
    sourceKey: "row:0",
    projectTitle: "Big Sword",
    category: "Locations",
    spentCents: 120_000,
    budgetCents: 200_000,
  },
] as const;

describe("Notion core import", () => {
  it("derives stable project-scoped ids and rejects unsafe or oversized records", async () => {
    const first = await notionCoreRecordId("workspace_acme", "project_big_sword", "task", "Tasks.csv", "row:0");
    const second = await notionCoreRecordId("workspace_acme", "project_big_sword", "task", "Tasks.csv", "row:0");
    const otherProject = await notionCoreRecordId("workspace_acme", "project_other", "task", "Tasks.csv", "row:0");

    expect(first).toBe(second);
    expect(first).toMatch(/^notion_task_[a-f0-9]{32}$/);
    expect(otherProject).not.toBe(first);
    await expect(normalizeNotionCoreRecord("workspace_acme", "project_big_sword", {
      ...records[0],
      sourcePath: "../private.csv",
    })).resolves.toBeNull();
    await expect(normalizeNotionCoreRecord("workspace_acme", "project_big_sword", {
      ...records[1],
      markdownSnapshot: "x".repeat(64 * 1024 + 1),
    })).resolves.toBeNull();
    await expect(normalizeNotionCoreRecord("workspace_acme", "project_big_sword", {
      ...records[1],
      documentType: "uploaded_file",
    })).resolves.toBeNull();
  });

  it("commits every core kind atomically, replays idempotently, and returns field-name-only previews", async () => {
    const memory = createMemoryD1();
    const first = await commitNotionCoreImport(
      memory.db,
      "workspace_acme",
      "project_big_sword",
      "member_owner",
      [...records],
    );

    expect(first).toMatchObject({
      persistence: "d1_notion_core_import",
      auditPersistence: "d1_audit_events",
      destructiveWrite: true,
      rejected: [],
    });
    expect(first.committed).toHaveLength(5);
    expect(memory.rows.size).toBe(5);
    expect(memory.auditCount).toBe(1);
    expect(JSON.stringify(first)).not.toContain("Private production notes");
    expect(JSON.stringify(first)).not.toContain("Big Sword/Treatment.md");

    const second = await commitNotionCoreImport(
      memory.db,
      "workspace_acme",
      "project_big_sword",
      "member_owner",
      [...records],
    );
    expect(second.destructiveWrite).toBe(false);
    expect(second.committed).toEqual([]);
    expect(second.idempotent).toHaveLength(5);

    const changed = await commitNotionCoreImport(
      memory.db,
      "workspace_acme",
      "project_big_sword",
      "member_owner",
      [{ ...records[0], title: "Lock final picture" }],
    );
    expect(changed.destructiveWrite).toBe(false);
    expect(changed.updatePreview).toEqual([
      expect.objectContaining({ kind: "task", fieldKeys: ["title"] }),
    ]);
    expect([...memory.rows.values()].find((row) => row.kind === "task")?.title).toBe("Lock picture");

    const mismatchedProject = await commitNotionCoreImport(
      memory.db,
      "workspace_acme",
      "project_big_sword",
      "member_owner",
      [{ ...records[0], projectTitle: "Another Film", sourceKey: "row:1" }],
    );
    expect(mismatchedProject.committed).toEqual([]);
    expect(mismatchedProject.rejected).toEqual([{ index: 0, reason: "project_title_mismatch" }]);
  });

  it("fails closed before writes when the D1 batch is unavailable", async () => {
    const memory = createMemoryD1(true);
    const result = await commitNotionCoreImport(
      memory.db,
      "workspace_acme",
      "project_big_sword",
      "member_owner",
      [...records],
    );

    expect(result).toMatchObject({
      error: "notion_core_import_storage_unavailable",
      errorStatus: 503,
      persistence: "d1_unavailable_dry_run",
      destructiveWrite: false,
    });
    expect(memory.rows.size).toBe(0);
    expect(memory.auditCount).toBe(0);
  });
});

function createMemoryD1(failBatch = false): {
  db: D1Database;
  rows: Map<string, Record<string, unknown>>;
  auditCount: number;
} {
  const rows = new Map<string, Record<string, unknown>>();
  const state = { auditCount: 0 };

  const db = {
    prepare(sql: string) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      return {
        bind(...values: unknown[]) {
          return {
            async first<T>() {
              if (normalized.includes("FROM projects") && normalized.includes("WHERE id = ?")) {
                return { id: "project_big_sword", workspace_id: "workspace_acme", title: "Big Sword" } as T;
              }
              const row = rows.get(String(values[0]));
              if (!row) return null;
              return rowForQuery(normalized, row) as T;
            },
            async run() {
              if (normalized.startsWith("INSERT INTO tasks")) {
                const [id, workspaceId, projectId, title, status, dueAt] = values;
                rows.set(String(id), { kind: "task", id, workspace_id: workspaceId, project_id: projectId, title, status, due_at: dueAt });
              } else if (normalized.startsWith("INSERT INTO documents")) {
                const [id, workspaceId, projectId, title, documentType, markdownSnapshot] = values;
                rows.set(String(id), { kind: "document", id, workspace_id: workspaceId, project_id: projectId, title, document_type: documentType, markdown_snapshot: markdownSnapshot });
              } else if (normalized.startsWith("INSERT INTO people")) {
                const [id, workspaceId, displayName, roleTags] = values;
                rows.set(String(id), { kind: "person", id, workspace_id: workspaceId, project_id: null, display_name: displayName, role_tags: roleTags, project_role: null });
              } else if (normalized.startsWith("INSERT INTO project_people")) {
                const [projectId, personId, projectRole] = values;
                const person = rows.get(String(personId));
                if (person) Object.assign(person, { project_id: projectId, project_role: projectRole });
              } else if (normalized.startsWith("INSERT INTO equipment")) {
                const [id, workspaceId, projectId, name, status] = values;
                rows.set(String(id), { kind: "equipment", id, workspace_id: workspaceId, project_id: projectId, name, status });
              } else if (normalized.startsWith("INSERT INTO expenses")) {
                const [id, workspaceId, projectId, category, amountCents, comment] = values;
                rows.set(String(id), { kind: "expense", id, workspace_id: workspaceId, project_id: projectId, category, amount_cents: amountCents, comment });
              } else if (normalized.startsWith("INSERT INTO audit_events")) {
                state.auditCount += 1;
              }
              return { success: true, meta: { changes: 1 } } as D1Result;
            },
          };
        },
      };
    },
    async batch(statements: D1PreparedStatement[]) {
      if (failBatch) throw new Error("batch unavailable");
      const results: D1Result[] = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    },
  } as unknown as D1Database;

  return {
    db,
    rows,
    get auditCount() {
      return state.auditCount;
    },
  };
}

function rowForQuery(sql: string, row: Record<string, unknown>): Record<string, unknown> {
  if (sql.includes("FROM tasks")) return row;
  if (sql.includes("FROM documents")) return row;
  if (sql.includes("FROM people")) return row;
  if (sql.includes("FROM equipment")) return row;
  if (sql.includes("FROM expenses")) return row;
  return row;
}
