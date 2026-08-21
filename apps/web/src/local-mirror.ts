import {
  cloneWorkspace,
  createOperation,
  normalizeProductionScheduleVersion,
  type AuditEvent,
  type OperationRecord,
  type WorkspaceData,
} from "@film/schema";

const DB_NAME = "film-offline-v1";
const DB_VERSION = 2;
const WORKSPACE_STORE = "workspaces";
const OPERATION_STORE = "operations";
const ATTACHMENT_STORE = "attachments";
const FALLBACK_WORKSPACE_KEY = "film.workspace.v1";
const FALLBACK_OPERATIONS_KEY = "film.operations.v1";

export type AttachmentBlobRecord = {
  key: string;
  workspaceId: string;
  projectId: string;
  docId: string;
  name: string;
  sourcePath: string;
  sizeBytes: number;
  contentType?: string;
  sha256: string;
  createdAt: string;
  blob: Blob;
};

export type LocalMirrorState = {
  workspace: WorkspaceData;
  operations: OperationRecord[];
  source: "indexeddb" | "localstorage" | "seed";
};

export async function loadLocalMirror(seed: WorkspaceData): Promise<LocalMirrorState> {
  const fallback = cloneWorkspace(seed);

  if (!canUseIndexedDb()) {
    return loadFallback(fallback);
  }

  const db = await openDb();
  const existing = await getFromStore<WorkspaceData>(db, WORKSPACE_STORE, seed.id);
  const operations = await getAllFromStore<OperationRecord>(db, OPERATION_STORE);

  if (existing) {
    return { workspace: normalizeWorkspace(existing), operations, source: "indexeddb" };
  }

  const seededOperation = createOperation(
    seed.id,
    "workspace.seeded",
    "workspace",
    seed.id,
    "Seed workspace loaded into local mirror",
  );
  await persistLocalMirror(fallback, seededOperation);
  return { workspace: fallback, operations: [seededOperation], source: "seed" };
}

export async function persistLocalMirror(
  workspace: WorkspaceData,
  operation?: OperationRecord,
): Promise<OperationRecord[]> {
  if (!canUseIndexedDb()) {
    return persistFallback(workspace, operation);
  }

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([WORKSPACE_STORE, OPERATION_STORE], "readwrite");
    tx.objectStore(WORKSPACE_STORE).put(workspace);
    if (operation) tx.objectStore(OPERATION_STORE).put(operation);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
  });

  return getAllFromStore<OperationRecord>(db, OPERATION_STORE);
}

export async function markOperationsSynced(operationIds: string[]): Promise<OperationRecord[]> {
  if (operationIds.length === 0) {
    return [];
  }

  if (!canUseIndexedDb()) {
    const savedOperations = localStorage.getItem(FALLBACK_OPERATIONS_KEY);
    const operations = savedOperations ? (JSON.parse(savedOperations) as OperationRecord[]) : [];
    const updated = operations.map((operation) =>
      operationIds.includes(operation.id) ? { ...operation, status: "synced" as const } : operation,
    );
    localStorage.setItem(FALLBACK_OPERATIONS_KEY, JSON.stringify(updated));
    return updated;
  }

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OPERATION_STORE, "readwrite");
    const store = tx.objectStore(OPERATION_STORE);
    for (const id of operationIds) {
      const request = store.get(id);
      request.onsuccess = () => {
        const operation = request.result as OperationRecord | undefined;
        if (operation) {
          store.put({ ...operation, status: "synced" });
        }
      };
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not mark operations synced"));
  });

  return getAllFromStore<OperationRecord>(db, OPERATION_STORE);
}

export async function appendLocalAuditEvent(workspaceId: string, event: AuditEvent): Promise<WorkspaceData | null> {
  if (!canUseIndexedDb()) {
    const savedWorkspace = localStorage.getItem(FALLBACK_WORKSPACE_KEY);
    if (!savedWorkspace) return null;
    const workspace = normalizeWorkspace(JSON.parse(savedWorkspace) as WorkspaceData);
    if (workspace.id !== workspaceId) return null;
    const updated = { ...workspace, auditLog: [event, ...workspace.auditLog] };
    localStorage.setItem(FALLBACK_WORKSPACE_KEY, JSON.stringify(updated));
    return updated;
  }

  const db = await openDb();
  let updatedWorkspace: WorkspaceData | null = null;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WORKSPACE_STORE, "readwrite");
    const store = tx.objectStore(WORKSPACE_STORE);
    const request = store.get(workspaceId);
    request.onsuccess = () => {
      const savedWorkspace = request.result as WorkspaceData | undefined;
      const workspace = savedWorkspace ? normalizeWorkspace(savedWorkspace) : undefined;
      if (!workspace) return;
      updatedWorkspace = { ...workspace, auditLog: [event, ...workspace.auditLog] };
      store.put(updatedWorkspace);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not append audit event"));
  });

  return updatedWorkspace;
}

export async function persistAttachmentBlobs(records: AttachmentBlobRecord[]): Promise<void> {
  if (records.length === 0) return;
  if (!canUseIndexedDb()) {
    throw new Error("Attachment byte staging requires IndexedDB.");
  }

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE, "readwrite");
    const store = tx.objectStore(ATTACHMENT_STORE);
    for (const record of records) {
      store.put(record);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not stage attachment bytes"));
  });
}

export async function countAttachmentBlobs(workspaceId: string): Promise<number> {
  if (!canUseIndexedDb()) return 0;

  const db = await openDb();
  return new Promise<number>((resolve, reject) => {
    const index = db.transaction(ATTACHMENT_STORE, "readonly").objectStore(ATTACHMENT_STORE).index("workspaceId");
    const request = index.count(workspaceId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not count attachment blobs"));
  });
}

export async function readAttachmentBlob(key: string): Promise<AttachmentBlobRecord | null> {
  if (!canUseIndexedDb()) return null;

  const db = await openDb();
  return (await getFromStore<AttachmentBlobRecord>(db, ATTACHMENT_STORE, key)) ?? null;
}

export function countQueuedOperations(operations: OperationRecord[]): number {
  return operations.filter((operation) => operation.status === "queued").length;
}

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function loadFallback(seed: WorkspaceData): LocalMirrorState {
  const savedWorkspace = localStorage.getItem(FALLBACK_WORKSPACE_KEY);
  const savedOperations = localStorage.getItem(FALLBACK_OPERATIONS_KEY);
  const workspace = savedWorkspace ? normalizeWorkspace(JSON.parse(savedWorkspace) as WorkspaceData) : seed;
  const operations = savedOperations ? (JSON.parse(savedOperations) as OperationRecord[]) : [];

  if (savedWorkspace) {
    return { workspace, operations, source: "localstorage" };
  }

  const seededOperation = createOperation(
    seed.id,
    "workspace.seeded",
    "workspace",
    seed.id,
    "Seed workspace loaded into local fallback storage",
  );
  localStorage.setItem(FALLBACK_WORKSPACE_KEY, JSON.stringify(seed));
  localStorage.setItem(FALLBACK_OPERATIONS_KEY, JSON.stringify([seededOperation]));
  return { workspace: seed, operations: [seededOperation], source: "seed" };
}

function normalizeWorkspace(workspace: WorkspaceData): WorkspaceData {
  return {
    ...workspace,
    screenplayBreakdowns: Array.isArray(workspace.screenplayBreakdowns) ? workspace.screenplayBreakdowns : [],
    productionSchedules: Array.isArray(workspace.productionSchedules)
      ? workspace.productionSchedules.map(normalizeProductionScheduleVersion)
      : [],
    productionAvailability: Array.isArray(workspace.productionAvailability) ? workspace.productionAvailability : [],
    productionBudgetScenarios: Array.isArray(workspace.productionBudgetScenarios) ? workspace.productionBudgetScenarios : [],
    productionCallSheets: Array.isArray(workspace.productionCallSheets) ? workspace.productionCallSheets : [],
    productionReports: Array.isArray(workspace.productionReports) ? workspace.productionReports : [],
    productionLocations: Array.isArray(workspace.productionLocations) ? workspace.productionLocations : [],
    productionTalent: Array.isArray(workspace.productionTalent) ? workspace.productionTalent : [],
    productionShots: Array.isArray(workspace.productionShots) ? workspace.productionShots : [],
  };
}

function persistFallback(workspace: WorkspaceData, operation?: OperationRecord): OperationRecord[] {
  const savedOperations = localStorage.getItem(FALLBACK_OPERATIONS_KEY);
  const operations = savedOperations ? (JSON.parse(savedOperations) as OperationRecord[]) : [];
  if (operation) operations.push(operation);
  localStorage.setItem(FALLBACK_WORKSPACE_KEY, JSON.stringify(workspace));
  localStorage.setItem(FALLBACK_OPERATIONS_KEY, JSON.stringify(operations));
  return operations;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WORKSPACE_STORE)) {
        db.createObjectStore(WORKSPACE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(OPERATION_STORE)) {
        const operationStore = db.createObjectStore(OPERATION_STORE, { keyPath: "id" });
        operationStore.createIndex("workspaceId", "workspaceId", { unique: false });
        operationStore.createIndex("status", "status", { unique: false });
        operationStore.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(ATTACHMENT_STORE)) {
        const attachmentStore = db.createObjectStore(ATTACHMENT_STORE, { keyPath: "key" });
        attachmentStore.createIndex("workspaceId", "workspaceId", { unique: false });
        attachmentStore.createIndex("docId", "docId", { unique: false });
        attachmentStore.createIndex("sha256", "sha256", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB"));
  });
}

function getFromStore<T>(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error ?? new Error(`Could not read ${storeName}`));
  });
}

function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => {
      const result = request.result as T[];
      resolve(sortByCreatedAt(result));
    };
    request.onerror = () => reject(request.error ?? new Error(`Could not read ${storeName}`));
  });
}

function sortByCreatedAt<T>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftTime = typeof left === "object" && left && "createdAt" in left
      ? String(left.createdAt)
      : "";
    const rightTime = typeof right === "object" && right && "createdAt" in right
      ? String(right.createdAt)
      : "";
    return leftTime.localeCompare(rightTime);
  });
}
