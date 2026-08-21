import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export function createSmsTestD1(): { db: D1Database; close: () => void } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const migration of [
    "0001_initial.sql",
    "0002_auth_and_operation_log.sql",
    "0006_workspace_member_statuses.sql",
    "0033_sms_compliance_records.sql",
    "0036_sms_retention_indexes.sql",
  ]) {
    sqlite.exec(readFileSync(path.join(repoRoot, "migrations", migration), "utf8"));
  }
  const statementState = new WeakMap<object, { sql: string; bindings: unknown[] }>();

  function result(changes = 0, results: unknown[] = []): D1Result {
    return {
      success: true,
      results,
      meta: { changes } as D1Result["meta"],
    };
  }

  function prepared(sql: string, bindings: unknown[] = []): D1PreparedStatement {
    const value = {
      bind(...nextBindings: unknown[]) {
        return prepared(sql, nextBindings);
      },
      async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
        const row = sqlite.prepare(sql).get(...bindings as never[]) as Record<string, unknown> | undefined;
        if (!row) return null;
        return (columnName ? row[columnName] : row) as T;
      },
      async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const runResult = sqlite.prepare(sql).run(...bindings as never[]);
        return result(Number(runResult.changes)) as D1Result<T>;
      },
      async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const rows = sqlite.prepare(sql).all(...bindings as never[]) as T[];
        return result(0, rows) as D1Result<T>;
      },
      async raw<T = unknown[]>(): Promise<T[]> {
        return sqlite.prepare(sql).all(...bindings as never[]).map((row: Record<string, unknown>) => Object.values(row)) as T[];
      },
    } as unknown as D1PreparedStatement;
    statementState.set(value as object, { sql, bindings });
    return value;
  }

  const db = {
    prepare(sql: string) {
      return prepared(sql);
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const results = statements.map((statement) => {
          const state = statementState.get(statement as object);
          if (!state) throw new Error("unknown prepared statement");
          const runResult = sqlite.prepare(state.sql).run(...state.bindings as never[]);
          return result(Number(runResult.changes)) as D1Result<T>;
        });
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
    async exec(sql: string) {
      sqlite.exec(sql);
      return { count: 1, duration: 0 };
    },
    async dump() {
      return new ArrayBuffer(0);
    },
  } as unknown as D1Database;

  return { db, close: () => sqlite.close() };
}

export async function seedSmsTestWorkspace(db: D1Database): Promise<void> {
  const now = "2026-07-10T16:00:00.000Z";
  await db.prepare("INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .bind("workspace_acme", "Film Test", now, now)
    .run();
  await db.prepare(`
    INSERT INTO workspace_members (id, workspace_id, email_hash, role, created_at)
    VALUES (?, ?, ?, 'producer', ?)
  `).bind("member_producer", "workspace_acme", "hash_producer", now).run();
  await db.prepare(`
    INSERT INTO workspace_member_statuses (member_id, workspace_id, status, updated_at)
    VALUES (?, ?, 'active', ?)
  `).bind("member_producer", "workspace_acme", now).run();
  await db.prepare(`
    INSERT INTO projects (id, workspace_id, title, project_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind("project_big_sword", "workspace_acme", "Big Sword", "Feature Film", now, now).run();
}

export function base64Key(fill: number): string {
  const bytes = new Uint8Array(32).fill(fill);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
