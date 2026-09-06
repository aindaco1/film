import type { BackupWorkspaceState } from "./backup-state";
import { createDeferredView } from "./deferred-view";

export function createBackupWorkspaceLoader(load = () => import("./backup-workspace")) {
  return createDeferredView<BackupWorkspaceState>({
    title: "Backups",
    heading: "h1",
    reloadAction: "backup-view-reload",
    load: async () => (await load()).renderBackupsWorkspace,
  });
}
