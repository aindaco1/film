import type { NotionCoreRecord } from "@film/importers";

export const NOTION_CORE_IMPORT_MAX_RECORDS = 200;

type NotionCoreKind = NotionCoreRecord["kind"];
type NormalizedNotionCoreRecord = NotionCoreRecord & { id: string };
type ExistingCoreRow = Record<string, string | number | null>;

export type NotionCoreImportResult = {
  persistence: "dry_run_memoryless" | "d1_notion_core_import" | "d1_unavailable_dry_run";
  auditPersistence: "not_applicable" | "d1_audit_events" | "d1_unavailable_dry_run";
  destructiveWrite: boolean;
  accepted: Array<{ id: string; kind: NotionCoreKind; label: string }>;
  committed: Array<{ id: string; kind: NotionCoreKind }>;
  idempotent: Array<{ id: string; kind: NotionCoreKind }>;
  updatePreview: Array<{ id: string; kind: NotionCoreKind; fieldKeys: string[] }>;
  rejected: Array<{ index: number; reason: string }>;
  error?: "notion_core_import_project_required" | "notion_core_import_storage_unavailable";
  errorStatus?: 422 | 503;
};

export async function commitNotionCoreImport(
  db: D1Database | undefined,
  workspaceId: string,
  projectId: string,
  actorMemberId: string | null,
  rawRecords: unknown[],
): Promise<NotionCoreImportResult> {
  const records: NormalizedNotionCoreRecord[] = [];
  const accepted: NotionCoreImportResult["accepted"] = [];
  const rejected: NotionCoreImportResult["rejected"] = [];

  for (const [index, value] of rawRecords.slice(0, NOTION_CORE_IMPORT_MAX_RECORDS).entries()) {
    const normalized = await normalizeNotionCoreRecord(workspaceId, projectId, value);
    if (!normalized) {
      rejected.push({ index, reason: "invalid_record" });
      continue;
    }
    if (records.some((record) => record.id === normalized.id)) {
      rejected.push({ index, reason: "duplicate_source" });
      continue;
    }
    records.push(normalized);
    accepted.push({ id: normalized.id, kind: normalized.kind, label: coreRecordLabel(normalized) });
  }
  if (rawRecords.length > NOTION_CORE_IMPORT_MAX_RECORDS) {
    for (let index = NOTION_CORE_IMPORT_MAX_RECORDS; index < rawRecords.length; index += 1) {
      rejected.push({ index, reason: "record_limit" });
    }
  }

  if (!db) {
    return {
      persistence: "dry_run_memoryless",
      auditPersistence: "not_applicable",
      destructiveWrite: false,
      accepted,
      committed: [],
      idempotent: [],
      updatePreview: [],
      rejected,
    };
  }

  try {
    const project = await db.prepare(`
      SELECT id, workspace_id, title
      FROM projects
      WHERE id = ?
      LIMIT 1
    `).bind(projectId).first<{ id: string; workspace_id: string; title: string }>();
    if (!project || project.workspace_id !== workspaceId) {
      return {
        persistence: "d1_notion_core_import",
        auditPersistence: "not_applicable",
        destructiveWrite: false,
        accepted,
        committed: [],
        idempotent: [],
        updatePreview: [],
        rejected: [...rejected, ...records.map((_, index) => ({ index, reason: "project_not_found" }))],
        error: "notion_core_import_project_required",
        errorStatus: 422,
      };
    }

    const eligibleRecords = records.filter((record, index) => {
      if (sameText(record.projectTitle, project.title)) return true;
      rejected.push({ index, reason: "project_title_mismatch" });
      return false;
    });
    const creates: NormalizedNotionCoreRecord[] = [];
    const idempotent: NotionCoreImportResult["idempotent"] = [];
    const updatePreview: NotionCoreImportResult["updatePreview"] = [];
    for (const record of eligibleRecords) {
      const existing = await findExistingCoreRow(db, record);
      if (!existing) {
        creates.push(record);
        continue;
      }
      const existingWorkspace = String(existing.workspace_id ?? "");
      const existingProject = record.kind === "person"
        ? String(existing.project_id ?? "")
        : String(existing.project_id ?? "");
      if (existingWorkspace !== workspaceId || existingProject !== projectId) {
        const index = records.findIndex((candidate) => candidate.id === record.id);
        rejected.push({ index, reason: "id_conflict" });
        continue;
      }
      const fieldKeys = changedCoreFieldKeys(existingCoreSignature(record.kind, existing), incomingCoreSignature(record));
      if (fieldKeys.length === 0) {
        idempotent.push({ id: record.id, kind: record.kind });
      } else {
        updatePreview.push({ id: record.id, kind: record.kind, fieldKeys });
      }
    }

    const now = new Date().toISOString();
    if (creates.length === 0) {
      await insertImportAudit(db, workspaceId, projectId, actorMemberId, now, {
        acceptedCount: accepted.length,
        committedCount: 0,
        idempotentCount: idempotent.length,
        updatePreviewCount: updatePreview.length,
        rejectedCount: rejected.length,
        kinds: coreKindCounts(eligibleRecords),
      });
      return {
        persistence: "d1_notion_core_import",
        auditPersistence: "d1_audit_events",
        destructiveWrite: false,
        accepted,
        committed: [],
        idempotent,
        updatePreview,
        rejected,
      };
    }

    const statements: D1PreparedStatement[] = [projectAssertion(db, workspaceId, projectId)];
    for (const record of creates) {
      statements.push(createAssertion(db, record));
      statements.push(...createStatements(db, workspaceId, projectId, actorMemberId, record, now));
    }
    statements.push(importAuditStatement(db, workspaceId, projectId, actorMemberId, now, {
      acceptedCount: accepted.length,
      committedCount: creates.length,
      idempotentCount: idempotent.length,
      updatePreviewCount: updatePreview.length,
      rejectedCount: rejected.length,
      kinds: coreKindCounts(eligibleRecords),
    }));
    const results = await db.batch(statements);
    if (results.length !== statements.length || results.some((result) => !result.success)) {
      throw new Error("notion core import batch failed");
    }

    return {
      persistence: "d1_notion_core_import",
      auditPersistence: "d1_audit_events",
      destructiveWrite: true,
      accepted,
      committed: creates.map((record) => ({ id: record.id, kind: record.kind })),
      idempotent,
      updatePreview,
      rejected,
    };
  } catch {
    return {
      persistence: "d1_unavailable_dry_run",
      auditPersistence: "d1_unavailable_dry_run",
      destructiveWrite: false,
      accepted,
      committed: [],
      idempotent: [],
      updatePreview: [],
      rejected,
      error: "notion_core_import_storage_unavailable",
      errorStatus: 503,
    };
  }
}

export async function normalizeNotionCoreRecord(
  workspaceId: string,
  projectId: string,
  value: unknown,
): Promise<NormalizedNotionCoreRecord | null> {
  if (!isRecord(value)) return null;
  const kind = value.kind;
  const sourcePath = safeImportPath(value.sourcePath);
  const sourceKey = boundedString(value.sourceKey, 80);
  const projectTitle = boundedString(value.projectTitle, 160);
  if (!isCoreKind(kind) || !sourcePath || !sourceKey || !/^[A-Za-z0-9:_-]+$/.test(sourceKey) || !projectTitle) return null;
  const id = await notionCoreRecordId(workspaceId, projectId, kind, sourcePath, sourceKey);

  if (kind === "task") {
    const title = boundedString(value.title, 180);
    const due = boundedString(value.due, 80);
    const status = value.status;
    if (!title || !due || (status !== "overdue" && status !== "pending" && status !== "ready")) return null;
    return { kind, id, sourcePath, sourceKey, projectTitle, title, due, status };
  }
  if (kind === "document") {
    const title = boundedString(value.title, 180);
    const documentType = value.documentType;
    const markdownSnapshot = value.markdownSnapshot;
    if (
      !title
      || (documentType !== "markdown" && documentType !== "uploaded_file")
      || (markdownSnapshot !== null && typeof markdownSnapshot !== "string")
      || (documentType === "uploaded_file" && markdownSnapshot !== null)
      || (typeof markdownSnapshot === "string" && (markdownSnapshot.length > 64 * 1024 || new TextEncoder().encode(markdownSnapshot).byteLength > 64 * 1024))
    ) return null;
    return { kind, id, sourcePath, sourceKey, projectTitle, title, documentType, markdownSnapshot };
  }
  if (kind === "person") {
    const displayName = boundedString(value.displayName, 120);
    const role = boundedString(value.role, 80);
    return displayName && role ? { kind, id, sourcePath, sourceKey, projectTitle, displayName, role } : null;
  }
  if (kind === "equipment") {
    const name = boundedString(value.name, 120);
    const status = boundedString(value.status, 80);
    return name && status ? { kind, id, sourcePath, sourceKey, projectTitle, name, status } : null;
  }
  const category = boundedString(value.category, 80);
  const spentCents = boundedInteger(value.spentCents, 0, 100_000_000_000);
  const budgetCents = boundedInteger(value.budgetCents, 0, 100_000_000_000);
  return category && spentCents !== null && budgetCents !== null
    ? { kind, id, sourcePath, sourceKey, projectTitle, category, spentCents, budgetCents }
    : null;
}

export async function notionCoreRecordId(
  workspaceId: string,
  projectId: string,
  kind: NotionCoreKind,
  sourcePath: string,
  sourceKey: string,
): Promise<string> {
  const digest = await sha256Hex(`${workspaceId}|${projectId}|${kind}|${sourcePath}|${sourceKey}`);
  const prefix: Record<NotionCoreKind, string> = {
    task: "notion_task_",
    document: "notion_doc_",
    person: "notion_person_",
    equipment: "notion_equipment_",
    expense: "notion_expense_",
  };
  return `${prefix[kind]}${digest.slice(0, 32)}`;
}

function coreRecordLabel(record: NormalizedNotionCoreRecord): string {
  if (record.kind === "task" || record.kind === "document") return record.title;
  if (record.kind === "person") return record.displayName;
  if (record.kind === "equipment") return record.name;
  return record.category;
}

async function findExistingCoreRow(db: D1Database, record: NormalizedNotionCoreRecord): Promise<ExistingCoreRow | null> {
  if (record.kind === "task") {
    return db.prepare(`SELECT id, workspace_id, project_id, title, status, due_at FROM tasks WHERE id = ? LIMIT 1`).bind(record.id).first<ExistingCoreRow>();
  }
  if (record.kind === "document") {
    return db.prepare(`SELECT id, workspace_id, project_id, title, document_type, markdown_snapshot FROM documents WHERE id = ? LIMIT 1`).bind(record.id).first<ExistingCoreRow>();
  }
  if (record.kind === "person") {
    return db.prepare(`
      SELECT p.id, p.workspace_id, pp.project_id, p.display_name, p.role_tags, pp.project_role
      FROM people p
      LEFT JOIN project_people pp ON pp.person_id = p.id
      WHERE p.id = ?
      LIMIT 1
    `).bind(record.id).first<ExistingCoreRow>();
  }
  if (record.kind === "equipment") {
    return db.prepare(`SELECT id, workspace_id, project_id, name, status FROM equipment WHERE id = ? LIMIT 1`).bind(record.id).first<ExistingCoreRow>();
  }
  return db.prepare(`SELECT id, workspace_id, project_id, category, amount_cents, comment FROM expenses WHERE id = ? LIMIT 1`).bind(record.id).first<ExistingCoreRow>();
}

function existingCoreSignature(kind: NotionCoreKind, row: ExistingCoreRow): Record<string, unknown> {
  if (kind === "task") return { title: row.title, status: row.status, due: row.due_at ?? "Imported" };
  if (kind === "document") return { title: row.title, documentType: row.document_type, markdownSnapshot: row.markdown_snapshot ?? null };
  if (kind === "person") return { displayName: row.display_name, role: firstRole(row.role_tags, row.project_role) };
  if (kind === "equipment") return { name: row.name, status: row.status };
  return { category: row.category, spentCents: row.amount_cents, budgetCents: budgetCentsFromComment(row.comment) };
}

function incomingCoreSignature(record: NormalizedNotionCoreRecord): Record<string, unknown> {
  if (record.kind === "task") return { title: record.title, status: record.status, due: normalizedDue(record.due) ?? "Imported" };
  if (record.kind === "document") return { title: record.title, documentType: record.documentType, markdownSnapshot: record.markdownSnapshot };
  if (record.kind === "person") return { displayName: record.displayName, role: record.role };
  if (record.kind === "equipment") return { name: record.name, status: record.status };
  return { category: record.category, spentCents: record.spentCents, budgetCents: record.budgetCents };
}

function changedCoreFieldKeys(existing: Record<string, unknown>, incoming: Record<string, unknown>): string[] {
  return Object.keys(incoming).filter((key) => JSON.stringify(existing[key] ?? null) !== JSON.stringify(incoming[key] ?? null)).sort();
}

function projectAssertion(db: D1Database, workspaceId: string, projectId: string): D1PreparedStatement {
  return db.prepare(`
    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM projects WHERE id = ? AND workspace_id = ?)
      THEN 1 ELSE abs(-9223372036854775808)
    END AS notion_core_project_assertion
  `).bind(projectId, workspaceId);
}

function createAssertion(db: D1Database, record: NormalizedNotionCoreRecord): D1PreparedStatement {
  const table = record.kind === "task" ? "tasks"
    : record.kind === "document" ? "documents"
      : record.kind === "person" ? "people"
        : record.kind === "equipment" ? "equipment"
          : "expenses";
  return db.prepare(`
    SELECT CASE
      WHEN NOT EXISTS (SELECT 1 FROM ${table} WHERE id = ?)
      THEN 1 ELSE abs(-9223372036854775808)
    END AS notion_core_create_assertion
  `).bind(record.id);
}

function createStatements(
  db: D1Database,
  workspaceId: string,
  projectId: string,
  actorMemberId: string | null,
  record: NormalizedNotionCoreRecord,
  now: string,
): D1PreparedStatement[] {
  if (record.kind === "task") {
    return [db.prepare(`
      INSERT INTO tasks (
        id, workspace_id, project_id, title, status, priority, due_at,
        owner_member_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'normal', ?, ?, ?, ?)
    `).bind(record.id, workspaceId, projectId, record.title, record.status, normalizedDue(record.due), actorMemberId, now, now)];
  }
  if (record.kind === "document") {
    return [db.prepare(`
      INSERT INTO documents (
        id, workspace_id, project_id, folder_id, title, document_type,
        markdown_snapshot, external_url, sensitive, owner_member_id, created_at, updated_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, NULL, 0, ?, ?, ?)
    `).bind(record.id, workspaceId, projectId, record.title, record.documentType, record.markdownSnapshot, actorMemberId, now, now)];
  }
  if (record.kind === "person") {
    return [
      db.prepare(`
        INSERT INTO people (
          id, workspace_id, display_name, role_tags, email_encrypted, phone_encrypted,
          notes, sensitive, owner_member_id, updated_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, 1, ?, ?)
      `).bind(record.id, workspaceId, record.displayName, JSON.stringify([record.role]), actorMemberId, now),
      db.prepare(`
        INSERT INTO project_people (project_id, person_id, project_role)
        VALUES (?, ?, ?)
      `).bind(projectId, record.id, record.role),
    ];
  }
  if (record.kind === "equipment") {
    return [db.prepare(`
      INSERT INTO equipment (
        id, workspace_id, project_id, name, equipment_type, status, notes, owner_member_id, updated_at
      ) VALUES (?, ?, ?, ?, 'notion_import', ?, NULL, ?, ?)
    `).bind(record.id, workspaceId, projectId, record.name, record.status, actorMemberId, now)];
  }
  return [db.prepare(`
    INSERT INTO expenses (
      id, workspace_id, project_id, category, amount_cents, purchased_at,
      comment, owner_member_id, updated_at
    ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
  `).bind(
    record.id,
    workspaceId,
    projectId,
    record.category,
    record.spentCents,
    JSON.stringify({ budget: record.budgetCents / 100, source: "notion_import" }),
    actorMemberId,
    now,
  )];
}

function importAuditStatement(
  db: D1Database,
  workspaceId: string,
  projectId: string,
  actorMemberId: string | null,
  now: string,
  metadata: Record<string, unknown>,
): D1PreparedStatement {
  return db.prepare(`
    INSERT INTO audit_events (
      id, workspace_id, project_id, actor_member_id, action, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, 'import.notion_core_committed', ?, ?)
  `).bind(`audit_notion_core_${crypto.randomUUID()}`, workspaceId, projectId, actorMemberId, JSON.stringify(metadata), now);
}

async function insertImportAudit(
  db: D1Database,
  workspaceId: string,
  projectId: string,
  actorMemberId: string | null,
  now: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await importAuditStatement(db, workspaceId, projectId, actorMemberId, now, metadata).run();
}

function coreKindCounts(records: NormalizedNotionCoreRecord[]): Record<NotionCoreKind, number> {
  return {
    task: records.filter((record) => record.kind === "task").length,
    document: records.filter((record) => record.kind === "document").length,
    person: records.filter((record) => record.kind === "person").length,
    equipment: records.filter((record) => record.kind === "equipment").length,
    expense: records.filter((record) => record.kind === "expense").length,
  };
}

function normalizedDue(value: string): string | null {
  return value === "Imported" || value === "Unscheduled" ? null : value;
}

function firstRole(roleTags: string | number | null, projectRole: string | number | null): string | null {
  if (typeof projectRole === "string" && projectRole.trim()) return projectRole.trim();
  if (typeof roleTags !== "string") return null;
  try {
    const parsed = JSON.parse(roleTags) as unknown;
    return Array.isArray(parsed) && typeof parsed[0] === "string" ? parsed[0] : null;
  } catch {
    return null;
  }
}

function budgetCentsFromComment(value: string | number | null): number {
  if (typeof value !== "string") return 0;
  try {
    const parsed = JSON.parse(value) as { budget?: unknown };
    return typeof parsed.budget === "number" && Number.isFinite(parsed.budget) ? Math.round(parsed.budget * 100) : 0;
  } catch {
    return 0;
  }
}

function safeImportPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path || path.length > 1024 || path.includes("\0") || path.includes("\\") || path.startsWith("/") || /^[A-Za-z]:/.test(path)) return null;
  const segments = path.split("/");
  return segments[0] === "__MACOSX" || segments.some((segment) => !segment || segment === "." || segment === "..") ? null : path;
}

function sameText(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength && !/[\r\n]/.test(normalized) ? normalized : null;
}

function boundedInteger(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

function isCoreKind(value: unknown): value is NotionCoreKind {
  return value === "task" || value === "document" || value === "person" || value === "equipment" || value === "expense";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
