import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createBackupSnapshot, seedWorkspace } from "@film/schema";
import { summarizeRestorePreview } from "@film/backup";
import type { BackupWorkspaceState } from "../src/backup-state";
import { renderBackupsWorkspace } from "../src/backup-workspace";
import { createRestoreSnapshotRecords } from "../src/restore-records";

function backupState(): BackupWorkspaceState {
  return {
    workspace: { restorePoints: [] }, operations: [], backupDryRun: null, backupExport: null,
    restorePreview: null, restoreSnapshot: null, restorePlanningRecords: [], restoreGate: null,
    restoreApproval: null, restoreCommitAttempt: null, restoreApplicationPreflight: null,
    restoreApplicationCommit: null, restoreAttachmentPackagePreflight: null,
    restoreAttachmentPackageVerification: null, restoreAttachmentObjectPlan: null,
    restoreAttachmentObjectCommitPreflight: null, restoreAttachmentObjectCommit: null,
    restorePlanningDryRun: null, restorePlanningCommit: null, attachmentExport: null,
  };
}

describe("backup workspace boundary", () => {
  it("offers local recovery without claiming a stored backup or allowing unreviewed apply", () => {
    const markup = renderBackupsWorkspace(backupState());
    expect(markup).toContain("No restore points yet");
    expect(markup).toContain("None recorded");
    for (const action of ["backup", "backup-r2-manifest", "backup-r2-preview", "restore-file-preview"]) {
      expect(markup.match(new RegExp(`data-action="${action}"`, "g"))).toHaveLength(1);
    }
    expect(markup).not.toContain('data-action="restore-application-commit"');
    expect(markup).not.toContain('data-action="restore-planning-commit"');
    expect(markup).not.toContain('data-action="restore-attachment-objects-commit"');
  });

  it("shows escaped snapshot differences and only the first safety gate", () => {
    const state = backupState();
    const incoming = structuredClone(seedWorkspace);
    incoming.projects[0]!.title = '<img src=x onerror="bad">';
    state.restoreSnapshot = createBackupSnapshot(incoming);
    state.restorePreview = summarizeRestorePreview(seedWorkspace, state.restoreSnapshot);
    const markup = renderBackupsWorkspace(state);
    expect(markup).toContain("&lt;img");
    expect(markup).not.toContain("<img");
    expect(markup).toContain('data-action="restore-gate-check"');
    expect(markup).not.toContain('data-action="restore-approval-record"');
    expect(markup).not.toContain('data-action="restore-application-commit"');
  });

  it("uses the same deterministic record plan for preview and commit, defaulting missing records to skip", () => {
    const incoming = structuredClone(seedWorkspace);
    incoming.projects[0]!.title = "Revised title";
    const snapshot = createBackupSnapshot(incoming);
    const preview = summarizeRestorePreview(seedWorkspace, snapshot);
    const records = createRestoreSnapshotRecords(snapshot, preview);
    expect(records.find((record) => record.entityId === incoming.projects[0]!.id)?.action).toBe("update");
    expect(records.find((record) => record.entityType === "workspace")?.action).toBe("skip");
    expect(createRestoreSnapshotRecords(snapshot, preview)).toEqual(records);
    expect(createRestoreSnapshotRecords(snapshot, { ...preview, records: [] }).every((record) => record.action === "skip")).toBe(true);
    expect(new Set(records.map((record) => `${record.entityType}:${record.entityId}`)).size).toBe(records.length);
  });

  it("keeps seeded project records independent instead of sharing template arrays", () => {
    const projects = seedWorkspace.projects.slice(1);
    for (const key of ["openTasks", "docs", "people", "equipment", "expenses"] as const) {
      expect(new Set(projects.map((project) => project[key])).size).toBe(projects.length);
      const ids = projects.flatMap((project) => project[key].map((record) => record.id));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("keeps restore markup lazy and record planning independent of browser/global state", () => {
    const main = readFileSync("src/main.ts", "utf8");
    const loader = readFileSync("src/backup-workspace-loader.ts", "utf8");
    const renderer = readFileSync("src/backup-workspace.ts", "utf8");
    const records = readFileSync("src/restore-records.ts", "utf8");
    expect(loader).toContain('import("./backup-workspace")');
    expect(main).not.toContain('from "./backup-workspace"');
    expect(main).not.toContain("function renderBackupRestoreWorkflow");
    expect(renderer).not.toContain('from "./main"');
    expect(records).not.toMatch(/\b(state|window|document)\./);
  });
});
