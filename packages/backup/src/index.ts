import type {
  BackupPlanningRecord,
  BackupSnapshot,
  EquipmentItem,
  ExpenseLine,
  FilmProject,
  ProjectDoc,
  ProjectPerson,
  ProjectTask,
  WorkspaceData,
} from "@film/schema";

export type EncryptedBackupBundle = {
  format: "film.encrypted-backup";
  version: 1;
  kdf: BackupKeyDerivationMetadata;
  cipher: BackupCipherMetadata;
  createdAt: string;
  workspaceId: string;
  payload: string;
};

export type EncryptedBackupZipBundle = {
  format: "film.encrypted-backup.zip";
  version: 1;
  createdAt: string;
  workspaceId: string;
  bytes: Uint8Array;
};

export type EncryptedBackupZipManifest = {
  format: "film.encrypted-backup.zip";
  version: 1;
  createdAt: string;
  snapshotCreatedAt: string;
  workspaceId: string;
  schemaVersion: BackupSnapshot["schemaVersion"];
  secretPolicy: BackupSnapshot["secretPolicy"];
  encryption: {
    kdf: BackupKeyDerivationMetadata;
    cipher: BackupCipherMetadata;
  };
  payloads: EncryptedBackupZipPayloadEntry[];
  documentBodySummary?: {
    policy: "split_encrypted_payload" | "not_included";
    totalDocuments: number;
    payloadPath: string | null;
  };
  attachmentPolicySummary?: {
    policy: "metadata_only_payload" | "not_included";
    totalAssets: number;
    payloadPath: string | null;
  };
  attachmentSummary: {
    policy: BackupSnapshot["attachmentManifest"]["policy"];
    totalAssets: number;
    stagedLocal: number;
    r2DryRun: number;
    storedR2: number;
    totalSourceBytes: number;
  };
  planningSummary: {
    policy: "d1_planning_rows" | "not_included";
    totalRecords: number;
    truncated: boolean;
    persistence: string;
  };
};

export type EncryptedBackupZipPayloadEntry = {
  path: string;
  kind: "workspace_snapshot" | "document_bodies" | "attachment_restore_policy";
  encrypted: true;
  contentType: "application/octet-stream";
  plaintextContentType: "application/json";
  sizeBytes: number;
  recordCount?: number;
  encryption?: {
    kdf: BackupKeyDerivationMetadata;
    cipher: BackupCipherMetadata;
  };
};

export type BackupDocumentBodyPayload = {
  format: "film.document-bodies";
  version: 1;
  workspaceId: string;
  snapshotCreatedAt: string;
  documents: BackupDocumentBodyRecord[];
};

export type BackupDocumentBodyRecord = {
  projectId: string;
  docId: string;
  markdownSnapshot: string;
};

export type BackupAttachmentRestorePolicyPayload = {
  format: "film.attachment-restore-policy";
  version: 1;
  workspaceId: string;
  snapshotCreatedAt: string;
  restoreSupport: "metadata_only";
  blockers: string[];
  manifest: BackupSnapshot["attachmentManifest"];
};

export type BackupKeyDerivationMetadata = {
  name: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
  salt: string;
};

export type BackupCipherMetadata = {
  name: "AES-GCM";
  iv: string;
};

export type RestorePreviewSummary = {
  workspaceId: string;
  createdAt: string;
  currentProjectCount: number;
  incomingProjectCount: number;
  matchingProjectCount: number;
  newProjectCount: number;
  incomingRecordCount: number;
  matchingRecordCount: number;
  newRecordCount: number;
  changedRecordCount: number;
  unchangedRecordCount: number;
  fieldConflictCount: number;
  planningRecordCount: number;
  planningTruncated: boolean;
  planningRecords: RestorePlanningPreviewRecord[];
  planningKindCounts: RestorePlanningKindCount[];
  planningTableCoverage: RestorePlanningTableCoverage[];
  applicationPlan: RestoreApplicationPlan;
  records: RestorePreviewRecord[];
  firstProjectTitle: string;
  warnings: string[];
};

export type RestoreApplicationPlan = {
  mode: "preview_only";
  destructiveWrite: false;
  canApply: false;
  requiresWorkerCommit: true;
  preRestoreBackupRequired: true;
  operationPolicy: "preview_only";
  operationCount: number;
  operationSamples: RestoreApplicationOperation[];
  tablePlan: RestoreApplicationTablePlan[];
  createRecordCount: number;
  updateRecordCount: number;
  unchangedRecordCount: number;
  fieldConflictCount: number;
  attachmentPolicy: "metadata_only" | "not_included";
  attachmentAssetCount: number;
  attachmentPackagePlan: RestoreAttachmentPackagePlan;
  planningPolicy: "preview_only" | "not_included";
  planningRecordCount: number;
  blockers: string[];
};

export type RestoreAttachmentPackagePlan = {
  policy: "metadata_only" | "not_included";
  packageRequired: boolean;
  byteRestoreSupport: "blocked" | "not_included";
  metadataRecordCount: number;
  stagedLocalRecordCount: number;
  r2DryRunRecordCount: number;
  storedR2RecordCount: number;
  totalSourceBytes: number;
  blockers: string[];
};

export type RestoreApplicationTablePlan = {
  tableName: string;
  source: "workspace_snapshot" | "d1_planning_export";
  entityType: RestorePreviewRecord["entityType"] | "planning";
  operationCount: number;
  createCount: number;
  updateCount: number;
  skipCount: number;
  previewOnlyCount: number;
  fieldConflictCount: number;
  restoreSupport: "blocked" | "preview_only" | "commit_supported";
  blockers: string[];
};

export type RestoreApplicationOperation = {
  entityType: RestorePreviewRecord["entityType"] | "planning";
  entityId: string;
  label: string;
  action: "create" | "update" | "skip";
  status: RestorePreviewRecord["status"] | "preview_only";
  fieldConflictCount: number;
  blockers: string[];
};

export type RestorePlanningPreviewRecord = {
  kind: BackupPlanningRecord["kind"];
  id: string;
  title: string;
  projectId: string | null;
  sourcePath: string | null;
  fieldCount: number;
  fieldKeys: string[];
};

export type RestorePlanningKindCount = {
  kind: BackupPlanningRecord["kind"];
  count: number;
};

export type RestorePlanningTableCoverage = {
  kind: BackupPlanningRecord["kind"];
  tableName: string;
  recordCount: number;
  included: boolean;
  restoreSupport: "preview_only" | "not_included";
};

export type RestorePreviewRecord = {
  entityType: "workspace" | "project" | "task" | "document" | "person" | "equipment" | "expense";
  entityId: string;
  label: string;
  status: "new" | "changed" | "unchanged";
  fieldChanges: RestorePreviewFieldChange[];
};

export type RestorePreviewFieldChange = {
  field: string;
  currentValue: string;
  incomingValue: string;
};

type ComparableField<T> = {
  field: string;
  value: (record: T) => unknown;
};

const ITERATIONS = 210_000;
const ZIP_MANIFEST_PATH = "manifest.json";
const ZIP_WORKSPACE_PAYLOAD_PATH = "payload/workspace.snapshot.enc";
const ZIP_DOCUMENT_BODIES_PAYLOAD_PATH = "payload/document-bodies.enc";
const ZIP_ATTACHMENT_POLICY_PAYLOAD_PATH = "payload/attachment-restore-policy.enc";
const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_FILE_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;
const ZIP_MAX_COMMENT_BYTES = 65_535;
const MAX_DOCUMENT_BODY_RECORDS = 1_000;
const MAX_DOCUMENT_BODY_CHARS = 1_000_000;
const MAX_ATTACHMENT_POLICY_ITEMS = 1_000;
const PLANNING_TABLES: Array<{ kind: BackupPlanningRecord["kind"]; tableName: string }> = [
  { kind: "location", tableName: "locations" },
  { kind: "opportunity", tableName: "opportunities" },
  { kind: "meeting_note", tableName: "meeting_notes" },
  { kind: "equipment_request", tableName: "equipment_requests" },
  { kind: "show", tableName: "shows" },
  { kind: "merch", tableName: "merch_items" },
  { kind: "media", tableName: "media_items" },
  { kind: "role", tableName: "production_roles" },
];
const RESTORE_ENTITY_TABLES: Record<RestorePreviewRecord["entityType"], string> = {
  workspace: "workspaces",
  project: "projects",
  task: "tasks",
  document: "documents",
  person: "people",
  equipment: "equipment",
  expense: "expenses",
};

export async function createEncryptedBackupBundle(
  snapshot: BackupSnapshot,
  passphrase: string,
): Promise<EncryptedBackupBundle> {
  assertPassphrase(passphrase);
  const encrypted = await encryptSnapshotPayload(snapshot, passphrase);

  return {
    format: "film.encrypted-backup",
    version: 1,
    kdf: encrypted.kdf,
    cipher: encrypted.cipher,
    createdAt: new Date().toISOString(),
    workspaceId: snapshot.workspaceId,
    payload: bytesToBase64(encrypted.ciphertext),
  };
}

export async function createEncryptedBackupZipBundle(
  snapshot: BackupSnapshot,
  passphrase: string,
): Promise<EncryptedBackupZipBundle> {
  assertPassphrase(passphrase);
  const createdAt = new Date().toISOString();
  const { workspaceSnapshot, documentBodies } = splitDocumentBodiesFromSnapshot(snapshot);
  const attachmentPolicy = createAttachmentRestorePolicyPayload(snapshot);
  const encrypted = await encryptSnapshotPayload(workspaceSnapshot, passphrase);
  const encryptedDocumentBodies = documentBodies
    ? await encryptJsonPayload(documentBodies, passphrase)
    : null;
  const encryptedAttachmentPolicy = attachmentPolicy
    ? await encryptJsonPayload(attachmentPolicy, passphrase)
    : null;
  const payloads: EncryptedBackupZipPayloadEntry[] = [
    {
      path: ZIP_WORKSPACE_PAYLOAD_PATH,
      kind: "workspace_snapshot",
      encrypted: true,
      contentType: "application/octet-stream",
      plaintextContentType: "application/json",
      sizeBytes: encrypted.ciphertext.byteLength,
    },
  ];
  if (documentBodies && encryptedDocumentBodies) {
    payloads.push({
      path: ZIP_DOCUMENT_BODIES_PAYLOAD_PATH,
      kind: "document_bodies",
      encrypted: true,
      contentType: "application/octet-stream",
      plaintextContentType: "application/json",
      sizeBytes: encryptedDocumentBodies.ciphertext.byteLength,
      recordCount: documentBodies.documents.length,
      encryption: {
        kdf: encryptedDocumentBodies.kdf,
        cipher: encryptedDocumentBodies.cipher,
      },
    });
  }
  if (attachmentPolicy && encryptedAttachmentPolicy) {
    payloads.push({
      path: ZIP_ATTACHMENT_POLICY_PAYLOAD_PATH,
      kind: "attachment_restore_policy",
      encrypted: true,
      contentType: "application/octet-stream",
      plaintextContentType: "application/json",
      sizeBytes: encryptedAttachmentPolicy.ciphertext.byteLength,
      recordCount: attachmentPolicy.manifest.items.length,
      encryption: {
        kdf: encryptedAttachmentPolicy.kdf,
        cipher: encryptedAttachmentPolicy.cipher,
      },
    });
  }
  const manifest: EncryptedBackupZipManifest = {
    format: "film.encrypted-backup.zip",
    version: 1,
    createdAt,
    snapshotCreatedAt: snapshot.createdAt,
    workspaceId: snapshot.workspaceId,
    schemaVersion: snapshot.schemaVersion,
    secretPolicy: snapshot.secretPolicy,
    encryption: {
      kdf: encrypted.kdf,
      cipher: encrypted.cipher,
    },
    payloads,
    documentBodySummary: {
      policy: documentBodies ? "split_encrypted_payload" : "not_included",
      totalDocuments: documentBodies?.documents.length ?? 0,
      payloadPath: documentBodies ? ZIP_DOCUMENT_BODIES_PAYLOAD_PATH : null,
    },
    attachmentPolicySummary: {
      policy: attachmentPolicy ? "metadata_only_payload" : "not_included",
      totalAssets: attachmentPolicy?.manifest.totalAssets ?? 0,
      payloadPath: attachmentPolicy ? ZIP_ATTACHMENT_POLICY_PAYLOAD_PATH : null,
    },
    attachmentSummary: {
      policy: snapshot.attachmentManifest.policy,
      totalAssets: snapshot.attachmentManifest.totalAssets,
      stagedLocal: snapshot.attachmentManifest.stagedLocal,
      r2DryRun: snapshot.attachmentManifest.r2DryRun,
      storedR2: snapshot.attachmentManifest.storedR2,
      totalSourceBytes: snapshot.attachmentManifest.totalSourceBytes,
    },
    planningSummary: {
      policy: snapshot.planningExport?.policy ?? "not_included",
      totalRecords: snapshot.planningExport?.rowCount ?? 0,
      truncated: snapshot.planningExport?.truncated ?? false,
      persistence: snapshot.planningExport?.persistence ?? "not_applicable",
    },
  };

  return {
    format: "film.encrypted-backup.zip",
    version: 1,
    createdAt,
    workspaceId: snapshot.workspaceId,
    bytes: createStoredZipArchive([
      {
        path: ZIP_MANIFEST_PATH,
        bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
      },
      {
        path: ZIP_WORKSPACE_PAYLOAD_PATH,
        bytes: encrypted.ciphertext,
      },
      ...(encryptedDocumentBodies
        ? [
            {
              path: ZIP_DOCUMENT_BODIES_PAYLOAD_PATH,
              bytes: encryptedDocumentBodies.ciphertext,
            },
          ]
        : []),
      ...(encryptedAttachmentPolicy
        ? [
            {
              path: ZIP_ATTACHMENT_POLICY_PAYLOAD_PATH,
              bytes: encryptedAttachmentPolicy.ciphertext,
            },
          ]
        : []),
    ]),
  };
}

export async function decryptEncryptedBackupBundle(
  bundle: EncryptedBackupBundle,
  passphrase: string,
): Promise<BackupSnapshot> {
  assertPassphrase(passphrase);
  if (bundle.format !== "film.encrypted-backup" || bundle.version !== 1) {
    throw new Error("Unsupported backup bundle format");
  }

  const ciphertext = base64ToBytes(bundle.payload);
  return decryptSnapshotPayload(bundle.kdf, bundle.cipher, ciphertext, passphrase);
}

export async function decryptEncryptedBackupZipBundle(
  archive: ArrayBuffer | Uint8Array,
  passphrase: string,
): Promise<BackupSnapshot> {
  assertPassphrase(passphrase);
  const manifest = readEncryptedBackupZipManifest(archive);
  const payload = manifest.payloads.find((entry) => entry.kind === "workspace_snapshot");
  if (!payload) {
    throw new Error("Backup ZIP is missing the workspace payload.");
  }

  const entries = parseStoredZipEntries(toUint8Array(archive));
  const payloadEntry = entries.find((entry) => entry.path === payload.path);
  if (!payloadEntry) {
    throw new Error("Backup ZIP workspace payload is missing.");
  }

  const ciphertext = readStoredZipEntryBytes(toUint8Array(archive), payloadEntry);
  if (ciphertext.byteLength !== payload.sizeBytes) {
    throw new Error("Backup ZIP workspace payload size does not match the manifest.");
  }

  let snapshot = await decryptSnapshotPayload(manifest.encryption.kdf, manifest.encryption.cipher, ciphertext, passphrase);
  const documentPayload = manifest.payloads.find((entry) => entry.kind === "document_bodies");
  if (documentPayload) {
    if (!documentPayload.encryption) {
      throw new Error("Backup ZIP document body payload is missing encryption metadata.");
    }
    const documentEntry = entries.find((entry) => entry.path === documentPayload.path);
    if (!documentEntry) {
      throw new Error("Backup ZIP document body payload is missing.");
    }

    const documentCiphertext = readStoredZipEntryBytes(toUint8Array(archive), documentEntry);
    if (documentCiphertext.byteLength !== documentPayload.sizeBytes) {
      throw new Error("Backup ZIP document body payload size does not match the manifest.");
    }

    const documentBodies = await decryptJsonPayload<BackupDocumentBodyPayload>(
      documentPayload.encryption.kdf,
      documentPayload.encryption.cipher,
      documentCiphertext,
      passphrase,
    );
    snapshot = mergeDocumentBodiesIntoSnapshot(snapshot, documentBodies);
  }

  const attachmentPolicyPayload = manifest.payloads.find((entry) => entry.kind === "attachment_restore_policy");
  if (attachmentPolicyPayload) {
    if (!attachmentPolicyPayload.encryption) {
      throw new Error("Backup ZIP attachment restore policy payload is missing encryption metadata.");
    }
    const attachmentPolicyEntry = entries.find((entry) => entry.path === attachmentPolicyPayload.path);
    if (!attachmentPolicyEntry) {
      throw new Error("Backup ZIP attachment restore policy payload is missing.");
    }

    const attachmentPolicyCiphertext = readStoredZipEntryBytes(toUint8Array(archive), attachmentPolicyEntry);
    if (attachmentPolicyCiphertext.byteLength !== attachmentPolicyPayload.sizeBytes) {
      throw new Error("Backup ZIP attachment restore policy payload size does not match the manifest.");
    }

    const attachmentPolicy = await decryptJsonPayload<BackupAttachmentRestorePolicyPayload>(
      attachmentPolicyPayload.encryption.kdf,
      attachmentPolicyPayload.encryption.cipher,
      attachmentPolicyCiphertext,
      passphrase,
    );
    assertAttachmentRestorePolicyPayload(snapshot, attachmentPolicy);
  }

  return snapshot;
}

export function readEncryptedBackupZipManifest(archive: ArrayBuffer | Uint8Array): EncryptedBackupZipManifest {
  const data = toUint8Array(archive);
  const entries = parseStoredZipEntries(data);
  const manifestEntry = entries.find((entry) => entry.path === ZIP_MANIFEST_PATH);
  if (!manifestEntry) {
    throw new Error("Backup ZIP is missing manifest.json.");
  }
  const manifest = JSON.parse(new TextDecoder().decode(readStoredZipEntryBytes(data, manifestEntry))) as EncryptedBackupZipManifest;
  if (manifest.format !== "film.encrypted-backup.zip" || manifest.version !== 1) {
    throw new Error("Unsupported backup ZIP format");
  }
  if (!manifest.payloads.some((entry) => entry.path === ZIP_WORKSPACE_PAYLOAD_PATH)) {
    throw new Error("Backup ZIP manifest is missing the workspace payload.");
  }
  return manifest;
}

function splitDocumentBodiesFromSnapshot(snapshot: BackupSnapshot): {
  workspaceSnapshot: BackupSnapshot;
  documentBodies: BackupDocumentBodyPayload | null;
} {
  const workspaceSnapshot = cloneJson(snapshot) as BackupSnapshot;
  const documents: BackupDocumentBodyRecord[] = [];

  for (const project of workspaceSnapshot.data.projects) {
    for (const doc of project.docs) {
      if (typeof doc.markdownSnapshot !== "string") {
        continue;
      }
      documents.push({
        projectId: project.id,
        docId: doc.id,
        markdownSnapshot: doc.markdownSnapshot,
      });
      delete doc.markdownSnapshot;
    }
  }

  return {
    workspaceSnapshot,
    documentBodies: documents.length > 0
      ? {
          format: "film.document-bodies",
          version: 1,
          workspaceId: snapshot.workspaceId,
          snapshotCreatedAt: snapshot.createdAt,
          documents,
        }
      : null,
  };
}

function createAttachmentRestorePolicyPayload(snapshot: BackupSnapshot): BackupAttachmentRestorePolicyPayload | null {
  if (snapshot.attachmentManifest.totalAssets === 0) {
    return null;
  }
  return {
    format: "film.attachment-restore-policy",
    version: 1,
    workspaceId: snapshot.workspaceId,
    snapshotCreatedAt: snapshot.createdAt,
    restoreSupport: "metadata_only",
    blockers: ["Attachment bytes are metadata-only in this backup and require a separate restore package."],
    manifest: cloneJson(snapshot.attachmentManifest) as BackupSnapshot["attachmentManifest"],
  };
}

function mergeDocumentBodiesIntoSnapshot(
  snapshot: BackupSnapshot,
  documentBodies: BackupDocumentBodyPayload,
): BackupSnapshot {
  assertDocumentBodyPayload(snapshot, documentBodies);
  const merged = cloneJson(snapshot) as BackupSnapshot;
  const docsByKey = new Map<string, ProjectDoc>();
  for (const project of merged.data.projects) {
    for (const doc of project.docs) {
      docsByKey.set(documentBodyKey(project.id, doc.id), doc);
    }
  }

  for (const documentBody of documentBodies.documents) {
    const doc = docsByKey.get(documentBodyKey(documentBody.projectId, documentBody.docId));
    if (!doc) {
      throw new Error("Backup ZIP document body payload references an unknown document.");
    }
    doc.markdownSnapshot = documentBody.markdownSnapshot;
  }

  return merged;
}

function assertDocumentBodyPayload(snapshot: BackupSnapshot, documentBodies: BackupDocumentBodyPayload): void {
  if (documentBodies.format !== "film.document-bodies" || documentBodies.version !== 1) {
    throw new Error("Unsupported backup ZIP document body payload format.");
  }
  if (documentBodies.workspaceId !== snapshot.workspaceId || documentBodies.snapshotCreatedAt !== snapshot.createdAt) {
    throw new Error("Backup ZIP document body payload does not match the workspace snapshot.");
  }
  if (!Array.isArray(documentBodies.documents) || documentBodies.documents.length > MAX_DOCUMENT_BODY_RECORDS) {
    throw new Error("Backup ZIP document body payload is too large.");
  }
  for (const documentBody of documentBodies.documents) {
    if (!isBoundedId(documentBody.projectId) || !isBoundedId(documentBody.docId)) {
      throw new Error("Backup ZIP document body payload contains an invalid document reference.");
    }
    if (typeof documentBody.markdownSnapshot !== "string" || documentBody.markdownSnapshot.length > MAX_DOCUMENT_BODY_CHARS) {
      throw new Error("Backup ZIP document body payload contains an invalid markdown snapshot.");
    }
  }
}

function assertAttachmentRestorePolicyPayload(
  snapshot: BackupSnapshot,
  attachmentPolicy: BackupAttachmentRestorePolicyPayload,
): void {
  if (attachmentPolicy.format !== "film.attachment-restore-policy" || attachmentPolicy.version !== 1) {
    throw new Error("Unsupported backup ZIP attachment restore policy payload format.");
  }
  if (attachmentPolicy.workspaceId !== snapshot.workspaceId || attachmentPolicy.snapshotCreatedAt !== snapshot.createdAt) {
    throw new Error("Backup ZIP attachment restore policy payload does not match the workspace snapshot.");
  }
  if (attachmentPolicy.restoreSupport !== "metadata_only") {
    throw new Error("Backup ZIP attachment restore policy payload has unsupported restore support.");
  }
  const manifest = attachmentPolicy.manifest;
  if (manifest.policy !== "metadata_only" || manifest.items.length > MAX_ATTACHMENT_POLICY_ITEMS) {
    throw new Error("Backup ZIP attachment restore policy payload is invalid.");
  }
  if (
    manifest.totalAssets !== snapshot.attachmentManifest.totalAssets
    || manifest.stagedLocal !== snapshot.attachmentManifest.stagedLocal
    || manifest.r2DryRun !== snapshot.attachmentManifest.r2DryRun
    || manifest.storedR2 !== snapshot.attachmentManifest.storedR2
    || manifest.totalSourceBytes !== snapshot.attachmentManifest.totalSourceBytes
    || !sameJson(manifest.items, snapshot.attachmentManifest.items)
  ) {
    throw new Error("Backup ZIP attachment restore policy payload does not match the attachment manifest.");
  }
}

function documentBodyKey(projectId: string, docId: string): string {
  return `${projectId}\0${docId}`;
}

function isBoundedId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

function cloneJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function encryptSnapshotPayload(
  snapshot: BackupSnapshot,
  passphrase: string,
): Promise<{
  kdf: BackupKeyDerivationMetadata;
  cipher: BackupCipherMetadata;
  ciphertext: Uint8Array;
}> {
  return encryptJsonPayload(snapshot, passphrase);
}

async function encryptJsonPayload(
  value: unknown,
  passphrase: string,
): Promise<{
  kdf: BackupKeyDerivationMetadata;
  cipher: BackupCipherMetadata;
  ciphertext: Uint8Array;
}> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext),
  );

  return {
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv: bytesToBase64(iv),
    },
    ciphertext: new Uint8Array(encrypted),
  };
}

async function decryptSnapshotPayload(
  kdf: BackupKeyDerivationMetadata,
  cipher: BackupCipherMetadata,
  ciphertext: Uint8Array,
  passphrase: string,
): Promise<BackupSnapshot> {
  return decryptJsonPayload<BackupSnapshot>(kdf, cipher, ciphertext, passphrase);
}

async function decryptJsonPayload<T>(
  kdf: BackupKeyDerivationMetadata,
  cipher: BackupCipherMetadata,
  ciphertext: Uint8Array,
  passphrase: string,
): Promise<T> {
  const salt = base64ToBytes(kdf.salt);
  const iv = base64ToBytes(cipher.iv);
  const key = await deriveKey(passphrase, salt, kdf.iterations);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

type StoredZipSourceEntry = {
  path: string;
  bytes: Uint8Array;
};

type StoredZipParsedEntry = {
  path: string;
  sizeBytes: number;
  compressedSizeBytes: number;
  crc32: number;
  compressionMethod: number;
  dataOffset: number;
};

function createStoredZipArchive(entries: StoredZipSourceEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localFiles: Uint8Array[] = [];
  const centralDirectoryEntries: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    assertSafeZipPath(entry.path);
    const path = encoder.encode(entry.path);
    const crc = crc32(entry.bytes);

    const localHeader = new Uint8Array(30 + path.length + entry.bytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, ZIP_LOCAL_FILE_SIGNATURE, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, entry.bytes.length, true);
    localView.setUint32(22, entry.bytes.length, true);
    localView.setUint16(26, path.length, true);
    localHeader.set(path, 30);
    localHeader.set(entry.bytes, 30 + path.length);
    localFiles.push(localHeader);

    const centralHeader = new Uint8Array(46 + path.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, ZIP_CENTRAL_FILE_SIGNATURE, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, entry.bytes.length, true);
    centralView.setUint32(24, entry.bytes.length, true);
    centralView.setUint16(28, path.length, true);
    centralView.setUint32(42, localOffset, true);
    centralHeader.set(path, 46);
    centralDirectoryEntries.push(centralHeader);

    localOffset += localHeader.length;
  }

  const centralDirectory = concatBytes(centralDirectoryEntries);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, ZIP_EOCD_SIGNATURE, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralDirectory.length, true);
  eocdView.setUint32(16, localOffset, true);

  return concatBytes([...localFiles, centralDirectory, eocd]);
}

function parseStoredZipEntries(data: Uint8Array): StoredZipParsedEntry[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);
  if (eocdOffset < 0) {
    throw new Error("Selected file is not a readable backup ZIP archive.");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const entries: StoredZipParsedEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== ZIP_CENTRAL_FILE_SIGNATURE) {
      throw new Error("Backup ZIP central directory is malformed.");
    }

    const flags = view.getUint16(offset + 8, true);
    const compressionMethod = view.getUint16(offset + 10, true);
    const crc = view.getUint32(offset + 16, true);
    const compressedSizeBytes = view.getUint32(offset + 20, true);
    const sizeBytes = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const path = readUtf8(data, offset + 46, fileNameLength);
    const nextOffset = offset + 46 + fileNameLength + extraLength + commentLength;

    if ((flags & 0x1) === 0x1) {
      throw new Error("Encrypted ZIP entries are not supported for backup containers.");
    }
    if (compressionMethod !== 0) {
      throw new Error("Compressed backup ZIP entries are not supported yet.");
    }
    if (sizeBytes === 0xffffffff || compressedSizeBytes === 0xffffffff || localHeaderOffset === 0xffffffff) {
      throw new Error("ZIP64 backup containers are not supported yet.");
    }
    assertSafeZipPath(path);

    entries.push({
      path,
      sizeBytes,
      compressedSizeBytes,
      crc32: crc,
      compressionMethod,
      dataOffset: findZipEntryDataOffset(view, localHeaderOffset),
    });

    offset = nextOffset;
  }

  return entries;
}

function readStoredZipEntryBytes(data: Uint8Array, entry: StoredZipParsedEntry): Uint8Array {
  if (entry.compressionMethod !== 0) {
    throw new Error("Compressed backup ZIP entries are not supported yet.");
  }
  if (entry.dataOffset + entry.compressedSizeBytes > data.byteLength) {
    throw new Error("Backup ZIP entry points outside the archive.");
  }

  const bytes = data.slice(entry.dataOffset, entry.dataOffset + entry.compressedSizeBytes);
  if (bytes.byteLength !== entry.sizeBytes) {
    throw new Error("Backup ZIP entry size does not match its central directory.");
  }
  if (crc32(bytes) !== entry.crc32) {
    throw new Error("Backup ZIP entry checksum failed.");
  }
  return bytes;
}

function findEndOfCentralDirectory(view: DataView): number {
  const minOffset = Math.max(0, view.byteLength - ZIP_MAX_COMMENT_BYTES - 22);
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (view.getUint32(offset, true) === ZIP_EOCD_SIGNATURE) {
      return offset;
    }
  }
  return -1;
}

function findZipEntryDataOffset(view: DataView, localHeaderOffset: number): number {
  if (localHeaderOffset + 30 > view.byteLength || view.getUint32(localHeaderOffset, true) !== ZIP_LOCAL_FILE_SIGNATURE) {
    throw new Error("Backup ZIP local file header is malformed.");
  }

  const fileNameLength = view.getUint16(localHeaderOffset + 26, true);
  const extraLength = view.getUint16(localHeaderOffset + 28, true);
  return localHeaderOffset + 30 + fileNameLength + extraLength;
}

function assertSafeZipPath(path: string): void {
  const trimmed = path.trim();
  if (!trimmed || trimmed.includes("\0") || trimmed.includes("\\") || trimmed.startsWith("/") || trimmed.endsWith("/")) {
    throw new Error("Backup ZIP contains an unsafe path.");
  }
  if (/^[a-zA-Z]:/.test(trimmed)) {
    throw new Error("Backup ZIP contains an unsafe path.");
  }
  const segments = trimmed.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Backup ZIP contains an unsafe path.");
  }
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff]!;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC32_TABLE = new Uint32Array(
  Array.from({ length: 256 }, (_, index) => {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    return crc >>> 0;
  }),
);

export function summarizeRestorePreview(
  currentWorkspace: WorkspaceData,
  snapshot: BackupSnapshot,
): RestorePreviewSummary {
  const matchedProjectIds = new Set<string>();
  const incomingTitles = snapshot.data.projects.map((project) => project.title);
  const records: RestorePreviewRecord[] = [
    buildMatchedRecord("workspace", snapshot.workspaceId, `Workspace: ${snapshot.data.name}`, currentWorkspace, snapshot.data, [
      { field: "Workspace ID", value: (workspace) => workspace.id },
      { field: "Name", value: (workspace) => workspace.name },
      { field: "Archived projects", value: (workspace) => workspace.archivedProjectCount },
      { field: "Backup policy", value: (workspace) => workspace.backupPolicy },
      { field: "Next backup", value: (workspace) => workspace.nextBackup },
    ]),
  ];

  let matchingProjectCount = 0;
  for (const incomingProject of snapshot.data.projects) {
    const currentProject = findProjectMatch(currentWorkspace.projects, incomingProject, matchedProjectIds);
    if (!currentProject) {
      records.push(newRecord("project", incomingProject.id, `Project: ${incomingProject.title}`));
      records.push(...compareProjectChildren([], incomingProject.openTasks, incomingProject, "task"));
      records.push(...compareProjectChildren([], incomingProject.docs, incomingProject, "document"));
      records.push(...compareProjectChildren([], incomingProject.people, incomingProject, "person"));
      records.push(...compareProjectChildren([], incomingProject.equipment, incomingProject, "equipment"));
      records.push(...compareProjectChildren([], incomingProject.expenses, incomingProject, "expense"));
      continue;
    }

    matchingProjectCount += 1;
    matchedProjectIds.add(currentProject.id);
    records.push(buildMatchedRecord("project", incomingProject.id, `Project: ${incomingProject.title}`, currentProject, incomingProject, projectFields));
    records.push(...compareProjectChildren(currentProject.openTasks, incomingProject.openTasks, incomingProject, "task"));
    records.push(...compareProjectChildren(currentProject.docs, incomingProject.docs, incomingProject, "document"));
    records.push(...compareProjectChildren(currentProject.people, incomingProject.people, incomingProject, "person"));
    records.push(...compareProjectChildren(currentProject.equipment, incomingProject.equipment, incomingProject, "equipment"));
    records.push(...compareProjectChildren(currentProject.expenses, incomingProject.expenses, incomingProject, "expense"));
  }

  const incomingProjectCount = incomingTitles.length;
  const changedRecordCount = records.filter((record) => record.status === "changed").length;
  const unchangedRecordCount = records.filter((record) => record.status === "unchanged").length;
  const newRecordCount = records.filter((record) => record.status === "new").length;
  const planningRecordCount = snapshot.planningExport?.rowCount ?? 0;
  const planningTruncated = snapshot.planningExport?.truncated ?? false;
  const planningRecords: RestorePlanningPreviewRecord[] = (snapshot.planningExport?.records ?? [])
    .slice(0, 5)
    .map((record) => {
      const fieldKeys = Object.keys(record.fields).sort();
      return {
        kind: record.kind,
        id: record.id,
        title: record.title,
        projectId: record.projectId,
        sourcePath: record.sourcePath ?? null,
        fieldCount: fieldKeys.length,
        fieldKeys: fieldKeys.slice(0, 5),
      };
    });
  const planningKindCounts = planningKindCountsFor(snapshot.planningExport?.records ?? []);
  const planningTableCoverage = planningTableCoverageFor(snapshot.planningExport?.records ?? []);
  const warnings: string[] = [];

  if (snapshot.workspaceId !== currentWorkspace.id) {
    warnings.push("Backup workspace ID differs from the current workspace.");
  }
  if (incomingProjectCount === 0) {
    warnings.push("Backup contains no projects.");
  }
  if (snapshot.attachmentManifest.totalAssets > 0) {
    warnings.push("Backup includes attachment metadata only; attachment bytes are not restored by this preview.");
  }
  if (planningRecordCount > 0) {
    warnings.push(`Backup includes ${planningRecordCount} D1 planning rows; planning restore requires the Worker planning commit gate after approval and preflight.`);
  }
  if (planningTruncated) {
    warnings.push("Backup planning export was truncated; create a fresh Worker-backed export before restoring planning records.");
  }
  const fieldConflictCount = records.reduce((total, record) => total + record.fieldChanges.length, 0);
  const applicationPlan = createRestoreApplicationPlan({
    workspaceMatches: snapshot.workspaceId === currentWorkspace.id,
    records,
    planningRecords,
    planningTableCoverage,
    createRecordCount: newRecordCount,
    updateRecordCount: changedRecordCount,
    unchangedRecordCount,
    fieldConflictCount,
    attachmentManifest: snapshot.attachmentManifest,
    planningRecordCount,
    planningTruncated,
  });

  return {
    workspaceId: snapshot.workspaceId,
    createdAt: snapshot.createdAt,
    currentProjectCount: currentWorkspace.projects.length,
    incomingProjectCount,
    matchingProjectCount,
    newProjectCount: incomingProjectCount - matchingProjectCount,
    incomingRecordCount: records.length + planningRecordCount,
    matchingRecordCount: changedRecordCount + unchangedRecordCount,
    newRecordCount,
    changedRecordCount,
    unchangedRecordCount,
    fieldConflictCount,
    planningRecordCount,
    planningTruncated,
    planningRecords,
    planningKindCounts,
    planningTableCoverage,
    applicationPlan,
    records,
    firstProjectTitle: incomingTitles[0] ?? "No projects",
    warnings,
  };
}

function createRestoreApplicationPlan(input: {
  workspaceMatches: boolean;
  records: RestorePreviewRecord[];
  planningRecords: RestorePlanningPreviewRecord[];
  planningTableCoverage: RestorePlanningTableCoverage[];
  createRecordCount: number;
  updateRecordCount: number;
  unchangedRecordCount: number;
  fieldConflictCount: number;
  attachmentManifest: BackupSnapshot["attachmentManifest"];
  planningRecordCount: number;
  planningTruncated: boolean;
}): RestoreApplicationPlan {
  const blockers = ["Destructive restore commits require Worker approval, application preflight, exact confirmation, and pre-restore backup proof."];
  if (!input.workspaceMatches) {
    blockers.push("Backup workspace ID must match the current workspace before a restore can be applied.");
  }
  if (input.attachmentManifest.totalAssets > 0) {
    blockers.push("Attachment bytes are metadata-only in this backup preview and require a separate restore packaging path.");
  }
  if (input.planningRecordCount > 0) {
    blockers.push("D1 planning rows require the Worker planning commit gate after approval and preflight.");
  }
  if (input.planningTruncated) {
    blockers.push("Planning rows were truncated; create a fresh backup before applying planning restores.");
  }

  return {
    mode: "preview_only",
    destructiveWrite: false,
    canApply: false,
    requiresWorkerCommit: true,
    preRestoreBackupRequired: true,
    operationPolicy: "preview_only",
    operationCount: input.records.length + input.planningRecordCount,
    operationSamples: restoreApplicationOperationSamples(input.records, input.planningRecords),
    tablePlan: restoreApplicationTablePlan(input.records, input.planningTableCoverage),
    createRecordCount: input.createRecordCount,
    updateRecordCount: input.updateRecordCount,
    unchangedRecordCount: input.unchangedRecordCount,
    fieldConflictCount: input.fieldConflictCount,
    attachmentPolicy: input.attachmentManifest.totalAssets > 0 ? "metadata_only" : "not_included",
    attachmentAssetCount: input.attachmentManifest.totalAssets,
    attachmentPackagePlan: createRestoreAttachmentPackagePlan(input.attachmentManifest),
    planningPolicy: input.planningRecordCount > 0 ? "preview_only" : "not_included",
    planningRecordCount: input.planningRecordCount,
    blockers,
  };
}

function createRestoreAttachmentPackagePlan(
  manifest: BackupSnapshot["attachmentManifest"],
): RestoreAttachmentPackagePlan {
  if (manifest.totalAssets === 0) {
    return {
      policy: "not_included",
      packageRequired: false,
      byteRestoreSupport: "not_included",
      metadataRecordCount: 0,
      stagedLocalRecordCount: 0,
      r2DryRunRecordCount: 0,
      storedR2RecordCount: 0,
      totalSourceBytes: 0,
      blockers: [],
    };
  }

  return {
    policy: "metadata_only",
    packageRequired: true,
    byteRestoreSupport: "blocked",
    metadataRecordCount: manifest.totalAssets,
    stagedLocalRecordCount: manifest.stagedLocal,
    r2DryRunRecordCount: manifest.r2DryRun,
    storedR2RecordCount: manifest.storedR2,
    totalSourceBytes: manifest.totalSourceBytes,
    blockers: [
      "Attachment metadata can be previewed, but byte restore requires a verified attachment package.",
      "Destructive attachment restore is blocked until package verification and destination write rules exist.",
    ],
  };
}

function restoreApplicationOperationSamples(
  records: RestorePreviewRecord[],
  planningRecords: RestorePlanningPreviewRecord[],
): RestoreApplicationOperation[] {
  const orderedRecords = [
    ...records.filter((record) => record.status === "changed"),
    ...records.filter((record) => record.status === "new"),
    ...records.filter((record) => record.status === "unchanged"),
  ];
  const recordSamples = orderedRecords.slice(0, 6).map((record): RestoreApplicationOperation => ({
    entityType: record.entityType,
    entityId: record.entityId,
    label: record.label,
    action: restoreRecordAction(record.status),
    status: record.status,
    fieldConflictCount: record.fieldChanges.length,
    blockers: record.status === "unchanged" ? [] : ["Workspace snapshot writes require the Worker application commit gate after approval and preflight."],
  }));
  const remainingSampleSlots = Math.max(0, 8 - recordSamples.length);
  const planningSamples = planningRecords.slice(0, remainingSampleSlots).map((record): RestoreApplicationOperation => ({
    entityType: "planning",
    entityId: record.id,
    label: `Planning: ${record.title}`,
    action: "skip",
    status: "preview_only",
    fieldConflictCount: 0,
    blockers: ["D1 planning rows require the Worker planning commit gate after approval and preflight."],
  }));

  return [...recordSamples, ...planningSamples];
}

function restoreApplicationTablePlan(
  records: RestorePreviewRecord[],
  planningTableCoverage: RestorePlanningTableCoverage[],
): RestoreApplicationTablePlan[] {
  const tableRows = Object.entries(RESTORE_ENTITY_TABLES)
    .map(([entityType, tableName]): RestoreApplicationTablePlan => {
      const typedEntity = entityType as RestorePreviewRecord["entityType"];
      const matchingRecords = records.filter((record) => record.entityType === typedEntity);
      return {
        tableName,
        source: "workspace_snapshot",
        entityType: typedEntity,
        operationCount: matchingRecords.length,
        createCount: matchingRecords.filter((record) => record.status === "new").length,
        updateCount: matchingRecords.filter((record) => record.status === "changed").length,
        skipCount: matchingRecords.filter((record) => record.status === "unchanged").length,
        previewOnlyCount: 0,
        fieldConflictCount: matchingRecords.reduce((total, record) => total + record.fieldChanges.length, 0),
        restoreSupport: "commit_supported",
        blockers: matchingRecords.some((record) => record.status !== "unchanged")
          ? ["Workspace snapshot writes require the Worker application commit gate after approval and preflight."]
          : [],
      };
    })
    .filter((row) => row.operationCount > 0);

  const planningRows = planningTableCoverage
    .filter((coverage) => coverage.recordCount > 0)
    .map((coverage): RestoreApplicationTablePlan => ({
      tableName: coverage.tableName,
      source: "d1_planning_export",
      entityType: "planning",
      operationCount: coverage.recordCount,
      createCount: 0,
      updateCount: 0,
      skipCount: 0,
      previewOnlyCount: coverage.recordCount,
      fieldConflictCount: 0,
      restoreSupport: "preview_only",
      blockers: ["D1 planning rows require the Worker planning commit gate after approval and preflight."],
    }));

  return [...tableRows, ...planningRows]
    .sort((left, right) => left.tableName.localeCompare(right.tableName));
}

function restoreRecordAction(status: RestorePreviewRecord["status"]): RestoreApplicationOperation["action"] {
  if (status === "new") return "create";
  if (status === "changed") return "update";
  return "skip";
}

function planningKindCountsFor(records: BackupPlanningRecord[]): RestorePlanningKindCount[] {
  const counts = new Map<BackupPlanningRecord["kind"], number>();
  for (const record of records) {
    counts.set(record.kind, (counts.get(record.kind) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((left, right) => left.kind.localeCompare(right.kind));
}

function planningTableCoverageFor(records: BackupPlanningRecord[]): RestorePlanningTableCoverage[] {
  const counts = new Map<BackupPlanningRecord["kind"], number>();
  for (const record of records) {
    counts.set(record.kind, (counts.get(record.kind) ?? 0) + 1);
  }
  return PLANNING_TABLES.map((table) => {
    const recordCount = counts.get(table.kind) ?? 0;
    return {
      kind: table.kind,
      tableName: table.tableName,
      recordCount,
      included: recordCount > 0,
      restoreSupport: recordCount > 0 ? "preview_only" : "not_included",
    };
  });
}

const projectFields: ComparableField<FilmProject>[] = [
  { field: "Title", value: (project) => project.title },
  { field: "Type", value: (project) => project.type },
  { field: "Runtime", value: (project) => project.runtimeMinutes },
  { field: "Format", value: (project) => project.format },
  { field: "Phase", value: (project) => project.phase },
  { field: "Progress", value: (project) => project.progress },
  { field: "Shoot dates", value: (project) => project.shootDates },
  { field: "Spent budget", value: (project) => project.spentBudget },
  { field: "Total budget", value: (project) => project.totalBudget },
  { field: "Location", value: (project) => project.location },
  { field: "Workflow", value: (project) => project.workflow },
  { field: "Description", value: (project) => project.description },
  { field: "Open tasks done", value: (project) => project.tasks.done },
  { field: "Open tasks total", value: (project) => project.tasks.total },
  { field: "Call time", value: (project) => project.callSheet.callTime },
  { field: "Wrap time", value: (project) => project.callSheet.wrapTime },
  { field: "Call sheet location", value: (project) => project.callSheet.location },
  { field: "Call sheet day", value: (project) => project.callSheet.dayNumber },
  { field: "Call sheet scenes", value: (project) => project.callSheet.scenes },
  { field: "Call sheet people", value: (project) => project.callSheet.people },
];

const taskFields: ComparableField<ProjectTask>[] = [
  { field: "Title", value: (task) => task.title },
  { field: "Due", value: (task) => task.due },
  { field: "Status", value: (task) => task.status },
];

const docFields: ComparableField<ProjectDoc>[] = [
  { field: "Name", value: (doc) => doc.name },
  { field: "Date", value: (doc) => doc.date },
  { field: "Type", value: (doc) => doc.type },
  { field: "Source path", value: (doc) => doc.sourcePath },
  { field: "Source size", value: (doc) => doc.sourceSizeBytes },
  { field: "Content type", value: (doc) => doc.sourceContentType },
  { field: "Attachment status", value: (doc) => doc.attachmentStatus },
  { field: "Attachment SHA-256", value: (doc) => doc.attachmentSha256 },
  { field: "R2 object key", value: (doc) => doc.attachmentR2ObjectKey },
  { field: "Markdown snapshot", value: (doc) => doc.markdownSnapshot },
];

const personFields: ComparableField<ProjectPerson>[] = [
  { field: "Name", value: (person) => person.name },
  { field: "Role", value: (person) => person.role },
  { field: "Initials", value: (person) => person.initials },
];

const equipmentFields: ComparableField<EquipmentItem>[] = [
  { field: "Name", value: (item) => item.name },
  { field: "Status", value: (item) => item.status },
  { field: "Status tone", value: (item) => item.statusTone },
];

const expenseFields: ComparableField<ExpenseLine>[] = [
  { field: "Category", value: (expense) => expense.category },
  { field: "Spent", value: (expense) => expense.spent },
  { field: "Budget", value: (expense) => expense.budget },
  { field: "Percent", value: (expense) => expense.percent },
];

function compareProjectChildren<T>(
  currentItems: T[],
  incomingItems: T[],
  project: FilmProject,
  entityType: RestorePreviewRecord["entityType"],
): RestorePreviewRecord[] {
  const usedIndexes = new Set<number>();
  return incomingItems.map((incomingItem) => {
    const currentItem = findRecordMatch(currentItems, incomingItem, usedIndexes, entityType);
    if (!currentItem) {
      return newRecord(entityType, entityIdFor(entityType, project, incomingItem), labelFor(entityType, incomingItem));
    }
    return buildMatchedRecord(
      entityType,
      entityIdFor(entityType, project, incomingItem),
      labelFor(entityType, incomingItem),
      currentItem,
      incomingItem,
      fieldsFor(entityType) as ComparableField<T>[],
    );
  });
}

function findProjectMatch(
  currentProjects: FilmProject[],
  incomingProject: FilmProject,
  matchedProjectIds: Set<string>,
): FilmProject | undefined {
  const byId = currentProjects.find((project) => project.id === incomingProject.id && !matchedProjectIds.has(project.id));
  if (byId) return byId;
  return currentProjects.find(
    (project) => !matchedProjectIds.has(project.id) && normalizeTitle(project.title) === normalizeTitle(incomingProject.title),
  );
}

function findRecordMatch<T>(
  currentItems: T[],
  incomingItem: T,
  usedIndexes: Set<number>,
  entityType: RestorePreviewRecord["entityType"],
): T | undefined {
  const incomingId = idFor(entityType, incomingItem);
  const idIndex = incomingId
    ? currentItems.findIndex((item, index) => !usedIndexes.has(index) && idFor(entityType, item) === incomingId)
    : -1;
  if (idIndex >= 0) {
    usedIndexes.add(idIndex);
    return currentItems[idIndex];
  }

  const incomingKey = naturalKeyFor(entityType, incomingItem);
  const keyIndex = currentItems.findIndex(
    (item, index) => !usedIndexes.has(index) && naturalKeyFor(entityType, item) === incomingKey,
  );
  if (keyIndex >= 0) {
    usedIndexes.add(keyIndex);
    return currentItems[keyIndex];
  }
  return undefined;
}

function buildMatchedRecord<T>(
  entityType: RestorePreviewRecord["entityType"],
  entityId: string,
  label: string,
  currentRecord: T,
  incomingRecord: T,
  fields: ComparableField<T>[],
): RestorePreviewRecord {
  const fieldChanges = fields
    .filter(({ value }) => !isSameValue(value(currentRecord), value(incomingRecord)))
    .map(({ field, value }) => ({
      field,
      currentValue: formatRestoreValue(value(currentRecord)),
      incomingValue: formatRestoreValue(value(incomingRecord)),
    }));

  return {
    entityType,
    entityId,
    label,
    status: fieldChanges.length > 0 ? "changed" : "unchanged",
    fieldChanges,
  };
}

function newRecord(
  entityType: RestorePreviewRecord["entityType"],
  entityId: string,
  label: string,
): RestorePreviewRecord {
  return {
    entityType,
    entityId,
    label,
    status: "new",
    fieldChanges: [],
  };
}

function fieldsFor(entityType: RestorePreviewRecord["entityType"]): ComparableField<unknown>[] {
  if (entityType === "task") return taskFields as ComparableField<unknown>[];
  if (entityType === "document") return docFields as ComparableField<unknown>[];
  if (entityType === "person") return personFields as ComparableField<unknown>[];
  if (entityType === "equipment") return equipmentFields as ComparableField<unknown>[];
  if (entityType === "expense") return expenseFields as ComparableField<unknown>[];
  return [];
}

function idFor<T>(entityType: RestorePreviewRecord["entityType"], item: T): string | null {
  if (entityType === "task" || entityType === "document") {
    const candidate = item as ProjectTask | ProjectDoc;
    return candidate.id;
  }
  if (entityType === "person" || entityType === "equipment" || entityType === "expense") {
    const candidate = item as ProjectPerson | EquipmentItem | ExpenseLine;
    return typeof candidate.id === "string" && candidate.id ? candidate.id : null;
  }
  return null;
}

function entityIdFor<T>(entityType: RestorePreviewRecord["entityType"], project: FilmProject, item: T): string {
  const directId = idFor(entityType, item);
  if (directId) return directId;
  return `${project.id}:${entityType}:${safeRestoreRecordKey(naturalKeyFor(entityType, item))}`;
}

function labelFor<T>(entityType: RestorePreviewRecord["entityType"], item: T): string {
  if (entityType === "task") return `Task: ${(item as ProjectTask).title}`;
  if (entityType === "document") return `Document: ${(item as ProjectDoc).name}`;
  if (entityType === "person") {
    const person = item as ProjectPerson;
    return `Person: ${person.name}`;
  }
  if (entityType === "equipment") return `Equipment: ${(item as EquipmentItem).name}`;
  if (entityType === "expense") return `Expense: ${(item as ExpenseLine).category}`;
  return String(entityType);
}

function naturalKeyFor<T>(entityType: RestorePreviewRecord["entityType"], item: T): string {
  if (entityType === "task") return normalizeTitle((item as ProjectTask).title);
  if (entityType === "document") return normalizeTitle((item as ProjectDoc).name);
  if (entityType === "person") {
    const person = item as ProjectPerson;
    return normalizeTitle(person.name);
  }
  if (entityType === "equipment") return normalizeTitle((item as EquipmentItem).name);
  if (entityType === "expense") return normalizeTitle((item as ExpenseLine).category);
  return "";
}

function isSameValue(currentValue: unknown, incomingValue: unknown): boolean {
  return JSON.stringify(normalizeRestoreValue(currentValue)) === JSON.stringify(normalizeRestoreValue(incomingValue));
}

function normalizeRestoreValue(value: unknown): unknown {
  return value === undefined ? null : value;
}

function formatRestoreValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "blank";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return truncateRestoreValue(value);
  if (typeof value === "number") return String(value);
  return truncateRestoreValue(JSON.stringify(value));
}

function truncateRestoreValue(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 96 ? `${compact.slice(0, 93)}...` : compact;
}

function assertPassphrase(passphrase: string): void {
  if (passphrase.trim().length < 12) {
    throw new Error("Backup passphrase must be at least 12 characters");
  }
}

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}

function safeRestoreRecordKey(value: string): string {
  return normalizeTitle(value).replace(/[^a-z0-9._:-]+/g, "_").replace(/^_+|_+$/g, "") || "record";
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = ITERATIONS,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function toUint8Array(value: ArrayBuffer | Uint8Array): Uint8Array {
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

function readUtf8(data: Uint8Array, offset: number, length: number): string {
  return new TextDecoder().decode(data.slice(offset, offset + length));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
