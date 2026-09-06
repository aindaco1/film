import type { BackupSnapshot } from "@film/schema";
import type { RestorePreviewSummary } from "@film/backup";
import type { RestoreCoreRecordRequest, RestorePlanningCommitResult } from "./restore-client";

export function createRestoreSnapshotRecords(snapshot: BackupSnapshot, preview: RestorePreviewSummary): RestoreCoreRecordRequest[] {
  const actionByKey = new Map<string, RestoreCoreRecordRequest["action"]>();
  for (const record of preview.records) {
    actionByKey.set(restoreCoreRecordKey(record.entityType, record.entityId), restoreCoreActionForStatus(record.status));
  }

  const records: RestoreCoreRecordRequest[] = [];
  records.push({
    entityType: "workspace",
    entityId: snapshot.data.id,
    action: actionByKey.get(restoreCoreRecordKey("workspace", snapshot.workspaceId)) ?? "skip",
    title: snapshot.data.name,
    archivedProjectCount: snapshot.data.archivedProjectCount,
    backupPolicy: snapshot.data.backupPolicy,
    nextBackup: snapshot.data.nextBackup,
  });

  for (const project of snapshot.data.projects) {
    records.push({
      entityType: "project",
      entityId: project.id,
      action: actionByKey.get(restoreCoreRecordKey("project", project.id)) ?? "skip",
      title: project.title,
      phase: project.phase,
    });

    for (const task of project.openTasks) {
      records.push({
        entityType: "task",
        entityId: task.id,
        action: actionByKey.get(restoreCoreRecordKey("task", task.id)) ?? "skip",
        projectId: project.id,
        title: task.title,
        status: task.status,
        priority: "normal",
        dueAt: task.due,
      });
    }

    for (const doc of project.docs) {
      records.push({
        entityType: "document",
        entityId: doc.id,
        action: actionByKey.get(restoreCoreRecordKey("document", doc.id)) ?? "skip",
        projectId: project.id,
        title: doc.name,
        documentType: doc.type,
        markdownSnapshot: doc.markdownSnapshot ?? null,
        sensitive: false,
      });
    }

    for (const person of project.people) {
      const entityId = person.id || restoreSnapshotChildRecordId(project.id, "person", person.name);
      records.push({
        entityType: "person",
        entityId,
        action: actionByKey.get(restoreCoreRecordKey("person", entityId)) ?? "skip",
        projectId: project.id,
        name: person.name,
        role: person.role,
        initials: person.initials,
        sensitive: true,
      });
    }

    for (const item of project.equipment) {
      const entityId = item.id || restoreSnapshotChildRecordId(project.id, "equipment", item.name);
      records.push({
        entityType: "equipment",
        entityId,
        action: actionByKey.get(restoreCoreRecordKey("equipment", entityId)) ?? "skip",
        projectId: project.id,
        name: item.name,
        status: item.status,
        statusTone: item.statusTone,
      });
    }

    for (const expense of project.expenses) {
      const entityId = expense.id || restoreSnapshotChildRecordId(project.id, "expense", expense.category);
      records.push({
        entityType: "expense",
        entityId,
        action: actionByKey.get(restoreCoreRecordKey("expense", entityId)) ?? "skip",
        projectId: project.id,
        category: expense.category,
        spent: expense.spent,
        budget: expense.budget,
        percent: expense.percent,
      });
    }
  }

  return records;
}

function restoreCoreRecordKey(entityType: RestoreCoreRecordRequest["entityType"], entityId: string): string {
  return `${entityType}:${entityId}`;
}

function restoreCoreActionForStatus(status: RestorePreviewSummary["records"][number]["status"]): RestoreCoreRecordRequest["action"] {
  if (status === "new") return "create";
  if (status === "changed") return "update";
  return "skip";
}

function restoreSnapshotChildRecordId(projectId: string, entityType: "person" | "equipment" | "expense", naturalKey: string): string {
  return `${projectId}:${entityType}:${safeRestoreRecordKey(naturalKey)}`;
}

function safeRestoreRecordKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "_").replace(/^_+|_+$/g, "") || "record";
}

export function formatRestoreRecordSummary(summary: Record<string, number>): string {
  const creates = summary.createCount ?? 0;
  const updates = summary.updateCount ?? 0;
  const skips = summary.skipCount ?? 0;
  const workspaces = summary.workspaceCount ?? 0;
  const projects = summary.projectCount ?? 0;
  const tasks = summary.taskCount ?? 0;
  const documents = summary.documentCount ?? 0;
  const people = summary.personCount ?? 0;
  const equipment = summary.equipmentCount ?? 0;
  const expenses = summary.expenseCount ?? 0;
  return `${creates} creates - ${updates} updates - ${skips} skips - ${workspaces} workspace/${projects} projects/${tasks} tasks/${documents} docs/${people} people/${equipment} equipment/${expenses} expenses`;
}

export function formatRestorePlanningCommitSummary(result: RestorePlanningCommitResult["result"]): string {
  return `${result.appliedCount} applied - ${result.skippedCount} skipped - ${result.createCount} creates - ${result.updateCount} updates`;
}
