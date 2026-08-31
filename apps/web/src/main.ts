import {
  addProductionShootDay,
  addManualScreenplayElementOccurrence,
  addExistingScreenplayElementOccurrence,
  aggregateScreenplayReviewState,
  analyzeProductionSchedule,
  analyzeProductionScheduleScenario,
  applyProductionLocationToCallSheet,
  applyProductionTalentToCallSheet,
  applyScreenplayElementsToScene,
  buildScreenplayElementReport,
  buildProductionCallSheetManifest,
  buildProductionLocationManifest,
  buildProductionShotManifest,
  buildProductionSidesManifest,
  buildProductionTalentManifest,
  carryForwardScreenplayRevisionPlanning,
  carryForwardScreenplayReviewState,
  compareProductionScheduleScenarios,
  compareScreenplayRevisions,
  createAuditEvent,
  createBackupSnapshot,
  createEquipmentItem,
  createExpenseLine,
  createFilmProjectFromTemplate,
  createOperation,
  createProductionAvailabilityWindow,
  createProductionBudgetScenario,
  createProductionCallSheetFromScheduleDay,
  createProductionLocation,
  createProductionShot,
  createProductionTalent,
  createProductionReportFromCallSheet,
  createProjectPerson,
  createProjectDoc,
  createTask,
  createProductionScheduleFromBreakdown,
  duplicateProductionSchedule,
  estimateProductionBudget,
  formatCurrency,
  formatWorkspaceRole,
  getFilmProfileMutationFieldDefinitions,
  getRecordMutationFieldDefinitions,
  getProjectById,
  normalizeFilmProfileMutationFieldKeys,
  normalizeRecordMutationFieldKeysForEntity,
  normalizeScreenplayElementName,
  orderScreenplayScenesByProductionSchedule,
  moveProductionScheduleScene,
  moveProductionScheduleScenePart,
  moveProductionScheduleStrips,
  moveScreenplayElementCategoryInWorkspace,
  mergeProductionScheduleSceneParts,
  mergeScreenplayElementsInWorkspace,
  reconcileProductionScheduleScenes,
  removeProductionAvailabilityWindow,
  removeProductionShootDay,
  reorderProductionScheduleScene,
  reorderProductionScheduleScenePart,
  reorderProductionShot,
  setProductionScheduleStatus,
  setProductionScheduleCastDayStatus,
  setProductionCallSheetStatus,
  setProductionReportStatus,
  searchScreenplayScenes,
  seedWorkspace,
  splitProductionScheduleScene,
  suggestScreenplayElementDuplicates,
  syncProductionCallSheetFromScheduleDay,
  updateProductionShootDay,
  updateProductionBudgetScenario,
  updateProductionCallSheet,
  updateProductionCallSheetCastCall,
  updateProductionLocation,
  updateProductionShot,
  updateProductionTalent,
  summarizeProductionReport,
  updateProductionReport,
  updateProductionReportSceneResult,
  updateProductionScheduleAssumptions,
  type BackupPlanningExport,
  type BackupPlanningRecord,
  type EquipmentItem,
  type FilmProject,
  type FilmProfileMutationFieldDefinition,
  type IntegrationKey,
  type OperationRecord,
  type ProductionAvailabilityWindow,
  type ProductionBudgetScenario,
  type ProductionCastDayStatus,
  type ProductionCallSheet,
  type ProductionCallSheetManifest,
  type ProductionDailyReport,
  type ProductionLocation,
  type ProductionLocationManifest,
  type ProductionLocationPermitStatus,
  type ProductionLocationStatus,
  type ProductionShot,
  type ProductionShotManifest,
  type ProductionShotStatus,
  type ProductionSidesManifest,
  type ProductionTalent,
  type ProductionTalentManifest,
  type ProductionTalentPaperworkStatus,
  type ProductionTalentRateBasis,
  type ProductionTalentStatus,
  type ProductionReportSceneStatus,
  type ProductionScheduleAnalysis,
  type ProductionScheduleScenePart,
  type ProductionScheduleScenarioComparison,
  type ProductionScheduleStripReference,
  type ProductionScheduleVersion,
  type ProductionUnit,
  type ProjectDoc,
  type RecordMutationFieldDefinition,
  type ScreenplayBreakdown,
  type ScreenplayElementCategory,
  type ScreenplayRevisionComparison,
  type ScreenplayRevisionSceneChange,
  type ScreenplayReviewState,
  type WorkspaceRole,
  type WorkspaceData,
} from "@film/schema";
import {
  createEncryptedBackupZipBundle,
  decryptEncryptedBackupBundle,
  decryptEncryptedBackupZipBundle,
  summarizeRestorePreview,
  type BackupSnapshot,
  type EncryptedBackupBundle,
  type RestorePreviewSummary,
} from "@film/backup";
import {
  commitRestoreAttachmentObject,
  runRestoreApprovalDryRun,
  runRestoreApplicationCommit,
  runRestoreApplicationDryRun,
  runRestoreAttachmentObjectCommitPreflight,
  runRestoreAttachmentPackageDryRun,
  runRestoreAttachmentPackageVerificationDryRun,
  runRestoreAttachmentObjectPlanDryRun,
  runRestoreCommitDryRun,
  runRestoreCommitStorageDryRun,
  runRestorePlanningCommit,
  runRestorePlanningDryRun,
  type RestoreApplicationCommitResult,
  type RestoreApplicationDryRunResult,
  type RestoreAttachmentPackageDryRunResult,
  type RestoreAttachmentPackageManifestRequest,
  type RestoreAttachmentPackageVerificationDryRunResult,
  type RestoreAttachmentObjectCommitPreflightResult,
  type RestoreAttachmentObjectCommitResult,
  type RestoreAttachmentObjectPlanDryRunResult,
  type RestoreApprovalDryRunResult,
  type RestoreCommitDryRunResult,
  type RestoreCommitStorageDryRunResult,
  type RestorePlanningCommitResult,
  type RestorePlanningDryRunResult,
  type RestorePlanningPreviewDetail,
  type RestorePlanningTableSummary,
  type RestoreCoreRecordRequest,
} from "./restore-client";
import {
  logoutSession,
  readSessionMetadata,
  requestMagicLink,
  verifyMagicLink,
  type FilmSession,
} from "./auth-client";
import { readCanonicalWorkspaceSnapshot } from "./workspace-client";
import { reconcileCanonicalWorkspace } from "./workspace-sync";
import { saveCanonicalDocumentMarkdown } from "./document-client";
import {
  createStoredBackupObjectDownloadPlan,
  downloadStoredBackupObject,
  exportStoredBackupManifest,
  runBackupDryRun,
  runPlanningExportDryRun,
  storeBackupObject,
  type BackupDryRunRestorePoint,
} from "./backup-client";
import {
  applyNotionImport,
  previewScreenplayFiles,
  type AppliedNotionImportSummary,
  type NotionExportFile,
  type NotionImportPreview,
  type NotionPlanningRecord,
  type ScreenplayImportPreview,
} from "@film/importers";
import {
  TELNYX_SMS_CATEGORIES,
  TELNYX_SMS_CATEGORY_LABELS,
  TELNYX_SMS_CONSENT_DISCLOSURE,
  TELNYX_SMS_DISCLOSURE_VERSION,
  isTelnyxSmsCategory,
  type GoogleDriveSyncDryRunStatus,
  type ProviderDryRunStatus,
} from "@film/providers";
import { filterProjectsBySearch } from "./project-search";
import {
  createNotionManifest,
  createNotionZipManifest,
  openNotionZip,
  readNotionImportFiles,
  readNotionZipImportFiles,
  type BrowserNotionImportFile,
  type BrowserImportFile,
} from "./import-preview";
import { stageNotionAttachmentBlobs, type AttachmentStageSummary } from "./attachment-stage";
import { commitNotionCoreRecords, type NotionCoreCommitSummary } from "./notion-core-client";
import {
  applyAttachmentCommitResults,
  applyAttachmentStoreResults,
  collectStagedAttachmentMetadata,
  collectUploadableAttachmentMetadata,
  createAttachmentCommitRequests,
  uploadAttachmentObject,
  type AttachmentCommitRequest,
  type AttachmentCommitResult,
  type AttachmentUploadCandidate,
  type AttachmentUploadIntent,
  type AttachmentStoreResult,
} from "./attachment-upload";
import {
  checkMetaConnection,
  checkGoogleConnection,
  checkProviderRuntimeReadiness,
  checkStripeSummaryReadiness,
  checkTelnyxProviderStatus,
  commitSmsSelfConsent,
  disconnectMeta,
  disconnectGoogle,
  fetchMetaAnalytics,
  fetchMetaPageCandidates,
  fetchGoogleDriveManifest,
  fetchSmsConsentManifest,
  fetchStripeSummary,
  runGoogleDriveSyncDryRun,
  runProviderDryRun,
  sendSmsBatch,
  selectMetaPage,
  startMetaOAuth,
  startGoogleOAuth,
  type GoogleConnectionStatus,
  type GoogleDriveManifestResult,
  type MetaAnalyticsResult,
  type MetaConnectionStatus,
  type MetaPageCandidate,
  type ProviderRuntimeReadiness,
  type SmsConsentManifest,
  type SmsConsentCategory,
  type StripeSummaryResult,
  type StripeSummaryReadiness,
  type TelnyxProviderReadiness,
} from "./provider-client";
import { exportWorkerAuditEventManifest, type WorkerAuditEventManifest } from "./audit-client";
import {
  acceptWorkspaceInvite,
  checkInviteDeliveryReadiness,
  createWorkspaceInvite,
  exportInviteDeliverySuppressions,
  exportWorkspaceInviteManifest,
  revokeWorkspaceInvite,
  type InviteDeliveryReadiness,
  type InviteDeliverySuppressionManifestResult,
  type WorkspaceInviteManifestResult,
} from "./invite-client";
import {
  applyFilmProfileMutationRequest,
  applyRecordMutationRequest,
  assignProjectMembership,
  assignRecordPermission,
  createFilmProfileMutationRequest,
  createRecordMutationRequest,
  createRecordCommentIntent,
  createRecordMutationRollbackRequest,
  exportFilmProfileMutationRequestManifest,
  exportExpiredRecordPermissionManifest,
  exportProjectMembershipHistory,
  exportProjectMembershipManifest,
  exportRecordMutationAuditManifest,
  exportRecordMutationRequestManifest,
  exportRecordCommentManifest,
  exportRecordOwnerHistory,
  exportRecordOwnerManifest,
  exportRecordPermissionHistory,
  exportRecordPermissionManifest,
  preflightRecordMutation,
  previewFilmProfileMutationDiff,
  previewRecordMutationDiff,
  previewRecordMutationDeleteRecoveryPlan,
  resolveFilmProfileMutationRequest,
  resolveRecordMutationRequest,
  revokeProjectMembership,
  revokeRecordPermission,
  transferRecordOwner,
  updateWorkspaceMemberStatus,
  type CoreRecordOwnerEntityType,
  type FilmProfileMutationApplyResult,
  type FilmProfileMutationDiffPreviewResult,
  type FilmProfileMutationRequestManifestResult,
  type FilmProfileMutationRequestResult,
  type FilmProfileMutationResolutionResult,
  type RecordMutationAuditManifestResult,
  type ProjectMembershipHistoryResult,
  type ProjectMembershipManifestResult,
  type RecordCommentEntityType,
  type RecordCommentIntentResult,
  type RecordCommentManifestResult,
  type RecordMutationKind,
  type RecordMutationApplyResult,
  type RecordMutationDeleteRecoveryPlanResult,
  type RecordMutationDiffPreviewResult,
  type RecordMutationPreflightResult,
  type RecordMutationRollbackRequestResult,
  type RecordMutationResolutionResult,
  type RecordMutationRequestManifestResult,
  type RecordMutationRequestResult,
  type RecordOwnerHistoryResult,
  type RecordOwnerManifestResult,
  type RecordPermissionHistoryEntityType,
  type RecordPermissionHistoryResult,
  type WorkspaceMemberManagedStatus,
  type RecordPermissionLevel,
  type RecordPermissionManifestResult,
} from "./membership-client";
import {
  createStoredAttachmentPackageDryRun,
  downloadStoredAttachmentPackage,
  downloadStoredAttachmentObject,
  exportStoredAttachmentManifest,
  readStoredAttachmentPackageManifest,
  readStoredAttachmentPackageObjects,
  type StoredAttachmentExportObject,
  type StoredAttachmentPackageDryRun,
} from "./attachment-export-client";
import {
  appendLocalAuditEvent,
  persistAttachmentBlobs,
  readAttachmentBlob,
  countQueuedOperations,
  loadLocalMirror,
  markOperationsSynced,
  persistLocalMirror,
} from "./local-mirror";
import "./styles.css";

type ViewMode = "list" | "board";
type WorkspaceSection =
  | "slate"
  | "projects"
  | "breakdown"
  | "schedule"
  | "shots"
  | "call-sheets"
  | "sides"
  | "reports"
  | "locations"
  | "talent"
  | "tasks"
  | "docs"
  | "people"
  | "equipment"
  | "expenses"
  | "planning"
  | "backups";
type PlanningKindFilter = "all" | NotionPlanningRecord["kind"];
type ScreenplayElementFilter = "all" | ScreenplayElementCategory;
type ScreenplaySceneOrder = "script" | "schedule";
type InspectorTab = "details" | "activity";
type InspectorView =
  | "overview"
  | "team"
  | "ownership"
  | "changes"
  | "permissions"
  | "integrations"
  | "imports";
type ChangeRequestKind = "record" | "profile";
type PermissionScope = "project" | "task" | "document";

type ScreenplayElementClipboardState = {
  breakdownId: string;
  sourceSceneId: string;
  sourceSceneLabel: string;
  elementIds: string[];
};

type ProductionScheduleStripSelectionState = {
  scheduleId: string;
  strips: ProductionScheduleStripReference[];
};

type UiState = {
  selectedProjectId: string;
  selectedDocId: string | null;
  selectedScreenplayId: string | null;
  selectedScreenplayBaseId: string | null;
  selectedScreenplaySceneId: string | null;
  selectedScheduleId: string | null;
  selectedComparisonScheduleId: string | null;
  selectedCallSheetId: string | null;
  selectedProductionReportId: string | null;
  selectedProductionLocationId: string | null;
  selectedProductionTalentId: string | null;
  selectedProductionShotId: string | null;
  productionShotSceneFilter: string | null;
  screenplayElementFilter: ScreenplayElementFilter;
  screenplaySceneOrder: ScreenplaySceneOrder;
  screenplaySearch: string;
  viewMode: ViewMode;
  workspaceSection: WorkspaceSection;
  planningKindFilter: PlanningKindFilter;
  inspectorTab: InspectorTab;
  inspectorView: InspectorView;
  changeRequestKind: ChangeRequestKind;
  permissionScope: PermissionScope;
  filter: string;
  projectCreateOpen: boolean;
  toast: string | null;
};
type NotionImportState = AppliedNotionImportSummary & {
  importedAt: string;
  sourceLabel: string;
  totalFiles: number;
  acceptedFiles: number;
  candidateCount: number;
  attachmentsStaged: number;
  attachmentBytesStaged: number;
  attachmentDryRunCommitted: number;
  attachmentUploadMode: string;
  attachmentPersistence: string;
  coreCommitted: number;
  coreIdempotent: number;
  coreUpdatePreview: number;
  coreRejected: number;
  coreCommitPersistence: string;
  coreCommitAuditPersistence: string;
  planningCommitted: number;
  planningIdempotent: number;
  planningUpdatePreview: number;
  planningRejected: number;
  planningCommitPersistence: string;
  planningCommitAuditPersistence: string;
  planningTableSummary: NotionPlanningTableSummary[];
  planningUpdatePreviewDetails: NotionPlanningUpdatePreviewDetail[];
};
type NotionImportSource = {
  sourceLabel: string;
  manifest: NotionExportFile[];
  readFiles: (allowedPaths: ReadonlySet<string>) => Promise<BrowserNotionImportFile[]>;
};
type ProviderPreviewState = ProviderDryRunStatus & {
  checkedAt: string;
  auditPersistence: string | null;
};
type ProviderRuntimeReadinessState = ProviderRuntimeReadiness & {
  checkedAt: string;
  persistence: string;
  auditPersistence: string | null;
};
type GoogleDriveSyncState = GoogleDriveSyncDryRunStatus & {
  checkedAt: string;
  auditPersistence: string | null;
};
type GoogleConnectionState = GoogleConnectionStatus & {
  checkedAt: string;
};
type GoogleDriveManifestState = GoogleDriveManifestResult & {
  checkedAt: string;
};
type MetaConnectionState = MetaConnectionStatus & {
  checkedAt: string;
};
type MetaPageCandidatesState = {
  pages: MetaPageCandidate[];
  persistence: string;
  connectionPersistence: string;
  auditPersistence: string | null;
  checkedAt: string;
};
type MetaAnalyticsState = MetaAnalyticsResult & {
  persistence: string;
  connectionPersistence: string;
  auditPersistence: string | null;
  checkedAt: string;
};
type StripeSummaryState = StripeSummaryReadiness & {
  persistence: string;
  auditPersistence: string | null;
  checkedAt: string;
};
type StripeSummaryResultState = StripeSummaryResult & {
  persistence: string;
  auditPersistence: string | null;
  checkedAt: string;
};
type SmsConsentManifestState = SmsConsentManifest & {
  checkedAt: string;
};
type TelnyxProviderReadinessState = TelnyxProviderReadiness & {
  persistence: string;
  auditPersistence: string | null;
  checkedAt: string;
};
type WorkerAuditManifestState = {
  checkedAt: string;
  persistence: string;
  auditPersistence: string | null;
  metadataPolicy: WorkerAuditEventManifest["metadataPolicy"];
  rowCount: number;
  truncated: boolean;
  offset: number;
  nextOffset: number | null;
  actionPrefix: string | null;
  events: WorkerAuditEventManifest["events"];
};
type RecordPermissionManifestState = {
  checkedAt: string;
  targetLabel: string;
  persistence: string;
  auditPersistence: string | null;
  entityType: RecordPermissionManifestResult["entityType"];
  entityId: string;
  manifestPolicy: RecordPermissionManifestResult["manifestPolicy"];
  rowCount: number;
  truncated: boolean;
  permissions: RecordPermissionManifestResult["permissions"];
};
type RecordPermissionHistoryState = {
  checkedAt: string;
  targetLabel: string;
  persistence: string;
  auditPersistence: string | null;
  historyPolicy: RecordPermissionHistoryResult["historyPolicy"];
  rowCount: number;
  truncated: boolean;
  target: {
    entityType: RecordPermissionHistoryEntityType;
    entityId: string;
  };
  entries: RecordPermissionHistoryResult["entries"];
};
type ScreenplayImportState = ScreenplayImportPreview & {
  importedAt: string;
  docsCreated: number;
  breakdownsCreated: number;
  scenesParsed: number;
  elementsSuggested: number;
};
type BackupDryRunState = {
  checkedAt: string;
  persistence: string;
  storagePersistence: string | null;
  retentionPolicy: string;
  restorePointId: string;
  restorePointLabel: string;
  snapshotRef: string;
  objectKey: string | null;
  sizeBytes: number | null;
};
type BackupExportState = {
  rowCount: number;
  truncated: boolean;
  persistence: string;
  checkedAt: string;
};
type RestoreGateState = {
  checkedAt: string;
  commitStatus: string;
  restoreMode: string;
  destructiveWrite: boolean;
  preRestoreBackupRequired: boolean;
  preRestoreBackupId: string | null;
  preRestoreBackupVerified: boolean;
  preRestoreBackupPersistence: string;
  preRestoreBackupBlocker: string | null;
  authorizationPolicy: string;
  auditPersistence: string | null;
};
type RestoreApprovalState = {
  checkedAt: string;
  approvalId: string | null;
  approvalStatus: string;
  approvalPersistence: string;
  approvalBlockers: string[];
  commitStatus: string;
  destructiveWrite: boolean;
  preRestoreBackupId: string | null;
  preRestoreBackupVerified: boolean;
  preRestoreBackupPersistence: string;
  preRestoreBackupBlocker: string | null;
  auditPersistence: string | null;
};
type RestoreCommitAttemptState = {
  checkedAt: string;
  approvalId: string;
  approvalStatus: string;
  approvalPersistence: string;
  commitAttemptId: string | null;
  commitAttemptStatus: string;
  commitAttemptPersistence: string;
  commitStatus: string;
  restoreMode: string;
  destructiveWrite: boolean;
  preRestoreBackupId: string | null;
  preRestoreBackupVerified: boolean;
  preRestoreBackupPersistence: string;
  preRestoreBackupBlocker: string | null;
  auditPersistence: string | null;
};
type RestoreApplicationPreflightState = {
  checkedAt: string;
  approvalId: string;
  approvalStatus: string;
  approvalPersistence: string;
  commitAttemptId: string | null;
  commitAttemptStatus: string;
  commitAttemptPersistence: string;
  applicationPreflightId: string | null;
  applicationPreflightStatus: string;
  applicationPreflightPersistence: string;
  commitStatus: string;
  restoreMode: string;
  destructiveWrite: boolean;
  preRestoreBackupId: string | null;
  preRestoreBackupVerified: boolean;
  preRestoreBackupPersistence: string;
  preRestoreBackupBlocker: string | null;
  rollbackGuidance: {
    blockers?: string[];
    requiredBeforeApply?: string[];
    previewCounts?: Record<string, number>;
    applicationTablePlan?: RestoreApplicationDryRunResult["rollbackGuidance"]["applicationTablePlan"];
  };
  auditPersistence: string | null;
};
type RestoreApplicationCommitState = {
  checkedAt: string;
  applicationCommitId: string;
  applicationCommitStatus: string;
  applicationCommitPersistence: string;
  restoreMode: string;
  commitStatus: string;
  destructiveWrite: boolean;
  recordSummary: Record<string, number>;
  result: Record<string, unknown>;
  unsupportedRestoreDomains: string[];
  auditPersistence: string | null;
};
type RestoreAttachmentPackagePreflightState = {
  checkedAt: string;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  canRestoreBytes: boolean;
  authorizationPolicy: string;
  attachmentPackagePreflightId: string | null;
  attachmentPackagePreflightStatus: string;
  attachmentPackagePreflightPersistence: string;
  metadataRecordCount: number;
  totalSourceBytes: number;
  blockers: string[];
  auditPersistence: string | null;
};
type RestoreAttachmentPackageVerificationState = {
  checkedAt: string;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  canRestoreBytes: boolean;
  authorizationPolicy: string;
  attachmentPackagePreflightId: string;
  attachmentPackagePreflightPersistence: string;
  attachmentPackageVerificationId: string | null;
  attachmentPackageVerificationStatus: string;
  attachmentPackageVerificationPersistence: string;
  packageSha256: string;
  manifestSha256: string;
  packageManifest: {
    workspaceId: string;
    objectCount: number;
    totalSourceBytes: number;
  };
  blockers: string[];
  auditPersistence: string | null;
};
type RestoreAttachmentObjectPlanState = {
  checkedAt: string;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  canRestoreBytes: boolean;
  authorizationPolicy: string;
  attachmentPackageVerificationId: string;
  attachmentPackageVerificationPersistence: string;
  attachmentObjectPlanId: string | null;
  attachmentObjectPlanStatus: string;
  attachmentObjectPlanPersistence: string;
  objectCount: number;
  totalSourceBytes: number;
  blockedDestinationCount: number;
  destinationPolicy: string;
  overwritePolicy: string;
  byteSourcePolicy: string;
  sourceVerificationStatus: string;
  objects: RestoreAttachmentObjectPlanDryRunResult["result"]["objects"];
  blockers: string[];
  auditPersistence: string | null;
};
type RestoreAttachmentObjectCommitPreflightState = {
  checkedAt: string;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  canRestoreBytes: boolean;
  readyForByteCommit: boolean;
  authorizationPolicy: string;
  attachmentPackageVerificationId: string;
  attachmentPackageVerificationPersistence: string;
  attachmentObjectPlanId: string;
  attachmentObjectPlanStatus: string;
  attachmentObjectPlanPersistence: string;
  attachmentObjectCommitPreflightId: string | null;
  attachmentObjectCommitPreflightStatus: string;
  attachmentObjectCommitPreflightPersistence: string;
  packageSha256: string;
  manifestSha256: string;
  objectCount: number;
  totalSourceBytes: number;
  readyDestinationCount: number;
  blockedDestinationCount: number;
  destinationPolicy: string;
  overwritePolicy: string;
  byteSourcePolicy: string;
  sourceVerificationStatus: string;
  objects: RestoreAttachmentObjectCommitPreflightResult["result"]["objects"];
  blockers: string[];
  auditPersistence: string | null;
};
type RestoreAttachmentObjectCommitState = {
  checkedAt: string;
  committedCount: number;
  idempotentCount: number;
  failedCount: number;
  totalBytes: number;
  commits: RestoreAttachmentObjectCommitResult["commit"][];
};
type RestorePlanningDryRunState = {
  checkedAt: string;
  ok: boolean;
  persistence: string;
  auditPersistence: string | null;
  restoreMode: string;
  commitPolicy: string;
  destructiveWrite: boolean;
  authorizationPolicy: string;
  planningPreviewId: string | null;
  planningPreviewStatus: string;
  planningPreviewPersistence: string;
  acceptedCount: number;
  rejectedCount: number;
  createPreviewCount: number;
  idempotentCount: number;
  updatePreviewCount: number;
  accepted: RestorePlanningDryRunResult["accepted"];
  createPreview: string[];
  idempotent: string[];
  updatePreview: string[];
  tableSummary: RestorePlanningTableSummary[];
  updatePreviewDetails: RestorePlanningPreviewDetail[];
  rejected: RestorePlanningDryRunResult["rejected"];
};
type RestorePlanningCommitState = {
  checkedAt: string;
  planningPreviewId: string;
  planningCommitId: string;
  planningCommitStatus: string;
  planningCommitPersistence: string;
  restoreMode: string;
  commitStatus: string;
  destructiveWrite: boolean;
  result: RestorePlanningCommitResult["result"];
  unsupportedRestoreDomains: string[];
  auditPersistence: string | null;
};
type AuthState = {
  email: string;
  status: "signed_out" | "requesting" | "link_requested" | "verifying" | "signed_in";
  emailHash: string | null;
  devOnlyToken: string | null;
  session: FilmSession | null;
};
type InviteState = {
  email: string;
  role: WorkspaceRole;
  status: "idle" | "creating" | "created" | "accepting" | "accepted";
  emailHash: string | null;
  devOnlyToken: string | null;
  persistence: string | null;
  deliveryPersistence: string | null;
  acceptToken: string;
  acceptDisplayName: string;
  acceptedRole: WorkspaceRole | null;
};
type InviteDeliveryState = InviteDeliveryReadiness & {
  persistence: string;
  checkedAt: string;
};
type InviteManifestState = {
  checkedAt: string;
  persistence: string;
  auditPersistence: string | null;
  manifestPolicy: WorkspaceInviteManifestResult["manifestPolicy"];
  rowCount: number;
  truncated: boolean;
  invites: WorkspaceInviteManifestResult["invites"];
};
type InviteDeliverySuppressionManifestState = {
  checkedAt: string;
  persistence: string;
  auditPersistence: string | null;
  manifestPolicy: InviteDeliverySuppressionManifestResult["manifestPolicy"];
  rowCount: number;
  truncated: boolean;
  suppressions: InviteDeliverySuppressionManifestResult["suppressions"];
};
type MemberStatusState = {
  memberId: string;
  targetStatus: WorkspaceMemberManagedStatus;
  status: "idle" | "updating" | "updated";
  persistence: string | null;
  sessionPolicy: string | null;
  updatedMemberId: string | null;
  updatedStatus: WorkspaceMemberManagedStatus | null;
};
type ProjectMembershipManifestState = {
  checkedAt: string;
  targetLabel: string;
  persistence: string;
  auditPersistence: string | null;
  manifestPolicy: ProjectMembershipManifestResult["manifestPolicy"];
  rowCount: number;
  truncated: boolean;
  memberships: ProjectMembershipManifestResult["memberships"];
};
type ProjectMembershipHistoryState = {
  checkedAt: string;
  targetLabel: string;
  persistence: string;
  auditPersistence: string | null;
  historyPolicy: ProjectMembershipHistoryResult["historyPolicy"];
  projectId: string;
  rowCount: number;
  truncated: boolean;
  entries: ProjectMembershipHistoryResult["entries"];
};
type ProjectAssignmentState = {
  memberId: string;
  role: WorkspaceRole;
  department: string;
  status: "idle" | "assigning" | "assigned";
  persistence: string | null;
  assignedProjectId: string | null;
  assignedMemberId: string | null;
  assignedRole: WorkspaceRole | null;
};
type OwnerTransferEntityType = CoreRecordOwnerEntityType;
type OwnerTransferState = {
  entityType: OwnerTransferEntityType;
  entityId: string;
  memberId: string;
  status: "idle" | "transferring" | "transferred";
  persistence: string | null;
  transferredEntityType: OwnerTransferEntityType | null;
  transferredEntityId: string | null;
  transferredTargetLabel: string | null;
  ownerMemberId: string | null;
  previousOwnerMemberId: string | null;
};
type OwnerManifestState = {
  checkedAt: string;
  targetLabel: string;
  persistence: string;
  auditPersistence: string | null;
  manifestPolicy: RecordOwnerManifestResult["manifestPolicy"];
  owner: RecordOwnerManifestResult["owner"];
};
type OwnerHistoryState = {
  checkedAt: string;
  targetLabel: string;
  persistence: string;
  auditPersistence: string | null;
  historyPolicy: RecordOwnerHistoryResult["historyPolicy"];
  rowCount: number;
  truncated: boolean;
  owner: {
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
  };
  entries: RecordOwnerHistoryResult["entries"];
};
type RecordMutationState = {
  mutation: RecordMutationKind;
  status: "idle" | "checking" | "checked";
  targetLabel: string | null;
  persistence: string | null;
  auditPersistence: string | null;
  mutationPolicy: RecordMutationPreflightResult["mutationPolicy"] | null;
  preflight: RecordMutationPreflightResult["preflight"] | null;
};
type RecordMutationRequestState = {
  status: "idle" | "requesting" | "requested";
  targetLabel: string | null;
  persistence: string | null;
  auditPersistence: string | null;
  requestPolicy: RecordMutationRequestResult["requestPolicy"] | null;
  request: RecordMutationRequestResult["request"] | null;
};
type RecordMutationRequestManifestState = {
  checkedAt: string;
  targetLabel: string;
  persistence: string;
  auditPersistence: string | null;
  manifestPolicy: RecordMutationRequestManifestResult["manifestPolicy"];
  rowCount: number;
  truncated: boolean;
  target: {
    entityType: CoreRecordOwnerEntityType;
    entityId: string;
  };
  requests: RecordMutationRequestManifestResult["requests"];
};
type RecordMutationResolutionState = {
  status: "idle" | "resolving" | "resolved";
  targetLabel: string | null;
  persistence: string | null;
  auditPersistence: string | null;
  resolutionPolicy: RecordMutationResolutionResult["resolutionPolicy"] | null;
  request: RecordMutationResolutionResult["request"] | null;
};
type RecordMutationApplyState = {
  status: "idle" | "applying" | "applied";
  targetLabel: string | null;
  persistence: string | null;
  auditPersistence: string | null;
  applicationPolicy: RecordMutationApplyResult["applicationPolicy"] | null;
  request: RecordMutationApplyResult["request"] | null;
  application: RecordMutationApplyResult["application"] | null;
};
type RecordMutationDiffState = {
  status: "idle" | "previewing" | "previewed";
  targetLabel: string | null;
  persistence: string | null;
  auditPersistence: string | null;
  diffPolicy: RecordMutationDiffPreviewResult["diffPolicy"] | null;
  request: RecordMutationDiffPreviewResult["request"] | null;
  stale: boolean;
  currentUpdatedAt: string | null;
  expectedUpdatedAt: string | null;
  fieldDiffs: RecordMutationDiffPreviewResult["fieldDiffs"];
  rollbackGuidance: RecordMutationDiffPreviewResult["rollbackGuidance"] | null;
};
type RecordMutationAuditManifestState = {
  checkedAt: string;
  targetLabel: string;
  persistence: string;
  auditPersistence: string | null;
  manifestPolicy: RecordMutationAuditManifestResult["manifestPolicy"];
  metadataPolicy: RecordMutationAuditManifestResult["metadataPolicy"];
  requestId: string;
  request: RecordMutationAuditManifestResult["request"];
  rowCount: number;
  truncated: boolean;
  rollbackGuidance: RecordMutationAuditManifestResult["rollbackGuidance"];
  events: RecordMutationAuditManifestResult["events"];
};
type RecordMutationRollbackState = {
  status: "idle" | "requesting" | "requested";
  targetLabel: string | null;
  persistence: string | null;
  auditPersistence: string | null;
  rollbackPolicy: RecordMutationRollbackRequestResult["rollbackPolicy"] | null;
  sourceRequest: RecordMutationRollbackRequestResult["sourceRequest"] | null;
  request: RecordMutationRollbackRequestResult["request"] | null;
  suggestedUpdates: RecordMutationRollbackRequestResult["suggestedUpdates"];
};
type RecordMutationDeleteRecoveryState = {
  status: "idle" | "checking" | "checked";
  targetLabel: string | null;
  persistence: string | null;
  auditPersistence: string | null;
  recoveryPolicy: RecordMutationDeleteRecoveryPlanResult["recoveryPolicy"] | null;
  sourceRequest: RecordMutationDeleteRecoveryPlanResult["sourceRequest"] | null;
  recoveryPlan: RecordMutationDeleteRecoveryPlanResult["recoveryPlan"] | null;
};
type FilmProfileMutationRequestState = {
  status: "idle" | "requesting" | "requested";
  targetLabel: string | null;
  persistence: string | null;
  auditPersistence: string | null;
  requestPolicy: FilmProfileMutationRequestResult["requestPolicy"] | null;
  request: FilmProfileMutationRequestResult["request"] | null;
};
type FilmProfileMutationRequestManifestState = {
  checkedAt: string;
  targetLabel: string;
  persistence: string;
  auditPersistence: string | null;
  manifestPolicy: FilmProfileMutationRequestManifestResult["manifestPolicy"];
  rowCount: number;
  truncated: boolean;
  projectId: string;
  requests: FilmProfileMutationRequestManifestResult["requests"];
};
type FilmProfileMutationResolutionState = {
  status: "idle" | "resolving" | "resolved";
  targetLabel: string | null;
  persistence: string | null;
  auditPersistence: string | null;
  resolutionPolicy: FilmProfileMutationResolutionResult["resolutionPolicy"] | null;
  request: FilmProfileMutationResolutionResult["request"] | null;
};
type FilmProfileMutationApplyState = {
  status: "idle" | "applying" | "applied";
  targetLabel: string | null;
  persistence: string | null;
  auditPersistence: string | null;
  applicationPolicy: FilmProfileMutationApplyResult["applicationPolicy"] | null;
  request: FilmProfileMutationApplyResult["request"] | null;
  application: FilmProfileMutationApplyResult["application"] | null;
};
type FilmProfileMutationDiffState = {
  status: "idle" | "previewing" | "previewed";
  targetLabel: string | null;
  persistence: string | null;
  auditPersistence: string | null;
  diffPolicy: FilmProfileMutationDiffPreviewResult["diffPolicy"] | null;
  request: FilmProfileMutationDiffPreviewResult["request"] | null;
  stale: boolean;
  currentUpdatedAt: string | null;
  expectedUpdatedAt: string | null;
  fieldDiffs: FilmProfileMutationDiffPreviewResult["fieldDiffs"];
  rollbackGuidance: FilmProfileMutationDiffPreviewResult["rollbackGuidance"] | null;
};
type RecordCommentState = {
  entityType: RecordCommentEntityType;
  entityId: string;
  body: string;
  status: "idle" | "creating" | "created";
  persistence: string | null;
  auditPersistence: string | null;
  commentPolicy: RecordCommentIntentResult["commentPolicy"] | null;
  targetLabel: string | null;
  bodyPreview: string | null;
  bodySha256: string | null;
};
type RecordCommentManifestState = {
  checkedAt: string;
  targetLabel: string;
  persistence: string;
  auditPersistence: string | null;
  manifestPolicy: RecordCommentManifestResult["manifestPolicy"];
  rowCount: number;
  truncated: boolean;
  target: {
    entityType: RecordCommentEntityType;
    entityId: string;
  };
  comments: RecordCommentManifestResult["comments"];
};
type PermissionAssignmentState = {
  memberId: string;
  permission: RecordPermissionLevel;
  department: string;
  expiresAt: string;
  status: "idle" | "assigning" | "assigned";
  persistence: string | null;
  assignedMemberId: string | null;
  assignedPermission: RecordPermissionLevel | null;
};
type ProjectPermissionState = PermissionAssignmentState & {
  assignedProjectId: string | null;
};
type DocumentPermissionState = PermissionAssignmentState & {
  assignedProjectId: string | null;
  assignedDocumentId: string | null;
};
type TaskPermissionState = PermissionAssignmentState & {
  taskId: string;
  assignedProjectId: string | null;
  assignedTaskId: string | null;
};
type AttachmentUploadPrepareResponse = {
  dryRun?: boolean;
  uploadMode?: string;
  persistence?: string;
  accepted?: AttachmentUploadIntent[];
  rejected?: Array<{ docId: string; reason: string }>;
  error?: string;
};
type AttachmentUploadCommitResponse = {
  dryRun?: boolean;
  persistence?: string;
  accepted?: AttachmentCommitResult[];
  rejected?: Array<{ docId: string; reason: string }>;
  error?: string;
};
type AttachmentUploadDryRunSummary = {
  committedCount: number;
  uploadMode: string;
  persistence: string;
};
type AttachmentR2StoreState = {
  storedCount: number;
  rejectedCount: number;
  persistence: string;
  checkedAt: string;
};
type AttachmentExportState = {
  rowCount: number;
  truncated: boolean;
  offset: number;
  nextOffset: number | null;
  persistence: string;
  checkedAt: string;
  objects: StoredAttachmentExportObject[];
  latestObject: StoredAttachmentExportObject | null;
  latestDownload: {
    name: string;
    docId: string | null;
    sizeBytes: number;
    sha256: string | null;
    downloadedAt: string;
  } | null;
  packageDryRun: {
    objectCount: number;
    totalSizeBytes: number;
    offset: number;
    nextOffset: number | null;
    persistence: string;
    packagePlanId: string | null;
    packageToken: string | null;
    packageTokenExpiresAt: string | null;
    packagePlanPersistence: string;
    packageMode: StoredAttachmentPackageDryRun["packageMode"];
    byteSource: StoredAttachmentPackageDryRun["byteSource"];
    canPackage: boolean;
    blockers: string[];
    objectKeys: string[];
    checkedAt: string;
  } | null;
  packageDownload: {
    name: string;
    objectCount: number;
    sizeBytes: number;
    totalSourceBytes: number;
    sha256: string | null;
    packageManifest: RestoreAttachmentPackageManifestRequest;
    blob: Blob;
    downloadedAt: string;
  } | null;
};
type NotionPlanningCommitResponse = {
  dryRun?: boolean;
  persistence?: string;
  auditPersistence?: string;
  accepted?: Array<{ id: string; kind: string; title: string }>;
  rejected?: Array<{ index: number; reason: string }>;
  committed?: string[];
  idempotent?: string[];
  updatePreview?: string[];
  updatePreviewDetails?: NotionPlanningUpdatePreviewDetail[];
  tableSummary?: NotionPlanningTableSummary[];
  error?: string;
};
type NotionPlanningUpdatePreviewDetail = {
  id: string;
  kind: string;
  tableName: string;
  title: string;
  fieldChangeCount: number;
  fieldChanges: Array<{
    field: string;
    currentValue: string;
    incomingValue: string;
  }>;
};
type NotionPlanningTableSummary = {
  kind: string;
  tableName: string;
  acceptedCount: number;
  committedCount: number;
  idempotentCount: number;
  updatePreviewCount: number;
  rejectedCount: number;
};
type NotionPlanningCommitSummary = {
  committedCount: number;
  idempotentCount: number;
  updatePreviewCount: number;
  rejectedCount: number;
  persistence: string;
  auditPersistence: string;
  truncated: boolean;
  tableSummary: NotionPlanningTableSummary[];
  updatePreviewDetails: NotionPlanningUpdatePreviewDetail[];
};
type LocalPlanningRecord = {
  kind: NotionPlanningRecord["kind"];
  title: string;
  sourcePath: string;
  projectTitle: string | null;
  projectTitles: string[];
  fields: Record<string, string>;
  importedAt: string;
  operationId: string;
  sourceTruncated: boolean;
};
type PlanningPanelRow = {
  kind: NotionPlanningRecord["kind"];
  title: string;
  projectLabel: string;
  sourcePath: string;
  fields: Record<string, unknown>;
  sourceLabel: string;
};
type PlanningExportViewState = BackupPlanningExport & {
  checkedAt: string;
};

const UI_KEY = "film.ui.v1";
const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? "http://127.0.0.1:8787";
const OPTIONAL_WORKER_TIMEOUT_MS = 3_000;
const WORKSPACE_SECTIONS: WorkspaceSection[] = [
  "slate",
  "projects",
  "breakdown",
  "schedule",
  "shots",
  "call-sheets",
  "sides",
  "reports",
  "locations",
  "talent",
  "tasks",
  "docs",
  "people",
  "equipment",
  "expenses",
  "planning",
  "backups",
];
type WorkspaceNavItem = { label: string; glyph: string; section: WorkspaceSection };
const WORKSPACE_NAV_GROUPS: Array<{ label: string; items: WorkspaceNavItem[] }> = [
  {
    label: "Development",
    items: [
      { label: "Breakdown", glyph: "doc", section: "breakdown" },
      { label: "Planning", glyph: "import", section: "planning" },
    ],
  },
  {
    label: "Pre-production",
    items: [
      { label: "Schedule", glyph: "calendar", section: "schedule" },
      { label: "Locations", glyph: "pin", section: "locations" },
      { label: "Talent", glyph: "people", section: "talent" },
      { label: "Equipment", glyph: "case", section: "equipment" },
    ],
  },
  {
    label: "Production",
    items: [
      { label: "Shots", glyph: "slate", section: "shots" },
      { label: "Call Sheets", glyph: "call-sheet", section: "call-sheets" },
      { label: "Sides", glyph: "doc", section: "sides" },
      { label: "Reports", glyph: "list", section: "reports" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Tasks", glyph: "list", section: "tasks" },
      { label: "Docs", glyph: "doc", section: "docs" },
      { label: "People", glyph: "people", section: "people" },
      { label: "Expenses", glyph: "coins", section: "expenses" },
      { label: "Backups", glyph: "backup", section: "backups" },
    ],
  },
];
const OVERVIEW_NAV_ITEM: WorkspaceNavItem = { label: "Overview", glyph: "grid", section: "slate" };
const PROJECTS_NAV_ITEM: WorkspaceNavItem = { label: "Projects", glyph: "folder", section: "projects" };
const INSPECTOR_VIEW_GROUPS: Array<{
  label: string;
  views: Array<{ id: InspectorView; label: string }>;
}> = [
  {
    label: "Project",
    views: [
      { id: "overview", label: "Overview" },
      { id: "team", label: "Team" },
    ],
  },
  {
    label: "Governance",
    views: [
      { id: "ownership", label: "Ownership" },
      { id: "changes", label: "Change requests" },
      { id: "permissions", label: "Permissions" },
    ],
  },
  {
    label: "Data and services",
    views: [
      { id: "integrations", label: "Integrations" },
      { id: "imports", label: "Imports" },
    ],
  },
];
const INSPECTOR_VIEWS = INSPECTOR_VIEW_GROUPS.flatMap((group) => group.views.map((view) => view.id));
const INVITE_ROLES: WorkspaceRole[] = ["producer", "director", "department_lead", "contributor", "reviewer"];
const RECORD_PERMISSION_LEVELS: RecordPermissionLevel[] = ["read", "comment", "write", "admin"];
const PERMISSION_SCOPES: Array<{ id: PermissionScope; label: string }> = [
  { id: "project", label: "Entire project" },
  { id: "task", label: "Specific task" },
  { id: "document", label: "Specific document" },
];
const INTEGRATION_DEFINITIONS: Array<{ key: IntegrationKey; label: string }> = [
  { key: "pool", label: "Pool" },
  { key: "store", label: "Store" },
  { key: "stripe", label: "Stripe" },
  { key: "social", label: "Meta insights" },
  { key: "google", label: "Google" },
  { key: "resend", label: "Resend" },
  { key: "sms", label: "Telnyx SMS" },
];
const OWNER_TRANSFER_ENTITY_TYPES: OwnerTransferEntityType[] = ["project", "task", "document", "person", "equipment", "expense"];
const RECORD_COMMENT_ENTITY_TYPES: RecordCommentEntityType[] = ["project", "task", "document"];
const LOCAL_TASK_STATUSES: Array<FilmProject["openTasks"][number]["status"]> = ["overdue", "pending", "ready"];
const PROJECT_PHASES: FilmProject["phase"][] = ["Development", "Pre-Production", "Production", "Post-Production"];
const PROJECT_TYPES = ["Feature Film", "Short Film", "Documentary", "Series", "Commercial", "Music Video"] as const;
const AUTH_SESSION_STORAGE_KEY = "film.auth-session.v1";
const PLANNING_KINDS: Array<NotionPlanningRecord["kind"]> = [
  "location",
  "opportunity",
  "meeting_note",
  "equipment_request",
  "show",
  "merch",
  "media",
  "role",
];
const PLANNING_KIND_LABELS: Record<NotionPlanningRecord["kind"], string> = {
  location: "Locations",
  opportunity: "Opportunities",
  meeting_note: "Meetings",
  equipment_request: "Requests",
  show: "Shows",
  merch: "Merch",
  media: "Media",
  role: "Roles",
};
const SCREENPLAY_ELEMENT_CATEGORIES: ScreenplayElementCategory[] = [
  "cast",
  "background",
  "location",
  "prop",
  "wardrobe",
  "makeup",
  "vehicle",
  "animal",
  "stunt",
  "special_effect",
  "visual_effect",
  "sound",
  "music",
  "equipment",
  "other",
];
const SCREENPLAY_ELEMENT_LABELS: Record<ScreenplayElementCategory, string> = {
  cast: "Cast",
  background: "Background",
  location: "Location",
  prop: "Props",
  wardrobe: "Wardrobe",
  makeup: "Makeup",
  vehicle: "Vehicles",
  animal: "Animals",
  stunt: "Stunts",
  special_effect: "SFX",
  visual_effect: "VFX",
  sound: "Sound",
  music: "Music",
  equipment: "Equipment",
  other: "Other",
};
const TIMELINE_MONTH_LABELS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

const root = document.querySelector<HTMLDivElement>("#app");

if (!root) {
  throw new Error("Missing #app root");
}

const localMirror = await loadLocalMirror(seedWorkspace);
const state: {
  workspace: WorkspaceData;
  ui: UiState;
  operations: OperationRecord[];
  storageSource: string;
  restoreSnapshot: BackupSnapshot | null;
  restorePreview: RestorePreviewSummary | null;
  restoreGate: RestoreGateState | null;
  restoreApproval: RestoreApprovalState | null;
  restoreCommitAttempt: RestoreCommitAttemptState | null;
  restoreApplicationPreflight: RestoreApplicationPreflightState | null;
  restoreApplicationCommit: RestoreApplicationCommitState | null;
  restoreAttachmentPackagePreflight: RestoreAttachmentPackagePreflightState | null;
  restoreAttachmentPackageVerification: RestoreAttachmentPackageVerificationState | null;
  restoreAttachmentObjectPlan: RestoreAttachmentObjectPlanState | null;
  restoreAttachmentObjectCommitPreflight: RestoreAttachmentObjectCommitPreflightState | null;
  restoreAttachmentObjectCommit: RestoreAttachmentObjectCommitState | null;
  restorePlanningRecords: BackupPlanningRecord[];
  restorePlanningDryRun: RestorePlanningDryRunState | null;
  restorePlanningCommit: RestorePlanningCommitState | null;
  notionImport: NotionImportState | null;
  planningRows: LocalPlanningRecord[];
  planningExportView: PlanningExportViewState | null;
  providerPreview: ProviderPreviewState | null;
  providerRuntimeReadiness: ProviderRuntimeReadinessState | null;
  googleConnection: GoogleConnectionState | null;
  googleDriveManifest: GoogleDriveManifestState | null;
  googleDriveSync: GoogleDriveSyncState | null;
  metaConnection: MetaConnectionState | null;
  metaPageCandidates: MetaPageCandidatesState | null;
  metaAnalytics: MetaAnalyticsState | null;
  stripeSummary: StripeSummaryState | null;
  stripeSummaryResult: StripeSummaryResultState | null;
  smsConsentManifest: SmsConsentManifestState | null;
  telnyxProviderReadiness: TelnyxProviderReadinessState | null;
  workerAuditManifest: WorkerAuditManifestState | null;
  workerAuditActionPrefix: string;
  screenplayImport: ScreenplayImportState | null;
  screenplayElementClipboard: ScreenplayElementClipboardState | null;
  productionScheduleStripSelection: ProductionScheduleStripSelectionState | null;
  backupDryRun: BackupDryRunState | null;
  backupExport: BackupExportState | null;
  attachmentR2Store: AttachmentR2StoreState | null;
  attachmentExport: AttachmentExportState | null;
  auth: AuthState;
  invite: InviteState;
  inviteDelivery: InviteDeliveryState | null;
  inviteManifest: InviteManifestState | null;
  inviteDeliverySuppressions: InviteDeliverySuppressionManifestState | null;
  inviteRevokingId: string | null;
  memberStatus: MemberStatusState;
  assignment: ProjectAssignmentState;
  projectMembershipManifest: ProjectMembershipManifestState | null;
  projectMembershipHistory: ProjectMembershipHistoryState | null;
  projectMembershipRevokingKey: string | null;
  ownerTransfer: OwnerTransferState;
  ownerManifest: OwnerManifestState | null;
  ownerHistory: OwnerHistoryState | null;
  recordMutation: RecordMutationState;
  recordMutationRequest: RecordMutationRequestState;
  recordMutationRequestManifest: RecordMutationRequestManifestState | null;
  recordMutationResolution: RecordMutationResolutionState;
  recordMutationDiff: RecordMutationDiffState;
  recordMutationApply: RecordMutationApplyState;
  recordMutationAuditManifest: RecordMutationAuditManifestState | null;
  recordMutationRollback: RecordMutationRollbackState;
  recordMutationDeleteRecovery: RecordMutationDeleteRecoveryState;
  filmProfileMutationRequest: FilmProfileMutationRequestState;
  filmProfileMutationRequestManifest: FilmProfileMutationRequestManifestState | null;
  filmProfileMutationResolution: FilmProfileMutationResolutionState;
  filmProfileMutationDiff: FilmProfileMutationDiffState;
  filmProfileMutationApply: FilmProfileMutationApplyState;
  recordComment: RecordCommentState;
  recordCommentManifest: RecordCommentManifestState | null;
  projectPermission: ProjectPermissionState;
  taskPermission: TaskPermissionState;
  documentPermission: DocumentPermissionState;
  recordPermissionManifest: RecordPermissionManifestState | null;
  recordPermissionHistory: RecordPermissionHistoryState | null;
  recordPermissionRevokingId: string | null;
} = {
  workspace: normalizeContextualWorkspaceData(localMirror.workspace),
  ui: loadUi(),
  operations: localMirror.operations,
  storageSource: localMirror.source,
  restoreSnapshot: null,
  restorePreview: null,
  restoreGate: null,
  restoreApproval: null,
  restoreCommitAttempt: null,
  restoreApplicationPreflight: null,
  restoreApplicationCommit: null,
  restoreAttachmentPackagePreflight: null,
  restoreAttachmentPackageVerification: null,
  restoreAttachmentObjectPlan: null,
  restoreAttachmentObjectCommitPreflight: null,
  restoreAttachmentObjectCommit: null,
  restorePlanningRecords: [],
  restorePlanningDryRun: null,
  restorePlanningCommit: null,
  notionImport: null,
  planningRows: collectLocalPlanningRows(localMirror.operations),
  planningExportView: null,
  providerPreview: null,
  providerRuntimeReadiness: null,
  googleConnection: null,
  googleDriveManifest: null,
  googleDriveSync: null,
  metaConnection: null,
  metaPageCandidates: null,
  metaAnalytics: null,
  stripeSummary: null,
  stripeSummaryResult: null,
  smsConsentManifest: null,
  telnyxProviderReadiness: null,
  workerAuditManifest: null,
  workerAuditActionPrefix: "",
  screenplayImport: null,
  screenplayElementClipboard: null,
  productionScheduleStripSelection: null,
  backupDryRun: null,
  backupExport: null,
  attachmentR2Store: null,
  attachmentExport: null,
  auth: {
    email: "",
    status: "signed_out",
    emailHash: null,
    devOnlyToken: null,
    session: null,
  },
  invite: {
    email: "",
    role: "contributor",
    status: "idle",
    emailHash: null,
    devOnlyToken: null,
    persistence: null,
    deliveryPersistence: null,
    acceptToken: "",
    acceptDisplayName: "",
    acceptedRole: null,
  },
  inviteDelivery: null,
  inviteManifest: null,
  inviteDeliverySuppressions: null,
  inviteRevokingId: null,
  memberStatus: {
    memberId: "",
    targetStatus: "disabled",
    status: "idle",
    persistence: null,
    sessionPolicy: null,
    updatedMemberId: null,
    updatedStatus: null,
  },
  assignment: {
    memberId: "",
    role: "contributor",
    department: "",
    status: "idle",
    persistence: null,
    assignedProjectId: null,
    assignedMemberId: null,
    assignedRole: null,
  },
  projectMembershipManifest: null,
  projectMembershipHistory: null,
  projectMembershipRevokingKey: null,
  ownerTransfer: {
    entityType: "project",
    entityId: "",
    memberId: "",
    status: "idle",
    persistence: null,
    transferredEntityType: null,
    transferredEntityId: null,
    transferredTargetLabel: null,
    ownerMemberId: null,
    previousOwnerMemberId: null,
  },
  ownerManifest: null,
  ownerHistory: null,
  recordMutation: {
    mutation: "update",
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    mutationPolicy: null,
    preflight: null,
  },
  recordMutationRequest: {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    requestPolicy: null,
    request: null,
  },
  recordMutationRequestManifest: null,
  recordMutationResolution: {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    resolutionPolicy: null,
    request: null,
  },
  recordMutationDiff: {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    diffPolicy: null,
    request: null,
    stale: false,
    currentUpdatedAt: null,
    expectedUpdatedAt: null,
    fieldDiffs: [],
    rollbackGuidance: null,
  },
  recordMutationApply: {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    applicationPolicy: null,
    request: null,
    application: null,
  },
  recordMutationAuditManifest: null,
  recordMutationRollback: {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    rollbackPolicy: null,
    sourceRequest: null,
    request: null,
    suggestedUpdates: {},
  },
  recordMutationDeleteRecovery: {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    recoveryPolicy: null,
    sourceRequest: null,
    recoveryPlan: null,
  },
  filmProfileMutationRequest: {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    requestPolicy: null,
    request: null,
  },
  filmProfileMutationRequestManifest: null,
  filmProfileMutationResolution: {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    resolutionPolicy: null,
    request: null,
  },
  filmProfileMutationDiff: {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    diffPolicy: null,
    request: null,
    stale: false,
    currentUpdatedAt: null,
    expectedUpdatedAt: null,
    fieldDiffs: [],
    rollbackGuidance: null,
  },
  filmProfileMutationApply: {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    applicationPolicy: null,
    request: null,
    application: null,
  },
  recordComment: {
    entityType: "project",
    entityId: "",
    body: "",
    status: "idle",
    persistence: null,
    auditPersistence: null,
    commentPolicy: null,
    targetLabel: null,
    bodyPreview: null,
    bodySha256: null,
  },
  recordCommentManifest: null,
  projectPermission: {
    memberId: "",
    permission: "write",
    department: "",
    expiresAt: "",
    status: "idle",
    persistence: null,
    assignedProjectId: null,
    assignedMemberId: null,
    assignedPermission: null,
  },
  taskPermission: {
    taskId: "",
    memberId: "",
    permission: "write",
    department: "",
    expiresAt: "",
    status: "idle",
    persistence: null,
    assignedProjectId: null,
    assignedTaskId: null,
    assignedMemberId: null,
    assignedPermission: null,
  },
  documentPermission: {
    memberId: "",
    permission: "write",
    department: "",
    expiresAt: "",
    status: "idle",
    persistence: null,
    assignedProjectId: null,
    assignedDocumentId: null,
    assignedMemberId: null,
    assignedPermission: null,
  },
  recordPermissionManifest: null,
  recordPermissionHistory: null,
  recordPermissionRevokingId: null,
};

render();
registerServiceWorker();
void initializeAuthenticatedWorkspace();

function loadUi(): UiState {
  const saved = localStorage.getItem(UI_KEY);
  const fallback: UiState = {
    selectedProjectId: seedWorkspace.projects[0]?.id ?? "",
    selectedDocId: seedWorkspace.projects[0]?.docs[0]?.id ?? null,
    selectedScreenplayId: null,
    selectedScreenplayBaseId: null,
    selectedScreenplaySceneId: null,
    selectedScheduleId: null,
    selectedComparisonScheduleId: null,
    selectedCallSheetId: null,
    selectedProductionReportId: null,
    selectedProductionLocationId: null,
    selectedProductionTalentId: null,
    selectedProductionShotId: null,
    productionShotSceneFilter: null,
    screenplayElementFilter: "all",
    screenplaySceneOrder: "script",
    screenplaySearch: "",
    viewMode: "list",
    workspaceSection: "slate",
    planningKindFilter: "all",
    inspectorTab: "details",
    inspectorView: "overview",
    changeRequestKind: "record",
    permissionScope: "project",
    filter: "",
    projectCreateOpen: false,
    toast: null,
  };

  if (!saved) return fallback;

  try {
    const next = { ...fallback, ...(JSON.parse(saved) as Partial<UiState>), projectCreateOpen: false, toast: null };
    return {
      ...next,
      workspaceSection: isWorkspaceSection(next.workspaceSection) ? next.workspaceSection : "slate",
      planningKindFilter: isPlanningKindFilter(next.planningKindFilter) ? next.planningKindFilter : "all",
      inspectorView: isInspectorView(next.inspectorView) ? next.inspectorView : "overview",
      changeRequestKind: isChangeRequestKind(next.changeRequestKind) ? next.changeRequestKind : "record",
      permissionScope: isPermissionScope(next.permissionScope) ? next.permissionScope : "project",
      screenplayElementFilter: isScreenplayElementFilter(next.screenplayElementFilter) ? next.screenplayElementFilter : "all",
      screenplaySceneOrder: isScreenplaySceneOrder(next.screenplaySceneOrder) ? next.screenplaySceneOrder : "script",
      screenplaySearch: "",
    };
  } catch {
    return fallback;
  }
}

function isWorkspaceSection(value: unknown): value is WorkspaceSection {
  return typeof value === "string" && WORKSPACE_SECTIONS.includes(value as WorkspaceSection);
}

function isPlanningKindFilter(value: unknown): value is PlanningKindFilter {
  return value === "all" || (typeof value === "string" && PLANNING_KINDS.includes(value as NotionPlanningRecord["kind"]));
}

function isInspectorView(value: unknown): value is InspectorView {
  return typeof value === "string" && INSPECTOR_VIEWS.includes(value as InspectorView);
}

function isChangeRequestKind(value: unknown): value is ChangeRequestKind {
  return value === "record" || value === "profile";
}

function isPermissionScope(value: unknown): value is PermissionScope {
  return value === "project" || value === "task" || value === "document";
}

function isScreenplayElementFilter(value: unknown): value is ScreenplayElementFilter {
  return value === "all" || (typeof value === "string" && SCREENPLAY_ELEMENT_CATEGORIES.includes(value as ScreenplayElementCategory));
}

function isScreenplaySceneOrder(value: unknown): value is ScreenplaySceneOrder {
  return value === "script" || value === "schedule";
}

function persistUi(): void {
  const {
    toast: _toast,
    projectCreateOpen: _projectCreateOpen,
    screenplaySearch: _screenplaySearch,
    ...persistedUi
  } = state.ui;
  localStorage.setItem(UI_KEY, JSON.stringify(persistedUi));
}

async function persistWorkspace(operation?: OperationRecord): Promise<void> {
  state.operations = await persistLocalMirror(state.workspace, operation);
}

function collectLocalPlanningRows(operations: OperationRecord[]): LocalPlanningRecord[] {
  const rows = operations.flatMap((operation) => {
    if (operation.kind !== "import.notion_applied") return [];
    const payload = operation.payload;
    const rows = Array.isArray(payload.planningRecords) ? payload.planningRecords : [];
    const sourceTruncated = payload.planningRecordsTruncated === true;

    return rows
      .map((row) => normalizeLocalPlanningRow(row, operation, sourceTruncated))
      .filter((row): row is LocalPlanningRecord => Boolean(row));
  });
  return rows.sort((left, right) => right.importedAt.localeCompare(left.importedAt));
}

function normalizeLocalPlanningRow(
  value: unknown,
  operation: OperationRecord,
  sourceTruncated: boolean,
): LocalPlanningRecord | null {
  if (!isPlainRecord(value)) return null;
  const kind = planningKindFromUnknown(value.kind);
  const title = stringFromUnknown(value.title, 160);
  const sourcePath = stringFromUnknown(value.sourcePath, 240);
  if (!kind || !title || !sourcePath) return null;

  return {
    kind,
    title,
    sourcePath,
    projectTitle: nullableStringFromUnknown(value.projectTitle, 160),
    projectTitles: stringArrayFromUnknown(value.projectTitles, 20, 160),
    fields: planningFieldsFromUnknown(value.fields),
    importedAt: operation.createdAt,
    operationId: operation.id,
    sourceTruncated,
  };
}

function planningRowsForProject(project: FilmProject): LocalPlanningRecord[] {
  return state.planningRows.filter((record) => {
    const titles = record.projectTitles.length
      ? record.projectTitles
      : record.projectTitle
        ? [record.projectTitle]
        : [];
    return titles.length === 0 || titles.some((title) => samePlanningText(title, project.title));
  });
}

function planningPanelRowsForProject(project: FilmProject): PlanningPanelRow[] {
  if (state.planningExportView) {
    return state.planningExportView.records
      .filter((record) => record.projectId === null || record.projectId === project.id)
      .map(planningPanelRowFromExport);
  }

  return planningRowsForProject(project).map(planningPanelRowFromLocal);
}

function planningPanelRowsForWorkspace(): PlanningPanelRow[] {
  if (state.planningExportView) {
    return state.planningExportView.records.map(planningPanelRowFromExport);
  }

  return state.planningRows.map(planningPanelRowFromLocal);
}

function planningPanelRowFromExport(record: BackupPlanningExport["records"][number]): PlanningPanelRow {
  return {
    kind: record.kind,
    title: record.title,
    projectLabel: record.projectId ? projectTitleForId(record.projectId) : "Workspace",
    sourcePath: record.sourcePath ?? "D1 planning export",
    fields: record.fields,
    sourceLabel: `D1 ${record.id}`,
  };
}

function planningPanelRowFromLocal(record: LocalPlanningRecord): PlanningPanelRow {
  return {
    kind: record.kind,
    title: record.title,
    projectLabel: record.projectTitles.length
      ? record.projectTitles.join(", ")
      : record.projectTitle ?? "Workspace",
    sourcePath: record.sourcePath,
    fields: record.fields,
    sourceLabel: `Local import ${record.operationId}`,
  };
}

function planningKindCounts(records: Array<{ kind: NotionPlanningRecord["kind"] }>): Array<[NotionPlanningRecord["kind"], number]> {
  return PLANNING_KINDS
    .map((kind) => [kind, records.filter((record) => record.kind === kind).length] as [NotionPlanningRecord["kind"], number])
    .filter(([, count]) => count > 0);
}

function renderCreateDisclosure(label: string, form: string): string {
  return `
    <details class="create-disclosure">
      <summary>${icon("plus")} <span>${escapeHtml(label)}</span> ${icon("chevron")}</summary>
      <div class="create-disclosure-body">${form}</div>
    </details>
  `;
}

function renderInlineSaveButton(label: string, disabled = false): string {
  return `<button class="icon-button contextual-save-button" type="submit" title="${escapeAttribute(label)}" aria-label="${escapeAttribute(label)}" ${disabled ? "disabled" : ""}>${icon("save")}</button>`;
}

function expenseCategoryLabel(expense: FilmProject["expenses"][number]): string {
  const legacyName = (expense as FilmProject["expenses"][number] & { name?: unknown }).name;
  return typeof expense.category === "string" && expense.category.trim()
    ? expense.category.trim()
    : typeof legacyName === "string" && legacyName.trim()
      ? legacyName.trim()
    : "Uncategorized";
}

function contextualRecordText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function contextualEquipmentTone(value: unknown): EquipmentItem["statusTone"] {
  return value === "teal" || value === "amber" || value === "blue" || value === "red" ? value : "gray";
}

function normalizeContextualWorkspaceData(workspace: WorkspaceData): WorkspaceData {
  return {
    ...workspace,
    projects: workspace.projects.map((project) => {
      const openTasks = project.openTasks.map((task, index) => {
        const legacy = task as FilmProject["openTasks"][number] & { name?: unknown; dueAt?: unknown; taskId?: unknown };
        const status = task.status === "overdue" || task.status === "ready" ? task.status : "pending";
        return {
          ...task,
          id: contextualRecordText(task.id ?? legacy.taskId, `task_${project.id}_${index + 1}`),
          title: contextualRecordText(task.title ?? legacy.name, "Untitled task"),
          due: contextualRecordText(task.due ?? legacy.dueAt, "TBD"),
          status,
        };
      });
      const people = project.people.map((person, index) => {
        const legacy = person as FilmProject["people"][number] & { displayName?: unknown; title?: unknown; personId?: unknown };
        const name = contextualRecordText(person.name ?? legacy.displayName, "Unnamed person");
        return {
          ...person,
          id: contextualRecordText(person.id ?? legacy.personId, `person_${project.id}_${index + 1}`),
          name,
          role: contextualRecordText(person.role ?? legacy.title, "Crew"),
          initials: contextualRecordText(person.initials, initialsFor(name)),
        };
      });
      const equipment = project.equipment.map((item, index) => {
        const legacy = item as EquipmentItem & { equipmentId?: unknown; label?: unknown; type?: unknown };
        return {
          ...item,
          id: contextualRecordText(item.id ?? legacy.equipmentId, `equipment_${project.id}_${index + 1}`),
          name: contextualRecordText(item.name ?? legacy.label, "Unnamed equipment"),
          status: contextualRecordText(item.status ?? legacy.type, "TBD"),
          statusTone: contextualEquipmentTone(item.statusTone),
        };
      });
      const expenses = project.expenses.map((expense, index) => {
        const legacy = expense as FilmProject["expenses"][number] & {
          expenseId?: unknown;
          spentCents?: unknown;
          budgetCents?: unknown;
        };
        const spent = Number.isFinite(expense.spent)
          ? expense.spent
          : typeof legacy.spentCents === "number" && Number.isFinite(legacy.spentCents)
            ? legacy.spentCents / 100
            : 0;
        const budget = Number.isFinite(expense.budget)
          ? expense.budget
          : typeof legacy.budgetCents === "number" && Number.isFinite(legacy.budgetCents)
            ? legacy.budgetCents / 100
            : 0;
        const id = typeof expense.id === "string" && expense.id
          ? expense.id
          : typeof legacy.expenseId === "string" && legacy.expenseId
            ? legacy.expenseId
            : `expense_${project.id}_${index + 1}`;

        return {
          ...expense,
          id,
          category: expenseCategoryLabel(expense),
          spent,
          budget,
          percent: Number.isFinite(expense.percent)
            ? expense.percent
            : budget > 0
              ? Math.round((spent / budget) * 100)
              : 0,
        };
      });

      return { ...project, openTasks, people, equipment, expenses };
    }),
  };
}

function projectTitleForId(projectId: string): string {
  return state.workspace.projects.find((project) => project.id === projectId)?.title ?? projectId;
}

function formatTaskStatus(status: FilmProject["openTasks"][number]["status"]): string {
  if (status === "overdue") return "Overdue";
  if (status === "pending") return "Pending";
  return "Ready";
}

function renderTaskStatusSelect(task: FilmProject["openTasks"][number]): string {
  return `
    <select
      class="task-status-select"
      name="status"
      data-contextual-autosave
      aria-label="Status for ${escapeAttribute(task.title)}"
    >
      ${LOCAL_TASK_STATUSES.map((status) => `
        <option value="${status}" ${task.status === status ? "selected" : ""}>${escapeHtml(formatTaskStatus(status))}</option>
      `).join("")}
    </select>
  `;
}

function planningKindFromUnknown(value: unknown): NotionPlanningRecord["kind"] | null {
  return typeof value === "string" && PLANNING_KINDS.includes(value as NotionPlanningRecord["kind"])
    ? value as NotionPlanningRecord["kind"]
    : null;
}

function planningFieldsFromUnknown(value: unknown): Record<string, string> {
  if (!isPlainRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 12)
      .map(([key, fieldValue]) => [key.slice(0, 80), stringFromUnknown(fieldValue, 240)])
      .filter(([key, fieldValue]) => key && fieldValue),
  );
}

function stringArrayFromUnknown(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => stringFromUnknown(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function nullableStringFromUnknown(value: unknown, maxLength: number): string | null {
  const text = stringFromUnknown(value, maxLength);
  return text || null;
}

function stringFromUnknown(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function samePlanningText(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function render(): void {
  const selectedProject = getProjectById(state.workspace, state.ui.selectedProjectId)
    ?? state.workspace.projects[0];

  if (!selectedProject) {
    root.innerHTML = "<main class=\"empty-state\">No projects found.</main>";
    return;
  }

  if (state.ui.selectedProjectId !== selectedProject.id) {
    state.ui.selectedProjectId = selectedProject.id;
  }
  if (!selectedProject.docs.some((doc) => doc.id === state.ui.selectedDocId)) {
    state.ui.selectedDocId = selectedProject.docs[0]?.id ?? null;
  }

  const filteredProjects = filterProjects(state.workspace.projects, state.ui.filter);

  root.innerHTML = `
    <div class="app-shell">
      ${renderSidebar()}
      <section class="workspace-shell" aria-label="Workspace">
        ${renderTopbar()}
        ${renderMobileWorkspaceNav()}
        <main class="main-panel">
          <section class="content-column">
            ${renderWorkspaceSection(filteredProjects, selectedProject)}
          </section>
          ${renderInspector(selectedProject)}
        </main>
      </section>
      ${renderProjectCreateDialog()}
    </div>
    ${state.ui.toast ? `<div class="toast" role="status">${escapeHtml(state.ui.toast)}</div>` : ""}
  `;

  applyAccessibleControlNames();
  bindEvents();
}

function renderProjectCreateDialog(): string {
  if (!state.ui.projectCreateOpen) return "";
  return `
    <div class="dialog-backdrop" data-action="project-create-backdrop">
      <section class="project-create-dialog" role="dialog" aria-modal="true" aria-labelledby="project-create-title">
        <div class="dialog-head">
          <div>
            <h2 id="project-create-title">Create project</h2>
            <p>Development template</p>
          </div>
          <button class="icon-button" type="button" data-action="project-create-cancel" aria-label="Close project creation">${icon("close")}</button>
        </div>
        <form class="project-create-form" data-action="project-create-form">
          <label>
            <span>Title</span>
            <input name="title" maxlength="160" autocomplete="off" required />
          </label>
          <label>
            <span>Type</span>
            <select name="projectType">
              ${PROJECT_TYPES.map((projectType) => `<option value="${escapeAttribute(projectType)}">${escapeHtml(projectType)}</option>`).join("")}
            </select>
          </label>
          <div class="dialog-actions">
            <button type="submit">${icon("plus")} Create project</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function applyAccessibleControlNames(): void {
  root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea").forEach((control) => {
    if (control.getAttribute("aria-label")) return;

    const placeholder = control.getAttribute("placeholder");
    const name = control.getAttribute("name");
    const type = control instanceof HTMLInputElement ? control.type : "";
    const label = placeholder || accessibleControlLabel(name, type);
    if (label) {
      control.setAttribute("aria-label", label);
    }
  });
}

function accessibleControlLabel(name: string | null, type: string): string | null {
  if (type === "email") return "Email";
  if (type === "date") return "Expiration date";
  if (!name) return null;

  const labels: Record<string, string> = {
    actionPrefix: "Action prefix",
    budget: "Budget",
    category: "Category",
    decision: "Decision",
    department: "Department",
    displayName: "Display name",
    email: "Email",
    entityId: "Record",
    entityType: "Record type",
    expiresAt: "Expiration date",
    fieldKeys: "Fields",
    inviteToken: "Invite token",
    markdown: "Markdown draft",
    memberId: "Member",
    mutation: "Mutation",
    name: "Name",
    note: "Note",
    permission: "Permission",
    requestId: "Request ID",
    role: "Role",
    spent: "Spent",
    status: "Status",
    summary: "Summary",
    taskId: "Task",
    title: "Title",
  };

  return labels[name] ?? name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

function renderWorkspaceSection(filteredProjects: FilmProject[], selectedProject: FilmProject): string {
  switch (state.ui.workspaceSection) {
    case "projects":
      return renderProjectsWorkspace(filteredProjects, selectedProject);
    case "breakdown":
      return renderBreakdownWorkspace(selectedProject);
    case "schedule":
      return renderScheduleWorkspace(selectedProject);
    case "shots":
      return renderShotsWorkspace(selectedProject);
    case "call-sheets":
      return renderCallSheetsWorkspace(selectedProject);
    case "sides":
      return renderSidesWorkspace(selectedProject);
    case "reports":
      return renderProductionReportsWorkspace(selectedProject);
    case "locations":
      return renderLocationsWorkspace(selectedProject);
    case "talent":
      return renderTalentWorkspace(selectedProject);
    case "tasks":
      return renderTasksWorkspace(selectedProject);
    case "docs":
      return renderDocsWorkspace(selectedProject);
    case "people":
      return renderPeopleWorkspace(selectedProject);
    case "equipment":
      return renderEquipmentWorkspace(selectedProject);
    case "expenses":
      return renderExpensesWorkspace(selectedProject);
    case "planning":
      return renderPlanningWorkspace();
    case "backups":
      return renderBackupsWorkspace();
    case "slate":
    default:
      return renderSlateWorkspace(selectedProject);
  }
}

function renderSlateWorkspace(selectedProject: FilmProject): string {
  return `
    ${renderSlateHeader(selectedProject)}
    ${renderTimeline(selectedProject)}
    ${renderOperationsGrid(selectedProject)}
    ${renderBottomGrid(selectedProject)}
    ${renderPlanningPanel(selectedProject)}
  `;
}

function renderProjectsWorkspace(filteredProjects: FilmProject[], selectedProject: FilmProject): string {
  return `
    ${renderProjectWorkspaceHeader(filteredProjects.length, selectedProject)}
    ${
      state.ui.viewMode === "list"
        ? renderProjectList(filteredProjects, selectedProject.id)
        : renderProjectBoard(filteredProjects, selectedProject.id)
    }
  `;
}

function renderBreakdownWorkspace(project: FilmProject): string {
  const breakdowns = screenplayBreakdownsForProject(project.id);
  const breakdown = selectedScreenplayBreakdown(breakdowns);
  const baseBreakdown = breakdown ? selectedScreenplayRevisionBase(breakdowns, breakdown) : null;
  const scene = breakdown ? selectedScreenplayScene(breakdown) : null;

  return `
    <div class="slate-head breakdown-workspace-head">
      <div>
        <h1>Breakdown</h1>
        <p>${escapeHtml(project.title)}${breakdown ? ` - ${escapeHtml(breakdown.revision.title)}` : ""}</p>
      </div>
      <div class="view-controls" aria-label="Breakdown controls">
        <button type="button" data-action="screenplay-import">${icon("import")} Import screenplay</button>
        <button type="button" data-action="screenplay-export" ${breakdown ? "" : "disabled"}>${icon("doc")} Export</button>
      </div>
    </div>
    ${
      !breakdown
        ? `
          <section class="panel screenplay-empty-state" aria-labelledby="screenplay-empty-title">
            <div>
              <h2 id="screenplay-empty-title">No screenplay breakdown</h2>
              <p>Use Import above to add the first local screenplay revision for ${escapeHtml(project.title)}.</p>
            </div>
          </section>
        `
        : renderScreenplayBreakdown(breakdowns, breakdown, baseBreakdown, scene)
    }
  `;
}

function renderScreenplayBreakdown(
  breakdowns: ScreenplayBreakdown[],
  breakdown: ScreenplayBreakdown,
  baseBreakdown: ScreenplayBreakdown | null,
  scene: ScreenplayBreakdown["scenes"][number] | null,
): string {
  const reviewedElements = breakdown.elements.filter((element) => element.reviewState !== "suggested").length;
  const confirmedElements = breakdown.elements.filter((element) => element.reviewState === "confirmed").length;
  const sceneRows = scene ? screenplayElementRowsForScene(breakdown, scene.id) : [];
  const filteredRows = state.ui.screenplayElementFilter === "all"
    ? sceneRows
    : sceneRows.filter((row) => row.element.category === state.ui.screenplayElementFilter);
  const copyableElementCount = filteredRows.filter((row) => (
    row.reviewState !== "dismissed" && row.element.reviewState !== "dismissed"
  )).length;
  const elementClipboard = state.screenplayElementClipboard?.breakdownId === breakdown.id
    ? state.screenplayElementClipboard
    : null;
  const reviewPercent = breakdown.elements.length > 0
    ? Math.round((reviewedElements / breakdown.elements.length) * 100)
    : 0;
  const selectedRevisionIndex = breakdowns.findIndex((candidate) => candidate.id === breakdown.id);
  const comparisonCandidates = selectedRevisionIndex >= 0 ? breakdowns.slice(selectedRevisionIndex + 1) : [];
  const searchResults = state.ui.screenplaySearch ? searchScreenplayScenes(breakdown, state.ui.screenplaySearch) : null;
  const searchResultsByScene = new Map(searchResults?.map((result) => [result.sceneId, result]) ?? []);
  const selectedSchedule = selectedProductionSchedule(breakdown.projectId);
  const matchingSchedule = selectedSchedule?.screenplayBreakdownId === breakdown.id ? selectedSchedule : null;
  const sceneOrder: ScreenplaySceneOrder = state.ui.screenplaySceneOrder === "schedule" && matchingSchedule ? "schedule" : "script";
  const orderedScenes = sceneOrder === "schedule"
    ? orderScreenplayScenesByProductionSchedule(breakdown, matchingSchedule)
    : breakdown.scenes;
  const visibleScenes = searchResults
    ? orderedScenes.filter((candidate) => searchResultsByScene.has(candidate.id))
    : orderedScenes;

  return `
    <section class="screenplay-command-bar" aria-label="Screenplay revision controls">
      <label class="control-select">
        <span>Revision</span>
        <select data-action="screenplay-revision-select" aria-label="Screenplay revision">
          ${breakdowns.map((candidate) => `
            <option value="${escapeAttribute(candidate.id)}" ${candidate.id === breakdown.id ? "selected" : ""}>
              ${escapeHtml(candidate.revision.title)} - ${escapeHtml(formatShortDateTime(candidate.revision.importedAt))}
            </option>
          `).join("")}
        </select>
      </label>
      ${comparisonCandidates.length ? `
        <label class="control-select">
          <span>Compare with</span>
          <select data-action="screenplay-base-select" aria-label="Screenplay comparison base">
            ${comparisonCandidates.map((candidate) => `
              <option value="${escapeAttribute(candidate.id)}" ${candidate.id === baseBreakdown?.id ? "selected" : ""}>
                ${escapeHtml(candidate.revision.title)} - ${escapeHtml(formatShortDateTime(candidate.revision.importedAt))}
              </option>
            `).join("")}
          </select>
        </label>
      ` : ""}
      <form class="screenplay-search-form" data-action="screenplay-search" role="search">
        <label class="sr-only" for="screenplay-search-input">Search screenplay</label>
        <input id="screenplay-search-input" name="query" type="search" maxlength="120" value="${escapeAttribute(state.ui.screenplaySearch)}" placeholder="Search script or elements">
        <button class="icon-button" type="submit" title="Search screenplay" aria-label="Search screenplay">${icon("search")}</button>
        ${state.ui.screenplaySearch ? `<button class="icon-button" type="button" data-action="screenplay-search-clear" title="Clear screenplay search" aria-label="Clear screenplay search">${icon("close")}</button>` : ""}
      </form>
      <span class="privacy-status"><span class="status-dot teal"></span> Local source</span>
      <span>${escapeHtml(breakdown.revision.format === "final_draft" ? "Final Draft" : "Fountain")}</span>
      <span>${formatBytes(breakdown.revision.sourceSizeBytes)}</span>
      ${breakdown.revision.warnings.length ? `<span class="screenplay-warning">${escapeHtml(breakdown.revision.warnings.join(" "))}</span>` : ""}
    </section>
    <section class="screenplay-stat-strip" aria-label="Breakdown status">
      <span><strong>${breakdown.scenes.length}</strong><small>Scenes</small></span>
      <span><strong>${breakdown.elements.length}</strong><small>Elements</small></span>
      <span><strong>${confirmedElements}</strong><small>Confirmed</small></span>
      <span><strong>${reviewPercent}%</strong><small>Reviewed</small></span>
    </section>
    ${baseBreakdown ? renderScreenplayRevisionReview(baseBreakdown, breakdown) : ""}
    <section class="screenplay-workspace-grid" aria-label="Screenplay breakdown workspace">
      <section class="screenplay-scene-column" aria-labelledby="screenplay-scenes-title">
        <div class="screenplay-column-head">
          <h2 id="screenplay-scenes-title">Scenes</h2>
          <div class="screenplay-scene-head-controls">
            <span>${searchResults ? `${visibleScenes.length} / ${breakdown.scenes.length}` : breakdown.scenes.length}</span>
            <div class="screenplay-scene-order" role="group" aria-label="Scene order">
              <button type="button" data-action="screenplay-scene-order" data-screenplay-scene-order="script" aria-pressed="${sceneOrder === "script"}">Script</button>
              <button type="button" data-action="screenplay-scene-order" data-screenplay-scene-order="schedule" aria-pressed="${sceneOrder === "schedule"}" ${matchingSchedule ? "" : "disabled"}>Schedule</button>
            </div>
          </div>
        </div>
        <div class="screenplay-scene-list">
          ${
            visibleScenes.length
              ? visibleScenes.map((candidate) => renderScreenplaySceneRow(
                  breakdown,
                  candidate,
                  candidate.id === scene?.id,
                  searchResultsByScene.get(candidate.id)?.matchKinds ?? [],
                )).join("")
              : `<p class="empty-inline">${searchResults ? "No local screenplay matches." : "No parsed scenes."}</p>`
          }
        </div>
      </section>
      <section class="screenplay-source-column" aria-labelledby="screenplay-source-title">
        <div class="screenplay-column-head screenplay-source-head">
          <div>
            <h2 id="screenplay-source-title">${escapeHtml(scene?.heading ?? "Source")}</h2>
            ${scene ? `<span>${escapeHtml(screenplaySceneMeta(scene))}</span>` : ""}
          </div>
          ${scene?.synopsis ? `<p>${escapeHtml(scene.synopsis)}</p>` : ""}
        </div>
        ${scene ? `<pre class="screenplay-source-text">${escapeHtml(scene.sourceText)}</pre>` : `<p class="empty-inline">No scene selected.</p>`}
      </section>
      <section class="screenplay-element-column" aria-labelledby="screenplay-elements-title">
        <div class="screenplay-column-head screenplay-element-head">
          <h2 id="screenplay-elements-title">Elements</h2>
          <div class="screenplay-element-head-controls">
            <button
              class="icon-button"
              type="button"
              data-action="screenplay-elements-copy"
              title="Copy visible active elements"
              aria-label="Copy ${copyableElementCount} visible active element${copyableElementCount === 1 ? "" : "s"}"
              ${copyableElementCount ? "" : "disabled"}
            >${icon("copy")}</button>
            <select data-action="screenplay-element-filter" aria-label="Filter production elements">
              <option value="all" ${state.ui.screenplayElementFilter === "all" ? "selected" : ""}>All</option>
              ${SCREENPLAY_ELEMENT_CATEGORIES.map((category) => `
                <option value="${category}" ${state.ui.screenplayElementFilter === category ? "selected" : ""}>${SCREENPLAY_ELEMENT_LABELS[category]}</option>
              `).join("")}
            </select>
          </div>
        </div>
        <div class="screenplay-element-list">
          ${elementClipboard ? `
            <div class="screenplay-element-clipboard" role="status">
              <div>
                <strong>${elementClipboard.elementIds.length} copied</strong>
                <span>${escapeHtml(elementClipboard.sourceSceneLabel)}</span>
              </div>
              <button
                type="button"
                data-action="screenplay-elements-paste"
                title="Paste copied elements into selected scene"
                ${scene && scene.id !== elementClipboard.sourceSceneId ? "" : "disabled"}
              >${icon("copy")} Paste</button>
              <button class="icon-button" type="button" data-action="screenplay-elements-copy-clear" title="Clear copied elements" aria-label="Clear copied elements">${icon("close")}</button>
            </div>
          ` : ""}
          ${scene ? renderManualScreenplayElementForm(scene) : ""}
          ${
            filteredRows.length
              ? filteredRows.map((row) => renderScreenplayElementRow(scene?.id ?? "", row)).join("")
              : `<p class="empty-inline">No elements in this view.</p>`
          }
        </div>
      </section>
    </section>
    ${renderScreenplayElementReport(breakdown)}
  `;
}

function renderScreenplayElementReport(breakdown: ScreenplayBreakdown): string {
  const category = state.ui.screenplayElementFilter === "all" ? null : state.ui.screenplayElementFilter;
  const report = buildScreenplayElementReport(breakdown, category);
  const duplicateSuggestions = category ? suggestScreenplayElementDuplicates(breakdown, category) : null;
  const categoryLabel = category ? SCREENPLAY_ELEMENT_LABELS[category] : "All categories";
  const selectedSceneId = state.ui.selectedScreenplaySceneId ?? breakdown.scenes[0]?.id ?? null;
  return `
    <section class="panel screenplay-element-report-panel" aria-labelledby="screenplay-element-report-title">
      <div class="section-head row">
        <div>
          <h2 id="screenplay-element-report-title">Element List</h2>
          <p>${escapeHtml(categoryLabel)} - active reviewed graph</p>
        </div>
        <div class="view-controls" aria-label="Element list exports">
          <button type="button" data-action="screenplay-element-report-markdown">${icon("doc")} Export .md</button>
          <button type="button" data-action="screenplay-element-report-csv">${icon("doc")} Export .csv</button>
        </div>
      </div>
      <div class="screenplay-element-report-summary" aria-label="Element list summary">
        <span><strong>${report.rows.length}</strong><small>Elements</small></span>
        <span><strong>${report.occurrenceCount}</strong><small>Occurrences</small></span>
        <span><strong>${report.sceneUseCount}</strong><small>Scene uses</small></span>
      </div>
      ${duplicateSuggestions?.suggestions.length ? renderScreenplayElementDuplicateSuggestions(duplicateSuggestions) : ""}
      <div class="screenplay-element-report-table-wrap" tabindex="0">
        <table class="screenplay-element-report-table">
          <thead><tr><th>Category</th><th>Element</th><th>State</th><th>Occurrences</th><th>Scenes</th><th>First scene</th><th><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>
            ${report.rows.length
              ? report.rows.map((row) => renderScreenplayElementReportRow(breakdown, row, selectedSceneId)).join("")
              : `<tr><td colspan="7"><span class="empty-inline">No active elements in this category.</span></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderScreenplayElementDuplicateSuggestions(
  suggestionSet: ReturnType<typeof suggestScreenplayElementDuplicates>,
): string {
  return `
    <section class="screenplay-duplicate-review" aria-labelledby="screenplay-duplicate-review-title">
      <div class="screenplay-duplicate-review-head">
        <div>
          <h3 id="screenplay-duplicate-review-title">Potential duplicates</h3>
          <p>${suggestionSet.suggestions.length} local name match${suggestionSet.suggestions.length === 1 ? "" : "es"}${suggestionSet.truncated ? " - bounded view" : ""}</p>
        </div>
        <span>${escapeHtml(SCREENPLAY_ELEMENT_LABELS[suggestionSet.category])}</span>
      </div>
      <ul>
        ${suggestionSet.suggestions.map((suggestion) => `
          <li data-screenplay-duplicate-pair="${escapeAttribute(`${suggestion.firstElementId}:${suggestion.secondElementId}`)}">
            <div class="screenplay-duplicate-pair">
              <span><strong>${escapeHtml(suggestion.firstName)}</strong><small>${suggestion.firstOccurrenceCount} occurrence${suggestion.firstOccurrenceCount === 1 ? "" : "s"}</small></span>
              <span aria-hidden="true">${icon("sync")}</span>
              <span><strong>${escapeHtml(suggestion.secondName)}</strong><small>${suggestion.secondOccurrenceCount} occurrence${suggestion.secondOccurrenceCount === 1 ? "" : "s"}</small></span>
            </div>
            <div class="screenplay-duplicate-score">
              <strong>${suggestion.score}%</strong>
              <small>${suggestion.reasons.map(formatScreenplayDuplicateReason).join(" - ")}</small>
            </div>
            <details class="screenplay-duplicate-actions">
              <summary>Review merge</summary>
              <div>
                <button
                  type="button"
                  data-action="screenplay-element-merge"
                  data-screenplay-element-target-id="${escapeAttribute(suggestion.firstElementId)}"
                  data-screenplay-element-source-id="${escapeAttribute(suggestion.secondElementId)}"
                >${icon("check")} Keep ${escapeHtml(suggestion.firstName)}</button>
                <button
                  type="button"
                  data-action="screenplay-element-merge"
                  data-screenplay-element-target-id="${escapeAttribute(suggestion.secondElementId)}"
                  data-screenplay-element-source-id="${escapeAttribute(suggestion.firstElementId)}"
                >${icon("check")} Keep ${escapeHtml(suggestion.secondName)}</button>
              </div>
              <small>Live planning links follow the kept element. Issued documents remain unchanged.</small>
            </details>
          </li>
        `).join("")}
      </ul>
    </section>
  `;
}

function formatScreenplayDuplicateReason(reason: string): string {
  return ({
    normalized_match: "normalized match",
    name_containment: "contained name",
    shared_terms: "shared terms",
    similar_spelling: "similar spelling",
  } as Record<string, string>)[reason] ?? reason.replaceAll("_", " ");
}

function renderScreenplayElementReportRow(
  breakdown: ScreenplayBreakdown,
  row: ReturnType<typeof buildScreenplayElementReport>["rows"][number],
  selectedSceneId: string | null,
): string {
  const isInSelectedScene = selectedSceneId !== null && row.scenes.some((scene) => scene.id === selectedSceneId);
  const occurrenceLabel = `${row.occurrenceCount} occurrence position${row.occurrenceCount === 1 ? "" : "s"}`;
  return `
    <tr data-screenplay-element-report-id="${escapeAttribute(row.elementId)}">
      <td>${escapeHtml(SCREENPLAY_ELEMENT_LABELS[row.category])}</td>
      <td>
        <strong>${escapeHtml(row.name)}</strong>
        <small>${escapeHtml(row.source.replaceAll("_", " "))}</small>
        <details class="screenplay-element-occurrences">
          <summary>${escapeHtml(occurrenceLabel)}</summary>
          <ul>
            ${row.occurrences.map((occurrence) => `
              <li>
                <button
                  type="button"
                  data-screenplay-occurrence-scene-id="${escapeAttribute(occurrence.sceneId)}"
                  data-screenplay-occurrence-element-name="${escapeAttribute(row.name)}"
                  title="Open scene ${escapeAttribute(occurrence.sceneNumber ?? String(occurrence.sceneOrdinal))}"
                >
                  <span><strong>Scene ${escapeHtml(occurrence.sceneNumber ?? String(occurrence.sceneOrdinal))}</strong><small>${escapeHtml(occurrence.sceneHeading)} - line ${occurrence.sourceLine} - ${escapeHtml(occurrence.reviewState)}</small></span>
                  ${icon("pin")}
                </button>
              </li>
            `).join("")}
          </ul>
        </details>
        ${renderScreenplayElementCategoryMove(breakdown, row)}
      </td>
      <td>${escapeHtml(row.reviewState)}</td>
      <td>${row.confirmedOccurrenceCount} / ${row.occurrenceCount}</td>
      <td>${escapeHtml(row.scenes.map((scene) => scene.sceneNumber ?? String(scene.ordinal)).join(", ") || "-")}</td>
      <td>${row.firstScene ? `<strong>${escapeHtml(row.firstScene.sceneNumber ?? String(row.firstScene.ordinal))}</strong><small>${escapeHtml(row.firstScene.heading)}</small>` : "-"}</td>
      <td class="screenplay-element-report-actions">
        <button
          class="icon-button"
          type="button"
          data-action="screenplay-element-apply-selected"
          data-screenplay-element-id="${escapeAttribute(row.elementId)}"
          title="${isInSelectedScene ? "Element is already in the selected scene" : "Add element to selected scene"}"
          aria-label="${isInSelectedScene ? `${escapeAttribute(row.name)} is already in the selected scene` : `Add ${escapeAttribute(row.name)} to selected scene`}"
          ${isInSelectedScene ? "disabled" : ""}
        >${icon(isInSelectedScene ? "check" : "plus")}</button>
      </td>
    </tr>
  `;
}

function renderScreenplayElementCategoryMove(
  breakdown: ScreenplayBreakdown,
  row: ReturnType<typeof buildScreenplayElementReport>["rows"][number],
): string {
  const element = breakdown.elements.find((candidate) => candidate.id === row.elementId);
  if (!element) return "";
  const normalizedName = normalizeScreenplayElementName(element.normalizedName || element.name);
  return `
    <details class="screenplay-element-category-move">
      <summary>${icon("sync")} Move category</summary>
      <form data-action="screenplay-element-category-move">
        <input type="hidden" name="elementId" value="${escapeAttribute(element.id)}" />
        <select name="category" required aria-label="Destination category for ${escapeAttribute(element.name)}">
          <option value="">Choose category</option>
          ${SCREENPLAY_ELEMENT_CATEGORIES.filter((category) => category !== element.category).map((category) => {
            const combinesWithExisting = breakdown.elements.some((candidate) => (
              candidate.id !== element.id
              && candidate.category === category
              && candidate.reviewState !== "dismissed"
              && normalizeScreenplayElementName(candidate.normalizedName || candidate.name) === normalizedName
            ));
            return `<option value="${escapeAttribute(category)}">${escapeHtml(SCREENPLAY_ELEMENT_LABELS[category])}${combinesWithExisting ? " - combine existing" : ""}</option>`;
          }).join("")}
        </select>
        <button type="submit">${icon("sync")} Move</button>
      </form>
    </details>
  `;
}

function renderScreenplayRevisionReview(previous: ScreenplayBreakdown, next: ScreenplayBreakdown): string {
  const comparison = compareScreenplayRevisions(previous, next);
  const changedScenes = comparison.sceneChanges.filter((change) => change.status !== "unchanged");
  const schedules = state.workspace.productionSchedules.filter((schedule) => schedule.screenplayBreakdownId === previous.id).length;
  const availability = state.workspace.productionAvailability.filter((window) => window.screenplayBreakdownId === previous.id).length;
  const linkedResources = state.workspace.productionLocations.filter((location) => location.screenplayBreakdownId === previous.id).length
    + state.workspace.productionTalent.filter((talent) => talent.screenplayBreakdownId === previous.id).length
    + state.workspace.productionShots.filter((shot) => shot.screenplayBreakdownId === previous.id).length;
  return `
    <section class="screenplay-revision-panel" aria-labelledby="screenplay-revision-review-title">
      <div class="screenplay-revision-head">
        <div>
          <h2 id="screenplay-revision-review-title">Revision changes</h2>
          <p>${escapeHtml(previous.revision.title)} to ${escapeHtml(next.revision.title)}</p>
        </div>
        <div class="view-controls" aria-label="Screenplay revision actions">
          <button type="button" data-action="screenplay-revision-export">${icon("doc")} Export report</button>
          <button type="button" data-action="screenplay-revision-carry-forward">${icon("import")} Carry planning forward</button>
        </div>
      </div>
      <div class="screenplay-revision-summary" aria-label="Revision change counts">
        ${renderScreenplayRevisionMetric(comparison.unchangedSceneCount, "Unchanged", "unchanged")}
        ${renderScreenplayRevisionMetric(comparison.changedSceneCount, "Changed", "changed")}
        ${renderScreenplayRevisionMetric(comparison.addedSceneCount, "Added", "added")}
        ${renderScreenplayRevisionMetric(comparison.removedSceneCount, "Removed", "removed")}
      </div>
      <div class="screenplay-revision-body">
        <div class="screenplay-revision-change-list">
          ${changedScenes.length
            ? changedScenes.map(renderScreenplayRevisionChange).join("")
            : `<p class="empty-inline">No scene changes detected.</p>`}
        </div>
        <aside class="screenplay-revision-impact">
          <h3>Planning impact</h3>
          <ul class="line-list">
            <li><strong>Schedules</strong><span>${schedules}</span><small>New draft copies; originals remain intact</small></li>
            <li><strong>Availability</strong><span>${availability}</span><small>Matching cast and location windows</small></li>
            <li><strong>Linked records</strong><span>${linkedResources}</span><small>Shots, talent, and locations with stable matches</small></li>
          </ul>
          <p>Final call sheets, sides, and production reports stay pinned to their original revision.</p>
        </aside>
      </div>
    </section>
  `;
}

function renderScreenplayRevisionMetric(count: number, label: string, status: string): string {
  return `<span class="${escapeAttribute(status)}"><strong>${count}</strong><small>${escapeHtml(label)}</small></span>`;
}

function renderScreenplayRevisionChange(change: ScreenplayRevisionSceneChange): string {
  const previousLabel = change.previousSceneNumber ?? (change.previousOrdinal === null ? null : String(change.previousOrdinal));
  const nextLabel = change.nextSceneNumber ?? (change.nextOrdinal === null ? null : String(change.nextOrdinal));
  const heading = change.nextHeading ?? change.previousHeading ?? "Untitled scene";
  const sceneLabel = previousLabel && nextLabel && previousLabel !== nextLabel
    ? `${previousLabel} to ${nextLabel}`
    : nextLabel ?? previousLabel ?? "-";
  const matchLabel = change.matchBasis ? change.matchBasis.replaceAll("_", " ") : "new revision boundary";
  return `
    <article class="screenplay-revision-change ${change.status}">
      <span class="screenplay-scene-number">${escapeHtml(sceneLabel)}</span>
      <span>
        <strong>${escapeHtml(heading)}</strong>
        <small>${escapeHtml(change.status)} - ${escapeHtml(matchLabel)}</small>
      </span>
    </article>
  `;
}

function renderScreenplaySceneRow(
  breakdown: ScreenplayBreakdown,
  scene: ScreenplayBreakdown["scenes"][number],
  selected: boolean,
  searchMatchKinds: string[] = [],
): string {
  const rows = screenplayElementRowsForScene(breakdown, scene.id);
  const pending = rows.filter((row) => row.reviewState === "suggested").length;
  return `
    <button
      class="screenplay-scene-row ${selected ? "is-selected" : ""}"
      type="button"
      data-screenplay-scene-id="${escapeAttribute(scene.id)}"
    >
      <span class="screenplay-scene-number">${escapeHtml(scene.sceneNumber ?? String(scene.ordinal))}</span>
      <span class="screenplay-scene-copy">
        <strong>${escapeHtml(scene.heading)}</strong>
        <small>${searchMatchKinds.length
          ? `Matched ${escapeHtml(searchMatchKinds.join(" + "))}`
          : `${rows.length} elements${pending ? ` - ${pending} pending` : " - reviewed"}`}</small>
      </span>
    </button>
  `;
}

function renderManualScreenplayElementForm(scene: ScreenplayBreakdown["scenes"][number]): string {
  return `
    <form class="screenplay-manual-element-form" data-action="screenplay-manual-element">
      <input type="hidden" name="sceneId" value="${escapeAttribute(scene.id)}">
      <label class="sr-only" for="screenplay-manual-element-category">Element category</label>
      <select id="screenplay-manual-element-category" name="category" aria-label="Element category">
        ${SCREENPLAY_ELEMENT_CATEGORIES.map((category) => `<option value="${category}">${SCREENPLAY_ELEMENT_LABELS[category]}</option>`).join("")}
      </select>
      <label class="sr-only" for="screenplay-manual-element-name">Element name</label>
      <input id="screenplay-manual-element-name" name="name" maxlength="180" placeholder="Add missed element" required>
      <button class="icon-button" type="submit" title="Add element to scene" aria-label="Add element to scene">${icon("plus")}</button>
    </form>
  `;
}

type ScreenplayElementRow = {
  element: ScreenplayBreakdown["elements"][number];
  occurrences: ScreenplayBreakdown["occurrences"];
  reviewState: ScreenplayReviewState;
};

function renderScreenplayElementRow(sceneId: string, row: ScreenplayElementRow): string {
  const sourceLabel = row.element.source.replaceAll("_", " ");
  return `
    <article class="screenplay-element-row ${row.reviewState}">
      <div class="screenplay-element-copy">
        <span class="screenplay-element-category">${escapeHtml(SCREENPLAY_ELEMENT_LABELS[row.element.category])}</span>
        <strong>${escapeHtml(row.element.name)}</strong>
        <small>${escapeHtml(sourceLabel)}${row.occurrences.length > 1 ? ` - ${row.occurrences.length} occurrences` : ""}</small>
      </div>
      <div class="screenplay-review-controls" aria-label="Review ${escapeAttribute(row.element.name)}">
        <button
          class="icon-button ${row.reviewState === "confirmed" ? "is-active" : ""}"
          type="button"
          title="Confirm element"
          aria-label="Confirm ${escapeAttribute(row.element.name)}"
          data-screenplay-review="confirmed"
          data-screenplay-scene-id="${escapeAttribute(sceneId)}"
          data-screenplay-element-id="${escapeAttribute(row.element.id)}"
        >${icon("check")}</button>
        <button
          class="icon-button ${row.reviewState === "dismissed" ? "is-active" : ""}"
          type="button"
          title="Dismiss suggestion"
          aria-label="Dismiss ${escapeAttribute(row.element.name)}"
          data-screenplay-review="dismissed"
          data-screenplay-scene-id="${escapeAttribute(sceneId)}"
          data-screenplay-element-id="${escapeAttribute(row.element.id)}"
        >${icon("close")}</button>
      </div>
    </article>
  `;
}

function screenplayBreakdownsForProject(projectId: string): ScreenplayBreakdown[] {
  return state.workspace.screenplayBreakdowns
    .filter((breakdown) => breakdown.projectId === projectId)
    .sort((left, right) => right.revision.importedAt.localeCompare(left.revision.importedAt));
}

function selectedScreenplayBreakdown(breakdowns = screenplayBreakdownsForProject(state.ui.selectedProjectId)): ScreenplayBreakdown | null {
  return breakdowns.find((breakdown) => breakdown.id === state.ui.selectedScreenplayId) ?? breakdowns[0] ?? null;
}

function selectedScreenplayRevisionBase(
  breakdowns: ScreenplayBreakdown[],
  selected: ScreenplayBreakdown,
): ScreenplayBreakdown | null {
  const selectedIndex = breakdowns.findIndex((breakdown) => breakdown.id === selected.id);
  const candidates = selectedIndex >= 0 ? breakdowns.slice(selectedIndex + 1) : [];
  const explicit = candidates.find((breakdown) => breakdown.id === state.ui.selectedScreenplayBaseId);
  if (explicit) return explicit;
  return candidates[0] ?? null;
}

function selectedScreenplayScene(breakdown: ScreenplayBreakdown): ScreenplayBreakdown["scenes"][number] | null {
  return breakdown.scenes.find((scene) => scene.id === state.ui.selectedScreenplaySceneId) ?? breakdown.scenes[0] ?? null;
}

function screenplayElementRowsForScene(breakdown: ScreenplayBreakdown, sceneId: string): ScreenplayElementRow[] {
  const elementsById = new Map(breakdown.elements.map((element) => [element.id, element]));
  const occurrencesByElement = new Map<string, ScreenplayBreakdown["occurrences"]>();
  for (const occurrence of breakdown.occurrences) {
    if (occurrence.sceneId !== sceneId) continue;
    const occurrences = occurrencesByElement.get(occurrence.elementId) ?? [];
    occurrences.push(occurrence);
    occurrencesByElement.set(occurrence.elementId, occurrences);
  }
  return [...occurrencesByElement.entries()].flatMap(([elementId, occurrences]) => {
    const element = elementsById.get(elementId);
    return element
      ? [{ element, occurrences, reviewState: aggregateScreenplayReviewState(occurrences.map((occurrence) => occurrence.reviewState)) }]
      : [];
  });
}

function screenplaySceneMeta(scene: ScreenplayBreakdown["scenes"][number]): string {
  const parts = [
    `Scene ${scene.sceneNumber ?? scene.ordinal}`,
    scene.interiorExterior,
    scene.location,
    scene.timeOfDay,
    `lines ${scene.sourceStartLine}-${scene.sourceEndLine}`,
  ];
  return parts.filter(Boolean).join(" - ");
}

function renderScheduleWorkspace(project: FilmProject): string {
  const selectedSchedule = selectedProductionSchedule(project.id);

  return `
    <div class="slate-head schedule-workspace-head">
      <div>
        <h1>Schedule</h1>
        <p>${escapeHtml(project.title)} - ${escapeHtml(project.shootDates)} - ${escapeHtml(project.phase)}</p>
      </div>
      <div class="view-controls" aria-label="Schedule controls">
        <button type="button" data-action="schedule-export" ${selectedSchedule ? "" : "disabled"}>${icon("doc")} Export stripboard</button>
        <button type="button" data-action="export-project-packet">${icon("doc")} Export packet</button>
      </div>
    </div>
    ${renderProductionStripboard(project, selectedSchedule)}
    ${renderProductionAvailability(project, selectedSchedule)}
    ${renderProductionScheduleScenarios(project, selectedSchedule)}
    ${renderProductionBudgetEstimate(project, selectedSchedule)}
  `;
}

function renderProductionStripboard(project: FilmProject, schedule: ProductionScheduleVersion | null): string {
  const breakdowns = screenplayBreakdownsForProject(project.id);
  const fallbackBreakdown = selectedScreenplayBreakdown(breakdowns);
  if (!fallbackBreakdown) {
    return `
      <section class="panel stripboard-empty-state" aria-labelledby="stripboard-empty-title">
        <div>
          <h2 id="stripboard-empty-title">No breakdown available</h2>
          <p>${escapeHtml(project.title)} has no local screenplay graph.</p>
        </div>
        <button class="secondary-button" type="button" data-workspace-section="breakdown">${icon("doc")} Breakdown</button>
      </section>
    `;
  }
  if (!schedule) {
    return `
      <section class="panel stripboard-empty-state" aria-labelledby="stripboard-empty-title">
        <div>
          <h2 id="stripboard-empty-title">No stripboard version</h2>
          <p>${escapeHtml(fallbackBreakdown.revision.title)} - ${fallbackBreakdown.scenes.length} scenes</p>
        </div>
        <button class="secondary-button" type="button" data-action="schedule-create">${icon("plus")} Create schedule</button>
      </section>
    `;
  }

  const breakdown = state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === schedule.screenplayBreakdownId);
  if (!breakdown) {
    return `
      <section class="panel stripboard-empty-state" aria-labelledby="stripboard-missing-title">
        <div>
          <h2 id="stripboard-missing-title">Schedule source missing</h2>
          <p>${escapeHtml(schedule.title)} references an unavailable screenplay revision.</p>
        </div>
      </section>
    `;
  }

  const schedules = productionSchedulesForProject(project.id);
  const assignedCount = schedule.shootDays.reduce((total, day) => total + productionScheduleDayStripCount(day), 0);
  const unassignedCount = schedule.unassignedSceneIds.length + (schedule.unassignedSceneParts?.length ?? 0);
  const selectedStrips = selectedProductionScheduleStrips(schedule.id);
  const locked = schedule.status === "locked";
  return `
    <section class="stripboard-workspace" aria-labelledby="stripboard-title">
      <div class="stripboard-command-bar">
        <div>
          <h2 id="stripboard-title">Stripboard</h2>
          <span>${escapeHtml(breakdown.revision.title)} - ${escapeHtml(schedule.status)}</span>
        </div>
        <label class="control-select">
          <span>Version</span>
          <select data-action="schedule-version-select" aria-label="Schedule version">
            ${schedules.map((candidate) => `
              <option value="${escapeAttribute(candidate.id)}" ${candidate.id === schedule.id ? "selected" : ""}>
                ${escapeHtml(candidate.title)} - ${escapeHtml(formatShortDateTime(candidate.updatedAt))}
              </option>
            `).join("")}
          </select>
        </label>
        <div class="stripboard-actions">
          <button type="button" data-action="schedule-duplicate">${icon("doc")} Duplicate</button>
          <button type="button" data-action="schedule-add-day" ${locked ? "disabled" : ""}>${icon("plus")} Add day</button>
          <button type="button" data-action="schedule-lock-toggle">${icon(locked ? "unlock" : "lock")} ${locked ? "Unlock" : "Lock"}</button>
        </div>
      </div>
      ${renderProductionScheduleBatchMove(schedule, selectedStrips)}
      <div class="stripboard-stat-strip" aria-label="Stripboard status">
        <span><strong>${schedule.shootDays.length}</strong><small>Shoot days</small></span>
        <span><strong>${assignedCount}</strong><small>Assigned strips</small></span>
        <span><strong>${unassignedCount}</strong><small>Unassigned strips</small></span>
        <span><strong>${breakdown.scenes.length}</strong><small>Total scenes</small></span>
      </div>
      <div class="stripboard-lanes" tabindex="0">
        ${renderStripboardLane(schedule, breakdown, null, "Unassigned", schedule.unassignedSceneIds)}
        ${schedule.shootDays.map((day) => renderStripboardLane(schedule, breakdown, day.id, `Day ${day.ordinal}`, day.sceneIds)).join("")}
      </div>
    </section>
  `;
}

function renderProductionScheduleBatchMove(
  schedule: ProductionScheduleVersion,
  selectedStrips: ProductionScheduleStripReference[],
): string {
  if (!selectedStrips.length) return "";
  return `
    <form class="stripboard-batch-move" data-action="schedule-strip-batch-move">
      <strong>${selectedStrips.length} strip${selectedStrips.length === 1 ? "" : "s"} selected</strong>
      <label>
        <span>Move to</span>
        <select name="targetDayId" aria-label="Batch strip destination" ${schedule.status === "locked" ? "disabled" : ""}>
          <option value="unassigned">Unassigned</option>
          ${schedule.shootDays.map((day) => `
            <option value="${escapeAttribute(day.id)}">Day ${day.ordinal} - ${escapeHtml(productionUnitLabel(day.unit))}${day.date ? ` - ${day.date}` : ""}</option>
          `).join("")}
        </select>
      </label>
      <button type="submit" ${schedule.status === "locked" ? "disabled" : ""}>${icon("sync")} Move</button>
      <button
        class="icon-button"
        type="button"
        title="Clear strip selection"
        aria-label="Clear strip selection"
        data-action="schedule-strip-selection-clear"
      >${icon("close")}</button>
    </form>
  `;
}

function renderStripboardLane(
  schedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
  dayId: string | null,
  label: string,
  sceneIds: string[],
): string {
  const scenesById = new Map(breakdown.scenes.map((scene) => [scene.id, scene]));
  const scenes = sceneIds.flatMap((sceneId) => {
    const scene = scenesById.get(sceneId);
    return scene ? [scene] : [];
  });
  const day = dayId ? schedule.shootDays.find((candidate) => candidate.id === dayId) ?? null : null;
  const sceneParts = day ? day.sceneParts ?? [] : schedule.unassignedSceneParts ?? [];
  const items = [
    ...scenes.map((scene, index) => ({ scene, part: null as ProductionScheduleScenePart | null, laneIndex: index, laneLength: scenes.length })),
    ...sceneParts.flatMap((part, index) => {
      const scene = scenesById.get(part.sceneId);
      return scene ? [{ scene, part, laneIndex: index, laneLength: sceneParts.length }] : [];
    }),
  ];
  const locationCount = new Set(items.map(({ scene }) => scene.location).filter(Boolean)).size;
  const locked = schedule.status === "locked";
  const unitLabel = day ? productionUnitLabel(day.unit) : null;
  return `
    <section class="stripboard-lane ${dayId ? "shoot-day" : "unassigned"}" aria-label="${escapeAttribute(label)}" ${day ? `data-production-unit="${escapeAttribute(day.unit)}"` : ""}>
      <div class="stripboard-lane-head">
        <div>
          <h3>${escapeHtml(label)}</h3>
          <span>${unitLabel ? `${escapeHtml(unitLabel)} - ` : ""}${items.length} strips - ${locationCount} locations</span>
        </div>
        ${
          day
            ? `
              <div class="stripboard-day-controls">
                <select
                  data-action="schedule-day-unit"
                  data-schedule-day-id="${escapeAttribute(day.id)}"
                  aria-label="Unit for day ${day.ordinal}"
                  ${locked ? "disabled" : ""}
                >
                  <option value="main" ${day.unit === "main" ? "selected" : ""}>Main unit</option>
                  <option value="second" ${day.unit === "second" ? "selected" : ""}>Second unit</option>
                </select>
                <input
                  type="date"
                  value="${escapeAttribute(day.date ?? "")}"
                  data-action="schedule-day-date"
                  data-schedule-day-id="${escapeAttribute(day.id)}"
                  aria-label="Date for day ${day.ordinal}"
                  ${locked ? "disabled" : ""}
                />
                <button
                  class="icon-button"
                  type="button"
                  title="Remove shoot day"
                  aria-label="Remove day ${day.ordinal}"
                  data-action="schedule-remove-day"
                  data-schedule-day-id="${escapeAttribute(day.id)}"
                  ${locked ? "disabled" : ""}
                >${icon("trash")}</button>
              </div>
            `
            : `<span class="stripboard-pool-label">Scene pool</span>`
        }
      </div>
      <div class="stripboard-scene-list">
        ${
          items.length
            ? items.map(({ scene, part, laneIndex, laneLength }) => renderStripboardScene(schedule, breakdown, scene, part, dayId, laneIndex, laneLength)).join("")
            : `<p class="empty-inline">No strips.</p>`
        }
      </div>
    </section>
  `;
}

function renderStripboardScene(
  schedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
  scene: ScreenplayBreakdown["scenes"][number],
  part: ProductionScheduleScenePart | null,
  dayId: string | null,
  index: number,
  laneLength: number,
): string {
  const elementRows = screenplayElementRowsForScene(breakdown, scene.id);
  const castCount = elementRows.filter((row) => row.element.category === "cast" && row.reviewState !== "dismissed").length;
  const confirmedCount = elementRows.filter((row) => row.reviewState === "confirmed").length;
  const locked = schedule.status === "locked";
  const stripTone = scene.interiorExterior?.includes("EXT") ? "exterior" : "interior";
  const stripLabel = `${scene.sceneNumber ?? String(scene.ordinal)}${part?.label ?? ""}`;
  const stripReference: ProductionScheduleStripReference = part
    ? { kind: "scene_part", id: part.id }
    : { kind: "scene", id: scene.id };
  const selected = selectedProductionScheduleStrips(schedule.id)
    .some((candidate) => productionScheduleStripReferenceKey(candidate) === productionScheduleStripReferenceKey(stripReference));
  const splitAvailable = scene.sourceEndLine > scene.sourceStartLine;
  return `
    <article class="stripboard-scene ${stripTone}" ${part ? `data-schedule-scene-part-id="${escapeAttribute(part.id)}"` : ""}>
      <input
        class="stripboard-scene-select"
        type="checkbox"
        data-action="schedule-strip-select"
        data-schedule-strip-kind="${stripReference.kind}"
        data-schedule-strip-id="${escapeAttribute(stripReference.id)}"
        aria-label="Select strip ${escapeAttribute(stripLabel)} for batch move"
        ${selected ? "checked" : ""}
        ${locked ? "disabled" : ""}
      />
      <span class="stripboard-scene-number">${escapeHtml(stripLabel)}</span>
      <div class="stripboard-scene-copy">
        <strong>${escapeHtml(scene.heading)}</strong>
        <small>${part ? `Part ${escapeHtml(part.label)} - lines ${part.sourceStartLine}-${part.sourceEndLine} - ` : ""}${castCount} cast - ${elementRows.length} elements - ${confirmedCount} confirmed</small>
      </div>
      <select
        data-action="schedule-scene-assign"
        data-schedule-scene-id="${escapeAttribute(scene.id)}"
        ${part ? `data-schedule-scene-part-id="${escapeAttribute(part.id)}"` : ""}
        aria-label="Assign ${escapeAttribute(scene.heading)}"
        ${locked ? "disabled" : ""}
      >
        <option value="unassigned" ${dayId === null ? "selected" : ""}>Unassigned</option>
        ${schedule.shootDays.map((day) => `
          <option value="${escapeAttribute(day.id)}" ${day.id === dayId ? "selected" : ""}>Day ${day.ordinal} - ${escapeHtml(productionUnitLabel(day.unit))}${day.date ? ` - ${day.date}` : ""}</option>
        `).join("")}
      </select>
      <div class="stripboard-order-controls">
        <button
          class="icon-button"
          type="button"
          title="Move scene up"
          aria-label="Move ${escapeAttribute(scene.heading)} up"
          data-action="schedule-scene-reorder"
          data-schedule-scene-id="${escapeAttribute(scene.id)}"
          ${part ? `data-schedule-scene-part-id="${escapeAttribute(part.id)}"` : ""}
          data-schedule-direction="-1"
          ${locked || index === 0 ? "disabled" : ""}
        >${icon("arrow-up")}</button>
        <button
          class="icon-button"
          type="button"
          title="Move scene down"
          aria-label="Move ${escapeAttribute(scene.heading)} down"
          data-action="schedule-scene-reorder"
          data-schedule-scene-id="${escapeAttribute(scene.id)}"
          ${part ? `data-schedule-scene-part-id="${escapeAttribute(part.id)}"` : ""}
          data-schedule-direction="1"
          ${locked || index === laneLength - 1 ? "disabled" : ""}
        >${icon("arrow-down")}</button>
        <button
          class="icon-button"
          type="button"
          title="${part ? "Merge split scene" : "Split scene"}"
          aria-label="${part ? `Merge split scene ${escapeAttribute(stripLabel)}` : `Split scene ${escapeAttribute(stripLabel)}`}"
          data-action="${part ? "schedule-scene-merge" : "schedule-scene-split"}"
          data-schedule-scene-id="${escapeAttribute(scene.id)}"
          ${locked || (!part && !splitAvailable) ? "disabled" : ""}
        >${icon(part ? "undo" : "scissors")}</button>
      </div>
    </article>
  `;
}

function productionSchedulesForProject(projectId: string): ProductionScheduleVersion[] {
  return state.workspace.productionSchedules
    .filter((schedule) => schedule.projectId === projectId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function selectedProductionSchedule(projectId = state.ui.selectedProjectId): ProductionScheduleVersion | null {
  const schedules = productionSchedulesForProject(projectId);
  return schedules.find((schedule) => schedule.id === state.ui.selectedScheduleId) ?? schedules[0] ?? null;
}

function productionScheduleDayStripCount(day: ProductionScheduleVersion["shootDays"][number]): number {
  return day.sceneIds.length + (day.sceneParts?.length ?? 0);
}

function productionScheduleStripReferenceKey(reference: ProductionScheduleStripReference): string {
  return `${reference.kind}:${reference.id}`;
}

function selectedProductionScheduleStrips(scheduleId: string): ProductionScheduleStripReference[] {
  return state.productionScheduleStripSelection?.scheduleId === scheduleId
    ? state.productionScheduleStripSelection.strips
    : [];
}

function renderProductionAvailability(project: FilmProject, schedule: ProductionScheduleVersion | null): string {
  if (!schedule) return "";
  const breakdown = state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === schedule.screenplayBreakdownId);
  if (!breakdown) return "";
  const windows = productionAvailabilityForBreakdown(breakdown.id);
  const resources = breakdown.elements
    .filter((element) => (element.category === "cast" || element.category === "location") && element.reviewState !== "dismissed")
    .sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));
  const analysis = analyzeProductionSchedule(schedule, breakdown, windows);
  const defaultDate = schedule.shootDays.find((day) => day.date)?.date ?? "";
  return `
    <section class="schedule-availability-workspace" aria-labelledby="schedule-availability-title">
      <div class="schedule-availability-head">
        <div>
          <h2 id="schedule-availability-title">Availability &amp; conflicts</h2>
          <span>${windows.length} windows - ${analysis.blockingConflictCount} blocking - ${analysis.warningConflictCount} warnings</span>
        </div>
        <div class="schedule-conflict-counts" aria-label="Conflict counts">
          <span class="blocking"><strong>${analysis.blockingConflictCount}</strong> Blocking</span>
          <span class="warning"><strong>${analysis.warningConflictCount}</strong> Warnings</span>
        </div>
      </div>
      <form class="schedule-availability-form" data-action="schedule-availability-add">
        <label>
          <span>Resource</span>
          <select name="elementId" required ${resources.length ? "" : "disabled"}>
            ${resources.map((element) => `
              <option value="${escapeAttribute(element.id)}">${escapeHtml(element.category === "cast" ? "Cast" : "Location")} - ${escapeHtml(element.name)}</option>
            `).join("")}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select name="status" required>
            <option value="unavailable">Unavailable</option>
            <option value="available">Available</option>
            <option value="preferred">Preferred</option>
          </select>
        </label>
        <label>
          <span>From</span>
          <input type="date" name="startDate" value="${escapeAttribute(defaultDate)}" required />
        </label>
        <label>
          <span>Through</span>
          <input type="date" name="endDate" value="${escapeAttribute(defaultDate)}" required />
        </label>
        <label class="schedule-availability-notes">
          <span>Notes</span>
          <input type="text" name="notes" maxlength="500" placeholder="Optional" />
        </label>
        <button class="primary-action" type="submit" ${resources.length ? "" : "disabled"}>${icon("plus")} Add window</button>
      </form>
      <div class="schedule-availability-grid">
        ${renderProductionAvailabilityWindows(windows)}
        ${renderProductionConflicts(analysis, breakdown)}
      </div>
      ${renderProductionDood(analysis, schedule)}
    </section>
  `;
}

function renderProductionAvailabilityWindows(windows: ProductionAvailabilityWindow[]): string {
  return `
    <section class="schedule-availability-list" aria-labelledby="schedule-availability-windows-title">
      <div class="schedule-subhead">
        <h3 id="schedule-availability-windows-title">Windows</h3>
        <span>${windows.length} records</span>
      </div>
      <div class="schedule-availability-rows" tabindex="0" aria-label="Availability windows">
        ${windows.length ? windows.map((window) => `
          <div class="schedule-availability-row">
            <span class="resource-type">${escapeHtml(window.resourceCategory)}</span>
            <div><strong>${escapeHtml(window.resourceName)}</strong><small>${escapeHtml(window.startDate)} to ${escapeHtml(window.endDate)}${window.notes ? ` - ${escapeHtml(window.notes)}` : ""}</small></div>
            <span class="availability-status ${escapeAttribute(window.status)}">${escapeHtml(window.status)}</span>
            <button class="icon-button" type="button" title="Delete availability window" aria-label="Delete ${escapeAttribute(window.resourceName)} availability window" data-action="schedule-availability-delete" data-availability-id="${escapeAttribute(window.id)}">${icon("trash")}</button>
          </div>
        `).join("") : `<p class="empty-inline">No availability windows.</p>`}
      </div>
    </section>
  `;
}

function renderProductionConflicts(analysis: ProductionScheduleAnalysis, breakdown: ScreenplayBreakdown): string {
  const sceneNumbers = new Map(breakdown.scenes.map((scene) => [scene.id, scene.sceneNumber ?? String(scene.ordinal)]));
  return `
    <section class="schedule-conflict-list" aria-labelledby="schedule-conflicts-title">
      <div class="schedule-subhead">
        <h3 id="schedule-conflicts-title">Conflict analysis</h3>
        <span>Deterministic</span>
      </div>
      <div class="schedule-conflict-rows" tabindex="0" aria-label="Schedule conflicts">
        ${analysis.conflicts.length ? analysis.conflicts.map((conflict) => `
          <div class="schedule-conflict-row ${escapeAttribute(conflict.severity)}">
            <span class="conflict-mark">${conflict.severity === "blocking" ? "!" : "?"}</span>
            <div>
              <strong>${escapeHtml(conflict.message)}</strong>
              <small>Day ${conflict.dayOrdinal}${conflict.sceneIds.length ? ` - scenes ${escapeHtml(conflict.sceneIds.map((sceneId) => sceneNumbers.get(sceneId) ?? sceneId).join(", "))}` : ""}</small>
            </div>
          </div>
        `).join("") : `<p class="empty-inline">No schedule conflicts.</p>`}
      </div>
    </section>
  `;
}

function renderProductionDood(analysis: ProductionScheduleAnalysis, schedule: ProductionScheduleVersion): string {
  const days = analysis.doodRows[0]?.days ?? [];
  const locked = schedule.status === "locked";
  return `
    <section class="schedule-dood" aria-labelledby="schedule-dood-title">
      <div class="schedule-subhead">
        <h3 id="schedule-dood-title">Cast day-out-of-days</h3>
        <span>W = work - T = travel - H = hold</span>
      </div>
      <div class="schedule-dood-scroll" tabindex="0">
        ${analysis.doodRows.length ? `
          <table>
            <thead><tr><th scope="col">Cast</th>${days.map((day) => `<th scope="col">D${day.dayOrdinal}<small>${day.unit === "second" ? "2nd" : "Main"} - ${escapeHtml(day.date ?? "Undated")}</small></th>`).join("")}<th scope="col">Work</th><th scope="col">Travel</th><th scope="col">Hold</th><th scope="col">Idle</th></tr></thead>
            <tbody>${analysis.doodRows.map((row) => `
              <tr>
                <th scope="row">${escapeHtml(row.name)}</th>
                ${row.days.map((day) => day.state === "work"
                  ? `<td class="work" aria-label="${escapeAttribute(`${row.name}, Day ${day.dayOrdinal}: Work`)}">W</td>`
                  : `<td class="${day.state}">
                    <select
                      data-action="schedule-dood-status"
                      data-schedule-cast-element-id="${escapeAttribute(row.elementId)}"
                      data-schedule-day-id="${escapeAttribute(day.dayId)}"
                      aria-label="${escapeAttribute(`${row.name} status for Day ${day.dayOrdinal}`)}"
                      ${locked ? "disabled" : ""}
                    >
                      <option value="off" ${day.state === "off" ? "selected" : ""}>Off</option>
                      <option value="travel" ${day.state === "travel" ? "selected" : ""}>Travel</option>
                      <option value="hold" ${day.state === "hold" ? "selected" : ""}>Hold</option>
                    </select>
                  </td>`).join("")}
                <td>${row.totalWorkDays}</td>
                <td>${row.travelDays}</td>
                <td>${row.holdDays}</td>
                <td>${row.idleDays}</td>
              </tr>
            `).join("")}</tbody>
          </table>
        ` : `<p class="empty-inline">Assign scenes with cast to generate the day-out-of-days report.</p>`}
      </div>
    </section>
  `;
}

function productionAvailabilityForBreakdown(breakdownId: string): ProductionAvailabilityWindow[] {
  return state.workspace.productionAvailability
    .filter((window) => window.screenplayBreakdownId === breakdownId)
    .sort((left, right) => left.resourceName.localeCompare(right.resourceName) || left.startDate.localeCompare(right.startDate));
}

function renderProductionScheduleScenarios(project: FilmProject, schedule: ProductionScheduleVersion | null): string {
  if (!schedule) return "";
  const breakdown = state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === schedule.screenplayBreakdownId);
  if (!breakdown) return "";
  const windows = productionAvailabilityForBreakdown(breakdown.id);
  const analysis = analyzeProductionScheduleScenario(schedule, breakdown, windows);
  const candidates = productionSchedulesForProject(project.id)
    .filter((candidate) => candidate.id !== schedule.id && candidate.screenplayBreakdownId === schedule.screenplayBreakdownId);
  const comparisonSchedule = candidates.find((candidate) => candidate.id === state.ui.selectedComparisonScheduleId) ?? candidates[0] ?? null;
  const comparison = comparisonSchedule
    ? compareProductionScheduleScenarios(schedule, comparisonSchedule, breakdown, windows)
    : null;
  const locked = schedule.status === "locked";
  return `
    <section class="schedule-scenario-workspace" aria-labelledby="schedule-scenario-title">
      <div class="schedule-scenario-head">
        <div>
          <h2 id="schedule-scenario-title">Scenario comparison</h2>
          <span>Micro-budget assumptions - observed metrics only</span>
        </div>
        <label class="control-select">
          <span>Compare with</span>
          <select data-action="schedule-comparison-select" aria-label="Comparison schedule" ${candidates.length ? "" : "disabled"}>
            ${candidates.length
              ? candidates.map((candidate) => `<option value="${escapeAttribute(candidate.id)}" ${candidate.id === comparisonSchedule?.id ? "selected" : ""}>${escapeHtml(candidate.title)}</option>`).join("")
              : `<option>No other version</option>`}
          </select>
        </label>
      </div>
      <form class="schedule-assumption-form" data-action="schedule-assumptions-update">
        ${renderScheduleAssumptionInput("maxScenesPerDay", "Strips/day", schedule.assumptions.maxScenesPerDay, 1, 30, locked)}
        ${renderScheduleAssumptionInput("maxLocationsPerDay", "Locations/day", schedule.assumptions.maxLocationsPerDay, 1, 12, locked)}
        ${renderScheduleAssumptionInput("maxCastPerDay", "Cast/day", schedule.assumptions.maxCastPerDay, 1, 50, locked)}
        ${renderScheduleAssumptionInput("maxConsecutiveShootDays", "Consecutive days", schedule.assumptions.maxConsecutiveShootDays, 1, 14, locked)}
        ${renderScheduleAssumptionInput("companyMoveMinutes", "Move minutes", schedule.assumptions.companyMoveMinutes, 0, 240, locked)}
        <button class="secondary-button" type="submit" ${locked ? "disabled" : ""}>${icon("save")} Update assumptions</button>
      </form>
      <div class="schedule-scenario-summary" aria-label="Selected scenario metrics">
        <span><strong>${analysis.assignedSceneCount}</strong><small>Assigned strips</small></span>
        <span><strong>${analysis.companyMoveCount}</strong><small>Company moves</small></span>
        <span><strong>${analysis.estimatedCompanyMoveMinutes}</strong><small>Move minutes</small></span>
        <span><strong>${analysis.assumptionBreaches.length}</strong><small>Assumption breaches</small></span>
      </div>
      ${renderScheduleAssumptionBreaches(analysis.assumptionBreaches)}
      ${comparison && comparisonSchedule
        ? renderProductionScenarioComparison(comparison, schedule.title, comparisonSchedule.title)
        : `<p class="schedule-scenario-empty">Duplicate this schedule to compare versions side by side.</p>`}
    </section>
  `;
}

function renderScheduleAssumptionInput(
  name: string,
  label: string,
  value: number,
  min: number,
  max: number,
  disabled: boolean,
): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input type="number" name="${escapeAttribute(name)}" value="${value}" min="${min}" max="${max}" step="1" required ${disabled ? "disabled" : ""} />
    </label>
  `;
}

function renderScheduleAssumptionBreaches(breaches: ProductionScheduleScenarioComparison["left"]["assumptionBreaches"]): string {
  if (!breaches.length) return `<div class="schedule-assumption-clear">No current assumption breaches.</div>`;
  return `
    <div class="schedule-assumption-breaches" aria-label="Assumption breaches">
      ${breaches.map((breach) => `<span>${icon("warning")} ${escapeHtml(breach.message)}</span>`).join("")}
    </div>
  `;
}

function renderProductionScenarioComparison(
  comparison: ProductionScheduleScenarioComparison,
  leftTitle: string,
  rightTitle: string,
): string {
  return `
    <div class="schedule-scenario-table-wrap" tabindex="0">
      <table class="schedule-scenario-table">
        <thead><tr><th scope="col">Metric</th><th scope="col">${escapeHtml(leftTitle)}</th><th scope="col">${escapeHtml(rightTitle)}</th><th scope="col">Delta B-A</th></tr></thead>
        <tbody>${comparison.metrics.map((metric) => `
          <tr><th scope="row">${escapeHtml(metric.label)}</th><td>${metric.left}</td><td>${metric.right}</td><td class="${metric.delta === 0 ? "neutral" : "changed"}">${metric.delta > 0 ? "+" : ""}${metric.delta}</td></tr>
        `).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderProductionBudgetEstimate(project: FilmProject, schedule: ProductionScheduleVersion | null): string {
  if (!schedule) return "";
  const breakdown = state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === schedule.screenplayBreakdownId);
  if (!breakdown) return "";
  const scenario = productionBudgetScenarioForSchedule(schedule.id);
  if (!scenario) {
    return `
      <section class="schedule-budget-workspace schedule-budget-empty" aria-labelledby="schedule-budget-title">
        <div>
          <h2 id="schedule-budget-title">Budget from schedule</h2>
          <span>${escapeHtml(schedule.title)} - rates start at zero</span>
        </div>
        <button class="secondary-button" type="button" data-action="schedule-budget-create">${icon("coins")} Create estimate</button>
      </section>
    `;
  }
  const estimate = estimateProductionBudget(scenario, schedule, breakdown);
  const estimateDollars = estimate.totalCents / 100;
  const budgetVariance = project.totalBudget - estimateDollars;
  return `
    <section class="schedule-budget-workspace" aria-labelledby="schedule-budget-title">
      <div class="schedule-budget-head">
        <div>
          <h2 id="schedule-budget-title">Budget from schedule</h2>
          <span>${escapeHtml(scenario.title)} - estimate only - no union rates or fringes</span>
        </div>
        <strong>${formatCurrency(estimateDollars)}</strong>
      </div>
      <form class="schedule-budget-form" data-action="schedule-budget-update">
        ${renderScheduleBudgetMoneyInput("crewDayCost", "Crew/day", scenario.assumptions.crewDayCostCents)}
        ${renderScheduleBudgetMoneyInput("castDayRate", "Cast/day", scenario.assumptions.castDayRateCents)}
        ${renderScheduleBudgetMoneyInput("locationDayRate", "Location/day", scenario.assumptions.locationDayRateCents)}
        ${renderScheduleBudgetMoneyInput("equipmentDayCost", "Equipment/day", scenario.assumptions.equipmentDayCostCents)}
        ${renderScheduleBudgetMoneyInput("companyMoveCost", "Move cost", scenario.assumptions.companyMoveCostCents)}
        <label><span>Crew count</span><input type="number" name="crewHeadcount" value="${scenario.assumptions.crewHeadcount}" min="0" max="1000" step="1" required /></label>
        ${renderScheduleBudgetMoneyInput("mealCostPerPerson", "Meal/person", scenario.assumptions.mealCostPerPersonCents)}
        <label><span>Contingency %</span><input type="number" name="contingencyPercent" value="${(scenario.assumptions.contingencyBasisPoints / 100).toFixed(1)}" min="0" max="50" step="0.1" required /></label>
        <button class="secondary-button" type="submit">${icon("save")} Update estimate</button>
      </form>
      <div class="schedule-budget-summary" aria-label="Schedule budget summary">
        <span><strong>${estimate.scheduledShootDays}</strong><small>Scheduled days</small></span>
        <span><strong>${estimate.castWorkDays}</strong><small>Cast work days</small></span>
        <span><strong>${estimate.locationDayUses}</strong><small>Location days</small></span>
        <span><strong>${formatCurrency(Math.abs(budgetVariance))}</strong><small>${budgetVariance >= 0 ? "Below project budget" : "Above project budget"}</small></span>
      </div>
      <div class="schedule-budget-table-wrap" tabindex="0">
        <table class="schedule-budget-table">
          <thead><tr><th scope="col">Line</th><th scope="col">Units</th><th scope="col">Unit cost</th><th scope="col">Estimate</th></tr></thead>
          <tbody>
            ${estimate.lines.map((line) => `<tr><th scope="row">${escapeHtml(line.label)}</th><td>${line.units} ${escapeHtml(line.unitLabel)}</td><td>${formatCurrency(line.unitCostCents / 100)}</td><td>${formatCurrency(line.totalCents / 100)}</td></tr>`).join("")}
            <tr class="subtotal"><th scope="row">Subtotal</th><td></td><td></td><td>${formatCurrency(estimate.subtotalCents / 100)}</td></tr>
            <tr><th scope="row">Contingency</th><td>${(scenario.assumptions.contingencyBasisPoints / 100).toFixed(1)}%</td><td></td><td>${formatCurrency(estimate.contingencyCents / 100)}</td></tr>
            <tr class="total"><th scope="row">Estimated total</th><td></td><td></td><td>${formatCurrency(estimateDollars)}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderScheduleBudgetMoneyInput(name: string, label: string, cents: number): string {
  return `<label><span>${escapeHtml(label)}</span><input type="number" name="${escapeAttribute(name)}" value="${(cents / 100).toFixed(2)}" min="0" step="0.01" required /></label>`;
}

function productionBudgetScenarioForSchedule(scheduleId: string): ProductionBudgetScenario | null {
  return state.workspace.productionBudgetScenarios
    .filter((scenario) => scenario.productionScheduleId === scheduleId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

function renderShotsWorkspace(project: FilmProject): string {
  const breakdown = selectedScreenplayBreakdown(screenplayBreakdownsForProject(project.id));
  const shots = filteredProductionShotsForProject(project.id);
  const selected = selectedProductionShot(project.id, shots);
  const manifest = selected ? productionShotManifest(selected) : null;
  const sceneFilter = state.ui.productionShotSceneFilter;
  const filterScene = breakdown?.scenes.find((scene) => scene.id === sceneFilter) ?? null;
  return `
    <div class="slate-head shots-workspace-head">
      <div>
        <h1>Shots</h1>
        <p>${escapeHtml(project.title)} - ${shots.length} ${filterScene ? `shots for scene ${escapeHtml(filterScene.sceneNumber ?? String(filterScene.ordinal))}` : "shots across all scenes"}</p>
      </div>
      <div class="view-controls" aria-label="Shot list controls">
        ${breakdown ? `
          <label class="compact-select-label">
            <span>Scene filter</span>
            <select data-action="production-shot-scene-filter" aria-label="Shot scene filter">
              <option value="all" ${sceneFilter ? "" : "selected"}>All scenes</option>
              ${breakdown.scenes.map((scene) => `<option value="${escapeAttribute(scene.id)}" ${scene.id === sceneFilter ? "selected" : ""}>${escapeHtml(scene.sceneNumber ?? String(scene.ordinal))} - ${escapeHtml(scene.heading)}</option>`).join("")}
            </select>
          </label>
        ` : ""}
        <button type="button" data-action="production-shots-markdown-export" ${shots.length ? "" : "disabled"}>${icon("doc")} Export list</button>
        <button type="button" data-action="production-shots-csv-export" ${shots.length ? "" : "disabled"}>${icon("list")} Export CSV</button>
      </div>
    </div>
    <section class="shots-workspace-grid" aria-label="Shots workspace">
      <section class="panel production-shot-create-panel" aria-labelledby="production-shot-create-title">
        <div class="section-head row">
          <div><h2 id="production-shot-create-title">Add Shot</h2><p>${breakdown ? escapeHtml(breakdown.revision.title) : "No screenplay source"}</p></div>
        </div>
        ${breakdown?.scenes.length ? `
          <form class="production-shot-create-form" data-action="production-shot-create">
            <label><span>Scene</span><select name="sceneId" required>${breakdown.scenes.map((scene) => `<option value="${escapeAttribute(scene.id)}" ${scene.id === sceneFilter ? "selected" : ""}>${escapeHtml(scene.sceneNumber ?? String(scene.ordinal))} - ${escapeHtml(scene.heading)}</option>`).join("")}</select></label>
            <label><span>Description</span><input name="description" maxlength="500" placeholder="Shot action or purpose" required /></label>
            <button class="primary-action" type="submit">${icon("plus")} Add shot</button>
          </form>
        ` : `<div class="empty-inline">Import a screenplay before adding scene-linked shots.</div>`}
      </section>
      <section class="panel production-shot-roster-panel" aria-labelledby="production-shot-roster-title">
        <div class="section-head row">
          <div><h2 id="production-shot-roster-title">Shot List</h2><p>${shots.length} visible shots - ${shots.reduce((total, shot) => total + shot.estimatedMinutes, 0)} estimated setup minutes</p></div>
        </div>
        <div class="production-shot-roster" tabindex="0" aria-label="Production shot list">
          <div class="production-shot-row production-shot-row-head"><span>Order</span><span>Shot</span><span>Description</span><span>Status</span><span>Scene</span><span>Estimate</span></div>
          ${shots.length ? shots.map((shot) => {
            const shotManifest = productionShotManifest(shot);
            return `
              <button class="production-shot-row ${shot.id === selected?.id ? "is-active" : ""}" type="button" data-action="production-shot-row-select" data-shot-id="${escapeAttribute(shot.id)}">
                <span>${shot.ordinal}</span>
                <strong>${escapeHtml(shot.shotNumber || "-")}</strong>
                <span>${escapeHtml(shot.description)}</span>
                <span>${escapeHtml(productionValueLabel(shot.status))}</span>
                <span>${escapeHtml(shotManifest.scene?.sceneNumber ?? String(shotManifest.scene?.ordinal ?? "Missing"))}</span>
                <span>${shot.estimatedMinutes ? `${shot.estimatedMinutes} min` : "Not set"}</span>
              </button>
            `;
          }).join("") : `<div class="empty-inline">No shots in this scene view.</div>`}
        </div>
      </section>
      ${selected && manifest ? renderProductionShotEditor(project, selected, manifest) : `
        <section class="panel production-shot-empty-panel"><div class="empty-inline">Add or select a shot to edit its camera and setup decisions.</div></section>
      `}
      ${selected && manifest ? renderProductionShotUsage(selected, manifest) : ""}
    </section>
  `;
}

function productionShotsForProject(projectId: string): ProductionShot[] {
  const breakdowns = screenplayBreakdownsForProject(projectId);
  const breakdownOrder = new Map(breakdowns.map((breakdown, index) => [breakdown.id, index]));
  const sceneOrder = new Map(breakdowns.flatMap((breakdown) => breakdown.scenes.map((scene) => [`${breakdown.id}:${scene.id}`, scene.ordinal] as const)));
  return state.workspace.productionShots
    .filter((shot) => shot.projectId === projectId)
    .sort((left, right) => (
      (breakdownOrder.get(left.screenplayBreakdownId) ?? Number.MAX_SAFE_INTEGER)
      - (breakdownOrder.get(right.screenplayBreakdownId) ?? Number.MAX_SAFE_INTEGER)
      || (sceneOrder.get(`${left.screenplayBreakdownId}:${left.sceneId}`) ?? Number.MAX_SAFE_INTEGER)
      - (sceneOrder.get(`${right.screenplayBreakdownId}:${right.sceneId}`) ?? Number.MAX_SAFE_INTEGER)
      || left.ordinal - right.ordinal
      || left.createdAt.localeCompare(right.createdAt)
    ));
}

function filteredProductionShotsForProject(projectId: string): ProductionShot[] {
  const shots = productionShotsForProject(projectId);
  const sceneId = state.ui.productionShotSceneFilter;
  return sceneId ? shots.filter((shot) => shot.sceneId === sceneId) : shots;
}

function selectedProductionShot(
  projectId = state.ui.selectedProjectId,
  shots = filteredProductionShotsForProject(projectId),
): ProductionShot | null {
  return shots.find((shot) => shot.id === state.ui.selectedProductionShotId) ?? shots[0] ?? null;
}

function productionShotManifest(shot: ProductionShot): ProductionShotManifest {
  const breakdown = state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === shot.screenplayBreakdownId) ?? null;
  return buildProductionShotManifest(
    shot,
    breakdown,
    productionSchedulesForProject(shot.projectId),
    productionCallSheetsForProject(shot.projectId),
  );
}

function renderProductionShotEditor(project: FilmProject, shot: ProductionShot, manifest: ProductionShotManifest): string {
  const sourceWarning = manifest.sourceMissing
    ? "The linked screenplay breakdown or scene is missing. Derived production use may be incomplete."
    : manifest.sourceChanged
      ? "The linked screenplay breakdown changed after this shot was created. Review the shot against the current scene."
      : "";
  const sceneLabel = manifest.scene
    ? `Scene ${manifest.scene.sceneNumber ?? manifest.scene.ordinal} - ${manifest.scene.heading}`
    : "Source scene missing";
  return `
    <section class="panel production-shot-editor-panel" aria-labelledby="production-shot-editor-title">
      <div class="section-head row">
        <div><h2 id="production-shot-editor-title">Shot Details</h2><p>${escapeHtml(sceneLabel)}</p></div>
        <div class="production-shot-order-controls" aria-label="Shot order controls">
          <button class="icon-button" type="button" data-action="production-shot-reorder" data-direction="-1" title="Move shot up" aria-label="Move shot up">${icon("arrow-up")}</button>
          <button class="icon-button" type="button" data-action="production-shot-reorder" data-direction="1" title="Move shot down" aria-label="Move shot down">${icon("arrow-down")}</button>
        </div>
      </div>
      ${sourceWarning ? `<div class="call-sheet-source-warning" role="status">${escapeHtml(sourceWarning)}</div>` : ""}
      <form class="production-shot-editor-form" data-action="production-shot-update">
        <fieldset>
          <label><span>Shot</span><input name="shotNumber" value="${escapeAttribute(shot.shotNumber)}" maxlength="40" /></label>
          <label><span>Status</span><select name="status">${renderProductionShotStatusOptions(shot.status)}</select></label>
          <label><span>Setup minutes</span><input name="estimatedMinutes" type="number" min="0" max="1440" step="1" value="${shot.estimatedMinutes}" /></label>
          <label class="production-shot-field-wide"><span>Description</span><textarea name="description" maxlength="500" rows="2" required>${escapeHtml(shot.description)}</textarea></label>
          <label><span>Size</span><input name="shotSize" value="${escapeAttribute(shot.shotSize)}" maxlength="100" placeholder="Wide, close-up, insert" /></label>
          <label><span>Angle</span><input name="angle" value="${escapeAttribute(shot.angle)}" maxlength="100" placeholder="Eye-level, low, overhead" /></label>
          <label><span>Movement</span><input name="movement" value="${escapeAttribute(shot.movement)}" maxlength="200" placeholder="Static, handheld, dolly" /></label>
          <label><span>Lens</span><input name="lens" value="${escapeAttribute(shot.lens)}" maxlength="100" /></label>
          <label><span>Camera / support</span><input name="cameraSupport" value="${escapeAttribute(shot.cameraSupport)}" maxlength="200" /></label>
          <label><span>Frame rate</span><input name="frameRate" value="${escapeAttribute(shot.frameRate)}" maxlength="100" /></label>
          <label><span>Setup group</span><input name="setupGroup" value="${escapeAttribute(shot.setupGroup)}" maxlength="100" /></label>
          <label class="production-shot-field-wide"><span>Sound</span><textarea name="audioNotes" maxlength="1000" rows="2">${escapeHtml(shot.audioNotes)}</textarea></label>
          <label class="production-shot-field-wide"><span>Lighting</span><textarea name="lightingNotes" maxlength="1000" rows="2">${escapeHtml(shot.lightingNotes)}</textarea></label>
          <label class="production-shot-field-wide"><span>Notes</span><textarea name="notes" maxlength="2000" rows="3">${escapeHtml(shot.notes)}</textarea></label>
          <div class="production-resource-documents production-shot-field-wide"><span>Project documents</span><div>${renderProjectDocumentReferenceCheckboxes(project, shot.documentIds)}</div></div>
          <button class="primary-action" type="submit">${icon("check")} Save shot</button>
        </fieldset>
      </form>
    </section>
  `;
}

function renderProductionShotStatusOptions(selected: ProductionShotStatus): string {
  return (["planned", "ready", "captured", "omitted"] as ProductionShotStatus[])
    .map((status) => `<option value="${status}" ${status === selected ? "selected" : ""}>${productionValueLabel(status)}</option>`)
    .join("");
}

function renderProductionShotUsage(shot: ProductionShot, manifest: ProductionShotManifest): string {
  return `
    <section class="panel production-shot-usage-panel" aria-labelledby="production-shot-usage-title">
      <div class="section-head row">
        <div><h2 id="production-shot-usage-title">Production Use</h2><p>Derived from the linked scene, stripboards, and call sheets.</p></div>
        <div class="production-resource-usage-counts" aria-label="Shot production use counts">
          <span><strong>${manifest.scene ? 1 : 0}</strong> Scene</span>
          <span><strong>${manifest.scheduleUses.length}</strong> Schedule days</span>
          <span><strong>${manifest.callSheetUses.length}</strong> Call sheets</span>
        </div>
      </div>
      <div class="production-shot-usage-grid">
        <div><h3>Scene</h3><ul class="line-list production-resource-usage-list">${manifest.scene ? `<li><strong>${escapeHtml(manifest.scene.sceneNumber ?? String(manifest.scene.ordinal))}</strong><span>${escapeHtml(manifest.scene.heading)}</span><small>${escapeHtml(manifest.scene.timeOfDay ?? "TBD")}</small></li>` : `<li><span>Source scene missing.</span></li>`}</ul></div>
        <div><h3>Schedule days</h3><ul class="line-list production-resource-usage-list">${manifest.scheduleUses.length ? manifest.scheduleUses.map((use) => `<li><strong>Day ${use.dayOrdinal}</strong><span>${escapeHtml(use.scheduleTitle)}</span><small>${escapeHtml(productionUnitLabel(use.unit))} - ${escapeHtml(use.date ?? "Undated")} - ${escapeHtml(use.scheduleStatus)}</small></li>`).join("") : `<li><span>No scheduled use.</span></li>`}</ul></div>
        <div><h3>Call sheets</h3><ul class="line-list production-resource-usage-list">${manifest.callSheetUses.length ? manifest.callSheetUses.map((use) => `<li><strong>Day ${use.dayOrdinal}</strong><span>${escapeHtml(use.title)}</span><small>${escapeHtml(productionUnitLabel(use.unit))} - ${escapeHtml(use.date ?? "Undated")} - ${escapeHtml(use.status)}</small></li>`).join("") : `<li><span>No generated call-sheet use.</span></li>`}</ul></div>
        <div><h3>Source</h3><ul class="line-list production-resource-usage-list"><li><strong>Scene link</strong><span>Order ${shot.ordinal}</span><small>Local/private breakdown; source text is not copied</small></li></ul></div>
      </div>
    </section>
  `;
}

function renderCallSheetsWorkspace(project: FilmProject): string {
  const legacyCallSheet = project.callSheet;
  const callSheets = productionCallSheetsForProject(project.id);
  const callSheet = selectedProductionCallSheet(project.id);
  const source = callSheet ? productionCallSheetSource(callSheet) : null;
  const manifest = callSheet && source ? buildProductionCallSheetManifest(callSheet, source.breakdown) : null;
  const sourceChanged = Boolean(callSheet && source && callSheet.sourceScheduleUpdatedAt !== source.schedule.updatedAt);
  const sourceOptions = productionCallSheetSourceOptions(project.id);
  const crewRows = project.people.slice(0, 10);
  const gearRows = project.equipment.slice(0, 8);
  const docRows = project.docs.slice(0, 8);
  const locationLabel = callSheet?.primaryLocation || legacyCallSheet.location;
  const dayNumber = callSheet?.dayOrdinal ?? legacyCallSheet.dayNumber;
  const totalDays = callSheet?.totalShootDays ?? legacyCallSheet.totalDays;

  return `
    <div class="slate-head call-sheets-workspace-head">
      <div>
        <h1>Call Sheets</h1>
        <p>${escapeHtml(project.title)} - day ${dayNumber} of ${totalDays} - ${escapeHtml(locationLabel || "Location TBD")}</p>
      </div>
      <div class="view-controls" aria-label="Call sheet controls">
        ${callSheets.length ? `
          <label class="compact-select-label">
            <span>Call sheet</span>
            <select data-action="call-sheet-select" aria-label="Selected call sheet">
              ${callSheets.map((candidate) => `<option value="${escapeAttribute(candidate.id)}" ${candidate.id === callSheet?.id ? "selected" : ""}>${escapeHtml(candidate.title)} - ${escapeHtml(candidate.status)}</option>`).join("")}
            </select>
          </label>
        ` : ""}
        ${callSheet ? `<button type="button" data-action="call-sheet-status-toggle">${icon(callSheet.status === "final" ? "unlock" : "check")} ${callSheet.status === "final" ? "Reopen" : "Finalize"}</button>` : ""}
        <button type="button" data-action="export-call-sheet">${icon("doc")} Export call sheet</button>
      </div>
    </div>
    <section class="call-sheets-workspace-grid" aria-label="Call Sheets workspace">
      ${renderProductionCallSheetGenerator(sourceOptions)}
      <section class="panel call-sheet-overview-panel ${callSheet ? "call-sheet-editor-panel" : ""}" aria-labelledby="call-sheet-overview-title">
        <div class="section-head row">
          <div>
            <h2 id="call-sheet-overview-title">Upcoming Call Sheet</h2>
            <p>${callSheet ? `${escapeHtml(callSheet.status)} local sheet from ${escapeHtml(source?.schedule.title ?? "schedule")}${sourceChanged ? " - source schedule changed" : ""}` : "Legacy read-only project metadata"}</p>
          </div>
        </div>
        ${callSheet && manifest
          ? renderProductionCallSheetEditor(callSheet, manifest, sourceChanged)
          : renderLegacyCallSheetOverview(legacyCallSheet)}
      </section>
      ${callSheet && manifest ? renderProductionCallSheetScenePanel(callSheet, manifest) : ""}
      ${callSheet && manifest ? renderProductionCallSheetCastPanel(callSheet, manifest) : ""}
      <section class="panel call-sheet-list-panel" aria-labelledby="call-sheet-crew-title">
        <div class="section-head row">
          <div>
            <h2 id="call-sheet-crew-title">Crew Snapshot</h2>
            <p>${crewRows.length} visible people</p>
          </div>
        </div>
        <div class="call-sheet-table" aria-label="Call sheet crew" tabindex="0">
          <div class="call-sheet-table-row call-sheet-table-head">
            <span>Initials</span>
            <span>Name</span>
            <span>Role</span>
          </div>
          ${
            crewRows.length
              ? crewRows
                .map(
                  (person) => `
                    <div class="call-sheet-table-row">
                      <span><span class="file-token ${escapeAttribute(person.initials)}">${escapeHtml(person.initials)}</span></span>
                      <span>${escapeHtml(person.name)}</span>
                      <span>${escapeHtml(person.role)}</span>
                    </div>
                  `,
                )
                .join("")
              : `<div class="empty-inline">No crew rows for this project.</div>`
          }
        </div>
      </section>
      <section class="panel call-sheet-list-panel" aria-labelledby="call-sheet-gear-title">
        <div class="section-head row">
          <div>
            <h2 id="call-sheet-gear-title">Gear Pull</h2>
            <p>${gearRows.length} visible equipment rows</p>
          </div>
        </div>
        <div class="call-sheet-table" aria-label="Call sheet gear" tabindex="0">
          <div class="call-sheet-table-row call-sheet-table-head">
            <span>Type</span>
            <span>Item</span>
            <span>Status</span>
          </div>
          ${
            gearRows.length
              ? gearRows
                .map(
                  (item) => `
                    <div class="call-sheet-table-row">
                      <span><span class="file-token EQ">EQ</span></span>
                      <span>${escapeHtml(item.name)}</span>
                      <span>${escapeHtml(item.status)}</span>
                    </div>
                  `,
                )
                .join("")
              : `<div class="empty-inline">No equipment rows for this project.</div>`
          }
        </div>
      </section>
      <section class="panel call-sheet-docs-panel" aria-labelledby="call-sheet-docs-title">
        <div class="section-head row">
          <div>
            <h2 id="call-sheet-docs-title">Attachments To Review</h2>
            <p>${docRows.length} visible docs</p>
          </div>
        </div>
        <ul class="line-list call-sheet-doc-list">
          ${
            docRows.length
              ? docRows
                .map(
                  (doc) => `
                    <li>
                      <span class="file-token ${escapeAttribute(doc.type)}">${escapeHtml(doc.type)}</span>
                      <span>${escapeHtml(doc.name)}</span>
                      <strong>${escapeHtml(formatDocStatus(doc))}</strong>
                    </li>
                  `,
                )
                .join("")
              : `<li><span>No docs attached to this project.</span></li>`
          }
        </ul>
      </section>
    </section>
  `;
}

function productionCallSheetsForProject(projectId: string): ProductionCallSheet[] {
  return state.workspace.productionCallSheets
    .filter((callSheet) => callSheet.projectId === projectId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function selectedProductionCallSheet(projectId = state.ui.selectedProjectId): ProductionCallSheet | null {
  const callSheets = productionCallSheetsForProject(projectId);
  return callSheets.find((callSheet) => callSheet.id === state.ui.selectedCallSheetId) ?? callSheets[0] ?? null;
}

function productionCallSheetSource(callSheet: ProductionCallSheet): {
  schedule: ProductionScheduleVersion;
  breakdown: ScreenplayBreakdown;
} | null {
  const schedule = state.workspace.productionSchedules.find((candidate) => candidate.id === callSheet.productionScheduleId);
  const breakdown = state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === callSheet.screenplayBreakdownId);
  return schedule && breakdown ? { schedule, breakdown } : null;
}

function selectedProductionSides(projectId = state.ui.selectedProjectId): {
  callSheet: ProductionCallSheet;
  schedule: ProductionScheduleVersion;
  breakdown: ScreenplayBreakdown;
  manifest: ProductionSidesManifest;
} | null {
  const callSheet = selectedProductionCallSheet(projectId);
  const source = callSheet ? productionCallSheetSource(callSheet) : null;
  if (!callSheet || !source) return null;
  return {
    callSheet,
    ...source,
    manifest: buildProductionSidesManifest(callSheet, source.breakdown),
  };
}

function productionCallSheetSourceOptions(projectId: string): Array<{
  value: string;
  label: string;
}> {
  const existing = new Set(productionCallSheetsForProject(projectId).map((callSheet) => `${callSheet.productionScheduleId}|${callSheet.shootDayId}`));
  return productionSchedulesForProject(projectId).flatMap((schedule) => schedule.shootDays.flatMap((day) => {
    const value = `${schedule.id}|${day.id}`;
    const stripCount = productionScheduleDayStripCount(day);
    return stripCount > 0 && !existing.has(value)
      ? [{ value, label: `${schedule.title} - Day ${day.ordinal} - ${productionUnitLabel(day.unit)} - ${day.date ?? "undated"} (${stripCount} strips)` }]
      : [];
  }));
}

function renderProductionCallSheetGenerator(sourceOptions: Array<{ value: string; label: string }>): string {
  return `
    <section class="panel call-sheet-generator-panel" aria-labelledby="call-sheet-generator-title">
      <div class="section-head row">
        <div>
          <h2 id="call-sheet-generator-title">Generate from schedule</h2>
          <p>Snapshots one assigned shoot day; crew, gear, and docs remain linked to the project.</p>
        </div>
      </div>
      ${sourceOptions.length ? `
        <form class="call-sheet-generator-form" data-action="call-sheet-create">
          <label>
            <span>Schedule day</span>
            <select name="sourceRef" required>
              ${sourceOptions.map((option) => `<option value="${escapeAttribute(option.value)}">${escapeHtml(option.label)}</option>`).join("")}
            </select>
          </label>
          <button type="submit">${icon("plus")} Generate call sheet</button>
        </form>
      ` : `<div class="empty-inline">Assign scenes to another schedule day to generate a new call sheet.</div>`}
    </section>
  `;
}

function renderProductionCallSheetEditor(
  callSheet: ProductionCallSheet,
  manifest: ProductionCallSheetManifest,
  sourceChanged: boolean,
): string {
  const dateParts = productionCallSheetDateParts(callSheet.date);
  const disabled = callSheet.status === "final" ? "disabled" : "";
  return `
    ${sourceChanged ? `
      <div class="call-sheet-source-warning call-sheet-source-sync-warning" role="status">
        <span>The source schedule changed after this sheet was generated. This snapshot still contains ${productionCallSheetStripCount(callSheet)} original strips.</span>
        ${callSheet.status === "draft" ? `<button type="button" data-action="call-sheet-sync">${icon("sync")} Sync schedule</button>` : ""}
      </div>
    ` : ""}
    <div class="call-sheet-workspace-card">
      <div class="call-date"><strong>${escapeHtml(dateParts.day)}</strong><span>${escapeHtml(dateParts.month)}</span></div>
      <div>
        <p><strong>Call:</strong> ${escapeHtml(callSheet.callTime)}</p>
        <p><strong>Wrap:</strong> ${escapeHtml(callSheet.estimatedWrapTime)}</p>
        <p>${escapeHtml(callSheet.primaryLocation || "Location TBD")}</p>
        <small>${productionUnitLabel(callSheet.unit)} - ${productionCallSheetStripCount(callSheet)} strips - ${manifest.castCalls.length} cast calls - ${manifest.locations.length} locations</small>
      </div>
    </div>
    <form class="call-sheet-editor-form" data-action="call-sheet-update">
      <fieldset ${disabled}>
        <label class="call-sheet-field-wide"><span>Title</span><input name="title" value="${escapeAttribute(callSheet.title)}" maxlength="120" required></label>
        <label><span>Date</span><input name="date" type="date" value="${escapeAttribute(callSheet.date ?? "")}"></label>
        <label><span>General call</span><input name="callTime" type="time" value="${escapeAttribute(callSheet.callTime)}" required></label>
        <label><span>Estimated wrap</span><input name="estimatedWrapTime" type="time" value="${escapeAttribute(callSheet.estimatedWrapTime)}" required></label>
        <label class="call-sheet-field-wide"><span>Primary location</span><input name="primaryLocation" value="${escapeAttribute(callSheet.primaryLocation)}" maxlength="200"></label>
        <label class="call-sheet-field-wide"><span>Parking / access</span><textarea name="parkingInstructions" maxlength="1000" rows="2">${escapeHtml(callSheet.parkingInstructions)}</textarea></label>
        <label class="call-sheet-field-wide"><span>Nearest hospital</span><input name="nearestHospital" value="${escapeAttribute(callSheet.nearestHospital)}" maxlength="200"></label>
        <label class="call-sheet-field-wide"><span>Weather notes</span><textarea name="weatherNotes" maxlength="500" rows="2">${escapeHtml(callSheet.weatherNotes)}</textarea></label>
        <label class="call-sheet-field-wide"><span>General notes</span><textarea name="generalNotes" maxlength="2000" rows="3">${escapeHtml(callSheet.generalNotes)}</textarea></label>
        <label class="call-sheet-field-wide"><span>Safety notes</span><textarea name="safetyNotes" maxlength="2000" rows="3">${escapeHtml(callSheet.safetyNotes)}</textarea></label>
        <button type="submit">${icon("check")} Save details</button>
      </fieldset>
    </form>
    ${callSheet.status === "final" ? `<p class="form-note">Final sheets are read-only. Reopen this sheet to edit it.</p>` : ""}
  `;
}

function renderLegacyCallSheetOverview(callSheet: FilmProject["callSheet"]): string {
  return `
    <div class="call-sheet-workspace-card">
      <div class="call-date"><strong>${escapeHtml(callSheet.day)}</strong><span>${escapeHtml(callSheet.month)}</span></div>
      <div>
        <p><strong>Call:</strong> ${escapeHtml(callSheet.callTime)}</p>
        <p><strong>Wrap:</strong> ${escapeHtml(callSheet.wrapTime)}</p>
        <p>${escapeHtml(callSheet.location)}</p>
        <small>${callSheet.scenes} scenes - ${escapeHtml(callSheet.pages)} pages - ${callSheet.people} people - ${escapeHtml(callSheet.weather)}</small>
      </div>
    </div>
  `;
}

function renderProductionCallSheetScenePanel(callSheet: ProductionCallSheet, manifest: ProductionCallSheetManifest): string {
  return `
    <section class="panel call-sheet-scenes-panel" aria-labelledby="call-sheet-scenes-title">
      <div class="section-head row">
        <div><h2 id="call-sheet-scenes-title">Scenes</h2><p>${productionCallSheetStripCount(callSheet)} scheduled strips from ${manifest.scenes.length} source scenes</p></div>
      </div>
      <div class="call-sheet-scene-table" tabindex="0" aria-label="Call sheet scenes">
        <div class="call-sheet-scene-row call-sheet-table-head"><span>Scene</span><span>Heading</span><span>Location</span><span>Time</span></div>
        ${manifest.scenes.map((scene) => {
          const parts = (callSheet.sceneParts ?? []).filter((part) => part.sceneId === scene.id);
          const sceneLabel = parts.length
            ? parts.map((part) => `${scene.sceneNumber ?? scene.ordinal}${part.label}`).join(", ")
            : scene.sceneNumber ?? String(scene.ordinal);
          const partRange = parts.length ? ` - ${parts.map((part) => `lines ${part.sourceStartLine}-${part.sourceEndLine}`).join(", ")}` : "";
          return `
          <div class="call-sheet-scene-row">
            <span>${escapeHtml(sceneLabel)}</span>
            <span>${escapeHtml(scene.heading)}${escapeHtml(partRange)}</span>
            <span>${escapeHtml(scene.location ?? "TBD")}</span>
            <span>${escapeHtml(scene.timeOfDay ?? "TBD")}</span>
          </div>
        `; }).join("")}
      </div>
      ${manifest.missingSceneIds.length ? `<p class="form-note">${manifest.missingSceneIds.length} source scenes are no longer available in this screenplay revision.</p>` : ""}
    </section>
  `;
}

function productionCallSheetStripCount(callSheet: ProductionCallSheet): number {
  const splitSceneIds = new Set((callSheet.sceneParts ?? []).map((part) => part.sceneId));
  return callSheet.sceneIds.filter((sceneId) => !splitSceneIds.has(sceneId)).length + (callSheet.sceneParts?.length ?? 0);
}

function renderProductionCallSheetCastPanel(callSheet: ProductionCallSheet, manifest: ProductionCallSheetManifest): string {
  const disabled = callSheet.status === "final" ? "disabled" : "";
  return `
    <section class="panel call-sheet-cast-panel" aria-labelledby="call-sheet-cast-title">
      <div class="section-head row">
        <div><h2 id="call-sheet-cast-title">Cast Calls</h2><p>${manifest.castCalls.length} reviewed cast requirements</p></div>
      </div>
      <div class="call-sheet-cast-list" tabindex="0" aria-label="Call sheet cast calls">
        ${manifest.castCalls.length ? manifest.castCalls.map((castCall) => `
          <form class="call-sheet-cast-row" data-action="call-sheet-cast-update" data-element-id="${escapeAttribute(castCall.elementId)}">
            <strong>${escapeHtml(castCall.name)}</strong>
            <label><span>Performer</span><input name="performerName" value="${escapeAttribute(castCall.performerName ?? "")}" maxlength="200" ${disabled}></label>
            <span>${castCall.sceneIds.length} scene${castCall.sceneIds.length === 1 ? "" : "s"}</span>
            <label><span>Call</span><input name="callTime" type="time" value="${escapeAttribute(castCall.callTime)}" ${disabled}></label>
            <label><span>Notes</span><input name="notes" value="${escapeAttribute(castCall.notes)}" maxlength="500" ${disabled}></label>
            <button type="submit" title="Save cast call" ${disabled}>${icon("check")}<span class="sr-only">Save ${escapeHtml(castCall.name)} call</span></button>
          </form>
        `).join("") : `<div class="empty-inline">No reviewed cast requirements for these scenes.</div>`}
      </div>
    </section>
  `;
}

function productionCallSheetDateParts(date: string | null): { day: string; month: string } {
  if (!date) return { day: "--", month: "TBD" };
  const parsed = new Date(`${date}T00:00:00`);
  return {
    day: String(parsed.getDate()).padStart(2, "0"),
    month: parsed.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  };
}

function renderSidesWorkspace(project: FilmProject): string {
  const callSheets = productionCallSheetsForProject(project.id);
  const sides = selectedProductionSides(project.id);
  const latestBreakdown = screenplayBreakdownsForProject(project.id)[0] ?? null;
  const scheduleChanged = Boolean(sides && sides.callSheet.sourceScheduleUpdatedAt !== sides.schedule.updatedAt);
  const newerRevisionAvailable = Boolean(sides && latestBreakdown
    && latestBreakdown.id !== sides.breakdown.id
    && latestBreakdown.revision.importedAt > sides.breakdown.revision.importedAt);
  return `
    <div class="slate-head sides-workspace-head">
      <div>
        <h1>Sides</h1>
        <p>${escapeHtml(project.title)} - ${sides ? `${escapeHtml(sides.callSheet.title)} - ${sides.manifest.scenes.length} source scenes` : "no schedule-linked call sheet selected"}</p>
      </div>
      <div class="view-controls" aria-label="Sides controls">
        ${callSheets.length ? `
          <label class="compact-select-label">
            <span>Call sheet</span>
            <select data-action="call-sheet-select" aria-label="Selected sides call sheet">
              ${callSheets.map((candidate) => `<option value="${escapeAttribute(candidate.id)}" ${candidate.id === sides?.callSheet.id ? "selected" : ""}>${escapeHtml(candidate.title)} - ${escapeHtml(candidate.status)}</option>`).join("")}
            </select>
          </label>
        ` : ""}
        <button type="button" data-action="production-sides-markdown-export" ${sides ? "" : "disabled"}>${icon("doc")} Source .md</button>
        <button type="button" data-action="production-sides-html-export" ${sides ? "" : "disabled"}>${icon("doc")} Print HTML</button>
      </div>
    </div>
    <section class="sides-workspace-grid" aria-label="Sides workspace">
      ${sides ? `
        <section class="panel sides-summary-panel" aria-labelledby="sides-summary-title">
          <div class="section-head row">
            <div>
              <h2 id="sides-summary-title">${escapeHtml(sides.callSheet.title)}</h2>
              <p>${escapeHtml(sides.manifest.screenplayTitle)} - revision imported ${escapeHtml(formatShortDateTime(sides.breakdown.revision.importedAt))}</p>
            </div>
            <span class="status-chip ${sides.callSheet.status === "final" ? "confirmed" : "suggested"}">${escapeHtml(sides.callSheet.status)}</span>
          </div>
          <div class="sides-summary-grid" aria-label="Sides source summary">
            <span><strong>${sides.callSheet.dayOrdinal}</strong><small>${escapeHtml(productionUnitLabel(sides.callSheet.unit))}</small></span>
            <span><strong>${sides.manifest.scenes.length}</strong><small>Scene strips</small></span>
            <span><strong>${sides.callSheet.castCalls.length}</strong><small>Cast calls</small></span>
            <span><strong>${sides.manifest.missingSceneIds.length}</strong><small>Missing</small></span>
          </div>
          <p class="sides-source-policy">Local source text. Source exports include the screenplay text shown below and exclude provider, contact, attachment-byte, and Worker-private data.</p>
          ${scheduleChanged ? `<div class="call-sheet-source-warning" role="status">The source schedule changed after this call sheet was generated. Sides remain pinned to its ${productionCallSheetStripCount(sides.callSheet)}-strip snapshot.</div>` : ""}
          ${newerRevisionAvailable ? `<div class="call-sheet-source-warning" role="status">A newer screenplay revision is available. These sides remain pinned to ${escapeHtml(sides.manifest.screenplayTitle)}.</div>` : ""}
          ${sides.manifest.missingSceneIds.length ? `<div class="call-sheet-source-warning" role="status">${sides.manifest.missingSceneIds.length} call-sheet scene${sides.manifest.missingSceneIds.length === 1 ? " is" : "s are"} missing from the pinned screenplay source.</div>` : ""}
        </section>
        ${sides.manifest.scenes.map((scene) => {
          const sourceId = scene.schedulePartId ?? scene.id;
          return `
          <article class="panel sides-scene" aria-labelledby="sides-scene-${escapeAttribute(sourceId)}">
            <header class="sides-scene-head">
              <div>
                <span class="sides-scene-number">Scene ${escapeHtml(scene.sceneNumber ?? String(scene.ordinal))}${scene.schedulePartLabel ? ` - Part ${escapeHtml(scene.schedulePartLabel)}` : ""}</span>
                <h2 id="sides-scene-${escapeAttribute(sourceId)}">${escapeHtml(scene.heading)}</h2>
                <p>${escapeHtml(scene.location ?? "Location TBD")} - ${escapeHtml(scene.timeOfDay ?? "Time TBD")} - source lines ${scene.sourceStartLine}-${scene.sourceEndLine}</p>
              </div>
              <div class="sides-cast" aria-label="Scene cast">
                ${scene.castCalls.length ? scene.castCalls.map((castCall) => `<span>${escapeHtml(castCall.name)}${castCall.performerName ? ` - ${escapeHtml(castCall.performerName)}` : ""}</span>`).join("") : `<span>No reviewed cast</span>`}
              </div>
            </header>
            <pre class="sides-source-text">${escapeHtml(scene.sourceText || "Source text is empty for this scene.")}</pre>
          </article>
        `; }).join("")}
      ` : `
        <section class="panel sides-empty-panel" aria-labelledby="sides-empty-title">
          <div class="section-head"><div><h2 id="sides-empty-title">No sides source</h2><p>Generate a call sheet from an assigned schedule day to establish a stable scene snapshot.</p></div></div>
          <button type="button" data-workspace-section="call-sheets">${icon("call-sheet")} Open Call Sheets</button>
        </section>
      `}
    </section>
  `;
}

function renderProductionReportsWorkspace(project: FilmProject): string {
  const reports = productionReportsForProject(project.id);
  const report = selectedProductionReport(project.id);
  const source = report ? productionReportSource(report) : null;
  const manifest = source ? buildProductionCallSheetManifest(source.callSheet, source.breakdown) : null;
  const summary = report ? summarizeProductionReport(report) : null;
  const sourceChanged = Boolean(report && source && report.sourceCallSheetUpdatedAt !== source.callSheet.updatedAt);
  const sourceOptions = productionReportSourceOptions(project.id);
  return `
    <div class="slate-head production-reports-workspace-head">
      <div>
        <h1>Production Reports</h1>
        <p>${escapeHtml(project.title)} - local daily progress, actual timings, and handoff exports</p>
      </div>
      <div class="view-controls" aria-label="Production report controls">
        ${reports.length ? `
          <label class="compact-select-label"><span>Report</span>
            <select data-action="production-report-select" aria-label="Selected production report">
              ${reports.map((candidate) => `<option value="${escapeAttribute(candidate.id)}" ${candidate.id === report?.id ? "selected" : ""}>${escapeHtml(candidate.title)} - ${escapeHtml(candidate.status)}</option>`).join("")}
            </select>
          </label>
        ` : ""}
        ${report ? `<button type="button" data-action="production-report-status-toggle">${icon(report.status === "final" ? "unlock" : "check")} ${report.status === "final" ? "Reopen" : "Finalize"}</button>` : ""}
        <button type="button" data-action="production-report-export" ${report && manifest ? "" : "disabled"}>${icon("doc")} Export report</button>
        <button type="button" data-action="production-report-csv-export" ${report && manifest ? "" : "disabled"}>${icon("list")} Export scene CSV</button>
      </div>
    </div>
    <section class="production-reports-workspace-grid" aria-label="Production Reports workspace">
      ${renderProductionReportGenerator(sourceOptions)}
      ${report && manifest && summary
        ? `${renderProductionReportEditor(report, summary, sourceChanged)}${renderProductionReportScenes(report, manifest)}`
        : `<section class="panel production-report-empty"><div class="empty-inline">Generate a call sheet first, then create its daily production report here.</div></section>`}
    </section>
  `;
}

function productionReportsForProject(projectId: string): ProductionDailyReport[] {
  return state.workspace.productionReports
    .filter((report) => report.projectId === projectId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function selectedProductionReport(projectId = state.ui.selectedProjectId): ProductionDailyReport | null {
  const reports = productionReportsForProject(projectId);
  return reports.find((report) => report.id === state.ui.selectedProductionReportId) ?? reports[0] ?? null;
}

function productionReportSource(report: ProductionDailyReport): {
  callSheet: ProductionCallSheet;
  breakdown: ScreenplayBreakdown;
} | null {
  const callSheet = state.workspace.productionCallSheets.find((candidate) => candidate.id === report.productionCallSheetId);
  const breakdown = state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === report.screenplayBreakdownId);
  return callSheet && breakdown ? { callSheet, breakdown } : null;
}

function productionReportSourceOptions(projectId: string): Array<{ value: string; label: string }> {
  const existingCallSheetIds = new Set(productionReportsForProject(projectId).map((report) => report.productionCallSheetId));
  return productionCallSheetsForProject(projectId).flatMap((callSheet) => existingCallSheetIds.has(callSheet.id) ? [] : [{
    value: callSheet.id,
    label: `${callSheet.title} - ${callSheet.date ?? "undated"} - ${callSheet.status}`,
  }]);
}

function renderProductionReportGenerator(sourceOptions: Array<{ value: string; label: string }>): string {
  return `
    <section class="panel production-report-generator-panel" aria-labelledby="production-report-generator-title">
      <div class="section-head row"><div><h2 id="production-report-generator-title">Create daily report</h2><p>One report per generated call sheet; no expense-ledger duplication.</p></div></div>
      ${sourceOptions.length ? `
        <form class="production-report-generator-form" data-action="production-report-create">
          <label><span>Call sheet</span><select name="callSheetId" required>${sourceOptions.map((option) => `<option value="${escapeAttribute(option.value)}">${escapeHtml(option.label)}</option>`).join("")}</select></label>
          <button type="submit">${icon("plus")} Create report</button>
        </form>
      ` : `<div class="empty-inline">Every generated call sheet already has a report, or no call sheet is available yet.</div>`}
    </section>
  `;
}

function renderProductionReportEditor(
  report: ProductionDailyReport,
  summary: ReturnType<typeof summarizeProductionReport>,
  sourceChanged: boolean,
): string {
  const disabled = report.status === "final" ? "disabled" : "";
  return `
    <section class="panel production-report-editor-panel" aria-labelledby="production-report-editor-title">
      <div class="section-head row">
        <div><h2 id="production-report-editor-title">Daily Production Report</h2><p>${escapeHtml(report.status)} - day ${report.dayOrdinal} - ${escapeHtml(productionUnitLabel(report.unit))}${sourceChanged ? " - source call sheet changed" : ""}</p></div>
      </div>
      ${sourceChanged ? `<div class="call-sheet-source-warning" role="status">The source call sheet changed after this report was created. Planned scene results remain attached to the original snapshot.</div>` : ""}
      <div class="production-report-summary" aria-label="Daily report summary">
        <span><strong>${summary.completedSceneCount}/${summary.plannedSceneCount}</strong><small>Scenes completed</small></span>
        <span><strong>${summary.completionPercent}%</strong><small>Completion</small></span>
        <span><strong>${formatProductionMinutes(summary.grossDayMinutes)}</strong><small>Gross day</small></span>
        <span><strong>${formatProductionMinutes(summary.workingMinutes)}</strong><small>Working time</small></span>
        <span><strong>${report.setupCount}</strong><small>Setups</small></span>
        <span><strong>${report.takeCount}</strong><small>Takes</small></span>
      </div>
      <form class="production-report-editor-form" data-action="production-report-update">
        <fieldset ${disabled}>
          <label class="production-report-field-wide"><span>Title</span><input name="title" value="${escapeAttribute(report.title)}" maxlength="120" required></label>
          <label><span>Date</span><input name="date" type="date" value="${escapeAttribute(report.date ?? "")}"></label>
          <label class="production-report-field-wide"><span>Primary location</span><input name="primaryLocation" value="${escapeAttribute(report.primaryLocation)}" maxlength="200"></label>
          ${renderProductionReportTimeField("Actual crew call", "actualCrewCallTime", report.actualCrewCallTime)}
          ${renderProductionReportTimeField("First shot", "firstShotTime", report.firstShotTime)}
          ${renderProductionReportTimeField("Meal start", "mealStartTime", report.mealStartTime)}
          ${renderProductionReportTimeField("Meal end", "mealEndTime", report.mealEndTime)}
          ${renderProductionReportTimeField("Camera wrap", "cameraWrapTime", report.cameraWrapTime)}
          ${renderProductionReportTimeField("Crew wrap", "crewWrapTime", report.crewWrapTime)}
          ${renderProductionReportNumberField("Crew", "crewCount", report.crewCount, 1000)}
          ${renderProductionReportNumberField("Cast", "castCount", report.castCount, 1000)}
          ${renderProductionReportNumberField("Background", "backgroundCount", report.backgroundCount, 10000)}
          ${renderProductionReportNumberField("Meals", "mealCount", report.mealCount, 10000)}
          ${renderProductionReportNumberField("Setups", "setupCount", report.setupCount, 10000)}
          ${renderProductionReportNumberField("Takes", "takeCount", report.takeCount, 100000)}
          ${renderProductionReportNumberField("Recorded minutes", "footageMinutes", report.footageMinutes, 1000000)}
          <label class="production-report-field-wide"><span>Actual weather</span><textarea name="weatherActual" maxlength="500" rows="2">${escapeHtml(report.weatherActual)}</textarea></label>
          <label class="production-report-field-wide"><span>Delay notes</span><textarea name="delayNotes" maxlength="2000" rows="3">${escapeHtml(report.delayNotes)}</textarea></label>
          <label class="production-report-field-wide"><span>Production notes</span><textarea name="productionNotes" maxlength="4000" rows="4">${escapeHtml(report.productionNotes)}</textarea></label>
          <label class="production-report-field-wide"><span>Safety / incident notes</span><textarea name="safetyIncidentNotes" maxlength="4000" rows="4">${escapeHtml(report.safetyIncidentNotes)}</textarea></label>
          <label class="production-report-field-wide"><span>Tomorrow / pickup notes</span><textarea name="tomorrowNotes" maxlength="2000" rows="3">${escapeHtml(report.tomorrowNotes)}</textarea></label>
          <button type="submit">${icon("check")} Save report details</button>
        </fieldset>
      </form>
      ${report.status === "final" ? `<p class="form-note">Final reports are read-only. Reopen this report to edit it.</p>` : ""}
    </section>
  `;
}

function renderProductionReportTimeField(label: string, name: string, value: string | null): string {
  return `<label><span>${escapeHtml(label)}</span><input name="${escapeAttribute(name)}" type="time" value="${escapeAttribute(value ?? "")}"></label>`;
}

function renderProductionReportNumberField(label: string, name: string, value: number, maximum: number): string {
  return `<label><span>${escapeHtml(label)}</span><input name="${escapeAttribute(name)}" type="number" min="0" max="${maximum}" step="1" value="${value}"></label>`;
}

function renderProductionReportScenes(report: ProductionDailyReport, manifest: ProductionCallSheetManifest): string {
  const sceneById = new Map(manifest.scenes.map((scene) => [scene.id, scene]));
  const disabled = report.status === "final" ? "disabled" : "";
  const statuses: ProductionReportSceneStatus[] = ["planned", "completed", "partial", "held"];
  return `
    <section class="panel production-report-scenes-panel" aria-labelledby="production-report-scenes-title">
      <div class="section-head row"><div><h2 id="production-report-scenes-title">Scene Results</h2><p>Planned, completed, partial, or held</p></div></div>
      <div class="production-report-scene-list" tabindex="0" aria-label="Daily production scene results">
        ${report.sceneResults.map((result) => {
          const scene = sceneById.get(result.sceneId);
          return `
            <form class="production-report-scene-row" data-action="production-report-scene-update" data-scene-id="${escapeAttribute(result.sceneId)}">
              <strong>${escapeHtml(scene?.sceneNumber ?? String(scene?.ordinal ?? "?"))}</strong>
              <span>${escapeHtml(scene?.heading ?? "Source scene missing")}</span>
              <label><span>Status</span><select name="status" ${disabled}>${statuses.map((status) => `<option value="${status}" ${status === result.status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
              <label><span>Notes</span><input name="notes" value="${escapeAttribute(result.notes)}" maxlength="1000" ${disabled}></label>
              <button type="submit" title="Save scene result" ${disabled}>${icon("check")}<span class="sr-only">Save scene ${escapeHtml(scene?.sceneNumber ?? "result")}</span></button>
            </form>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function formatProductionMinutes(minutes: number): string {
  if (minutes <= 0) return "--";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function renderLocationsWorkspace(project: FilmProject): string {
  const records = productionLocationsForProject(project.id);
  const location = selectedProductionLocation(project.id);
  const manifest = location ? productionLocationManifest(location) : null;
  const candidateBreakdown = selectedScreenplayBreakdown(screenplayBreakdownsForProject(project.id));
  const linkedElementIds = new Set(records.map((record) => record.screenplayElementId).filter(Boolean));
  const candidateElements = candidateBreakdown?.elements
    .filter((element) => element.category === "location" && element.reviewState !== "dismissed" && !linkedElementIds.has(element.id))
    .sort((left, right) => left.name.localeCompare(right.name)) ?? [];
  const locationRows = planningPanelRowsForProject(project).filter((row) => row.kind === "location").slice(0, 12);
  const callSheet = selectedProductionCallSheet(project.id);
  const confirmedCount = records.filter((record) => record.status === "confirmed").length;

  return `
    <div class="slate-head locations-workspace-head">
      <div>
        <h1>Locations</h1>
        <p>${escapeHtml(project.title)} - ${records.length} scouting records - ${confirmedCount} confirmed</p>
      </div>
      <div class="view-controls" aria-label="Location controls">
        <button type="button" data-action="production-location-export" ${location && manifest ? "" : "disabled"}>${icon("doc")} Export brief</button>
      </div>
    </div>
    <section class="locations-workspace-grid ${location ? "" : "is-empty"}" aria-label="Locations workspace">
      <section class="panel location-create-panel" aria-labelledby="location-create-title">
        <div class="section-head row">
          <div>
            <h2 id="location-create-title">Scouting Records</h2>
            <p>${records.length} local/private records</p>
          </div>
        </div>
        <div class="production-record-list" aria-label="Scouting records">
          ${records.length ? records.map((record) => `
            <button type="button" class="production-record-row ${record.id === location?.id ? "is-selected" : ""}" data-action="production-location-row-select" data-location-id="${escapeAttribute(record.id)}">
              <span>${escapeHtml(record.name)}</span>
              <small>${escapeHtml(productionValueLabel(record.status))} - ${escapeHtml(productionValueLabel(record.permitStatus))}</small>
            </button>
          `).join("") : `<div class="empty-inline">No scouting records.</div>`}
        </div>
        ${renderCreateDisclosure("Add scouting record", `
          <form class="production-resource-create-form" data-action="production-location-create">
            <label>
              <span>Screenplay location</span>
              <select name="screenplayElementId">
                <option value="">Manual candidate</option>
                ${candidateElements.map((element) => `<option value="${escapeAttribute(element.id)}">${escapeHtml(element.name)}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Manual name</span>
              <input name="name" maxlength="200" placeholder="Required for manual candidates" />
            </label>
            <button class="primary-action" type="submit">${icon("plus")} Add record</button>
          </form>
        `)}
        ${candidateBreakdown ? `<p class="production-resource-source-note">${candidateElements.length} unlinked location elements in ${escapeHtml(candidateBreakdown.revision.title)}.</p>` : `<p class="production-resource-source-note">Import a screenplay to link scenes, or start with a manual scouting candidate.</p>`}
      </section>
      ${location && manifest ? renderProductionLocationEditor(project, location, manifest, callSheet) : `
        <section class="panel location-empty-panel">
          <div class="empty-inline">Add a scouting record to capture logistics, permits, schedule usage, and location documents.</div>
        </section>
      `}
      ${location && manifest ? renderProductionLocationUsage(location, manifest) : ""}
      <section class="panel location-planning-panel" aria-labelledby="location-planning-title">
        <div class="section-head row">
          <div>
            <h2 id="location-planning-title">Imported Locations</h2>
            <p>${locationRows.length} source rows retained for review; scouting records stay local.</p>
          </div>
        </div>
        <div class="location-table" aria-label="Imported location rows" tabindex="0">
          <div class="location-table-row location-table-head">
            <span>Location</span>
            <span>Project</span>
            <span>Fields</span>
            <span>Source</span>
          </div>
          ${
            locationRows.length
              ? locationRows
                .map(
                  (row) => `
                    <div class="location-table-row">
                      <span>${escapeHtml(row.title)}</span>
                      <span>${escapeHtml(row.projectLabel)}</span>
                      <span>${escapeHtml(planningFieldKeySummary(row.fields))}</span>
                      <span>${escapeHtml(row.sourceLabel)}</span>
                    </div>
                  `,
                )
                .join("")
              : `<div class="empty-inline">No imported location rows for this project yet.</div>`
          }
        </div>
      </section>
    </section>
  `;
}

function productionLocationsForProject(projectId: string): ProductionLocation[] {
  return state.workspace.productionLocations
    .filter((location) => location.projectId === projectId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function selectedProductionLocation(projectId = state.ui.selectedProjectId): ProductionLocation | null {
  const locations = productionLocationsForProject(projectId);
  return locations.find((location) => location.id === state.ui.selectedProductionLocationId) ?? locations[0] ?? null;
}

function productionLocationManifest(location: ProductionLocation): ProductionLocationManifest {
  const breakdown = location.screenplayBreakdownId
    ? state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === location.screenplayBreakdownId) ?? null
    : selectedScreenplayBreakdown(screenplayBreakdownsForProject(location.projectId));
  return buildProductionLocationManifest(
    location,
    breakdown,
    productionSchedulesForProject(location.projectId),
    state.workspace.productionAvailability,
  );
}

function renderProductionLocationEditor(
  project: FilmProject,
  location: ProductionLocation,
  manifest: ProductionLocationManifest,
  callSheet: ProductionCallSheet | null,
): string {
  const sourceWarning = manifest.sourceMissing
    ? "The linked screenplay breakdown is missing. Derived scene and schedule usage may be incomplete."
    : manifest.sourceChanged
      ? "The linked screenplay breakdown changed after this record was created. Review derived usage before handoff."
      : "";
  const canApply = location.status === "confirmed" && callSheet?.status === "draft";
  const applyNote = !callSheet
    ? "Generate a call sheet before applying location logistics."
    : callSheet.status === "final"
      ? `${callSheet.title} is final; reopen it before applying logistics.`
      : location.status !== "confirmed"
        ? "Confirm this location before applying it to a call sheet."
        : `Apply this logistics snapshot to ${callSheet.title}.`;
  return `
    <section class="panel production-location-editor-panel" aria-labelledby="production-location-editor-title">
      <div class="section-head row">
        <div>
          <h2 id="production-location-editor-title">Scouting Details</h2>
          <p>${escapeHtml(productionValueLabel(location.status))} - permit ${escapeHtml(productionValueLabel(location.permitStatus))}</p>
        </div>
      </div>
      ${sourceWarning ? `<div class="call-sheet-source-warning" role="status">${escapeHtml(sourceWarning)}</div>` : ""}
      <form class="production-resource-editor-form" data-action="production-location-update">
        <fieldset>
          <label class="production-resource-field-wide"><span>Name</span><input name="name" value="${escapeAttribute(location.name)}" maxlength="200" required /></label>
          <label><span>Status</span><select name="status">${renderProductionLocationStatusOptions(location.status)}</select></label>
          <label><span>Permit</span><select name="permitStatus">${renderProductionLocationPermitOptions(location.permitStatus)}</select></label>
          <label class="production-resource-field-wide"><span>Address</span><input name="address" value="${escapeAttribute(location.address)}" maxlength="500" /></label>
          <label><span>Contact name</span><input name="contactName" value="${escapeAttribute(location.contactName)}" maxlength="200" /></label>
          <label><span>Contact details</span><input name="contactDetails" value="${escapeAttribute(location.contactDetails)}" maxlength="500" autocomplete="off" /></label>
          <label class="production-resource-field-wide"><span>Permit notes</span><textarea name="permitNotes" maxlength="1000" rows="2">${escapeHtml(location.permitNotes)}</textarea></label>
          <label class="production-resource-field-wide"><span>Parking, access, and load-in</span><textarea name="parkingAccess" maxlength="2000" rows="3">${escapeHtml(location.parkingAccess)}</textarea></label>
          <label><span>Power</span><textarea name="powerNotes" maxlength="1000" rows="2">${escapeHtml(location.powerNotes)}</textarea></label>
          <label><span>Sound</span><textarea name="soundNotes" maxlength="1000" rows="2">${escapeHtml(location.soundNotes)}</textarea></label>
          <label><span>Restrooms</span><textarea name="restroomNotes" maxlength="1000" rows="2">${escapeHtml(location.restroomNotes)}</textarea></label>
          <label><span>Accessibility</span><textarea name="accessibilityNotes" maxlength="1000" rows="2">${escapeHtml(location.accessibilityNotes)}</textarea></label>
          <label class="production-resource-field-wide"><span>Nearest hospital</span><input name="nearestHospital" value="${escapeAttribute(location.nearestHospital)}" maxlength="500" /></label>
          <label><span>Manual weather notes</span><textarea name="weatherNotes" maxlength="1000" rows="2">${escapeHtml(location.weatherNotes)}</textarea></label>
          <label><span>Safety notes</span><textarea name="safetyNotes" maxlength="2000" rows="2">${escapeHtml(location.safetyNotes)}</textarea></label>
          <label class="production-resource-field-wide"><span>General notes</span><textarea name="generalNotes" maxlength="2000" rows="3">${escapeHtml(location.generalNotes)}</textarea></label>
          <div class="production-resource-documents production-resource-field-wide">
            <span>Project documents</span>
            <div>${renderProjectDocumentReferenceCheckboxes(project, location.documentIds)}</div>
          </div>
          <button class="primary-action" type="submit">${icon("check")} Save scouting record</button>
        </fieldset>
      </form>
      <div class="production-resource-call-sheet-action">
        <div><strong>Call sheet logistics</strong><small>${escapeHtml(applyNote)}</small></div>
        <button type="button" data-action="production-location-apply-call-sheet" ${canApply ? "" : "disabled"}>${icon("call-sheet")} Apply</button>
      </div>
    </section>
  `;
}

function renderProductionLocationUsage(location: ProductionLocation, manifest: ProductionLocationManifest): string {
  return renderProductionResourceUsage({
    panelId: "production-location-usage",
    ariaLabel: "Location usage counts",
    manifest,
    sourceKind: location.screenplayElementId ? "Screenplay element" : "Manual match",
    sourceName: location.name,
    sourceDetail: location.screenplayBreakdownId ? "Local/private breakdown" : "No linked breakdown",
  });
}

function renderProductionResourceUsage(options: {
  panelId: string;
  ariaLabel: string;
  manifest: {
    scenes: ProductionLocationManifest["scenes"];
    scheduleUses: ProductionLocationManifest["scheduleUses"];
    availability: ProductionAvailabilityWindow[];
  };
  sourceKind: string;
  sourceName: string;
  sourceDetail: string;
}): string {
  const { manifest } = options;
  return `
    <section class="panel production-resource-usage-panel" aria-labelledby="${escapeAttribute(options.panelId)}-title">
      <div class="section-head row">
        <div><h2 id="${escapeAttribute(options.panelId)}-title">Production Usage</h2><p>Derived from the linked breakdown, stripboards, and availability windows.</p></div>
        <div class="production-resource-usage-counts" aria-label="${escapeAttribute(options.ariaLabel)}">
          <span><strong>${manifest.scenes.length}</strong> Scenes</span>
          <span><strong>${manifest.scheduleUses.length}</strong> Schedule days</span>
          <span><strong>${manifest.availability.length}</strong> Windows</span>
        </div>
      </div>
      <div class="production-resource-usage-grid">
        <div>
          <h3>Scenes</h3>
          <ul class="line-list production-resource-usage-list">
            ${manifest.scenes.length ? manifest.scenes.map((scene) => `<li><strong>${escapeHtml(scene.sceneNumber ?? String(scene.ordinal))}</strong><span>${escapeHtml(scene.heading)}</span><small>${escapeHtml(scene.timeOfDay ?? "TBD")}</small></li>`).join("") : `<li><span>No linked scenes.</span></li>`}
          </ul>
        </div>
        <div>
          <h3>Schedule days</h3>
          <ul class="line-list production-resource-usage-list">
            ${manifest.scheduleUses.length ? manifest.scheduleUses.map((use) => `<li><strong>Day ${use.dayOrdinal}</strong><span>${escapeHtml(use.scheduleTitle)}</span><small>${escapeHtml(productionUnitLabel(use.unit))} - ${escapeHtml(use.date ?? "Undated")} - ${use.sceneIds.length} scenes - ${escapeHtml(use.scheduleStatus)}</small></li>`).join("") : `<li><span>No scheduled use.</span></li>`}
          </ul>
        </div>
        <div>
          <h3>Availability</h3>
          <ul class="line-list production-resource-usage-list">
            ${manifest.availability.length ? manifest.availability.map((window) => `<li><strong>${escapeHtml(productionValueLabel(window.status))}</strong><span>${escapeHtml(window.startDate)} through ${escapeHtml(window.endDate)}</span><small>${escapeHtml(window.notes || "No notes")}</small></li>`).join("") : `<li><span>No linked availability windows. Add them in Schedule.</span></li>`}
          </ul>
        </div>
        <div>
          <h3>Source</h3>
          <ul class="line-list production-resource-usage-list">
            <li><strong>${escapeHtml(options.sourceKind)}</strong><span>${escapeHtml(options.sourceName)}</span><small>${escapeHtml(options.sourceDetail)}</small></li>
          </ul>
        </div>
      </div>
    </section>
  `;
}

function renderTalentWorkspace(project: FilmProject): string {
  const records = productionTalentForProject(project.id);
  const talent = selectedProductionTalent(project.id);
  const manifest = talent ? productionTalentManifest(talent) : null;
  const breakdown = selectedScreenplayBreakdown(screenplayBreakdownsForProject(project.id));
  const linkedElementIds = new Set(records.map((record) => record.screenplayElementId).filter(Boolean));
  const candidateElements = breakdown?.elements
    .filter((element) => element.category === "cast" && element.reviewState !== "dismissed" && !linkedElementIds.has(element.id))
    .sort((left, right) => left.name.localeCompare(right.name)) ?? [];
  const callSheet = selectedProductionCallSheet(project.id);
  const castCount = records.filter((record) => record.status === "cast").length;
  return `
    <div class="slate-head talent-workspace-head">
      <div>
        <h1>Talent</h1>
        <p>${escapeHtml(project.title)} - ${records.length} character records - ${castCount} cast</p>
      </div>
      <div class="view-controls" aria-label="Talent controls">
        <button type="button" data-action="production-talent-export" ${talent && manifest ? "" : "disabled"}>${icon("doc")} Export brief</button>
      </div>
    </div>
    <section class="talent-workspace-grid" aria-label="Talent workspace">
      <section class="panel talent-create-panel" aria-labelledby="talent-create-title">
        <div class="section-head row"><div><h2 id="talent-create-title">Casting Roster</h2><p>${records.length} local/private records</p></div></div>
        <div class="production-record-list" aria-label="Talent casting roster">
          ${records.length ? records.map((record) => `
            <button type="button" class="production-record-row ${record.id === talent?.id ? "is-selected" : ""}" data-action="production-talent-row-select" data-talent-id="${escapeAttribute(record.id)}">
              <span>${escapeHtml(record.characterName)}${record.performerName ? ` - ${escapeHtml(record.performerName)}` : ""}</span>
              <small>${escapeHtml(productionValueLabel(record.status))} - paperwork ${escapeHtml(productionValueLabel(record.paperworkStatus))}</small>
            </button>
          `).join("") : `<div class="empty-inline">No talent records.</div>`}
        </div>
        ${renderCreateDisclosure("Add character record", `
          <form class="production-resource-create-form" data-action="production-talent-create">
            <label>
              <span>Screenplay character</span>
              <select name="screenplayElementId">
                <option value="">Manual character</option>
                ${candidateElements.map((element) => `<option value="${escapeAttribute(element.id)}">${escapeHtml(element.name)}</option>`).join("")}
              </select>
            </label>
            <label><span>Manual character</span><input name="characterName" maxlength="200" placeholder="Required for manual records" /></label>
            <button class="primary-action" type="submit">${icon("plus")} Add record</button>
          </form>
        `)}
        ${breakdown ? `<p class="production-resource-source-note">${candidateElements.length} unlinked cast elements in ${escapeHtml(breakdown.revision.title)}.</p>` : `<p class="production-resource-source-note">Import a screenplay to link scenes, or start with a manual character.</p>`}
      </section>
      ${talent && manifest ? renderProductionTalentEditor(project, talent, manifest, callSheet) : `
        <section class="panel talent-empty-panel"><div class="empty-inline">Add a character record to track casting, entered terms, readiness, schedule usage, and documents.</div></section>
      `}
      ${talent && manifest ? renderProductionResourceUsage({
        panelId: "production-talent-usage",
        ariaLabel: "Talent usage counts",
        manifest,
        sourceKind: talent.screenplayElementId ? "Screenplay element" : "Manual match",
        sourceName: talent.characterName,
        sourceDetail: talent.screenplayBreakdownId ? "Local/private breakdown" : "No linked breakdown",
      }) : ""}
    </section>
  `;
}

function productionTalentForProject(projectId: string): ProductionTalent[] {
  return state.workspace.productionTalent
    .filter((talent) => talent.projectId === projectId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function selectedProductionTalent(projectId = state.ui.selectedProjectId): ProductionTalent | null {
  const records = productionTalentForProject(projectId);
  return records.find((talent) => talent.id === state.ui.selectedProductionTalentId) ?? records[0] ?? null;
}

function productionTalentManifest(talent: ProductionTalent): ProductionTalentManifest {
  const breakdown = talent.screenplayBreakdownId
    ? state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === talent.screenplayBreakdownId) ?? null
    : selectedScreenplayBreakdown(screenplayBreakdownsForProject(talent.projectId));
  return buildProductionTalentManifest(
    talent,
    breakdown,
    productionSchedulesForProject(talent.projectId),
    state.workspace.productionAvailability,
  );
}

function renderProductionTalentEditor(
  project: FilmProject,
  talent: ProductionTalent,
  manifest: ProductionTalentManifest,
  callSheet: ProductionCallSheet | null,
): string {
  const sourceWarning = manifest.sourceMissing
    ? "The linked screenplay breakdown is missing. Derived scene and schedule use may be incomplete."
    : manifest.sourceChanged
      ? "The linked screenplay breakdown changed after this record was created. Review derived usage before handoff."
      : "";
  const callRequiresCharacter = Boolean(callSheet && talent.screenplayElementId && callSheet.castCalls.some((call) => call.elementId === talent.screenplayElementId));
  const canApply = talent.status === "cast" && Boolean(talent.performerName) && callSheet?.status === "draft" && callRequiresCharacter;
  const applyNote = !callSheet
    ? "Generate a call sheet before applying performer details."
    : callSheet.status === "final"
      ? `${callSheet.title} is final; reopen it before applying performer details.`
      : talent.status !== "cast"
        ? "Mark this record Cast before applying it to a call sheet."
        : !talent.performerName
          ? "Enter a performer name before call-sheet use."
          : !talent.screenplayElementId
            ? "Link a screenplay character before call-sheet use."
            : !callRequiresCharacter
              ? `${callSheet.title} does not require this character.`
              : `Apply ${talent.performerName} to ${callSheet.title}.`;
  return `
    <section class="panel production-talent-editor-panel" aria-labelledby="production-talent-editor-title">
      <div class="section-head row"><div><h2 id="production-talent-editor-title">Casting Details</h2><p>${escapeHtml(productionValueLabel(talent.status))} - paperwork ${escapeHtml(productionValueLabel(talent.paperworkStatus))}</p></div></div>
      ${sourceWarning ? `<div class="call-sheet-source-warning" role="status">${escapeHtml(sourceWarning)}</div>` : ""}
      <form class="production-resource-editor-form" data-action="production-talent-update">
        <fieldset>
          <label><span>Character</span><input name="characterName" value="${escapeAttribute(talent.characterName)}" maxlength="200" required /></label>
          <label><span>Performer</span><input name="performerName" value="${escapeAttribute(talent.performerName)}" maxlength="200" /></label>
          <label><span>Status</span><select name="status">${renderProductionTalentStatusOptions(talent.status)}</select></label>
          <label><span>Paperwork</span><select name="paperworkStatus">${renderProductionTalentPaperworkOptions(talent.paperworkStatus)}</select></label>
          <label><span>Direct contact</span><input name="contactName" value="${escapeAttribute(talent.contactName)}" maxlength="200" /></label>
          <label><span>Contact details</span><input name="contactDetails" value="${escapeAttribute(talent.contactDetails)}" maxlength="500" autocomplete="off" /></label>
          <label><span>Representative</span><input name="representativeName" value="${escapeAttribute(talent.representativeName)}" maxlength="200" /></label>
          <label><span>Representative details</span><input name="representativeDetails" value="${escapeAttribute(talent.representativeDetails)}" maxlength="500" autocomplete="off" /></label>
          <label><span>Entered rate basis</span><select name="rateBasis">${renderProductionTalentRateBasisOptions(talent.rateBasis)}</select></label>
          <label><span>Entered amount</span><input name="agreedRate" type="number" min="0" max="1000000000" step="0.01" value="${(talent.agreedRateCents / 100).toFixed(2)}" /></label>
          <label class="production-resource-field-wide"><span>Deal notes</span><textarea name="dealNotes" maxlength="2000" rows="3">${escapeHtml(talent.dealNotes)}</textarea></label>
          <label><span>Travel / lodging</span><textarea name="travelNotes" maxlength="1000" rows="2">${escapeHtml(talent.travelNotes)}</textarea></label>
          <label><span>Dietary</span><textarea name="dietaryNotes" maxlength="1000" rows="2">${escapeHtml(talent.dietaryNotes)}</textarea></label>
          <label><span>Accessibility</span><textarea name="accessibilityNotes" maxlength="1000" rows="2">${escapeHtml(talent.accessibilityNotes)}</textarea></label>
          <label><span>Wardrobe / fitting</span><textarea name="wardrobeNotes" maxlength="1000" rows="2">${escapeHtml(talent.wardrobeNotes)}</textarea></label>
          <label class="production-resource-field-wide"><span>General notes</span><textarea name="generalNotes" maxlength="2000" rows="3">${escapeHtml(talent.generalNotes)}</textarea></label>
          <div class="production-resource-documents production-resource-field-wide"><span>Project documents</span><div>${renderProjectDocumentReferenceCheckboxes(project, talent.documentIds)}</div></div>
          <button class="primary-action" type="submit">${icon("check")} Save talent record</button>
        </fieldset>
      </form>
      <div class="production-resource-call-sheet-action">
        <div><strong>Call sheet performer</strong><small>${escapeHtml(applyNote)}</small></div>
        <button type="button" data-action="production-talent-apply-call-sheet" ${canApply ? "" : "disabled"}>${icon("call-sheet")} Apply</button>
      </div>
    </section>
  `;
}

function renderProductionTalentStatusOptions(selected: ProductionTalentStatus): string {
  return (["prospect", "contacted", "auditioning", "offered", "cast", "released"] as ProductionTalentStatus[])
    .map((status) => `<option value="${status}" ${status === selected ? "selected" : ""}>${productionValueLabel(status)}</option>`).join("");
}

function renderProductionTalentPaperworkOptions(selected: ProductionTalentPaperworkStatus): string {
  return (["not_started", "requested", "partial", "complete"] as ProductionTalentPaperworkStatus[])
    .map((status) => `<option value="${status}" ${status === selected ? "selected" : ""}>${productionValueLabel(status)}</option>`).join("");
}

function renderProductionTalentRateBasisOptions(selected: ProductionTalentRateBasis): string {
  return (["not_set", "unpaid", "flat", "day", "week", "deferred", "other"] as ProductionTalentRateBasis[])
    .map((basis) => `<option value="${basis}" ${basis === selected ? "selected" : ""}>${productionValueLabel(basis)}</option>`).join("");
}

function renderProductionLocationStatusOptions(selected: ProductionLocationStatus): string {
  return (["scouting", "hold", "confirmed", "released"] as ProductionLocationStatus[])
    .map((status) => `<option value="${status}" ${status === selected ? "selected" : ""}>${productionValueLabel(status)}</option>`)
    .join("");
}

function renderProductionLocationPermitOptions(selected: ProductionLocationPermitStatus): string {
  return (["unknown", "not_required", "planned", "submitted", "approved"] as ProductionLocationPermitStatus[])
    .map((status) => `<option value="${status}" ${status === selected ? "selected" : ""}>${productionValueLabel(status)}</option>`)
    .join("");
}

function productionValueLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function productionUnitLabel(unit: ProductionUnit | undefined): string {
  return unit === "second" ? "Second unit" : "Main unit";
}

function renderProjectDocumentReferenceCheckboxes(project: FilmProject, selectedIds: string[]): string {
  return project.docs.length ? project.docs.map((doc) => `
    <label><input type="checkbox" name="documentId" value="${escapeAttribute(doc.id)}" ${selectedIds.includes(doc.id) ? "checked" : ""} /> <span>${escapeHtml(doc.name)}</span></label>
  `).join("") : `<small>No project documents available.</small>`;
}

function renderPlanningWorkspace(): string {
  const allRows = planningPanelRowsForWorkspace();
  const kindFilter = state.ui.planningKindFilter;
  const rows = kindFilter === "all" ? allRows : allRows.filter((row) => row.kind === kindFilter);
  const visibleRows = rows.slice(0, 16);
  const kindCounts = planningKindCounts(allRows);
  const d1Export = state.planningExportView;
  const totalImported = state.planningRows.length;
  const truncatedCount = state.planningRows.filter((record) => record.sourceTruncated).length;
  const filterLabel = kindFilter === "all" ? "All kinds" : PLANNING_KIND_LABELS[kindFilter];
  const sourceSummary = d1Export
    ? `${d1Export.rowCount} D1 rows - ${d1Export.truncated ? "truncated" : "complete"} - ${d1Export.persistence.replaceAll("_", " ")}`
    : `${totalImported} imported sample rows${truncatedCount ? ` - ${truncatedCount} capped imports` : ""}`;

  return `
    <div class="slate-head planning-workspace-head">
      <div>
        <h1>Planning</h1>
        <p>${rows.length} of ${allRows.length} rows shown - ${escapeHtml(filterLabel)} - ${escapeHtml(sourceSummary)}</p>
      </div>
      <div class="view-controls" aria-label="Planning controls">
        <label class="control-select">
          <span>Kind</span>
          <select data-action="planning-kind-filter" aria-label="Planning kind filter">
            <option value="all" ${kindFilter === "all" ? "selected" : ""}>All kinds</option>
            ${PLANNING_KINDS
              .map((kind) => `<option value="${kind}" ${kindFilter === kind ? "selected" : ""}>${escapeHtml(PLANNING_KIND_LABELS[kind])}</option>`)
              .join("")}
          </select>
        </label>
        <button type="button" data-action="planning-export-refresh" ${state.auth.session ? "" : "disabled"}>${icon("backup")} Refresh D1</button>
        <button type="button" data-action="export-planning-view">${icon("doc")} Export view</button>
      </div>
    </div>
    <section class="panel planning-panel planning-workspace-panel" aria-labelledby="planning-workspace-title">
      <div class="section-head row">
        <div>
          <h2 id="planning-workspace-title">Planning Rows</h2>
          <p>${visibleRows.length} of ${rows.length} rows shown - ${escapeHtml(filterLabel)}</p>
        </div>
      </div>
      ${
        rows.length > 0 || d1Export
          ? `
            <div class="planning-kind-strip" aria-label="Planning row coverage">
              ${kindCounts
                .map(
                  ([kind, count]) => `
                    <span>
                      <strong>${count}</strong>
                      ${escapeHtml(PLANNING_KIND_LABELS[kind])}
                    </span>
                  `,
                )
                .join("")}
            </div>
            <div class="planning-table" aria-label="Workspace planning rows" tabindex="0">
              <div class="planning-table-row planning-table-head">
                <span>Type</span>
                <span>Row</span>
                <span>Project</span>
                <span>Fields</span>
                <span>Source</span>
              </div>
              ${
                visibleRows.length
                  ? visibleRows.map(renderLocalPlanningRow).join("")
                  : `<div class="empty-inline">No planning rows are available from this source.</div>`
              }
            </div>
            ${
              d1Export
                ? `<small class="planning-source-note">D1 refreshed ${escapeHtml(formatShortDateTime(d1Export.checkedAt))}; local import samples remain in the operation log.</small>`
                : ""
            }
          `
          : `<div class="empty-inline">No planning rows imported.</div>`
      }
    </section>
  `;
}

function renderTasksWorkspace(project: FilmProject): string {
  const statusCounts = {
    overdue: project.openTasks.filter((task) => task.status === "overdue").length,
    pending: project.openTasks.filter((task) => task.status === "pending").length,
    ready: project.openTasks.filter((task) => task.status === "ready").length,
  };

  return `
    <div class="slate-head tasks-workspace-head">
      <div>
        <h1>Tasks</h1>
        <p>${escapeHtml(project.title)} - ${project.openTasks.length} open tasks - ${project.tasks.done} done</p>
      </div>
      <div class="view-controls" aria-label="Task controls">
        <button type="button" data-action="export-task-list">${icon("doc")} Export tasks</button>
      </div>
    </div>
    <section class="panel tasks-workspace-panel" aria-labelledby="tasks-workspace-title">
      <div class="section-head row">
        <div>
          <h2 id="tasks-workspace-title">Open Tasks</h2>
          <p>${project.tasks.done} of ${project.tasks.total} completed</p>
        </div>
      </div>
      <div class="task-status-strip" aria-label="Task status coverage">
        <span><strong>${statusCounts.overdue}</strong> Overdue</span>
        <span><strong>${statusCounts.pending}</strong> Pending</span>
        <span><strong>${statusCounts.ready}</strong> Ready</span>
      </div>
      <div class="tasks-table" aria-label="Project tasks" tabindex="0">
        <div class="tasks-table-row tasks-table-head">
          <span>Status</span>
          <span>Task</span>
          <span>Due</span>
          <span>Project</span>
          <span>Actions</span>
        </div>
        ${
          project.openTasks.length
            ? project.openTasks
              .map(
                (task) => `
                  <form class="tasks-table-row contextual-record-row" data-action="contextual-record-update" data-record-kind="task" data-record-id="${escapeAttribute(task.id)}">
                    <span class="task-status-cell"><span class="task-dot ${task.status}"></span>${renderTaskStatusSelect(task)}</span>
                    <label class="contextual-field"><span class="sr-only">Task</span><input name="title" value="${escapeAttribute(task.title)}" autocomplete="off" /></label>
                    <label class="contextual-field"><span class="sr-only">Due</span><input name="due" value="${escapeAttribute(task.due)}" autocomplete="off" class="${task.status === "overdue" ? "danger" : ""}" /></label>
                    <span>${escapeHtml(project.title)}</span>
                    <span class="contextual-row-actions">
                      ${renderInlineSaveButton(`Save ${task.title}`)}
                      <button
                        class="icon-button task-complete-button"
                        type="button"
                        data-action="task-complete"
                        data-task-id="${escapeAttribute(task.id)}"
                        title="Complete ${escapeAttribute(task.title)}"
                        aria-label="Complete ${escapeAttribute(task.title)}"
                      >
                        ${icon("check")}
                      </button>
                    </span>
                  </form>
                `,
              )
              .join("")
            : `<div class="empty-inline">No open tasks for this project.</div>`
        }
      </div>
      ${renderCreateDisclosure("Add task", `
        <form class="inline-form tasks-workspace-form task-create-form" data-action="add-task">
          <input name="title" placeholder="Task" autocomplete="off" />
          <input name="due" placeholder="Due" autocomplete="off" />
          <button type="submit">${icon("plus")} Add task</button>
        </form>
      `)}
    </section>
  `;
}

function renderDocsWorkspace(project: FilmProject): string {
  const selectedDoc = project.docs.find((doc) => doc.id === state.ui.selectedDocId) ?? project.docs[0] ?? null;
  const markdownCount = project.docs.filter((doc) => doc.type === "MD").length;

  return `
    <div class="slate-head docs-workspace-head">
      <div>
        <h1>Docs</h1>
        <p>${escapeHtml(project.title)} - ${project.docs.length} docs - ${markdownCount} Markdown drafts</p>
      </div>
      <div class="view-controls" aria-label="Document controls">
        <button type="button" data-action="export-selected-doc" ${selectedDoc?.type === "MD" ? "" : "disabled"}>${icon("doc")} Export draft</button>
      </div>
    </div>
    <section class="docs-workspace-grid" aria-label="Document workspace">
      <section class="panel docs-workspace-panel" aria-labelledby="docs-workspace-title">
        <div class="section-head row">
          <div>
            <h2 id="docs-workspace-title">Documents</h2>
            <p>${selectedDoc ? escapeHtml(selectedDoc.name) : "No document selected"}</p>
          </div>
        </div>
        <ul class="line-list docs-workspace-list">
          ${project.docs
            .map(
              (doc) => `
                <li>
                  <button class="doc-row-button ${doc.id === selectedDoc?.id ? "is-selected" : ""}" type="button" data-doc-id="${escapeAttribute(doc.id)}">
                    <span class="file-token ${escapeAttribute(doc.type)}">${escapeHtml(doc.type)}</span>
                    <span>${escapeHtml(doc.name)}</span>
                    <strong>${escapeHtml(formatDocStatus(doc))}</strong>
                  </button>
                </li>
              `,
            )
            .join("")}
        </ul>
        ${renderCreateDisclosure("Add document", `
          <form class="inline-form docs-workspace-form" data-action="add-doc">
            <input name="name" placeholder="Markdown document name" autocomplete="off" />
            <button type="submit">${icon("plus")} Add document</button>
          </form>
        `)}
      </section>
      <section class="panel docs-editor-panel" aria-labelledby="docs-editor-title">
        <div class="section-head row">
          <div>
            <h2 id="docs-editor-title">Draft</h2>
            <p>${selectedDoc ? escapeHtml(formatDocStatus(selectedDoc)) : "No document"}</p>
          </div>
        </div>
        ${selectedDoc ? renderDocumentEditor(selectedDoc) : `<div class="empty-inline">Select or create a document.</div>`}
      </section>
    </section>
  `;
}

function renderPeopleWorkspace(project: FilmProject): string {
  return `
    <div class="slate-head people-workspace-head">
      <div>
        <h1>People</h1>
        <p>${escapeHtml(project.title)} - ${project.people.length} people</p>
      </div>
      <div class="view-controls" aria-label="People controls">
        <button type="button" data-action="export-crew-directory">${icon("doc")} Export crew</button>
      </div>
    </div>
    <section class="panel operational-workspace-panel" aria-labelledby="people-workspace-title">
      <div class="section-head row">
        <div>
          <h2 id="people-workspace-title">People</h2>
          <p>Local crew and contact records</p>
        </div>
      </div>
      <div class="operational-table" aria-label="Project people" tabindex="0">
        <div class="operational-table-row operational-table-head">
          <span>Initials</span>
          <span>Name</span>
          <span>Role</span>
          <span class="sr-only">Actions</span>
        </div>
        ${
          project.people.length
            ? project.people
              .map(
                (person) => `
                  <form class="operational-table-row contextual-record-row" data-action="contextual-record-update" data-record-kind="person" data-record-id="${escapeAttribute(person.id)}">
                    <span><span class="file-token ${escapeAttribute(person.initials)}">${escapeHtml(person.initials)}</span></span>
                    <label class="contextual-field"><span class="sr-only">Name</span><input name="name" value="${escapeAttribute(person.name)}" autocomplete="off" /></label>
                    <label class="contextual-field"><span class="sr-only">Role</span><input name="role" value="${escapeAttribute(person.role)}" autocomplete="off" /></label>
                    ${renderInlineSaveButton(`Save ${person.name}`)}
                  </form>
                `,
              )
              .join("")
            : `<div class="empty-inline">No people added for this project.</div>`
        }
      </div>
      ${renderCreateDisclosure("Add person", `
        <form class="inline-form multi-field-form operational-workspace-form" data-action="add-person">
          <input name="name" placeholder="Name" autocomplete="off" />
          <input name="role" placeholder="Role" autocomplete="off" />
          <button type="submit">${icon("plus")} Add person</button>
        </form>
      `)}
    </section>
  `;
}

function renderEquipmentWorkspace(project: FilmProject): string {
  return `
    <div class="slate-head equipment-workspace-head">
      <div>
        <h1>Equipment</h1>
        <p>${escapeHtml(project.title)} - ${project.equipment.length} items</p>
      </div>
      <div class="view-controls" aria-label="Equipment controls">
        <button type="button" data-action="export-gear-pull">${icon("doc")} Export gear</button>
      </div>
    </div>
    <section class="panel operational-workspace-panel" aria-labelledby="equipment-workspace-title">
      <div class="section-head row">
        <div>
          <h2 id="equipment-workspace-title">Equipment</h2>
          <p>Local gear and status records</p>
        </div>
      </div>
      <div class="operational-table" aria-label="Project equipment" tabindex="0">
        <div class="operational-table-row operational-table-head">
          <span>Type</span>
          <span>Item</span>
          <span>Status</span>
          <span class="sr-only">Actions</span>
        </div>
        ${
          project.equipment.length
            ? project.equipment
              .map(
                (item) => `
                  <form class="operational-table-row contextual-record-row" data-action="contextual-record-update" data-record-kind="equipment" data-record-id="${escapeAttribute(item.id)}">
                    <span><span class="file-token EQ">EQ</span></span>
                    <label class="contextual-field"><span class="sr-only">Item</span><input name="name" value="${escapeAttribute(item.name)}" autocomplete="off" /></label>
                    <label class="contextual-field"><span class="sr-only">Status</span><input name="status" value="${escapeAttribute(item.status)}" autocomplete="off" /></label>
                    ${renderInlineSaveButton(`Save ${item.name}`)}
                  </form>
                `,
              )
              .join("")
            : `<div class="empty-inline">No equipment added for this project.</div>`
        }
      </div>
      ${renderCreateDisclosure("Add equipment", `
        <form class="inline-form multi-field-form operational-workspace-form" data-action="add-equipment">
          <input name="name" placeholder="Equipment" autocomplete="off" />
          <input name="status" placeholder="Status" autocomplete="off" />
          <button type="submit">${icon("plus")} Add equipment</button>
        </form>
      `)}
    </section>
  `;
}

function budgetTopSheetForProject(project: FilmProject): {
  lineBudget: number;
  lineSpent: number;
  remaining: number;
  usedPercent: number;
  largestLine: FilmProject["expenses"][number] | null;
  nearBudgetCount: number;
  overBudgetCount: number;
} {
  const lineBudget = project.expenses.reduce((total, expense) => total + expense.budget, 0);
  const lineSpent = project.expenses.reduce((total, expense) => total + expense.spent, 0);
  const totalBudget = project.totalBudget > 0 ? project.totalBudget : lineBudget;
  const spent = project.spentBudget > 0 ? project.spentBudget : lineSpent;
  const largestLine = [...project.expenses].sort((left, right) => right.spent - left.spent)[0] ?? null;
  return {
    lineBudget,
    lineSpent,
    remaining: totalBudget - spent,
    usedPercent: totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0,
    largestLine,
    nearBudgetCount: project.expenses.filter((expense) => expense.budget > 0 && expense.spent <= expense.budget && expense.spent / expense.budget >= 0.85).length,
    overBudgetCount: project.expenses.filter((expense) => expense.budget > 0 && expense.spent > expense.budget).length,
  };
}

function renderExpensesWorkspace(project: FilmProject): string {
  const budget = budgetTopSheetForProject(project);
  return `
    <div class="slate-head expenses-workspace-head">
      <div>
        <h1>Expenses</h1>
        <p>${escapeHtml(project.title)} - ${formatCurrency(project.spentBudget)} spent of ${formatCurrency(project.totalBudget)}</p>
      </div>
      <div class="view-controls" aria-label="Expense controls">
        <button type="button" data-action="export-budget-top-sheet">${icon("doc")} Export budget</button>
      </div>
    </div>
    <section class="expenses-workspace-grid" aria-label="Expenses workspace">
      <section class="panel budget-summary-panel" aria-labelledby="budget-summary-title">
        <div class="section-head row">
          <div>
            <h2 id="budget-summary-title">Budget Top Sheet</h2>
            <p>Read-only rollup from project budget lines</p>
          </div>
        </div>
        <div class="budget-summary-cards">
          <div>
            <span>Total</span>
            <strong>${formatCurrency(project.totalBudget)}</strong>
          </div>
          <div>
            <span>Spent</span>
            <strong>${formatCurrency(project.spentBudget)}</strong>
          </div>
          <div>
            <span>Remaining</span>
            <strong>${formatCurrency(budget.remaining)}</strong>
          </div>
          <div>
            <span>Used</span>
            <strong>${budget.usedPercent}%</strong>
          </div>
        </div>
        <div class="budget-burn-meter" role="progressbar" aria-label="Budget used" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, budget.usedPercent)}">
          <span aria-hidden="true" style="width:${Math.min(100, budget.usedPercent)}%"></span>
        </div>
        <ul class="budget-risk-list">
          <li>
            <span>Line budget</span>
            <strong>${formatCurrency(budget.lineBudget)}</strong>
            <small>${formatCurrency(budget.lineSpent)} line spend</small>
          </li>
          <li>
            <span>Largest line</span>
            <strong>${budget.largestLine ? escapeHtml(budget.largestLine.category) : "No lines"}</strong>
            <small>${budget.largestLine ? `${formatCurrency(budget.largestLine.spent)} spent` : "No expense rows yet"}</small>
          </li>
          <li>
            <span>Budget risk</span>
            <strong>${budget.overBudgetCount} over / ${budget.nearBudgetCount} near</strong>
            <small>Near means 85% or higher</small>
          </li>
        </ul>
      </section>
      <section class="panel operational-workspace-panel budget-lines-panel" aria-labelledby="expenses-workspace-title">
        <div class="section-head row">
          <div>
            <h2 id="expenses-workspace-title">Expenses</h2>
            <p>${project.expenses.length} budget lines</p>
          </div>
        </div>
        <div class="expense-table operational-expense-table">
          <div class="expense-record-row expense-record-head" aria-hidden="true">
            <span>Category</span>
            <span>Spent</span>
            <span>Budget</span>
            <span>Used</span>
            <span>Progress</span>
            <span></span>
          </div>
          ${project.expenses
            .map(
              (expense) => `
                <form class="expense-record-row contextual-record-row" data-action="contextual-record-update" data-record-kind="expense" data-record-id="${escapeAttribute(expense.id)}">
                  <label class="contextual-field"><span class="sr-only">Category</span><input name="category" value="${escapeAttribute(expenseCategoryLabel(expense))}" autocomplete="off" /></label>
                  <label class="contextual-field money-field"><span class="sr-only">Spent</span><input name="spent" inputmode="decimal" value="${expense.spent}" autocomplete="off" /></label>
                  <label class="contextual-field money-field"><span class="sr-only">Budget</span><input name="budget" inputmode="decimal" value="${expense.budget}" autocomplete="off" /></label>
                  <span>${expense.percent}%</span>
                  <span class="meter small"><span style="width:${Math.min(100, expense.percent)}%"></span></span>
                  ${renderInlineSaveButton(`Save ${expenseCategoryLabel(expense)}`)}
                </form>
              `,
            )
            .join("")}
        </div>
        ${renderCreateDisclosure("Add expense", `
          <form class="inline-form expense-create-form operational-workspace-form" data-action="add-expense">
            <input name="category" placeholder="Category" autocomplete="off" />
            <input name="spent" inputmode="decimal" placeholder="Spent" autocomplete="off" />
            <input name="budget" inputmode="decimal" placeholder="Budget" autocomplete="off" />
            <button type="submit">${icon("plus")} Add expense</button>
          </form>
        `)}
      </section>
    </section>
  `;
}

function renderBackupRestoreWorkflow(): string {
  return `
    <section class="panel backup-restore-workflow" aria-labelledby="backup-restore-workflow-title">
                <div class="section-head row"><div><h2 id="backup-restore-workflow-title">Restore Workflow</h2><p>Preview, verify, and apply one restore in order.</p></div></div>
                ${
                  state.backupDryRun
                    ? `
                      <div class="provider-preview" role="status">
                        <strong>Worker restore point</strong>
                        <span>${escapeHtml(state.backupDryRun.persistence.replaceAll("_", " "))}</span>
                        ${
                          state.backupDryRun.storagePersistence
                            ? `<span>${escapeHtml(state.backupDryRun.storagePersistence.replaceAll("_", " "))}${state.backupDryRun.sizeBytes ? ` - ${formatBytes(state.backupDryRun.sizeBytes)}` : ""}</span>`
                            : ""
                        }
                        <span>${escapeHtml(state.backupDryRun.retentionPolicy.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.backupDryRun.restorePointLabel)}</small>
                      </div>
                    `
                    : ""
                }
                ${
                  state.backupExport
                    ? `
                      <div class="provider-preview" role="status">
                        <strong>Stored backup manifest</strong>
                        <span>${state.backupExport.rowCount} stored restore points - ${state.backupExport.truncated ? "truncated" : "complete"}</span>
                        <small>${escapeHtml(state.backupExport.persistence.replaceAll("_", " "))}</small>
                      </div>
                    `
                    : ""
                }
                <div class="backup-workflow-actions">
                <label class="restore-row">
                  <span>Restore point</span>
                  <select data-action="restore-select">
                    ${state.workspace.restorePoints
                      .map((point) => `<option value="${point.id}">${escapeHtml(point.label)}</option>`)
                      .join("")}
                  </select>
                  <button type="button" data-action="restore">Restore</button>
                </label>
                <button class="secondary-button full-width" type="button" data-action="backup-r2-manifest">${icon("backup")} Stored backups</button>
                <button class="secondary-button full-width" type="button" data-action="backup-r2-preview">${icon("backup")} Preview stored backup</button>
                <button class="secondary-button full-width" type="button" data-action="restore-file-preview">${icon("backup")} Preview encrypted backup</button>
                </div>
                <div class="restore-stage-actions">
                ${
                  state.restorePreview
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-gate-check">${icon("check")} Check restore gate</button>`
                    : ""
                }
                ${
                  state.restorePreview && state.restoreGate
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-approval-record">${icon("check")} Record approval</button>`
                    : ""
                }
                ${
                  state.restorePreview && state.restoreApproval?.approvalId && state.restoreApproval.approvalStatus === "approved_pending_commit"
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-commit-storage-check">${icon("check")} Check commit storage</button>`
                    : ""
                }
                ${
                  state.restorePreview && state.restoreCommitAttempt?.commitAttemptId && state.restoreCommitAttempt.commitAttemptStatus === "blocked_until_restore_apply"
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-application-preflight-check">${icon("check")} Check application preflight</button>`
                    : ""
                }
                ${
                  state.restoreSnapshot
                    && state.restorePreview
                    && state.restoreApplicationPreflight?.applicationPreflightId
                    && state.restoreApplicationPreflight.applicationPreflightStatus === "blocked_until_restore_apply_implementation"
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-application-commit">${icon("check")} Apply snapshot records</button>`
                    : ""
                }
                ${
                  state.restorePreview?.applicationPlan.attachmentPackagePlan.packageRequired
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-attachment-package-check">${icon("check")} Check attachment package</button>`
                    : ""
                }
                ${
                  state.restoreAttachmentPackagePreflight?.attachmentPackagePreflightId
                    && state.attachmentExport?.packageDownload?.sha256
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-attachment-package-verify">${icon("check")} Verify package manifest</button>`
                    : ""
                }
                ${
                  state.restoreAttachmentPackagePreflight?.attachmentPackagePreflightId
                    && !state.attachmentExport?.packageDownload
                    ? `<small class="restore-action-note">Download package in Imports before package verification.</small>`
                    : ""
                }
                ${
                  state.restoreAttachmentPackageVerification?.attachmentPackageVerificationId
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-attachment-objects-plan">${icon("check")} Plan attachment object restore</button>`
                    : ""
                }
                ${
                  state.restoreAttachmentObjectPlan?.attachmentObjectPlanId
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-attachment-objects-commit-preflight">${icon("check")} Check attachment commit preflight</button>`
                    : ""
                }
                ${
                  state.restoreAttachmentObjectCommitPreflight?.readyForByteCommit
                    && state.restoreAttachmentObjectCommitPreflight.attachmentObjectCommitPreflightId
                    && state.attachmentExport?.packageDownload?.blob
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-attachment-objects-commit">${icon("backup")} Restore attachment bytes</button>`
                    : ""
                }
                ${
                  state.restorePreview && state.restorePlanningRecords.length > 0
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-planning-check">${icon("check")} Check planning restore</button>`
                    : ""
                }
                ${
                  state.restorePlanningRecords.length > 0
                    && state.restorePlanningDryRun?.planningPreviewId
                    && state.restorePlanningDryRun.planningPreviewStatus === "preview_only"
                    && state.restorePlanningDryRun.rejectedCount === 0
                    && state.restoreApplicationPreflight?.applicationPreflightId
                    && state.restoreApplicationPreflight.applicationPreflightStatus === "blocked_until_restore_apply_implementation"
                    ? `<button class="secondary-button full-width" type="button" data-action="restore-planning-commit">${icon("check")} Apply planning rows</button>`
                    : ""
                }
                </div>
                <div class="restore-workflow-results">
                ${
                  state.restorePreview
                    ? renderRestorePreview(state.restorePreview)
                    : ""
                }
                ${
                  state.restorePlanningDryRun
                    ? renderRestorePlanningDryRun(state.restorePlanningDryRun, state.restorePlanningRecords)
                    : ""
                }
                ${
                  state.restorePlanningCommit
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Planning commit</strong>
                        <span>${escapeHtml(state.restorePlanningCommit.planningCommitStatus.replaceAll("_", " "))}</span>
                        <span>${state.restorePlanningCommit.destructiveWrite ? "Destructive writes applied" : "No destructive writes"} - ${escapeHtml(state.restorePlanningCommit.commitStatus.replaceAll("_", " "))}</span>
                        <span>${escapeHtml(formatRestorePlanningCommitSummary(state.restorePlanningCommit.result))}</span>
                        <small>${escapeHtml(state.restorePlanningCommit.restoreMode.replaceAll("_", " "))} - ${escapeHtml(state.restorePlanningCommit.planningCommitPersistence.replaceAll("_", " "))}${state.restorePlanningCommit.auditPersistence ? ` - ${escapeHtml(state.restorePlanningCommit.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        <small>${escapeHtml(shortHash(state.restorePlanningCommit.planningCommitId))}</small>
                        ${
                          state.restorePlanningCommit.unsupportedRestoreDomains.length
                            ? `<small>Still blocked: ${escapeHtml(state.restorePlanningCommit.unsupportedRestoreDomains.join(", ").replaceAll("_", " "))}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreAttachmentPackagePreflight
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Attachment package preflight</strong>
                        <span>${state.restoreAttachmentPackagePreflight.metadataRecordCount} metadata records - ${formatBytes(state.restoreAttachmentPackagePreflight.totalSourceBytes)}</span>
                        <span>${state.restoreAttachmentPackagePreflight.canRestoreBytes ? "Byte restore ready" : "Byte restore blocked"} - ${escapeHtml(state.restoreAttachmentPackagePreflight.attachmentPackagePreflightStatus.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.restoreAttachmentPackagePreflight.attachmentPackagePreflightPersistence.replaceAll("_", " "))}${state.restoreAttachmentPackagePreflight.auditPersistence ? ` - ${escapeHtml(state.restoreAttachmentPackagePreflight.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        ${
                          state.restoreAttachmentPackagePreflight.attachmentPackagePreflightId
                            ? `<small>${escapeHtml(shortHash(state.restoreAttachmentPackagePreflight.attachmentPackagePreflightId))}</small>`
                            : ""
                        }
                        ${
                          state.restoreAttachmentPackagePreflight.blockers.length
                            ? `<small>${escapeHtml(state.restoreAttachmentPackagePreflight.blockers.slice(0, 2).join(" "))}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreAttachmentPackageVerification
                    ? renderRestoreAttachmentPackageVerification(state.restoreAttachmentPackageVerification)
                    : ""
                }
                ${
                  state.restoreAttachmentObjectPlan
                    ? renderRestoreAttachmentObjectPlan(state.restoreAttachmentObjectPlan)
                    : ""
                }
                ${
                  state.restoreAttachmentObjectCommitPreflight
                    ? renderRestoreAttachmentObjectCommitPreflight(state.restoreAttachmentObjectCommitPreflight)
                    : ""
                }
                ${
                  state.restoreAttachmentObjectCommit
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Attachment byte restore</strong>
                        <span>${state.restoreAttachmentObjectCommit.committedCount} stored - ${state.restoreAttachmentObjectCommit.idempotentCount} idempotent - ${state.restoreAttachmentObjectCommit.failedCount} failed</span>
                        <span>${formatBytes(state.restoreAttachmentObjectCommit.totalBytes)} committed through verified package objects</span>
                        <small>New R2 objects only - destructive writes audited</small>
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreGate
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Restore gate</strong>
                        <span>${escapeHtml(state.restoreGate.commitStatus.replaceAll("_", " "))}</span>
                        <span>${state.restoreGate.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${state.restoreGate.preRestoreBackupRequired ? "pre-restore backup required" : "pre-restore backup not required"}</span>
                        <span>Pre-restore backup: ${state.restoreGate.preRestoreBackupVerified ? "verified" : "not verified"} - ${escapeHtml(state.restoreGate.preRestoreBackupPersistence.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.restoreGate.authorizationPolicy.replaceAll("_", " "))}${state.restoreGate.auditPersistence ? ` - ${escapeHtml(state.restoreGate.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        ${
                          state.restoreGate.preRestoreBackupBlocker
                            ? `<small>${escapeHtml(state.restoreGate.preRestoreBackupBlocker)}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreApproval
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Restore approval</strong>
                        <span>${escapeHtml(state.restoreApproval.approvalStatus.replaceAll("_", " "))}</span>
                        <span>${state.restoreApproval.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(state.restoreApproval.commitStatus.replaceAll("_", " "))}</span>
                        <span>Pre-restore backup: ${state.restoreApproval.preRestoreBackupVerified ? "verified" : "not verified"} - ${escapeHtml(state.restoreApproval.preRestoreBackupPersistence.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.restoreApproval.approvalPersistence.replaceAll("_", " "))}${state.restoreApproval.auditPersistence ? ` - ${escapeHtml(state.restoreApproval.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        ${
                          state.restoreApproval.approvalId
                            ? `<small>${escapeHtml(shortHash(state.restoreApproval.approvalId))}</small>`
                            : ""
                        }
                        ${
                          state.restoreApproval.preRestoreBackupBlocker
                            ? `<small>${escapeHtml(state.restoreApproval.preRestoreBackupBlocker)}</small>`
                            : ""
                        }
                        ${
                          state.restoreApproval.approvalBlockers.length
                            ? `<small>${escapeHtml(state.restoreApproval.approvalBlockers.join(" "))}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreCommitAttempt
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Commit storage</strong>
                        <span>${escapeHtml(state.restoreCommitAttempt.commitAttemptStatus.replaceAll("_", " "))}</span>
                        <span>${state.restoreCommitAttempt.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(state.restoreCommitAttempt.commitStatus.replaceAll("_", " "))}</span>
                        <span>Pre-restore backup: ${state.restoreCommitAttempt.preRestoreBackupVerified ? "verified" : "not verified"} - ${escapeHtml(state.restoreCommitAttempt.preRestoreBackupPersistence.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.restoreCommitAttempt.commitAttemptPersistence.replaceAll("_", " "))}${state.restoreCommitAttempt.auditPersistence ? ` - ${escapeHtml(state.restoreCommitAttempt.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        ${
                          state.restoreCommitAttempt.commitAttemptId
                            ? `<small>${escapeHtml(shortHash(state.restoreCommitAttempt.commitAttemptId))}</small>`
                            : ""
                        }
                        ${
                          state.restoreCommitAttempt.preRestoreBackupBlocker
                            ? `<small>${escapeHtml(state.restoreCommitAttempt.preRestoreBackupBlocker)}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreApplicationPreflight
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Application preflight</strong>
                        <span>${escapeHtml(state.restoreApplicationPreflight.applicationPreflightStatus.replaceAll("_", " "))}</span>
                        <span>${state.restoreApplicationPreflight.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(state.restoreApplicationPreflight.commitStatus.replaceAll("_", " "))}</span>
                        <span>Pre-restore backup: ${state.restoreApplicationPreflight.preRestoreBackupVerified ? "verified" : "not verified"} - ${escapeHtml(state.restoreApplicationPreflight.preRestoreBackupPersistence.replaceAll("_", " "))}</span>
                        <small>${escapeHtml(state.restoreApplicationPreflight.applicationPreflightPersistence.replaceAll("_", " "))}${state.restoreApplicationPreflight.auditPersistence ? ` - ${escapeHtml(state.restoreApplicationPreflight.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        ${
                          state.restoreApplicationPreflight.applicationPreflightId
                            ? `<small>${escapeHtml(shortHash(state.restoreApplicationPreflight.applicationPreflightId))}</small>`
                            : ""
                        }
                        ${
                          state.restoreApplicationPreflight.rollbackGuidance.blockers?.length
                            ? `<small>${escapeHtml(state.restoreApplicationPreflight.rollbackGuidance.blockers.join(" "))}</small>`
                            : ""
                        }
                        ${
                          state.restoreApplicationPreflight.rollbackGuidance.requiredBeforeApply?.length
                            ? `<small>Before apply: ${escapeHtml(state.restoreApplicationPreflight.rollbackGuidance.requiredBeforeApply.join(", ").replaceAll("_", " "))}</small>`
                            : ""
                        }
                        ${
                          state.restoreApplicationPreflight.rollbackGuidance.applicationTablePlan?.length
                            ? `<small>Preflight table plan: ${state.restoreApplicationPreflight.rollbackGuidance.applicationTablePlan.length} tables</small>`
                            : ""
                        }
                        ${
                          state.restoreSnapshot && state.restorePreview
                            ? renderRestoreSnapshotReviewTable(state.restoreSnapshot, state.restorePreview)
                            : ""
                        }
                        ${
                          state.restoreApplicationPreflight.preRestoreBackupBlocker
                            ? `<small>${escapeHtml(state.restoreApplicationPreflight.preRestoreBackupBlocker)}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.restoreApplicationCommit
                    ? `
                      <div class="restore-preview" role="status">
                        <strong>Application commit</strong>
                        <span>${escapeHtml(state.restoreApplicationCommit.applicationCommitStatus.replaceAll("_", " "))}</span>
                        <span>${state.restoreApplicationCommit.destructiveWrite ? "Destructive writes applied" : "No destructive writes"} - ${escapeHtml(state.restoreApplicationCommit.commitStatus.replaceAll("_", " "))}</span>
                        <span>${escapeHtml(formatRestoreRecordSummary(state.restoreApplicationCommit.recordSummary))}</span>
                        <small>${escapeHtml(state.restoreApplicationCommit.restoreMode.replaceAll("_", " "))} - ${escapeHtml(state.restoreApplicationCommit.applicationCommitPersistence.replaceAll("_", " "))}${state.restoreApplicationCommit.auditPersistence ? ` - ${escapeHtml(state.restoreApplicationCommit.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                        <small>${escapeHtml(shortHash(state.restoreApplicationCommit.applicationCommitId))}</small>
                        ${
                          state.restoreApplicationCommit.unsupportedRestoreDomains.length
                            ? `<small>Still blocked: ${escapeHtml(state.restoreApplicationCommit.unsupportedRestoreDomains.join(", ").replaceAll("_", " "))}</small>`
                            : ""
                        }
                      </div>
                    `
                    : ""
                }
                </div>
              </section>
  `;
}

function renderBackupsWorkspace(): string {
  const restorePoints = state.workspace.restorePoints.slice(0, 8);
  const latestBackup = restorePoints[0];
  const backupStatus = state.backupDryRun
    ? `${state.backupDryRun.persistence.replaceAll("_", " ")} - ${state.backupDryRun.retentionPolicy.replaceAll("_", " ")}`
    : "No Worker backup check in this session";
  const manifestStatus = state.backupExport
    ? `${state.backupExport.rowCount} stored restore points - ${state.backupExport.truncated ? "truncated" : "complete"}`
    : "Stored backup manifest not loaded";
  const restoreStatus = state.restorePreview
    ? `${state.restorePreview.status} - ${state.restorePreview.matchingProjects} matching projects`
    : "No encrypted backup preview loaded";

  return `
    <div class="slate-head backups-workspace-head">
      <div>
        <h1>Backups</h1>
        <p>${state.workspace.restorePoints.length} restore points - ${escapeHtml(state.workspace.backupPolicy)}</p>
      </div>
      <div class="view-controls" aria-label="Backup controls">
        <button type="button" data-action="backup">${icon("backup")} Backup now</button>
      </div>
    </div>
    <section class="backup-workspace-grid" aria-label="Backup workspace">
      <section class="panel backup-workspace-panel" aria-labelledby="backup-restore-points-title">
        <div class="section-head row">
          <div>
            <h2 id="backup-restore-points-title">Restore Points</h2>
            <p>Latest: ${escapeHtml(latestBackup?.label ?? "None")}</p>
          </div>
        </div>
        <div class="backup-table" aria-label="Restore points" tabindex="0">
          <div class="backup-table-row backup-table-head">
            <span>Label</span>
            <span>Created</span>
            <span>Restore ID</span>
          </div>
          ${
            restorePoints.length
              ? restorePoints
                .map(
                  (point) => `
                    <div class="backup-table-row">
                      <span>${escapeHtml(point.label)}</span>
                      <span>${escapeHtml(formatShortDateTime(point.createdAt))}</span>
                      <span>${escapeHtml(shortHash(point.id))}</span>
                    </div>
                  `,
                )
                .join("")
              : `<div class="empty-inline">No restore points yet.</div>`
          }
        </div>
      </section>
      <section class="panel backup-workspace-panel" aria-labelledby="backup-safety-title">
        <div class="section-head row">
          <div>
            <h2 id="backup-safety-title">Safety State</h2>
            <p>${countQueuedOperations(state.operations)} local operations queued</p>
          </div>
        </div>
        <dl class="detail-list compact backup-safety-list">
          <div><dt>Next backup</dt><dd>${escapeHtml(state.workspace.nextBackup)}</dd></div>
          <div><dt>Worker backup</dt><dd>${escapeHtml(backupStatus)}</dd></div>
          <div><dt>Stored manifest</dt><dd>${escapeHtml(manifestStatus)}</dd></div>
          <div><dt>Restore preview</dt><dd>${escapeHtml(restoreStatus)}</dd></div>
        </dl>
      </section>
    </section>
    ${renderBackupRestoreWorkflow()}
  `;
}

function renderSidebar(): string {
  return `
    <aside class="sidebar">
      <div class="brand-row">
        <span class="brand-mark" aria-hidden="true">${icon("slate")}</span>
        <span class="brand-copy">
          <span class="brand-name">Film</span>
          <span class="brand-operator">by Dust Wave</span>
        </span>
      </div>
      <div class="workspace-switch" aria-label="Current workspace">
        <span class="avatar">DW</span>
        <span>Dust Wave</span>
      </div>
      <nav class="nav-group" aria-label="Workspace navigation">
        <p class="nav-label">Workspace</p>
        ${renderWorkspaceNavItem(OVERVIEW_NAV_ITEM)}
        ${renderWorkspaceNavItem(PROJECTS_NAV_ITEM)}
        ${WORKSPACE_NAV_GROUPS.map((group) => {
          const isCurrentGroup = group.items.some((item) => item.section === state.ui.workspaceSection);
          return `
            <details class="nav-cluster" ${isCurrentGroup ? "open" : ""}>
              <summary>
                <span>${escapeHtml(group.label)}</span>
                ${icon("chevron")}
              </summary>
              <div class="nav-cluster-items">
                ${group.items.map((item) => renderWorkspaceNavItem(item)).join("")}
              </div>
            </details>
          `;
        }).join("")}
      </nav>
      ${renderAuthPanel()}
      <div class="sidebar-footer">
        <div class="sidebar-legal-links" aria-label="Legal links">
          <a href="/privacy.html">Privacy</a>
          <a href="/terms.html">Terms</a>
          <a href="/sms.html">SMS</a>
          <a href="/data-deletion.html">Data deletion</a>
        </div>
      </div>
    </aside>
  `;
}

function renderMobileWorkspaceNav(): string {
  return `
    <nav class="mobile-workspace-nav" aria-label="Mobile workspace navigation">
      <label class="mobile-workspace-picker">
        <span class="sr-only">Workspace area</span>
        <select data-action="workspace-section-select">
          <optgroup label="Projects">
            <option value="slate" ${state.ui.workspaceSection === "slate" ? "selected" : ""}>Overview</option>
            <option value="projects" ${state.ui.workspaceSection === "projects" ? "selected" : ""}>Projects</option>
          </optgroup>
          ${WORKSPACE_NAV_GROUPS.map((group) => `
            <optgroup label="${escapeAttribute(group.label)}">
              ${group.items.map((item) => `
                <option value="${item.section}" ${item.section === state.ui.workspaceSection ? "selected" : ""}>${escapeHtml(item.label)}</option>
              `).join("")}
            </optgroup>
          `).join("")}
        </select>
      </label>
    </nav>
  `;
}

function renderWorkspaceNavItem(item: WorkspaceNavItem, active = item.section === state.ui.workspaceSection): string {
  return `
    <button
      class="nav-item ${active ? "is-active" : ""}"
      type="button"
      data-workspace-section="${item.section}"
    >
      ${icon(item.glyph)}
      <span>${escapeHtml(item.label)}</span>
    </button>
  `;
}

function renderAuthPanel(): string {
  if (state.auth.status === "signed_in" && state.auth.session) {
    return `
      <section class="auth-panel" aria-label="Session">
        <div class="auth-head">
          <span class="status-dot teal"></span>
          <strong>${escapeHtml(state.auth.session.role)} session</strong>
        </div>
        <p>Expires ${escapeHtml(formatShortDateTime(state.auth.session.expiresAt))}</p>
        <button class="secondary-button full-width" data-action="auth-sign-out" type="button">${icon("logout")} Sign out</button>
      </section>
    `;
  }

  const isRequesting = state.auth.status === "requesting";
  const isVerifying = state.auth.status === "verifying";
  const isAcceptingInvite = state.invite.status === "accepting";
  const linkReady = (state.auth.status === "link_requested" || state.auth.status === "verifying")
    && state.auth.devOnlyToken;
  const liveLinkRequested = state.auth.status === "link_requested" && !state.auth.devOnlyToken;
  const authPanelOpen = Boolean(state.invite.acceptToken) || isRequesting || isVerifying || isAcceptingInvite || linkReady || liveLinkRequested;

  return `
    <details class="auth-panel auth-disclosure" ${authPanelOpen ? "open" : ""}>
      <summary>
        <span class="auth-head"><span class="status-dot amber"></span><strong>Sign in or join</strong></span>
        ${icon("chevron")}
      </summary>
      <div class="auth-disclosure-body">
      <section class="auth-mode" aria-label="Sign in">
        <div class="auth-head">
          <strong>Sign in by email</strong>
        </div>
        <form class="auth-form" data-action="auth-request">
          <input
            name="email"
            type="email"
            value="${escapeAttribute(state.auth.email)}"
            placeholder="name@example.com"
            autocomplete="email"
            ${isRequesting || isVerifying ? "disabled" : ""}
          />
          <button type="submit" ${isRequesting || isVerifying ? "disabled" : ""}>${isRequesting ? "Sending..." : "Send"}</button>
        </form>
        ${
          linkReady
            ? `
              <div class="auth-preview">
                <span>Dry-run link ready</span>
                <small>${escapeHtml(shortHash(state.auth.emailHash))}</small>
                <button class="secondary-button full-width" data-action="auth-verify" type="button" ${isVerifying ? "disabled" : ""}>
                  ${icon("check")} ${isVerifying ? "Verifying..." : "Verify dry-run link"}
                </button>
              </div>
            `
            : liveLinkRequested
              ? `
                <div class="auth-preview" role="status">
                  <span>Check your email</span>
                  <small>A one-time sign-in link was sent if this address belongs to an active Film member.</small>
                </div>
              `
            : ""
        }
      </section>
      <section class="auth-mode" aria-label="Accept invite">
        <div class="auth-head">
          <strong>Accept an invitation</strong>
        </div>
        <form class="auth-form" data-action="invite-accept">
          <input
            name="inviteToken"
            value="${escapeAttribute(state.invite.acceptToken)}"
            placeholder="dry_invite_..."
            autocomplete="off"
            ${isAcceptingInvite ? "disabled" : ""}
          />
          <input
            name="displayName"
            value="${escapeAttribute(state.invite.acceptDisplayName)}"
            placeholder="Display name"
            autocomplete="name"
            ${isAcceptingInvite ? "disabled" : ""}
          />
          <button type="submit" ${isAcceptingInvite ? "disabled" : ""}>${isAcceptingInvite ? "Accepting..." : "Accept"}</button>
        </form>
        ${
          state.invite.status === "accepted" && state.invite.acceptedRole
            ? `
              <div class="auth-preview">
                <span>Invite accepted</span>
                <small>${escapeHtml(formatWorkspaceRole(state.invite.acceptedRole))}</small>
              </div>
            `
            : ""
        }
      </section>
      </div>
    </details>
  `;
}

function renderTopbar(): string {
  const queuedOperations = countQueuedOperations(state.operations);
  const syncLabel = queuedOperations > 0 ? `${queuedOperations} local ops queued` : "Synced locally";
  const latestBackup = state.workspace.restorePoints[0];
  const liveIntegrationCount = state.workspace.integrations.filter((integration) => integration.mode === "live").length;
  const integrationSummary = liveIntegrationCount > 0
    ? `${liveIntegrationCount} live, ${INTEGRATION_DEFINITIONS.length - liveIntegrationCount} dry-run`
    : `${INTEGRATION_DEFINITIONS.length} dry-run`;

  return `
    <header class="topbar">
      <div class="status-strip" aria-label="Runtime status">
        <span class="status-chip success">${icon("check")} Offline ready</span>
        <button class="status-chip dry" data-action="integrations-open" type="button">
          ${icon("provider")}
          <span>Integrations</span>
          <small>${escapeHtml(integrationSummary)}</small>
        </button>
      </div>
      <button class="sync-state" data-action="sync-dry-run" title="Local mirror: ${escapeAttribute(state.storageSource)}" type="button">${icon("check")} ${escapeHtml(syncLabel)}</button>
      <span class="backup-state" title="Manage backups in the Backups workspace">${icon("backup")} ${escapeHtml(latestBackup?.label ?? "No backup yet")}</span>
    </header>
  `;
}

function renderSlateHeader(selectedProject: FilmProject): string {
  return `
    <div class="slate-head overview-workspace-head">
      <div>
        <h1>Overview</h1>
        <p>${escapeHtml(selectedProject.title)} - ${escapeHtml(selectedProject.phase)} - ${selectedProject.progress}% complete</p>
      </div>
    </div>
  `;
}

function renderProjectWorkspaceHeader(projectCount: number, selectedProject: FilmProject): string {
  return `
    <div class="slate-head projects-workspace-head">
      <div>
        <h1>Projects</h1>
        <p>${projectCount} visible - ${state.workspace.archivedProjectCount} archived - selected ${escapeHtml(selectedProject.title)}</p>
      </div>
      <div class="view-controls" aria-label="View controls">
        <label class="search-box workspace-search-box">
          ${icon("search")}
          <input value="${escapeAttribute(state.ui.filter)}" data-action="filter" placeholder="Search project metadata" />
        </label>
        <span class="segmented-control project-surface-control" aria-label="Project view">
          <button data-project-surface="board" class="${state.ui.viewMode === "board" ? "is-active" : ""}" type="button">Board</button>
          <button data-project-surface="list" class="${state.ui.viewMode === "list" ? "is-active" : ""}" type="button">List</button>
        </span>
        <button type="button" data-action="export-project-directory">${icon("doc")} Export directory</button>
        <button type="button" data-action="create-project">${icon("plus")} Create project</button>
      </div>
    </div>
  `;
}

function renderProjectList(projects: FilmProject[], selectedId: string): string {
  return `
    <section class="panel project-table-panel" aria-labelledby="project-table-title">
      <h2 id="project-table-title" class="sr-only">Projects</h2>
      <div class="project-table" aria-label="Film projects" tabindex="0">
        <div class="project-row table-head">
          <span>Project</span>
          <span>Phase</span>
          <span>Progress</span>
          <span>Shoot Dates</span>
          <span>Budget</span>
          <span>Tasks</span>
        </div>
        ${
          projects.length
            ? projects.map((project) => renderProjectRow(project, selectedId)).join("")
            : `<div class="empty-inline">No projects match this search.</div>`
        }
      </div>
    </section>
  `;
}

function renderProjectRow(project: FilmProject, selectedId: string): string {
  const taskProgress = Math.round((project.tasks.done / project.tasks.total) * 100);

  return `
    <button class="project-row ${project.id === selectedId ? "is-selected" : ""}" data-project-id="${project.id}" type="button">
      <span class="project-title"><span class="status-dot ${project.color}"></span>${escapeHtml(project.title)}${project.starred ? icon("star") : ""}</span>
      <span><span class="phase-badge ${project.phaseTone}">${escapeHtml(project.phase)}</span></span>
      <span class="progress-cell"><span>${project.progress}%</span><span class="meter"><span style="width:${project.progress}%"></span></span></span>
      <span>${escapeHtml(project.shootDates)}</span>
      <span><strong>${formatCurrency(project.spentBudget)}</strong><small>of ${formatCurrency(project.totalBudget)}</small></span>
      <span class="progress-cell"><span>${project.tasks.done} / ${project.tasks.total}</span><span class="meter small"><span style="width:${taskProgress}%"></span></span></span>
    </button>
  `;
}

function renderProjectBoard(projects: FilmProject[], selectedId: string): string {
  return `
    <section class="board-grid" aria-label="Project board">
      ${projects
        .map(
          (project) => `
            <button class="project-card ${project.id === selectedId ? "is-selected" : ""}" data-project-id="${project.id}" type="button">
              <span class="project-card-head">
                <span class="status-dot ${project.color}"></span>
                <strong>${escapeHtml(project.title)}</strong>
                ${project.starred ? icon("star") : ""}
              </span>
              <span class="phase-badge ${project.phaseTone}">${escapeHtml(project.phase)}</span>
              <span class="meter"><span style="width:${project.progress}%"></span></span>
              <span class="card-meta">${project.progress}% - ${escapeHtml(project.shootDates)}</span>
            </button>
          `,
        )
        .join("")}
    </section>
  `;
}

function renderTimeline(project: FilmProject): string {
  return `
    <section class="panel timeline-panel" aria-labelledby="timeline-title">
      <div class="section-head">
        <div>
          <h2 id="timeline-title">${escapeHtml(project.title)}</h2>
          <p>Phase timeline</p>
        </div>
        <span class="today-marker">Today</span>
      </div>
      ${renderProjectTimeline(project)}
    </section>
  `;
}

function renderProjectTimeline(project: FilmProject): string {
  return `
    <div class="timeline">
      <div class="timeline-months">
        ${TIMELINE_MONTH_LABELS.map((month) => `<span>${month}</span>`).join("")}
      </div>
      <div class="timeline-lanes">
        ${project.timeline.map((item, index) => `
          <div class="timeline-bar ${item.tone}" style="left:${item.start}%; width:${item.width}%; top:${8 + index * 29}px">
            ${escapeHtml(item.label)}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderOperationsGrid(project: FilmProject): string {
  return `
    <section class="operations-grid">
      ${renderTaskPanel(project)}
      ${renderDocsPanel(project)}
      ${renderPeoplePanel(project)}
      ${renderEquipmentPanel(project)}
    </section>
  `;
}

function renderTaskPanel(project: FilmProject): string {
  return `
    <section class="panel compact-panel">
      <div class="section-head row">
        <h2>Tasks</h2>
        <button type="button" data-workspace-section="tasks">View all</button>
      </div>
      <ul class="line-list">
        ${project.openTasks
          .map(
            (task) => `
              <li>
                <span class="task-dot ${task.status}"></span>
                <span>${escapeHtml(task.title)}</span>
                <strong class="${task.status === "overdue" ? "danger" : ""}">${escapeHtml(task.due)}</strong>
              </li>
            `,
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderPeoplePanel(project: FilmProject): string {
  return `
    <section class="panel compact-panel">
      <div class="section-head row">
        <h2>People</h2>
        <button type="button" data-workspace-section="people">View all</button>
      </div>
      <ul class="line-list">
        ${project.people
          .map(
            (person) => `
              <li>
                <span class="file-token ${escapeAttribute(person.initials)}">${escapeHtml(person.initials)}</span>
                <span>${escapeHtml(person.name)}</span>
                <strong>${escapeHtml(person.role)}</strong>
              </li>
            `,
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderEquipmentPanel(project: FilmProject): string {
  return `
    <section class="panel compact-panel">
      <div class="section-head row">
        <h2>Equipment</h2>
        <button type="button" data-workspace-section="equipment">View all</button>
      </div>
      <ul class="line-list">
        ${project.equipment
          .map(
            (item) => `
              <li>
                <span class="file-token EQ">EQ</span>
                <span>${escapeHtml(item.name)}</span>
                <strong>${escapeHtml(item.status)}</strong>
              </li>
            `,
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderDocsPanel(project: FilmProject): string {
  const selectedDoc = project.docs.find((doc) => doc.id === state.ui.selectedDocId) ?? project.docs[0] ?? null;
  return `
    <section class="panel compact-panel">
      <div class="section-head row">
        <h2>Docs</h2>
        <button type="button" data-workspace-section="docs">View all</button>
      </div>
      <ul class="line-list">
        ${project.docs
          .map(
            (doc) => `
              <li>
                <button class="doc-row-button ${doc.id === selectedDoc?.id ? "is-selected" : ""}" type="button" data-open-doc="${escapeAttribute(doc.id)}">
                  <span class="file-token ${escapeAttribute(doc.type)}">${escapeHtml(doc.type)}</span>
                  <span>${escapeHtml(doc.name)}</span>
                  <strong>${escapeHtml(formatDocStatus(doc))}</strong>
                </button>
              </li>
            `,
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderDocumentEditor(doc: ProjectDoc): string {
  if (doc.type !== "MD") {
    return `
      <div class="doc-editor readonly">
        <strong>${escapeHtml(doc.name)}</strong>
        <small>${escapeHtml(formatDocStatus(doc))} - metadata only</small>
      </div>
    `;
  }

  return `
    <form class="doc-editor" data-action="doc-save" data-doc-id="${escapeAttribute(doc.id)}">
      <label>
        <span>${escapeHtml(doc.name)}</span>
        <textarea name="markdown" rows="7" spellcheck="true">${escapeHtml(doc.markdownSnapshot ?? "")}</textarea>
      </label>
      <div class="row">
        <small>${doc.markdownSnapshot ? `${doc.markdownSnapshot.length} chars` : "Empty Markdown draft"}</small>
        <button type="submit">${icon("check")} Save draft</button>
      </div>
    </form>
  `;
}

function renderRestorePreview(preview: RestorePreviewSummary): string {
  const changedRecords = preview.records.filter((record) => record.status === "changed").slice(0, 3);
  const newRecords = preview.records.filter((record) => record.status === "new").slice(0, 2);
  const visibleRecords = [...changedRecords, ...newRecords].slice(0, 4);

  return `
    <div class="restore-preview" role="status">
      <strong>Restore preview</strong>
      <span>${preview.incomingProjectCount} incoming projects - ${preview.currentProjectCount} current</span>
      <span>${preview.matchingProjectCount} matching projects - ${preview.newProjectCount} new projects</span>
      <span>${preview.changedRecordCount} changed records - ${preview.newRecordCount} new records - ${preview.fieldConflictCount} field conflicts</span>
      ${renderRestoreApplicationPlan(preview.applicationPlan)}
      ${
        preview.planningRecordCount > 0
          ? `<span>${preview.planningRecordCount} planning rows in encrypted backup - restore preview only</span>`
          : ""
      }
      ${
        preview.planningKindCounts.length
          ? `<span>Planning kind coverage: ${escapeHtml(formatPlanningKindCounts(preview.planningKindCounts))}</span>`
          : ""
      }
      ${
        preview.planningRecordCount > 0
          ? `<span>Planning table coverage: ${escapeHtml(formatPlanningTableCoverage(preview.planningTableCoverage))}</span>`
          : ""
      }
      ${
        preview.planningRecords.length
          ? `
            <ul class="restore-preview-records planning-preview-records">
              ${preview.planningRecords.slice(0, 3).map((record) => renderPlanningPreviewRecord(record)).join("")}
            </ul>
          `
          : ""
      }
      ${
        visibleRecords.length
          ? `
            <ul class="restore-preview-records">
              ${visibleRecords.map((record) => renderRestorePreviewRecord(record)).join("")}
            </ul>
          `
          : `<small>${escapeHtml(preview.firstProjectTitle)} has no record conflicts.</small>`
      }
      ${
        preview.warnings.length
          ? `<small>${escapeHtml(preview.warnings.join(" "))}</small>`
          : "<small>No restore warnings.</small>"
      }
    </div>
  `;
}

function renderRestorePlanningDryRun(preview: RestorePlanningDryRunState, records: BackupPlanningRecord[]): string {
  return `
    <div class="restore-preview" role="status">
      <strong>Planning restore preview</strong>
      <span>${preview.createPreviewCount} creates - ${preview.updatePreviewCount} updates - ${preview.idempotentCount} idempotent - ${preview.rejectedCount} rejected</span>
      <span>${preview.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(preview.commitPolicy.replaceAll("_", " "))}</span>
      ${
        preview.tableSummary.length
          ? `<span>Planning D1 tables: ${escapeHtml(formatRestorePlanningTableSummary(preview.tableSummary))}</span>`
          : ""
      }
      ${
        preview.updatePreviewDetails.length
          ? `<span>Planning update preview: ${escapeHtml(formatRestorePlanningUpdatePreview(preview.updatePreviewDetails))}</span>`
          : ""
      }
      ${
        preview.rejected.length
          ? `<span>Rejected records: ${escapeHtml(formatRestorePlanningRejected(preview.rejected))}</span>`
          : ""
      }
      ${renderRestorePlanningReviewTable(preview, records)}
      ${
        preview.planningPreviewId
          ? `<small>${escapeHtml(shortHash(preview.planningPreviewId))} - ${escapeHtml(preview.planningPreviewStatus.replaceAll("_", " "))}</small>`
          : ""
      }
      <small>${escapeHtml(preview.restoreMode.replaceAll("_", " "))} - ${escapeHtml(preview.persistence.replaceAll("_", " "))} - ${escapeHtml(preview.planningPreviewPersistence.replaceAll("_", " "))}${preview.auditPersistence ? ` - ${escapeHtml(preview.auditPersistence.replaceAll("_", " "))}` : ""}</small>
    </div>
  `;
}

function renderRestoreAttachmentPackageVerification(preview: RestoreAttachmentPackageVerificationState): string {
  return `
    <div class="restore-preview" role="status">
      <strong>Attachment package verification</strong>
      <span>${preview.packageManifest.objectCount} manifest objects - ${formatBytes(preview.packageManifest.totalSourceBytes)} source bytes</span>
      <span>${preview.canRestoreBytes ? "Byte restore ready" : "Byte restore blocked"} - ${escapeHtml(preview.attachmentPackageVerificationStatus.replaceAll("_", " "))}</span>
      <span>${preview.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(preview.commitPolicy.replaceAll("_", " "))}</span>
      <small>Package ${escapeHtml(preview.packageSha256.slice(0, 12))} - manifest ${escapeHtml(preview.manifestSha256.slice(0, 12))}</small>
      <small>${escapeHtml(preview.attachmentPackageVerificationPersistence.replaceAll("_", " "))}${preview.auditPersistence ? ` - ${escapeHtml(preview.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        preview.attachmentPackageVerificationId
          ? `<small>${escapeHtml(shortHash(preview.attachmentPackageVerificationId))}</small>`
          : ""
      }
      ${
        preview.blockers.length
          ? `<small>${escapeHtml(preview.blockers.slice(0, 2).join(" "))}</small>`
          : ""
      }
    </div>
  `;
}

function renderRestoreAttachmentObjectPlan(plan: RestoreAttachmentObjectPlanState): string {
  return `
    <div class="restore-preview" role="status">
      <strong>Attachment object plan</strong>
      <span>${plan.objectCount} objects - ${formatBytes(plan.totalSourceBytes)} source bytes - ${plan.blockedDestinationCount} destination writes blocked</span>
      <span>${plan.canRestoreBytes ? "Byte restore ready" : "Byte restore blocked"} - ${escapeHtml(plan.attachmentObjectPlanStatus.replaceAll("_", " "))}</span>
      <span>${plan.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(plan.commitPolicy.replaceAll("_", " "))}</span>
      <span>${escapeHtml(plan.destinationPolicy.replaceAll("_", " "))} - ${escapeHtml(plan.overwritePolicy.replaceAll("_", " "))}</span>
      <span>${escapeHtml(plan.byteSourcePolicy.replaceAll("_", " "))} - ${escapeHtml(plan.sourceVerificationStatus.replaceAll("_", " "))}</span>
      ${
        plan.objects.length
          ? `
            <ul class="restore-preview-records application-preview-records">
              ${plan.objects.slice(0, 4).map((object) => `
                <li>
                  <b>${escapeHtml(object.name)}</b>
                  <small>${escapeHtml(object.action.replaceAll("_", " "))} - ${formatBytes(object.sizeBytes)}</small>
                  <small>${escapeHtml(object.destinationStatus.replaceAll("_", " "))} - ${escapeHtml(object.overwriteStatus.replaceAll("_", " "))}</small>
                  <small>${escapeHtml(object.byteSourceStatus.replaceAll("_", " "))} - ${escapeHtml(object.sourceVerificationStatus.replaceAll("_", " "))}</small>
                </li>
              `).join("")}
            </ul>
          `
          : ""
      }
      <small>${escapeHtml(plan.attachmentObjectPlanPersistence.replaceAll("_", " "))}${plan.auditPersistence ? ` - ${escapeHtml(plan.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        plan.attachmentObjectPlanId
          ? `<small>${escapeHtml(shortHash(plan.attachmentObjectPlanId))}</small>`
          : ""
      }
      ${
        plan.blockers.length
          ? `<small>${escapeHtml(plan.blockers.slice(0, 2).join(" "))}</small>`
          : ""
      }
    </div>
  `;
}

function renderRestoreAttachmentObjectCommitPreflight(preflight: RestoreAttachmentObjectCommitPreflightState): string {
  return `
    <div class="restore-preview" role="status">
      <strong>Attachment commit preflight</strong>
      <span>${preflight.objectCount} objects - ${formatBytes(preflight.totalSourceBytes)} source bytes</span>
      <span>${preflight.readyDestinationCount} destinations ready - ${preflight.blockedDestinationCount} blocked</span>
      <span>${preflight.readyForByteCommit ? "Byte commit handoff ready" : "Byte commit handoff blocked"} - ${escapeHtml(preflight.attachmentObjectCommitPreflightStatus.replaceAll("_", " "))}</span>
      <span>${preflight.destructiveWrite ? "Destructive writes enabled" : "No destructive writes"} - ${escapeHtml(preflight.commitPolicy.replaceAll("_", " "))}</span>
      <span>${escapeHtml(preflight.destinationPolicy.replaceAll("_", " "))} - ${escapeHtml(preflight.overwritePolicy.replaceAll("_", " "))}</span>
      <span>${escapeHtml(preflight.byteSourcePolicy.replaceAll("_", " "))} - ${escapeHtml(preflight.sourceVerificationStatus.replaceAll("_", " "))}</span>
      ${
        preflight.objects.length
          ? `
            <ul class="restore-preview-records application-preview-records">
              ${preflight.objects.slice(0, 4).map((object) => `
                <li>
                  <b>${escapeHtml(object.name)}</b>
                  <small>${escapeHtml(object.action.replaceAll("_", " "))} - ${formatBytes(object.sizeBytes)}</small>
                  <small>${escapeHtml(object.destinationStatus.replaceAll("_", " "))} - ${escapeHtml(object.overwriteStatus.replaceAll("_", " "))}</small>
                  <small>${object.existingR2Object === null ? "R2 unchecked" : object.existingR2Object ? "R2 exists" : "R2 clear"} - ${object.existingStoredRecord ? "stored record exists" : "no stored record"}</small>
                  ${object.blocker ? `<small>${escapeHtml(object.blocker)}</small>` : ""}
                </li>
              `).join("")}
            </ul>
          `
          : ""
      }
      <small>${escapeHtml(preflight.attachmentObjectCommitPreflightPersistence.replaceAll("_", " "))}${preflight.auditPersistence ? ` - ${escapeHtml(preflight.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        preflight.attachmentObjectCommitPreflightId
          ? `<small>${escapeHtml(shortHash(preflight.attachmentObjectCommitPreflightId))}</small>`
          : ""
      }
      ${
        preflight.blockers.length
          ? `<small>${escapeHtml(preflight.blockers.slice(0, 2).join(" "))}</small>`
          : ""
      }
    </div>
  `;
}

function renderRestorePlanningReviewTable(preview: RestorePlanningDryRunState, records: BackupPlanningRecord[]): string {
  if (records.length === 0) return "";

  const tableByKind = new Map(preview.tableSummary.map((row) => [row.kind, row.tableName]));
  const createIds = new Set(preview.createPreview);
  const updateIds = new Set(preview.updatePreview);
  const idempotentIds = new Set(preview.idempotent);
  const rejectedByIndex = new Map(preview.rejected.map((item) => [item.index, item.reason]));
  return `
    <div class="planning-review" aria-label="Planning restore rows" tabindex="0">
      <div class="planning-review-row planning-review-head">
        <span>Action</span>
        <span>Kind</span>
        <span>Title</span>
        <span>Project</span>
        <span>Fields</span>
      </div>
      ${records.map((record, index) => {
        const rejectedReason = rejectedByIndex.get(index);
        const action = rejectedReason
          ? `rejected: ${rejectedReason.replaceAll("_", " ")}`
          : createIds.has(record.id)
            ? "create"
            : updateIds.has(record.id)
              ? "update"
              : idempotentIds.has(record.id)
                ? "idempotent"
                : "accepted";
        const fieldKeys = Object.keys(record.fields)
          .filter((key) => record.fields[key] !== null && record.fields[key] !== "")
          .slice(0, 4);
        return `
          <div class="planning-review-row">
            <span>${escapeHtml(action)}</span>
            <span>${escapeHtml((tableByKind.get(record.kind) ?? record.kind).replaceAll("_", " "))}</span>
            <span>${escapeHtml(record.title)}</span>
            <span>${escapeHtml(record.projectId ?? "workspace")}</span>
            <span>${escapeHtml(fieldKeys.length ? fieldKeys.join(", ") : "none")}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function formatPlanningKindCounts(counts: RestorePreviewSummary["planningKindCounts"]): string {
  return counts
    .slice(0, 6)
    .map((item) => `${item.count} ${item.kind.replaceAll("_", " ")}`)
    .join(", ");
}

function formatPlanningTableCoverage(coverage: RestorePreviewSummary["planningTableCoverage"]): string {
  return coverage
    .map((item) => `${item.tableName.replaceAll("_", " ")} ${item.recordCount}`)
    .join(", ");
}

function formatRestorePlanningTableSummary(summary: RestorePlanningTableSummary[]): string {
  return summary
    .slice(0, 5)
    .map((row) => {
      const table = row.tableName.replaceAll("_", " ");
      return `${table} ${row.createPreviewCount} create/${row.idempotentCount} same/${row.updatePreviewCount} update/${row.rejectedCount} rejected`;
    })
    .join(", ");
}

function formatRestorePlanningUpdatePreview(details: RestorePlanningPreviewDetail[]): string {
  return details
    .slice(0, 3)
    .map((detail) => {
      const firstChange = detail.fieldChanges[0];
      const field = firstChange ? ` - ${firstChange.field}` : "";
      return `${detail.tableName.replaceAll("_", " ")} ${detail.title} (${detail.fieldChangeCount} changes${field})`;
    })
    .join(", ");
}

function formatRestorePlanningCommitSummary(result: RestorePlanningCommitResult["result"]): string {
  return `${result.appliedCount} applied - ${result.skippedCount} skipped - ${result.createCount} creates - ${result.updateCount} updates`;
}

function formatRestorePlanningRejected(rejected: RestorePlanningDryRunResult["rejected"]): string {
  return rejected
    .slice(0, 3)
    .map((item) => `row ${item.index + 1} ${item.reason.replaceAll("_", " ")}`)
    .join(", ");
}

function renderRestoreApplicationPlan(plan: RestorePreviewSummary["applicationPlan"]): string {
  return `
    <span>${plan.updateRecordCount} updates planned - ${plan.createRecordCount} creates planned - ${plan.unchangedRecordCount} unchanged</span>
    <span>Application operations: ${plan.operationCount} total - ${escapeHtml(plan.operationPolicy.replaceAll("_", " "))}</span>
    <span>Application table plan: ${plan.tablePlan.length} tables</span>
    ${
      plan.attachmentPackagePlan.packageRequired
        ? `<span>Attachment restore package: ${plan.attachmentPackagePlan.metadataRecordCount} metadata records - ${formatBytes(plan.attachmentPackagePlan.totalSourceBytes)} source bytes - ${escapeHtml(plan.attachmentPackagePlan.byteRestoreSupport.replaceAll("_", " "))}</span>`
        : ""
    }
    <span>${plan.destructiveWrite ? "Destructive restore enabled" : "Restore application blocked"} - ${escapeHtml(plan.mode.replaceAll("_", " "))}</span>
    ${
      plan.tablePlan.length
        ? `
          <ul class="restore-preview-records application-preview-records">
            ${plan.tablePlan.slice(0, 4).map((table) => renderRestoreApplicationTablePlan(table)).join("")}
          </ul>
        `
        : ""
    }
    ${
      plan.operationSamples.length
        ? `
          <ul class="restore-preview-records application-preview-records">
            ${plan.operationSamples.slice(0, 4).map((operation) => renderRestoreApplicationOperation(operation)).join("")}
          </ul>
        `
        : ""
    }
    ${
      plan.blockers.length
        ? `<small>${escapeHtml(plan.blockers.slice(0, 3).join(" "))}</small>`
        : ""
    }
  `;
}

function renderRestoreApplicationTablePlan(table: RestorePreviewSummary["applicationPlan"]["tablePlan"][number]): string {
  const detail = `${table.operationCount} ops - ${table.createCount} creates - ${table.updateCount} updates - ${table.skipCount} skips${table.previewOnlyCount ? ` - ${table.previewOnlyCount} preview only` : ""}`;
  const blocker = table.blockers.length ? ` - ${table.blockers[0]}` : "";

  return `
    <li>
      <b>${escapeHtml(table.tableName.replaceAll("_", " "))}</b>
      <small>${escapeHtml(`${detail}${blocker}`)}</small>
    </li>
  `;
}

function renderRestoreApplicationOperation(operation: RestorePreviewSummary["applicationPlan"]["operationSamples"][number]): string {
  const fieldDetail = operation.fieldConflictCount > 0
    ? ` - ${operation.fieldConflictCount} field conflicts`
    : "";
  const blockerDetail = operation.blockers.length ? ` - ${operation.blockers[0]}` : "";
  const detail = `${operation.action} ${operation.status.replaceAll("_", " ")}${fieldDetail}${blockerDetail}`;

  return `
    <li>
      <b>${escapeHtml(operation.label)}</b>
      <small>${escapeHtml(detail)}</small>
    </li>
  `;
}

function renderProviderProductionPolicy(policy: NonNullable<ProviderDryRunStatus["productionReadPolicy"]>): string {
  return `
    <span>Live reads: ${escapeHtml(policy.mode.replaceAll("_", " "))} - ${escapeHtml(policy.dataBoundary.replaceAll("_", " "))}</span>
    <small>${policy.liveReadAllowed ? "Live reads allowed" : "Live reads blocked"} via ${escapeHtml(policy.source.replaceAll("_", " "))}</small>
    ${
      policy.blockers.length
        ? `<small>${escapeHtml(policy.blockers.slice(0, 2).join(" "))}</small>`
        : ""
    }
  `;
}

function renderPlanningPreviewRecord(record: RestorePreviewSummary["planningRecords"][number]): string {
  const fieldDetail = record.fieldKeys.length
    ? ` - ${record.fieldCount} fields: ${record.fieldKeys.join(", ")}`
    : " - 0 fields";
  const detail = `${record.kind.replaceAll("_", " ")}${record.sourcePath ? ` - ${record.sourcePath}` : ""}${fieldDetail}`;

  return `
    <li>
      <b>${escapeHtml(record.title)}</b>
      <small>${escapeHtml(detail)}</small>
    </li>
  `;
}

function renderRestorePreviewRecord(record: RestorePreviewSummary["records"][number]): string {
  const changeLabels = record.fieldChanges
    .slice(0, 2)
    .map((change) => `${change.field}: ${change.currentValue} -> ${change.incomingValue}`);
  const overflowCount = record.fieldChanges.length - changeLabels.length;
  const detail = record.status === "new"
    ? "New record in backup"
    : `${changeLabels.join("; ")}${overflowCount > 0 ? `; +${overflowCount} more` : ""}`;

  return `
    <li>
      <b>${escapeHtml(record.label)}</b>
      <small>${escapeHtml(detail)}</small>
    </li>
  `;
}

function renderBottomGrid(project: FilmProject): string {
  return `
    <section class="bottom-grid">
      <section class="panel expense-panel">
        <div class="section-head row">
          <h2>Expenses</h2>
          <button type="button" data-workspace-section="expenses">View all</button>
        </div>
        <div class="expense-table">
          ${project.expenses
            .map(
              (expense) => `
                <div>
                  <span>${escapeHtml(expenseCategoryLabel(expense))}</span>
                  <span>${formatCurrency(expense.spent)}</span>
                  <span>${formatCurrency(expense.budget)}</span>
                  <span>${expense.percent}%</span>
                  <span class="meter small"><span style="width:${expense.percent}%"></span></span>
                </div>
              `,
            )
            .join("")}
        </div>
      </section>
      <section class="panel call-sheet-panel">
        <div class="section-head row">
          <h2>Upcoming Call Sheet</h2>
        </div>
        <div class="call-sheet">
          <div class="call-date"><strong>${project.callSheet.day}</strong><span>${escapeHtml(project.callSheet.month)}</span></div>
          <div>
            <p><strong>Call:</strong> ${escapeHtml(project.callSheet.callTime)}</p>
            <p><strong>Wrap:</strong> ${escapeHtml(project.callSheet.wrapTime)}</p>
            <p>${escapeHtml(project.callSheet.location)}</p>
            <small>Day ${project.callSheet.dayNumber} of ${project.callSheet.totalDays}</small>
          </div>
          <div>
            <p>Scenes <strong>${project.callSheet.scenes}</strong></p>
            <p>People <strong>${project.callSheet.people}</strong></p>
            <p>Weather <strong>${escapeHtml(project.callSheet.weather)}</strong></p>
            <button class="secondary-button" type="button" data-workspace-section="call-sheets">${icon("doc")} Open Call Sheet</button>
          </div>
        </div>
      </section>
    </section>
  `;
}

function renderPlanningPanel(project: FilmProject): string {
  const projectRows = planningPanelRowsForProject(project);
  const kindCounts = planningKindCounts(projectRows);
  const totalImported = state.planningRows.length;
  const truncatedCount = state.planningRows.filter((record) => record.sourceTruncated).length;
  const d1Export = state.planningExportView;
  const sourceSummary = d1Export
    ? `${d1Export.rowCount} D1 rows - ${d1Export.truncated ? "truncated" : "complete"} - ${d1Export.persistence.replaceAll("_", " ")}`
    : `${totalImported} imported sample rows${truncatedCount ? ` - ${truncatedCount} capped imports` : ""}`;

  return `
    <section class="panel planning-panel" aria-labelledby="planning-panel-title">
      <div class="section-head row">
        <div>
          <h2 id="planning-panel-title">Planning</h2>
          <p>${projectRows.length} rows for this project - ${escapeHtml(sourceSummary)}</p>
        </div>
        <button type="button" data-workspace-section="planning">Review planning</button>
      </div>
      ${
        projectRows.length > 0 || totalImported > 0 || d1Export
          ? `
            <div class="planning-kind-strip" aria-label="Planning row coverage">
              ${kindCounts
                .map(
                  ([kind, count]) => `
                    <span>
                      <strong>${count}</strong>
                      ${escapeHtml(PLANNING_KIND_LABELS[kind])}
                    </span>
                  `,
                )
                .join("")}
            </div>
            ${
              d1Export
                ? `<small class="planning-source-note">D1 refreshed ${escapeHtml(formatShortDateTime(d1Export.checkedAt))}; local import samples remain in the operation log.</small>`
                : ""
            }
          `
          : `<div class="empty-inline">No planning rows imported.</div>`
      }
    </section>
  `;
}

function renderLocalPlanningRow(record: PlanningPanelRow): string {
  return `
    <div class="planning-table-row">
      <span>${escapeHtml(PLANNING_KIND_LABELS[record.kind])}</span>
      <span>${escapeHtml(record.title)}</span>
      <span>${escapeHtml(record.projectLabel)}</span>
      <span>${escapeHtml(planningFieldKeySummary(record.fields))}</span>
      <span title="${escapeAttribute(record.sourceLabel)}">${escapeHtml(record.sourcePath)}</span>
    </div>
  `;
}

function planningFieldKeySummary(fields: Record<string, unknown>): string {
  const fieldKeys = Object.keys(fields);
  return fieldKeys.length
    ? `${fieldKeys.slice(0, 4).join(", ")}${fieldKeys.length > 4 ? ` +${fieldKeys.length - 4}` : ""}`
    : "No fields";
}

function renderInviteDeliveryReadiness(readiness: InviteDeliveryState): string {
  const configuredCount = Object.values(readiness.configured).filter(Boolean).length;
  const status = readiness.status.replaceAll("_", " ");
  return `
    <div class="invite-preview" role="status">
      <strong>Invite delivery readiness</strong>
      <span>${escapeHtml(readiness.provider)} ${escapeHtml(readiness.channel)} - ${escapeHtml(status)}</span>
      <span>${configuredCount}/5 configured - ${readiness.dryRunOutboxAllowed ? "dry-run outbox ready" : "dry-run blocked"}</span>
      <small>${escapeHtml(readiness.persistence.replaceAll("_", " "))} - live delivery ${readiness.liveDeliveryAllowed ? "allowed" : "blocked"}</small>
      ${
        readiness.blockers.length
          ? `<small>${escapeHtml(readiness.blockers.slice(0, 2).join(" "))}</small>`
          : "<small>Configuration is ready for a future live adapter.</small>"
      }
      ${
        readiness.complianceNotes.length
          ? `<small>${escapeHtml(readiness.complianceNotes.slice(0, 1).join(" "))}</small>`
          : ""
      }
    </div>
  `;
}

function renderInviteManifest(manifest: InviteManifestState): string {
  return `
    <div class="invite-preview" role="status">
      <strong>Pending invites</strong>
      <span>${manifest.rowCount} pending - ${manifest.truncated ? "truncated" : "complete"} - ${escapeHtml(manifest.manifestPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml(manifest.persistence.replaceAll("_", " "))}${manifest.auditPersistence ? ` - ${escapeHtml(manifest.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        manifest.invites.length
          ? `
            <ul class="permission-manifest-list">
              ${manifest.invites.slice(0, 5).map((invite) => `
                <li>
                  <div>
                    <strong>${escapeHtml(shortHash(invite.emailHash))}</strong>
                    <span>${escapeHtml(formatWorkspaceRole(invite.role))}${invite.expiresAt ? ` - expires ${escapeHtml(invite.expiresAt.slice(0, 10))}` : ""}</span>
                  </div>
                  <button
                    class="text-action permission-revoke-button"
                    type="button"
                    data-action="invite-revoke"
                    data-invite-id="${escapeAttribute(invite.id)}"
                    ${state.inviteRevokingId === invite.id ? "disabled" : ""}
                  >
                    ${state.inviteRevokingId === invite.id ? "Revoking..." : "Revoke"}
                  </button>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No pending invites.</small>"
      }
    </div>
  `;
}

function renderInviteDeliverySuppressions(manifest: InviteDeliverySuppressionManifestState): string {
  return `
    <div class="invite-preview" role="status">
      <strong>Delivery suppressions</strong>
      <span>${manifest.rowCount} suppressions - ${manifest.truncated ? "truncated" : "complete"} - ${escapeHtml(manifest.manifestPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml(manifest.persistence.replaceAll("_", " "))}${manifest.auditPersistence ? ` - ${escapeHtml(manifest.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        manifest.suppressions.length
          ? `
            <ul class="permission-manifest-list">
              ${manifest.suppressions.slice(0, 5).map((suppression) => `
                <li>
                  <div>
                    <strong>${escapeHtml(shortHash(suppression.targetHash))}</strong>
                    <span>${escapeHtml(suppression.reason.replaceAll("_", " "))} - last ${escapeHtml(suppression.lastSeenAt.slice(0, 10))}</span>
                    <small>${escapeHtml([
                      suppression.deliveryAttemptId ? `attempt ${suppression.deliveryAttemptId}` : "",
                      suppression.providerMessageId ? `message ${suppression.providerMessageId}` : "",
                    ].filter(Boolean).join(" - ") || "No linked provider IDs")}</small>
                  </div>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No delivery suppressions.</small>"
      }
    </div>
  `;
}

function renderProjectMembershipManifest(manifest: ProjectMembershipManifestState): string {
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(manifest.targetLabel)} project team</strong>
      <span>${manifest.rowCount} assignments - ${manifest.truncated ? "truncated" : "complete"} - ${escapeHtml(manifest.manifestPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml(manifest.persistence.replaceAll("_", " "))}${manifest.auditPersistence ? ` - ${escapeHtml(manifest.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      <ul class="permission-manifest-list">
        ${manifest.memberships.slice(0, 5).map((membership) => {
          const revokeKey = projectMembershipRevokeKey(membership.projectId, membership.memberId, membership.role);
          return `
            <li>
              <div>
                <strong>${escapeHtml(memberDisplayName(membership.memberId))}</strong>
                <span>${escapeHtml(formatWorkspaceRole(membership.role))}${membership.department ? ` - ${escapeHtml(membership.department)}` : ""}</span>
              </div>
              <button
                class="text-action permission-revoke-button"
                type="button"
                data-action="project-membership-revoke"
                data-project-id="${escapeAttribute(membership.projectId)}"
                data-member-id="${escapeAttribute(membership.memberId)}"
                data-role="${escapeAttribute(membership.role)}"
                ${state.projectMembershipRevokingKey === revokeKey ? "disabled" : ""}
              >
                ${state.projectMembershipRevokingKey === revokeKey ? "Removing..." : "Remove"}
              </button>
            </li>
          `;
        }).join("")}
      </ul>
    </div>
  `;
}

function renderProjectMembershipHistory(history: ProjectMembershipHistoryState): string {
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(history.targetLabel)} project team history</strong>
      <span>${history.rowCount} events - ${history.truncated ? "truncated" : "complete"} - ${escapeHtml(history.historyPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml(history.persistence.replaceAll("_", " "))}${history.auditPersistence ? ` - ${escapeHtml(history.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        history.entries.length
          ? `
            <ul class="permission-manifest-list">
              ${history.entries.slice(0, 5).map((entry) => `
                <li>
                  <div>
                    <strong>${escapeHtml(memberDisplayName(entry.memberId))}</strong>
                    <span>${escapeHtml(entry.action === "project_membership.revoked" ? "Removed" : "Assigned")} ${escapeHtml(formatWorkspaceRole(entry.role))}${entry.department ? ` - ${escapeHtml(entry.department)}` : ""}</span>
                    <small>${escapeHtml(formatShortDateTime(entry.createdAt))}${entry.actorMemberId ? ` - by ${escapeHtml(memberDisplayName(entry.actorMemberId))}` : ""}</small>
                  </div>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No project team changes recorded for this project.</small>"
      }
    </div>
  `;
}

function teamAssignmentFor(projectId: string, member: WorkspaceData["members"][number]): { role: WorkspaceRole; department: string } {
  const recentAssignment = state.assignment.assignedProjectId === projectId
    && state.assignment.assignedMemberId === member.id
    && state.assignment.assignedRole
    ? { role: state.assignment.assignedRole, department: state.assignment.department }
    : null;
  if (recentAssignment) return recentAssignment;

  const savedAssignment = state.projectMembershipManifest?.projectId === projectId
    ? state.projectMembershipManifest.memberships.find((membership) => membership.memberId === member.id) ?? null
    : null;
  return {
    role: savedAssignment?.role ?? member.role,
    department: savedAssignment?.department ?? "",
  };
}

function renderTeamEditGate(): string {
  if (state.auth.session?.role === "owner" || state.auth.session?.role === "producer") return "";
  const signedIn = Boolean(state.auth.session);
  return `
    <div class="team-edit-gate" role="note">
      <div>
        <strong>${signedIn ? "Owner or producer access required" : "Sign in to edit the team"}</strong>
        <small>${signedIn ? "Your current session can view this roster but cannot change access." : "Team roles and member status are protected workspace changes."}</small>
      </div>
      ${signedIn ? "" : `<button class="secondary-button" type="button" data-action="auth-open">Sign in</button>`}
    </div>
  `;
}

function renderTeamMemberRow(
  project: FilmProject,
  member: WorkspaceData["members"][number],
  canManageTeam: boolean,
  isUpdatingMemberStatus: boolean,
  isAssigningMember: boolean,
): string {
  const assignment = teamAssignmentFor(project.id, member);
  const roleOptions = Array.from(new Set<WorkspaceRole>([member.role, ...INVITE_ROLES]));
  const canEditStatus = canManageTeam && member.status !== "invited";
  const canEditAssignment = canManageTeam && member.status === "active";

  return `
    <li class="team-member-row">
      <span class="avatar">${escapeHtml(initialsFor(member.displayName))}</span>
      <div class="team-member-identity">
        <strong>${escapeHtml(member.displayName)}</strong>
        ${
          canEditStatus
            ? `
              <form data-action="member-status-update" class="team-status-form">
                <input type="hidden" name="memberId" value="${escapeAttribute(member.id)}" />
                <input type="hidden" name="status" value="${member.status === "active" ? "disabled" : "active"}" />
                <button
                  type="submit"
                  class="inline-status-button is-${member.status}"
                  title="${member.status === "active" ? "Disable" : "Reactivate"} ${escapeAttribute(member.displayName)}"
                  ${isUpdatingMemberStatus ? "disabled" : ""}
                >${escapeHtml(formatWorkspaceMemberStatus(member.status))}</button>
              </form>
            `
            : `<small class="team-member-status">${escapeHtml(formatWorkspaceMemberStatus(member.status))}</small>`
        }
      </div>
      ${
        canEditAssignment
          ? `
            <form class="team-role-form" data-action="membership-assign">
              <input type="hidden" name="memberId" value="${escapeAttribute(member.id)}" />
              <label class="contextual-field">
                <span class="sr-only">Project role for ${escapeHtml(member.displayName)}</span>
                <select name="role" data-contextual-autosave aria-label="Project role for ${escapeAttribute(member.displayName)}" ${isAssigningMember ? "disabled" : ""}>
                  ${roleOptions.map((candidateRole) => `
                    <option value="${candidateRole}" ${assignment.role === candidateRole ? "selected" : ""}>${escapeHtml(formatWorkspaceRole(candidateRole))}</option>
                  `).join("")}
                </select>
              </label>
              <label class="contextual-field team-department-field">
                <span class="sr-only">Department for ${escapeHtml(member.displayName)}</span>
                <input name="department" value="${escapeAttribute(assignment.department)}" placeholder="Department" autocomplete="off" ${isAssigningMember ? "disabled" : ""} />
              </label>
              ${renderInlineSaveButton(`Save ${member.displayName} assignment`, isAssigningMember)}
            </form>
          `
          : `<strong class="team-member-role">${escapeHtml(formatWorkspaceRole(assignment.role))}</strong>`
      }
    </li>
  `;
}

function renderRecordPermissionManifest(manifest: RecordPermissionManifestState): string {
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(manifest.targetLabel)} permissions</strong>
      <span>${manifest.rowCount} grants - ${manifest.truncated ? "truncated" : "complete"} - ${escapeHtml(manifest.manifestPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml(manifest.persistence.replaceAll("_", " "))}${manifest.auditPersistence ? ` - ${escapeHtml(manifest.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      <ul class="permission-manifest-list">
        ${manifest.permissions.slice(0, 5).map((permission) => `
          <li>
            <div>
              <strong>${escapeHtml(permission.memberId)}</strong>
              <span>${escapeHtml(formatRecordPermissionLevel(permission.permission))}${permission.department ? ` - ${escapeHtml(permission.department)}` : ""}${permission.expiresAt ? ` - expires ${escapeHtml(permission.expiresAt)}` : ""}</span>
            </div>
            <button
              class="text-action permission-revoke-button"
              type="button"
              data-action="record-permission-revoke"
              data-permission-id="${escapeAttribute(permission.id)}"
              ${state.recordPermissionRevokingId === permission.id ? "disabled" : ""}
            >
              ${state.recordPermissionRevokingId === permission.id ? "Revoking..." : "Revoke"}
            </button>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

function renderRecordPermissionHistory(history: RecordPermissionHistoryState): string {
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(history.targetLabel)} permission history</strong>
      <span>${history.rowCount} events - ${history.truncated ? "truncated" : "complete"} - ${escapeHtml(history.historyPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml(history.persistence.replaceAll("_", " "))}${history.auditPersistence ? ` - ${escapeHtml(history.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        history.entries.length
          ? `
            <ul class="permission-manifest-list">
              ${history.entries.slice(0, 5).map((entry) => `
                <li>
                  <div>
                    <strong>${escapeHtml(memberDisplayName(entry.memberId))}</strong>
                    <span>${escapeHtml(entry.action === "record_permission.revoked" ? "Revoked" : "Granted")} ${escapeHtml(formatRecordPermissionLevel(entry.permission))}${entry.department ? ` - ${escapeHtml(entry.department)}` : ""}${entry.expiresAt ? ` - expires ${escapeHtml(entry.expiresAt)}` : ""}</span>
                    <small>${escapeHtml(formatShortDateTime(entry.createdAt))}${entry.actorMemberId ? ` - by ${escapeHtml(memberDisplayName(entry.actorMemberId))}` : ""}</small>
                  </div>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No permission changes recorded for this row.</small>"
      }
    </div>
  `;
}

function renderRecordOwnerHistory(history: OwnerHistoryState): string {
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(history.targetLabel)} owner history</strong>
      <span>${history.rowCount} transfers - ${history.truncated ? "truncated" : "complete"} - ${escapeHtml(history.historyPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml(history.persistence.replaceAll("_", " "))}${history.auditPersistence ? ` - ${escapeHtml(history.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        history.entries.length
          ? `
            <ul class="permission-manifest-list">
              ${history.entries.slice(0, 5).map((entry) => `
                <li>
                  <div>
                    <strong>${escapeHtml(memberDisplayName(entry.ownerMemberId))}</strong>
                    <span>${entry.previousOwnerMemberId ? `previous ${escapeHtml(memberDisplayName(entry.previousOwnerMemberId))} - ` : ""}${escapeHtml(formatShortDateTime(entry.createdAt))}</span>
                  </div>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No owner transfers recorded for this row.</small>"
      }
    </div>
  `;
}

function renderRecordMutationPreflight(preflight: RecordMutationState): string {
  if (!preflight.preflight || !preflight.targetLabel || !preflight.mutationPolicy) return "";
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(preflight.targetLabel)} ${escapeHtml(preflight.preflight.mutation)} preflight</strong>
      <span>Allowed by ${escapeHtml(preflight.preflight.allowedBy.replaceAll("_", " "))} - ${escapeHtml(preflight.mutationPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml((preflight.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${preflight.auditPersistence ? ` - ${escapeHtml(preflight.auditPersistence.replaceAll("_", " "))}` : ""}</small>
    </div>
  `;
}

function renderRecordMutationRequest(requestState: RecordMutationRequestState): string {
  if (!requestState.request || !requestState.targetLabel || !requestState.requestPolicy) return "";
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(requestState.targetLabel)} mutation requested</strong>
      <span>${escapeHtml(requestState.request.mutation)} - ${escapeHtml(requestState.request.status.replaceAll("_", " "))} - no destructive write</span>
      <small>${escapeHtml((requestState.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${requestState.auditPersistence ? ` - ${escapeHtml(requestState.auditPersistence.replaceAll("_", " "))}` : ""} - ${escapeHtml(requestState.request.summarySha256.slice(0, 8))}${requestState.request.expectedUpdatedAt ? ` - ${escapeHtml(formatShortDateTime(requestState.request.expectedUpdatedAt))}` : ""}</small>
    </div>
  `;
}

function renderRecordMutationRequestManifest(manifest: RecordMutationRequestManifestState): string {
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(manifest.targetLabel)} mutation requests</strong>
      <span>${manifest.rowCount} requests - ${manifest.truncated ? "truncated" : "complete"} - ${escapeHtml(manifest.manifestPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml(manifest.persistence.replaceAll("_", " "))}${manifest.auditPersistence ? ` - ${escapeHtml(manifest.auditPersistence.replaceAll("_", " "))}` : ""} - no destructive writes</small>
      ${
        manifest.requests.length
          ? `
            <ul class="permission-manifest-list">
              ${manifest.requests.slice(0, 5).map((request) => `
                <li>
                  <div>
                    <strong>${escapeHtml(request.actorMemberId ? memberDisplayName(request.actorMemberId) : "Unknown actor")}</strong>
                    <span>${escapeHtml(request.mutation)} - ${escapeHtml(request.status.replaceAll("_", " "))} - ${escapeHtml(request.allowedBy.replaceAll("_", " "))}${request.fieldKeys.length ? ` - ${escapeHtml(request.fieldKeys.join(", "))}` : ""}</span>
                    <small>${escapeHtml(request.id)} - ${escapeHtml(formatShortDateTime(request.createdAt))} - ${escapeHtml(request.summarySha256.slice(0, 8))}</small>
                  </div>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No mutation requests recorded for this row.</small>"
      }
    </div>
  `;
}

function renderRecordMutationResolution(resolution: RecordMutationResolutionState): string {
  if (!resolution.request || !resolution.resolutionPolicy || !resolution.targetLabel) return "";
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(resolution.targetLabel)} mutation resolved</strong>
      <span>${escapeHtml(resolution.request.status.replaceAll("_", " "))} - no destructive write</span>
      <small>${escapeHtml((resolution.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${resolution.auditPersistence ? ` - ${escapeHtml(resolution.auditPersistence.replaceAll("_", " "))}` : ""}</small>
    </div>
  `;
}

function renderRecordMutationDiffPreview(diffState: RecordMutationDiffState): string {
  if (!diffState.request || !diffState.diffPolicy || !diffState.targetLabel || !diffState.rollbackGuidance) return "";
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(diffState.targetLabel)} mutation diff</strong>
      <span>${diffState.fieldDiffs.length} fields - ${diffState.stale ? "stale target" : "fresh target"} - no destructive write</span>
      <small>${escapeHtml((diffState.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${diffState.auditPersistence ? ` - ${escapeHtml(diffState.auditPersistence.replaceAll("_", " "))}` : ""} - ${escapeHtml(diffState.diffPolicy.replaceAll("_", " "))}</small>
      ${
        diffState.fieldDiffs.length
          ? `
            <ul class="permission-manifest-list">
              ${diffState.fieldDiffs.slice(0, 6).map((field) => `
                <li>
                  <div>
                    <strong>${escapeHtml(field.key)}</strong>
                    <span>${escapeHtml(formatRecordMutationFieldValue(field.before))} -> ${escapeHtml(formatRecordMutationFieldValue(field.after))}</span>
                    <small>${field.changed ? "changed" : "unchanged"} - ${escapeHtml(diffState.rollbackGuidance?.strategy.replaceAll("_", " ") ?? "rollback review")}</small>
                  </div>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No field differences returned for this request.</small>"
      }
    </div>
  `;
}

function renderRecordMutationApply(applyState: RecordMutationApplyState): string {
  if (!applyState.request || !applyState.application || !applyState.applicationPolicy || !applyState.targetLabel) return "";
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(applyState.targetLabel)} mutation applied</strong>
      <span>${escapeHtml(applyState.application.action)} - ${applyState.application.fieldKeys.length ? escapeHtml(applyState.application.fieldKeys.join(", ")) : "record removed"} - destructive write</span>
      <small>${escapeHtml((applyState.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${applyState.auditPersistence ? ` - ${escapeHtml(applyState.auditPersistence.replaceAll("_", " "))}` : ""}${applyState.application.updatedAt ? ` - ${escapeHtml(formatShortDateTime(applyState.application.updatedAt))}` : ""}${applyState.application.deletedAt ? ` - ${escapeHtml(formatShortDateTime(applyState.application.deletedAt))}` : ""}</small>
    </div>
  `;
}

function renderFilmProfileMutationRequest(requestState: FilmProfileMutationRequestState): string {
  if (!requestState.request || !requestState.requestPolicy || !requestState.targetLabel) return "";
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(requestState.targetLabel)} profile review requested</strong>
      <span>${escapeHtml(requestState.request.status.replaceAll("_", " "))} - ${escapeHtml(requestState.request.allowedBy.replaceAll("_", " "))}</span>
      <small>${escapeHtml((requestState.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${requestState.auditPersistence ? ` - ${escapeHtml(requestState.auditPersistence.replaceAll("_", " "))}` : ""} - ${escapeHtml(requestState.requestPolicy.replaceAll("_", " "))}</small>
    </div>
  `;
}

function renderFilmProfileMutationRequestManifest(manifest: FilmProfileMutationRequestManifestState): string {
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(manifest.targetLabel)} profile requests</strong>
      <span>${manifest.rowCount} requests - ${manifest.truncated ? "truncated" : "complete"} - ${escapeHtml(manifest.manifestPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml(manifest.persistence.replaceAll("_", " "))}${manifest.auditPersistence ? ` - ${escapeHtml(manifest.auditPersistence.replaceAll("_", " "))}` : ""} - no destructive writes</small>
      ${
        manifest.requests.length
          ? `
            <ul class="permission-manifest-list">
              ${manifest.requests.slice(0, 5).map((request) => `
                <li>
                  <div>
                    <strong>${escapeHtml(request.actorMemberId ? memberDisplayName(request.actorMemberId) : "Unknown actor")}</strong>
                    <span>${escapeHtml(request.status.replaceAll("_", " "))} - ${escapeHtml(request.allowedBy.replaceAll("_", " "))}${request.fieldKeys.length ? ` - ${escapeHtml(request.fieldKeys.join(", "))}` : ""}</span>
                    <small>${escapeHtml(request.id)} - ${escapeHtml(formatShortDateTime(request.createdAt))} - ${escapeHtml(request.summarySha256.slice(0, 8))}</small>
                  </div>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No profile mutation requests recorded for this project.</small>"
      }
    </div>
  `;
}

function renderFilmProfileMutationResolution(resolution: FilmProfileMutationResolutionState): string {
  if (!resolution.request || !resolution.resolutionPolicy || !resolution.targetLabel) return "";
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(resolution.targetLabel)} profile mutation resolved</strong>
      <span>${escapeHtml(resolution.request.status.replaceAll("_", " "))} - no destructive write</span>
      <small>${escapeHtml((resolution.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${resolution.auditPersistence ? ` - ${escapeHtml(resolution.auditPersistence.replaceAll("_", " "))}` : ""}</small>
    </div>
  `;
}

function renderFilmProfileMutationDiffPreview(diffState: FilmProfileMutationDiffState): string {
  if (!diffState.request || !diffState.diffPolicy || !diffState.targetLabel || !diffState.rollbackGuidance) return "";
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(diffState.targetLabel)} profile mutation diff</strong>
      <span>${diffState.fieldDiffs.length} fields - ${diffState.stale ? "stale profile" : "fresh profile"} - no destructive write</span>
      <small>${escapeHtml((diffState.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${diffState.auditPersistence ? ` - ${escapeHtml(diffState.auditPersistence.replaceAll("_", " "))}` : ""} - ${escapeHtml(diffState.diffPolicy.replaceAll("_", " "))}</small>
      ${
        diffState.fieldDiffs.length
          ? `
            <ul class="permission-manifest-list">
              ${diffState.fieldDiffs.slice(0, 6).map((field) => `
                <li>
                  <div>
                    <strong>${escapeHtml(field.key)}</strong>
                    <span>${escapeHtml(formatRecordMutationFieldValue(field.before))} -> ${escapeHtml(formatRecordMutationFieldValue(field.after))}</span>
                    <small>${field.changed ? "changed" : "unchanged"} - ${escapeHtml(diffState.rollbackGuidance?.strategy.replaceAll("_", " ") ?? "rollback review")}</small>
                  </div>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No profile field differences returned for this request.</small>"
      }
    </div>
  `;
}

function renderFilmProfileMutationApply(applyState: FilmProfileMutationApplyState): string {
  if (!applyState.request || !applyState.application || !applyState.applicationPolicy || !applyState.targetLabel) return "";
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(applyState.targetLabel)} profile mutation applied</strong>
      <span>${escapeHtml(applyState.application.action)} - ${escapeHtml(applyState.application.fieldKeys.join(", "))} - destructive write</span>
      <small>${escapeHtml((applyState.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${applyState.auditPersistence ? ` - ${escapeHtml(applyState.auditPersistence.replaceAll("_", " "))}` : ""}${applyState.application.updatedAt ? ` - ${escapeHtml(formatShortDateTime(applyState.application.updatedAt))}` : ""}</small>
    </div>
  `;
}

function renderRecordMutationAuditManifest(manifest: RecordMutationAuditManifestState): string {
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(manifest.targetLabel)} mutation audit</strong>
      <span>${manifest.rowCount} events - ${manifest.truncated ? "truncated" : "complete"} - ${escapeHtml(manifest.metadataPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml(manifest.persistence.replaceAll("_", " "))}${manifest.auditPersistence ? ` - ${escapeHtml(manifest.auditPersistence.replaceAll("_", " "))}` : ""} - ${escapeHtml(manifest.rollbackGuidance.strategy.replaceAll("_", " "))}</small>
      ${
        manifest.events.length
          ? `
            <ul class="permission-manifest-list">
              ${manifest.events.slice(0, 6).map((event) => `
                <li>
                  <div>
                    <strong>${escapeHtml(event.action.replaceAll("_", " "))}</strong>
                    <span>${escapeHtml(event.actorMemberId ? memberDisplayName(event.actorMemberId) : "Unknown actor")} - ${escapeHtml(formatShortDateTime(event.createdAt))}</span>
                    <small>${escapeHtml(event.metadataKeys.slice(0, 6).join(", "))}${event.metadataKeyCount > 6 ? " ..." : ""}</small>
                  </div>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No audit events returned for this mutation request.</small>"
      }
    </div>
  `;
}

function renderRecordMutationRollback(rollback: RecordMutationRollbackState): string {
  if (!rollback.request || !rollback.sourceRequest || !rollback.rollbackPolicy || !rollback.targetLabel) return "";
  const suggestedEntries = Object.entries(rollback.suggestedUpdates);
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(rollback.targetLabel)} rollback requested</strong>
      <span>${escapeHtml(rollback.request.status.replaceAll("_", " "))} - ${escapeHtml(rollback.rollbackPolicy.replaceAll("_", " "))} - no destructive write</span>
      <small>${escapeHtml((rollback.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${rollback.auditPersistence ? ` - ${escapeHtml(rollback.auditPersistence.replaceAll("_", " "))}` : ""} - source ${escapeHtml(rollback.sourceRequest.id)}</small>
      ${
        suggestedEntries.length
          ? `
            <ul class="permission-manifest-list">
              ${suggestedEntries.slice(0, 6).map(([key, value]) => `
                <li>
                  <div>
                    <strong>${escapeHtml(key)}</strong>
                    <span>${escapeHtml(formatRecordMutationFieldValue(value))}</span>
                    <small>suggested inverse value</small>
                  </div>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No suggested rollback updates returned.</small>"
      }
    </div>
  `;
}

function renderRecordMutationDeleteRecovery(recovery: RecordMutationDeleteRecoveryState): string {
  if (!recovery.sourceRequest || !recovery.recoveryPlan || !recovery.recoveryPolicy || !recovery.targetLabel) return "";
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(recovery.targetLabel)} delete recovery</strong>
      <span>${escapeHtml(recovery.recoveryPlan.strategy.replaceAll("_", " "))} - no destructive write</span>
      <small>${escapeHtml((recovery.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${recovery.auditPersistence ? ` - ${escapeHtml(recovery.auditPersistence.replaceAll("_", " "))}` : ""} - ${escapeHtml(recovery.recoveryPolicy.replaceAll("_", " "))}</small>
      <ul class="permission-manifest-list">
        ${recovery.recoveryPlan.suggestedSteps.slice(0, 4).map((step) => `
          <li>
            <div>
              <strong>${escapeHtml(recovery.recoveryPlan?.entityType ?? "record")}</strong>
              <span>${escapeHtml(step)}</span>
              <small>${escapeHtml(recovery.recoveryPlan?.blockers[0] ?? "backup or recreate required")}</small>
            </div>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

function renderRecordMutationFieldSelector(
  entityType: CoreRecordOwnerEntityType,
  mutation: RecordMutationKind,
  disabled: boolean,
): string {
  if (mutation === "delete") {
    return `<small class="mutation-form-note">Delete requests target the full selected row.</small>`;
  }

  const fields = getRecordMutationFieldDefinitions(entityType);
  return `
    <div class="mutation-field-grid" role="group" aria-label="Update fields">
      <strong class="mutation-form-label">Fields to change</strong>
      ${fields.map((field) => `
        <label class="mutation-field-option">
          <input
            type="checkbox"
            name="fieldKeys"
            value="${escapeAttribute(field.key)}"
            ${disabled ? "disabled" : ""}
          />
          <span>
            <strong>${escapeHtml(field.label)}</strong>
            <small>${escapeHtml(field.key)} - ${escapeHtml(formatRecordMutationInputKind(field))}</small>
          </span>
        </label>
      `).join("")}
    </div>
  `;
}

function renderFilmProfileMutationFieldSelector(disabled: boolean): string {
  const fields = getFilmProfileMutationFieldDefinitions();
  return `
    <div class="mutation-field-grid" role="group" aria-label="Film profile update fields">
      <strong class="mutation-form-label">Fields to change</strong>
      ${fields.map((field) => `
        <label class="mutation-field-option">
          <input
            type="checkbox"
            name="fieldKeys"
            value="${escapeAttribute(field.key)}"
            ${disabled ? "disabled" : ""}
          />
          <span>
            <strong>${escapeHtml(field.label)}</strong>
            <small>${escapeHtml(field.key)} - ${escapeHtml(formatRecordMutationInputKind(field))}</small>
          </span>
        </label>
      `).join("")}
    </div>
  `;
}

function renderRecordMutationUpdateControls(
  request: RecordMutationRequestResult["request"] | null,
  disabled: boolean,
  selectedProject: FilmProject,
): string {
  if (!request) {
    return `<small class="mutation-form-note">Select an approved request.</small>`;
  }
  if (request.mutation === "delete") {
    return `<small class="mutation-form-note">Delete requests do not use update values.</small>`;
  }

  const requestedKeys = new Set(request.fieldKeys);
  const fields = getRecordMutationFieldDefinitions(request.entityType).filter((field) => requestedKeys.has(field.key));
  if (fields.length === 0) {
    return `<small class="mutation-form-note">Approved request has no mutable fields.</small>`;
  }

  return `
    <div class="mutation-value-grid" role="group" aria-label="Update values">
      ${fields.map((field) => `
        <label class="mutation-value-row">
          <span>
            <strong>${escapeHtml(field.label)}</strong>
            <small>${escapeHtml(field.key)}${field.nullable ? " - blank clears" : ""}</small>
          </span>
          ${renderRecordMutationValueInput(field, disabled, recordMutationDefaultValue(request, field, selectedProject))}
        </label>
      `).join("")}
    </div>
  `;
}

function renderFilmProfileMutationUpdateControls(
  request: FilmProfileMutationRequestResult["request"] | null,
  disabled: boolean,
  selectedProject: FilmProject,
): string {
  if (!request) {
    return `<small class="mutation-form-note">Select an approved profile request.</small>`;
  }

  const requestedKeys = new Set(request.fieldKeys);
  const fields = getFilmProfileMutationFieldDefinitions().filter((field) => requestedKeys.has(field.key));
  if (fields.length === 0) {
    return `<small class="mutation-form-note">Approved profile request has no mutable fields.</small>`;
  }

  return `
    <div class="mutation-value-grid" role="group" aria-label="Film profile update values">
      ${fields.map((field) => `
        <label class="mutation-value-row">
          <span>
            <strong>${escapeHtml(field.label)}</strong>
            <small>${escapeHtml(field.key)}${field.nullable ? " - blank clears" : ""}</small>
          </span>
          ${renderRecordMutationValueInput(field, disabled, filmProfileMutationDefaultValue(field, selectedProject))}
        </label>
      `).join("")}
    </div>
  `;
}

function renderRecordMutationValueInput(
  field: RecordMutationFieldDefinition,
  disabled: boolean,
  defaultValue: string | number | boolean | null | string[] | undefined,
): string {
  const relationshipInput = renderRecordMutationRelationshipInput(field, disabled, defaultValue);
  if (relationshipInput) return relationshipInput;

  const name = `update:${field.key}`;
  const disabledAttribute = disabled ? "disabled" : "";
  const inputValue = recordMutationInputValue(defaultValue);
  if (field.input === "textarea") {
    return `
      <textarea
        name="${escapeAttribute(name)}"
        rows="2"
        maxlength="${field.maxLength ?? 500}"
        placeholder="${escapeAttribute(field.placeholder ?? field.label)}"
        ${disabledAttribute}
      >${escapeHtml(inputValue)}</textarea>
    `;
  }
  if (field.input === "select" && field.options?.length) {
    return `
      <select name="${escapeAttribute(name)}" ${disabledAttribute}>
        ${field.nullable ? `<option value="" ${inputValue === "" ? "selected" : ""}>Clear</option>` : ""}
        ${field.options.map((option) => `<option value="${escapeAttribute(option)}" ${inputValue === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    `;
  }
  if (field.input === "boolean") {
    return `
      <select name="${escapeAttribute(name)}" ${disabledAttribute}>
        <option value="false" ${inputValue !== "true" ? "selected" : ""}>False</option>
        <option value="true" ${inputValue === "true" ? "selected" : ""}>True</option>
      </select>
    `;
  }
  if (field.input === "number") {
    return `
      <input
        type="number"
        name="${escapeAttribute(name)}"
        value="${escapeAttribute(inputValue)}"
        min="${field.min ?? 0}"
        max="${field.max ?? 100000000000}"
        step="1"
        placeholder="${escapeAttribute(field.placeholder ?? field.label)}"
        ${disabledAttribute}
      />
    `;
  }
  return `
    <input
      name="${escapeAttribute(name)}"
      value="${escapeAttribute(inputValue)}"
      placeholder="${escapeAttribute(field.placeholder ?? field.label)}"
      autocomplete="off"
      ${field.maxLength ? `maxlength="${field.maxLength}"` : ""}
      ${disabledAttribute}
    />
  `;
}

function renderRecordMutationRelationshipInput(
  field: RecordMutationFieldDefinition,
  disabled: boolean,
  defaultValue: string | number | boolean | null | string[] | undefined,
): string | null {
  const disabledAttribute = disabled ? "disabled" : "";
  const name = `update:${field.key}`;
  const selectedValue = recordMutationInputValue(defaultValue);
  if (field.key === "projectId") {
    return `
      <select name="${escapeAttribute(name)}" ${disabledAttribute}>
        ${field.nullable ? `<option value="" ${selectedValue === "" ? "selected" : ""}>Clear</option>` : ""}
        ${state.workspace.projects.map((project) => `
          <option value="${escapeAttribute(project.id)}" ${selectedValue === project.id ? "selected" : ""}>
            ${escapeHtml(project.title)}
          </option>
        `).join("")}
      </select>
    `;
  }
  if (field.key === "assigneeMemberId") {
    const activeMembers = state.workspace.members.filter((member) => member.status === "active");
    return `
      <select name="${escapeAttribute(name)}" ${disabledAttribute}>
        ${field.nullable ? `<option value="" ${selectedValue === "" ? "selected" : ""}>Clear</option>` : ""}
        ${activeMembers.map((member) => `
          <option value="${escapeAttribute(member.id)}" ${selectedValue === member.id ? "selected" : ""}>
            ${escapeHtml(member.displayName)}
          </option>
        `).join("")}
      </select>
    `;
  }
  if (field.input !== "id") return null;
  return null;
}

function recordMutationDefaultValue(
  request: RecordMutationRequestResult["request"],
  field: RecordMutationFieldDefinition,
  selectedProject: FilmProject,
): string | number | boolean | null | string[] | undefined {
  const project = request.entityType === "project"
    ? state.workspace.projects.find((candidate) => candidate.id === request.entityId)
    : state.workspace.projects.find((candidate) => projectContainsEntity(candidate, request.entityType, request.entityId)) ?? selectedProject;

  if (!project) return undefined;
  if (request.entityType === "project") {
    if (field.key === "title") return project.title;
    if (field.key === "projectType") return project.type;
    if (field.key === "phase") return project.phase;
    if (field.key === "logline") return project.description;
    return undefined;
  }
  if (request.entityType === "task") {
    const task = project.openTasks.find((candidate) => candidate.id === request.entityId);
    if (!task) return field.key === "projectId" ? project.id : undefined;
    if (field.key === "title") return task.title;
    if (field.key === "status") return task.status;
    if (field.key === "dueAt") return task.due;
    if (field.key === "projectId") return project.id;
    return undefined;
  }
  if (request.entityType === "document") {
    const doc = project.docs.find((candidate) => candidate.id === request.entityId);
    if (!doc) return field.key === "projectId" ? project.id : undefined;
    if (field.key === "title") return doc.name;
    if (field.key === "documentType") return workerDocumentTypeFromLocalDoc(doc);
    if (field.key === "projectId") return project.id;
    if (field.key === "sensitive") return false;
    return undefined;
  }
  if (request.entityType === "person") {
    const person = project.people.find((candidate) => candidate.id === request.entityId);
    if (!person) return undefined;
    if (field.key === "displayName") return person.name;
    if (field.key === "roleTags") return [person.role];
    return undefined;
  }
  if (request.entityType === "equipment") {
    const item = project.equipment.find((candidate) => candidate.id === request.entityId);
    if (!item) return field.key === "projectId" ? project.id : undefined;
    if (field.key === "name") return item.name;
    if (field.key === "status") return item.status;
    if (field.key === "equipmentType") return item.statusTone;
    if (field.key === "projectId") return project.id;
    return undefined;
  }
    const expense = project.expenses.find((candidate) => candidate.id === request.entityId);
    if (!expense) return field.key === "projectId" ? project.id : undefined;
    if (field.key === "category") return expenseCategoryLabel(expense);
    if (field.key === "amountCents") return Math.round(expense.spent * 100);
    if (field.key === "projectId") return project.id;
  return undefined;
}

function filmProfileMutationDefaultValue(
  field: FilmProfileMutationFieldDefinition,
  selectedProject: FilmProject,
): string | number | null | undefined {
  if (field.key === "runtimeMinutes") return selectedProject.runtimeMinutes;
  if (field.key === "format") return selectedProject.format;
  if (field.key === "budgetCents") return Math.round(selectedProject.totalBudget * 100);
  if (field.key === "spentCents") return Math.round(selectedProject.spentBudget * 100);
  if (field.key === "shootStart") return splitLocalShootDates(selectedProject.shootDates).start;
  if (field.key === "shootEnd") return splitLocalShootDates(selectedProject.shootDates).end;
  return undefined;
}

function workerDocumentTypeFromLocalDoc(doc: ProjectDoc): string {
  if (doc.type === "MD") return "markdown";
  if (doc.type === "ASSET") return "uploaded_file";
  return "uploaded_file";
}

function recordMutationInputValue(value: string | number | boolean | null | string[] | undefined): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function formatRecordMutationInputKind(field: RecordMutationFieldDefinition): string {
  if (field.input === "list") return "comma list";
  if (field.input === "id") return field.nullable ? "optional id" : "id";
  if (field.input === "select") return "choice";
  return field.nullable ? `optional ${field.input}` : field.input;
}

function formatRecordMutationFieldValue(value: string | number | boolean | null): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function emptyRecordMutationResolutionState(): RecordMutationResolutionState {
  return {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    resolutionPolicy: null,
    request: null,
  };
}

function emptyRecordMutationDiffState(): RecordMutationDiffState {
  return {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    diffPolicy: null,
    request: null,
    stale: false,
    currentUpdatedAt: null,
    expectedUpdatedAt: null,
    fieldDiffs: [],
    rollbackGuidance: null,
  };
}

function emptyRecordMutationApplyState(): RecordMutationApplyState {
  return {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    applicationPolicy: null,
    request: null,
    application: null,
  };
}

function emptyFilmProfileMutationResolutionState(): FilmProfileMutationResolutionState {
  return {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    resolutionPolicy: null,
    request: null,
  };
}

function emptyFilmProfileMutationDiffState(): FilmProfileMutationDiffState {
  return {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    diffPolicy: null,
    request: null,
    stale: false,
    currentUpdatedAt: null,
    expectedUpdatedAt: null,
    fieldDiffs: [],
    rollbackGuidance: null,
  };
}

function emptyFilmProfileMutationApplyState(): FilmProfileMutationApplyState {
  return {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    applicationPolicy: null,
    request: null,
    application: null,
  };
}

function emptyRecordMutationRollbackState(): RecordMutationRollbackState {
  return {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    rollbackPolicy: null,
    sourceRequest: null,
    request: null,
    suggestedUpdates: {},
  };
}

function emptyRecordMutationDeleteRecoveryState(): RecordMutationDeleteRecoveryState {
  return {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    recoveryPolicy: null,
    sourceRequest: null,
    recoveryPlan: null,
  };
}

function resetRecordMutationWorkflow(mutation = state.recordMutation.mutation): void {
  state.recordMutation = {
    mutation,
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    mutationPolicy: null,
    preflight: null,
  };
  state.recordMutationRequest = {
    status: "idle",
    targetLabel: null,
    persistence: null,
    auditPersistence: null,
    requestPolicy: null,
    request: null,
  };
  state.recordMutationRequestManifest = null;
  state.recordMutationResolution = emptyRecordMutationResolutionState();
  state.recordMutationDiff = emptyRecordMutationDiffState();
  state.recordMutationApply = emptyRecordMutationApplyState();
  state.recordMutationAuditManifest = null;
  state.recordMutationRollback = emptyRecordMutationRollbackState();
  state.recordMutationDeleteRecovery = emptyRecordMutationDeleteRecoveryState();
}

function resetOwnerTransferTarget(target: Pick<OwnerTransferState, "entityType" | "entityId">): void {
  state.ownerTransfer = {
    ...state.ownerTransfer,
    ...target,
    status: "idle",
    persistence: null,
    transferredEntityType: null,
    transferredEntityId: null,
    transferredTargetLabel: null,
    ownerMemberId: null,
    previousOwnerMemberId: null,
  };
  state.ownerManifest = null;
  state.ownerHistory = null;
  resetRecordMutationWorkflow();
}

function renderRecordCommentManifest(manifest: RecordCommentManifestState): string {
  return `
    <div class="invite-preview" role="status">
      <strong>${escapeHtml(manifest.targetLabel)} comment intents</strong>
      <span>${manifest.rowCount} intents - ${manifest.truncated ? "truncated" : "complete"} - ${escapeHtml(manifest.manifestPolicy.replaceAll("_", " "))}</span>
      <small>${escapeHtml(manifest.persistence.replaceAll("_", " "))}${manifest.auditPersistence ? ` - ${escapeHtml(manifest.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        manifest.comments.length
          ? `
            <ul class="permission-manifest-list">
              ${manifest.comments.slice(0, 5).map((comment) => `
                <li>
                  <div>
                    <strong>${escapeHtml(comment.authorMemberId ? memberDisplayName(comment.authorMemberId) : "Unknown author")}</strong>
                    <span>${escapeHtml(comment.bodyPreview)}</span>
                    <small>${escapeHtml(formatShortDateTime(comment.createdAt))} - ${escapeHtml(comment.bodySha256.slice(0, 8))}</small>
                  </div>
                </li>
              `).join("")}
            </ul>
          `
          : "<small>No comment intents recorded for this row.</small>"
      }
    </div>
  `;
}

function renderStripeSummaryReadiness(readiness: StripeSummaryState): string {
  const configuredCount = Object.values(readiness.configured).filter(Boolean).length;
  return `
    <div class="provider-preview" role="status">
      <strong>Stripe summary readiness</strong>
      <span>${escapeHtml(readiness.status.replaceAll("_", " "))} - ${escapeHtml(readiness.dataBoundary.replaceAll("_", " "))}</span>
      <span>${configuredCount}/7 configured - direct Stripe reads ${readiness.directStripeReadAllowed ? "allowed" : "blocked"}</span>
      <small>${escapeHtml(readiness.persistence.replaceAll("_", " "))}${readiness.auditPersistence ? ` - ${escapeHtml(readiness.auditPersistence.replaceAll("_", " "))}` : ""} - live summaries ${readiness.liveSummaryReadAllowed ? "allowed" : "blocked"}</small>
      ${
        readiness.blockers.length
          ? `<small>${escapeHtml(readiness.blockers.slice(0, 2).join(" "))}</small>`
          : readiness.liveSummaryReadAllowed
            ? "<small>Configuration is ready for gated Pool/Store summary reads.</small>"
            : "<small>Configuration is ready; set live mode before summary reads.</small>"
      }
      ${
        readiness.complianceNotes.length
          ? `<small>${escapeHtml(readiness.complianceNotes.slice(0, 1).join(" "))}</small>`
          : ""
      }
      ${
        readiness.liveSummaryReadAllowed
          ? `<button class="secondary-button full-width" type="button" data-action="stripe-summary-fetch">${icon("provider")} Fetch summary aggregates</button>`
          : ""
      }
    </div>
  `;
}

function renderStripeSummaryResult(summary: StripeSummaryResultState): string {
  const net = formatCurrency(Math.round(summary.totals.netAmountCents / 100));
  const gross = formatCurrency(Math.round(summary.totals.grossAmountCents / 100));
  const fees = formatCurrency(Math.round(summary.totals.feeAmountCents / 100));
  return `
    <div class="provider-preview" role="status">
      <strong>Stripe summary aggregates</strong>
      <span>${escapeHtml(summary.status.replaceAll("_", " "))} - ${escapeHtml(summary.projectId)}</span>
      <span>Net ${escapeHtml(net)} - Gross ${escapeHtml(gross)} - Fees ${escapeHtml(fees)}</span>
      <span>Payments ${summary.counts.paymentCount} - Failed ${summary.counts.paymentFailedCount} - Refunds ${summary.counts.refundCount}</span>
      <small>${escapeHtml(summary.adapters.map((adapter) => `${adapter.source}:${adapter.status}(${adapter.mappedRefCount})`).join(" "))}</small>
      <small>${escapeHtml(summary.persistence.replaceAll("_", " "))}${summary.auditPersistence ? ` - ${escapeHtml(summary.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      ${
        summary.warnings.length
          ? `<small>${escapeHtml(summary.warnings.slice(0, 3).join(" "))}</small>`
          : `<small>${escapeHtml(summary.dataBoundary.replaceAll("_", " "))}; direct Stripe reads remain blocked.</small>`
      }
    </div>
  `;
}

function renderWorkerAuditManifest(manifest: WorkerAuditManifestState): string {
  return `
    <div class="provider-preview" role="status">
      <strong>Worker audit manifest</strong>
      <span>${manifest.rowCount} events - ${manifest.truncated ? "truncated" : "complete"} - ${escapeHtml(manifest.metadataPolicy.replaceAll("_", " "))}</span>
      <span>Offset ${manifest.offset}${manifest.actionPrefix ? ` - ${escapeHtml(manifest.actionPrefix)}` : ""}</span>
      <small>${escapeHtml(manifest.persistence.replaceAll("_", " "))}${manifest.auditPersistence ? ` - ${escapeHtml(manifest.auditPersistence.replaceAll("_", " "))}` : ""}</small>
      <ul class="audit-manifest-list">
        ${manifest.events.slice(0, 5).map((event) => `
          <li>
            <span class="status-dot blue"></span>
            <div>
              <strong>${escapeHtml(event.action.replaceAll("_", " "))}</strong>
              <small>${escapeHtml(formatShortDateTime(event.createdAt))} - ${escapeHtml(event.actorMemberId ?? "unknown actor")}</small>
              <small>${event.metadataKeys.length ? escapeHtml(event.metadataKeys.slice(0, 5).join(", ")) : "No metadata keys"}</small>
            </div>
          </li>
        `).join("")}
      </ul>
      ${
        manifest.nextOffset !== null
          ? `<button class="secondary-button full-width" type="button" data-action="worker-audit-next" data-offset="${manifest.nextOffset}">${icon("chevron")} Next audit page</button>`
          : ""
      }
    </div>
  `;
}

function renderInspectorViewPicker(): string {
  return `
    <div class="inspector-view-picker">
      <label for="inspector-view-select">View</label>
      <select id="inspector-view-select" data-action="inspector-view">
        ${INSPECTOR_VIEW_GROUPS.map((group) => `
          <optgroup label="${escapeAttribute(group.label)}">
            ${group.views.map((view) => `
              <option value="${view.id}" ${state.ui.inspectorView === view.id ? "selected" : ""}>${escapeHtml(view.label)}</option>
            `).join("")}
          </optgroup>
        `).join("")}
      </select>
    </div>
  `;
}

function inspectorViewPanelAttributes(view: InspectorView): string {
  return `data-inspector-view-panel="${view}"${state.ui.inspectorView === view ? "" : " hidden"}`;
}

function workflowStageClass(index: number, currentIndex: number): string {
  if (index < currentIndex) return "is-complete";
  if (index === currentIndex) return "is-current";
  return "is-upcoming";
}

function renderWorkflowStageSummary(index: number, title: string, description: string, currentIndex: number): string {
  const status = index < currentIndex ? "Complete" : index === currentIndex ? "Current" : "Upcoming";
  return `
    <span class="workflow-step-marker">${index < currentIndex ? icon("check") : index + 1}</span>
    <span class="workflow-step-copy">
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(description)}</small>
    </span>
    <span class="workflow-step-status">${status}</span>
  `;
}

function renderWorkflowRequestId(requestId: string): string {
  return `<input type="hidden" name="requestId" value="${escapeAttribute(requestId)}" />`;
}

function permissionTargetsFor(project: FilmProject, scope: PermissionScope): Array<{ id: string; label: string }> {
  if (scope === "task") return project.openTasks.map((task) => ({ id: task.id, label: task.title }));
  if (scope === "document") return project.docs.map((doc) => ({ id: doc.id, label: doc.name }));
  return [{ id: project.id, label: project.title }];
}

function selectedPermissionTargetId(project: FilmProject, scope: PermissionScope): string {
  const targets = permissionTargetsFor(project, scope);
  if (scope === "task") {
    return targets.some((target) => target.id === state.taskPermission.taskId) ? state.taskPermission.taskId : targets[0]?.id ?? "";
  }
  if (scope === "document") {
    return targets.some((target) => target.id === state.ui.selectedDocId) ? state.ui.selectedDocId ?? "" : targets[0]?.id ?? "";
  }
  return project.id;
}

function renderPermissionAssignment(project: FilmProject, activeMembers: WorkspaceData["members"], canAssign: boolean): string {
  const scope = state.ui.permissionScope;
  const assignment = permissionAssignmentState(scope);
  const targets = permissionTargetsFor(project, scope);
  const targetId = selectedPermissionTargetId(project, scope);
  const target = targets.find((candidate) => candidate.id === targetId) ?? targets[0] ?? null;
  const memberId = assignment.memberId || activeMembers[0]?.id || "";
  const isAssigning = assignment.status === "assigning";
  const assignedTargetId = scope === "project"
    ? state.projectPermission.assignedProjectId
    : scope === "task"
      ? state.taskPermission.assignedTaskId
      : state.documentPermission.assignedDocumentId;
  const assignmentMatches = assignment.status === "assigned"
    && assignment.assignedPermission
    && assignedTargetId === target?.id;

  return `
    <div class="segmented-control permission-scope-control" aria-label="Permission scope">
      ${PERMISSION_SCOPES.map((candidate) => `
        <button type="button" data-permission-scope="${candidate.id}" class="${scope === candidate.id ? "is-active" : ""}">${escapeHtml(candidate.label)}</button>
      `).join("")}
    </div>
    <form class="permission-assignment-form" data-action="permission-assign" data-permission-assignment-scope="${scope}">
      <label class="inspector-form-field">
        <span>${scope === "project" ? "Project" : scope === "task" ? "Task" : "Document"}</span>
        <select name="targetId" data-action="permission-target" ${isAssigning || targets.length === 0 ? "disabled" : ""}>
          ${targets.map((candidate) => `<option value="${escapeAttribute(candidate.id)}" ${candidate.id === target?.id ? "selected" : ""}>${escapeHtml(candidate.label)}</option>`).join("")}
        </select>
      </label>
      <label class="inspector-form-field">
        <span>Member</span>
        <select name="memberId" ${isAssigning ? "disabled" : ""}>
          ${activeMembers.map((member) => `<option value="${escapeAttribute(member.id)}" ${memberId === member.id ? "selected" : ""}>${escapeHtml(member.displayName)}</option>`).join("")}
        </select>
      </label>
      <label class="inspector-form-field">
        <span>Access level</span>
        <select name="permission" ${isAssigning ? "disabled" : ""}>
          ${RECORD_PERMISSION_LEVELS.map((permission) => `<option value="${permission}" ${assignment.permission === permission ? "selected" : ""}>${escapeHtml(formatRecordPermissionLevel(permission))}</option>`).join("")}
        </select>
      </label>
      <label class="inspector-form-field">
        <span>Department <small>Optional</small></span>
        <input name="department" value="${escapeAttribute(assignment.department)}" autocomplete="off" ${isAssigning ? "disabled" : ""} />
      </label>
      <label class="inspector-form-field">
        <span>Expires <small>Optional</small></span>
        <input name="expiresAt" type="date" value="${escapeAttribute(assignment.expiresAt)}" ${isAssigning ? "disabled" : ""} />
      </label>
      <button type="submit" ${!canAssign || !target || !memberId || isAssigning ? "disabled" : ""}>${isAssigning ? "Granting..." : "Grant access"}</button>
    </form>
    ${assignmentMatches ? `
      <div class="invite-preview" role="status">
        <strong>Access saved</strong>
        <span>${escapeHtml(target?.label ?? "Selected target")} - ${escapeHtml(formatRecordPermissionLevel(assignment.assignedPermission ?? assignment.permission))}</span>
        <small>${escapeHtml((assignment.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${assignment.department ? ` - ${escapeHtml(assignment.department)}` : ""}${assignment.expiresAt ? ` - expires ${escapeHtml(assignment.expiresAt)}` : ""}</small>
      </div>
    ` : ""}
    <details class="advanced-disclosure permission-review-disclosure">
      <summary>${icon("people")} <span>Review existing access</span> ${icon("chevron")}</summary>
      <div class="advanced-disclosure-body permission-review-actions">
        <button class="secondary-button" type="button" data-action="permission-manifest" data-permission-mode="active" ${!canAssign || !target ? "disabled" : ""}>Active grants</button>
        <button class="secondary-button" type="button" data-action="permission-manifest" data-permission-mode="expired" ${!canAssign || !target ? "disabled" : ""}>Expired grants</button>
        <button class="secondary-button" type="button" data-action="permission-history" ${!canAssign || !target ? "disabled" : ""}>Access history</button>
      </div>
    </details>
  `;
}

function renderInspector(project: FilmProject): string {
  const auditEvents = state.workspace.auditLog.slice(0, 5);
  const members = state.workspace.members ?? [];
  const canCreateInvite = Boolean(state.auth.session?.csrfToken);
  const canManageTeam = state.auth.session?.role === "owner" || state.auth.session?.role === "producer";
  const isCreatingInvite = state.invite.status === "creating";
  const activeMembers = members.filter((member) => member.status === "active");
  const isUpdatingMemberStatus = state.memberStatus.status === "updating";
  const isAssigningMember = state.assignment.status === "assigning";
  const ownerTransferMemberId = state.ownerTransfer.memberId || activeMembers[0]?.id || "";
  const ownerTransferTargets = ownerTransferTargetsFor(project, state.ownerTransfer.entityType);
  const ownerTransferTarget = ownerTransferTargetFor(project, state.ownerTransfer.entityType, state.ownerTransfer.entityId);
  const isTransferringOwner = state.ownerTransfer.status === "transferring";
  const isCheckingMutation = state.recordMutation.status === "checking";
  const isRequestingMutation = state.recordMutationRequest.status === "requesting";
  const mutationManifestMatchesTarget = Boolean(
    state.recordMutationRequestManifest
      && ownerTransferTarget
      && state.recordMutationRequestManifest.target.entityId === ownerTransferTarget.entityId
      && state.recordMutationRequestManifest.target.entityType === ownerTransferTarget.entityType,
  );
  const pendingMutationRequestId = mutationManifestMatchesTarget
    ? state.recordMutationRequestManifest?.requests.find((request) => request.status === "pending_owner_producer_review")?.id ?? state.recordMutationRequest.request?.id ?? ""
    : state.recordMutationRequest.request?.id ?? "";
  const approvedMutationRequest = (
    mutationManifestMatchesTarget
      ? state.recordMutationRequestManifest?.requests.find((request) => request.status === "approved_pending_apply") ?? null
      : null
  ) ?? (
    state.recordMutationResolution.request?.status === "approved_pending_apply"
      ? state.recordMutationResolution.request
      : null
  );
  const approvedMutationRequestId = approvedMutationRequest?.id ?? "";
  const isResolvingMutation = state.recordMutationResolution.status === "resolving";
  const isPreviewingMutationDiff = state.recordMutationDiff.status === "previewing";
  const isApplyingMutation = state.recordMutationApply.status === "applying";
  const mutationAuditRequestId = state.recordMutationApply.request?.id
    || state.recordMutationDiff.request?.id
    || state.recordMutationResolution.request?.id
    || approvedMutationRequestId
    || pendingMutationRequestId;
  const appliedMutationSource = state.recordMutationApply.request?.status === "applied"
    ? state.recordMutationApply.request
    : state.recordMutationAuditManifest?.request?.status === "applied"
      ? state.recordMutationAuditManifest.request
      : null;
  const rollbackSourceRequestId = appliedMutationSource?.mutation === "update" ? appliedMutationSource.id : "";
  const isRequestingRollback = state.recordMutationRollback.status === "requesting";
  const deleteRecoverySourceRequestId = appliedMutationSource?.mutation === "delete" ? appliedMutationSource.id : "";
  const isCheckingDeleteRecovery = state.recordMutationDeleteRecovery.status === "checking";
  const isRequestingProfileMutation = state.filmProfileMutationRequest.status === "requesting";
  const profileMutationManifestMatchesProject = state.filmProfileMutationRequestManifest?.projectId === project.id;
  const profileMutationRequestMatchesProject = state.filmProfileMutationRequest.request?.projectId === project.id;
  const pendingProfileMutationRequestId = profileMutationManifestMatchesProject
    ? state.filmProfileMutationRequestManifest?.requests.find((request) => request.status === "pending_owner_producer_review")?.id
      ?? (profileMutationRequestMatchesProject ? state.filmProfileMutationRequest.request?.id ?? "" : "")
    : profileMutationRequestMatchesProject
      ? state.filmProfileMutationRequest.request?.id ?? ""
      : "";
  const approvedProfileMutationRequest = (
    profileMutationManifestMatchesProject
      ? state.filmProfileMutationRequestManifest?.requests.find((request) => request.status === "approved_pending_apply") ?? null
      : null
  ) ?? (
    state.filmProfileMutationResolution.request?.projectId === project.id
      && state.filmProfileMutationResolution.request.status === "approved_pending_apply"
      ? state.filmProfileMutationResolution.request
      : null
  );
  const approvedProfileMutationRequestId = approvedProfileMutationRequest?.id ?? "";
  const isResolvingProfileMutation = state.filmProfileMutationResolution.status === "resolving";
  const isPreviewingProfileMutationDiff = state.filmProfileMutationDiff.status === "previewing";
  const isApplyingProfileMutation = state.filmProfileMutationApply.status === "applying";
  const recordMutationApplied = Boolean(
    state.recordMutationApply.status === "applied"
      && state.recordMutationApply.request
      && ownerTransferTarget
      && state.recordMutationApply.request.entityId === ownerTransferTarget.entityId
      && state.recordMutationApply.request.entityType === ownerTransferTarget.entityType,
  );
  const recordMutationPreviewed = Boolean(
    state.recordMutationDiff.status === "previewed"
      && state.recordMutationDiff.request?.id === approvedMutationRequestId,
  );
  const recordWorkflowStep = recordMutationApplied ? 4 : recordMutationPreviewed ? 3 : approvedMutationRequestId ? 2 : pendingMutationRequestId ? 1 : 0;
  const profileMutationApplied = state.filmProfileMutationApply.status === "applied"
    && state.filmProfileMutationApply.request?.projectId === project.id;
  const profileMutationPreviewed = state.filmProfileMutationDiff.status === "previewed"
    && state.filmProfileMutationDiff.request?.id === approvedProfileMutationRequestId;
  const profileWorkflowStep = profileMutationApplied ? 4 : profileMutationPreviewed ? 3 : approvedProfileMutationRequestId ? 2 : pendingProfileMutationRequestId ? 1 : 0;
  const commentTargets = recordCommentTargetsFor(project, state.recordComment.entityType);
  const commentTarget = recordCommentTargetFor(project, state.recordComment.entityType, state.recordComment.entityId);
  const isCreatingComment = state.recordComment.status === "creating";
  const selectedTask = project.openTasks.find((task) => task.id === state.taskPermission.taskId) ?? project.openTasks[0] ?? null;
  const selectedDocument = project.docs.find((doc) => doc.id === state.ui.selectedDocId) ?? project.docs[0] ?? null;
  const uploadableAttachmentCount = collectUploadableAttachmentMetadata(state.workspace).length;
  const storedAttachmentCount = countStoredR2Attachments(state.workspace);

  return `
    <aside class="inspector" aria-label="Inspector">
      <div class="tab-row">
        <button class="${state.ui.inspectorTab === "details" ? "is-active" : ""}" data-tab="details" type="button">Inspector</button>
        <button class="${state.ui.inspectorTab === "activity" ? "is-active" : ""}" data-tab="activity" type="button">Activity</button>
      </div>
      ${
        state.ui.inspectorTab === "details"
          ? `
            <div class="inspector-body inspector-details">
              ${renderInspectorViewPicker()}
              <div class="inspector-view-panel" ${inspectorViewPanelAttributes("overview")}>
              <form class="project-overview-form" data-action="project-inline-update" data-project-id="${escapeAttribute(project.id)}">
                <div class="project-summary">
                  <span class="status-dot ${project.color}"></span>
                  <h2>${escapeHtml(project.title)}</h2>
                  ${project.starred ? icon("star") : ""}
                </div>
                <p>${escapeHtml(project.type)} - ${project.runtimeMinutes} min - ${escapeHtml(project.format)}</p>
                <div class="project-overview-fields">
                  <label class="inspector-form-field">
                    <span>Phase</span>
                    <select name="phase" data-contextual-autosave>
                      ${PROJECT_PHASES.map((phase) => `<option value="${phase}" ${project.phase === phase ? "selected" : ""}>${phase}</option>`).join("")}
                    </select>
                  </label>
                  <label class="inspector-form-field">
                    <span>Shoot dates</span>
                    <input name="shootDates" value="${escapeAttribute(project.shootDates)}" autocomplete="off" />
                  </label>
                  <label class="inspector-form-field">
                    <span>Budget</span>
                    <input name="totalBudget" value="${project.totalBudget}" inputmode="decimal" autocomplete="off" />
                  </label>
                  <label class="inspector-form-field">
                    <span>Location</span>
                    <input name="location" value="${escapeAttribute(project.location)}" autocomplete="off" />
                  </label>
                </div>
                <label class="inspector-form-field project-description-field">
                  <span>Description</span>
                  <textarea name="description" rows="3">${escapeHtml(project.description)}</textarea>
                </label>
                <div class="project-overview-footer">
                  <small>${escapeHtml(project.workflow)}</small>
                  <button type="submit">${icon("check")} Save project details</button>
                </div>
              </form>
              </div>
              <div class="inspector-view-panel" ${inspectorViewPanelAttributes("team")}>
              <section class="inspector-section inspector-section-first">
                <div class="section-head row"><h3>Team</h3><button type="button" data-action="export-team-roster">${icon("doc")} Export team</button></div>
                ${renderTeamEditGate()}
                <ul class="team-list">
                  ${members.map((member) => renderTeamMemberRow(project, member, canManageTeam, isUpdatingMemberStatus, isAssigningMember)).join("")}
                </ul>
                <details class="advanced-disclosure team-history-disclosure">
                  <summary>${icon("people")} <span>Team history</span> ${icon("chevron")}</summary>
                  <div class="advanced-disclosure-body permission-review-actions">
                    <button class="secondary-button" type="button" data-action="project-membership-manifest" ${!canCreateInvite ? "disabled" : ""}>Current assignments</button>
                    <button class="secondary-button" type="button" data-action="project-membership-history" ${!canCreateInvite ? "disabled" : ""}>Assignment history</button>
                    ${state.projectMembershipManifest ? renderProjectMembershipManifest(state.projectMembershipManifest) : ""}
                    ${state.projectMembershipHistory && state.projectMembershipHistory.projectId === project.id ? renderProjectMembershipHistory(state.projectMembershipHistory) : ""}
                  </div>
                </details>
              </section>
              </div>
              <div class="inspector-view-panel" ${inspectorViewPanelAttributes("ownership")}>
              <section class="inspector-section inspector-section-first">
                <div class="section-head row"><h3>Ownership</h3></div>
                <form class="invite-form ownership-form" data-action="record-owner-transfer">
                  <select name="entityType" ${isTransferringOwner ? "disabled" : ""}>
                    ${OWNER_TRANSFER_ENTITY_TYPES.map((entityType) => {
                      const targetCount = ownerTransferTargetsFor(project, entityType).length;
                      const label = ownerTransferEntityLabel(entityType);
                      return `
                        <option value="${entityType}" ${state.ownerTransfer.entityType === entityType ? "selected" : ""} ${targetCount > 0 ? "" : "disabled"}>
                          ${escapeHtml(label)}
                        </option>
                      `;
                    }).join("")}
                  </select>
                  <select name="entityId" ${isTransferringOwner || ownerTransferTargets.length === 0 ? "disabled" : ""}>
                    ${ownerTransferTargets.map((target) => `
                      <option value="${escapeAttribute(target.entityId)}" ${ownerTransferTarget?.entityId === target.entityId ? "selected" : ""}>
                        ${escapeHtml(target.label)}
                      </option>
                    `).join("")}
                  </select>
                  <select name="memberId" ${isTransferringOwner ? "disabled" : ""}>
                    ${activeMembers.map((member) => `
                      <option value="${escapeAttribute(member.id)}" ${ownerTransferMemberId === member.id ? "selected" : ""}>${escapeHtml(member.displayName)}</option>
                    `).join("")}
                  </select>
                  <button type="submit" ${!canCreateInvite || !ownerTransferTarget || !ownerTransferMemberId || isTransferringOwner ? "disabled" : ""}>${isTransferringOwner ? "Transferring..." : "Transfer owner"}</button>
                </form>
                <button class="secondary-button full-width" type="button" data-action="record-owner-manifest" ${!canCreateInvite || !ownerTransferTarget ? "disabled" : ""}>${icon("people")} Review owner</button>
                <button class="secondary-button full-width" type="button" data-action="record-owner-history" ${!canCreateInvite || !ownerTransferTarget ? "disabled" : ""}>${icon("people")} Review owner history</button>
                ${
                  state.ownerTransfer.status === "transferred" && state.ownerTransfer.transferredTargetLabel && state.ownerTransfer.ownerMemberId
                    ? `
                      <div class="invite-preview" role="status">
                        <strong>Owner transferred</strong>
                        <span>${escapeHtml(state.ownerTransfer.transferredTargetLabel)} - ${escapeHtml(memberDisplayName(state.ownerTransfer.ownerMemberId))}</span>
                        <small>${escapeHtml((state.ownerTransfer.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${state.ownerTransfer.previousOwnerMemberId ? ` - previous ${escapeHtml(memberDisplayName(state.ownerTransfer.previousOwnerMemberId))}` : ""}</small>
                      </div>
                    `
                    : ""
                }
                ${
                  state.ownerManifest
                    && ownerTransferTarget
                    && state.ownerManifest.owner.entityId === ownerTransferTarget.entityId
                    && state.ownerManifest.owner.entityType === ownerTransferTarget.entityType
                    ? `
                      <div class="invite-preview" role="status">
                        <strong>Current owner</strong>
                        <span>${escapeHtml(state.ownerManifest.targetLabel)} - ${escapeHtml(state.ownerManifest.owner.ownerMemberId ? memberDisplayName(state.ownerManifest.owner.ownerMemberId) : "Unassigned")}</span>
                        <small>${escapeHtml(state.ownerManifest.persistence.replaceAll("_", " "))}${state.ownerManifest.auditPersistence ? ` - ${escapeHtml(state.ownerManifest.auditPersistence.replaceAll("_", " "))}` : ""}</small>
                      </div>
                    `
                    : ""
                }
                ${
                  state.ownerHistory
                    && ownerTransferTarget
                    && state.ownerHistory.owner.entityId === ownerTransferTarget.entityId
                    && state.ownerHistory.owner.entityType === ownerTransferTarget.entityType
                    ? renderRecordOwnerHistory(state.ownerHistory)
                    : ""
                }
              </section>
              </div>
              <div class="inspector-view-panel" ${inspectorViewPanelAttributes("changes")}>
              <section class="inspector-section inspector-section-first">
                <div class="section-head row"><h3>Change requests</h3></div>
                <p class="inspector-intro">Move one controlled change from draft through approval and application.</p>
                <div class="segmented-control change-kind-control" aria-label="Change request type">
                  <button type="button" data-change-request-kind="record" class="${state.ui.changeRequestKind === "record" ? "is-active" : ""}">Record</button>
                  <button type="button" data-change-request-kind="profile" class="${state.ui.changeRequestKind === "profile" ? "is-active" : ""}">Film profile</button>
                </div>
                <div class="change-kind-panel" data-change-kind-panel="record" ${state.ui.changeRequestKind === "record" ? "" : "hidden"}>
                <div class="workflow-stack">
                <details class="workflow-stage ${workflowStageClass(0, recordWorkflowStep)}" ${recordWorkflowStep === 0 ? "open" : ""}>
                  <summary>${renderWorkflowStageSummary(0, "Draft", "Choose the change and request review", recordWorkflowStep)}</summary>
                  <div class="workflow-stage-body">
                <form class="invite-form mutation-form" data-action="record-mutation-preflight">
                  <label class="inspector-form-field">
                    <span>Change type</span>
                    <select name="mutation" ${isCheckingMutation ? "disabled" : ""}>
                      <option value="update" ${state.recordMutation.mutation === "update" ? "selected" : ""}>Update access</option>
                      <option value="delete" ${state.recordMutation.mutation === "delete" ? "selected" : ""}>Delete access</option>
                    </select>
                  </label>
                  <button type="submit" ${!canCreateInvite || !ownerTransferTarget || isCheckingMutation ? "disabled" : ""}>${isCheckingMutation ? "Checking..." : "Check mutation access"}</button>
                </form>
	                ${
	                  state.recordMutation.status === "checked"
	                    && state.recordMutation.preflight
	                    && ownerTransferTarget
	                    && state.recordMutation.preflight.entityId === ownerTransferTarget.entityId
	                    && state.recordMutation.preflight.entityType === ownerTransferTarget.entityType
	                    ? renderRecordMutationPreflight(state.recordMutation)
	                    : ""
	                }
	                <form class="invite-form mutation-request-form" data-action="record-mutation-request">
	                  ${renderRecordMutationFieldSelector(ownerTransferTarget?.entityType ?? state.ownerTransfer.entityType, state.recordMutation.mutation, isRequestingMutation)}
	                  <label class="inspector-form-field">
	                    <span>Review summary</span>
	                    <input
	                      name="summary"
	                      value=""
	                      placeholder="What should the reviewer know?"
	                      autocomplete="off"
	                      maxlength="500"
	                      ${isRequestingMutation ? "disabled" : ""}
	                    />
	                  </label>
	                  <button type="submit" ${!canCreateInvite || !ownerTransferTarget || isRequestingMutation ? "disabled" : ""}>${isRequestingMutation ? "Requesting..." : "Request mutation review"}</button>
	                </form>
	                ${
	                  state.recordMutationRequest.status === "requested"
	                    && state.recordMutationRequest.request
	                    && ownerTransferTarget
	                    && state.recordMutationRequest.request.entityId === ownerTransferTarget.entityId
	                    && state.recordMutationRequest.request.entityType === ownerTransferTarget.entityType
		                    ? renderRecordMutationRequest(state.recordMutationRequest)
		                    : ""
		                }
		          </div>
		        </details>
		        <details class="workflow-stage ${workflowStageClass(1, recordWorkflowStep)}" ${recordWorkflowStep === 1 ? "open" : ""}>
		          <summary>${renderWorkflowStageSummary(1, "Review", "Approve or reject the pending request", recordWorkflowStep)}</summary>
		          <div class="workflow-stage-body">
		                <button class="secondary-button full-width" type="button" data-action="record-mutation-request-manifest" ${!canCreateInvite || !ownerTransferTarget || isRequestingMutation ? "disabled" : ""}>${icon("people")} Review mutation requests</button>
	                ${
	                  mutationManifestMatchesTarget && state.recordMutationRequestManifest
	                    ? renderRecordMutationRequestManifest(state.recordMutationRequestManifest)
	                    : ""
	                }
	                <form class="invite-form mutation-resolution-form" data-action="record-mutation-resolve">
	                  ${renderWorkflowRequestId(pendingMutationRequestId)}
	                  <label class="inspector-form-field">
	                    <span>Decision</span>
	                    <select name="decision" ${isResolvingMutation ? "disabled" : ""}>
	                      <option value="approve">Approve</option>
	                      <option value="reject">Reject</option>
	                    </select>
	                  </label>
	                  <label class="inspector-form-field">
	                    <span>Review note</span>
	                    <input
	                      name="note"
	                      value=""
	                      placeholder="Reason or context"
	                      autocomplete="off"
	                      maxlength="500"
	                      ${isResolvingMutation ? "disabled" : ""}
	                    />
	                  </label>
	                  <button type="submit" ${!canCreateInvite || !ownerTransferTarget || !pendingMutationRequestId || isResolvingMutation ? "disabled" : ""}>${isResolvingMutation ? "Resolving..." : "Resolve mutation"}</button>
	                </form>
	                ${
	                  state.recordMutationResolution.status === "resolved"
	                    && state.recordMutationResolution.request
	                    && ownerTransferTarget
	                    && state.recordMutationResolution.request.entityId === ownerTransferTarget.entityId
	                    && state.recordMutationResolution.request.entityType === ownerTransferTarget.entityType
		                    ? renderRecordMutationResolution(state.recordMutationResolution)
		                    : ""
		                }
		          </div>
		        </details>
		        <details class="workflow-stage ${workflowStageClass(2, recordWorkflowStep)}" ${recordWorkflowStep === 2 ? "open" : ""}>
		          <summary>${renderWorkflowStageSummary(2, "Preview", "Confirm exactly what will change", recordWorkflowStep)}</summary>
		          <div class="workflow-stage-body">
		                <form class="invite-form mutation-diff-form" data-action="record-mutation-diff-preview">
	                  ${renderWorkflowRequestId(approvedMutationRequestId)}
	                  ${renderRecordMutationUpdateControls(approvedMutationRequest, isPreviewingMutationDiff, project)}
	                  <button type="submit" ${!canCreateInvite || !ownerTransferTarget || !approvedMutationRequestId || isPreviewingMutationDiff ? "disabled" : ""}>${isPreviewingMutationDiff ? "Previewing..." : "Preview mutation diff"}</button>
	                </form>
	                ${
	                  state.recordMutationDiff.status === "previewed"
	                    && state.recordMutationDiff.request
	                    && ownerTransferTarget
	                    && state.recordMutationDiff.request.entityId === ownerTransferTarget.entityId
	                    && state.recordMutationDiff.request.entityType === ownerTransferTarget.entityType
		                    ? renderRecordMutationDiffPreview(state.recordMutationDiff)
		                    : ""
		                }
		          </div>
		        </details>
		        <details class="workflow-stage ${workflowStageClass(3, recordWorkflowStep)}" ${recordWorkflowStep === 3 ? "open" : ""}>
		          <summary>${renderWorkflowStageSummary(3, "Apply", "Commit the approved change", recordWorkflowStep)}</summary>
		          <div class="workflow-stage-body">
		                <form class="invite-form mutation-apply-form" data-action="record-mutation-apply">
	                  ${renderWorkflowRequestId(approvedMutationRequestId)}
	                  ${renderRecordMutationUpdateControls(approvedMutationRequest, isApplyingMutation, project)}
	                  <button type="submit" ${!canCreateInvite || !ownerTransferTarget || !approvedMutationRequestId || isApplyingMutation ? "disabled" : ""}>${isApplyingMutation ? "Applying..." : "Apply mutation"}</button>
	                </form>
	                ${
	                  state.recordMutationApply.status === "applied"
	                    && state.recordMutationApply.request
	                    && ownerTransferTarget
	                    && state.recordMutationApply.request.entityId === ownerTransferTarget.entityId
	                    && state.recordMutationApply.request.entityType === ownerTransferTarget.entityType
		                    ? renderRecordMutationApply(state.recordMutationApply)
		                    : ""
		                }
		          </div>
		        </details>
		        <details class="workflow-stage ${workflowStageClass(4, recordWorkflowStep)}" ${recordWorkflowStep === 4 ? "open" : ""}>
		          <summary>${renderWorkflowStageSummary(4, "Complete", "Review the result and recovery options", recordWorkflowStep)}</summary>
		          <div class="workflow-stage-body">
		            ${recordMutationApplied ? renderRecordMutationApply(state.recordMutationApply) : `<p class="workflow-prerequisite">Apply the approved request to complete this workflow.</p>`}
		          </div>
		        </details>
		        </div>
		        <details class="advanced-disclosure">
		          <summary>${icon("settings")} <span>Audit and recovery</span> ${icon("chevron")}</summary>
		          <div class="advanced-disclosure-body">
		                <form class="invite-form mutation-audit-form" data-action="record-mutation-audit-manifest">
	                  <input
	                    name="requestId"
	                    value="${escapeAttribute(mutationAuditRequestId)}"
	                    placeholder="Mutation request ID"
	                    autocomplete="off"
	                  />
	                  <button type="submit" ${!canCreateInvite || !ownerTransferTarget || !mutationAuditRequestId ? "disabled" : ""}>Review mutation audit</button>
	                </form>
	                ${
	                  state.recordMutationAuditManifest
	                    && ownerTransferTarget
	                    && state.recordMutationAuditManifest.request?.entityId === ownerTransferTarget.entityId
	                    && state.recordMutationAuditManifest.request?.entityType === ownerTransferTarget.entityType
	                    ? renderRecordMutationAuditManifest(state.recordMutationAuditManifest)
	                    : ""
	                }
	                <form class="invite-form mutation-rollback-form" data-action="record-mutation-rollback-request">
	                  <input
	                    name="requestId"
	                    value="${escapeAttribute(rollbackSourceRequestId)}"
	                    placeholder="Applied request ID"
	                    autocomplete="off"
	                    ${isRequestingRollback ? "disabled" : ""}
	                  />
	                  <input
	                    name="summary"
	                    value=""
	                    placeholder="Rollback summary"
	                    autocomplete="off"
	                    maxlength="500"
	                    ${isRequestingRollback ? "disabled" : ""}
	                  />
	                  <button type="submit" ${!canCreateInvite || !ownerTransferTarget || !rollbackSourceRequestId || isRequestingRollback ? "disabled" : ""}>${isRequestingRollback ? "Requesting..." : "Request rollback"}</button>
	                </form>
	                ${
	                  state.recordMutationRollback.status === "requested"
	                    && state.recordMutationRollback.request
	                    && ownerTransferTarget
	                    && state.recordMutationRollback.request.entityId === ownerTransferTarget.entityId
	                    && state.recordMutationRollback.request.entityType === ownerTransferTarget.entityType
	                    ? renderRecordMutationRollback(state.recordMutationRollback)
	                    : ""
	                }
	                <form class="invite-form mutation-delete-recovery-form" data-action="record-mutation-delete-recovery">
	                  <input
	                    name="requestId"
	                    value="${escapeAttribute(deleteRecoverySourceRequestId)}"
	                    placeholder="Applied delete request ID"
	                    autocomplete="off"
	                    ${isCheckingDeleteRecovery ? "disabled" : ""}
	                  />
	                  <button type="submit" ${!canCreateInvite || !ownerTransferTarget || !deleteRecoverySourceRequestId || isCheckingDeleteRecovery ? "disabled" : ""}>${isCheckingDeleteRecovery ? "Planning..." : "Plan delete recovery"}</button>
	                </form>
	                ${
	                  state.recordMutationDeleteRecovery.status === "checked"
	                    && state.recordMutationDeleteRecovery.sourceRequest
	                    && ownerTransferTarget
	                    && state.recordMutationDeleteRecovery.sourceRequest.entityId === ownerTransferTarget.entityId
	                    && state.recordMutationDeleteRecovery.sourceRequest.entityType === ownerTransferTarget.entityType
		                    ? renderRecordMutationDeleteRecovery(state.recordMutationDeleteRecovery)
		                    : ""
		                }
		          </div>
		        </details>
		        </div>
		        <div class="change-kind-panel" data-change-kind-panel="profile" ${state.ui.changeRequestKind === "profile" ? "" : "hidden"}>
		        <div class="workflow-stack">
		        <details class="workflow-stage ${workflowStageClass(0, profileWorkflowStep)}" ${profileWorkflowStep === 0 ? "open" : ""}>
		          <summary>${renderWorkflowStageSummary(0, "Draft", "Choose profile fields and request review", profileWorkflowStep)}</summary>
		          <div class="workflow-stage-body">
			                <form class="invite-form profile-mutation-request-form" data-action="film-profile-mutation-request">
	                  ${renderFilmProfileMutationFieldSelector(isRequestingProfileMutation)}
	                  <label class="inspector-form-field">
	                    <span>Review summary</span>
	                    <input
	                      name="summary"
	                      value=""
	                      placeholder="What should the reviewer know?"
	                      autocomplete="off"
	                      maxlength="500"
	                      ${isRequestingProfileMutation ? "disabled" : ""}
	                    />
	                  </label>
	                  <button type="submit" ${!canCreateInvite || isRequestingProfileMutation ? "disabled" : ""}>${isRequestingProfileMutation ? "Requesting..." : "Request profile review"}</button>
	                </form>
	                ${
	                  state.filmProfileMutationRequest.status === "requested"
	                    && state.filmProfileMutationRequest.request?.projectId === project.id
		                    ? renderFilmProfileMutationRequest(state.filmProfileMutationRequest)
		                    : ""
		                }
		          </div>
		        </details>
		        <details class="workflow-stage ${workflowStageClass(1, profileWorkflowStep)}" ${profileWorkflowStep === 1 ? "open" : ""}>
		          <summary>${renderWorkflowStageSummary(1, "Review", "Approve or reject the profile request", profileWorkflowStep)}</summary>
		          <div class="workflow-stage-body">
		                <button class="secondary-button full-width" type="button" data-action="film-profile-mutation-request-manifest" ${!canCreateInvite || isRequestingProfileMutation ? "disabled" : ""}>${icon("people")} Review profile requests</button>
	                ${
	                  profileMutationManifestMatchesProject && state.filmProfileMutationRequestManifest
	                    ? renderFilmProfileMutationRequestManifest(state.filmProfileMutationRequestManifest)
	                    : ""
	                }
	                <form class="invite-form profile-mutation-resolution-form" data-action="film-profile-mutation-resolve">
	                  ${renderWorkflowRequestId(pendingProfileMutationRequestId)}
	                  <label class="inspector-form-field">
	                    <span>Decision</span>
	                    <select name="decision" ${isResolvingProfileMutation ? "disabled" : ""}>
	                      <option value="approve">Approve</option>
	                      <option value="reject">Reject</option>
	                    </select>
	                  </label>
	                  <label class="inspector-form-field">
	                    <span>Review note</span>
	                    <input
	                      name="note"
	                      value=""
	                      placeholder="Reason or context"
	                      autocomplete="off"
	                      maxlength="500"
	                      ${isResolvingProfileMutation ? "disabled" : ""}
	                    />
	                  </label>
	                  <button type="submit" ${!canCreateInvite || !pendingProfileMutationRequestId || isResolvingProfileMutation ? "disabled" : ""}>${isResolvingProfileMutation ? "Resolving..." : "Resolve profile mutation"}</button>
	                </form>
	                ${
	                  state.filmProfileMutationResolution.status === "resolved"
	                    && state.filmProfileMutationResolution.request?.projectId === project.id
		                    ? renderFilmProfileMutationResolution(state.filmProfileMutationResolution)
		                    : ""
		                }
		          </div>
		        </details>
		        <details class="workflow-stage ${workflowStageClass(2, profileWorkflowStep)}" ${profileWorkflowStep === 2 ? "open" : ""}>
		          <summary>${renderWorkflowStageSummary(2, "Preview", "Confirm profile field changes", profileWorkflowStep)}</summary>
		          <div class="workflow-stage-body">
		                <form class="invite-form profile-mutation-diff-form" data-action="film-profile-mutation-diff-preview">
	                  ${renderWorkflowRequestId(approvedProfileMutationRequestId)}
	                  ${renderFilmProfileMutationUpdateControls(approvedProfileMutationRequest, isPreviewingProfileMutationDiff, project)}
	                  <button type="submit" ${!canCreateInvite || !approvedProfileMutationRequestId || isPreviewingProfileMutationDiff ? "disabled" : ""}>${isPreviewingProfileMutationDiff ? "Previewing..." : "Preview profile diff"}</button>
	                </form>
	                ${
	                  state.filmProfileMutationDiff.status === "previewed"
	                    && state.filmProfileMutationDiff.request?.projectId === project.id
		                    ? renderFilmProfileMutationDiffPreview(state.filmProfileMutationDiff)
		                    : ""
		                }
		          </div>
		        </details>
		        <details class="workflow-stage ${workflowStageClass(3, profileWorkflowStep)}" ${profileWorkflowStep === 3 ? "open" : ""}>
		          <summary>${renderWorkflowStageSummary(3, "Apply", "Commit the approved profile update", profileWorkflowStep)}</summary>
		          <div class="workflow-stage-body">
		                <form class="invite-form profile-mutation-apply-form" data-action="film-profile-mutation-apply">
	                  ${renderWorkflowRequestId(approvedProfileMutationRequestId)}
	                  ${renderFilmProfileMutationUpdateControls(approvedProfileMutationRequest, isApplyingProfileMutation, project)}
	                  <button type="submit" ${!canCreateInvite || !approvedProfileMutationRequestId || isApplyingProfileMutation ? "disabled" : ""}>${isApplyingProfileMutation ? "Applying..." : "Apply profile mutation"}</button>
	                </form>
	                ${
		                  state.filmProfileMutationApply.status === "applied"
		                    && state.filmProfileMutationApply.request?.projectId === project.id
			                    ? renderFilmProfileMutationApply(state.filmProfileMutationApply)
			                    : ""
			                }
		          </div>
		        </details>
		        <details class="workflow-stage ${workflowStageClass(4, profileWorkflowStep)}" ${profileWorkflowStep === 4 ? "open" : ""}>
		          <summary>${renderWorkflowStageSummary(4, "Complete", "Profile update and audit are available", profileWorkflowStep)}</summary>
		          <div class="workflow-stage-body">
		            ${profileMutationApplied ? renderFilmProfileMutationApply(state.filmProfileMutationApply) : `<p class="workflow-prerequisite">Apply the approved profile request to complete this workflow.</p>`}
		          </div>
		        </details>
		        </div>
		        </div>
              </section>
              </div>
              <div class="inspector-view-panel" ${inspectorViewPanelAttributes("permissions")}>
              <section class="inspector-section inspector-section-first">
                <div class="section-head row"><h3>Permissions</h3></div>
		        <p class="inspector-intro">Grant access to one scope at a time. Comments and invitations remain available as secondary tools.</p>
		        <details class="advanced-disclosure">
		          <summary>${icon("people")} <span>Comments</span> ${icon("chevron")}</summary>
		          <div class="advanced-disclosure-body">
		        <form class="invite-form comment-form" data-action="record-comment-create">
                  <select name="entityType" ${isCreatingComment ? "disabled" : ""}>
                    ${RECORD_COMMENT_ENTITY_TYPES.map((entityType) => {
                      const targetCount = recordCommentTargetsFor(project, entityType).length;
                      return `
                        <option value="${entityType}" ${state.recordComment.entityType === entityType ? "selected" : ""} ${targetCount > 0 ? "" : "disabled"}>
                          ${escapeHtml(recordCommentEntityLabel(entityType))}
                        </option>
                      `;
                    }).join("")}
                  </select>
                  <select name="entityId" ${isCreatingComment || commentTargets.length === 0 ? "disabled" : ""}>
                    ${commentTargets.map((target) => `
                      <option value="${escapeAttribute(target.entityId)}" ${commentTarget?.entityId === target.entityId ? "selected" : ""}>
                        ${escapeHtml(target.label)}
                      </option>
                    `).join("")}
                  </select>
                  <textarea name="body" rows="3" maxlength="2000" placeholder="Comment" ${isCreatingComment ? "disabled" : ""}>${escapeHtml(state.recordComment.body)}</textarea>
                  <button type="submit" ${!canCreateInvite || !commentTarget || isCreatingComment ? "disabled" : ""}>${isCreatingComment ? "Saving..." : "Add comment intent"}</button>
                </form>
                <button class="secondary-button full-width" type="button" data-action="record-comment-manifest" ${!canCreateInvite || !commentTarget || isCreatingComment ? "disabled" : ""}>${icon("people")} Review comment intents</button>
                ${
                  state.recordComment.status === "created" && state.recordComment.targetLabel && state.recordComment.bodyPreview
                    ? `
                      <div class="invite-preview" role="status">
                        <strong>Comment intent saved</strong>
                        <span>${escapeHtml(state.recordComment.targetLabel)} - ${escapeHtml(state.recordComment.bodyPreview)}</span>
                        <small>${escapeHtml((state.recordComment.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${state.recordComment.auditPersistence ? ` - ${escapeHtml(state.recordComment.auditPersistence.replaceAll("_", " "))}` : ""}${state.recordComment.bodySha256 ? ` - ${escapeHtml(state.recordComment.bodySha256.slice(0, 8))}` : ""}</small>
                      </div>
                    `
                    : ""
                }
                ${
                  state.recordCommentManifest
                    && commentTarget
                    && state.recordCommentManifest.target.entityId === commentTarget.entityId
                    && state.recordCommentManifest.target.entityType === commentTarget.entityType
		                    ? renderRecordCommentManifest(state.recordCommentManifest)
		                    : ""
		                }
		          </div>
		        </details>
		        <h4 class="inspector-subheading">Grant access</h4>
		        ${renderPermissionAssignment(project, activeMembers, canCreateInvite)}
		                ${state.recordPermissionManifest ? renderRecordPermissionManifest(state.recordPermissionManifest) : ""}
                ${
                  state.recordPermissionHistory
                    && (
                      (state.recordPermissionHistory.target.entityType === "project" && state.recordPermissionHistory.target.entityId === project.id)
                      || (state.recordPermissionHistory.target.entityType === "task" && state.recordPermissionHistory.target.entityId === selectedTask?.id)
                      || (state.recordPermissionHistory.target.entityType === "document" && state.recordPermissionHistory.target.entityId === selectedDocument?.id)
                    )
                    ? renderRecordPermissionHistory(state.recordPermissionHistory)
                    : ""
                }
		        <details class="advanced-disclosure">
		          <summary>${icon("people")} <span>Invitations</span> ${icon("chevron")}</summary>
		          <div class="advanced-disclosure-body">
		                <button class="secondary-button full-width" type="button" data-action="invite-delivery-readiness">${icon("provider")} Check invite delivery</button>
                ${state.inviteDelivery ? renderInviteDeliveryReadiness(state.inviteDelivery) : ""}
                <button class="secondary-button full-width" type="button" data-action="invite-manifest" ${!canCreateInvite ? "disabled" : ""}>${icon("people")} Review pending invites</button>
                ${state.inviteManifest ? renderInviteManifest(state.inviteManifest) : ""}
                <button class="secondary-button full-width" type="button" data-action="invite-delivery-suppressions" ${!canCreateInvite ? "disabled" : ""}>${icon("provider")} Review delivery suppressions</button>
                ${state.inviteDeliverySuppressions ? renderInviteDeliverySuppressions(state.inviteDeliverySuppressions) : ""}
                <form class="invite-form" data-action="invite-create">
                  <input
                    name="email"
                    type="email"
                    value="${escapeAttribute(state.invite.email)}"
                    placeholder="crew@example.com"
                    autocomplete="email"
                    ${isCreatingInvite ? "disabled" : ""}
                  />
                  <select name="role" ${isCreatingInvite ? "disabled" : ""}>
                    ${INVITE_ROLES.map((role) => `
                      <option value="${role}" ${state.invite.role === role ? "selected" : ""}>${escapeHtml(formatWorkspaceRole(role))}</option>
                    `).join("")}
                  </select>
                  <button type="submit" ${!canCreateInvite || isCreatingInvite ? "disabled" : ""}>${isCreatingInvite ? "Creating..." : "Invite"}</button>
                </form>
                ${
                  state.invite.status === "created"
		                    ? `
                      <div class="invite-preview" role="status">
                        <strong>${state.invite.devOnlyToken ? "Invite token ready" : "Invite delivery ready"}</strong>
                        <span>${escapeHtml(formatWorkspaceRole(state.invite.role))} - ${escapeHtml(shortHash(state.invite.emailHash))}</span>
                        ${
                          state.invite.devOnlyToken
                            ? `<small>${escapeHtml(state.invite.devOnlyToken)}</small>`
                            : "<small>Token is not exposed after live delivery.</small>"
                        }
                        <small>${escapeHtml((state.invite.persistence ?? "dry_run_memoryless").replaceAll("_", " "))}${state.invite.deliveryPersistence ? ` - ${escapeHtml(state.invite.deliveryPersistence.replaceAll("_", " "))}` : ""}</small>
                      </div>
                    `
		                    : ""
		                }
		          </div>
		        </details>
              </section>
              </div>
              <section class="inspector-section inspector-section-first inspector-view-panel" ${inspectorViewPanelAttributes("integrations")}>
                <div class="section-head row">
                  <h3>Integrations</h3>
                  <button type="button" data-action="provider-runtime-readiness">Runtime</button>
                </div>
                <div class="integration-picker" role="list" aria-label="Integration providers">
                  ${INTEGRATION_DEFINITIONS.map((definition) => {
                    const integration = state.workspace.integrations.find((item) => item.key === definition.key);
                    const isSelected = state.providerPreview?.key === definition.key;
                    return `
                      <button
                        class="integration-option ${isSelected ? "is-active" : ""}"
                        type="button"
                        role="listitem"
                        data-integration="${definition.key}"
                      >
                        ${icon("provider")}
                        <span>
                          <strong>${escapeHtml(definition.label)}</strong>
                          <small>${escapeHtml(integration?.mode ?? "dry-run")}</small>
                        </span>
                      </button>
                    `;
                  }).join("")}
                </div>
                ${state.providerRuntimeReadiness ? renderProviderRuntimeReadiness(state.providerRuntimeReadiness) : `<p class="empty-inline">Runtime gates not checked.</p>`}
              </section>
              <section class="inspector-section inspector-section-first inspector-view-panel" ${inspectorViewPanelAttributes("imports")}>
                <div class="section-head row"><h3>Imports</h3></div>
                <div class="import-actions">
                  <button class="secondary-button full-width" type="button" data-action="notion-import-folder">${icon("folder")} Import folder</button>
                  <button class="secondary-button full-width" type="button" data-action="notion-import-zip">${icon("zip")} Import ZIP</button>
                  ${
                    uploadableAttachmentCount > 0
                      ? `<button class="secondary-button full-width" type="button" data-action="attachments-store-r2">${icon("backup")} Store attachments</button>`
                      : ""
                  }
                  ${
                    storedAttachmentCount > 0
                      ? `<button class="secondary-button full-width" type="button" data-action="attachments-export-manifest">${icon("doc")} Export manifest</button>`
                      : ""
                  }
                  ${
                    state.attachmentExport?.latestObject
                      ? `<button class="secondary-button full-width" type="button" data-action="attachments-download-latest">${icon("backup")} Download latest attachment</button>`
                      : ""
                  }
                  ${
                    state.attachmentExport?.rowCount
                      ? `<button class="secondary-button full-width" type="button" data-action="attachments-package-dry-run">${icon("zip")} Package attachments</button>`
                      : ""
                  }
                  ${
                    state.attachmentExport?.packageDryRun?.canPackage
                      ? `<button class="secondary-button full-width" type="button" data-action="attachments-package-download">${icon("backup")} Download package</button>`
                      : ""
                  }
                </div>
                ${
                  state.notionImport
                    ? `
                      <div class="import-preview" role="status">
                        <strong>Notion import</strong>
                        <span>${state.notionImport.projectsCreated} projects - ${state.notionImport.tasksCreated} tasks - ${state.notionImport.docsCreated} docs</span>
                        <span>${state.notionImport.peopleCreated} people - ${state.notionImport.equipmentCreated} equipment - ${state.notionImport.expensesCreated} expenses</span>
                        <span>${state.notionImport.locationsMapped} locations - ${state.notionImport.opportunitiesMapped} opportunities - ${state.notionImport.meetingNotesMapped} meetings</span>
                        <span>${state.notionImport.equipmentRequestsMapped} requests - ${state.notionImport.showsMapped} shows - ${state.notionImport.merchMapped} merch - ${state.notionImport.mediaMapped} media - ${state.notionImport.rolesMapped} roles</span>
                        <span>${state.notionImport.coreCommitted} core committed - ${state.notionImport.coreIdempotent} idempotent - ${state.notionImport.coreUpdatePreview} update previews - ${state.notionImport.coreRejected} rejected</span>
                        <span>${state.notionImport.planningCommitted} planning committed - ${state.notionImport.planningIdempotent} idempotent - ${state.notionImport.planningUpdatePreview} update previews - ${state.notionImport.planningRejected} rejected</span>
                        ${
                          state.notionImport.planningTableSummary.length
                            ? `<span>Planning D1 tables: ${escapeHtml(formatNotionPlanningTableSummary(state.notionImport.planningTableSummary))}</span>`
                            : ""
                        }
                        ${
                          state.notionImport.planningUpdatePreviewDetails.length
                            ? `<span>Planning update preview: ${escapeHtml(formatNotionPlanningUpdatePreview(state.notionImport.planningUpdatePreviewDetails))}</span>`
                            : ""
                        }
                        <span>${state.notionImport.attachmentsStaged} staged attachments - ${state.notionImport.attachmentDryRunCommitted} R2 dry-run committed</span>
                        ${
                          state.attachmentR2Store
                            ? `<span>${state.attachmentR2Store.storedCount} R2 stored - ${state.attachmentR2Store.rejectedCount} rejected - ${escapeHtml(state.attachmentR2Store.persistence)}</span>`
                            : ""
                        }
                        ${
                          state.attachmentExport
                            ? `
                              <span>${state.attachmentExport.rowCount} stored attachment export rows - ${state.attachmentExport.truncated ? `next page ${state.attachmentExport.nextOffset ?? ""}` : "complete"} - ${escapeHtml(state.attachmentExport.persistence)}</span>
                              ${
                                state.attachmentExport.latestObject
                                  ? `<span>Latest stored attachment: ${escapeHtml(state.attachmentExport.latestObject.name)} - ${formatBytes(state.attachmentExport.latestObject.sizeBytes)}</span>`
                                  : ""
                              }
                              ${
                                state.attachmentExport.latestDownload
                                  ? `<span>Downloaded ${escapeHtml(state.attachmentExport.latestDownload.name)} - ${formatBytes(state.attachmentExport.latestDownload.sizeBytes)} - ${escapeHtml(state.attachmentExport.latestDownload.sha256?.slice(0, 12) ?? "hash unavailable")}</span>`
                                  : ""
                              }
                              ${
                                state.attachmentExport.packageDryRun
                                  ? `<span>Attachment package plan: ${state.attachmentExport.packageDryRun.objectCount} objects - ${formatBytes(state.attachmentExport.packageDryRun.totalSizeBytes)} - ${escapeHtml(state.attachmentExport.packageDryRun.packageMode.replaceAll("_", " "))}${state.attachmentExport.packageDryRun.nextOffset !== null ? ` - next page ${state.attachmentExport.packageDryRun.nextOffset}` : ""}</span>`
                                  : ""
                              }
                              ${
                                state.attachmentExport.packageDryRun?.packageTokenExpiresAt
                                  ? `<small>Plan expires ${escapeHtml(formatShortDateTime(state.attachmentExport.packageDryRun.packageTokenExpiresAt))} - ${escapeHtml(state.attachmentExport.packageDryRun.packagePlanPersistence.replaceAll("_", " "))}</small>`
                                  : ""
                              }
                              ${
                                state.attachmentExport.packageDryRun?.blockers.length
                                  ? `<small>${escapeHtml(state.attachmentExport.packageDryRun.blockers.slice(0, 2).join(" "))}</small>`
                                  : ""
                              }
                              ${
                                state.attachmentExport.packageDownload
                                  ? `<span>Downloaded package: ${escapeHtml(state.attachmentExport.packageDownload.name)} - ${state.attachmentExport.packageDownload.objectCount} objects - ${formatBytes(state.attachmentExport.packageDownload.sizeBytes)} - manifest ${state.attachmentExport.packageDownload.packageManifest.objectCount} objects - ${escapeHtml(state.attachmentExport.packageDownload.sha256?.slice(0, 12) ?? "hash unavailable")}</span>`
                                  : ""
                              }
                            `
                            : ""
                        }
                        <span>${state.notionImport.acceptedFiles} accepted files - ${state.notionImport.candidateCount} planned candidates</span>
                        <span>${escapeHtml(state.notionImport.sourceLabel)} source - ${escapeHtml(state.notionImport.attachmentUploadMode)} - ${escapeHtml(state.notionImport.attachmentPersistence)} - ${escapeHtml(state.notionImport.planningCommitPersistence)}</span>
                        ${
                          state.notionImport.warnings.length
                            ? `<small>${escapeHtml(state.notionImport.warnings.join(" "))}</small>`
                            : "<small>No import warnings.</small>"
                        }
                      </div>
                    `
                    : ""
                }
                ${
                  state.screenplayImport
                    ? `
                      <div class="import-preview" role="status">
                        <strong>Screenplay import</strong>
                        <span>${state.screenplayImport.breakdownsCreated} breakdowns - ${state.screenplayImport.scenesParsed} scenes - ${state.screenplayImport.elementsSuggested} suggestions</span>
                        <span>${state.screenplayImport.docsCreated} docs created - ${state.screenplayImport.screenplayFiles} screenplay files</span>
                        <span>${state.screenplayImport.fountainFiles} Fountain - ${state.screenplayImport.finalDraftFiles} Final Draft - ${state.screenplayImport.graineryFiles} Grainery</span>
                        ${
                          state.screenplayImport.warnings.length
                            ? `<small>${escapeHtml(state.screenplayImport.warnings.join(" "))}</small>`
                            : "<small>Source and parsed graph stored in the local workspace.</small>"
                        }
                      </div>
                    `
                    : ""
                }
              </section>
              ${
                state.providerPreview
                  ? `
                    <section class="inspector-section inspector-view-panel" ${inspectorViewPanelAttributes("integrations")}>
                      <div class="section-head row"><h3>${escapeHtml(state.providerPreview.label)}</h3><span class="section-kicker">Provider details</span></div>
                      <div class="provider-preview" role="status">
                        <strong>${escapeHtml(state.providerPreview.label)} dry run</strong>
                        <span>${escapeHtml(state.providerPreview.status.replaceAll("_", " "))}</span>
                        <span>${escapeHtml(state.providerPreview.capabilities.join(", "))}</span>
                        <span>Scopes: ${escapeHtml(state.providerPreview.requiredScopes.join(", "))}</span>
                        ${
                          state.providerPreview.productionReadPolicy
                            ? renderProviderProductionPolicy(state.providerPreview.productionReadPolicy)
                            : ""
                        }
                        <small>${escapeHtml(state.providerPreview.nextStep)}</small>
                        ${
                          state.providerPreview.complianceNotes.length
                            ? `<small>${escapeHtml(state.providerPreview.complianceNotes.join(" "))}</small>`
                            : ""
                        }
                        ${
                          state.providerPreview.auditPersistence
                            ? `<small>${escapeHtml(state.providerPreview.auditPersistence.replaceAll("_", " "))}</small>`
                            : ""
                        }
                        ${
                          state.providerPreview.key === "google"
                            ? `
                              <button class="secondary-button full-width" type="button" data-action="google-connection-check">${icon("provider")} Check Google</button>
                              <button class="secondary-button full-width" type="button" data-action="google-drive-sync-dry-run">${icon("provider")} Plan Drive sync</button>
                            `
                            : ""
                        }
                        ${
                          state.providerPreview.key === "social"
                            ? `<button class="secondary-button full-width" type="button" data-action="meta-connection-check">${icon("provider")} Check Meta</button>`
                            : ""
                        }
                        ${
                          state.providerPreview.key === "stripe"
                            ? `<button class="secondary-button full-width" type="button" data-action="stripe-summary-readiness">${icon("provider")} Check Stripe summaries</button>`
                            : ""
                        }
                        ${
                          state.providerPreview.key === "sms"
                            ? `${state.auth.session ? renderSmsConsentEnrollmentForm() : ""}
                              ${canManageSmsConsent()
                                ? `<button class="secondary-button full-width" type="button" data-action="telnyx-provider-readiness">${icon("provider")} Check Telnyx</button>
                                  <button class="secondary-button full-width" type="button" data-action="sms-consent-manifest">${icon("provider")} Review consent records</button>`
                                : ""}`
                            : ""
                        }
                      </div>
                      ${state.providerPreview.key === "google" && state.googleConnection ? renderGoogleConnection(state.googleConnection) : ""}
                      ${state.providerPreview.key === "google" && state.googleDriveManifest ? renderGoogleDriveManifest(state.googleDriveManifest) : ""}
                      ${state.providerPreview.key === "social" && state.metaConnection ? renderMetaConnection(state.metaConnection) : ""}
                      ${state.providerPreview.key === "social" && state.metaPageCandidates ? renderMetaPageCandidates(state.metaPageCandidates) : ""}
                      ${state.providerPreview.key === "social" && state.metaAnalytics ? renderMetaAnalytics(state.metaAnalytics) : ""}
                      ${state.providerPreview.key === "sms" && state.telnyxProviderReadiness ? renderTelnyxProviderReadiness(state.telnyxProviderReadiness) : ""}
                      ${state.providerPreview.key === "sms" && state.smsConsentManifest ? renderSmsConsentManifest(state.smsConsentManifest) : ""}
                      ${
                        state.googleDriveSync
                          ? `
                            <div class="provider-preview" role="status">
                              <strong>Drive sync plan</strong>
                              <span>${escapeHtml(state.googleDriveSync.syncMode.replaceAll("_", " "))} - ${state.googleDriveSync.rootFolderConfigured ? "root folder set" : "root folder missing"}</span>
                              <span>Actions: ${escapeHtml(state.googleDriveSync.plannedActions.map((action) => action.label).join(", "))}</span>
                              <span>Scopes: ${escapeHtml(state.googleDriveSync.requiredScopes.join(", "))}</span>
                              <small>${escapeHtml(state.googleDriveSync.blockers.slice(0, 3).join(" "))}</small>
                              ${
                                state.googleDriveSync.auditPersistence
                                  ? `<small>${escapeHtml(state.googleDriveSync.auditPersistence.replaceAll("_", " "))}</small>`
                                  : ""
                              }
                            </div>
                          `
                          : ""
                      }
                      ${
                        state.stripeSummary
                          ? renderStripeSummaryReadiness(state.stripeSummary)
                          : ""
                      }
                      ${
                        state.stripeSummaryResult
                          ? renderStripeSummaryResult(state.stripeSummaryResult)
                          : ""
                      }
                    </section>
                  `
                  : ""
              }
            </div>
          `
          : `
            <div class="inspector-body">
              <section class="inspector-section">
                <div class="section-head row">
                  <h3>Audit Log</h3>
                  <div class="inline-actions">
                    <button type="button" data-action="export-activity-log">${icon("doc")} Export activity</button>
                    <button type="button" data-action="worker-audit-manifest">Worker audit</button>
                  </div>
                </div>
                <form class="inline-form audit-filter-form" data-action="worker-audit-filter">
                  <input
                    name="actionPrefix"
                    value="${escapeAttribute(state.workerAuditActionPrefix)}"
                    placeholder="Action prefix"
                    autocomplete="off"
                  />
                  <button type="submit">${icon("filter")} Filter</button>
                </form>
                ${
                  state.workerAuditManifest
                    ? renderWorkerAuditManifest(state.workerAuditManifest)
                    : ""
                }
                <ul class="audit-list">
                  ${auditEvents
                    .map(
                      (event) => `
                        <li>
                          <span class="status-dot ${event.tone}"></span>
                          <div>
                            <strong>${escapeHtml(event.message)}</strong>
                            <small>${escapeHtml(event.when)} - ${escapeHtml(event.actor)}</small>
                          </div>
                        </li>
                      `,
                    )
                    .join("")}
                </ul>
              </section>
            </div>
          `
      }
    </aside>
  `;
}

function bindEvents(): void {
  root.querySelectorAll<HTMLButtonElement>("[data-workspace-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.workspaceSection;
      if (!isWorkspaceSection(section)) return;
      state.ui.workspaceSection = section;
      state.ui.toast = null;
      persistUi();
      render();
    });
  });

  root.querySelector<HTMLSelectElement>("[data-action='workspace-section-select']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement) || !isWorkspaceSection(select.value)) return;
    state.ui.workspaceSection = select.value;
    state.ui.toast = null;
    persistUi();
    render();
  });

  root.querySelectorAll<HTMLElement>("[data-project-id]").forEach((element) => {
    element.addEventListener("click", () => {
      state.ui.selectedProjectId = element.dataset.projectId ?? state.ui.selectedProjectId;
      const project = getProjectById(state.workspace, state.ui.selectedProjectId);
      state.ui.selectedDocId = project?.docs[0]?.id ?? null;
      state.ui.selectedCallSheetId = null;
      state.ui.selectedProductionReportId = null;
      state.ui.selectedProductionLocationId = null;
      state.ui.selectedProductionTalentId = null;
      state.ui.selectedProductionShotId = null;
      state.ui.productionShotSceneFilter = null;
      state.ui.inspectorTab = "details";
      state.ui.inspectorView = "overview";
      state.ui.toast = null;
      persistUi();
      render();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-project-surface]").forEach((button) => {
    button.addEventListener("click", () => {
      const surface = button.dataset.projectSurface;
      if (surface !== "board" && surface !== "list") return;
      state.ui.workspaceSection = "projects";
      state.ui.viewMode = surface;
      persistUi();
      render();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.ui.inspectorTab = button.dataset.tab as InspectorTab;
      persistUi();
      render();
    });
  });

  root.querySelector<HTMLSelectElement>("[data-action='inspector-view']")?.addEventListener("change", (event) => {
    const view = (event.currentTarget as HTMLSelectElement).value;
    if (!isInspectorView(view)) return;
    state.ui.inspectorView = view;
    persistUi();
    render();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-change-request-kind]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.changeRequestKind;
      if (!isChangeRequestKind(kind)) return;
      state.ui.changeRequestKind = kind;
      persistUi();
      render();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-permission-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      const scope = button.dataset.permissionScope;
      if (!isPermissionScope(scope)) return;
      state.ui.permissionScope = scope;
      persistUi();
      render();
    });
  });

  root.querySelector<HTMLSelectElement>("[data-action='permission-target']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    const form = select.closest<HTMLFormElement>("[data-permission-assignment-scope]");
    const scope = form?.dataset.permissionAssignmentScope;
    if (scope === "task") state.taskPermission.taskId = select.value;
    if (scope === "document") state.ui.selectedDocId = select.value;
    state.recordPermissionManifest = null;
    state.recordPermissionHistory = null;
    persistUi();
    render();
  });

  root.querySelector<HTMLInputElement>("[data-action='filter']")?.addEventListener("input", (event) => {
    const input = event.target as HTMLInputElement;
    const cursor = input.selectionStart ?? input.value.length;
    state.ui.filter = input.value;
    persistUi();
    render();
    const nextInput = root.querySelector<HTMLInputElement>("[data-action='filter']");
    nextInput?.focus();
    nextInput?.setSelectionRange(cursor, cursor);
  });

  root.querySelectorAll<HTMLButtonElement>("[data-action='backup']").forEach((button) => {
    button.addEventListener("click", () => {
      void exportBackup();
    });
  });
  root.querySelector<HTMLButtonElement>("[data-action='export-project-packet']")?.addEventListener("click", () => {
    void exportSelectedProjectPacket();
  });
  root.querySelector<HTMLButtonElement>("[data-action='schedule-export']")?.addEventListener("click", () => {
    void exportSelectedProductionSchedule();
  });
  root.querySelector<HTMLButtonElement>("[data-action='schedule-create']")?.addEventListener("click", () => {
    void createProductionSchedule();
  });
  root.querySelector<HTMLButtonElement>("[data-action='schedule-duplicate']")?.addEventListener("click", () => {
    void duplicateSelectedProductionSchedule();
  });
  root.querySelector<HTMLButtonElement>("[data-action='schedule-add-day']")?.addEventListener("click", () => {
    void addShootDayToSelectedSchedule();
  });
  root.querySelector<HTMLButtonElement>("[data-action='schedule-lock-toggle']")?.addEventListener("click", () => {
    void toggleSelectedProductionScheduleLock();
  });
  root.querySelector<HTMLSelectElement>("[data-action='schedule-version-select']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    state.ui.selectedScheduleId = select.value;
    state.productionScheduleStripSelection = null;
    persistUi();
    render();
  });
  root.querySelector<HTMLSelectElement>("[data-action='schedule-comparison-select']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    state.ui.selectedComparisonScheduleId = select.value;
    persistUi();
    render();
  });
  root.querySelector<HTMLFormElement>("form[data-action='schedule-assumptions-update']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void updateSelectedScheduleAssumptions(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLButtonElement>("[data-action='schedule-budget-create']")?.addEventListener("click", () => {
    void createSelectedScheduleBudgetScenario();
  });
  root.querySelector<HTMLFormElement>("form[data-action='schedule-budget-update']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void updateSelectedScheduleBudgetScenario(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLSelectElement>("[data-action='production-shot-scene-filter']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    state.ui.productionShotSceneFilter = select.value === "all" ? null : select.value;
    state.ui.selectedProductionShotId = null;
    persistUi();
    render();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='production-shot-row-select']").forEach((button) => {
    button.addEventListener("click", () => {
      state.ui.selectedProductionShotId = button.dataset.shotId ?? null;
      persistUi();
      render();
    });
  });
  root.querySelector<HTMLFormElement>("form[data-action='production-shot-create']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createProductionShotRecord(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLFormElement>("form[data-action='production-shot-update']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void updateSelectedProductionShot(event.currentTarget as HTMLFormElement);
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='production-shot-reorder']").forEach((button) => {
    button.addEventListener("click", () => {
      void reorderSelectedProductionShot(button.dataset.direction === "-1" ? -1 : 1);
    });
  });
  root.querySelector<HTMLButtonElement>("[data-action='production-shots-markdown-export']")?.addEventListener("click", () => {
    void exportProductionShots("markdown");
  });
  root.querySelector<HTMLButtonElement>("[data-action='production-shots-csv-export']")?.addEventListener("click", () => {
    void exportProductionShots("csv");
  });
  root.querySelector<HTMLSelectElement>("[data-action='call-sheet-select']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    state.ui.selectedCallSheetId = select.value;
    persistUi();
    render();
  });
  root.querySelector<HTMLFormElement>("form[data-action='call-sheet-create']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createProductionCallSheet(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLFormElement>("form[data-action='call-sheet-update']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void updateSelectedProductionCallSheet(event.currentTarget as HTMLFormElement);
  });
  root.querySelectorAll<HTMLFormElement>("form[data-action='call-sheet-cast-update']").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void updateSelectedProductionCallSheetCastCall(event.currentTarget as HTMLFormElement);
    });
  });
  root.querySelector<HTMLButtonElement>("[data-action='call-sheet-status-toggle']")?.addEventListener("click", () => {
    void toggleSelectedProductionCallSheetStatus();
  });
  root.querySelector<HTMLButtonElement>("[data-action='call-sheet-sync']")?.addEventListener("click", () => {
    void syncSelectedProductionCallSheet();
  });
  root.querySelector<HTMLSelectElement>("[data-action='production-report-select']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    state.ui.selectedProductionReportId = select.value;
    persistUi();
    render();
  });
  root.querySelector<HTMLFormElement>("form[data-action='production-report-create']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createProductionReport(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLFormElement>("form[data-action='production-report-update']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void updateSelectedProductionReport(event.currentTarget as HTMLFormElement);
  });
  root.querySelectorAll<HTMLFormElement>("form[data-action='production-report-scene-update']").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void updateSelectedProductionReportScene(event.currentTarget as HTMLFormElement);
    });
  });
  root.querySelector<HTMLButtonElement>("[data-action='production-report-status-toggle']")?.addEventListener("click", () => {
    void toggleSelectedProductionReportStatus();
  });
  root.querySelector<HTMLButtonElement>("[data-action='production-report-export']")?.addEventListener("click", () => {
    void exportSelectedProductionReport();
  });
  root.querySelector<HTMLButtonElement>("[data-action='production-report-csv-export']")?.addEventListener("click", () => {
    void exportSelectedProductionReportSceneCsv();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='production-location-row-select']").forEach((button) => {
    button.addEventListener("click", () => {
      state.ui.selectedProductionLocationId = button.dataset.locationId ?? null;
      persistUi();
      render();
    });
  });
  root.querySelector<HTMLFormElement>("form[data-action='production-location-create']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createProductionLocationRecord(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLFormElement>("form[data-action='production-location-update']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void updateSelectedProductionLocation(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLButtonElement>("[data-action='production-location-apply-call-sheet']")?.addEventListener("click", () => {
    void applySelectedProductionLocationToCallSheet();
  });
  root.querySelector<HTMLButtonElement>("[data-action='production-location-export']")?.addEventListener("click", () => {
    void exportSelectedProductionLocation();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='production-talent-row-select']").forEach((button) => {
    button.addEventListener("click", () => {
      state.ui.selectedProductionTalentId = button.dataset.talentId ?? null;
      persistUi();
      render();
    });
  });
  root.querySelector<HTMLFormElement>("form[data-action='production-talent-create']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createProductionTalentRecord(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLFormElement>("form[data-action='production-talent-update']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void updateSelectedProductionTalent(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLButtonElement>("[data-action='production-talent-apply-call-sheet']")?.addEventListener("click", () => {
    void applySelectedProductionTalentToCallSheet();
  });
  root.querySelector<HTMLButtonElement>("[data-action='production-talent-export']")?.addEventListener("click", () => {
    void exportSelectedProductionTalent();
  });
  root.querySelectorAll<HTMLInputElement>("[data-action='schedule-day-date']").forEach((input) => {
    input.addEventListener("change", () => {
      void updateSelectedScheduleDayDate(input.dataset.scheduleDayId ?? "", input.value || null);
    });
  });
  root.querySelectorAll<HTMLSelectElement>("[data-action='schedule-day-unit']").forEach((select) => {
    select.addEventListener("change", () => {
      void updateSelectedScheduleDayUnit(select.dataset.scheduleDayId ?? "", select.value === "second" ? "second" : "main");
    });
  });
  root.querySelectorAll<HTMLSelectElement>("[data-action='schedule-dood-status']").forEach((select) => {
    select.addEventListener("change", () => {
      const status = select.value === "travel" || select.value === "hold" ? select.value : null;
      void updateSelectedScheduleCastDayStatus(
        select.dataset.scheduleCastElementId ?? "",
        select.dataset.scheduleDayId ?? "",
        status,
      );
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='schedule-remove-day']").forEach((button) => {
    button.addEventListener("click", () => {
      void removeShootDayFromSelectedSchedule(button.dataset.scheduleDayId ?? "");
    });
  });
  root.querySelectorAll<HTMLInputElement>("[data-action='schedule-strip-select']").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const id = checkbox.dataset.scheduleStripId ?? "";
      const kind = checkbox.dataset.scheduleStripKind === "scene_part" ? "scene_part" : "scene";
      toggleSelectedProductionScheduleStrip({ kind, id }, checkbox.checked);
    });
  });
  root.querySelector<HTMLFormElement>("form[data-action='schedule-strip-batch-move']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void moveSelectedProductionScheduleStrips(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLButtonElement>("[data-action='schedule-strip-selection-clear']")?.addEventListener("click", () => {
    state.productionScheduleStripSelection = null;
    render();
  });
  root.querySelectorAll<HTMLSelectElement>("[data-action='schedule-scene-assign']").forEach((select) => {
    select.addEventListener("change", () => {
      const dayId = select.value === "unassigned" ? null : select.value;
      const scenePartId = select.dataset.scheduleScenePartId;
      if (scenePartId) {
        void assignScenePartToShootDay(scenePartId, dayId);
      } else {
        void assignSceneToShootDay(select.dataset.scheduleSceneId ?? "", dayId);
      }
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='schedule-scene-reorder']").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.dataset.scheduleDirection === "-1" ? -1 : 1;
      const scenePartId = button.dataset.scheduleScenePartId;
      if (scenePartId) {
        void reorderScenePartInSelectedSchedule(scenePartId, direction);
      } else {
        void reorderSceneInSelectedSchedule(button.dataset.scheduleSceneId ?? "", direction);
      }
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='schedule-scene-split']").forEach((button) => {
    button.addEventListener("click", () => {
      void splitSceneInSelectedSchedule(button.dataset.scheduleSceneId ?? "");
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='schedule-scene-merge']").forEach((button) => {
    button.addEventListener("click", () => {
      void mergeSceneInSelectedSchedule(button.dataset.scheduleSceneId ?? "");
    });
  });
  root.querySelector<HTMLFormElement>("form[data-action='schedule-availability-add']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void addProductionAvailabilityWindow(event.currentTarget as HTMLFormElement);
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='schedule-availability-delete']").forEach((button) => {
    button.addEventListener("click", () => {
      void deleteProductionAvailabilityWindow(button.dataset.availabilityId ?? "");
    });
  });
  root.querySelector<HTMLButtonElement>("[data-action='export-project-directory']")?.addEventListener("click", () => {
    void exportProjectDirectory();
  });
  root.querySelector<HTMLButtonElement>("[data-action='export-call-sheet']")?.addEventListener("click", () => {
    void exportSelectedCallSheet();
  });
  root.querySelector<HTMLButtonElement>("[data-action='production-sides-markdown-export']")?.addEventListener("click", () => {
    void exportSelectedProductionSides("markdown");
  });
  root.querySelector<HTMLButtonElement>("[data-action='production-sides-html-export']")?.addEventListener("click", () => {
    void exportSelectedProductionSides("html");
  });
  root.querySelector<HTMLButtonElement>("[data-action='export-task-list']")?.addEventListener("click", () => {
    void exportSelectedTaskList();
  });
  root.querySelector<HTMLButtonElement>("[data-action='export-crew-directory']")?.addEventListener("click", () => {
    void exportSelectedCrewDirectory();
  });
  root.querySelector<HTMLButtonElement>("[data-action='export-gear-pull']")?.addEventListener("click", () => {
    void exportSelectedGearPull();
  });
  root.querySelector<HTMLButtonElement>("[data-action='export-budget-top-sheet']")?.addEventListener("click", () => {
    void exportSelectedBudgetTopSheet();
  });
  root.querySelector<HTMLButtonElement>("[data-action='export-selected-doc']")?.addEventListener("click", () => {
    void exportSelectedDocumentDraft();
  });
  root.querySelector<HTMLButtonElement>("[data-action='export-activity-log']")?.addEventListener("click", () => {
    void exportActivityLog();
  });
  root.querySelector<HTMLButtonElement>("[data-action='export-team-roster']")?.addEventListener("click", () => {
    void exportTeamRoster();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore']")?.addEventListener("click", () => {
    void restoreDryRun();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='create-project']").forEach((button) => {
    button.addEventListener("click", () => {
      state.ui.projectCreateOpen = true;
      state.ui.toast = null;
      render();
      root.querySelector<HTMLInputElement>("form[data-action='project-create-form'] input[name='title']")?.focus();
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='project-create-cancel']").forEach((button) => {
    button.addEventListener("click", () => {
      state.ui.projectCreateOpen = false;
      render();
    });
  });
  root.querySelector<HTMLElement>("[data-action='project-create-backdrop']")?.addEventListener("click", (event) => {
    if (event.target !== event.currentTarget) return;
    state.ui.projectCreateOpen = false;
    render();
  });
  root.querySelector<HTMLFormElement>("form[data-action='project-create-form']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    void createProjectFromTemplate(String(formData.get("title") ?? ""), String(formData.get("projectType") ?? ""));
  });
  root.querySelector<HTMLButtonElement>("[data-action='sync-dry-run']")?.addEventListener("click", () => {
    void syncQueuedOperations();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='restore-file-preview']").forEach((button) => {
    button.addEventListener("click", () => {
      void previewEncryptedBackup();
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='backup-r2-manifest']").forEach((button) => {
    button.addEventListener("click", () => {
      void previewStoredBackupManifest();
    });
  });
  root.querySelector<HTMLButtonElement>("[data-action='backup-r2-preview']")?.addEventListener("click", () => {
    void previewStoredBackupObject();
  });
  root.querySelector<HTMLButtonElement>("[data-action='planning-export-refresh']")?.addEventListener("click", () => {
    void refreshPlanningExportForReview();
  });
  root.querySelector<HTMLButtonElement>("[data-action='export-planning-view']")?.addEventListener("click", () => {
    void exportPlanningView();
  });
  root.querySelector<HTMLSelectElement>("[data-action='planning-kind-filter']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!isPlanningKindFilter(select.value)) return;
    state.ui.planningKindFilter = select.value;
    persistUi();
    render();
  });
  root.querySelector<HTMLButtonElement>("[data-action='worker-audit-manifest']")?.addEventListener("click", () => {
    void previewWorkerAuditManifest();
  });
  root.querySelector<HTMLFormElement>("[data-action='worker-audit-filter']")?.addEventListener("submit", (event) => {
    void handleWorkerAuditFilter(event);
  });
  root.querySelector<HTMLButtonElement>("[data-action='worker-audit-next']")?.addEventListener("click", (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    void previewWorkerAuditManifest(Number(button.dataset.offset ?? 0));
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-gate-check']")?.addEventListener("click", () => {
    void checkRestoreCommitGate();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-approval-record']")?.addEventListener("click", () => {
    void recordRestoreApproval();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-commit-storage-check']")?.addEventListener("click", () => {
    void checkRestoreCommitStorage();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-application-preflight-check']")?.addEventListener("click", () => {
    void checkRestoreApplicationPreflight();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-application-commit']")?.addEventListener("click", () => {
    void commitRestoreApplicationCoreRecords();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-attachment-package-check']")?.addEventListener("click", () => {
    void checkRestoreAttachmentPackageDryRun();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-attachment-package-verify']")?.addEventListener("click", () => {
    void checkRestoreAttachmentPackageVerificationDryRun();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-attachment-objects-plan']")?.addEventListener("click", () => {
    void checkRestoreAttachmentObjectPlanDryRun();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-attachment-objects-commit-preflight']")?.addEventListener("click", () => {
    void checkRestoreAttachmentObjectCommitPreflight();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-attachment-objects-commit']")?.addEventListener("click", () => {
    void commitRestoreAttachmentObjects();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-planning-check']")?.addEventListener("click", () => {
    void checkRestorePlanningDryRun();
  });
  root.querySelector<HTMLButtonElement>("[data-action='restore-planning-commit']")?.addEventListener("click", () => {
    void commitRestorePlanningRows();
  });
  root.querySelector<HTMLButtonElement>("[data-action='google-drive-sync-dry-run']")?.addEventListener("click", () => {
    void handleGoogleDriveSyncDryRun();
  });
  root.querySelector<HTMLButtonElement>("[data-action='google-connection-check']")?.addEventListener("click", () => {
    void handleGoogleConnectionCheck();
  });
  root.querySelector<HTMLButtonElement>("[data-action='google-connect']")?.addEventListener("click", () => {
    void handleGoogleConnect();
  });
  root.querySelector<HTMLButtonElement>("[data-action='google-disconnect']")?.addEventListener("click", () => {
    void handleGoogleDisconnect();
  });
  root.querySelector<HTMLButtonElement>("[data-action='google-drive-manifest']")?.addEventListener("click", () => {
    void handleGoogleDriveManifest();
  });
  root.querySelector<HTMLButtonElement>("[data-action='google-drive-manifest-next']")?.addEventListener("click", () => {
    void handleGoogleDriveManifest(true);
  });
  root.querySelector<HTMLButtonElement>("[data-action='meta-connection-check']")?.addEventListener("click", () => {
    void handleMetaConnectionCheck();
  });
  root.querySelector<HTMLButtonElement>("[data-action='meta-connect']")?.addEventListener("click", () => {
    void handleMetaConnect();
  });
  root.querySelector<HTMLButtonElement>("[data-action='meta-pages']")?.addEventListener("click", () => {
    void handleMetaPageCandidates();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='meta-select-page']").forEach((button) => {
    button.addEventListener("click", () => void handleMetaPageSelection(button.dataset.pageId ?? ""));
  });
  root.querySelector<HTMLButtonElement>("[data-action='meta-analytics']")?.addEventListener("click", () => {
    void handleMetaAnalytics();
  });
  root.querySelector<HTMLButtonElement>("[data-action='meta-disconnect']")?.addEventListener("click", () => {
    void handleMetaDisconnect();
  });
  root.querySelector<HTMLButtonElement>("[data-action='provider-runtime-readiness']")?.addEventListener("click", () => {
    void handleProviderRuntimeReadiness();
  });
  root.querySelector<HTMLButtonElement>("[data-action='sms-consent-manifest']")?.addEventListener("click", () => {
    void handleSmsConsentManifest();
  });
  root.querySelector<HTMLButtonElement>("[data-action='telnyx-provider-readiness']")?.addEventListener("click", () => {
    void handleTelnyxProviderReadiness();
  });
  root.querySelector<HTMLFormElement>("form[data-action='sms-consent-enroll']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleSmsConsentEnrollment(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLFormElement>("form[data-action='sms-send']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleSmsSend(event.currentTarget as HTMLFormElement);
  });
  root.querySelector<HTMLButtonElement>("[data-action='stripe-summary-readiness']")?.addEventListener("click", () => {
    void handleStripeSummaryReadiness();
  });
  root.querySelector<HTMLButtonElement>("[data-action='stripe-summary-fetch']")?.addEventListener("click", () => {
    void handleStripeSummaryFetch();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='permission-manifest']").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.permissionMode === "expired" ? "expired" : "active";
      void previewRecordPermissionManifest(state.ui.permissionScope, mode);
    });
  });
  root.querySelector<HTMLButtonElement>("[data-action='permission-history']")?.addEventListener("click", () => {
    void previewRecordPermissionHistory(state.ui.permissionScope);
  });
  root.querySelector<HTMLButtonElement>("[data-action='notion-import-folder']")?.addEventListener("click", () => {
    void importNotionFolder();
  });

  root.querySelector<HTMLButtonElement>("[data-action='notion-import-zip']")?.addEventListener("click", () => {
    void importNotionZip();
  });
  root.querySelector<HTMLButtonElement>("[data-action='screenplay-import']")?.addEventListener("click", () => {
    void importScreenplayFiles();
  });
  root.querySelector<HTMLButtonElement>("[data-action='screenplay-export']")?.addEventListener("click", () => {
    void exportSelectedScreenplayBreakdown();
  });
  root.querySelector<HTMLButtonElement>("[data-action='screenplay-revision-export']")?.addEventListener("click", () => {
    void exportSelectedScreenplayRevisionReport();
  });
  root.querySelector<HTMLButtonElement>("[data-action='screenplay-revision-carry-forward']")?.addEventListener("click", () => {
    void carryForwardSelectedScreenplayRevision();
  });
  root.querySelector<HTMLButtonElement>("[data-action='screenplay-element-report-markdown']")?.addEventListener("click", () => {
    void exportSelectedScreenplayElementReport("markdown");
  });
  root.querySelector<HTMLButtonElement>("[data-action='screenplay-element-report-csv']")?.addEventListener("click", () => {
    void exportSelectedScreenplayElementReport("csv");
  });
  root.querySelector<HTMLFormElement>("form[data-action='screenplay-search']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    applyScreenplaySearch(root.querySelector<HTMLInputElement>("#screenplay-search-input")?.value ?? "");
  });
  root.querySelector<HTMLButtonElement>("[data-action='screenplay-search-clear']")?.addEventListener("click", () => {
    clearScreenplaySearch();
  });
  root.querySelector<HTMLInputElement>("#screenplay-search-input")?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !state.ui.screenplaySearch) return;
    event.preventDefault();
    clearScreenplaySearch();
  });
  root.querySelector<HTMLFormElement>("form[data-action='screenplay-manual-element']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void addManualScreenplayElement(new FormData(event.currentTarget));
  });
  root.querySelector<HTMLSelectElement>("[data-action='screenplay-revision-select']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    state.ui.selectedScreenplayId = select.value;
    state.ui.selectedScreenplayBaseId = null;
    state.ui.selectedScreenplaySceneId = null;
    state.ui.screenplaySearch = "";
    state.screenplayElementClipboard = null;
    persistUi();
    render();
  });
  root.querySelector<HTMLSelectElement>("[data-action='screenplay-base-select']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement)) return;
    state.ui.selectedScreenplayBaseId = select.value || null;
    persistUi();
    render();
  });
  root.querySelector<HTMLSelectElement>("[data-action='screenplay-element-filter']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (!(select instanceof HTMLSelectElement) || !isScreenplayElementFilter(select.value)) return;
    state.ui.screenplayElementFilter = select.value;
    persistUi();
    render();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='screenplay-scene-order']").forEach((button) => {
    button.addEventListener("click", () => {
      const sceneOrder = button.dataset.screenplaySceneOrder;
      if (!isScreenplaySceneOrder(sceneOrder)) return;
      state.ui.screenplaySceneOrder = sceneOrder;
      persistUi();
      render();
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-screenplay-scene-id]:not([data-screenplay-review])").forEach((button) => {
    button.addEventListener("click", () => {
      state.ui.selectedScreenplaySceneId = button.dataset.screenplaySceneId ?? null;
      persistUi();
      render();
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-screenplay-review]").forEach((button) => {
    button.addEventListener("click", () => {
      const reviewState = button.dataset.screenplayReview;
      if (reviewState !== "confirmed" && reviewState !== "dismissed") return;
      void updateScreenplayElementReview(
        button.dataset.screenplaySceneId ?? "",
        button.dataset.screenplayElementId ?? "",
        reviewState,
      );
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-screenplay-occurrence-scene-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const sceneId = button.dataset.screenplayOccurrenceSceneId;
      if (!sceneId) return;
      state.ui.selectedScreenplaySceneId = sceneId;
      state.ui.screenplaySearch = "";
      state.ui.toast = `Opened ${button.dataset.screenplayOccurrenceElementName ?? "element"} occurrence in the screenplay.`;
      persistUi();
      render();
      const selectedScene = [...root.querySelectorAll<HTMLButtonElement>(".screenplay-scene-row")]
        .find((candidate) => candidate.dataset.screenplaySceneId === sceneId);
      selectedScene?.focus();
      selectedScene?.scrollIntoView({ block: "nearest" });
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='screenplay-element-apply-selected']").forEach((button) => {
    button.addEventListener("click", () => {
      void applyScreenplayElementToSelectedScene(button.dataset.screenplayElementId ?? "");
    });
  });
  root.querySelector<HTMLButtonElement>("[data-action='screenplay-elements-copy']")?.addEventListener("click", () => {
    copyVisibleScreenplayElements();
  });
  root.querySelector<HTMLButtonElement>("[data-action='screenplay-elements-paste']")?.addEventListener("click", () => {
    void pasteCopiedScreenplayElements();
  });
  root.querySelector<HTMLButtonElement>("[data-action='screenplay-elements-copy-clear']")?.addEventListener("click", () => {
    state.screenplayElementClipboard = null;
    state.ui.toast = "Copied screenplay elements cleared.";
    render();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='screenplay-element-merge']").forEach((button) => {
    button.addEventListener("click", () => {
      void mergeScreenplayElementDuplicate(
        button.dataset.screenplayElementTargetId ?? "",
        button.dataset.screenplayElementSourceId ?? "",
      );
    });
  });
  root.querySelectorAll<HTMLFormElement>("form[data-action='screenplay-element-category-move']").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void moveScreenplayElementCategory(new FormData(event.currentTarget));
    });
  });
  root.querySelector<HTMLButtonElement>("[data-action='attachments-store-r2']")?.addEventListener("click", () => {
    void storeStagedAttachmentsInR2();
  });
  root.querySelector<HTMLButtonElement>("[data-action='attachments-export-manifest']")?.addEventListener("click", () => {
    void previewStoredAttachmentExportManifest();
  });
  root.querySelector<HTMLButtonElement>("[data-action='attachments-download-latest']")?.addEventListener("click", () => {
    void downloadLatestStoredAttachment();
  });
  root.querySelector<HTMLButtonElement>("[data-action='attachments-package-dry-run']")?.addEventListener("click", () => {
    void packageStoredAttachmentsDryRun();
  });
  root.querySelector<HTMLButtonElement>("[data-action='attachments-package-download']")?.addEventListener("click", () => {
    void downloadStoredAttachmentPackageZip();
  });
  root.querySelector<HTMLFormElement>("[data-action='auth-request']")?.addEventListener("submit", (event) => {
    void handleMagicLinkRequest(event);
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='auth-open']").forEach((button) => {
    button.addEventListener("click", () => {
      const disclosure = root.querySelector<HTMLDetailsElement>("details.auth-disclosure");
      if (!disclosure) return;
      disclosure.open = true;
      disclosure.querySelector<HTMLInputElement>("input[name='email']")?.focus();
    });
  });
  root.querySelector<HTMLFormElement>("[data-action='invite-create']")?.addEventListener("submit", (event) => {
    void handleInviteCreate(event);
  });
  root.querySelector<HTMLButtonElement>("[data-action='invite-delivery-readiness']")?.addEventListener("click", () => {
    void handleInviteDeliveryReadiness();
  });
  root.querySelector<HTMLButtonElement>("[data-action='invite-manifest']")?.addEventListener("click", () => {
    void previewInviteManifest();
  });
  root.querySelector<HTMLButtonElement>("[data-action='invite-delivery-suppressions']")?.addEventListener("click", () => {
    void previewInviteDeliverySuppressions();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='invite-revoke']").forEach((button) => {
    button.addEventListener("click", () => {
      void handleInviteRevoke(button.dataset.inviteId ?? "");
    });
  });
  root.querySelector<HTMLFormElement>("[data-action='invite-accept']")?.addEventListener("submit", (event) => {
    void handleInviteAccept(event);
  });
  root.querySelectorAll<HTMLFormElement>("[data-action='member-status-update']").forEach((form) => {
    form.addEventListener("submit", (event) => {
      void handleMemberStatusUpdate(event);
    });
  });
  root.querySelectorAll<HTMLFormElement>("[data-action='membership-assign']").forEach((form) => {
    form.addEventListener("submit", (event) => {
      void handleProjectMembershipAssign(event);
    });
  });
  root.querySelector<HTMLButtonElement>("[data-action='project-membership-manifest']")?.addEventListener("click", () => {
    void previewProjectMembershipManifest();
  });
  root.querySelector<HTMLButtonElement>("[data-action='project-membership-history']")?.addEventListener("click", () => {
    void previewProjectMembershipHistory();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='project-membership-revoke']").forEach((button) => {
    button.addEventListener("click", () => {
      const projectId = button.dataset.projectId ?? "";
      const memberId = button.dataset.memberId ?? "";
      const role = button.dataset.role ?? "";
      void handleProjectMembershipRevoke(projectId, memberId, role);
    });
  });
  root.querySelector<HTMLSelectElement>("[data-action='record-owner-transfer'] select[name='entityType']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (select instanceof HTMLSelectElement && isOwnerTransferEntityType(select.value)) {
      resetOwnerTransferTarget({ entityType: select.value, entityId: "" });
      render();
    }
  });
  root.querySelector<HTMLSelectElement>("[data-action='record-owner-transfer'] select[name='entityId']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (select instanceof HTMLSelectElement) {
      resetOwnerTransferTarget({ entityType: state.ownerTransfer.entityType, entityId: select.value });
      render();
    }
  });
  root.querySelector<HTMLFormElement>("[data-action='record-owner-transfer']")?.addEventListener("submit", (event) => {
    void handleRecordOwnerTransfer(event);
  });
  root.querySelector<HTMLButtonElement>("[data-action='record-owner-manifest']")?.addEventListener("click", () => {
    void previewRecordOwnerManifest();
  });
  root.querySelector<HTMLButtonElement>("[data-action='record-owner-history']")?.addEventListener("click", () => {
    void previewRecordOwnerHistory();
  });
  root.querySelector<HTMLSelectElement>("[data-action='record-mutation-preflight'] select[name='mutation']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (select instanceof HTMLSelectElement && isRecordMutationKind(select.value)) {
      resetRecordMutationWorkflow(select.value);
      render();
    }
  });
  root.querySelector<HTMLFormElement>("[data-action='record-mutation-preflight']")?.addEventListener("submit", (event) => {
    void previewRecordMutationPreflight(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='record-mutation-request']")?.addEventListener("submit", (event) => {
    void handleRecordMutationRequest(event);
  });
  root.querySelector<HTMLButtonElement>("[data-action='record-mutation-request-manifest']")?.addEventListener("click", () => {
    void previewRecordMutationRequestManifest();
  });
  root.querySelector<HTMLFormElement>("[data-action='record-mutation-resolve']")?.addEventListener("submit", (event) => {
    void handleRecordMutationResolution(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='record-mutation-diff-preview']")?.addEventListener("submit", (event) => {
    void previewRecordMutationDiffForApply(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='record-mutation-apply']")?.addEventListener("submit", (event) => {
    void handleRecordMutationApply(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='record-mutation-audit-manifest']")?.addEventListener("submit", (event) => {
    void previewRecordMutationAuditManifest(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='record-mutation-rollback-request']")?.addEventListener("submit", (event) => {
    void handleRecordMutationRollbackRequest(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='record-mutation-delete-recovery']")?.addEventListener("submit", (event) => {
    void previewRecordMutationDeleteRecovery(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='film-profile-mutation-request']")?.addEventListener("submit", (event) => {
    void handleFilmProfileMutationRequest(event);
  });
  root.querySelector<HTMLButtonElement>("[data-action='film-profile-mutation-request-manifest']")?.addEventListener("click", () => {
    void previewFilmProfileMutationRequestManifest();
  });
  root.querySelector<HTMLFormElement>("[data-action='film-profile-mutation-resolve']")?.addEventListener("submit", (event) => {
    void handleFilmProfileMutationResolution(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='film-profile-mutation-diff-preview']")?.addEventListener("submit", (event) => {
    void previewFilmProfileMutationDiffForApply(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='film-profile-mutation-apply']")?.addEventListener("submit", (event) => {
    void handleFilmProfileMutationApply(event);
  });
  root.querySelector<HTMLSelectElement>("[data-action='record-comment-create'] select[name='entityType']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (select instanceof HTMLSelectElement && isRecordCommentEntityType(select.value)) {
      state.recordComment = {
        ...state.recordComment,
        entityType: select.value,
        entityId: "",
        status: "idle",
        persistence: null,
        auditPersistence: null,
        commentPolicy: null,
        targetLabel: null,
        bodyPreview: null,
        bodySha256: null,
      };
      state.recordCommentManifest = null;
      render();
    }
  });
  root.querySelector<HTMLSelectElement>("[data-action='record-comment-create'] select[name='entityId']")?.addEventListener("change", (event) => {
    const select = event.currentTarget;
    if (select instanceof HTMLSelectElement) {
      state.recordComment = {
        ...state.recordComment,
        entityId: select.value,
        status: "idle",
        persistence: null,
        auditPersistence: null,
        commentPolicy: null,
        targetLabel: null,
        bodyPreview: null,
        bodySha256: null,
      };
      state.recordCommentManifest = null;
      render();
    }
  });
  root.querySelector<HTMLFormElement>("[data-action='record-comment-create']")?.addEventListener("submit", (event) => {
    void handleRecordCommentCreate(event);
  });
  root.querySelector<HTMLButtonElement>("[data-action='record-comment-manifest']")?.addEventListener("click", () => {
    void previewRecordCommentManifest();
  });
  root.querySelectorAll<HTMLFormElement>("[data-action='permission-assign']").forEach((form) => {
    form.addEventListener("submit", (event) => {
      void handlePermissionAssign(event);
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='record-permission-revoke']").forEach((button) => {
    button.addEventListener("click", () => {
      void handleRecordPermissionRevoke(button.dataset.permissionId ?? "");
    });
  });
  root.querySelector<HTMLButtonElement>("[data-action='auth-verify']")?.addEventListener("click", () => {
    void handleMagicLinkVerify();
  });
  root.querySelector<HTMLButtonElement>("[data-action='auth-sign-out']")?.addEventListener("click", () => {
    void handleSignOut();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-integration]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.integration;
      if (isIntegrationKey(key)) {
        state.ui.inspectorTab = "details";
        state.ui.inspectorView = "integrations";
        persistUi();
        void handleProviderDryRun(key);
      }
    });
  });

  root.querySelector<HTMLButtonElement>("[data-action='integrations-open']")?.addEventListener("click", () => {
    state.ui.inspectorTab = "details";
    state.ui.inspectorView = "integrations";
    persistUi();
    render();
  });

  root.querySelectorAll<HTMLButtonElement>(".doc-row-button[data-doc-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.ui.selectedDocId = button.dataset.docId ?? state.ui.selectedDocId;
      persistUi();
      render();
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-open-doc]").forEach((button) => {
    button.addEventListener("click", () => {
      state.ui.selectedDocId = button.dataset.openDoc ?? null;
      state.ui.workspaceSection = "docs";
      persistUi();
      render();
    });
  });

  root.querySelector<HTMLFormElement>("[data-action='add-task']")?.addEventListener("submit", (event) => {
    void handleAddTask(event);
  });
  root.querySelectorAll<HTMLFormElement>("[data-action='contextual-record-update']").forEach((form) => {
    form.addEventListener("submit", (event) => {
      void handleContextualRecordUpdate(event);
    });
  });
  root.querySelector<HTMLFormElement>("[data-action='project-inline-update']")?.addEventListener("submit", (event) => {
    void handleProjectInlineUpdate(event);
  });
  root.querySelectorAll<HTMLElement>("[data-contextual-autosave]").forEach((control) => {
    control.addEventListener("change", () => {
      control.closest<HTMLFormElement>("form")?.requestSubmit();
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-action='task-complete']").forEach((button) => {
    button.addEventListener("click", () => {
      void handleCompleteTask(button.dataset.taskId ?? "");
    });
  });
  root.querySelector<HTMLFormElement>("[data-action='add-doc']")?.addEventListener("submit", (event) => {
    void handleAddDoc(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='add-person']")?.addEventListener("submit", (event) => {
    void handleAddPerson(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='add-equipment']")?.addEventListener("submit", (event) => {
    void handleAddEquipment(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='add-expense']")?.addEventListener("submit", (event) => {
    void handleAddExpense(event);
  });
  root.querySelector<HTMLFormElement>("[data-action='doc-save']")?.addEventListener("submit", (event) => {
    void handleSaveDocumentDraft(event);
  });
}

async function handleAddTask(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;
  const input = form.elements.namedItem("title") as HTMLInputElement | null;
  const dueInput = form.elements.namedItem("due") as HTMLInputElement | null;
  const title = input?.value.trim();
  if (!title) return;

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) return;

  const task = createTask(title, dueInput?.value ?? "");
  project.openTasks.unshift(task);
  project.tasks.total += 1;
  state.workspace.auditLog.unshift(createAuditEvent(`Task created: ${task.title}`, "Alonso", "teal"));
  await persistWorkspace(
    createOperation(state.workspace.id, "task.created", "task", task.id, `Task created: ${task.title}`, {
      projectId: project.id,
      title: task.title,
      dueAt: task.due,
    }),
  );
  state.ui.toast = "Task added to the IndexedDB operation log.";
  render();
}

async function handleContextualRecordUpdate(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const recordId = form.dataset.recordId ?? "";
  const kind = form.dataset.recordKind;
  if (!project || !recordId) return;

  const formData = new FormData(form);
  let summary = "";
  let tone: "teal" | "blue" | "amber" = "teal";
  let operationPayload: Record<string, unknown> = { projectId: project.id };

  if (kind === "task") {
    const task = project.openTasks.find((candidate) => candidate.id === recordId);
    const title = String(formData.get("title") ?? "").trim().slice(0, 160);
    const due = String(formData.get("due") ?? "").trim().slice(0, 80);
    const status = String(formData.get("status") ?? "");
    if (!task || !title || !isLocalTaskStatus(status)) return;
    task.title = title;
    task.due = due || "TBD";
    task.status = status;
    summary = `Task updated: ${task.title}`;
    operationPayload = { ...operationPayload, title: task.title, dueAt: task.due, status: task.status };
  } else if (kind === "person") {
    const person = project.people.find((candidate) => candidate.id === recordId);
    const name = String(formData.get("name") ?? "").trim().slice(0, 120);
    const role = String(formData.get("role") ?? "").trim().slice(0, 80);
    if (!person || !name) return;
    person.name = name;
    person.role = role || "Crew";
    person.initials = initialsFor(name);
    summary = `Person updated: ${person.name}`;
    operationPayload = { ...operationPayload, name: person.name, role: person.role, initials: person.initials, sensitive: true };
  } else if (kind === "equipment") {
    const item = project.equipment.find((candidate) => candidate.id === recordId);
    const name = String(formData.get("name") ?? "").trim().slice(0, 120);
    const status = String(formData.get("status") ?? "").trim().slice(0, 80);
    if (!item || !name) return;
    item.name = name;
    item.status = status || "Planned";
    item.statusTone = equipmentToneFromType(item.status);
    summary = `Equipment updated: ${item.name}`;
    tone = "blue";
    operationPayload = { ...operationPayload, name: item.name, status: item.status, statusTone: item.statusTone };
  } else if (kind === "expense") {
    const expense = project.expenses.find((candidate) => candidate.id === recordId);
    const category = String(formData.get("category") ?? "").trim().slice(0, 80);
    const spent = contextualMoneyValue(formData.get("spent"));
    const budget = contextualMoneyValue(formData.get("budget"));
    if (!expense || !category || spent === null || budget === null) return;
    const spentDelta = spent - expense.spent;
    const budgetDelta = budget - expense.budget;
    expense.category = category;
    expense.spent = spent;
    expense.budget = budget;
    expense.percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
    project.spentBudget = Math.max(0, project.spentBudget + spentDelta);
    project.totalBudget = Math.max(0, project.totalBudget + budgetDelta);
    summary = `Expense updated: ${expense.category}`;
    tone = "amber";
    operationPayload = { ...operationPayload, category: expense.category, spent, budget, percent: expense.percent, sensitive: true };
  } else {
    return;
  }

  state.workspace.auditLog.unshift(createAuditEvent(summary, "Alonso", tone));
  await persistWorkspace(
    createOperation(state.workspace.id, `${kind}.updated`, kind, recordId, summary, operationPayload),
  );
  state.ui.toast = `${summary} Saved locally.`;
  render();
}

async function handleProjectInlineUpdate(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const project = getProjectById(state.workspace, form.dataset.projectId ?? "");
  if (!project) return;
  const formData = new FormData(form);
  const phase = String(formData.get("phase") ?? "");
  const shootDates = String(formData.get("shootDates") ?? "").trim().slice(0, 120);
  const location = String(formData.get("location") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const totalBudget = contextualMoneyValue(formData.get("totalBudget"));
  if (!isLocalProjectPhase(phase) || totalBudget === null) return;

  project.phase = phase;
  project.phaseTone = projectPhaseTone(phase);
  project.shootDates = shootDates || "TBD";
  project.totalBudget = totalBudget;
  project.location = location || "TBD";
  project.description = description;
  const summary = `Project details updated: ${project.title}`;
  state.workspace.auditLog.unshift(createAuditEvent(summary, "Alonso", "blue"));
  await persistWorkspace(
    createOperation(state.workspace.id, "project.updated", "project", project.id, summary, {
      phase: project.phase,
      shootDates: project.shootDates,
      totalBudget: project.totalBudget,
      location: project.location,
      description: project.description,
      sensitive: true,
    }),
  );
  state.ui.toast = "Project details saved locally.";
  render();
}

function contextualMoneyValue(value: FormDataEntryValue | null): number | null {
  const numeric = Number.parseFloat(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric * 100) / 100 : null;
}

async function handleCompleteTask(taskId: string): Promise<void> {
  const project = state.workspace.projects.find((candidate) => candidate.openTasks.some((task) => task.id === taskId));
  const taskIndex = project?.openTasks.findIndex((candidate) => candidate.id === taskId) ?? -1;
  if (!project || taskIndex < 0) return;

  const [task] = project.openTasks.splice(taskIndex, 1);
  if (!task) return;

  project.tasks.done = Math.min(project.tasks.total, project.tasks.done + 1);
  if (state.taskPermission.taskId === task.id) {
    state.taskPermission.taskId = project.openTasks[0]?.id ?? "";
  }
  state.workspace.auditLog.unshift(createAuditEvent(`Task completed: ${task.title}`, "Alonso", "teal"));
  await persistWorkspace(
    createOperation(state.workspace.id, "task.completed", "task", task.id, `Task completed: ${task.title}`, {
      projectId: project.id,
      title: task.title,
      previousStatus: task.status,
      completedAt: new Date().toISOString(),
    }),
  );
  state.ui.toast = "Task completed and queued in the IndexedDB operation log.";
  render();
}

async function handleAddDoc(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;
  const input = form.elements.namedItem("name") as HTMLInputElement | null;
  const name = input?.value.trim();
  if (!name) return;

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) return;

  const doc = createProjectDoc(name);
  project.docs.unshift(doc);
  state.ui.selectedDocId = doc.id;
  state.workspace.auditLog.unshift(createAuditEvent(`Document created: ${doc.name}`, "Alonso", "blue"));
  await persistWorkspace(
    createOperation(state.workspace.id, "document.created", "document", doc.id, `Document created: ${doc.name}`, {
      projectId: project.id,
      name: doc.name,
      type: doc.type,
    }),
  );
  state.ui.toast = "Document draft added to the local operation log.";
  render();
}

async function handleAddPerson(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;
  const nameInput = form.elements.namedItem("name") as HTMLInputElement | null;
  const roleInput = form.elements.namedItem("role") as HTMLInputElement | null;
  const name = nameInput?.value.trim() ?? "";
  const role = roleInput?.value.trim() ?? "";
  if (!name) return;

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) return;

  const person = createProjectPerson(name, role);
  project.people.unshift(person);
  state.workspace.auditLog.unshift(createAuditEvent(`Person added: ${person.name}`, "Alonso", "teal"));
  await persistWorkspace(
    createOperation(state.workspace.id, "person.created", "person", person.id, `Person created: ${person.name}`, {
      projectId: project.id,
      name: person.name,
      role: person.role,
      initials: person.initials,
      sensitive: true,
    }),
  );
  state.ui.toast = "Person added to the local operation log.";
  render();
}

async function handleAddEquipment(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;
  const nameInput = form.elements.namedItem("name") as HTMLInputElement | null;
  const statusInput = form.elements.namedItem("status") as HTMLInputElement | null;
  const name = nameInput?.value.trim() ?? "";
  const status = statusInput?.value.trim() ?? "";
  if (!name) return;

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) return;

  const item = createEquipmentItem(name, status);
  project.equipment.unshift(item);
  state.workspace.auditLog.unshift(createAuditEvent(`Equipment added: ${item.name}`, "Alonso", "blue"));
  await persistWorkspace(
    createOperation(state.workspace.id, "equipment.created", "equipment", item.id, `Equipment created: ${item.name}`, {
      projectId: project.id,
      name: item.name,
      status: item.status,
      statusTone: item.statusTone,
    }),
  );
  state.ui.toast = "Equipment added to the local operation log.";
  render();
}

async function handleAddExpense(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;
  const categoryInput = form.elements.namedItem("category") as HTMLInputElement | null;
  const spentInput = form.elements.namedItem("spent") as HTMLInputElement | null;
  const budgetInput = form.elements.namedItem("budget") as HTMLInputElement | null;
  const category = categoryInput?.value.trim() ?? "";
  if (!category) return;

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) return;

  const spent = Number.parseFloat(spentInput?.value ?? "0");
  const budget = Number.parseFloat(budgetInput?.value ?? "0");
  const expense = createExpenseLine(category, spent, budget);
  project.expenses.unshift(expense);
  project.spentBudget += expense.spent;
  state.workspace.auditLog.unshift(createAuditEvent(`Expense added: ${expense.category}`, "Alonso", "amber"));
  await persistWorkspace(
    createOperation(state.workspace.id, "expense.created", "expense", expense.id, `Expense created: ${expense.category}`, {
      projectId: project.id,
      category: expense.category,
      spent: expense.spent,
      budget: expense.budget,
      percent: expense.percent,
      sensitive: true,
    }),
  );
  state.ui.toast = "Expense added to the local operation log.";
  render();
}

async function handleSaveDocumentDraft(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;
  const docId = form.dataset.docId ?? "";
  const markdownInput = form.elements.namedItem("markdown") as HTMLTextAreaElement | null;
  const markdownSnapshot = markdownInput?.value ?? "";
  if (markdownSnapshot.length > 64 * 1024) {
    state.ui.toast = "Document draft is too large for local sync metadata.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const doc = project?.docs.find((candidate) => candidate.id === docId);
  if (!project || !doc || doc.type !== "MD") {
    state.ui.toast = "Select a Markdown document before saving.";
    render();
    return;
  }

  doc.markdownSnapshot = markdownSnapshot;
  doc.date = "Draft saved";
  state.workspace.auditLog.unshift(createAuditEvent(`Document draft saved: ${doc.name}`, "Alonso", "blue"));
  const operation = createOperation(state.workspace.id, "document.updated", "document", doc.id, `Document updated: ${doc.name}`, {
    projectId: project.id,
    name: doc.name,
    markdownLength: markdownSnapshot.length,
  });
  await persistWorkspace(operation);
  const csrfToken = state.auth.session?.csrfToken;
  if (csrfToken && doc.canonicalUpdatedAt) {
    try {
      const result = await saveCanonicalDocumentMarkdown(WORKER_URL, csrfToken, {
        workspaceId: state.workspace.id,
        projectId: project.id,
        documentId: doc.id,
        markdownSnapshot,
        expectedUpdatedAt: doc.canonicalUpdatedAt,
      });
      doc.canonicalUpdatedAt = result.updatedAt;
      await persistWorkspace();
      state.ui.toast = "Document draft saved locally and to the canonical workspace.";
    } catch (error) {
      state.ui.toast = `Document kept locally; canonical save blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
    }
  } else {
    state.ui.toast = "Document draft saved locally and queued until its canonical record is available.";
  }
  render();
}

async function handleMagicLinkRequest(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const input = form.elements.namedItem("email") as HTMLInputElement | null;
  const email = input?.value.trim() ?? "";
  if (!email) return;

  state.auth = {
    ...state.auth,
    email,
    status: "requesting",
    emailHash: null,
    devOnlyToken: null,
    session: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await requestMagicLink(WORKER_URL, email);
    state.auth = {
      email,
      status: "link_requested",
      emailHash: result.emailHash,
      devOnlyToken: result.devOnlyToken,
      session: null,
    };
    state.ui.toast = result.devOnlyToken
      ? "Dry-run magic link created by the Worker."
      : "Check your email for a one-time Film sign-in link.";
  } catch (error) {
    state.auth = {
      email,
      status: "signed_out",
      emailHash: null,
      devOnlyToken: null,
      session: null,
    };
    state.ui.toast = `Magic link blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function initializeAuthenticatedWorkspace(): Promise<void> {
  const inviteToken = consumeSensitiveLinkToken("inviteToken");
  if (inviteToken) {
    state.invite.acceptToken = inviteToken;
    state.ui.toast = "Invite token loaded. Add your display name to accept it.";
    render();
  }
  if (await handleMagicLinkFromUrl()) return;
  const googleOutcome = consumeGoogleOAuthOutcome();
  const metaOutcome = consumeMetaOAuthOutcome();
  await resumeStoredSession();
  if (googleOutcome) await applyGoogleOAuthOutcome(googleOutcome);
  if (metaOutcome) await applyMetaOAuthOutcome(metaOutcome);
}

function consumeGoogleOAuthOutcome(): { outcome: "connected" | "error"; code: string | null } | null {
  const url = new URL(window.location.href);
  const outcome = url.searchParams.get("google");
  if (outcome !== "connected" && outcome !== "error") return null;
  const code = url.searchParams.get("code");
  url.searchParams.delete("google");
  url.searchParams.delete("code");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  return { outcome, code };
}

async function applyGoogleOAuthOutcome(result: { outcome: "connected" | "error"; code: string | null }): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = result.outcome === "connected"
      ? "Google connected. Sign in again to load the workspace connection."
      : "Google connection was not completed.";
    render();
    return;
  }
  try {
    const [connection, provider] = await Promise.all([
      checkGoogleConnection(WORKER_URL, csrfToken, state.workspace.id),
      runProviderDryRun(WORKER_URL, "google", csrfToken),
    ]);
    state.googleConnection = { ...connection, checkedAt: new Date().toISOString() };
    state.providerPreview = { ...provider, checkedAt: new Date().toISOString() };
    state.workspace.auditLog.unshift(createAuditEvent(
      result.outcome === "connected" ? "Google connected" : "Google connection failed",
      "System",
      result.outcome === "connected" ? "teal" : "amber",
    ));
    await persistWorkspace();
    state.ui.toast = result.outcome === "connected" && connection.connection?.status === "active"
      ? "Google connected to this workspace."
      : googleOAuthErrorMessage(result.code);
  } catch (error) {
    state.ui.toast = `Google callback check blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

function googleOAuthErrorMessage(code: string | null): string {
  if (code === "state_expired") return "Google connection expired before completion. Start again.";
  if (code === "session_mismatch" || code === "session_invalid") return "Google connection did not match the active Film session.";
  if (code === "oauth_not_available") return "Google connection is not enabled on the Worker.";
  return "Google connection was not completed.";
}

function consumeMetaOAuthOutcome(): { outcome: "connected" | "error"; code: string | null } | null {
  const url = new URL(window.location.href);
  const outcome = url.searchParams.get("meta");
  if (outcome !== "connected" && outcome !== "error") return null;
  const code = url.searchParams.get("code");
  url.searchParams.delete("meta");
  url.searchParams.delete("code");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  return { outcome, code };
}

async function applyMetaOAuthOutcome(result: { outcome: "connected" | "error"; code: string | null }): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = result.outcome === "connected"
      ? "Meta connected. Sign in again to finish Page selection."
      : "Meta connection was not completed.";
    render();
    return;
  }
  try {
    const [connection, provider] = await Promise.all([
      checkMetaConnection(WORKER_URL, csrfToken, state.workspace.id),
      runProviderDryRun(WORKER_URL, "social", csrfToken),
    ]);
    state.metaConnection = { ...connection, checkedAt: new Date().toISOString() };
    state.providerPreview = { ...provider, checkedAt: new Date().toISOString() };
    if (result.outcome === "connected" && connection.connection?.status === "pending_page_selection") {
      const candidates = await fetchMetaPageCandidates(WORKER_URL, csrfToken, state.workspace.id);
      state.metaPageCandidates = { ...candidates, checkedAt: new Date().toISOString() };
    }
    state.workspace.auditLog.unshift(createAuditEvent(
      result.outcome === "connected" ? "Meta connected; Page selection required" : "Meta connection failed",
      "System",
      result.outcome === "connected" ? "teal" : "amber",
    ));
    await persistWorkspace();
    state.ui.toast = result.outcome === "connected" && connection.connection?.status === "pending_page_selection"
      ? "Meta authorized. Select the Big Sword Page to enable read-only analytics."
      : metaOAuthErrorMessage(result.code);
  } catch (error) {
    state.ui.toast = `Meta callback check blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

function metaOAuthErrorMessage(code: string | null): string {
  if (code === "state_expired") return "Meta connection expired before completion. Start again.";
  if (code === "session_mismatch" || code === "session_invalid") return "Meta connection did not match the active Film session.";
  if (code === "oauth_not_available") return "Meta connection is not enabled on the Worker.";
  if (code === "exchange_failed") return "Meta authorization was rejected or returned an unexpected permission set.";
  return "Meta connection was not completed.";
}

async function handleMagicLinkFromUrl(): Promise<boolean> {
  const token = consumeSensitiveLinkToken("magicLinkToken");
  if (!token) return false;
  state.auth.status = "verifying";
  state.ui.toast = "Verifying one-time sign-in link...";
  render();

  try {
    const session = await verifyMagicLink(WORKER_URL, token);
    state.auth = {
      email: "",
      status: "signed_in",
      emailHash: null,
      devOnlyToken: null,
      session,
    };
    persistAuthSession(session);
    state.workspace.auditLog.unshift(createAuditEvent("Session verified", "System", "teal"));
    state.ui.toast = await hydrateCanonicalWorkspace()
      ? "Signed in and loaded the canonical workspace."
      : "Signed in; canonical workspace refresh is temporarily unavailable.";
  } catch (error) {
    clearPersistedAuthSession();
    state.auth.status = "signed_out";
    state.ui.toast = `Sign-in link blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
  return true;
}

function consumeSensitiveLinkToken(name: "magicLinkToken" | "inviteToken"): string {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const token = (hashParams.get(name) ?? url.searchParams.get(name) ?? "").trim();
  if (!token) return "";

  hashParams.delete(name);
  url.searchParams.delete(name);
  const nextHash = hashParams.toString();
  window.history.replaceState({}, "", `${url.pathname}${url.search}${nextHash ? `#${nextHash}` : ""}`);
  return token;
}

async function handleMagicLinkVerify(): Promise<void> {
  if (!state.auth.devOnlyToken) {
    state.ui.toast = "No dry-run magic link is ready.";
    render();
    return;
  }

  state.auth.status = "verifying";
  state.ui.toast = null;
  render();

  try {
    const session = await verifyMagicLink(WORKER_URL, state.auth.devOnlyToken);
    state.auth = {
      email: state.auth.email,
      status: "signed_in",
      emailHash: null,
      devOnlyToken: null,
      session,
    };
    persistAuthSession(session);
    state.workspace.auditLog.unshift(createAuditEvent("Dry-run session verified", "System", "teal"));
    state.ui.toast = await hydrateCanonicalWorkspace()
      ? "Dry-run owner session verified and workspace refreshed."
      : "Dry-run owner session verified; workspace refresh is unavailable.";
  } catch (error) {
    clearPersistedAuthSession();
    state.auth.status = "link_requested";
    state.ui.toast = `Verification blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleSignOut(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;

  try {
    if (csrfToken) {
      await logoutSession(WORKER_URL, csrfToken);
    }
    state.ui.toast = "Signed out of Film.";
  } catch (error) {
    state.ui.toast = `Local session cleared; Worker sign-out failed: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }

  clearPersistedAuthSession();

  state.auth = {
    email: state.auth.email,
    status: "signed_out",
    emailHash: null,
    devOnlyToken: null,
    session: null,
  };
  render();
}

async function resumeStoredSession(): Promise<void> {
  const stored = readPersistedAuthSession();
  if (!stored) return;

  state.auth.status = "verifying";
  state.ui.toast = "Restoring the signed-in workspace...";
  render();
  try {
    const metadata = await readSessionMetadata(WORKER_URL);
    if (!metadata || metadata.id !== stored.id || Date.parse(metadata.expiresAt) < Date.now()) {
      throw new Error("stored_session_expired");
    }
    const session: FilmSession = {
      id: metadata.id,
      role: metadata.role,
      csrfToken: stored.csrfToken,
      expiresAt: metadata.expiresAt,
    };
    state.auth = {
      email: "",
      status: "signed_in",
      emailHash: null,
      devOnlyToken: null,
      session,
    };
    persistAuthSession(session);
    state.ui.toast = await hydrateCanonicalWorkspace()
      ? "Signed-in workspace restored."
      : "Session restored; canonical workspace refresh is temporarily unavailable.";
  } catch {
    clearPersistedAuthSession();
    state.auth = {
      email: "",
      status: "signed_out",
      emailHash: null,
      devOnlyToken: null,
      session: null,
    };
    state.ui.toast = "The previous Film session expired. Sign in again.";
  }
  render();
}

async function hydrateCanonicalWorkspace(): Promise<boolean> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) return false;
  try {
    const snapshot = await readCanonicalWorkspaceSnapshot(WORKER_URL, csrfToken, state.workspace.id);
    state.workspace = reconcileCanonicalWorkspace(state.workspace, snapshot, state.operations);
    state.operations = await persistLocalMirror(state.workspace);
    state.planningRows = collectLocalPlanningRows(state.operations);
    if (!state.workspace.projects.some((project) => project.id === state.ui.selectedProjectId)) {
      state.ui.selectedProjectId = state.workspace.projects[0]?.id ?? "";
    }
    const selectedProject = getProjectById(state.workspace, state.ui.selectedProjectId);
    if (!selectedProject?.docs.some((document) => document.id === state.ui.selectedDocId)) {
      state.ui.selectedDocId = selectedProject?.docs[0]?.id ?? null;
    }
    persistUi();
    return true;
  } catch {
    return false;
  }
}

function persistAuthSession(session: FilmSession): void {
  try {
    sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Session remains valid in memory when browser storage is unavailable.
  }
}

function readPersistedAuthSession(): FilmSession | null {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<FilmSession>;
    if (
      typeof value.id !== "string"
      || typeof value.role !== "string"
      || typeof value.csrfToken !== "string"
      || value.csrfToken.length < 12
      || typeof value.expiresAt !== "string"
      || Date.parse(value.expiresAt) < Date.now()
    ) {
      clearPersistedAuthSession();
      return null;
    }
    return value as FilmSession;
  } catch {
    clearPersistedAuthSession();
    return null;
  }
}

function clearPersistedAuthSession(): void {
  try {
    sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // Browser storage cleanup is best effort after local state is cleared.
  }
}

async function handleInviteCreate(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before creating invites.";
    render();
    return;
  }

  const emailInput = form.elements.namedItem("email") as HTMLInputElement | null;
  const roleSelect = form.elements.namedItem("role") as HTMLSelectElement | null;
  const email = emailInput?.value.trim() ?? "";
  const role = roleSelect?.value ?? state.invite.role;
  if (!email || !isWorkspaceRole(role)) {
    state.ui.toast = "Invite blocked: invalid email or role.";
    render();
    return;
  }

  state.invite = {
    ...state.invite,
    email,
    role,
    status: "creating",
    emailHash: null,
    devOnlyToken: null,
    persistence: null,
    deliveryPersistence: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await createWorkspaceInvite(WORKER_URL, state.workspace.id, email, role, csrfToken);
    state.invite = {
      ...state.invite,
      email,
      role: result.invite.role,
      status: "created",
      emailHash: result.invite.emailHash,
      devOnlyToken: result.invite.devOnlyInviteToken,
      persistence: result.persistence,
      deliveryPersistence: result.deliveryPersistence ?? null,
      acceptToken: result.invite.devOnlyInviteToken ?? "",
    };
    state.workspace.auditLog.unshift(createAuditEvent(`Invite created: ${formatWorkspaceRole(result.invite.role)}`, "System", "blue"));
    await persistWorkspace();
    state.ui.toast = result.delivery === "sent_live"
      ? "Invite email sent by the Worker."
      : "Dry-run invite created by the Worker.";
  } catch (error) {
    state.invite = {
      ...state.invite,
      email,
      role,
      status: "idle",
      emailHash: null,
      devOnlyToken: null,
      persistence: null,
      deliveryPersistence: null,
    };
    state.ui.toast = `Invite blocked: ${inviteCreationErrorMessage(error)}`;
  }
  render();
}

function inviteCreationErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Worker unavailable";
  if (message === "invite_delivery_suppressed") {
    return "recipient has a delivery suppression on file.";
  }
  return message;
}

async function handleInviteDeliveryReadiness(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before checking invite delivery.";
    render();
    return;
  }

  try {
    const result = await checkInviteDeliveryReadiness(WORKER_URL, state.workspace.id, csrfToken);
    state.inviteDelivery = {
      ...result.readiness,
      persistence: result.persistence,
      checkedAt: new Date().toISOString(),
    };
    state.workspace.auditLog.unshift(createAuditEvent("Invite delivery readiness checked", "System", "blue"));
    await persistWorkspace();
    state.ui.toast = "Invite delivery readiness checked by the Worker.";
  } catch (error) {
    state.ui.toast = `Invite delivery readiness blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewInviteManifest(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing pending invites.";
    render();
    return;
  }

  try {
    const manifest = await exportWorkspaceInviteManifest(WORKER_URL, state.workspace.id, 50, csrfToken);
    state.inviteManifest = {
      checkedAt: new Date().toISOString(),
      persistence: manifest.persistence,
      auditPersistence: manifest.auditPersistence ?? null,
      manifestPolicy: manifest.manifestPolicy,
      rowCount: manifest.rowCount,
      truncated: manifest.truncated,
      invites: manifest.invites,
    };
    state.workspace.auditLog.unshift(createAuditEvent(`Pending invite manifest: ${manifest.rowCount} invites`, "System", "blue"));
    await persistWorkspace();
    state.ui.toast = `Pending invite manifest ready: ${manifest.rowCount} invites${manifest.truncated ? " (truncated)" : ""}.`;
  } catch (error) {
    state.ui.toast = `Pending invite review blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewInviteDeliverySuppressions(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing delivery suppressions.";
    render();
    return;
  }

  try {
    const manifest = await exportInviteDeliverySuppressions(WORKER_URL, state.workspace.id, 50, csrfToken);
    state.inviteDeliverySuppressions = {
      checkedAt: new Date().toISOString(),
      persistence: manifest.persistence,
      auditPersistence: manifest.auditPersistence ?? null,
      manifestPolicy: manifest.manifestPolicy,
      rowCount: manifest.rowCount,
      truncated: manifest.truncated,
      suppressions: manifest.suppressions,
    };
    state.workspace.auditLog.unshift(createAuditEvent(`Invite delivery suppressions: ${manifest.rowCount} rows`, "System", "blue"));
    await persistWorkspace();
    state.ui.toast = `Invite delivery suppressions ready: ${manifest.rowCount} rows${manifest.truncated ? " (truncated)" : ""}.`;
  } catch (error) {
    state.ui.toast = `Invite delivery suppressions blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleInviteRevoke(inviteId: string): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before revoking invites.";
    render();
    return;
  }

  const invite = state.inviteManifest?.invites.find((candidate) => candidate.id === inviteId);
  if (!invite) {
    state.ui.toast = "Invite revoke blocked: no selected pending invite.";
    render();
    return;
  }

  state.inviteRevokingId = inviteId;
  state.ui.toast = null;
  render();

  try {
    const result = await revokeWorkspaceInvite(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        inviteId: invite.id,
        emailHash: invite.emailHash,
        role: invite.role,
      },
      csrfToken,
    );
    if (state.inviteManifest) {
      state.inviteManifest = {
        ...state.inviteManifest,
        checkedAt: new Date().toISOString(),
        persistence: result.persistence,
        auditPersistence: result.auditPersistence ?? state.inviteManifest.auditPersistence,
        rowCount: Math.max(0, state.inviteManifest.rowCount - 1),
        invites: state.inviteManifest.invites.filter((candidate) => candidate.id !== result.invite.id),
      };
    }
    state.workspace.auditLog.unshift(
      createAuditEvent(
        `Pending invite revoked: ${formatWorkspaceRole(result.invite.role)} ${shortHash(result.invite.emailHash)}`,
        "System",
        "amber",
      ),
    );
    await persistWorkspace();
    state.ui.toast = `Pending invite revoked for ${shortHash(result.invite.emailHash)}.`;
  } catch (error) {
    state.ui.toast = `Invite revoke blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  } finally {
    state.inviteRevokingId = null;
    render();
  }
}

async function handleInviteAccept(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const tokenInput = form.elements.namedItem("inviteToken") as HTMLInputElement | null;
  const displayNameInput = form.elements.namedItem("displayName") as HTMLInputElement | null;
  const token = tokenInput?.value.trim() ?? "";
  const displayName = displayNameInput?.value.trim() ?? "";
  if (!token || !displayName) {
    state.ui.toast = "Invite acceptance blocked: missing token or display name.";
    render();
    return;
  }

  state.invite = {
    ...state.invite,
    acceptToken: token,
    acceptDisplayName: displayName,
    status: "accepting",
    acceptedRole: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await acceptWorkspaceInvite(WORKER_URL, token, displayName);
    upsertAcceptedMember(result.member, displayName);
    state.invite = {
      ...state.invite,
      status: "accepted",
      acceptToken: "",
      acceptDisplayName: displayName,
      acceptedRole: result.member.role,
      persistence: result.persistence,
    };
    state.workspace.auditLog.unshift(createAuditEvent(`Invite accepted: ${displayName}`, "System", "teal"));
    await persistWorkspace();
    state.ui.toast = "Invite accepted. Membership is active for magic-link sign-in.";
  } catch (error) {
    state.invite = {
      ...state.invite,
      acceptToken: token,
      acceptDisplayName: displayName,
      status: "idle",
      acceptedRole: null,
    };
    state.ui.toast = `Invite acceptance blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

function upsertAcceptedMember(
  member: {
    id: string;
    emailHash: string;
    role: WorkspaceRole;
    status: "active";
  },
  displayName: string,
): void {
  const updated = {
    id: member.id,
    displayName,
    emailHash: member.emailHash,
    role: member.role,
    status: member.status,
    lastSeenAt: new Date().toISOString(),
  };
  const index = state.workspace.members.findIndex((candidate) =>
    candidate.id === member.id || candidate.emailHash === member.emailHash
  );
  if (index >= 0) {
    state.workspace.members[index] = updated;
    return;
  }
  state.workspace.members.unshift(updated);
}

async function handleMemberStatusUpdate(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before updating member status.";
    render();
    return;
  }

  const memberControl = form.elements.namedItem("memberId") as HTMLInputElement | HTMLSelectElement | null;
  const statusControl = form.elements.namedItem("status") as HTMLInputElement | HTMLSelectElement | null;
  const memberId = memberControl?.value ?? "";
  const targetStatus = statusControl?.value ?? state.memberStatus.targetStatus;
  if (!memberId || !isWorkspaceMemberManagedStatus(targetStatus)) {
    state.ui.toast = "Member status update blocked: invalid member or status.";
    render();
    return;
  }

  state.memberStatus = {
    ...state.memberStatus,
    memberId,
    targetStatus,
    status: "updating",
    persistence: null,
    sessionPolicy: null,
    updatedMemberId: null,
    updatedStatus: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await updateWorkspaceMemberStatus(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        memberId,
        status: targetStatus,
      },
      csrfToken,
    );
    const member = state.workspace.members.find((candidate) => candidate.id === result.member.memberId);
    if (member) {
      member.status = result.member.status;
      member.role = result.member.role;
    }
    state.memberStatus = {
      ...state.memberStatus,
      memberId: result.member.memberId,
      targetStatus: result.member.status === "disabled" ? "active" : "disabled",
      status: "updated",
      persistence: result.persistence,
      sessionPolicy: result.sessionPolicy,
      updatedMemberId: result.member.memberId,
      updatedStatus: result.member.status,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(
        `Member status: ${member?.displayName ?? result.member.memberId} -> ${formatWorkspaceMemberStatus(result.member.status)}`,
        "System",
        result.member.status === "disabled" ? "amber" : "teal",
      ),
    );
    await persistWorkspace();
    state.ui.toast = `Member status updated: ${member?.displayName ?? result.member.memberId} is ${formatWorkspaceMemberStatus(result.member.status).toLowerCase()}.`;
  } catch (error) {
    state.memberStatus = {
      ...state.memberStatus,
      memberId,
      targetStatus,
      status: "idle",
      persistence: null,
      sessionPolicy: null,
      updatedMemberId: null,
      updatedStatus: null,
    };
    state.ui.toast = `Member status update blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleProjectMembershipAssign(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before assigning project members.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const memberControl = form.elements.namedItem("memberId") as HTMLInputElement | HTMLSelectElement | null;
  const roleSelect = form.elements.namedItem("role") as HTMLSelectElement | null;
  const departmentInput = form.elements.namedItem("department") as HTMLInputElement | null;
  const memberId = memberControl?.value ?? "";
  const role = roleSelect?.value ?? state.assignment.role;
  const department = departmentInput?.value.trim().slice(0, 80) ?? "";
  if (!project || !memberId || !isWorkspaceRole(role)) {
    state.ui.toast = "Project assignment blocked: invalid project, member, or role.";
    render();
    return;
  }

  state.assignment = {
    ...state.assignment,
    memberId,
    role,
    department,
    status: "assigning",
    persistence: null,
    assignedProjectId: null,
    assignedMemberId: null,
    assignedRole: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await assignProjectMembership(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        projectId: project.id,
        projectTitle: project.title,
        memberId,
        role,
        department: department || null,
      },
      csrfToken,
    );
    const member = state.workspace.members.find((candidate) => candidate.id === result.membership.memberId);
    state.assignment = {
      ...state.assignment,
      memberId,
      role: result.membership.role,
      department: result.membership.department ?? "",
      status: "assigned",
      persistence: result.persistence,
      assignedProjectId: result.membership.projectId,
      assignedMemberId: result.membership.memberId,
      assignedRole: result.membership.role,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(
        `Project assignment: ${member?.displayName ?? result.membership.memberId} -> ${project.title}`,
        "System",
        "blue",
      ),
    );
    await persistWorkspace();
    state.ui.toast = "Project membership assigned by the Worker.";
  } catch (error) {
    state.assignment = {
      ...state.assignment,
      memberId,
      role,
      department,
      status: "idle",
      persistence: null,
      assignedProjectId: null,
      assignedMemberId: null,
      assignedRole: null,
    };
    state.ui.toast = `Project assignment blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewProjectMembershipManifest(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing project team assignments.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Project team review blocked: no selected project.";
    render();
    return;
  }

  try {
    const manifest = await exportProjectMembershipManifest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        projectId: project.id,
        limit: 50,
      },
      csrfToken,
    );
    state.projectMembershipManifest = {
      checkedAt: new Date().toISOString(),
      targetLabel: project.title,
      persistence: manifest.persistence,
      auditPersistence: manifest.auditPersistence ?? null,
      manifestPolicy: manifest.manifestPolicy,
      rowCount: manifest.rowCount,
      truncated: manifest.truncated,
      memberships: manifest.memberships,
    };
    state.workspace.auditLog.unshift(createAuditEvent(`${project.title} project team manifest: ${manifest.rowCount} assignments`, "System", "blue"));
    await persistWorkspace();
    state.ui.toast = `${project.title} project team ready: ${manifest.rowCount} assignments${manifest.truncated ? " (truncated)" : ""}.`;
  } catch (error) {
    state.ui.toast = `Project team review blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewProjectMembershipHistory(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing project team history.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Project team history blocked: no selected project.";
    render();
    return;
  }

  try {
    const history = await exportProjectMembershipHistory(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        projectId: project.id,
        limit: 20,
      },
      csrfToken,
    );
    state.projectMembershipHistory = {
      checkedAt: new Date().toISOString(),
      targetLabel: project.title,
      persistence: history.persistence,
      auditPersistence: history.auditPersistence ?? null,
      historyPolicy: history.historyPolicy,
      projectId: history.projectId,
      rowCount: history.rowCount,
      truncated: history.truncated,
      entries: history.entries,
    };
    state.workspace.auditLog.unshift(createAuditEvent(`${project.title} project team history checked`, "System", "blue"));
    await persistWorkspace();
    state.ui.toast = `${project.title} project team history: ${history.rowCount} events.`;
  } catch (error) {
    state.ui.toast = `Project team history blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleProjectMembershipRevoke(projectId: string, memberId: string, roleValue: string): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before removing project team assignments.";
    render();
    return;
  }
  if (!projectId || !memberId || !isWorkspaceRole(roleValue)) {
    state.ui.toast = "Project team removal blocked: invalid assignment.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, projectId);
  const membership = state.projectMembershipManifest?.memberships.find((candidate) =>
    candidate.projectId === projectId && candidate.memberId === memberId && candidate.role === roleValue
  );
  if (!project || !membership) {
    state.ui.toast = "Project team removal blocked: no selected assignment.";
    render();
    return;
  }

  const revokeKey = projectMembershipRevokeKey(projectId, memberId, roleValue);
  state.projectMembershipRevokingKey = revokeKey;
  state.ui.toast = null;
  render();

  try {
    const result = await revokeProjectMembership(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        projectId,
        memberId,
        role: roleValue,
      },
      csrfToken,
    );
    if (state.projectMembershipManifest) {
      state.projectMembershipManifest = {
        ...state.projectMembershipManifest,
        checkedAt: new Date().toISOString(),
        persistence: result.persistence,
        auditPersistence: result.auditPersistence ?? state.projectMembershipManifest.auditPersistence,
        rowCount: Math.max(0, state.projectMembershipManifest.rowCount - 1),
        memberships: state.projectMembershipManifest.memberships.filter((candidate) =>
          !(candidate.projectId === projectId && candidate.memberId === result.membership.memberId && candidate.role === result.membership.role)
        ),
      };
    }
    state.workspace.auditLog.unshift(
      createAuditEvent(
        `Project team removed: ${memberDisplayName(result.membership.memberId)} -> ${project.title}`,
        "System",
        "amber",
      ),
    );
    await persistWorkspace();
    state.ui.toast = `Project team assignment removed for ${memberDisplayName(result.membership.memberId)}.`;
  } catch (error) {
    state.ui.toast = `Project team removal blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  } finally {
    state.projectMembershipRevokingKey = null;
    render();
  }
}

async function handleRecordOwnerTransfer(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before transferring record ownership.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const entityTypeSelect = form.elements.namedItem("entityType") as HTMLSelectElement | null;
  const entityIdSelect = form.elements.namedItem("entityId") as HTMLSelectElement | null;
  const memberSelect = form.elements.namedItem("memberId") as HTMLSelectElement | null;
  const entityType = entityTypeSelect?.value ?? state.ownerTransfer.entityType;
  const entityId = entityIdSelect?.value ?? state.ownerTransfer.entityId;
  const memberId = memberSelect?.value ?? "";
  if (!project || !isOwnerTransferEntityType(entityType) || !memberId) {
    state.ui.toast = "Owner transfer blocked: invalid project, target, or member.";
    render();
    return;
  }

  const target = ownerTransferTargetFor(project, entityType, entityId);
  if (!target) {
    state.ui.toast = "Owner transfer blocked: no selected record.";
    render();
    return;
  }

  state.ownerTransfer = {
    ...state.ownerTransfer,
    entityType,
    entityId: target.entityId,
    memberId,
    status: "transferring",
    persistence: null,
    transferredEntityType: null,
    transferredEntityId: null,
    transferredTargetLabel: null,
    ownerMemberId: null,
    previousOwnerMemberId: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await transferRecordOwner(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        entityType,
        entityId: target.entityId,
        memberId,
      },
      csrfToken,
    );
    state.ownerTransfer = {
      ...state.ownerTransfer,
      entityType: result.owner.entityType as OwnerTransferEntityType,
      entityId: result.owner.entityId,
      memberId: result.owner.ownerMemberId,
      status: "transferred",
      persistence: result.persistence,
      transferredEntityType: result.owner.entityType as OwnerTransferEntityType,
      transferredEntityId: result.owner.entityId,
      transferredTargetLabel: target.label,
      ownerMemberId: result.owner.ownerMemberId,
      previousOwnerMemberId: result.owner.previousOwnerMemberId,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(
        `Owner transfer: ${memberDisplayName(result.owner.ownerMemberId)} -> ${target.label}`,
        "System",
        "blue",
      ),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} owner transferred to ${memberDisplayName(result.owner.ownerMemberId)}.`;
  } catch (error) {
    state.ownerTransfer = {
      ...state.ownerTransfer,
      entityType,
      entityId: target.entityId,
      memberId,
      status: "idle",
      persistence: null,
      transferredEntityType: null,
      transferredEntityId: null,
      transferredTargetLabel: null,
      ownerMemberId: null,
      previousOwnerMemberId: null,
    };
    state.ui.toast = `Owner transfer blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

type SelectedRecordTarget =
  | {
      ok: true;
      entityType: OwnerTransferEntityType;
      entityId: string;
      target: NonNullable<ReturnType<typeof ownerTransferTargetFor>>;
    }
  | { ok: false; reason: "invalid_project_or_target" | "missing_record" };

function selectedRecordTarget(): SelectedRecordTarget {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const root = document.getElementById("app");
  const entityTypeSelect = root?.querySelector<HTMLSelectElement>("[data-action='record-owner-transfer'] select[name='entityType']");
  const entityIdSelect = root?.querySelector<HTMLSelectElement>("[data-action='record-owner-transfer'] select[name='entityId']");
  const entityType = entityTypeSelect?.value || state.ownerTransfer.entityType;
  const entityId = entityIdSelect?.value || state.ownerTransfer.entityId;
  if (!project || !isOwnerTransferEntityType(entityType)) {
    return { ok: false, reason: "invalid_project_or_target" };
  }

  const target = ownerTransferTargetFor(project, entityType, entityId);
  return target
    ? { ok: true, entityType, entityId: target.entityId, target }
    : { ok: false, reason: "missing_record" };
}

async function previewRecordOwnerManifest(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing record owners.";
    render();
    return;
  }

  const selection = selectedRecordTarget();
  if (!selection.ok) {
    state.ui.toast = selection.reason === "invalid_project_or_target" ? "Owner review blocked: invalid project or target." : "Owner review blocked: no selected record.";
    render();
    return;
  }
  const { entityType, entityId, target } = selection;

  try {
    const manifest = await exportRecordOwnerManifest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        entityType,
        entityId: target.entityId,
      },
      csrfToken,
    );
    state.ownerTransfer = {
      ...state.ownerTransfer,
      entityType,
      entityId: target.entityId,
    };
    state.ownerManifest = {
      checkedAt: new Date().toISOString(),
      targetLabel: target.label,
      persistence: manifest.persistence,
      auditPersistence: manifest.auditPersistence ?? null,
      manifestPolicy: manifest.manifestPolicy,
      owner: manifest.owner,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} owner manifest checked`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} owner: ${manifest.owner.ownerMemberId ? memberDisplayName(manifest.owner.ownerMemberId) : "unassigned"}.`;
  } catch (error) {
    state.ui.toast = `Owner review blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewRecordOwnerHistory(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing owner history.";
    render();
    return;
  }

  const selection = selectedRecordTarget();
  if (!selection.ok) {
    state.ui.toast = selection.reason === "invalid_project_or_target" ? "Owner history blocked: invalid project or target." : "Owner history blocked: no selected record.";
    render();
    return;
  }
  const { entityType, entityId, target } = selection;

  try {
    const history = await exportRecordOwnerHistory(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        entityType,
        entityId: target.entityId,
        limit: 20,
      },
      csrfToken,
    );
    state.ownerTransfer = {
      ...state.ownerTransfer,
      entityType,
      entityId: target.entityId,
    };
    state.ownerHistory = {
      checkedAt: new Date().toISOString(),
      targetLabel: target.label,
      persistence: history.persistence,
      auditPersistence: history.auditPersistence ?? null,
      historyPolicy: history.historyPolicy,
      rowCount: history.rowCount,
      truncated: history.truncated,
      owner: {
        entityType: history.entityType,
        entityId: history.entityId,
      },
      entries: history.entries,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} owner history checked`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} owner history: ${history.rowCount} transfers.`;
  } catch (error) {
    state.ui.toast = `Owner history blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewRecordMutationPreflight(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before checking mutation access.";
    render();
    return;
  }

  const mutationSelect = form.elements.namedItem("mutation") as HTMLSelectElement | null;
  const mutation = mutationSelect?.value || state.recordMutation.mutation;
  const selection = selectedRecordTarget();
  if (!selection.ok || !isRecordMutationKind(mutation)) {
    state.ui.toast = "Mutation preflight blocked: invalid project, target, or action.";
    render();
    return;
  }
  const { entityType, target } = selection;

  state.recordMutation = {
    ...state.recordMutation,
    mutation,
    status: "checking",
    targetLabel: target.label,
    persistence: null,
    auditPersistence: null,
    mutationPolicy: null,
    preflight: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await preflightRecordMutation(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        entityType,
        entityId: target.entityId,
        mutation,
      },
      csrfToken,
    );
    state.ownerTransfer = {
      ...state.ownerTransfer,
      entityType,
      entityId: target.entityId,
    };
    state.recordMutation = {
      mutation: result.preflight.mutation,
      status: "checked",
      targetLabel: target.label,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      mutationPolicy: result.mutationPolicy,
      preflight: result.preflight,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} ${result.preflight.mutation} access checked`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} ${result.preflight.mutation} access allowed.`;
  } catch (error) {
    state.recordMutation = {
      ...state.recordMutation,
      mutation,
      status: "idle",
      targetLabel: target.label,
      persistence: null,
      auditPersistence: null,
      mutationPolicy: null,
      preflight: null,
    };
    state.ui.toast = `Mutation preflight blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleRecordMutationRequest(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before requesting mutation review.";
    render();
    return;
  }

  const root = document.getElementById("app");
  const mutationSelect = root?.querySelector<HTMLSelectElement>("[data-action='record-mutation-preflight'] select[name='mutation']");
  const mutation = mutationSelect?.value || state.recordMutation.mutation;
  const selection = selectedRecordTarget();
  if (!selection.ok || !isRecordMutationKind(mutation)) {
    state.ui.toast = "Mutation request blocked: invalid project, target, or action.";
    render();
    return;
  }
  const { entityType, target } = selection;

  const summaryInput = form.elements.namedItem("summary") as HTMLInputElement | null;
  const summary = (summaryInput?.value.trim() || `${mutation} ${target.label}`).slice(0, 500);
  const fieldKeys = mutation === "delete" ? [] : collectRecordMutationFieldKeys(form, entityType);
  if (mutation === "update" && fieldKeys.length === 0) {
    state.ui.toast = "Mutation request blocked: select at least one update field.";
    render();
    return;
  }

  state.recordMutationRequest = {
    status: "requesting",
    targetLabel: target.label,
    persistence: null,
    auditPersistence: null,
    requestPolicy: null,
    request: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await createRecordMutationRequest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        entityType,
        entityId: target.entityId,
        mutation,
        summary,
        fieldKeys,
      },
      csrfToken,
    );
    state.ownerTransfer = {
      ...state.ownerTransfer,
      entityType,
      entityId: target.entityId,
    };
    state.recordMutation = {
      ...state.recordMutation,
      mutation: result.request.mutation,
    };
    state.recordMutationRequest = {
      status: "requested",
      targetLabel: target.label,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      requestPolicy: result.requestPolicy,
      request: result.request,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} ${result.request.mutation} review requested`, "System", "amber"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} ${result.request.mutation} review requested.`;
  } catch (error) {
    state.recordMutationRequest = {
      status: "idle",
      targetLabel: target.label,
      persistence: null,
      auditPersistence: null,
      requestPolicy: null,
      request: null,
    };
    state.ui.toast = `Mutation request blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewRecordMutationRequestManifest(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing mutation requests.";
    render();
    return;
  }

  const selection = selectedRecordTarget();
  if (!selection.ok) {
    state.ui.toast = selection.reason === "invalid_project_or_target" ? "Mutation request review blocked: invalid project or target." : "Mutation request review blocked: no selected record.";
    render();
    return;
  }
  const { entityType, entityId, target } = selection;

  try {
    const manifest = await exportRecordMutationRequestManifest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        entityType,
        entityId: target.entityId,
        limit: 20,
      },
      csrfToken,
    );
    state.recordMutationRequestManifest = {
      checkedAt: new Date().toISOString(),
      targetLabel: target.label,
      persistence: manifest.persistence,
      auditPersistence: manifest.auditPersistence ?? null,
      manifestPolicy: manifest.manifestPolicy,
      rowCount: manifest.rowCount,
      truncated: manifest.truncated,
      target: {
        entityType: manifest.entityType,
        entityId: manifest.entityId,
      },
      requests: manifest.requests,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} mutation requests checked`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} mutation requests: ${manifest.rowCount} records.`;
  } catch (error) {
    state.ui.toast = `Mutation request review blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleRecordMutationResolution(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before resolving mutation requests.";
    render();
    return;
  }

  const selection = selectedRecordTarget();
  if (!selection.ok) {
    state.ui.toast = "Mutation resolution blocked: invalid project or target.";
    render();
    return;
  }
  const { target } = selection;
  const requestIdInput = form.elements.namedItem("requestId") as HTMLInputElement | null;
  const decisionSelect = form.elements.namedItem("decision") as HTMLSelectElement | null;
  const noteInput = form.elements.namedItem("note") as HTMLInputElement | null;
  const requestId = requestIdInput?.value.trim() ?? "";
  const decision = decisionSelect?.value === "reject" ? "reject" : "approve";
  if (!requestId) {
    state.ui.toast = "Mutation resolution blocked: no request selected.";
    render();
    return;
  }

  state.recordMutationResolution = {
    status: "resolving",
    targetLabel: target.label,
    persistence: null,
    auditPersistence: null,
    resolutionPolicy: null,
    request: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await resolveRecordMutationRequest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        requestId,
        decision,
        note: noteInput?.value.trim() || undefined,
      },
      csrfToken,
    );
    state.recordMutationResolution = {
      status: "resolved",
      targetLabel: target.label,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      resolutionPolicy: result.resolutionPolicy,
      request: result.request,
    };
    replaceMutationRequestInManifest(result.request);
    state.recordMutationDiff = emptyRecordMutationDiffState();
    state.recordMutationApply = emptyRecordMutationApplyState();
    state.recordMutationAuditManifest = null;
    state.recordMutationRollback = emptyRecordMutationRollbackState();
    state.recordMutationDeleteRecovery = emptyRecordMutationDeleteRecoveryState();
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} mutation ${result.request.status.replaceAll("_", " ")}`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} mutation ${result.request.status.replaceAll("_", " ")}.`;
  } catch (error) {
    state.recordMutationResolution = emptyRecordMutationResolutionState();
    state.ui.toast = `Mutation resolution blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewRecordMutationDiffForApply(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before previewing mutation diffs.";
    render();
    return;
  }

  const selection = selectedRecordTarget();
  if (!selection.ok) {
    state.ui.toast = "Mutation diff blocked: invalid project or target.";
    render();
    return;
  }
  const { target } = selection;
  const requestIdInput = form.elements.namedItem("requestId") as HTMLInputElement | null;
  const requestId = requestIdInput?.value.trim() ?? "";
  const matchedRequest = state.recordMutationRequestManifest?.requests.find((request) => request.id === requestId)
    ?? (state.recordMutationResolution.request?.id === requestId ? state.recordMutationResolution.request : null);
  const updates = matchedRequest?.mutation === "delete"
    ? undefined
    : parseRecordMutationUpdateForm(form, matchedRequest);
  if (!requestId) {
    state.ui.toast = "Mutation diff blocked: no approved request selected.";
    render();
    return;
  }
  if (matchedRequest?.mutation !== "delete" && !updates) {
    state.ui.toast = "Mutation diff blocked: enter update fields.";
    render();
    return;
  }

  state.recordMutationDiff = {
    status: "previewing",
    targetLabel: target.label,
    persistence: null,
    auditPersistence: null,
    diffPolicy: null,
    request: null,
    stale: false,
    currentUpdatedAt: null,
    expectedUpdatedAt: null,
    fieldDiffs: [],
    rollbackGuidance: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await previewRecordMutationDiff(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        requestId,
        updates,
      },
      csrfToken,
    );
    state.recordMutationDiff = {
      status: "previewed",
      targetLabel: target.label,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      diffPolicy: result.diffPolicy,
      request: result.request,
      stale: result.stale,
      currentUpdatedAt: result.currentUpdatedAt,
      expectedUpdatedAt: result.expectedUpdatedAt,
      fieldDiffs: result.fieldDiffs,
      rollbackGuidance: result.rollbackGuidance,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} mutation diff previewed`, "System", result.stale ? "amber" : "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} mutation diff previewed.`;
  } catch (error) {
    state.recordMutationDiff = emptyRecordMutationDiffState();
    state.ui.toast = `Mutation diff blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleRecordMutationApply(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before applying mutation requests.";
    render();
    return;
  }

  const selection = selectedRecordTarget();
  if (!selection.ok) {
    state.ui.toast = "Mutation apply blocked: invalid project or target.";
    render();
    return;
  }
  const { target } = selection;
  const requestIdInput = form.elements.namedItem("requestId") as HTMLInputElement | null;
  const requestId = requestIdInput?.value.trim() ?? "";
  const matchedRequest = state.recordMutationRequestManifest?.requests.find((request) => request.id === requestId)
    ?? (state.recordMutationResolution.request?.id === requestId ? state.recordMutationResolution.request : null);
  const updates = matchedRequest?.mutation === "delete"
    ? undefined
    : parseRecordMutationUpdateForm(form, matchedRequest);
  if (!requestId) {
    state.ui.toast = "Mutation apply blocked: no approved request selected.";
    render();
    return;
  }
  if (matchedRequest?.mutation !== "delete" && !updates) {
    state.ui.toast = "Mutation apply blocked: enter update fields.";
    render();
    return;
  }

  state.recordMutationApply = {
    status: "applying",
    targetLabel: target.label,
    persistence: null,
    auditPersistence: null,
    applicationPolicy: null,
    request: null,
    application: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await applyRecordMutationRequest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        requestId,
        confirmation: `APPLY MUTATION ${requestId}`,
        updates,
      },
      csrfToken,
    );
    state.recordMutationApply = {
      status: "applied",
      targetLabel: target.label,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      applicationPolicy: result.applicationPolicy,
      request: result.request,
      application: result.application,
    };
    replaceMutationRequestInManifest(result.request);
    const reconciled = reconcileLocalRecordMutation(result.request, updates);
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} mutation applied${reconciled ? " locally" : ""}`, "System", "red"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} mutation applied.`;
  } catch (error) {
    state.recordMutationApply = emptyRecordMutationApplyState();
    state.ui.toast = `Mutation apply blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewRecordMutationAuditManifest(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing mutation audits.";
    render();
    return;
  }

  const selection = selectedRecordTarget();
  if (!selection.ok) {
    state.ui.toast = "Mutation audit blocked: invalid project or target.";
    render();
    return;
  }
  const { target } = selection;
  const requestIdInput = form.elements.namedItem("requestId") as HTMLInputElement | null;
  const requestId = requestIdInput?.value.trim() ?? "";
  if (!requestId) {
    state.ui.toast = "Mutation audit blocked: no request selected.";
    render();
    return;
  }

  try {
    const manifest = await exportRecordMutationAuditManifest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        requestId,
        limit: 20,
      },
      csrfToken,
    );
    state.recordMutationAuditManifest = {
      checkedAt: new Date().toISOString(),
      targetLabel: target.label,
      persistence: manifest.persistence,
      auditPersistence: manifest.auditPersistence ?? null,
      manifestPolicy: manifest.manifestPolicy,
      metadataPolicy: manifest.metadataPolicy,
      requestId,
      request: manifest.request,
      rowCount: manifest.rowCount,
      truncated: manifest.truncated,
      rollbackGuidance: manifest.rollbackGuidance,
      events: manifest.events,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} mutation audit: ${manifest.rowCount} events`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} mutation audit: ${manifest.rowCount} events.`;
  } catch (error) {
    state.recordMutationAuditManifest = null;
    state.ui.toast = `Mutation audit blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleRecordMutationRollbackRequest(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before requesting rollbacks.";
    render();
    return;
  }

  const selection = selectedRecordTarget();
  if (!selection.ok) {
    state.ui.toast = "Rollback request blocked: invalid project or target.";
    render();
    return;
  }
  const { target } = selection;
  const requestIdInput = form.elements.namedItem("requestId") as HTMLInputElement | null;
  const summaryInput = form.elements.namedItem("summary") as HTMLInputElement | null;
  const requestId = requestIdInput?.value.trim() ?? "";
  const summary = summaryInput?.value.trim() ?? "";
  if (!requestId) {
    state.ui.toast = "Rollback request blocked: no applied request selected.";
    render();
    return;
  }

  state.recordMutationRollback = {
    status: "requesting",
    targetLabel: target.label,
    persistence: null,
    auditPersistence: null,
    rollbackPolicy: null,
    sourceRequest: null,
    request: null,
    suggestedUpdates: {},
  };
  state.ui.toast = null;
  render();

  try {
    const result = await createRecordMutationRollbackRequest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        requestId,
        summary: summary || undefined,
      },
      csrfToken,
    );
    state.recordMutationRollback = {
      status: "requested",
      targetLabel: target.label,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      rollbackPolicy: result.rollbackPolicy,
      sourceRequest: result.sourceRequest,
      request: result.request,
      suggestedUpdates: result.suggestedUpdates,
    };
    replaceMutationRequestInManifest(result.request);
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} rollback requested`, "System", "amber"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} rollback request created.`;
  } catch (error) {
    state.recordMutationRollback = emptyRecordMutationRollbackState();
    state.ui.toast = `Rollback request blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewRecordMutationDeleteRecovery(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before planning delete recovery.";
    render();
    return;
  }

  const selection = selectedRecordTarget();
  if (!selection.ok) {
    state.ui.toast = "Delete recovery blocked: invalid project or target.";
    render();
    return;
  }
  const { target } = selection;
  const requestIdInput = form.elements.namedItem("requestId") as HTMLInputElement | null;
  const requestId = requestIdInput?.value.trim() ?? "";
  if (!requestId) {
    state.ui.toast = "Delete recovery blocked: no applied delete request selected.";
    render();
    return;
  }

  state.recordMutationDeleteRecovery = {
    status: "checking",
    targetLabel: target.label,
    persistence: null,
    auditPersistence: null,
    recoveryPolicy: null,
    sourceRequest: null,
    recoveryPlan: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await previewRecordMutationDeleteRecoveryPlan(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        requestId,
      },
      csrfToken,
    );
    state.recordMutationDeleteRecovery = {
      status: "checked",
      targetLabel: target.label,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      recoveryPolicy: result.recoveryPolicy,
      sourceRequest: result.sourceRequest,
      recoveryPlan: result.recoveryPlan,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} delete recovery planned`, "System", "amber"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} delete recovery planned.`;
  } catch (error) {
    state.recordMutationDeleteRecovery = emptyRecordMutationDeleteRecoveryState();
    state.ui.toast = `Delete recovery blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleFilmProfileMutationRequest(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before requesting profile review.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Profile mutation request blocked: invalid project.";
    render();
    return;
  }

  const summaryInput = form.elements.namedItem("summary") as HTMLInputElement | null;
  const summary = (summaryInput?.value.trim() || `update ${project.title} profile`).slice(0, 500);
  const fieldKeys = collectFilmProfileMutationFieldKeys(form);
  if (fieldKeys.length === 0) {
    state.ui.toast = "Profile mutation request blocked: select at least one profile field.";
    render();
    return;
  }

  state.filmProfileMutationRequest = {
    status: "requesting",
    targetLabel: project.title,
    persistence: null,
    auditPersistence: null,
    requestPolicy: null,
    request: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await createFilmProfileMutationRequest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        projectId: project.id,
        summary,
        fieldKeys,
      },
      csrfToken,
    );
    state.filmProfileMutationRequest = {
      status: "requested",
      targetLabel: project.title,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      requestPolicy: result.requestPolicy,
      request: result.request,
    };
    replaceFilmProfileMutationRequestInManifest(result.request);
    state.workspace.auditLog.unshift(
      createAuditEvent(`${project.title} profile review requested`, "System", "amber"),
    );
    await persistWorkspace();
    state.ui.toast = `${project.title} profile review requested.`;
  } catch (error) {
    state.filmProfileMutationRequest = {
      status: "idle",
      targetLabel: project.title,
      persistence: null,
      auditPersistence: null,
      requestPolicy: null,
      request: null,
    };
    state.ui.toast = `Profile mutation request blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewFilmProfileMutationRequestManifest(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing profile requests.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Profile request review blocked: invalid project.";
    render();
    return;
  }

  try {
    const manifest = await exportFilmProfileMutationRequestManifest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        projectId: project.id,
        limit: 20,
      },
      csrfToken,
    );
    state.filmProfileMutationRequestManifest = {
      checkedAt: new Date().toISOString(),
      targetLabel: project.title,
      persistence: manifest.persistence,
      auditPersistence: manifest.auditPersistence ?? null,
      manifestPolicy: manifest.manifestPolicy,
      rowCount: manifest.rowCount,
      truncated: manifest.truncated,
      projectId: manifest.projectId,
      requests: manifest.requests,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${project.title} profile mutation requests checked`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${project.title} profile requests: ${manifest.rowCount} records.`;
  } catch (error) {
    state.ui.toast = `Profile request review blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleFilmProfileMutationResolution(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before resolving profile requests.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const requestIdInput = form.elements.namedItem("requestId") as HTMLInputElement | null;
  const decisionSelect = form.elements.namedItem("decision") as HTMLSelectElement | null;
  const noteInput = form.elements.namedItem("note") as HTMLInputElement | null;
  const requestId = requestIdInput?.value.trim() ?? "";
  const decision = decisionSelect?.value === "reject" ? "reject" : "approve";
  if (!project || !requestId) {
    state.ui.toast = "Profile mutation resolution blocked: no request selected.";
    render();
    return;
  }

  state.filmProfileMutationResolution = {
    status: "resolving",
    targetLabel: project.title,
    persistence: null,
    auditPersistence: null,
    resolutionPolicy: null,
    request: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await resolveFilmProfileMutationRequest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        requestId,
        decision,
        note: noteInput?.value.trim() || undefined,
      },
      csrfToken,
    );
    state.filmProfileMutationResolution = {
      status: "resolved",
      targetLabel: project.title,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      resolutionPolicy: result.resolutionPolicy,
      request: result.request,
    };
    replaceFilmProfileMutationRequestInManifest(result.request);
    state.filmProfileMutationDiff = emptyFilmProfileMutationDiffState();
    state.filmProfileMutationApply = emptyFilmProfileMutationApplyState();
    state.workspace.auditLog.unshift(
      createAuditEvent(`${project.title} profile mutation ${result.request.status.replaceAll("_", " ")}`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${project.title} profile mutation ${result.request.status.replaceAll("_", " ")}.`;
  } catch (error) {
    state.filmProfileMutationResolution = emptyFilmProfileMutationResolutionState();
    state.ui.toast = `Profile mutation resolution blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewFilmProfileMutationDiffForApply(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before previewing profile diffs.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const requestIdInput = form.elements.namedItem("requestId") as HTMLInputElement | null;
  const requestId = requestIdInput?.value.trim() ?? "";
  const matchedRequest = state.filmProfileMutationRequestManifest?.requests.find((request) => request.id === requestId)
    ?? (state.filmProfileMutationResolution.request?.id === requestId ? state.filmProfileMutationResolution.request : null)
    ?? (state.filmProfileMutationRequest.request?.id === requestId ? state.filmProfileMutationRequest.request : null);
  const updates = parseFilmProfileMutationUpdateForm(form, matchedRequest);
  if (!project || !requestId || matchedRequest?.projectId !== project.id) {
    state.ui.toast = "Profile mutation diff blocked: no approved request selected.";
    render();
    return;
  }
  if (!updates) {
    state.ui.toast = "Profile mutation diff blocked: enter update fields.";
    render();
    return;
  }

  state.filmProfileMutationDiff = {
    status: "previewing",
    targetLabel: project.title,
    persistence: null,
    auditPersistence: null,
    diffPolicy: null,
    request: null,
    stale: false,
    currentUpdatedAt: null,
    expectedUpdatedAt: null,
    fieldDiffs: [],
    rollbackGuidance: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await previewFilmProfileMutationDiff(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        requestId,
        updates,
      },
      csrfToken,
    );
    state.filmProfileMutationDiff = {
      status: "previewed",
      targetLabel: project.title,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      diffPolicy: result.diffPolicy,
      request: result.request,
      stale: result.stale,
      currentUpdatedAt: result.currentUpdatedAt,
      expectedUpdatedAt: result.expectedUpdatedAt,
      fieldDiffs: result.fieldDiffs,
      rollbackGuidance: result.rollbackGuidance,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${project.title} profile mutation diff previewed`, "System", result.stale ? "amber" : "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${project.title} profile mutation diff previewed.`;
  } catch (error) {
    state.filmProfileMutationDiff = emptyFilmProfileMutationDiffState();
    state.ui.toast = `Profile mutation diff blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleFilmProfileMutationApply(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before applying profile requests.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const requestIdInput = form.elements.namedItem("requestId") as HTMLInputElement | null;
  const requestId = requestIdInput?.value.trim() ?? "";
  const matchedRequest = state.filmProfileMutationRequestManifest?.requests.find((request) => request.id === requestId)
    ?? (state.filmProfileMutationResolution.request?.id === requestId ? state.filmProfileMutationResolution.request : null)
    ?? (state.filmProfileMutationRequest.request?.id === requestId ? state.filmProfileMutationRequest.request : null);
  const updates = parseFilmProfileMutationUpdateForm(form, matchedRequest);
  if (!project || !requestId || matchedRequest?.projectId !== project.id) {
    state.ui.toast = "Profile mutation apply blocked: no approved request selected.";
    render();
    return;
  }
  if (!updates) {
    state.ui.toast = "Profile mutation apply blocked: enter update fields.";
    render();
    return;
  }

  state.filmProfileMutationApply = {
    status: "applying",
    targetLabel: project.title,
    persistence: null,
    auditPersistence: null,
    applicationPolicy: null,
    request: null,
    application: null,
  };
  state.ui.toast = null;
  render();

  try {
    const result = await applyFilmProfileMutationRequest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        requestId,
        confirmation: `APPLY FILM PROFILE MUTATION ${requestId}`,
        updates,
      },
      csrfToken,
    );
    state.filmProfileMutationApply = {
      status: "applied",
      targetLabel: project.title,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      applicationPolicy: result.applicationPolicy,
      request: result.request,
      application: result.application,
    };
    replaceFilmProfileMutationRequestInManifest(result.request);
    const reconciled = reconcileLocalFilmProfileMutation(result.request, updates);
    state.workspace.auditLog.unshift(
      createAuditEvent(`${project.title} profile mutation applied${reconciled ? " locally" : ""}`, "System", "red"),
    );
    await persistWorkspace();
    state.ui.toast = `${project.title} profile mutation applied.`;
  } catch (error) {
    state.filmProfileMutationApply = emptyFilmProfileMutationApplyState();
    state.ui.toast = `Profile mutation apply blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

function replaceMutationRequestInManifest(request: RecordMutationRequestResult["request"]): void {
  if (
    !state.recordMutationRequestManifest
    || state.recordMutationRequestManifest.target.entityId !== request.entityId
    || state.recordMutationRequestManifest.target.entityType !== request.entityType
  ) {
    return;
  }
  const requests = state.recordMutationRequestManifest.requests.map((existing) =>
    existing.id === request.id ? request : existing
  );
  if (!requests.some((existing) => existing.id === request.id)) {
    requests.unshift(request);
  }
  state.recordMutationRequestManifest = {
    ...state.recordMutationRequestManifest,
    rowCount: requests.length,
    requests,
  };
}

function replaceFilmProfileMutationRequestInManifest(request: FilmProfileMutationRequestResult["request"]): void {
  if (!state.filmProfileMutationRequestManifest || state.filmProfileMutationRequestManifest.projectId !== request.projectId) {
    return;
  }
  const requests = state.filmProfileMutationRequestManifest.requests.map((existing) =>
    existing.id === request.id ? request : existing
  );
  if (!requests.some((existing) => existing.id === request.id)) {
    requests.unshift(request);
  }
  state.filmProfileMutationRequestManifest = {
    ...state.filmProfileMutationRequestManifest,
    rowCount: requests.length,
    requests,
  };
}

function collectRecordMutationFieldKeys(form: HTMLFormElement, entityType: CoreRecordOwnerEntityType): string[] {
  return normalizeRecordMutationFieldKeysForEntity(entityType, new FormData(form).getAll("fieldKeys"));
}

function collectFilmProfileMutationFieldKeys(form: HTMLFormElement): ReturnType<typeof normalizeFilmProfileMutationFieldKeys> {
  return normalizeFilmProfileMutationFieldKeys(new FormData(form).getAll("fieldKeys"));
}

function parseRecordMutationUpdateForm(
  form: HTMLFormElement,
  request: RecordMutationRequestResult["request"] | null,
): Record<string, string | number | boolean | null | string[]> | undefined {
  if (!request || request.mutation === "delete") return undefined;

  const formData = new FormData(form);
  const requestedKeys = new Set(request.fieldKeys);
  const updates: Record<string, string | number | boolean | null | string[]> = {};
  for (const field of getRecordMutationFieldDefinitions(request.entityType)) {
    if (!requestedKeys.has(field.key)) continue;
    const rawValue = formData.get(`update:${field.key}`);
    if (typeof rawValue !== "string") continue;
    const value = normalizeRecordMutationFormValue(field, rawValue);
    if (value !== undefined) {
      updates[field.key] = value;
    }
  }
  return Object.keys(updates).length > 0 ? updates : undefined;
}

function parseFilmProfileMutationUpdateForm(
  form: HTMLFormElement,
  request: FilmProfileMutationRequestResult["request"] | null,
): Record<string, string | number | null> | undefined {
  if (!request) return undefined;

  const formData = new FormData(form);
  const requestedKeys = new Set(request.fieldKeys);
  const updates: Record<string, string | number | null> = {};
  for (const field of getFilmProfileMutationFieldDefinitions()) {
    if (!requestedKeys.has(field.key)) continue;
    const rawValue = formData.get(`update:${field.key}`);
    if (typeof rawValue !== "string") continue;
    const value = normalizeRecordMutationFormValue(field, rawValue);
    if (typeof value === "string" || typeof value === "number" || value === null) {
      updates[field.key] = value;
    }
  }
  return Object.keys(updates).length > 0 ? updates : undefined;
}

function normalizeRecordMutationFormValue(
  field: RecordMutationFieldDefinition,
  rawValue: string,
): string | number | boolean | null | string[] | undefined {
  const value = rawValue.trim();
  if (!value && field.nullable) return null;
  if (!value) return undefined;
  if (field.input === "number") {
    const numeric = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(numeric)) return undefined;
    if (field.min !== undefined && numeric < field.min) return undefined;
    if (field.max !== undefined && numeric > field.max) return undefined;
    return numeric;
  }
  if (field.input === "boolean") {
    return value === "true";
  }
  if (field.input === "list") {
    const list = value
      .split(/[;,]/)
      .map((item) => item.trim().slice(0, field.maxLength ?? 80))
      .filter(Boolean)
      .slice(0, 12);
    return list.length ? list : undefined;
  }
  if (field.options?.length && !field.options.includes(value)) {
    return undefined;
  }
  return field.maxLength ? value.slice(0, field.maxLength) : value;
}

function reconcileLocalRecordMutation(
  request: RecordMutationRequestResult["request"],
  updates: Record<string, string | number | boolean | null | string[]> | undefined,
): boolean {
  if (request.workspaceId !== state.workspace.id) return false;

  if (request.entityType === "project") {
    const projectIndex = state.workspace.projects.findIndex((project) => project.id === request.entityId);
    if (projectIndex < 0) return false;
    if (request.mutation === "delete") {
      state.workspace.projects.splice(projectIndex, 1);
      if (state.ui.selectedProjectId === request.entityId) {
        state.ui.selectedProjectId = state.workspace.projects[0]?.id ?? "";
      }
      return true;
    }
    const project = state.workspace.projects[projectIndex];
    if (!project || !updates) return false;
    if (typeof updates.title === "string" && updates.title.trim()) project.title = updates.title.trim();
    if (typeof updates.projectType === "string" && updates.projectType.trim()) project.type = updates.projectType.trim();
    if (typeof updates.phase === "string" && isLocalProjectPhase(updates.phase)) project.phase = updates.phase;
    if (typeof updates.logline === "string") project.description = updates.logline.trim();
    return true;
  }

  const project = state.workspace.projects.find((candidate) => projectContainsEntity(candidate, request.entityType, request.entityId));
  if (!project) return false;

  if (request.entityType === "task") {
    const index = project.openTasks.findIndex((task) => task.id === request.entityId);
    if (index < 0) return false;
    if (request.mutation === "delete") {
      project.openTasks.splice(index, 1);
      project.tasks.total = Math.max(0, project.tasks.total - 1);
      return true;
    }
    const task = project.openTasks[index];
    if (!task || !updates) return false;
    if (typeof updates.title === "string" && updates.title.trim()) task.title = updates.title.trim();
    if (typeof updates.status === "string" && isLocalTaskStatus(updates.status)) task.status = updates.status;
    if (typeof updates.dueAt === "string") task.due = updates.dueAt.trim();
    return true;
  }

  if (request.entityType === "document") {
    const index = project.docs.findIndex((doc) => doc.id === request.entityId);
    if (index < 0) return false;
    if (request.mutation === "delete") {
      project.docs.splice(index, 1);
      if (state.ui.selectedDocId === request.entityId) {
        state.ui.selectedDocId = project.docs[0]?.id ?? "";
      }
      return true;
    }
    const doc = project.docs[index];
    if (!doc || !updates) return false;
    if (typeof updates.title === "string" && updates.title.trim()) doc.name = updates.title.trim();
    if (typeof updates.documentType === "string") {
      const localType = localDocumentType(updates.documentType);
      if (localType) doc.type = localType;
    }
    return true;
  }

  if (request.entityType === "person") {
    const index = project.people.findIndex((person) => person.id === request.entityId);
    if (index < 0) return false;
    if (request.mutation === "delete") {
      project.people.splice(index, 1);
      return true;
    }
    const person = project.people[index];
    if (!person || !updates) return false;
    if (typeof updates.displayName === "string" && updates.displayName.trim()) person.name = updates.displayName.trim();
    if (Array.isArray(updates.roleTags) && typeof updates.roleTags[0] === "string") person.role = updates.roleTags[0];
    if (typeof updates.roleTags === "string" && updates.roleTags.trim()) person.role = updates.roleTags.trim();
    return true;
  }

  if (request.entityType === "equipment") {
    const index = project.equipment.findIndex((item) => item.id === request.entityId);
    if (index < 0) return false;
    if (request.mutation === "delete") {
      project.equipment.splice(index, 1);
      return true;
    }
    const item = project.equipment[index];
    if (!item || !updates) return false;
    if (typeof updates.name === "string" && updates.name.trim()) item.name = updates.name.trim();
    if (typeof updates.status === "string" && updates.status.trim()) item.status = updates.status.trim();
    if (typeof updates.equipmentType === "string" && updates.equipmentType.trim()) item.statusTone = equipmentToneFromType(updates.equipmentType);
    return true;
  }

  if (request.entityType === "expense") {
    const index = project.expenses.findIndex((expense) => expense.id === request.entityId);
    if (index < 0) return false;
    if (request.mutation === "delete") {
      project.expenses.splice(index, 1);
      return true;
    }
    const expense = project.expenses[index];
    if (!expense || !updates) return false;
    if (typeof updates.category === "string" && updates.category.trim()) expense.category = updates.category.trim();
    if (typeof updates.amountCents === "number" && Number.isFinite(updates.amountCents)) {
      expense.spent = Math.max(0, Math.round(updates.amountCents) / 100);
      expense.percent = expense.budget > 0 ? Math.round((expense.spent / expense.budget) * 100) : expense.percent;
    }
    return true;
  }

  return false;
}

function reconcileLocalFilmProfileMutation(
  request: FilmProfileMutationRequestResult["request"],
  updates: Record<string, string | number | null> | undefined,
): boolean {
  if (request.workspaceId !== state.workspace.id || !updates) return false;
  const project = state.workspace.projects.find((candidate) => candidate.id === request.projectId);
  if (!project) return false;

  if (typeof updates.runtimeMinutes === "number") {
    project.runtimeMinutes = Math.max(0, Math.round(updates.runtimeMinutes));
  }
  if (typeof updates.format === "string") {
    project.format = updates.format.trim() || "TBD";
  } else if (updates.format === null) {
    project.format = "TBD";
  }
  if (typeof updates.budgetCents === "number") {
    project.totalBudget = Math.max(0, Math.round(updates.budgetCents) / 100);
  }
  if (typeof updates.spentCents === "number") {
    project.spentBudget = Math.max(0, Math.round(updates.spentCents) / 100);
  }
  if (Object.prototype.hasOwnProperty.call(updates, "shootStart") || Object.prototype.hasOwnProperty.call(updates, "shootEnd")) {
    const shootDates = splitLocalShootDates(project.shootDates);
    const start = typeof updates.shootStart === "string"
      ? updates.shootStart.trim() || "TBD"
      : updates.shootStart === null
        ? "TBD"
        : shootDates.start;
    const end = typeof updates.shootEnd === "string"
      ? updates.shootEnd.trim() || "TBD"
      : updates.shootEnd === null
        ? "TBD"
        : shootDates.end;
    project.shootDates = `${start} - ${end}`;
  }
  return true;
}

function splitLocalShootDates(value: string): { start: string; end: string } {
  const [start, end] = value.split(/\s+-\s+/, 2).map((part) => part.trim()).filter(Boolean);
  return {
    start: start || "TBD",
    end: end || start || "TBD",
  };
}

function projectContainsEntity(project: FilmProject, entityType: CoreRecordOwnerEntityType, entityId: string): boolean {
  if (entityType === "task") return project.openTasks.some((task) => task.id === entityId);
  if (entityType === "document") return project.docs.some((doc) => doc.id === entityId);
  if (entityType === "person") return project.people.some((person) => person.id === entityId);
  if (entityType === "equipment") return project.equipment.some((item) => item.id === entityId);
  if (entityType === "expense") return project.expenses.some((expense) => expense.id === entityId);
  return false;
}

function isLocalTaskStatus(value: string): value is FilmProject["openTasks"][number]["status"] {
  return value === "overdue" || value === "pending" || value === "ready";
}

function isLocalProjectPhase(value: string): value is FilmProject["phase"] {
  return value === "Development" || value === "Pre-Production" || value === "Production" || value === "Post-Production";
}

function projectPhaseTone(phase: FilmProject["phase"]): FilmProject["phaseTone"] {
  if (phase === "Production") return "teal";
  if (phase === "Pre-Production") return "amber";
  if (phase === "Development") return "blue";
  return "gray";
}

function equipmentToneFromType(value: string): EquipmentItem["statusTone"] {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("sound") || normalized.includes("audio")) return "blue";
  if (normalized.includes("camera") || normalized.includes("lens")) return "teal";
  if (normalized.includes("hold") || normalized.includes("repair") || normalized.includes("missing")) return "red";
  if (normalized.includes("grip") || normalized.includes("lighting")) return "amber";
  return "gray";
}

function localDocumentType(value: string): ProjectDoc["type"] | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "markdown" || normalized === "native") return "MD";
  if (normalized === "uploaded_file") return "ASSET";
  if (normalized === "screenplay") return "ASSET";
  if (normalized === "google_doc") return "MD";
  return null;
}

async function handleRecordCommentCreate(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before adding comments.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const entityTypeSelect = form.elements.namedItem("entityType") as HTMLSelectElement | null;
  const entityIdSelect = form.elements.namedItem("entityId") as HTMLSelectElement | null;
  const bodyInput = form.elements.namedItem("body") as HTMLTextAreaElement | null;
  const entityType = entityTypeSelect?.value || state.recordComment.entityType;
  const entityId = entityIdSelect?.value || state.recordComment.entityId;
  const body = bodyInput?.value.trim() ?? "";
  if (!project || !isRecordCommentEntityType(entityType)) {
    state.ui.toast = "Comment blocked: invalid project or target.";
    render();
    return;
  }

  const target = recordCommentTargetFor(project, entityType, entityId);
  if (!target || body.length < 1 || body.length > 2000) {
    state.ui.toast = "Comment blocked: select a target and keep the comment under 2,000 characters.";
    render();
    return;
  }

  state.recordComment = {
    ...state.recordComment,
    entityType,
    entityId: target.entityId,
    body,
    status: "creating",
    persistence: null,
    auditPersistence: null,
    commentPolicy: null,
    targetLabel: null,
    bodyPreview: null,
    bodySha256: null,
  };
  state.recordCommentManifest = null;
  state.ui.toast = null;
  render();

  try {
    const result = await createRecordCommentIntent(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        entityType,
        entityId: target.entityId,
        body,
      },
      csrfToken,
    );
    state.recordComment = {
      ...state.recordComment,
      entityType: result.comment.entityType,
      entityId: result.comment.entityId,
      body: "",
      status: "created",
      persistence: result.persistence,
      auditPersistence: result.auditPersistence ?? null,
      commentPolicy: result.commentPolicy,
      targetLabel: target.label,
      bodyPreview: result.comment.bodyPreview,
      bodySha256: result.comment.bodySha256,
    };
    state.recordCommentManifest = null;
    state.workspace.auditLog.unshift(
      createAuditEvent(`Comment intent: ${target.label}`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} comment intent saved.`;
  } catch (error) {
    state.recordComment = {
      ...state.recordComment,
      entityType,
      entityId: target.entityId,
      body,
      status: "idle",
      persistence: null,
      auditPersistence: null,
      commentPolicy: null,
      targetLabel: null,
      bodyPreview: null,
      bodySha256: null,
    };
    state.ui.toast = `Comment blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewRecordCommentManifest(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing comment intents.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Comment manifest blocked: select a project.";
    render();
    return;
  }

  const target = recordCommentTargetFor(project, state.recordComment.entityType, state.recordComment.entityId);
  if (!target) {
    state.ui.toast = "Comment manifest blocked: select a target.";
    render();
    return;
  }

  try {
    const manifest = await exportRecordCommentManifest(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        entityType: target.entityType,
        entityId: target.entityId,
        limit: 20,
      },
      csrfToken,
    );
    state.recordCommentManifest = {
      checkedAt: new Date().toISOString(),
      targetLabel: target.label,
      persistence: manifest.persistence,
      auditPersistence: manifest.auditPersistence ?? null,
      manifestPolicy: manifest.manifestPolicy,
      rowCount: manifest.rowCount,
      truncated: manifest.truncated,
      target: {
        entityType: manifest.entityType,
        entityId: manifest.entityId,
      },
      comments: manifest.comments,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${target.label} comment intents checked`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} comment intents: ${manifest.rowCount}.`;
  } catch (error) {
    state.ui.toast = `Comment manifest blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

type PermissionAssignmentUpdate = {
  targetId: string;
  memberId: string;
  permission: RecordPermissionLevel;
  department: string;
  expiresAt: string;
  status: PermissionAssignmentState["status"];
  persistence: string | null;
  assignedProjectId: string | null;
  assignedEntityId: string | null;
  assignedMemberId: string | null;
  assignedPermission: RecordPermissionLevel | null;
};

function permissionAssignmentState(scope: PermissionScope): PermissionAssignmentState {
  if (scope === "task") return state.taskPermission;
  if (scope === "document") return state.documentPermission;
  return state.projectPermission;
}

function updatePermissionAssignmentState(scope: PermissionScope, update: PermissionAssignmentUpdate): void {
  const shared = {
    memberId: update.memberId,
    permission: update.permission,
    department: update.department,
    expiresAt: update.expiresAt,
    status: update.status,
    persistence: update.persistence,
    assignedMemberId: update.assignedMemberId,
    assignedPermission: update.assignedPermission,
  };
  if (scope === "task") {
    state.taskPermission = {
      ...state.taskPermission,
      ...shared,
      taskId: update.targetId,
      assignedProjectId: update.assignedProjectId,
      assignedTaskId: update.assignedEntityId,
    };
    return;
  }
  if (scope === "document") {
    state.documentPermission = {
      ...state.documentPermission,
      ...shared,
      assignedProjectId: update.assignedProjectId,
      assignedDocumentId: update.assignedEntityId,
    };
    return;
  }
  state.projectPermission = {
    ...state.projectPermission,
    ...shared,
    assignedProjectId: update.assignedProjectId,
  };
}

async function handlePermissionAssign(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;

  const scope = form.dataset.permissionAssignmentScope;
  if (!isPermissionScope(scope)) return;
  state.ui.permissionScope = scope;

  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = `Sign in before granting ${scope} permissions.`;
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const targetSelect = form.elements.namedItem("targetId") as HTMLSelectElement | null;
  const selectedTargetId = targetSelect?.value ?? "";
  const taskId = scope === "task" ? selectedTargetId || state.taskPermission.taskId : state.taskPermission.taskId;
  const task = project?.openTasks.find((candidate) => candidate.id === taskId) ?? project?.openTasks[0] ?? null;
  const documentId = scope === "document" ? selectedTargetId || state.ui.selectedDocId : state.ui.selectedDocId;
  const document = project?.docs.find((doc) => doc.id === documentId) ?? project?.docs[0] ?? null;
  const target = scope === "project"
    ? project ? { id: project.id, label: project.title } : null
    : scope === "task"
      ? task ? { id: task.id, label: task.title } : null
      : document ? { id: document.id, label: document.name } : null;
  const current = permissionAssignmentState(scope);
  const memberId = (form.elements.namedItem("memberId") as HTMLSelectElement | null)?.value ?? "";
  const permission = (form.elements.namedItem("permission") as HTMLSelectElement | null)?.value ?? current.permission;
  const department = (form.elements.namedItem("department") as HTMLInputElement | null)?.value.trim().slice(0, 80) ?? "";
  const expiresAtDate = (form.elements.namedItem("expiresAt") as HTMLInputElement | null)?.value ?? "";

  if (!project || !target || !memberId || !isRecordPermissionLevel(permission)) {
    state.ui.toast = `${scope[0]?.toUpperCase() ?? ""}${scope.slice(1)} permission blocked: invalid target, member, or access level.`;
    render();
    return;
  }

  const assignmentBase = {
    targetId: target.id,
    memberId,
    permission,
    department,
    expiresAt: expiresAtDate,
  };
  updatePermissionAssignmentState(scope, {
    ...assignmentBase,
    status: "assigning",
    persistence: null,
    assignedProjectId: null,
    assignedEntityId: null,
    assignedMemberId: null,
    assignedPermission: null,
  });
  state.ui.toast = null;
  persistUi();
  render();

  try {
    const result = await assignRecordPermission(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        entityType: scope,
        entityId: target.id,
        memberId,
        permission,
        department: department || null,
        expiresAt: expiresAtDate ? `${expiresAtDate}T00:00:00.000Z` : null,
      },
      csrfToken,
    );
    const member = state.workspace.members.find((candidate) => candidate.id === result.permission.memberId);
    updatePermissionAssignmentState(scope, {
      ...assignmentBase,
      permission: result.permission.permission,
      department: result.permission.department ?? "",
      expiresAt: result.permission.expiresAt?.slice(0, 10) ?? "",
      status: "assigned",
      persistence: result.persistence,
      assignedProjectId: scope === "project" ? result.permission.entityId : project.id,
      assignedEntityId: result.permission.entityId,
      assignedMemberId: result.permission.memberId,
      assignedPermission: result.permission.permission,
    });
    state.workspace.auditLog.unshift(
      createAuditEvent(
        `${scope[0]?.toUpperCase() ?? ""}${scope.slice(1)} permission: ${member?.displayName ?? result.permission.memberId} -> ${target.label} (${formatRecordPermissionLevel(result.permission.permission)})`,
        "System",
        "blue",
      ),
    );
    await persistWorkspace();
    state.ui.toast = `${target.label} access granted by the Worker.`;
  } catch (error) {
    updatePermissionAssignmentState(scope, {
      ...assignmentBase,
      status: "idle",
      persistence: null,
      assignedProjectId: null,
      assignedEntityId: null,
      assignedMemberId: null,
      assignedPermission: null,
    });
    state.ui.toast = `${target.label} access blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewRecordPermissionManifest(entityType: "project" | "task" | "document", mode: "active" | "expired" = "active"): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing record permissions.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const task = project?.openTasks.find((candidate) => candidate.id === state.taskPermission.taskId) ?? project?.openTasks[0] ?? null;
  const document = project?.docs.find((doc) => doc.id === state.ui.selectedDocId) ?? project?.docs[0] ?? null;
  const entityId = entityType === "project" ? project?.id : entityType === "task" ? task?.id : document?.id;
  const targetLabel = entityType === "project" ? project?.title : entityType === "task" ? task?.title : document?.name;
  if (!entityId || !targetLabel) {
    state.ui.toast = "Record permission review blocked: no selected target.";
    render();
    return;
  }

  try {
    const manifestRequest = {
      workspaceId: state.workspace.id,
      entityType,
      entityId,
      limit: 50,
    };
    const manifest = mode === "expired"
      ? await exportExpiredRecordPermissionManifest(
        WORKER_URL,
        manifestRequest,
        csrfToken,
      )
      : await exportRecordPermissionManifest(
        WORKER_URL,
        manifestRequest,
        csrfToken,
      );
    state.recordPermissionManifest = {
      checkedAt: new Date().toISOString(),
      targetLabel: mode === "expired" ? `${targetLabel} expired` : targetLabel,
      persistence: manifest.persistence,
      auditPersistence: manifest.auditPersistence ?? null,
      entityType: manifest.entityType,
      entityId: manifest.entityId,
      manifestPolicy: manifest.manifestPolicy,
      rowCount: manifest.rowCount,
      truncated: manifest.truncated,
      permissions: manifest.permissions,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${targetLabel} ${mode === "expired" ? "expired " : ""}permission manifest: ${manifest.rowCount} grants`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${targetLabel} ${mode === "expired" ? "expired " : ""}permission manifest ready: ${manifest.rowCount} grants${manifest.truncated ? " (truncated)" : ""}.`;
  } catch (error) {
    state.ui.toast = `Record permission review blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewRecordPermissionHistory(entityType: RecordPermissionHistoryEntityType): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing permission history.";
    render();
    return;
  }
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const task = project?.openTasks.find((candidate) => candidate.id === state.taskPermission.taskId) ?? project?.openTasks[0] ?? null;
  const document = project?.docs.find((doc) => doc.id === state.ui.selectedDocId) ?? project?.docs[0] ?? null;
  const entityId = entityType === "project" ? project?.id : entityType === "task" ? task?.id : document?.id;
  const targetLabel = entityType === "project" ? project?.title : entityType === "task" ? task?.title : document?.name;
  if (!entityId || !targetLabel) {
    state.ui.toast = "Permission history blocked: no selected target.";
    render();
    return;
  }

  try {
    const history = await exportRecordPermissionHistory(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        entityType,
        entityId,
        limit: 20,
      },
      csrfToken,
    );
    state.recordPermissionHistory = {
      checkedAt: new Date().toISOString(),
      targetLabel,
      persistence: history.persistence,
      auditPersistence: history.auditPersistence ?? null,
      historyPolicy: history.historyPolicy,
      rowCount: history.rowCount,
      truncated: history.truncated,
      target: {
        entityType: history.entityType,
        entityId: history.entityId,
      },
      entries: history.entries,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`${targetLabel} permission history checked`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `${targetLabel} permission history: ${history.rowCount} events.`;
  } catch (error) {
    state.ui.toast = `Permission history blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleRecordPermissionRevoke(permissionId: string): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before revoking record permissions.";
    render();
    return;
  }

  const manifest = state.recordPermissionManifest;
  const permission = manifest?.permissions.find((candidate) => candidate.id === permissionId);
  if (!manifest || !permission) {
    state.ui.toast = "Record permission revoke blocked: no selected grant.";
    render();
    return;
  }

  state.recordPermissionRevokingId = permissionId;
  state.ui.toast = null;
  render();

  try {
    const result = await revokeRecordPermission(
      WORKER_URL,
      {
        workspaceId: state.workspace.id,
        permissionId: permission.id,
        entityType: permission.entityType,
        entityId: permission.entityId,
        memberId: permission.memberId,
        permission: permission.permission,
      },
      csrfToken,
    );
    const removedPermissionId = result.permission.id;
    if (state.recordPermissionManifest) {
      state.recordPermissionManifest = {
        ...state.recordPermissionManifest,
        checkedAt: new Date().toISOString(),
        persistence: result.persistence,
        auditPersistence: result.auditPersistence ?? state.recordPermissionManifest.auditPersistence,
        rowCount: Math.max(0, state.recordPermissionManifest.rowCount - 1),
        permissions: state.recordPermissionManifest.permissions.filter((candidate) => candidate.id !== removedPermissionId),
      };
    }
    state.workspace.auditLog.unshift(
      createAuditEvent(
        `Permission revoked: ${result.permission.memberId} -> ${manifest.targetLabel}`,
        "System",
        "amber",
      ),
    );
    await persistWorkspace();
    state.ui.toast = `Permission revoked for ${result.permission.memberId}.`;
  } catch (error) {
    state.ui.toast = `Record permission revoke blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  } finally {
    state.recordPermissionRevokingId = null;
    render();
  }
}

async function handleProviderDryRun(key: IntegrationKey): Promise<void> {
  try {
    const provider = await runProviderDryRun(
      WORKER_URL,
      key,
      state.auth.session?.csrfToken ?? "local-dry-run-csrf",
    );
    state.providerPreview = {
      ...provider,
      checkedAt: new Date().toISOString(),
    };
    if (provider.key !== "google") {
      state.googleDriveSync = null;
    }
    if (provider.key !== "stripe") {
      state.stripeSummary = null;
      state.stripeSummaryResult = null;
    }
    if (provider.key !== "sms") {
      state.smsConsentManifest = null;
      state.telnyxProviderReadiness = null;
    }
    state.workspace.auditLog.unshift(createAuditEvent(`${provider.label} dry-run preflight checked`, "System", "blue"));
    await persistWorkspace();
    state.ui.toast = `${provider.label} dry run checked by the Worker.`;
  } catch (error) {
    state.ui.toast = `Provider dry run blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleTelnyxProviderReadiness(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken || !canManageSmsConsent()) {
    state.ui.toast = "Owner or producer access is required to check Telnyx.";
    render();
    return;
  }
  try {
    const readiness = await checkTelnyxProviderStatus(WORKER_URL, csrfToken, state.workspace.id);
    state.telnyxProviderReadiness = { ...readiness, checkedAt: new Date().toISOString() };
    state.workspace.auditLog.unshift(createAuditEvent("Telnyx provider readiness checked", "System", "blue"));
    await persistWorkspace();
    state.ui.toast = `Telnyx: ${readiness.status.replaceAll("_", " ")}.`;
  } catch (error) {
    state.ui.toast = `Telnyx readiness blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleSmsConsentManifest(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reviewing SMS consent records.";
    render();
    return;
  }
  try {
    const manifest = await fetchSmsConsentManifest(WORKER_URL, csrfToken, state.workspace.id);
    state.smsConsentManifest = { ...manifest, checkedAt: new Date().toISOString() };
    state.ui.toast = `SMS consent records: ${manifest.count}.`;
  } catch (error) {
    state.ui.toast = `SMS consent review blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

function canManageSmsConsent(): boolean {
  const role = state.auth.session?.role;
  return role === "owner" || role === "producer";
}

function renderSmsConsentEnrollmentForm(): string {
  return `
    <form class="invite-form sms-consent-form" data-action="sms-consent-enroll">
      <label class="sms-consent-phone">
        <span>Mobile number</span>
        <input name="recipientE164" type="tel" inputmode="tel" autocomplete="tel" placeholder="+15051234567" required>
      </label>
      <fieldset class="sms-recipient-fieldset">
        <legend>Production messages</legend>
        ${TELNYX_SMS_CATEGORIES.map((category) => `
          <label class="sms-recipient-option">
            <input type="checkbox" name="category" value="${category}" checked>
            <span>${TELNYX_SMS_CATEGORY_LABELS[category]}</span>
          </label>
        `).join("")}
      </fieldset>
      <label class="sms-consent-disclosure">
        <input type="checkbox" name="disclosureAcknowledged" required>
        <span>${escapeHtml(TELNYX_SMS_CONSENT_DISCLOSURE)}</span>
      </label>
      <small class="sms-consent-links"><a href="/sms.html" target="_blank" rel="noreferrer">SMS terms</a> · <a href="/privacy.html" target="_blank" rel="noreferrer">Privacy</a> · <a href="/terms.html" target="_blank" rel="noreferrer">Terms</a></small>
      <button type="submit">${icon("provider")} Enable crew texts</button>
    </form>
  `;
}

async function handleSmsConsentEnrollment(form: HTMLFormElement): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before enabling crew texts.";
    render();
    return;
  }
  const formData = new FormData(form);
  const recipientE164 = String(formData.get("recipientE164") ?? "").trim();
  const categories = formData.getAll("category").map(String).filter(
    (value): value is SmsConsentCategory => isTelnyxSmsCategory(value),
  );
  if (!/^\+[1-9][0-9]{7,14}$/.test(recipientE164) || categories.length < 1 || formData.get("disclosureAcknowledged") !== "on") {
    state.ui.toast = "Crew text enrollment needs a +country-code mobile number, at least one category, and consent acknowledgment.";
    render();
    return;
  }
  try {
    const result = await commitSmsSelfConsent(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      recipientE164,
      categories,
      disclosureVersion: TELNYX_SMS_DISCLOSURE_VERSION,
    });
    form.reset();
    state.ui.toast = result.idempotent ? "Crew text consent was already recorded." : "Crew text consent recorded.";
    if (canManageSmsConsent()) {
      await handleSmsConsentManifest();
    } else {
      render();
    }
  } catch (error) {
    state.ui.toast = `Crew text enrollment blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
    render();
  }
}

async function handleSmsSend(form: HTMLFormElement): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!csrfToken || !project) {
    state.ui.toast = "Sign in and select a project before sending SMS.";
    render();
    return;
  }
  const formData = new FormData(form);
  const recipientIds = formData.getAll("recipientId").map(String);
  const category = String(formData.get("category") ?? "");
  const messageBody = String(formData.get("messageBody") ?? "");
  const emergencyOverride = formData.get("emergencyOverride") === "on";
  const rawReason = String(formData.get("emergencyReasonCode") ?? "");
  if (
    recipientIds.length < 1
    || recipientIds.length > 10
    || !isTelnyxSmsCategory(category)
    || !messageBody.trim()
    || messageBody.length > 1_200
  ) {
    state.ui.toast = "SMS send blocked: select 1-10 recipients, a category, and a message.";
    render();
    return;
  }
  try {
    const result = await sendSmsBatch(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      projectId: project.id,
      recipientIds,
      category,
      messageBody,
      requestKey: crypto.randomUUID(),
      emergencyOverride,
      emergencyReasonCode: rawReason === "immediate_safety" || rawReason === "location_emergency" ? rawReason : null,
    });
    state.ui.toast = `SMS send: ${result.queuedCount} queued, ${result.failedCount} failed, ${result.replayedCount} replayed.`;
  } catch (error) {
    state.ui.toast = `SMS send blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

function renderTelnyxProviderReadiness(readiness: TelnyxProviderReadinessState): string {
  const configuredCount = Object.values(readiness.configured).filter(Boolean).length;
  const configuredTotal = Object.keys(readiness.configured).length;
  const campaignLabel = readiness.campaign.status?.replaceAll("_", " ") ?? "Campaign unavailable";
  const numberLabel = readiness.number.campaignAssigned
    ? "Campaign assigned"
    : readiness.number.assignmentStatus?.replaceAll("_", " ") ?? "Campaign not assigned";
  return `
    <div class="provider-runtime-readiness" role="status">
      <div class="provider-runtime-summary">
        <strong>${escapeHtml(readiness.status.replaceAll("_", " "))}</strong>
        <span>${configuredCount}/${configuredTotal} configuration checks</span>
        <small>Webhook ${readiness.activationGates.webhookLive ? "live" : "closed"} - send ${readiness.activationGates.sendLive ? "live" : "closed"}</small>
      </div>
      <ul class="provider-runtime-list">
        <li>
          <span class="status-dot ${readiness.profile.enabled && readiness.profile.nameMatches && readiness.profile.webhookMatches && readiness.profile.webhookApiV2 ? "teal" : "gray"}"></span>
          <div>
            <strong>Film profile</strong>
            <span>${readiness.profile.reachable ? (readiness.profile.enabled ? "Enabled" : "Disabled") : "Unavailable"}</span>
            <small>name ${readiness.profile.nameMatches ? "matched" : "unmatched"} - webhook ${readiness.profile.webhookMatches && readiness.profile.webhookApiV2 ? "v2 ready" : "not ready"}</small>
          </div>
        </li>
        <li>
          <span class="status-dot ${readiness.campaign.active && readiness.campaign.mno.rejected === 0 ? "teal" : readiness.campaign.mno.review > 0 ? "amber" : "gray"}"></span>
          <div>
            <strong>${escapeHtml(campaignLabel)}</strong>
            <span>${readiness.campaign.mno.approved} approved - ${readiness.campaign.mno.review} review - ${readiness.campaign.mno.rejected} rejected</span>
            <small>${readiness.campaign.mno.total} carrier status${readiness.campaign.mno.total === 1 ? "" : "es"}</small>
          </div>
        </li>
        <li>
          <span class="status-dot ${readiness.number.campaignAssigned ? "teal" : readiness.number.profileAssigned && readiness.number.smsCapable ? "amber" : "gray"}"></span>
          <div>
            <strong>505 sender</strong>
            <span>${escapeHtml(numberLabel)}</span>
            <small>SMS ${readiness.number.smsCapable ? "ready" : "unavailable"} - profile ${readiness.number.profileAssigned ? "assigned" : "unassigned"}</small>
          </div>
        </li>
      </ul>
      ${readiness.blockers.length ? `<small>${escapeHtml(readiness.blockers.slice(0, 3).join(" "))}</small>` : ""}
      <small>${escapeHtml(readiness.persistence.replaceAll("_", " "))}${readiness.auditPersistence ? ` - ${escapeHtml(readiness.auditPersistence.replaceAll("_", " "))}` : ""}</small>
    </div>
  `;
}

function renderSmsConsentManifest(manifest: SmsConsentManifestState): string {
  const activeRecipients = manifest.recipients.filter((recipient) => recipient.status === "active");
  return `
    <div class="provider-runtime-readiness" role="status">
      <div class="provider-runtime-summary">
        <strong>${manifest.count} consent record${manifest.count === 1 ? "" : "s"}</strong>
        <span>${manifest.truncated ? "Bounded result" : "Complete result"}</span>
        <small>${escapeHtml(manifest.persistence.replaceAll("_", " "))} - no phone, hash, or ciphertext values</small>
      </div>
      ${
        manifest.recipients.length
          ? `<ul class="provider-runtime-list">
              ${manifest.recipients.map((recipient) => `
                <li>
                  <span class="status-dot ${recipient.status === "active" ? "teal" : "gray"}"></span>
                  <div>
                    <strong>${escapeHtml(recipient.memberId ?? "Unlinked recipient")}</strong>
                    <span>${escapeHtml(recipient.status)} - ${escapeHtml(recipient.categories.join(", ").replaceAll("_", " ") || "no active categories")}</span>
                    <small>${escapeHtml(recipient.disclosureVersion ?? "No disclosure version")} - updated ${escapeHtml(formatShortDateTime(recipient.updatedAt))}</small>
                  </div>
                </li>
              `).join("")}
            </ul>`
          : `<p class="empty-inline">No SMS consent records.</p>`
      }
      ${activeRecipients.length ? renderSmsSendForm(activeRecipients) : ""}
    </div>
  `;
}

function renderSmsSendForm(recipients: SmsConsentManifest["recipients"]): string {
  return `
    <form class="invite-form sms-send-form" data-action="sms-send">
      <fieldset class="sms-recipient-fieldset">
        <legend>Recipients</legend>
        ${recipients.slice(0, 10).map((recipient) => `
          <label class="sms-recipient-option">
            <input type="checkbox" name="recipientId" value="${escapeAttribute(recipient.id)}">
            <span>${escapeHtml(recipient.memberId ?? "Unlinked recipient")}</span>
          </label>
        `).join("")}
      </fieldset>
      <select name="category" aria-label="SMS category" required>
        <option value="call_sheet">Call sheet</option>
        <option value="schedule_change">Schedule change</option>
        <option value="safety_location_alert">Safety or location alert</option>
      </select>
      <select name="emergencyReasonCode" aria-label="Emergency reason">
        <option value="">No emergency reason</option>
        <option value="immediate_safety">Immediate safety</option>
        <option value="location_emergency">Location emergency</option>
      </select>
      <textarea name="messageBody" rows="4" maxlength="1200" placeholder="Crew message" aria-label="SMS message" required></textarea>
      <label class="sms-override-option">
        <input type="checkbox" name="emergencyOverride">
        <span>Emergency override</span>
      </label>
      <button type="submit">${icon("provider")} Send SMS</button>
    </form>
  `;
}

async function handleProviderRuntimeReadiness(): Promise<void> {
  try {
    const result = await checkProviderRuntimeReadiness(
      WORKER_URL,
      state.auth.session?.csrfToken ?? "local-dry-run-csrf",
      state.workspace.id,
    );
    state.providerRuntimeReadiness = {
      ...result,
      checkedAt: new Date().toISOString(),
    };
    state.workspace.auditLog.unshift(createAuditEvent("Provider runtime readiness checked", "System", "blue"));
    await persistWorkspace();
    state.ui.toast = `Provider runtime readiness: ${result.liveCount} live, ${result.blockedCount} blocked.`;
  } catch (error) {
    state.ui.toast = `Provider runtime readiness blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

function renderProviderRuntimeReadiness(readiness: ProviderRuntimeReadinessState): string {
  return `
    <div class="provider-runtime-readiness" role="status">
      <div class="provider-runtime-summary">
        <strong>${readiness.liveCount} live</strong>
        <span>${readiness.partialLiveCount} partial - ${readiness.blockedCount} blocked</span>
        <small>${escapeHtml(readiness.policy.replaceAll("_", " "))} - no secret values</small>
      </div>
      <ul class="provider-runtime-list">
        ${readiness.providers.map((provider) => `
          <li>
            <span class="status-dot ${provider.status === "live" ? "teal" : provider.status === "partial_live" ? "amber" : "gray"}"></span>
            <div>
              <strong>${escapeHtml(provider.label)}</strong>
              <span>${escapeHtml(provider.runtimeMode.replaceAll("_", " "))}</span>
              <small>${escapeHtml(provider.liveCapabilities.length ? provider.liveCapabilities.join(", ").replaceAll("_", " ") : provider.blockers[0] ?? "Blocked by explicit provider gate")}</small>
            </div>
          </li>
        `).join("")}
      </ul>
      <small>${escapeHtml(readiness.persistence.replaceAll("_", " "))}${readiness.auditPersistence ? ` - ${escapeHtml(readiness.auditPersistence.replaceAll("_", " "))}` : ""}</small>
    </div>
  `;
}

function renderGoogleConnection(status: GoogleConnectionState): string {
  const connection = status.connection;
  const active = connection?.status === "active";
  const scopeLabels = connection?.scopes.map((scope) => scope.split("/").at(-1) ?? scope) ?? [];
  return `
    <div class="provider-preview" role="status">
      <strong>${active ? "Google connected" : "Google connection"}</strong>
      <span>${active ? `${scopeLabels.length} approved scope${scopeLabels.length === 1 ? "" : "s"}` : status.readiness.status.replaceAll("_", " ")}</span>
      ${active && scopeLabels.length ? `<span>${escapeHtml(scopeLabels.join(", "))}</span>` : ""}
      ${active && connection?.tokenExpiresAt ? `<small>Access refresh due ${escapeHtml(formatShortDateTime(connection.tokenExpiresAt))}</small>` : ""}
      ${!active && status.readiness.blockers.length ? `<small>${escapeHtml(status.readiness.blockers[0] ?? "Google OAuth is not enabled.")}</small>` : ""}
      <div class="inline-actions">
        ${active
          ? `
              <button class="secondary-button" type="button" data-action="google-drive-manifest">${icon("folder")} Read Drive</button>
              <button class="secondary-button" type="button" data-action="google-disconnect">Disconnect</button>
            `
          : `<button class="secondary-button" type="button" data-action="google-connect"${status.readiness.liveOAuthAllowed ? "" : " disabled"}>${icon("provider")} Connect Google</button>`}
      </div>
      <small>${escapeHtml(status.persistence.replaceAll("_", " "))}${status.auditPersistence ? ` - ${escapeHtml(status.auditPersistence.replaceAll("_", " "))}` : ""}</small>
    </div>
  `;
}

function renderMetaConnection(status: MetaConnectionState): string {
  const connection = status.connection;
  const active = connection?.status === "active";
  const pending = connection?.status === "pending_page_selection";
  const accountLabel = connection?.page?.name
    ?? connection?.instagramAccount?.username
    ?? (pending ? "Page selection pending" : status.readiness.status.replaceAll("_", " "));
  return `
    <div class="provider-preview" role="status">
      <strong>${active ? "Meta connected" : "Meta connection"}</strong>
      <span>${escapeHtml(accountLabel)}</span>
      ${active && connection?.instagramAccount ? `<span>Instagram: ${escapeHtml(connection.instagramAccount.username ? `@${connection.instagramAccount.username}` : connection.instagramAccount.id)}</span>` : ""}
      ${connection?.tokenExpiresAt ? `<small>Authorization expires ${escapeHtml(formatShortDateTime(connection.tokenExpiresAt))}</small>` : ""}
      ${!connection && status.readiness.blockers.length ? `<small>${escapeHtml(status.readiness.blockers[0] ?? "Meta OAuth is not enabled.")}</small>` : ""}
      <div class="inline-actions">
        ${active ? `<button class="secondary-button" type="button" data-action="meta-analytics">${icon("calendar")} Read 30 days</button>` : ""}
        ${active || pending ? `<button class="secondary-button" type="button" data-action="meta-pages">${icon("provider")} Pages</button>` : ""}
        ${active || pending ? `<button class="secondary-button" type="button" data-action="meta-disconnect">Disconnect</button>` : ""}
        ${!active && !pending ? `<button class="secondary-button" type="button" data-action="meta-connect"${status.readiness.liveOAuthAllowed ? "" : " disabled"}>${icon("provider")} Connect Meta</button>` : ""}
      </div>
      <small>${escapeHtml(status.persistence.replaceAll("_", " "))}${status.auditPersistence ? ` - ${escapeHtml(status.auditPersistence.replaceAll("_", " "))}` : ""}</small>
    </div>
  `;
}

function renderMetaPageCandidates(result: MetaPageCandidatesState): string {
  return `
    <div class="provider-runtime-readiness" role="status">
      <div class="provider-runtime-summary">
        <strong>${result.pages.length} eligible account${result.pages.length === 1 ? "" : "s"}</strong>
        <span>Page and linked Instagram mapping</span>
        <small>${escapeHtml(result.persistence.replaceAll("_", " "))} - no access tokens</small>
      </div>
      ${result.pages.length
        ? `<ul class="provider-runtime-list">
            ${result.pages.map((page) => {
              const eligible = page.tasks.includes("ANALYZE") && Boolean(page.instagramAccount);
              return `
                <li>
                  <span class="status-dot ${eligible ? "teal" : "gray"}"></span>
                  <div>
                    <strong>${escapeHtml(page.name)}</strong>
                    <span>${page.instagramAccount ? escapeHtml(page.instagramAccount.username ? `@${page.instagramAccount.username}` : page.instagramAccount.id) : "No linked Instagram account"}</span>
                    <small>${escapeHtml(page.tasks.join(", ").replaceAll("_", " ") || "No Page tasks returned")}</small>
                  </div>
                  <button class="secondary-button" type="button" data-action="meta-select-page" data-page-id="${escapeHtml(page.id)}"${eligible ? "" : " disabled"}>Select</button>
                </li>
              `;
            }).join("")}
          </ul>`
        : `<p class="empty-inline">No analyzable Page with linked Instagram account.</p>`}
    </div>
  `;
}

function renderMetaAnalytics(result: MetaAnalyticsState): string {
  return `
    <div class="provider-runtime-readiness" role="status">
      <div class="provider-runtime-summary">
        <strong>${result.calendar.length} calendar item${result.calendar.length === 1 ? "" : "s"}</strong>
        <span>${result.insights.length} insight series - ${escapeHtml(result.status)}</span>
        <small>${escapeHtml(result.since)} to ${escapeHtml(result.until)}${result.warnings.length ? ` - ${result.warnings.length} partial read warning${result.warnings.length === 1 ? "" : "s"}` : ""}</small>
      </div>
      ${result.insights.length
        ? `<ul class="provider-runtime-list">
            ${result.insights.map((series) => {
              const latest = series.values.at(-1)?.value ?? 0;
              return `
                <li>
                  <span class="status-dot ${series.provider === "instagram" ? "amber" : "blue"}"></span>
                  <div>
                    <strong>${escapeHtml(formatMetaMetric(series.metric))}</strong>
                    <span>${escapeHtml(series.provider)} - ${escapeHtml(series.period)}</span>
                    <small>${escapeHtml(formatCompactNumber(latest))}</small>
                  </div>
                </li>
              `;
            }).join("")}
          </ul>`
        : ""}
      ${result.calendar.length
        ? `<ul class="provider-runtime-list">
            ${result.calendar.map((item) => `
              <li>
                <span class="status-dot ${item.provider === "instagram" ? "amber" : "blue"}"></span>
                <div>
                  <strong>${item.permalink ? `<a href="${escapeHtml(item.permalink)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>` : escapeHtml(item.label)}</strong>
                  <span>${escapeHtml(item.provider)} - ${escapeHtml(formatShortDateTime(item.publishedAt))}</span>
                  <small>${formatCompactNumber(item.engagement.reactions)} reactions - ${formatCompactNumber(item.engagement.comments)} comments - ${formatCompactNumber(item.engagement.shares)} shares</small>
                </div>
              </li>
            `).join("")}
          </ul>`
        : `<p class="empty-inline">No published items in this period.</p>`}
      <small>${escapeHtml(result.persistence.replaceAll("_", " "))}${result.auditPersistence ? ` - ${escapeHtml(result.auditPersistence.replaceAll("_", " "))}` : ""}</small>
    </div>
  `;
}

function formatMetaMetric(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function renderGoogleDriveManifest(result: GoogleDriveManifestState): string {
  return `
    <div class="provider-runtime-readiness" role="status">
      <div class="provider-runtime-summary">
        <strong>${result.manifest.files.length} Drive item${result.manifest.files.length === 1 ? "" : "s"}</strong>
        <span>${result.manifest.truncated ? "More items available" : "Folder page complete"}</span>
        <small>${result.tokenRefreshed ? "Access refreshed - " : ""}${escapeHtml(result.persistence.replaceAll("_", " "))}</small>
      </div>
      <ul class="provider-runtime-list">
        ${result.manifest.files.map((file) => `
          <li>
            <span class="status-dot ${file.mimeType === "application/vnd.google-apps.folder" ? "amber" : "teal"}"></span>
            <div>
              <strong>${file.webViewLink
                ? `<a href="${escapeAttribute(file.webViewLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(file.name)}</a>`
                : escapeHtml(file.name)}</strong>
              <span>${escapeHtml(googleDriveMimeLabel(file.mimeType))}</span>
              <small>${file.modifiedTime ? escapeHtml(formatShortDateTime(file.modifiedTime)) : "No modified date"}${file.sizeBytes === null ? "" : ` - ${escapeHtml(formatBytes(file.sizeBytes))}`}</small>
            </div>
          </li>
        `).join("") || `<li><div><strong>Folder is empty</strong></div></li>`}
      </ul>
      ${result.manifest.nextPageToken
        ? `<button class="secondary-button full-width" type="button" data-action="google-drive-manifest-next">Next page</button>`
        : ""}
    </div>
  `;
}

function googleDriveMimeLabel(mimeType: string): string {
  if (mimeType === "application/vnd.google-apps.folder") return "Folder";
  if (mimeType === "application/vnd.google-apps.document") return "Google Doc";
  if (mimeType === "application/vnd.google-apps.spreadsheet") return "Google Sheet";
  if (mimeType === "application/vnd.google-apps.presentation") return "Google Slides";
  if (mimeType === "application/pdf") return "PDF";
  return mimeType;
}

async function handleGoogleConnectionCheck(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before checking Google.";
    render();
    return;
  }
  try {
    const result = await checkGoogleConnection(WORKER_URL, csrfToken, state.workspace.id);
    state.googleConnection = { ...result, checkedAt: new Date().toISOString() };
    state.workspace.auditLog.unshift(createAuditEvent("Google connection status checked", "System", "blue"));
    await persistWorkspace();
    state.ui.toast = result.connection?.status === "active"
      ? "Google is connected to this workspace."
      : result.readiness.liveOAuthAllowed
        ? "Google is ready to connect."
        : "Google connection configuration is incomplete.";
  } catch (error) {
    state.ui.toast = `Google connection check blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleGoogleConnect(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before connecting Google.";
    render();
    return;
  }
  try {
    const result = await startGoogleOAuth(
      WORKER_URL,
      csrfToken,
      state.workspace.id,
      { includeDocsExport: false, includeCalendarSync: false },
    );
    state.ui.toast = "Opening Google authorization...";
    render();
    window.location.assign(result.authorizationUrl);
  } catch (error) {
    state.ui.toast = `Google connection blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
    render();
  }
}

async function handleGoogleDisconnect(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before disconnecting Google.";
    render();
    return;
  }
  if (!window.confirm("Disconnect Google and delete the workspace's stored Google tokens?")) return;
  try {
    const result = await disconnectGoogle(WORKER_URL, csrfToken, state.workspace.id);
    state.googleConnection = {
      readiness: state.googleConnection?.readiness ?? (await checkGoogleConnection(WORKER_URL, csrfToken, state.workspace.id)).readiness,
      connection: result.connection,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence,
      checkedAt: new Date().toISOString(),
    };
    state.googleDriveManifest = null;
    state.workspace.auditLog.unshift(createAuditEvent("Google disconnected", "System", "amber"));
    await persistWorkspace();
    state.ui.toast = result.providerRevoked
      ? "Google disconnected and provider access revoked."
      : "Google disconnected; stored tokens were deleted.";
  } catch (error) {
    state.ui.toast = `Google disconnect blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleGoogleDriveManifest(nextPage = false): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reading Google Drive.";
    render();
    return;
  }
  const existingRootFolderId = state.googleDriveManifest?.manifest.rootFolderId
    ?? state.googleConnection?.connection?.rootFolderId
    ?? "";
  const rootFolderId = nextPage
    ? existingRootFolderId
    : window.prompt("Google Drive root folder ID", existingRootFolderId)?.trim() ?? "";
  if (!rootFolderId) {
    state.ui.toast = nextPage ? "Google Drive folder state is unavailable." : "Google Drive read canceled.";
    render();
    return;
  }
  const pageToken = nextPage ? state.googleDriveManifest?.manifest.nextPageToken ?? "" : "";
  if (nextPage && !pageToken) return;
  try {
    const result = await fetchGoogleDriveManifest(
      WORKER_URL,
      csrfToken,
      {
        workspaceId: state.workspace.id,
        rootFolderId,
        ...(pageToken ? { pageToken } : {}),
      },
    );
    state.googleDriveManifest = { ...result, checkedAt: new Date().toISOString() };
    if (state.googleConnection?.connection) {
      state.googleConnection.connection = {
        ...state.googleConnection.connection,
        rootFolderId: result.manifest.rootFolderId,
      };
    }
    state.workspace.auditLog.unshift(createAuditEvent(
      `Google Drive manifest read: ${result.manifest.files.length} items`,
      "System",
      "teal",
    ));
    await persistWorkspace();
    state.ui.toast = `Google Drive returned ${result.manifest.files.length} items${result.manifest.truncated ? "; more available" : ""}.`;
  } catch (error) {
    state.ui.toast = `Google Drive read blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleGoogleDriveSyncDryRun(): Promise<void> {
  const rootFolderId = window.prompt(
    "Drive root folder ID for dry run. Leave blank to see setup blockers.",
    state.googleDriveSync?.rootFolderId ?? "",
  );
  if (rootFolderId === null) {
    state.ui.toast = "Google Drive sync dry run canceled.";
    render();
    return;
  }

  try {
    const result = await runGoogleDriveSyncDryRun(
      WORKER_URL,
      state.auth.session?.csrfToken ?? "local-dry-run-csrf",
      {
        workspaceId: state.workspace.id,
        ...(rootFolderId.trim() ? { rootFolderId: rootFolderId.trim() } : {}),
        includeDocsExport: false,
        includeCalendarSync: false,
      },
    );
    state.googleDriveSync = {
      ...result,
      checkedAt: new Date().toISOString(),
    };
    state.workspace.auditLog.unshift(createAuditEvent("Google Drive sync dry-run plan checked", "System", "blue"));
    await persistWorkspace();
    state.ui.toast = "Google Drive sync dry run checked by the Worker.";
  } catch (error) {
    state.ui.toast = `Google Drive sync dry run blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleMetaConnectionCheck(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before checking Meta.";
    render();
    return;
  }
  try {
    const result = await checkMetaConnection(WORKER_URL, csrfToken, state.workspace.id);
    state.metaConnection = { ...result, checkedAt: new Date().toISOString() };
    state.ui.toast = result.connection?.status === "active"
      ? "Meta is connected to this workspace."
      : result.connection?.status === "pending_page_selection"
        ? "Meta is authorized; select a Page."
        : result.readiness.liveOAuthAllowed
          ? "Meta is ready to connect."
          : "Meta connection configuration is incomplete.";
  } catch (error) {
    state.ui.toast = `Meta connection check blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleMetaConnect(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before connecting Meta.";
    render();
    return;
  }
  try {
    const result = await startMetaOAuth(WORKER_URL, csrfToken, state.workspace.id);
    state.ui.toast = "Opening Meta authorization...";
    render();
    window.location.assign(result.authorizationUrl);
  } catch (error) {
    state.ui.toast = `Meta connection blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
    render();
  }
}

async function handleMetaPageCandidates(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reading Meta Pages.";
    render();
    return;
  }
  try {
    const result = await fetchMetaPageCandidates(WORKER_URL, csrfToken, state.workspace.id);
    state.metaPageCandidates = { ...result, checkedAt: new Date().toISOString() };
    state.ui.toast = `Meta returned ${result.pages.length} Page candidate${result.pages.length === 1 ? "" : "s"}.`;
  } catch (error) {
    state.ui.toast = `Meta Page discovery blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleMetaPageSelection(pageId: string): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken || !/^\d{5,40}$/.test(pageId)) {
    state.ui.toast = "Meta Page selection is unavailable.";
    render();
    return;
  }
  try {
    const result = await selectMetaPage(WORKER_URL, csrfToken, state.workspace.id, pageId);
    const readiness = state.metaConnection?.readiness ?? (await checkMetaConnection(WORKER_URL, csrfToken, state.workspace.id)).readiness;
    state.metaConnection = {
      readiness,
      connection: result.connection,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence,
      checkedAt: new Date().toISOString(),
    };
    state.metaPageCandidates = null;
    state.metaAnalytics = null;
    state.workspace.auditLog.unshift(createAuditEvent(`Meta Page selected: ${result.connection.page?.name ?? pageId}`, "System", "teal"));
    await persistWorkspace();
    state.ui.toast = `${result.connection.page?.name ?? "Meta Page"} connected for read-only analytics.`;
  } catch (error) {
    state.ui.toast = `Meta Page selection blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleMetaAnalytics(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before reading Meta analytics.";
    render();
    return;
  }
  const untilDate = new Date();
  const sinceDate = new Date(untilDate);
  sinceDate.setUTCDate(sinceDate.getUTCDate() - 29);
  try {
    const result = await fetchMetaAnalytics(
      WORKER_URL,
      csrfToken,
      {
        workspaceId: state.workspace.id,
        since: sinceDate.toISOString().slice(0, 10),
        until: untilDate.toISOString().slice(0, 10),
      },
    );
    state.metaAnalytics = { ...result, checkedAt: new Date().toISOString() };
    state.workspace.auditLog.unshift(createAuditEvent(
      `Meta analytics read: ${result.calendar.length} calendar items, ${result.insights.length} insight series`,
      "System",
      result.status === "complete" ? "teal" : "amber",
    ));
    await persistWorkspace();
    state.ui.toast = `Meta read complete: ${result.calendar.length} calendar items and ${result.insights.length} insight series.`;
  } catch (error) {
    state.ui.toast = `Meta analytics blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleMetaDisconnect(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before disconnecting Meta.";
    render();
    return;
  }
  if (!window.confirm("Disconnect Meta, revoke the grant, and delete stored Meta tokens and account mappings?")) return;
  try {
    const result = await disconnectMeta(WORKER_URL, csrfToken, state.workspace.id);
    const readiness = state.metaConnection?.readiness ?? (await checkMetaConnection(WORKER_URL, csrfToken, state.workspace.id)).readiness;
    state.metaConnection = {
      readiness,
      connection: result.connection,
      persistence: result.persistence,
      auditPersistence: result.auditPersistence,
      checkedAt: new Date().toISOString(),
    };
    state.metaPageCandidates = null;
    state.metaAnalytics = null;
    state.workspace.auditLog.unshift(createAuditEvent("Meta disconnected", "System", "amber"));
    await persistWorkspace();
    state.ui.toast = result.providerRevoked
      ? "Meta disconnected and provider access revoked."
      : "Meta disconnected; stored tokens and mappings were deleted.";
  } catch (error) {
    state.ui.toast = `Meta disconnect blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleStripeSummaryReadiness(): Promise<void> {
  try {
    const result = await checkStripeSummaryReadiness(
      WORKER_URL,
      state.auth.session?.csrfToken ?? "local-dry-run-csrf",
      state.workspace.id,
    );
    state.stripeSummary = {
      ...result,
      checkedAt: new Date().toISOString(),
    };
    if (!result.liveSummaryReadAllowed) {
      state.stripeSummaryResult = null;
    }
    state.workspace.auditLog.unshift(createAuditEvent("Stripe summary readiness checked", "System", "blue"));
    await persistWorkspace();
    state.ui.toast = "Stripe summary readiness checked by the Worker.";
  } catch (error) {
    state.ui.toast = `Stripe summary readiness blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleStripeSummaryFetch(): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId) ?? state.workspace.projects[0];
  if (!project) {
    state.ui.toast = "Stripe summary fetch blocked: no active project";
    render();
    return;
  }
  try {
    const result = await fetchStripeSummary(
      WORKER_URL,
      state.auth.session?.csrfToken ?? "local-dry-run-csrf",
      state.workspace.id,
      project.id,
    );
    state.stripeSummaryResult = {
      ...result,
      checkedAt: new Date().toISOString(),
    };
    state.workspace.auditLog.unshift(createAuditEvent("Stripe summary aggregates checked", "System", "blue"));
    await persistWorkspace();
    state.ui.toast = "Stripe summary aggregates checked by the Worker.";
  } catch (error) {
    state.ui.toast = `Stripe summary fetch blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

function filterProjects(projects: FilmProject[], query: string): FilmProject[] {
  return filterProjectsBySearch(projects, query);
}

function isIntegrationKey(value: string | undefined): value is IntegrationKey {
  return value === "pool"
    || value === "store"
    || value === "stripe"
    || value === "social"
    || value === "google"
    || value === "resend"
    || value === "sms";
}

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return value === "owner" || INVITE_ROLES.includes(value as WorkspaceRole);
}

function slugForLocalRecord(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "record";
}

function isRecordPermissionLevel(value: string): value is RecordPermissionLevel {
  return RECORD_PERMISSION_LEVELS.includes(value as RecordPermissionLevel);
}

function isOwnerTransferEntityType(value: string): value is OwnerTransferEntityType {
  return OWNER_TRANSFER_ENTITY_TYPES.includes(value as OwnerTransferEntityType);
}

function isRecordCommentEntityType(value: string): value is RecordCommentEntityType {
  return RECORD_COMMENT_ENTITY_TYPES.includes(value as RecordCommentEntityType);
}

function isRecordMutationKind(value: string): value is RecordMutationKind {
  return value === "update" || value === "delete";
}

function isWorkspaceMemberManagedStatus(value: string): value is WorkspaceMemberManagedStatus {
  return value === "active" || value === "disabled";
}

function formatRecordPermissionLevel(value: RecordPermissionLevel): string {
  if (value === "read") return "Read";
  if (value === "comment") return "Comment";
  if (value === "write") return "Write";
  return "Admin";
}

function formatWorkspaceMemberStatus(value: WorkspaceData["members"][number]["status"]): string {
  if (value === "active") return "Active";
  if (value === "disabled") return "Disabled";
  return "Invited";
}

function memberDisplayName(memberId: string): string {
  return state.workspace.members.find((member) => member.id === memberId)?.displayName ?? memberId;
}

function ownerTransferTargetFor(
  project: FilmProject,
  entityType: OwnerTransferEntityType,
  entityId = state.ownerTransfer.entityId,
): { entityType: OwnerTransferEntityType; entityId: string; label: string } | null {
  const targets = ownerTransferTargetsFor(project, entityType);
  return targets.find((target) => target.entityId === entityId)
    ?? defaultOwnerTransferTargetFor(project, entityType)
    ?? targets[0]
    ?? null;
}

function defaultOwnerTransferTargetFor(
  project: FilmProject,
  entityType: OwnerTransferEntityType,
): { entityType: OwnerTransferEntityType; entityId: string; label: string } | null {
  if (entityType === "task") {
    const task = project.openTasks.find((candidate) => candidate.id === state.taskPermission.taskId);
    return task ? { entityType, entityId: task.id, label: task.title } : null;
  }
  if (entityType === "document") {
    const document = project.docs.find((doc) => doc.id === state.ui.selectedDocId);
    return document ? { entityType, entityId: document.id, label: document.name } : null;
  }
  return null;
}

function ownerTransferTargetsFor(
  project: FilmProject,
  entityType: OwnerTransferEntityType,
): Array<{ entityType: OwnerTransferEntityType; entityId: string; label: string }> {
  if (entityType === "project") {
    return [{ entityType, entityId: project.id, label: project.title }];
  }
  if (entityType === "task") {
    return project.openTasks.map((task) => ({ entityType, entityId: task.id, label: task.title }));
  }
  if (entityType === "document") {
    return project.docs.map((doc) => ({ entityType, entityId: doc.id, label: doc.name }));
  }
  if (entityType === "person") {
    return project.people.map((person) => ({ entityType, entityId: person.id, label: person.name }));
  }
  if (entityType === "equipment") {
    return project.equipment.map((item) => ({ entityType, entityId: item.id, label: item.name }));
  }
  return project.expenses.map((expense) => ({ entityType, entityId: expense.id, label: expenseCategoryLabel(expense) }));
}

function ownerTransferEntityLabel(entityType: OwnerTransferEntityType): string {
  if (entityType === "project") return "Project owner";
  if (entityType === "task") return "Task owner";
  if (entityType === "document") return "Document owner";
  if (entityType === "person") return "Person owner";
  if (entityType === "equipment") return "Equipment owner";
  return "Expense owner";
}

function recordCommentTargetFor(
  project: FilmProject,
  entityType: RecordCommentEntityType,
  entityId = state.recordComment.entityId,
): { entityType: RecordCommentEntityType; entityId: string; label: string } | null {
  const targets = recordCommentTargetsFor(project, entityType);
  return targets.find((target) => target.entityId === entityId)
    ?? defaultRecordCommentTargetFor(project, entityType)
    ?? targets[0]
    ?? null;
}

function defaultRecordCommentTargetFor(
  project: FilmProject,
  entityType: RecordCommentEntityType,
): { entityType: RecordCommentEntityType; entityId: string; label: string } | null {
  if (entityType === "task") {
    const task = project.openTasks.find((candidate) => candidate.id === state.taskPermission.taskId);
    return task ? { entityType, entityId: task.id, label: task.title } : null;
  }
  if (entityType === "document") {
    const document = project.docs.find((doc) => doc.id === state.ui.selectedDocId);
    return document ? { entityType, entityId: document.id, label: document.name } : null;
  }
  return { entityType, entityId: project.id, label: project.title };
}

function recordCommentTargetsFor(
  project: FilmProject,
  entityType: RecordCommentEntityType,
): Array<{ entityType: RecordCommentEntityType; entityId: string; label: string }> {
  if (entityType === "project") {
    return [{ entityType, entityId: project.id, label: project.title }];
  }
  if (entityType === "task") {
    return project.openTasks.map((task) => ({ entityType, entityId: task.id, label: task.title }));
  }
  return project.docs.map((doc) => ({ entityType, entityId: doc.id, label: doc.name }));
}

function recordCommentEntityLabel(entityType: RecordCommentEntityType): string {
  if (entityType === "project") return "Project comment";
  if (entityType === "task") return "Task comment";
  return "Document comment";
}

function projectMembershipRevokeKey(projectId: string, memberId: string, role: WorkspaceRole): string {
  return `${projectId}:${memberId}:${role}`;
}

function countStoredR2Attachments(workspace: WorkspaceData): number {
  return workspace.projects.reduce(
    (total, project) => total + project.docs.filter((doc) => doc.attachmentStatus === "stored_r2").length,
    0,
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 0);
}

async function createProductionSchedule(): Promise<void> {
  const breakdown = selectedScreenplayBreakdown();
  if (!breakdown) {
    state.ui.toast = "Schedule creation blocked: no screenplay breakdown selected.";
    render();
    return;
  }
  const title = `Schedule ${productionSchedulesForProject(breakdown.projectId).length + 1}`;
  const schedule = createProductionScheduleFromBreakdown(breakdown, title);
  await persistProductionScheduleVersion(schedule, {
    toast: `${schedule.title} created with ${schedule.unassignedSceneIds.length} unassigned scenes.`,
    auditMessage: `Production schedule created: ${schedule.title}`,
  });
}

async function duplicateSelectedProductionSchedule(): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const title = `Schedule ${productionSchedulesForProject(schedule.projectId).length + 1}`;
  const duplicate = duplicateProductionSchedule(schedule, title);
  state.ui.selectedComparisonScheduleId = schedule.id;
  await persistProductionScheduleVersion(duplicate, {
    toast: `${duplicate.title} duplicated from ${schedule.title}.`,
    auditMessage: `Production schedule duplicated: ${schedule.title} to ${duplicate.title}`,
  });
}

async function addShootDayToSelectedSchedule(): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const next = addProductionShootDay(schedule);
  await persistProductionScheduleVersion(next, {
    toast: `Day ${next.shootDays.length} added to ${next.title}.`,
  });
}

async function removeShootDayFromSelectedSchedule(dayId: string): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const removed = schedule.shootDays.find((day) => day.id === dayId);
  if (!removed) return;
  const next = removeProductionShootDay(schedule, dayId);
  await persistProductionScheduleVersion(next, {
    toast: `Day ${removed.ordinal} removed; ${productionScheduleDayStripCount(removed)} strips returned to Unassigned.`,
  });
}

async function updateSelectedScheduleDayDate(dayId: string, date: string | null): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const next = updateProductionShootDay(schedule, dayId, { date });
  const normalizedDate = next.shootDays.find((day) => day.id === dayId)?.date ?? null;
  await persistProductionScheduleVersion(next, {
    toast: normalizedDate ? `Shoot day dated ${normalizedDate}.` : "Shoot day date cleared.",
  });
}

async function updateSelectedScheduleDayUnit(dayId: string, unit: ProductionUnit): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const next = updateProductionShootDay(schedule, dayId, { unit });
  const updatedDay = next.shootDays.find((day) => day.id === dayId);
  await persistProductionScheduleVersion(next, {
    toast: updatedDay ? `Day ${updatedDay.ordinal} assigned to ${productionUnitLabel(updatedDay.unit)}.` : "Shoot-day unit unchanged.",
    auditMessage: updatedDay ? `Production schedule day unit updated: ${next.title} day ${updatedDay.ordinal} ${updatedDay.unit}` : undefined,
  });
}

async function updateSelectedScheduleCastDayStatus(
  elementId: string,
  dayId: string,
  status: ProductionCastDayStatus | null,
): Promise<void> {
  const schedule = selectedProductionSchedule();
  const breakdown = schedule
    ? state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === schedule.screenplayBreakdownId) ?? null
    : null;
  if (!schedule || !breakdown) return;
  const cast = breakdown.elements.find((element) => element.id === elementId);
  const day = schedule.shootDays.find((candidate) => candidate.id === dayId);
  if (!cast || !day) return;
  try {
    const next = setProductionScheduleCastDayStatus(schedule, breakdown, elementId, dayId, status);
    const label = status === null ? "Off" : status === "travel" ? "Travel" : "Hold";
    await persistProductionScheduleVersion(next, {
      toast: `${cast.name}: Day ${day.ordinal} marked ${label}.`,
      auditMessage: `Cast day status updated: ${schedule.title} ${cast.name} day ${day.ordinal} ${label}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Cast day status could not be updated.";
    render();
  }
}

function toggleSelectedProductionScheduleStrip(
  reference: ProductionScheduleStripReference,
  selected: boolean,
): void {
  const schedule = selectedProductionSchedule();
  if (!schedule || schedule.status === "locked" || !reference.id) return;
  const current = selectedProductionScheduleStrips(schedule.id);
  const key = productionScheduleStripReferenceKey(reference);
  const withoutReference = current.filter((candidate) => productionScheduleStripReferenceKey(candidate) !== key);
  if (selected && withoutReference.length >= 200) {
    state.ui.toast = "Batch strip movement is limited to 200 strips at a time.";
    render();
    return;
  }
  const strips = selected ? [...withoutReference, reference] : withoutReference;
  state.productionScheduleStripSelection = strips.length ? { scheduleId: schedule.id, strips } : null;
  render();
}

async function moveSelectedProductionScheduleStrips(form: HTMLFormElement): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const references = selectedProductionScheduleStrips(schedule.id);
  if (!references.length) {
    state.ui.toast = "Batch strip movement requires at least one selected strip.";
    render();
    return;
  }
  const targetValue = String(new FormData(form).get("targetDayId") ?? "unassigned");
  const targetDayId = targetValue === "unassigned" ? null : targetValue;
  const targetDay = targetDayId ? schedule.shootDays.find((day) => day.id === targetDayId) ?? null : null;
  const destinationLabel = targetDay ? `Day ${targetDay.ordinal}` : "Unassigned";
  try {
    const result = moveProductionScheduleStrips(schedule, references, targetDayId);
    state.productionScheduleStripSelection = null;
    if (result.summary.movedCount === 0) {
      state.ui.toast = `${result.summary.alreadyInTargetCount} selected strip${result.summary.alreadyInTargetCount === 1 ? " is" : "s are"} already in ${destinationLabel}.`;
      render();
      return;
    }
    const movedLabel = `${result.summary.movedCount} strip${result.summary.movedCount === 1 ? "" : "s"}`;
    const alreadyLabel = result.summary.alreadyInTargetCount
      ? ` ${result.summary.alreadyInTargetCount} already there.`
      : "";
    await persistProductionScheduleVersion(result.schedule, {
      toast: `${movedLabel} moved to ${destinationLabel}.${alreadyLabel}`,
      auditMessage: `Production schedule strips moved: ${schedule.title} ${result.summary.movedCount} to ${destinationLabel}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Selected strips could not be moved.";
    render();
  }
}

async function assignSceneToShootDay(sceneId: string, dayId: string | null): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const next = moveProductionScheduleScene(schedule, sceneId, dayId);
  const day = dayId ? next.shootDays.find((candidate) => candidate.id === dayId) ?? null : null;
  await persistProductionScheduleVersion(next, {
    toast: day ? `Scene assigned to Day ${day.ordinal}.` : "Scene returned to Unassigned.",
  });
}

async function assignScenePartToShootDay(scenePartId: string, dayId: string | null): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const next = moveProductionScheduleScenePart(schedule, scenePartId, dayId);
  const part = [...(next.unassignedSceneParts ?? []), ...next.shootDays.flatMap((day) => day.sceneParts ?? [])]
    .find((candidate) => candidate.id === scenePartId);
  const day = dayId ? next.shootDays.find((candidate) => candidate.id === dayId) ?? null : null;
  const partLabel = part ? ` ${part.label}` : "";
  await persistProductionScheduleVersion(next, {
    toast: day ? `Scene part${partLabel} assigned to Day ${day.ordinal}.` : `Scene part${partLabel} returned to Unassigned.`,
  });
}

async function reorderSceneInSelectedSchedule(sceneId: string, direction: -1 | 1): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const next = reorderProductionScheduleScene(schedule, sceneId, direction);
  await persistProductionScheduleVersion(next, {
    toast: `Scene moved ${direction < 0 ? "up" : "down"}.`,
  });
}

async function reorderScenePartInSelectedSchedule(scenePartId: string, direction: -1 | 1): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const next = reorderProductionScheduleScenePart(schedule, scenePartId, direction);
  await persistProductionScheduleVersion(next, {
    toast: `Scene part moved ${direction < 0 ? "up" : "down"}.`,
  });
}

async function splitSceneInSelectedSchedule(sceneId: string): Promise<void> {
  const schedule = selectedProductionSchedule();
  const breakdown = schedule
    ? state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === schedule.screenplayBreakdownId) ?? null
    : null;
  const scene = breakdown?.scenes.find((candidate) => candidate.id === sceneId);
  if (!schedule || !breakdown || !scene) return;
  const defaultLine = Math.floor((scene.sourceStartLine + scene.sourceEndLine) / 2);
  const response = window.prompt(
    `Split scene ${scene.sceneNumber ?? scene.ordinal} after source line ${scene.sourceStartLine}-${Math.max(scene.sourceStartLine, scene.sourceEndLine - 1)}.`,
    String(defaultLine),
  );
  if (response === null) return;
  try {
    const next = splitProductionScheduleScene(schedule, breakdown, scene.id, Number(response));
    await persistProductionScheduleVersion(next, {
      toast: `Scene ${scene.sceneNumber ?? scene.ordinal} split into parts A and B.`,
      auditMessage: `Production schedule scene split: ${schedule.title} scene ${scene.sceneNumber ?? scene.ordinal}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Scene could not be split.";
    render();
  }
}

async function mergeSceneInSelectedSchedule(sceneId: string): Promise<void> {
  const schedule = selectedProductionSchedule();
  const breakdown = schedule
    ? state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === schedule.screenplayBreakdownId) ?? null
    : null;
  const scene = breakdown?.scenes.find((candidate) => candidate.id === sceneId);
  if (!schedule || !scene) return;
  if (!window.confirm(`Merge all parts of scene ${scene.sceneNumber ?? scene.ordinal} and return the scene to Unassigned?`)) return;
  const next = mergeProductionScheduleSceneParts(schedule, scene.id);
  await persistProductionScheduleVersion(next, {
    toast: `Scene ${scene.sceneNumber ?? scene.ordinal} merged and returned to Unassigned.`,
    auditMessage: `Production schedule scene parts merged: ${schedule.title} scene ${scene.sceneNumber ?? scene.ordinal}`,
  });
}

async function toggleSelectedProductionScheduleLock(): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const status = schedule.status === "locked" ? "draft" : "locked";
  const next = setProductionScheduleStatus(schedule, status);
  await persistProductionScheduleVersion(next, {
    toast: `${schedule.title} ${status === "locked" ? "locked" : "unlocked"}.`,
    auditMessage: `Production schedule ${status}: ${schedule.title}`,
  });
}

async function updateSelectedScheduleAssumptions(form: HTMLFormElement): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule) return;
  const formData = new FormData(form);
  const readNumber = (name: string): number => Number(formData.get(name));
  const next = updateProductionScheduleAssumptions(schedule, {
    maxScenesPerDay: readNumber("maxScenesPerDay"),
    maxLocationsPerDay: readNumber("maxLocationsPerDay"),
    maxCastPerDay: readNumber("maxCastPerDay"),
    maxConsecutiveShootDays: readNumber("maxConsecutiveShootDays"),
    companyMoveMinutes: readNumber("companyMoveMinutes"),
  });
  await persistProductionScheduleVersion(next, {
    toast: `${next.title} assumptions updated.`,
    auditMessage: `Production schedule assumptions updated: ${next.title}`,
  });
}

async function createSelectedScheduleBudgetScenario(): Promise<void> {
  const schedule = selectedProductionSchedule();
  if (!schedule || productionBudgetScenarioForSchedule(schedule.id)) return;
  const scenario = createProductionBudgetScenario(schedule);
  state.workspace.productionBudgetScenarios.unshift(scenario);
  await persistProductionBudgetChange({
    toast: `${scenario.title} created with zero-value rates.`,
    auditMessage: `Schedule budget estimate created: ${scenario.title}`,
  });
}

async function updateSelectedScheduleBudgetScenario(form: HTMLFormElement): Promise<void> {
  const schedule = selectedProductionSchedule();
  const scenario = schedule ? productionBudgetScenarioForSchedule(schedule.id) : null;
  if (!scenario) return;
  const formData = new FormData(form);
  const dollarsToCents = (name: string): number => Math.round(Math.max(0, Number(formData.get(name)) || 0) * 100);
  const next = updateProductionBudgetScenario(scenario, {
    crewDayCostCents: dollarsToCents("crewDayCost"),
    castDayRateCents: dollarsToCents("castDayRate"),
    locationDayRateCents: dollarsToCents("locationDayRate"),
    equipmentDayCostCents: dollarsToCents("equipmentDayCost"),
    companyMoveCostCents: dollarsToCents("companyMoveCost"),
    crewHeadcount: Number(formData.get("crewHeadcount")) || 0,
    mealCostPerPersonCents: dollarsToCents("mealCostPerPerson"),
    contingencyBasisPoints: Math.round(Math.max(0, Number(formData.get("contingencyPercent")) || 0) * 100),
  });
  const index = state.workspace.productionBudgetScenarios.findIndex((candidate) => candidate.id === next.id);
  if (index >= 0) state.workspace.productionBudgetScenarios.splice(index, 1, next);
  await persistProductionBudgetChange({
    toast: `${next.title} updated from schedule metrics.`,
    auditMessage: `Schedule budget estimate updated: ${next.title}`,
  });
}

async function persistProductionBudgetChange(options: { toast: string; auditMessage: string }): Promise<void> {
  state.workspace.auditLog.unshift(createAuditEvent(options.auditMessage, "System", "blue"));
  state.ui.toast = options.toast;
  await persistWorkspace();
  render();
}

async function createProductionShotRecord(form: HTMLFormElement): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const breakdown = project ? selectedScreenplayBreakdown(screenplayBreakdownsForProject(project.id)) : null;
  const formData = new FormData(form);
  const sceneId = String(formData.get("sceneId") ?? "");
  const description = String(formData.get("description") ?? "");
  if (!project || !breakdown) {
    state.ui.toast = "Shot creation blocked: import and select a screenplay first.";
    render();
    return;
  }
  try {
    const shot = createProductionShot({
      projectId: project.id,
      breakdown,
      sceneId,
      description,
      existingShots: state.workspace.productionShots,
    });
    await persistProductionShot(shot, {
      toast: `Shot ${shot.shotNumber} added to scene ${productionShotManifest(shot).scene?.sceneNumber ?? "source"}.`,
      auditMessage: `Production shot created: ${shot.description}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Shot could not be created.";
    render();
  }
}

async function updateSelectedProductionShot(form: HTMLFormElement): Promise<void> {
  const shot = selectedProductionShot();
  if (!shot) return;
  const formData = new FormData(form);
  const status = String(formData.get("status") ?? "");
  if (!isProductionShotStatusValue(status)) return;
  try {
    const next = updateProductionShot(shot, {
      shotNumber: String(formData.get("shotNumber") ?? ""),
      description: String(formData.get("description") ?? ""),
      status,
      shotSize: String(formData.get("shotSize") ?? ""),
      angle: String(formData.get("angle") ?? ""),
      movement: String(formData.get("movement") ?? ""),
      lens: String(formData.get("lens") ?? ""),
      cameraSupport: String(formData.get("cameraSupport") ?? ""),
      frameRate: String(formData.get("frameRate") ?? ""),
      estimatedMinutes: Number(formData.get("estimatedMinutes")) || 0,
      setupGroup: String(formData.get("setupGroup") ?? ""),
      audioNotes: String(formData.get("audioNotes") ?? ""),
      lightingNotes: String(formData.get("lightingNotes") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      documentIds: formData.getAll("documentId").map(String),
    });
    await persistProductionShot(next, {
      toast: `Shot ${next.shotNumber || next.ordinal} saved locally.`,
      auditMessage: `Production shot updated: ${next.description}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Shot could not be updated.";
    render();
  }
}

function isProductionShotStatusValue(value: string): value is ProductionShotStatus {
  return value === "planned" || value === "ready" || value === "captured" || value === "omitted";
}

async function reorderSelectedProductionShot(direction: -1 | 1): Promise<void> {
  const shot = selectedProductionShot();
  if (!shot) return;
  const nextShots = reorderProductionShot(state.workspace.productionShots, shot.id, direction);
  const next = nextShots.find((candidate) => candidate.id === shot.id);
  if (!next || next.ordinal === shot.ordinal) {
    state.ui.toast = `Shot ${shot.shotNumber || shot.ordinal} is already at that edge of its scene.`;
    render();
    return;
  }
  state.workspace.productionShots = nextShots;
  state.workspace.auditLog.unshift(createAuditEvent(`Production shot reordered: ${shot.description}`, "System", "blue"));
  state.ui.toast = `Shot ${shot.shotNumber || shot.ordinal} moved to order ${next.ordinal}.`;
  await persistWorkspace();
  render();
}

async function persistProductionShot(
  shot: ProductionShot,
  options: { toast: string; auditMessage: string },
): Promise<void> {
  const index = state.workspace.productionShots.findIndex((candidate) => candidate.id === shot.id);
  if (index >= 0) {
    state.workspace.productionShots.splice(index, 1, shot);
  } else {
    state.workspace.productionShots.push(shot);
  }
  state.ui.selectedProductionShotId = shot.id;
  state.workspace.auditLog.unshift(createAuditEvent(options.auditMessage, "System", "blue"));
  state.ui.toast = options.toast;
  persistUi();
  await persistWorkspace();
  render();
}

async function createProductionCallSheet(form: HTMLFormElement): Promise<void> {
  const sourceRef = String(new FormData(form).get("sourceRef") ?? "");
  const [scheduleId, shootDayId] = sourceRef.split("|");
  const schedule = state.workspace.productionSchedules.find((candidate) => candidate.id === scheduleId);
  const breakdown = schedule
    ? state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === schedule.screenplayBreakdownId)
    : null;
  if (!schedule || !breakdown || !shootDayId) {
    state.ui.toast = "Call sheet generation blocked: select a complete scheduled shoot day.";
    render();
    return;
  }
  const duplicate = state.workspace.productionCallSheets.some((callSheet) => (
    callSheet.productionScheduleId === schedule.id && callSheet.shootDayId === shootDayId
  ));
  if (duplicate) {
    state.ui.toast = "That schedule day already has a generated call sheet.";
    render();
    return;
  }
  try {
    const callSheet = createProductionCallSheetFromScheduleDay(schedule, breakdown, shootDayId);
    await persistProductionCallSheet(callSheet, {
      toast: `${callSheet.title} generated from ${schedule.title}.`,
      auditMessage: `Production call sheet generated: ${callSheet.title}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Call sheet could not be generated.";
    render();
  }
}

async function updateSelectedProductionCallSheet(form: HTMLFormElement): Promise<void> {
  const callSheet = selectedProductionCallSheet();
  if (!callSheet || callSheet.status === "final") return;
  const formData = new FormData(form);
  const next = updateProductionCallSheet(callSheet, {
    title: String(formData.get("title") ?? ""),
    date: String(formData.get("date") ?? "") || null,
    callTime: String(formData.get("callTime") ?? ""),
    estimatedWrapTime: String(formData.get("estimatedWrapTime") ?? ""),
    primaryLocation: String(formData.get("primaryLocation") ?? ""),
    parkingInstructions: String(formData.get("parkingInstructions") ?? ""),
    nearestHospital: String(formData.get("nearestHospital") ?? ""),
    weatherNotes: String(formData.get("weatherNotes") ?? ""),
    generalNotes: String(formData.get("generalNotes") ?? ""),
    safetyNotes: String(formData.get("safetyNotes") ?? ""),
  });
  await persistProductionCallSheet(next, {
    toast: `${next.title} details saved locally.`,
    auditMessage: `Production call sheet updated: ${next.title}`,
  });
}

async function updateSelectedProductionCallSheetCastCall(form: HTMLFormElement): Promise<void> {
  const callSheet = selectedProductionCallSheet();
  const elementId = form.dataset.elementId ?? "";
  if (!callSheet || callSheet.status === "final" || !elementId) return;
  const formData = new FormData(form);
  const next = updateProductionCallSheetCastCall(callSheet, elementId, {
    performerName: String(formData.get("performerName") ?? ""),
    callTime: String(formData.get("callTime") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  const castCall = next.castCalls.find((candidate) => candidate.elementId === elementId);
  await persistProductionCallSheet(next, {
    toast: `${castCall?.name ?? "Cast"} call saved locally.`,
    auditMessage: `Production cast call updated: ${next.title}`,
  });
}

async function toggleSelectedProductionCallSheetStatus(): Promise<void> {
  const callSheet = selectedProductionCallSheet();
  if (!callSheet) return;
  const status = callSheet.status === "final" ? "draft" : "final";
  const next = setProductionCallSheetStatus(callSheet, status);
  await persistProductionCallSheet(next, {
    toast: `${next.title} ${status === "final" ? "finalized" : "reopened"}.`,
    auditMessage: `Production call sheet ${status}: ${next.title}`,
  });
}

async function syncSelectedProductionCallSheet(): Promise<void> {
  const callSheet = selectedProductionCallSheet();
  const source = callSheet ? productionCallSheetSource(callSheet) : null;
  if (!callSheet || !source) {
    state.ui.toast = "Call sheet sync blocked: source schedule is unavailable.";
    render();
    return;
  }
  if (callSheet.status === "final") {
    state.ui.toast = "Call sheet sync blocked: reopen the final sheet first.";
    render();
    return;
  }
  try {
    const next = syncProductionCallSheetFromScheduleDay(callSheet, source.schedule, source.breakdown);
    await persistProductionCallSheet(next, {
      toast: `${next.title} synced from ${source.schedule.title}; manual details preserved.`,
      auditMessage: `Production call sheet synced from schedule: ${next.title}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Call sheet sync failed.";
    render();
  }
}

async function persistProductionCallSheet(
  callSheet: ProductionCallSheet,
  options: { toast: string; auditMessage: string },
): Promise<void> {
  const index = state.workspace.productionCallSheets.findIndex((candidate) => candidate.id === callSheet.id);
  if (index >= 0) {
    state.workspace.productionCallSheets.splice(index, 1, callSheet);
  } else {
    state.workspace.productionCallSheets.unshift(callSheet);
  }
  state.ui.selectedCallSheetId = callSheet.id;
  state.workspace.auditLog.unshift(createAuditEvent(options.auditMessage, "System", "blue"));
  state.ui.toast = options.toast;
  persistUi();
  await persistWorkspace();
  render();
}

async function createProductionReport(form: HTMLFormElement): Promise<void> {
  const callSheetId = String(new FormData(form).get("callSheetId") ?? "");
  const callSheet = state.workspace.productionCallSheets.find((candidate) => candidate.id === callSheetId);
  const project = callSheet ? getProjectById(state.workspace, callSheet.projectId) : null;
  if (!callSheet || !project) {
    state.ui.toast = "Production report creation blocked: select a generated call sheet.";
    render();
    return;
  }
  if (state.workspace.productionReports.some((report) => report.productionCallSheetId === callSheet.id)) {
    state.ui.toast = "That call sheet already has a daily production report.";
    render();
    return;
  }
  const report = createProductionReportFromCallSheet(callSheet, project.people.length);
  await persistProductionReport(report, {
    toast: `${report.title} created from ${callSheet.title}.`,
    auditMessage: `Daily production report created: ${report.title}`,
  });
}

async function updateSelectedProductionReport(form: HTMLFormElement): Promise<void> {
  const report = selectedProductionReport();
  if (!report || report.status === "final") return;
  const formData = new FormData(form);
  const optionalTime = (name: string): string | null => String(formData.get(name) ?? "") || null;
  const count = (name: string): number => Number(formData.get(name)) || 0;
  const next = updateProductionReport(report, {
    title: String(formData.get("title") ?? ""),
    date: String(formData.get("date") ?? "") || null,
    primaryLocation: String(formData.get("primaryLocation") ?? ""),
    actualCrewCallTime: optionalTime("actualCrewCallTime"),
    firstShotTime: optionalTime("firstShotTime"),
    mealStartTime: optionalTime("mealStartTime"),
    mealEndTime: optionalTime("mealEndTime"),
    cameraWrapTime: optionalTime("cameraWrapTime"),
    crewWrapTime: optionalTime("crewWrapTime"),
    crewCount: count("crewCount"),
    castCount: count("castCount"),
    backgroundCount: count("backgroundCount"),
    mealCount: count("mealCount"),
    setupCount: count("setupCount"),
    takeCount: count("takeCount"),
    footageMinutes: count("footageMinutes"),
    weatherActual: String(formData.get("weatherActual") ?? ""),
    delayNotes: String(formData.get("delayNotes") ?? ""),
    productionNotes: String(formData.get("productionNotes") ?? ""),
    safetyIncidentNotes: String(formData.get("safetyIncidentNotes") ?? ""),
    tomorrowNotes: String(formData.get("tomorrowNotes") ?? ""),
  });
  await persistProductionReport(next, {
    toast: `${next.title} details saved locally.`,
    auditMessage: `Daily production report updated: ${next.title}`,
  });
}

async function updateSelectedProductionReportScene(form: HTMLFormElement): Promise<void> {
  const report = selectedProductionReport();
  const sceneId = form.dataset.sceneId ?? "";
  const formData = new FormData(form);
  const status = String(formData.get("status") ?? "");
  if (!report || report.status === "final" || !sceneId || !isProductionReportSceneStatusValue(status)) return;
  const next = updateProductionReportSceneResult(report, sceneId, {
    status,
    notes: String(formData.get("notes") ?? ""),
  });
  await persistProductionReport(next, {
    toast: `Scene result saved as ${status}.`,
    auditMessage: `Daily production report scene updated: ${next.title}`,
  });
}

function isProductionReportSceneStatusValue(value: string): value is ProductionReportSceneStatus {
  return value === "planned" || value === "completed" || value === "partial" || value === "held";
}

async function toggleSelectedProductionReportStatus(): Promise<void> {
  const report = selectedProductionReport();
  if (!report) return;
  const status = report.status === "final" ? "draft" : "final";
  const next = setProductionReportStatus(report, status);
  await persistProductionReport(next, {
    toast: `${next.title} ${status === "final" ? "finalized" : "reopened"}.`,
    auditMessage: `Daily production report ${status}: ${next.title}`,
  });
}

async function persistProductionReport(
  report: ProductionDailyReport,
  options: { toast: string; auditMessage: string },
): Promise<void> {
  const index = state.workspace.productionReports.findIndex((candidate) => candidate.id === report.id);
  if (index >= 0) {
    state.workspace.productionReports.splice(index, 1, report);
  } else {
    state.workspace.productionReports.unshift(report);
  }
  state.ui.selectedProductionReportId = report.id;
  state.workspace.auditLog.unshift(createAuditEvent(options.auditMessage, "System", "blue"));
  state.ui.toast = options.toast;
  persistUi();
  await persistWorkspace();
  render();
}

async function exportSelectedProductionReport(): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const report = selectedProductionReport();
  const source = report ? productionReportSource(report) : null;
  if (!project || !report || !source) return;
  const exportedAt = new Date().toISOString();
  const manifest = buildProductionCallSheetManifest(source.callSheet, source.breakdown);
  const markdown = createProductionReportMarkdown(project, report, manifest, source.callSheet, exportedAt);
  const filename = `film-production-report-${slugForLocalRecord(report.title)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Daily production report exported: ${report.title}`, "System", "blue"));
  state.ui.toast = `${report.title} exported as Markdown.`;
  await persistWorkspace();
  render();
}

async function exportSelectedProductionReportSceneCsv(): Promise<void> {
  const report = selectedProductionReport();
  const source = report ? productionReportSource(report) : null;
  if (!report || !source) return;
  const exportedAt = new Date().toISOString();
  const manifest = buildProductionCallSheetManifest(source.callSheet, source.breakdown);
  const csv = createProductionReportSceneCsv(report, manifest);
  const filename = `film-production-scenes-${slugForLocalRecord(report.title)}-${exportedAt.slice(0, 10)}.csv`;
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Daily production scene CSV exported: ${report.title}`, "System", "blue"));
  state.ui.toast = `${report.title} scene status exported as CSV.`;
  await persistWorkspace();
  render();
}

async function createProductionLocationRecord(form: HTMLFormElement): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) return;
  const formData = new FormData(form);
  const screenplayElementId = String(formData.get("screenplayElementId") ?? "") || null;
  const breakdown = selectedScreenplayBreakdown(screenplayBreakdownsForProject(project.id));
  if (screenplayElementId && state.workspace.productionLocations.some((location) => (
    location.projectId === project.id && location.screenplayElementId === screenplayElementId
  ))) {
    state.ui.toast = "That screenplay location already has a scouting record.";
    render();
    return;
  }
  try {
    const location = createProductionLocation({
      projectId: project.id,
      name: String(formData.get("name") ?? ""),
      breakdown,
      screenplayElementId,
    });
    await persistProductionLocation(location, {
      toast: `${location.name} added to local scouting records.`,
      auditMessage: `Production location created: ${location.name}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Location record could not be created.";
    render();
  }
}

async function updateSelectedProductionLocation(form: HTMLFormElement): Promise<void> {
  const location = selectedProductionLocation();
  if (!location) return;
  const formData = new FormData(form);
  const status = String(formData.get("status") ?? "");
  const permitStatus = String(formData.get("permitStatus") ?? "");
  if (!isProductionLocationStatusValue(status) || !isProductionLocationPermitStatusValue(permitStatus)) return;
  try {
    const next = updateProductionLocation(location, {
      name: String(formData.get("name") ?? ""),
      status,
      address: String(formData.get("address") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactDetails: String(formData.get("contactDetails") ?? ""),
      permitStatus,
      permitNotes: String(formData.get("permitNotes") ?? ""),
      parkingAccess: String(formData.get("parkingAccess") ?? ""),
      powerNotes: String(formData.get("powerNotes") ?? ""),
      soundNotes: String(formData.get("soundNotes") ?? ""),
      restroomNotes: String(formData.get("restroomNotes") ?? ""),
      accessibilityNotes: String(formData.get("accessibilityNotes") ?? ""),
      nearestHospital: String(formData.get("nearestHospital") ?? ""),
      weatherNotes: String(formData.get("weatherNotes") ?? ""),
      safetyNotes: String(formData.get("safetyNotes") ?? ""),
      generalNotes: String(formData.get("generalNotes") ?? ""),
      documentIds: formData.getAll("documentId").map(String),
    });
    await persistProductionLocation(next, {
      toast: `${next.name} scouting details saved locally.`,
      auditMessage: `Production location updated: ${next.name}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Location record could not be updated.";
    render();
  }
}

function isProductionLocationStatusValue(value: string): value is ProductionLocationStatus {
  return value === "scouting" || value === "hold" || value === "confirmed" || value === "released";
}

function isProductionLocationPermitStatusValue(value: string): value is ProductionLocationPermitStatus {
  return value === "unknown" || value === "not_required" || value === "planned" || value === "submitted" || value === "approved";
}

async function applySelectedProductionLocationToCallSheet(): Promise<void> {
  const location = selectedProductionLocation();
  const callSheet = location ? selectedProductionCallSheet(location.projectId) : null;
  if (!location || !callSheet) return;
  try {
    const next = applyProductionLocationToCallSheet(location, callSheet);
    await persistProductionCallSheet(next, {
      toast: `${location.name} logistics applied to ${next.title}.`,
      auditMessage: `Production location applied to call sheet: ${location.name}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Location logistics could not be applied.";
    render();
  }
}

async function persistProductionLocation(
  location: ProductionLocation,
  options: { toast: string; auditMessage: string },
): Promise<void> {
  const index = state.workspace.productionLocations.findIndex((candidate) => candidate.id === location.id);
  if (index >= 0) {
    state.workspace.productionLocations.splice(index, 1, location);
  } else {
    state.workspace.productionLocations.unshift(location);
  }
  state.ui.selectedProductionLocationId = location.id;
  state.workspace.auditLog.unshift(createAuditEvent(options.auditMessage, "System", "blue"));
  state.ui.toast = options.toast;
  persistUi();
  await persistWorkspace();
  render();
}

async function exportSelectedProductionLocation(): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const location = selectedProductionLocation();
  if (!project || !location) return;
  const exportedAt = new Date().toISOString();
  const markdown = createProductionLocationMarkdown(project, location, productionLocationManifest(location), exportedAt);
  const filename = `film-location-${slugForLocalRecord(location.name)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Production location exported: ${location.name}`, "System", "blue"));
  state.ui.toast = `${location.name} exported as a local Markdown brief.`;
  await persistWorkspace();
  render();
}

async function createProductionTalentRecord(form: HTMLFormElement): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) return;
  const formData = new FormData(form);
  const screenplayElementId = String(formData.get("screenplayElementId") ?? "") || null;
  const breakdown = selectedScreenplayBreakdown(screenplayBreakdownsForProject(project.id));
  if (screenplayElementId && state.workspace.productionTalent.some((talent) => (
    talent.projectId === project.id && talent.screenplayElementId === screenplayElementId
  ))) {
    state.ui.toast = "That screenplay character already has a talent record.";
    render();
    return;
  }
  try {
    const talent = createProductionTalent({
      projectId: project.id,
      characterName: String(formData.get("characterName") ?? ""),
      breakdown,
      screenplayElementId,
    });
    await persistProductionTalent(talent, {
      toast: `${talent.characterName} added to local talent records.`,
      auditMessage: `Production talent created: ${talent.characterName}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Talent record could not be created.";
    render();
  }
}

async function updateSelectedProductionTalent(form: HTMLFormElement): Promise<void> {
  const talent = selectedProductionTalent();
  if (!talent) return;
  const formData = new FormData(form);
  const status = String(formData.get("status") ?? "");
  const paperworkStatus = String(formData.get("paperworkStatus") ?? "");
  const rateBasis = String(formData.get("rateBasis") ?? "");
  if (!isProductionTalentStatusValue(status)
    || !isProductionTalentPaperworkStatusValue(paperworkStatus)
    || !isProductionTalentRateBasisValue(rateBasis)) return;
  try {
    const next = updateProductionTalent(talent, {
      characterName: String(formData.get("characterName") ?? ""),
      performerName: String(formData.get("performerName") ?? ""),
      status,
      contactName: String(formData.get("contactName") ?? ""),
      contactDetails: String(formData.get("contactDetails") ?? ""),
      representativeName: String(formData.get("representativeName") ?? ""),
      representativeDetails: String(formData.get("representativeDetails") ?? ""),
      paperworkStatus,
      rateBasis,
      agreedRateCents: Math.round(Math.max(0, Number(formData.get("agreedRate")) || 0) * 100),
      dealNotes: String(formData.get("dealNotes") ?? ""),
      travelNotes: String(formData.get("travelNotes") ?? ""),
      dietaryNotes: String(formData.get("dietaryNotes") ?? ""),
      accessibilityNotes: String(formData.get("accessibilityNotes") ?? ""),
      wardrobeNotes: String(formData.get("wardrobeNotes") ?? ""),
      generalNotes: String(formData.get("generalNotes") ?? ""),
      documentIds: formData.getAll("documentId").map(String),
    });
    await persistProductionTalent(next, {
      toast: `${next.characterName} talent details saved locally.`,
      auditMessage: `Production talent updated: ${next.characterName}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Talent record could not be updated.";
    render();
  }
}

function isProductionTalentStatusValue(value: string): value is ProductionTalentStatus {
  return value === "prospect" || value === "contacted" || value === "auditioning" || value === "offered" || value === "cast" || value === "released";
}

function isProductionTalentPaperworkStatusValue(value: string): value is ProductionTalentPaperworkStatus {
  return value === "not_started" || value === "requested" || value === "partial" || value === "complete";
}

function isProductionTalentRateBasisValue(value: string): value is ProductionTalentRateBasis {
  return value === "not_set" || value === "unpaid" || value === "flat" || value === "day" || value === "week" || value === "deferred" || value === "other";
}

async function applySelectedProductionTalentToCallSheet(): Promise<void> {
  const talent = selectedProductionTalent();
  const callSheet = talent ? selectedProductionCallSheet(talent.projectId) : null;
  if (!talent || !callSheet) return;
  try {
    const next = applyProductionTalentToCallSheet(talent, callSheet);
    await persistProductionCallSheet(next, {
      toast: `${talent.performerName} applied to ${talent.characterName} on ${next.title}.`,
      auditMessage: `Production talent applied to call sheet: ${talent.characterName}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Performer details could not be applied.";
    render();
  }
}

async function persistProductionTalent(
  talent: ProductionTalent,
  options: { toast: string; auditMessage: string },
): Promise<void> {
  const index = state.workspace.productionTalent.findIndex((candidate) => candidate.id === talent.id);
  if (index >= 0) {
    state.workspace.productionTalent.splice(index, 1, talent);
  } else {
    state.workspace.productionTalent.unshift(talent);
  }
  state.ui.selectedProductionTalentId = talent.id;
  state.workspace.auditLog.unshift(createAuditEvent(options.auditMessage, "System", "blue"));
  state.ui.toast = options.toast;
  persistUi();
  await persistWorkspace();
  render();
}

async function exportSelectedProductionTalent(): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const talent = selectedProductionTalent();
  if (!project || !talent) return;
  const exportedAt = new Date().toISOString();
  const markdown = createProductionTalentMarkdown(project, talent, productionTalentManifest(talent), exportedAt);
  const filename = `film-talent-${slugForLocalRecord(talent.characterName)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Production talent exported: ${talent.characterName}`, "System", "blue"));
  state.ui.toast = `${talent.characterName} exported as a local Markdown brief.`;
  await persistWorkspace();
  render();
}

async function addProductionAvailabilityWindow(form: HTMLFormElement): Promise<void> {
  const schedule = selectedProductionSchedule();
  const breakdown = schedule
    ? state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === schedule.screenplayBreakdownId) ?? null
    : null;
  if (!schedule || !breakdown) return;
  const formData = new FormData(form);
  const status = String(formData.get("status") ?? "");
  if (status !== "available" && status !== "preferred" && status !== "unavailable") return;
  try {
    const window = createProductionAvailabilityWindow(
      breakdown,
      String(formData.get("elementId") ?? ""),
      status,
      String(formData.get("startDate") ?? ""),
      String(formData.get("endDate") ?? ""),
      String(formData.get("notes") ?? ""),
    );
    state.workspace.productionAvailability.unshift(window);
    await persistProductionAvailabilityChange({
      toast: `${window.resourceName} marked ${window.status} from ${window.startDate} through ${window.endDate}.`,
      auditMessage: `Availability added: ${window.resourceName} ${window.status}`,
    });
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Availability window could not be added.";
    render();
  }
}

async function deleteProductionAvailabilityWindow(windowId: string): Promise<void> {
  const window = state.workspace.productionAvailability.find((candidate) => candidate.id === windowId);
  if (!window) return;
  state.workspace.productionAvailability = removeProductionAvailabilityWindow(state.workspace.productionAvailability, windowId);
  await persistProductionAvailabilityChange({
    toast: `${window.resourceName} availability window deleted.`,
    auditMessage: `Availability deleted: ${window.resourceName}`,
  });
}

async function persistProductionAvailabilityChange(options: { toast: string; auditMessage: string }): Promise<void> {
  state.workspace.auditLog.unshift(createAuditEvent(options.auditMessage, "System", "blue"));
  state.ui.toast = options.toast;
  await persistWorkspace();
  render();
}

async function persistProductionScheduleVersion(
  schedule: ProductionScheduleVersion,
  options: { toast: string; auditMessage?: string },
): Promise<void> {
  const breakdown = state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === schedule.screenplayBreakdownId);
  const next = breakdown ? reconcileProductionScheduleScenes(schedule, breakdown) : schedule;
  const index = state.workspace.productionSchedules.findIndex((candidate) => candidate.id === next.id);
  if (index >= 0) {
    state.workspace.productionSchedules.splice(index, 1, next);
  } else {
    state.workspace.productionSchedules.unshift(next);
  }
  state.ui.selectedScheduleId = next.id;
  state.productionScheduleStripSelection = null;
  if (options.auditMessage) {
    state.workspace.auditLog.unshift(createAuditEvent(options.auditMessage, "System", "blue"));
  }
  state.ui.toast = options.toast;
  persistUi();
  await persistWorkspace();
  render();
}

async function exportSelectedProductionSchedule(): Promise<void> {
  const schedule = selectedProductionSchedule();
  const breakdown = schedule
    ? state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === schedule.screenplayBreakdownId) ?? null
    : null;
  if (!schedule || !breakdown) {
    state.ui.toast = "Stripboard export blocked: no complete schedule selected.";
    render();
    return;
  }
  const exportedAt = new Date().toISOString();
  const availabilityWindows = productionAvailabilityForBreakdown(breakdown.id);
  const analysis = analyzeProductionSchedule(schedule, breakdown, availabilityWindows);
  const scenarioAnalysis = analyzeProductionScheduleScenario(schedule, breakdown, availabilityWindows);
  const budgetScenario = productionBudgetScenarioForSchedule(schedule.id);
  const budgetEstimate = budgetScenario ? estimateProductionBudget(budgetScenario, schedule, breakdown) : null;
  const payload = JSON.stringify({
    exportVersion: 1,
    exportedAt,
    workspaceId: state.workspace.id,
    sourcePolicy: "user_requested_schedule_metadata_export",
    schedule,
    availabilityWindows,
    analysis,
    scenarioAnalysis,
    budgetScenario,
    budgetEstimate,
    screenplayRevision: {
      id: breakdown.revision.id,
      title: breakdown.revision.title,
      format: breakdown.revision.format,
      sourceFileName: breakdown.revision.sourceFileName,
      importedAt: breakdown.revision.importedAt,
    },
    scenes: breakdown.scenes.map((scene) => ({
      id: scene.id,
      ordinal: scene.ordinal,
      sceneNumber: scene.sceneNumber,
      heading: scene.heading,
      interiorExterior: scene.interiorExterior,
      location: scene.location,
      timeOfDay: scene.timeOfDay,
    })),
  }, null, 2);
  const filename = `film-stripboard-${slugForLocalRecord(schedule.title)}-${exportedAt.slice(0, 10)}.json`;
  downloadBlob(new Blob([payload], { type: "application/json;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Production schedule exported: ${schedule.title}`, "System", "blue"));
  state.ui.toast = `Stripboard exported for ${schedule.title}.`;
  await persistWorkspace();
  render();
}

async function exportSelectedProjectPacket(): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Project packet export blocked: no selected project.";
    render();
    return;
  }

  const exportedAt = new Date().toISOString();
  const markdown = createProjectPacketMarkdown(project, exportedAt);
  const filename = `film-project-packet-${slugForLocalRecord(project.title)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Project packet exported: ${project.title}`, "System", "blue"));
  state.ui.toast = `Project packet exported for ${project.title}.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = `Project packet exported for ${project.title}. Local audit persistence failed.`;
  }
  render();
}

async function exportProjectDirectory(): Promise<void> {
  const projects = filterProjects(state.workspace.projects, state.ui.filter);
  const exportedAt = new Date().toISOString();
  const markdown = createProjectDirectoryMarkdown(projects, state.ui.filter, exportedAt);
  const filename = `film-project-directory-${slugForLocalRecord(state.workspace.name)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Project directory exported: ${projects.length} visible projects`, "System", "blue"));
  state.ui.toast = `Project directory exported for ${projects.length} visible projects.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = `Project directory exported for ${projects.length} visible projects. Local audit persistence failed.`;
  }
  render();
}

async function exportProductionShots(format: "markdown" | "csv"): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const shots = project ? filteredProductionShotsForProject(project.id) : [];
  if (!project || shots.length === 0) {
    state.ui.toast = "Shot list export blocked: the current scene view has no shots.";
    render();
    return;
  }
  const exportedAt = new Date().toISOString();
  const rows = productionShotExportRows(project, shots);
  const isCsv = format === "csv";
  const contents = isCsv
    ? createProductionShotCsv(rows)
    : createProductionShotMarkdown(project, rows, exportedAt);
  const filename = `film-shot-list-${slugForLocalRecord(project.title)}-${exportedAt.slice(0, 10)}.${isCsv ? "csv" : "md"}`;
  downloadBlob(new Blob([contents], { type: isCsv ? "text/csv;charset=utf-8" : "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Production shot list exported (${format}): ${project.title}`, "System", "blue"));
  state.ui.toast = `${isCsv ? "CSV" : "Markdown"} shot list exported for ${project.title}.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = `${isCsv ? "CSV" : "Markdown"} shot list exported. Local audit persistence failed.`;
  }
  render();
}

async function exportSelectedCallSheet(): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Call sheet export blocked: no selected project.";
    render();
    return;
  }

  const exportedAt = new Date().toISOString();
  const productionCallSheet = selectedProductionCallSheet(project.id);
  const source = productionCallSheet ? productionCallSheetSource(productionCallSheet) : null;
  const manifest = productionCallSheet && source
    ? buildProductionCallSheetManifest(productionCallSheet, source.breakdown)
    : null;
  const markdown = createCallSheetMarkdown(project, exportedAt, productionCallSheet, manifest, source?.schedule ?? null);
  const filename = `film-call-sheet-${slugForLocalRecord(productionCallSheet?.title ?? project.title)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Call sheet exported: ${project.title}`, "System", "blue"));
  state.ui.toast = `Call sheet exported for ${project.title}.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = `Call sheet exported for ${project.title}. Local audit persistence failed.`;
  }
  render();
}

async function exportSelectedProductionSides(format: "markdown" | "html"): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const sides = project ? selectedProductionSides(project.id) : null;
  if (!project || !sides) {
    state.ui.toast = "Sides export blocked: select a call sheet with its screenplay source available.";
    render();
    return;
  }

  const exportedAt = new Date().toISOString();
  const isHtml = format === "html";
  const contents = isHtml
    ? createProductionSidesHtml(project, sides.callSheet, sides.manifest, sides.schedule, exportedAt)
    : createProductionSidesMarkdown(project, sides.callSheet, sides.manifest, sides.schedule, exportedAt);
  const extension = isHtml ? "html" : "md";
  const mime = isHtml ? "text/html;charset=utf-8" : "text/markdown;charset=utf-8";
  const filename = `film-sides-${slugForLocalRecord(sides.callSheet.title)}-${exportedAt.slice(0, 10)}.${extension}`;
  downloadBlob(new Blob([contents], { type: mime }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Production sides exported (${extension}): ${sides.callSheet.title}`, "System", "blue"));
  state.ui.toast = `${isHtml ? "Print HTML" : "Markdown"} sides exported for ${sides.callSheet.title}.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = `${isHtml ? "Print HTML" : "Markdown"} sides exported. Local audit persistence failed.`;
  }
  render();
}

async function exportSelectedTaskList(): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Task export blocked: no selected project.";
    render();
    return;
  }

  const exportedAt = new Date().toISOString();
  const markdown = createTaskListMarkdown(project, exportedAt);
  const filename = `film-task-list-${slugForLocalRecord(project.title)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Task list exported: ${project.title}`, "System", "blue"));
  state.ui.toast = `Task list exported for ${project.title}.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = `Task list exported for ${project.title}. Local audit persistence failed.`;
  }
  render();
}

async function exportPlanningView(): Promise<void> {
  const allRows = planningPanelRowsForWorkspace();
  const kindFilter = state.ui.planningKindFilter;
  const rows = kindFilter === "all" ? allRows : allRows.filter((row) => row.kind === kindFilter);
  const filterLabel = kindFilter === "all" ? "All kinds" : PLANNING_KIND_LABELS[kindFilter];
  const exportedAt = new Date().toISOString();
  const markdown = createPlanningViewMarkdown(rows, allRows.length, filterLabel, exportedAt);
  const filename = `film-planning-view-${slugForLocalRecord(filterLabel)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Planning view exported: ${filterLabel}`, "System", "teal"));
  state.ui.toast = `Planning view exported for ${filterLabel}.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = `Planning view exported for ${filterLabel}. Local audit persistence failed.`;
  }
  render();
}

async function exportSelectedCrewDirectory(): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Crew export blocked: no selected project.";
    render();
    return;
  }

  const exportedAt = new Date().toISOString();
  const markdown = createCrewDirectoryMarkdown(project, exportedAt);
  const filename = `film-crew-directory-${slugForLocalRecord(project.title)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Crew directory exported: ${project.title}`, "System", "blue"));
  state.ui.toast = `Crew directory exported for ${project.title}.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = `Crew directory exported for ${project.title}. Local audit persistence failed.`;
  }
  render();
}

async function exportSelectedGearPull(): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Gear export blocked: no selected project.";
    render();
    return;
  }

  const exportedAt = new Date().toISOString();
  const markdown = createGearPullMarkdown(project, exportedAt);
  const filename = `film-gear-pull-${slugForLocalRecord(project.title)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Gear pull exported: ${project.title}`, "System", "teal"));
  state.ui.toast = `Gear pull exported for ${project.title}.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = `Gear pull exported for ${project.title}. Local audit persistence failed.`;
  }
  render();
}

async function exportSelectedBudgetTopSheet(): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Budget export blocked: no selected project.";
    render();
    return;
  }

  const exportedAt = new Date().toISOString();
  const markdown = createBudgetTopSheetMarkdown(project, exportedAt);
  const filename = `film-budget-top-sheet-${slugForLocalRecord(project.title)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Budget top sheet exported: ${project.title}`, "System", "amber"));
  state.ui.toast = `Budget top sheet exported for ${project.title}.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = `Budget top sheet exported for ${project.title}. Local audit persistence failed.`;
  }
  render();
}

async function exportSelectedDocumentDraft(): Promise<void> {
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  const doc = project?.docs.find((candidate) => candidate.id === state.ui.selectedDocId) ?? project?.docs[0] ?? null;
  if (!project || !doc || doc.type !== "MD") {
    state.ui.toast = "Document export blocked: select a Markdown draft.";
    render();
    return;
  }

  const editorForm = document.querySelector<HTMLFormElement>("form[data-action='doc-save']");
  const markdownInput = editorForm?.elements.namedItem("markdown") as HTMLTextAreaElement | null;
  const markdown = editorForm?.dataset.docId === doc.id ? markdownInput?.value ?? "" : doc.markdownSnapshot ?? "";
  const exportedAt = new Date().toISOString();
  const content = createDocumentDraftMarkdown(project, doc, markdown, exportedAt);
  const docSlug = slugForLocalRecord(doc.name.replace(/\.md$/i, ""));
  const filename = `film-doc-${slugForLocalRecord(project.title)}-${docSlug}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([content], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Document draft exported: ${doc.name}`, "System", "blue"));
  state.ui.toast = `Document draft exported for ${doc.name}.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = `Document draft exported for ${doc.name}. Local audit persistence failed.`;
  }
  render();
}

async function exportActivityLog(): Promise<void> {
  const exportedAt = new Date().toISOString();
  const eventCount = state.workspace.auditLog.length;
  const markdown = createActivityLogMarkdown(exportedAt);
  const filename = `film-activity-log-${slugForLocalRecord(state.workspace.name)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent("Local activity log exported", "System", "blue"));
  state.ui.toast = `Activity log exported with ${eventCount} local events.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = "Activity log exported. Local audit persistence failed.";
  }
  render();
}

async function exportTeamRoster(): Promise<void> {
  const exportedAt = new Date().toISOString();
  const memberCount = state.workspace.members.length;
  const markdown = createTeamRosterMarkdown(exportedAt);
  const filename = `film-team-roster-${slugForLocalRecord(state.workspace.name)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Team roster exported: ${memberCount} members`, "System", "blue"));
  state.ui.toast = `Team roster exported with ${memberCount} members.`;
  try {
    await persistWorkspace();
  } catch {
    state.ui.toast = "Team roster exported. Local audit persistence failed.";
  }
  render();
}

function createProjectPacketMarkdown(project: FilmProject, exportedAt: string): string {
  const callSheet = project.callSheet;
  const planningRows = planningPanelRowsForProject(project).slice(0, 12);
  const lines = [
    `# ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    `Workspace: ${packetText(state.workspace.name)}`,
    "Policy: provider secrets, OAuth tokens, raw attachment bytes, and private Worker state are excluded.",
    "",
    "## Summary",
    `- Type: ${packetText(project.type)}`,
    `- Phase: ${packetText(project.phase)}`,
    `- Shoot dates: ${packetText(project.shootDates)}`,
    `- Location: ${packetText(project.location)}`,
    `- Runtime: ${project.runtimeMinutes} minutes`,
    `- Format: ${packetText(project.format)}`,
    `- Progress: ${project.progress}%`,
    `- Budget: ${formatCurrency(project.spentBudget)} spent of ${formatCurrency(project.totalBudget)}`,
    `- Workflow: ${packetText(project.workflow)}`,
    "",
    "## Logline",
    packetText(project.description) || "No logline recorded.",
    "",
    "## Phase Timeline",
    ...project.timeline.map((item) => `- ${packetText(item.label)}: ${packetText(item.month)} lane ${item.start}-${item.start + item.width}%`),
    "",
    "## Upcoming Call Sheet",
    `- Date: ${packetText(callSheet.day)} ${packetText(callSheet.month)}`,
    `- Call: ${packetText(callSheet.callTime)}`,
    `- Wrap: ${packetText(callSheet.wrapTime)}`,
    `- Location: ${packetText(callSheet.location)}`,
    `- Day: ${callSheet.dayNumber} of ${callSheet.totalDays}`,
    `- Scenes: ${callSheet.scenes}`,
    `- Pages: ${packetText(callSheet.pages)}`,
    `- People: ${callSheet.people}`,
    `- Weather: ${packetText(callSheet.weather)}`,
    "",
    "## Planning Rows",
    ...(
      planningRows.length
        ? planningRows.map((row) => `- ${packetText(PLANNING_KIND_LABELS[row.kind])}: ${packetText(row.title)} - ${packetPlanningFields(row.fields)}`)
        : ["No planning rows in the local review cache."]
    ),
    "",
    "## Date-Driven Tasks",
    ...project.openTasks.map((task) => `- [${packetText(formatTaskStatus(task.status))}] ${packetText(task.title)} - due ${packetText(task.due)}`),
    "",
    "## Documents",
    ...project.docs.map((doc) => `- ${packetText(doc.name)} (${packetText(doc.type)}) - ${packetText(formatDocStatus(doc))}`),
    "",
    "## People",
    ...project.people.map((person) => `- ${packetText(person.name)} - ${packetText(person.role)}`),
    "",
    "## Equipment",
    ...project.equipment.map((item) => `- ${packetText(item.name)} - ${packetText(item.status)}`),
    "",
    "## Expenses",
    ...project.expenses.map((expense) => `- ${packetText(expenseCategoryLabel(expense))} - ${formatCurrency(expense.spent)} spent of ${formatCurrency(expense.budget)} (${expense.percent}%)`),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function createActivityLogMarkdown(exportedAt: string): string {
  const lines = [
    `# Activity Log: ${packetText(state.workspace.name)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    "Policy: provider secrets, OAuth tokens, raw attachment bytes, private Worker state, raw Worker audit metadata, raw import source paths, and Markdown document bodies are excluded.",
    "",
    "## Local Events",
    ...(
      state.workspace.auditLog.length
        ? state.workspace.auditLog.map((event) => `- ${packetText(event.when)} - ${packetText(event.actor)} - ${packetText(event.message)}`)
        : ["No local activity events recorded."]
    ),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function createTeamRosterMarkdown(exportedAt: string): string {
  const statusCounts = {
    active: state.workspace.members.filter((member) => member.status === "active").length,
    invited: state.workspace.members.filter((member) => member.status === "invited").length,
    disabled: state.workspace.members.filter((member) => member.status === "disabled").length,
  };
  const lines = [
    `# Team Roster: ${packetText(state.workspace.name)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    "Policy: raw email addresses, provider secrets, OAuth tokens, raw invite tokens, raw attachment bytes, private Worker state, permission grant details, and Worker audit metadata values are excluded. Email references are short hashes only.",
    "",
    "## Summary",
    `- Members: ${state.workspace.members.length}`,
    `- Active: ${statusCounts.active}`,
    `- Invited: ${statusCounts.invited}`,
    `- Disabled: ${statusCounts.disabled}`,
    "",
    "## Members",
    ...(
      state.workspace.members.length
        ? state.workspace.members.map((member) => [
          `### ${packetText(member.displayName)}`,
          `- Role: ${packetText(formatWorkspaceRole(member.role))}`,
          `- Status: ${packetText(formatWorkspaceMemberStatus(member.status))}`,
          `- Email hash: ${packetText(shortHash(member.emailHash))}`,
          `- Last seen: ${packetText(member.lastSeenAt ? formatShortDateTime(member.lastSeenAt) : "Never seen")}`,
          "",
        ].join("\n"))
        : ["No workspace members recorded.", ""]
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function createProjectDirectoryMarkdown(projects: FilmProject[], filter: string, exportedAt: string): string {
  const lines = [
    `# Project Directory: ${packetText(state.workspace.name)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    `Filter: ${packetText(filter) || "All projects"}`,
    "Policy: provider secrets, OAuth tokens, raw attachment bytes, private Worker state, raw import source paths, and Markdown document bodies are excluded.",
    "",
    "## Summary",
    `- Visible projects: ${projects.length}`,
    `- Workspace projects: ${state.workspace.projects.length}`,
    `- Archived projects: ${state.workspace.archivedProjectCount}`,
    "",
    "## Projects",
    ...(
      projects.length
        ? projects.map((project) => [
          `### ${packetText(project.title)}`,
          `- Type: ${packetText(project.type)}`,
          `- Phase: ${packetText(project.phase)}`,
          `- Shoot dates: ${packetText(project.shootDates)}`,
          `- Location: ${packetText(project.location)}`,
          `- Runtime: ${project.runtimeMinutes} minutes`,
          `- Format: ${packetText(project.format)}`,
          `- Progress: ${project.progress}%`,
          `- Budget: ${formatCurrency(project.spentBudget)} spent of ${formatCurrency(project.totalBudget)}`,
          `- Tasks: ${project.tasks.done} done of ${project.tasks.total}`,
          `- Open tasks: ${project.openTasks.length}`,
          `- Docs: ${project.docs.length}`,
          `- People: ${project.people.length}`,
          `- Equipment: ${project.equipment.length}`,
          `- Expenses: ${project.expenses.length}`,
          "",
        ].join("\n"))
        : ["No projects match the current filter.", ""]
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function createTaskListMarkdown(project: FilmProject, exportedAt: string): string {
  const statusCounts = {
    overdue: project.openTasks.filter((task) => task.status === "overdue").length,
    pending: project.openTasks.filter((task) => task.status === "pending").length,
    ready: project.openTasks.filter((task) => task.status === "ready").length,
  };
  const lines = [
    `# Task List: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    `Workspace: ${packetText(state.workspace.name)}`,
    "Policy: provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    "## Summary",
    `- Open tasks: ${project.openTasks.length}`,
    `- Completed: ${project.tasks.done} of ${project.tasks.total}`,
    `- Overdue: ${statusCounts.overdue}`,
    `- Pending: ${statusCounts.pending}`,
    `- Ready: ${statusCounts.ready}`,
    "",
    "## Open Tasks",
    ...(
      project.openTasks.length
        ? project.openTasks.map((task) => `- [${packetText(formatTaskStatus(task.status))}] ${packetText(task.title)} - due ${packetText(task.due)}`)
        : ["No open tasks."]
    ),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function createPlanningViewMarkdown(rows: PlanningPanelRow[], allRowCount: number, filterLabel: string, exportedAt: string): string {
  const lines = [
    `# Planning View: ${packetText(filterLabel)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    `Workspace: ${packetText(state.workspace.name)}`,
    "Policy: provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded. Source labels are included without local file paths.",
    "",
    "## Summary",
    `- Rows in view: ${rows.length}`,
    `- Rows in workspace source: ${allRowCount}`,
    `- Filter: ${packetText(filterLabel)}`,
    `- Source: ${state.planningExportView ? "D1 planning export" : "Local import review cache"}`,
    "",
    "## Rows",
    ...(
      rows.length
        ? rows.map((row) => `- ${packetText(PLANNING_KIND_LABELS[row.kind])}: ${packetText(row.title)} - ${packetText(row.projectLabel)} - ${packetPlanningFields(row.fields)} - ${packetText(row.sourceLabel)}`)
        : ["No planning rows in current view."]
    ),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function createDocumentDraftMarkdown(project: FilmProject, doc: ProjectDoc, markdown: string, exportedAt: string): string {
  const body = markdown.trim() ? markdown.replace(/\r\n/g, "\n") : "_Empty Markdown draft._";
  const lines = [
    `# Document Draft: ${packetText(doc.name)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    `Project: ${packetText(project.title)}`,
    `Workspace: ${packetText(state.workspace.name)}`,
    "Policy: provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded. This explicit export includes the selected Markdown body; canonical saves use the Worker-owned document route when available.",
    "",
    "## Draft",
    body,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function createCrewDirectoryMarkdown(project: FilmProject, exportedAt: string): string {
  const lines = [
    `# Crew Directory: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    `Workspace: ${packetText(state.workspace.name)}`,
    "Policy: provider secrets, OAuth tokens, raw attachment bytes, private Worker state, raw import source paths, email addresses, and phone numbers are excluded.",
    "",
    "## Crew",
    ...(
      project.people.length
        ? project.people.map((person) => `- ${packetText(person.name)} - ${packetText(person.role)} (${packetText(person.initials)})`)
        : ["No crew records."]
    ),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function createGearPullMarkdown(project: FilmProject, exportedAt: string): string {
  const lines = [
    `# Gear Pull: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    `Workspace: ${packetText(state.workspace.name)}`,
    "Policy: provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    "## Gear",
    ...(
      project.equipment.length
        ? project.equipment.map((item) => `- ${packetText(item.name)} - ${packetText(item.status)}`)
        : ["No equipment records."]
    ),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function createBudgetTopSheetMarkdown(project: FilmProject, exportedAt: string): string {
  const budget = budgetTopSheetForProject(project);
  const lines = [
    `# Budget Top Sheet: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    `Workspace: ${packetText(state.workspace.name)}`,
    "Policy: provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    "## Summary",
    `- Total budget: ${formatCurrency(project.totalBudget)}`,
    `- Spent: ${formatCurrency(project.spentBudget)}`,
    `- Remaining: ${formatCurrency(budget.remaining)}`,
    `- Used: ${budget.usedPercent}%`,
    `- Line budget: ${formatCurrency(budget.lineBudget)}`,
    `- Line spend: ${formatCurrency(budget.lineSpent)}`,
    `- Budget risk: ${budget.overBudgetCount} over budget / ${budget.nearBudgetCount} near budget`,
    "",
    "## Budget Lines",
    ...(
      project.expenses.length
        ? project.expenses.map((expense) => `- ${packetText(expenseCategoryLabel(expense))} - ${formatCurrency(expense.spent)} spent of ${formatCurrency(expense.budget)} (${expense.percent}%)`)
        : ["No expense rows recorded."]
    ),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function createCallSheetMarkdown(
  project: FilmProject,
  exportedAt: string,
  productionCallSheet: ProductionCallSheet | null = null,
  manifest: ProductionCallSheetManifest | null = null,
  sourceSchedule: ProductionScheduleVersion | null = null,
): string {
  const legacyCallSheet = project.callSheet;
  const callDate = productionCallSheet?.date ?? `${legacyCallSheet.day} ${legacyCallSheet.month}`;
  const callTime = productionCallSheet?.callTime ?? legacyCallSheet.callTime;
  const wrapTime = productionCallSheet?.estimatedWrapTime ?? legacyCallSheet.wrapTime;
  const location = productionCallSheet?.primaryLocation ?? legacyCallSheet.location;
  const dayNumber = productionCallSheet?.dayOrdinal ?? legacyCallSheet.dayNumber;
  const totalDays = productionCallSheet?.totalShootDays ?? legacyCallSheet.totalDays;
  const sceneCount = manifest?.scenes.length ?? legacyCallSheet.scenes;
  const lines = [
    `# Call Sheet: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    "Policy: provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    "## Call",
    ...(productionCallSheet ? [`- Title: ${packetText(productionCallSheet.title)}`, `- Status: ${packetText(productionCallSheet.status)}`] : []),
    `- Date: ${packetText(callDate)}`,
    `- Call: ${packetText(callTime)}`,
    `- Estimated wrap: ${packetText(wrapTime)}`,
    `- Location: ${packetText(location || "TBD")}`,
    `- Shoot day: ${dayNumber} of ${totalDays}`,
    ...(productionCallSheet ? [`- Unit: ${packetText(productionUnitLabel(productionCallSheet.unit))}`] : []),
    `- Scenes: ${sceneCount}`,
    ...(productionCallSheet && sourceSchedule ? [
      `- Source schedule: ${packetText(sourceSchedule.title)}`,
      `- Source changed after generation: ${sourceSchedule.updatedAt === productionCallSheet.sourceScheduleUpdatedAt ? "no" : "yes"}`,
    ] : [
      `- Pages: ${packetText(legacyCallSheet.pages)}`,
      `- People: ${legacyCallSheet.people}`,
      `- Weather: ${packetText(legacyCallSheet.weather)}`,
    ]),
    "",
    "## Scenes",
    ...(manifest?.scenes.length ? manifest.scenes.map((scene) => {
      const parts = (productionCallSheet?.sceneParts ?? []).filter((part) => part.sceneId === scene.id);
      const partLabel = parts.length
        ? ` | ${parts.map((part) => `Part ${packetText(part.label)} lines ${part.sourceStartLine}-${part.sourceEndLine}`).join(", ")}`
        : "";
      return `- ${packetText(scene.sceneNumber ?? String(scene.ordinal))}: ${packetText(scene.heading)} | ${packetText(scene.location ?? "TBD")} | ${packetText(scene.timeOfDay ?? "TBD")}${partLabel}${scene.synopsis ? ` | ${packetText(scene.synopsis)}` : ""}`;
    }) : ["No schedule-derived scene snapshot available."]),
    "",
    "## Cast Calls",
    ...(manifest?.castCalls.length ? manifest.castCalls.map((castCall) => (
      `- ${packetText(castCall.name)}${castCall.performerName ? ` (${packetText(castCall.performerName)})` : ""} - ${packetText(castCall.callTime)} - ${castCall.sceneIds.length} scene${castCall.sceneIds.length === 1 ? "" : "s"}${castCall.notes ? ` - ${packetText(castCall.notes)}` : ""}`
    )) : ["No reviewed cast requirements recorded."]),
    "",
    "## Safety And Logistics",
    `- Parking / access: ${packetText(productionCallSheet?.parkingInstructions || "TBD")}`,
    `- Nearest hospital: ${packetText(productionCallSheet?.nearestHospital || "TBD")}`,
    `- Weather notes: ${packetText(productionCallSheet?.weatherNotes || legacyCallSheet.weather || "TBD")}`,
    `- General notes: ${packetText(productionCallSheet?.generalNotes || "None")}`,
    `- Safety notes: ${packetText(productionCallSheet?.safetyNotes || "None")}`,
    "",
    "## Crew",
    ...(project.people.length ? project.people.slice(0, 20).map((person) => `- ${packetText(person.name)} - ${packetText(person.role)}`) : ["No crew rows recorded."]),
    "",
    "## Gear",
    ...(project.equipment.length ? project.equipment.slice(0, 20).map((item) => `- ${packetText(item.name)} - ${packetText(item.status)}`) : ["No equipment rows recorded."]),
    "",
    "## Attachments To Review",
    ...(project.docs.length ? project.docs.slice(0, 20).map((doc) => `- ${packetText(doc.name)} (${packetText(doc.type)}) - ${packetText(formatDocStatus(doc))}`) : ["No documents attached."]),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

type ProductionShotExportRow = {
  order: number;
  shotNumber: string;
  sceneNumber: string;
  sceneHeading: string;
  screenplayRevision: string;
  description: string;
  status: string;
  shotSize: string;
  angle: string;
  movement: string;
  lens: string;
  cameraSupport: string;
  frameRate: string;
  estimatedMinutes: number;
  setupGroup: string;
  audioNotes: string;
  lightingNotes: string;
  notes: string;
  scheduleDays: string;
  callSheets: string;
  documents: string;
};

function productionShotExportRows(project: FilmProject, shots: ProductionShot[]): ProductionShotExportRow[] {
  const documentsById = new Map(project.docs.map((document) => [document.id, document.name]));
  return shots.map((shot) => {
    const manifest = productionShotManifest(shot);
    const breakdown = state.workspace.screenplayBreakdowns.find((candidate) => candidate.id === shot.screenplayBreakdownId);
    return {
      order: shot.ordinal,
      shotNumber: shot.shotNumber,
      sceneNumber: manifest.scene?.sceneNumber ?? String(manifest.scene?.ordinal ?? "Missing"),
      sceneHeading: manifest.scene?.heading ?? "Source scene missing",
      screenplayRevision: breakdown?.revision.title ?? "Source missing",
      description: shot.description,
      status: productionValueLabel(shot.status),
      shotSize: shot.shotSize,
      angle: shot.angle,
      movement: shot.movement,
      lens: shot.lens,
      cameraSupport: shot.cameraSupport,
      frameRate: shot.frameRate,
      estimatedMinutes: shot.estimatedMinutes,
      setupGroup: shot.setupGroup,
      audioNotes: shot.audioNotes,
      lightingNotes: shot.lightingNotes,
      notes: shot.notes,
      scheduleDays: manifest.scheduleUses.map((use) => `${use.scheduleTitle} Day ${use.dayOrdinal} ${productionUnitLabel(use.unit)}${use.date ? ` ${use.date}` : ""}`).join("; "),
      callSheets: manifest.callSheetUses.map((use) => `${use.title} (${productionUnitLabel(use.unit)}, ${use.status})`).join("; "),
      documents: shot.documentIds.map((id) => documentsById.get(id)).filter((name): name is string => Boolean(name)).join("; "),
    };
  });
}

function createProductionShotMarkdown(project: FilmProject, rows: ProductionShotExportRow[], exportedAt: string): string {
  const lines = [
    `# Shot List: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    "Policy: screenplay source text, contact fields, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    ...rows.flatMap((row) => [
      `## Scene ${packetText(row.sceneNumber)} - Shot ${packetText(row.shotNumber || String(row.order))}`,
      `- Heading: ${packetText(row.sceneHeading)}`,
      `- Revision: ${packetText(row.screenplayRevision)}`,
      `- Description: ${packetText(row.description)}`,
      `- Status: ${packetText(row.status)}`,
      `- Frame: ${packetText([row.shotSize, row.angle, row.movement].filter(Boolean).join(" / ") || "Not set")}`,
      `- Camera: ${packetText([row.lens, row.cameraSupport, row.frameRate].filter(Boolean).join(" / ") || "Not set")}`,
      `- Setup: ${packetText(row.setupGroup || "Not set")} - ${row.estimatedMinutes ? `${row.estimatedMinutes} min` : "duration not set"}`,
      `- Sound: ${packetText(row.audioNotes || "None")}`,
      `- Lighting: ${packetText(row.lightingNotes || "None")}`,
      `- Notes: ${packetText(row.notes || "None")}`,
      `- Schedule use: ${packetText(row.scheduleDays || "Not scheduled")}`,
      `- Call sheets: ${packetText(row.callSheets || "None generated")}`,
      `- Documents: ${packetText(row.documents || "None selected")}`,
      "",
    ]),
  ];
  return `${lines.join("\n")}\n`;
}

function createProductionShotCsv(rows: ProductionShotExportRow[]): string {
  const headers = [
    "Order", "Shot", "Scene", "Heading", "Revision", "Description", "Status", "Size", "Angle", "Movement",
    "Lens", "Camera / support", "Frame rate", "Setup minutes", "Setup group", "Sound", "Lighting", "Notes",
    "Schedule days", "Call sheets", "Documents",
  ];
  const cells = rows.map((row) => [
    String(row.order), row.shotNumber, row.sceneNumber, row.sceneHeading, row.screenplayRevision, row.description,
    row.status, row.shotSize, row.angle, row.movement, row.lens, row.cameraSupport, row.frameRate,
    String(row.estimatedMinutes), row.setupGroup, row.audioNotes, row.lightingNotes, row.notes, row.scheduleDays,
    row.callSheets, row.documents,
  ]);
  return `\uFEFF${[headers, ...cells].map((row) => row.map(safeCsvCell).join(",")).join("\r\n")}\r\n`;
}

function productionSidesExportMetadata(
  project: FilmProject,
  callSheet: ProductionCallSheet,
  manifest: ProductionSidesManifest,
  schedule: ProductionScheduleVersion,
  exportedAt: string,
): Array<[string, string]> {
  return [
    ["Project", project.title],
    ["Call sheet", callSheet.title],
    ["Call-sheet status", callSheet.status],
    ["Shoot date", callSheet.date ?? "TBD"],
    ["Shoot day", `${callSheet.dayOrdinal} of ${callSheet.totalShootDays}`],
    ["Unit", productionUnitLabel(callSheet.unit)],
    ["Source schedule", schedule.title],
    ["Source schedule changed", schedule.updatedAt === callSheet.sourceScheduleUpdatedAt ? "no" : "yes"],
    ["Screenplay revision", manifest.screenplayTitle],
    ["Scene strips", String(manifest.scenes.length)],
    ["Missing source scenes", String(manifest.missingSceneIds.length)],
    ["Exported", exportedAt],
  ];
}

function createProductionSidesMarkdown(
  project: FilmProject,
  callSheet: ProductionCallSheet,
  manifest: ProductionSidesManifest,
  schedule: ProductionScheduleVersion,
  exportedAt: string,
): string {
  const metadata = productionSidesExportMetadata(project, callSheet, manifest, schedule, exportedAt);
  const lines = [
    `# Sides: ${packetText(callSheet.title)}`,
    "",
    "Policy: user-requested local source export. This file includes the scheduled screenplay scene text below and excludes contact fields, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths.",
    "",
    "## Source",
    ...metadata.map(([label, value]) => `- ${packetText(label)}: ${packetText(value)}`),
    "",
    ...manifest.scenes.flatMap((scene) => [
      `## Scene ${packetText(scene.sceneNumber ?? String(scene.ordinal))}${scene.schedulePartLabel ? ` - Part ${packetText(scene.schedulePartLabel)}` : ""}: ${packetText(scene.heading)}`,
      "",
      `- Source lines: ${scene.sourceStartLine}-${scene.sourceEndLine}`,
      `- Location: ${packetText(scene.location ?? "TBD")}`,
      `- Time of day: ${packetText(scene.timeOfDay ?? "TBD")}`,
      `- Cast: ${scene.castCalls.length ? scene.castCalls.map((castCall) => `${packetText(castCall.name)}${castCall.performerName ? ` (${packetText(castCall.performerName)})` : ""}`).join(", ") : "No reviewed cast"}`,
      "",
      markdownSourceBlock(scene.sourceText),
      "",
    ]),
  ];
  return `${lines.join("\n")}\n`;
}

function createProductionSidesHtml(
  project: FilmProject,
  callSheet: ProductionCallSheet,
  manifest: ProductionSidesManifest,
  schedule: ProductionScheduleVersion,
  exportedAt: string,
): string {
  const metadata = productionSidesExportMetadata(project, callSheet, manifest, schedule, exportedAt);
  const sceneHtml = manifest.scenes.map((scene) => `
    <section class="scene">
      <header>
        <p class="scene-number">Scene ${escapeHtml(scene.sceneNumber ?? String(scene.ordinal))}${scene.schedulePartLabel ? ` - Part ${escapeHtml(scene.schedulePartLabel)}` : ""}</p>
        <h2>${escapeHtml(scene.heading)}</h2>
        <p>${escapeHtml(scene.location ?? "TBD")} | ${escapeHtml(scene.timeOfDay ?? "TBD")} | source lines ${scene.sourceStartLine}-${scene.sourceEndLine}</p>
        <p class="cast">Cast: ${scene.castCalls.length ? scene.castCalls.map((castCall) => `${escapeHtml(castCall.name)}${castCall.performerName ? ` (${escapeHtml(castCall.performerName)})` : ""}`).join(", ") : "No reviewed cast"}</p>
      </header>
      <pre>${escapeHtml(scene.sourceText || "Source text is empty for this scene.")}</pre>
    </section>
  `).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
  <title>${escapeHtml(`Sides - ${callSheet.title}`)}</title>
  <style>
    :root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; }
    body { max-width: 8.5in; margin: 0 auto; padding: 0.45in; }
    h1, h2, p { margin: 0; }
    .cover { min-height: 9.5in; display: grid; align-content: center; gap: 18px; break-after: page; }
    .cover h1 { font-size: 30px; }
    .policy { max-width: 7in; font-size: 12px; line-height: 1.5; }
    dl { display: grid; grid-template-columns: 1.6in 1fr; gap: 6px 12px; margin: 0; font-size: 12px; }
    dt { font-weight: 700; } dd { margin: 0; }
    .scene { break-after: page; }
    .scene:last-child { break-after: auto; }
    .scene header { padding-bottom: 14px; border-bottom: 2px solid #111; }
    .scene-number { font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .scene h2 { margin-top: 5px; font-size: 18px; }
    .scene header > p:not(.scene-number) { margin-top: 5px; font-size: 11px; }
    .cast { font-weight: 700; }
    pre { margin: 20px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.55 Courier, monospace; }
    @page { size: letter; margin: 0.55in; }
    @media print { body { max-width: none; padding: 0; } }
  </style>
</head>
<body>
  <section class="cover">
    <h1>${escapeHtml(callSheet.title)}</h1>
    <p class="policy">User-requested local source export. This file includes only the scheduled screenplay scene text and bounded call-sheet metadata. Contact fields, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.</p>
    <dl>${metadata.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>
  </section>
  ${sceneHtml}
</body>
</html>
`;
}

function markdownSourceBlock(value: string): string {
  const source = value.replace(/\r\n?/g, "\n").trimEnd() || "Source text is empty for this scene.";
  let fence = "```";
  while (source.includes(fence)) fence += "`";
  return `${fence}text\n${source}\n${fence}`;
}

function createProductionReportMarkdown(
  project: FilmProject,
  report: ProductionDailyReport,
  manifest: ProductionCallSheetManifest,
  callSheet: ProductionCallSheet,
  exportedAt: string,
): string {
  const summary = summarizeProductionReport(report);
  const scenesById = new Map(manifest.scenes.map((scene) => [scene.id, scene]));
  const lines = [
    `# Daily Production Report: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    "Policy: screenplay source text, contact fields, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    "## Day",
    `- Report: ${packetText(report.title)}`,
    `- Status: ${packetText(report.status)}`,
    `- Date: ${packetText(report.date ?? "TBD")}`,
    `- Shoot day: ${report.dayOrdinal}`,
    `- Unit: ${packetText(productionUnitLabel(report.unit))}`,
    `- Primary location: ${packetText(report.primaryLocation || "TBD")}`,
    `- Source call sheet: ${packetText(callSheet.title)}`,
    `- Source changed after report creation: ${callSheet.updatedAt === report.sourceCallSheetUpdatedAt ? "no" : "yes"}`,
    "",
    "## Progress",
    `- Planned scenes: ${summary.plannedSceneCount}`,
    `- Completed: ${summary.completedSceneCount}`,
    `- Partial: ${summary.partialSceneCount}`,
    `- Held: ${summary.heldSceneCount}`,
    `- Remaining: ${summary.remainingSceneCount}`,
    `- Completion: ${summary.completionPercent}%`,
    "",
    "## Actual Timings",
    `- Crew call: ${packetText(report.actualCrewCallTime ?? "Not recorded")}`,
    `- First shot: ${packetText(report.firstShotTime ?? "Not recorded")}`,
    `- Meal: ${packetText(report.mealStartTime ?? "Not recorded")} to ${packetText(report.mealEndTime ?? "Not recorded")}`,
    `- Camera wrap: ${packetText(report.cameraWrapTime ?? "Not recorded")}`,
    `- Crew wrap: ${packetText(report.crewWrapTime ?? "Not recorded")}`,
    `- Gross day: ${formatProductionMinutes(summary.grossDayMinutes)}`,
    `- Meal duration: ${formatProductionMinutes(summary.mealMinutes)}`,
    `- Working time: ${formatProductionMinutes(summary.workingMinutes)}`,
    "",
    "## Counts",
    `- Crew: ${report.crewCount}`,
    `- Cast: ${report.castCount}`,
    `- Background: ${report.backgroundCount}`,
    `- Meals: ${report.mealCount}`,
    `- Setups: ${report.setupCount}`,
    `- Takes: ${report.takeCount}`,
    `- Recorded minutes: ${report.footageMinutes}`,
    "",
    "## Scene Results",
    ...report.sceneResults.map((result) => {
      const scene = scenesById.get(result.sceneId);
      return `- ${packetText(scene?.sceneNumber ?? String(scene?.ordinal ?? "?"))}: ${packetText(scene?.heading ?? "Source scene missing")} - ${packetText(result.status)}${result.notes ? ` - ${packetText(result.notes)}` : ""}`;
    }),
    "",
    "## Notes",
    `- Actual weather: ${packetText(report.weatherActual || "Not recorded")}`,
    `- Delays: ${packetText(report.delayNotes || "None recorded")}`,
    `- Production: ${packetText(report.productionNotes || "None recorded")}`,
    `- Safety / incidents: ${packetText(report.safetyIncidentNotes || "None recorded")}`,
    `- Tomorrow / pickups: ${packetText(report.tomorrowNotes || "None recorded")}`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function createProductionReportSceneCsv(report: ProductionDailyReport, manifest: ProductionCallSheetManifest): string {
  const scenesById = new Map(manifest.scenes.map((scene) => [scene.id, scene]));
  const rows: string[][] = [["Date", "Shoot day", "Unit", "Scene", "Heading", "Location", "Time of day", "Status", "Notes"]];
  for (const result of report.sceneResults) {
    const scene = scenesById.get(result.sceneId);
    rows.push([
      report.date ?? "",
      String(report.dayOrdinal),
      productionUnitLabel(report.unit),
      scene?.sceneNumber ?? String(scene?.ordinal ?? ""),
      scene?.heading ?? "Source scene missing",
      scene?.location ?? "",
      scene?.timeOfDay ?? "",
      result.status,
      result.notes,
    ]);
  }
  return `\uFEFF${rows.map((row) => row.map(safeCsvCell).join(",")).join("\r\n")}\r\n`;
}

function createProductionLocationMarkdown(
  project: FilmProject,
  location: ProductionLocation,
  manifest: ProductionLocationManifest,
  exportedAt: string,
): string {
  const documents = location.documentIds.flatMap((documentId) => {
    const document = project.docs.find((candidate) => candidate.id === documentId);
    return document ? [document] : [];
  });
  const lines = [
    `# Location Brief: ${packetText(location.name)}`,
    "",
    `Project: ${packetText(project.title)}`,
    `Exported: ${packetText(exportedAt)}`,
    "Policy: this user-triggered local handoff includes the contact details selected for this scouting record. Screenplay source text, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    "## Status",
    `- Scouting: ${packetText(productionValueLabel(location.status))}`,
    `- Permit: ${packetText(productionValueLabel(location.permitStatus))}`,
    `- Permit notes: ${packetText(location.permitNotes || "None")}`,
    `- Linked source missing: ${manifest.sourceMissing ? "yes" : "no"}`,
    `- Linked source changed: ${manifest.sourceChanged ? "yes" : "no"}`,
    "",
    "## Address And Contact",
    `- Address: ${packetText(location.address || "TBD")}`,
    `- Contact: ${packetText(location.contactName || "TBD")}`,
    `- Contact details: ${packetText(location.contactDetails || "TBD")}`,
    "",
    "## Logistics",
    `- Parking / access / load-in: ${packetText(location.parkingAccess || "TBD")}`,
    `- Power: ${packetText(location.powerNotes || "TBD")}`,
    `- Sound: ${packetText(location.soundNotes || "TBD")}`,
    `- Restrooms: ${packetText(location.restroomNotes || "TBD")}`,
    `- Accessibility: ${packetText(location.accessibilityNotes || "TBD")}`,
    `- Nearest hospital: ${packetText(location.nearestHospital || "TBD")}`,
    `- Manual weather notes: ${packetText(location.weatherNotes || "TBD")}`,
    `- Safety: ${packetText(location.safetyNotes || "None")}`,
    `- General: ${packetText(location.generalNotes || "None")}`,
    "",
    "## Scenes",
    ...(manifest.scenes.length ? manifest.scenes.map((scene) => (
      `- ${packetText(scene.sceneNumber ?? String(scene.ordinal))}: ${packetText(scene.heading)} | ${packetText(scene.timeOfDay ?? "TBD")}`
    )) : ["No linked scenes."]),
    "",
    "## Schedule Use",
    ...(manifest.scheduleUses.length ? manifest.scheduleUses.map((use) => (
      `- ${packetText(use.scheduleTitle)} - Day ${use.dayOrdinal} - ${packetText(productionUnitLabel(use.unit))} - ${packetText(use.date ?? "Undated")} - ${use.sceneIds.length} scenes - ${packetText(use.scheduleStatus)}`
    )) : ["No scheduled use."]),
    "",
    "## Availability",
    ...(manifest.availability.length ? manifest.availability.map((window) => (
      `- ${packetText(productionValueLabel(window.status))}: ${packetText(window.startDate)} through ${packetText(window.endDate)}${window.notes ? ` - ${packetText(window.notes)}` : ""}`
    )) : ["No linked availability windows."]),
    "",
    "## Documents",
    ...(documents.length ? documents.map((document) => `- ${packetText(document.name)} (${packetText(document.type)}) - ${packetText(formatDocStatus(document))}`) : ["No location documents selected."]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function createProductionTalentMarkdown(
  project: FilmProject,
  talent: ProductionTalent,
  manifest: ProductionTalentManifest,
  exportedAt: string,
): string {
  const documents = talent.documentIds.flatMap((documentId) => {
    const document = project.docs.find((candidate) => candidate.id === documentId);
    return document ? [document] : [];
  });
  const enteredRate = talent.rateBasis === "not_set"
    ? "Not set"
    : `${formatCurrency(talent.agreedRateCents / 100)} - ${productionValueLabel(talent.rateBasis)}`;
  const lines = [
    `# Talent Brief: ${packetText(talent.characterName)}`,
    "",
    `Project: ${packetText(project.title)}`,
    `Exported: ${packetText(exportedAt)}`,
    "Policy: this user-triggered local handoff includes the contact, representative, entered deal, dietary, accessibility, wardrobe, and travel details selected for this record. It is not a union, payroll, tax, legal, or labor-compliance calculation. Screenplay source text, provider secrets, OAuth tokens, raw attachment bytes, private Worker state, and raw import source paths are excluded.",
    "",
    "## Casting",
    `- Character: ${packetText(talent.characterName)}`,
    `- Performer: ${packetText(talent.performerName || "TBD")}`,
    `- Status: ${packetText(productionValueLabel(talent.status))}`,
    `- Paperwork: ${packetText(productionValueLabel(talent.paperworkStatus))}`,
    `- Linked source missing: ${manifest.sourceMissing ? "yes" : "no"}`,
    `- Linked source changed: ${manifest.sourceChanged ? "yes" : "no"}`,
    "",
    "## Contact",
    `- Direct contact: ${packetText(talent.contactName || "TBD")}`,
    `- Direct details: ${packetText(talent.contactDetails || "TBD")}`,
    `- Representative: ${packetText(talent.representativeName || "TBD")}`,
    `- Representative details: ${packetText(talent.representativeDetails || "TBD")}`,
    "",
    "## Entered Terms",
    `- Rate: ${packetText(enteredRate)}`,
    `- Deal notes: ${packetText(talent.dealNotes || "None")}`,
    "",
    "## Readiness",
    `- Travel / lodging: ${packetText(talent.travelNotes || "None")}`,
    `- Dietary: ${packetText(talent.dietaryNotes || "None")}`,
    `- Accessibility: ${packetText(talent.accessibilityNotes || "None")}`,
    `- Wardrobe / fitting: ${packetText(talent.wardrobeNotes || "None")}`,
    `- General: ${packetText(talent.generalNotes || "None")}`,
    "",
    "## Scenes",
    ...(manifest.scenes.length ? manifest.scenes.map((scene) => (
      `- ${packetText(scene.sceneNumber ?? String(scene.ordinal))}: ${packetText(scene.heading)} | ${packetText(scene.location ?? "TBD")} | ${packetText(scene.timeOfDay ?? "TBD")}`
    )) : ["No linked scenes."]),
    "",
    "## Schedule Use",
    ...(manifest.scheduleUses.length ? manifest.scheduleUses.map((use) => (
      `- ${packetText(use.scheduleTitle)} - Day ${use.dayOrdinal} - ${packetText(productionUnitLabel(use.unit))} - ${packetText(use.date ?? "Undated")} - ${use.sceneIds.length} scenes - ${packetText(use.scheduleStatus)}`
    )) : ["No scheduled use."]),
    "",
    "## Availability",
    ...(manifest.availability.length ? manifest.availability.map((window) => (
      `- ${packetText(productionValueLabel(window.status))}: ${packetText(window.startDate)} through ${packetText(window.endDate)}${window.notes ? ` - ${packetText(window.notes)}` : ""}`
    )) : ["No linked availability windows."]),
    "",
    "## Documents",
    ...(documents.length ? documents.map((document) => `- ${packetText(document.name)} (${packetText(document.type)}) - ${packetText(formatDocStatus(document))}`) : ["No talent documents selected."]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function safeCsvCell(value: string): string {
  const formulaSafe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${formulaSafe.replaceAll('"', '""')}"`;
}

function packetText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function packetPlanningFields(fields: Record<string, unknown>): string {
  const entries = Object.entries(fields)
    .slice(0, 6)
    .map(([key, value]) => `${packetText(key)}=${packetText(String(value ?? ""))}`)
    .filter((entry) => entry !== "=");
  return entries.length ? entries.join("; ") : "No fields";
}

function optionalWorkerFetch(timeoutMs = OPTIONAL_WORKER_TIMEOUT_MS): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
    }
  };
}

async function sha256HexBlob(blob: Blob): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function exportBackup(): Promise<void> {
  const passphrase = window.prompt("Enter a backup passphrase with at least 12 characters.");
  if (!passphrase) {
    state.ui.toast = "Backup canceled before encryption.";
    render();
    return;
  }

  try {
    const { planningExport, message: planningExportMessage } = await loadPlanningExportForBackup();
    const snapshot = createBackupSnapshot(state.workspace, { planningExport });
    const bundle = await createEncryptedBackupZipBundle(snapshot, passphrase);
    const blob = new Blob([bundle.bytes], { type: "application/zip" });
    downloadBlob(blob, `film-backup-${snapshot.createdAt.slice(0, 10)}.filmbackup.zip`);

    const workerBackupMessage = await updateWorkerBackupStorage(bundle.bytes, snapshot.createdAt);
    state.workspace.auditLog.unshift(createAuditEvent("Encrypted browser backup exported", "System", "teal"));
    await persistWorkspace(
      createOperation(state.workspace.id, "backup.exported", "backup", snapshot.createdAt, "Encrypted browser backup exported", {
        createdAt: snapshot.createdAt,
        secretPolicy: snapshot.secretPolicy,
        attachmentPolicy: snapshot.attachmentManifest.policy,
        attachmentAssets: snapshot.attachmentManifest.totalAssets,
        attachmentBytesExcluded: snapshot.attachmentManifest.totalSourceBytes,
        planningRowsExported: snapshot.planningExport?.rowCount ?? 0,
        planningRowsTruncated: snapshot.planningExport?.truncated ?? false,
        planningExportPersistence: snapshot.planningExport?.persistence ?? "not_applicable",
        format: bundle.format,
        encrypted: true,
      }),
    );
    const attachmentMessage = snapshot.attachmentManifest.totalAssets > 0
      ? `Encrypted ZIP backup exported with ${snapshot.attachmentManifest.totalAssets} attachment metadata records. Blob bytes stay local.`
      : "Encrypted ZIP backup exported. Keep the passphrase; it cannot be recovered.";
    const planningMessage = snapshot.planningExport
      ? `Planning export included ${snapshot.planningExport.rowCount} D1 rows.`
      : planningExportMessage;
    state.ui.toast = `${attachmentMessage} ${planningMessage} ${workerBackupMessage}`;
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Encrypted backup failed.";
  }
  render();
}

async function loadPlanningExportForBackup(): Promise<{
  planningExport: BackupPlanningExport | undefined;
  message: string;
}> {
  try {
    return {
      planningExport: await runPlanningExportDryRun(
        WORKER_URL,
        state.workspace.id,
        state.auth.session?.csrfToken ?? "local-dry-run-csrf",
        1000,
        optionalWorkerFetch(),
      ),
      message: "",
    };
  } catch (error) {
    return {
      planningExport: undefined,
      message: `Planning D1 export unavailable: ${error instanceof Error ? error.message : "Worker unavailable"}.`,
    };
  }
}

async function refreshPlanningExportForReview(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before refreshing D1 planning rows.";
    render();
    return;
  }

  try {
    const planningExport = await runPlanningExportDryRun(WORKER_URL, state.workspace.id, csrfToken, 100);
    state.planningExportView = {
      ...planningExport,
      checkedAt: new Date().toISOString(),
    };
    state.workspace.auditLog.unshift(createAuditEvent(`D1 planning refresh: ${planningExport.rowCount} rows`, "System", "blue"));
    await persistWorkspace();
    state.ui.toast = `D1 planning refresh ready: ${planningExport.rowCount} rows${planningExport.truncated ? " (truncated)" : ""}.`;
  } catch (error) {
    state.ui.toast = `D1 planning refresh blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function updateWorkerBackupDryRunMetadata(): Promise<string> {
  try {
    const dryRun = await runBackupDryRun(
      WORKER_URL,
      state.auth.session?.csrfToken ?? "local-dry-run-csrf",
      optionalWorkerFetch(),
    );
    state.backupDryRun = {
      checkedAt: new Date().toISOString(),
      persistence: dryRun.persistence,
      storagePersistence: null,
      retentionPolicy: dryRun.backup.retentionPolicy,
      restorePointId: dryRun.backup.restorePoint.id,
      restorePointLabel: dryRun.backup.restorePoint.label,
      snapshotRef: dryRun.backup.restorePoint.snapshotRef,
      objectKey: null,
      sizeBytes: null,
    };
    addWorkerRestorePoint(dryRun.backup.restorePoint);
    return `Worker restore-point metadata: ${dryRun.persistence.replaceAll("_", " ")}.`;
  } catch (error) {
    return `Worker restore-point metadata skipped: ${error instanceof Error ? error.message : "Worker unavailable"}.`;
  }
}

async function updateWorkerBackupStorage(bytes: Uint8Array, createdAt: string): Promise<string> {
  try {
    const stored = await storeBackupObject(
      WORKER_URL,
      state.workspace.id,
      createdAt,
      bytes,
      state.auth.session?.csrfToken ?? "local-dry-run-csrf",
      optionalWorkerFetch(),
    );
    state.backupDryRun = {
      checkedAt: new Date().toISOString(),
      persistence: stored.restorePointPersistence,
      storagePersistence: stored.persistence,
      retentionPolicy: stored.backup.retentionPolicy,
      restorePointId: stored.backup.restorePoint.id,
      restorePointLabel: stored.backup.restorePoint.label,
      snapshotRef: stored.backup.restorePoint.snapshotRef,
      objectKey: stored.backup.objectKey,
      sizeBytes: stored.backup.sizeBytes,
    };
    addWorkerRestorePoint(stored.backup.restorePoint);
    return `Worker R2 backup storage: ${stored.persistence.replaceAll("_", " ")}.`;
  } catch (error) {
    const metadataMessage = await updateWorkerBackupDryRunMetadata();
    return `${metadataMessage} Worker R2 backup storage skipped: ${error instanceof Error ? error.message : "Worker unavailable"}.`;
  }
}

function addWorkerRestorePoint(restorePoint: BackupDryRunRestorePoint): void {
  state.workspace.restorePoints = [
    {
      id: restorePoint.id,
      label: restorePoint.label,
      createdAt: restorePoint.createdAt,
    },
    ...state.workspace.restorePoints.filter((point) => point.id !== restorePoint.id),
  ].slice(0, 5);
}

async function previewStoredBackupManifest(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before viewing stored backup manifests.";
    render();
    return;
  }

  try {
    const manifest = await exportStoredBackupManifest(WORKER_URL, state.workspace.id, csrfToken, 25);
    state.backupExport = {
      rowCount: manifest.rowCount,
      truncated: manifest.truncated,
      persistence: manifest.persistence,
      checkedAt: new Date().toISOString(),
    };
    state.workspace.auditLog.unshift(createAuditEvent(`Stored backup manifest: ${manifest.rowCount} restore points`, "System", "blue"));
    await persistWorkspace();
    state.ui.toast = `Stored backup manifest ready: ${manifest.rowCount} restore points${manifest.truncated ? " (truncated)" : ""}.`;
  } catch (error) {
    state.ui.toast = `Stored backup manifest blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function handleWorkerAuditFilter(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const form = event.currentTarget;
  if (!(form instanceof HTMLFormElement)) return;
  const prefixInput = form.elements.namedItem("actionPrefix") as HTMLInputElement | null;
  state.workerAuditActionPrefix = prefixInput?.value.trim().slice(0, 80) ?? "";
  await previewWorkerAuditManifest(0);
}

async function previewWorkerAuditManifest(offset = 0): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before viewing Worker audit events.";
    render();
    return;
  }

  try {
    const manifest = await exportWorkerAuditEventManifest(
      WORKER_URL,
      state.workspace.id,
      csrfToken,
      {
        limit: 50,
        offset,
        actionPrefix: state.workerAuditActionPrefix,
      },
    );
    state.workerAuditManifest = {
      checkedAt: new Date().toISOString(),
      persistence: manifest.persistence,
      auditPersistence: manifest.auditPersistence ?? null,
      metadataPolicy: manifest.metadataPolicy,
      rowCount: manifest.rowCount,
      truncated: manifest.truncated,
      offset: manifest.offset,
      nextOffset: manifest.nextOffset,
      actionPrefix: manifest.actionPrefix,
      events: manifest.events,
    };
    state.workspace.auditLog.unshift(createAuditEvent(`Worker audit manifest: ${manifest.rowCount} events`, "System", "blue"));
    await persistWorkspace();
    state.ui.toast = `Worker audit manifest ready: ${manifest.rowCount} events${manifest.truncated ? " (more available)" : ""}.`;
  } catch (error) {
    state.ui.toast = `Worker audit manifest blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewStoredBackupObject(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before previewing stored backups.";
    render();
    return;
  }

  const select = root.querySelector<HTMLSelectElement>("[data-action='restore-select']");
  const restorePointId = select?.value;
  if (!restorePointId) {
    state.ui.toast = "Select a restore point before previewing a stored backup.";
    render();
    return;
  }

  const passphrase = window.prompt("Enter the backup passphrase to preview this stored backup.");
  if (!passphrase) {
    state.ui.toast = "Stored backup preview canceled before decryption.";
    render();
    return;
  }

  try {
    const downloadPlan = await createStoredBackupObjectDownloadPlan(WORKER_URL, state.workspace.id, restorePointId, csrfToken);
    const download = await downloadStoredBackupObject(
      WORKER_URL,
      state.workspace.id,
      restorePointId,
      downloadPlan.backupDownloadPlanId,
      downloadPlan.backupDownloadToken,
      csrfToken,
    );
    const snapshot = await decryptEncryptedBackupZipBundle(await download.blob.arrayBuffer(), passphrase);
    state.restoreSnapshot = snapshot;
    state.restorePreview = summarizeRestorePreview(state.workspace, snapshot);
    state.restorePlanningRecords = snapshot.planningExport?.records ?? [];
    state.restoreGate = null;
    state.restoreApproval = null;
    state.restoreCommitAttempt = null;
    state.restoreApplicationPreflight = null;
    state.restoreApplicationCommit = null;
    state.restoreAttachmentPackagePreflight = null;
    state.restoreAttachmentPackageVerification = null;
    state.restoreAttachmentObjectPlan = null;
    state.restoreAttachmentObjectCommitPreflight = null;
    state.restoreAttachmentObjectCommit = null;
    state.restorePlanningDryRun = null;
    state.restorePlanningCommit = null;
    state.workspace.auditLog.unshift(createAuditEvent(`Stored backup restore previewed: ${download.filename ?? restorePointId}`, "System", "amber"));
    await persistWorkspace(
      createOperation(
        state.workspace.id,
        "restore.dry_run",
        "backup",
        snapshot.createdAt,
        "Stored backup restore previewed",
        {
          workspaceId: snapshot.workspaceId,
          restorePointId: download.restorePointId ?? restorePointId,
          backupCreatedAt: download.createdAt,
          incomingProjectCount: state.restorePreview.incomingProjectCount,
          matchingProjectCount: state.restorePreview.matchingProjectCount,
          newProjectCount: state.restorePreview.newProjectCount,
          incomingRecordCount: state.restorePreview.incomingRecordCount,
          changedRecordCount: state.restorePreview.changedRecordCount,
          newRecordCount: state.restorePreview.newRecordCount,
          fieldConflictCount: state.restorePreview.fieldConflictCount,
          warnings: state.restorePreview.warnings,
        },
      ),
    );
    state.ui.toast = "Stored backup decrypted for preview only. No records were overwritten.";
  } catch (error) {
    state.ui.toast = `Stored backup preview blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function restoreDryRun(): Promise<void> {
  const select = root.querySelector<HTMLSelectElement>("[data-action='restore-select']");
  const restorePoint = state.workspace.restorePoints.find((point) => point.id === select?.value);
  state.workspace.auditLog.unshift(createAuditEvent(`Restore dry run: ${restorePoint?.label ?? "latest"}`, "System", "amber"));
  await persistWorkspace(
    createOperation(
      state.workspace.id,
      "restore.dry_run",
      "restore_point",
      restorePoint?.id ?? "latest",
      `Restore dry run: ${restorePoint?.label ?? "latest"}`,
    ),
  );
  state.ui.toast = "Restore dry run completed. No records were overwritten.";
  render();
}

async function checkRestoreCommitGate(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before checking the Worker restore gate.";
    render();
    return;
  }

  const preview = state.restorePreview;
  if (!preview) {
    state.ui.toast = "Preview an encrypted backup before checking the restore gate.";
    render();
    return;
  }

  const confirmationPhrase = `RESTORE ${state.workspace.id}`;
  const confirmation = window.prompt(`Type ${confirmationPhrase} to check the Worker restore gate.`);
  if (!confirmation) {
    state.ui.toast = "Restore gate check canceled before confirmation.";
    render();
    return;
  }

  try {
    const preRestoreBackupId = state.backupDryRun?.storagePersistence === "r2_backup_object"
      ? state.backupDryRun.restorePointId
      : undefined;
    const result = await runRestoreCommitDryRun(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      snapshotWorkspaceId: preview.workspaceId,
      backupCreatedAt: preview.createdAt,
      ...(preRestoreBackupId ? { preRestoreBackupId } : {}),
      confirmation,
      preview: {
        incomingRecordCount: preview.incomingRecordCount,
        changedRecordCount: preview.changedRecordCount,
        newRecordCount: preview.newRecordCount,
        fieldConflictCount: preview.fieldConflictCount,
        warnings: preview.warnings,
      },
      applicationTablePlan: preview.applicationPlan.tablePlan,
    });
    state.restoreGate = restoreGateStateFromResult(result);
    state.restoreApproval = null;
    state.restoreCommitAttempt = null;
    state.restoreApplicationPreflight = null;
    state.restoreApplicationCommit = null;
    state.restoreAttachmentPackagePreflight = null;
    state.restoreAttachmentPackageVerification = null;
    state.restoreAttachmentObjectPlan = null;
    state.restoreAttachmentObjectCommitPreflight = null;
    state.restorePlanningCommit = null;
    state.workspace.auditLog.unshift(
      createAuditEvent(`Restore gate checked: ${result.commitStatus.replaceAll("_", " ")}`, "System", "amber"),
    );
    await persistWorkspace();
    state.ui.toast = `Restore gate checked: ${result.commitStatus.replaceAll("_", " ")}. No records were overwritten.`;
  } catch (error) {
    state.ui.toast = `Restore gate check blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function recordRestoreApproval(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before recording a restore approval.";
    render();
    return;
  }

  const preview = state.restorePreview;
  if (!preview) {
    state.ui.toast = "Preview an encrypted backup before recording a restore approval.";
    render();
    return;
  }

  if (!state.restoreGate) {
    state.ui.toast = "Check the Worker restore gate before recording an approval.";
    render();
    return;
  }

  const confirmationPhrase = `RESTORE ${state.workspace.id}`;
  const confirmation = window.prompt(`Type ${confirmationPhrase} to record a non-destructive restore approval.`);
  if (!confirmation) {
    state.ui.toast = "Restore approval canceled before confirmation.";
    render();
    return;
  }

  try {
    const fallbackPreRestoreBackupId = state.backupDryRun?.storagePersistence === "r2_backup_object"
      ? state.backupDryRun.restorePointId
      : undefined;
    const preRestoreBackupId = state.restoreGate.preRestoreBackupId ?? fallbackPreRestoreBackupId;
    const result = await runRestoreApprovalDryRun(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      snapshotWorkspaceId: preview.workspaceId,
      backupCreatedAt: preview.createdAt,
      ...(preRestoreBackupId ? { preRestoreBackupId } : {}),
      confirmation,
      preview: {
        incomingRecordCount: preview.incomingRecordCount,
        changedRecordCount: preview.changedRecordCount,
        newRecordCount: preview.newRecordCount,
        fieldConflictCount: preview.fieldConflictCount,
        warnings: preview.warnings,
      },
    });
    state.restoreApproval = restoreApprovalStateFromResult(result);
    state.restoreCommitAttempt = null;
    state.restoreApplicationPreflight = null;
    state.restoreApplicationCommit = null;
    state.restoreAttachmentPackagePreflight = null;
    state.restoreAttachmentPackageVerification = null;
    state.restoreAttachmentObjectPlan = null;
    state.restoreAttachmentObjectCommitPreflight = null;
    state.restorePlanningCommit = null;
    state.workspace.auditLog.unshift(
      createAuditEvent(`Restore approval recorded: ${result.approvalStatus.replaceAll("_", " ")}`, "System", "amber"),
    );
    await persistWorkspace();
    state.ui.toast = `Restore approval recorded: ${result.approvalStatus.replaceAll("_", " ")}. No records were overwritten.`;
  } catch (error) {
    state.ui.toast = `Restore approval blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function checkRestoreCommitStorage(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before checking restore commit storage.";
    render();
    return;
  }

  const preview = state.restorePreview;
  if (!preview) {
    state.ui.toast = "Preview an encrypted backup before checking restore commit storage.";
    render();
    return;
  }

  const approval = state.restoreApproval;
  if (!approval?.approvalId || approval.approvalStatus !== "approved_pending_commit") {
    state.ui.toast = "Record an approved restore approval before checking commit storage.";
    render();
    return;
  }

  const confirmationPhrase = `RESTORE ${state.workspace.id}`;
  const confirmation = window.prompt(`Type ${confirmationPhrase} to check restore commit storage.`);
  if (!confirmation) {
    state.ui.toast = "Restore commit storage check canceled before confirmation.";
    render();
    return;
  }

  try {
    const fallbackPreRestoreBackupId = state.backupDryRun?.storagePersistence === "r2_backup_object"
      ? state.backupDryRun.restorePointId
      : undefined;
    const preRestoreBackupId = approval.preRestoreBackupId ?? state.restoreGate?.preRestoreBackupId ?? fallbackPreRestoreBackupId;
    const result = await runRestoreCommitStorageDryRun(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      snapshotWorkspaceId: preview.workspaceId,
      backupCreatedAt: preview.createdAt,
      ...(preRestoreBackupId ? { preRestoreBackupId } : {}),
      approvalId: approval.approvalId,
      confirmation,
      preview: {
        incomingRecordCount: preview.incomingRecordCount,
        changedRecordCount: preview.changedRecordCount,
        newRecordCount: preview.newRecordCount,
        fieldConflictCount: preview.fieldConflictCount,
        warnings: preview.warnings,
      },
    });
    state.restoreCommitAttempt = restoreCommitAttemptStateFromResult(result);
    state.restoreApplicationPreflight = null;
    state.restoreApplicationCommit = null;
    state.restoreAttachmentPackagePreflight = null;
    state.restoreAttachmentPackageVerification = null;
    state.restoreAttachmentObjectPlan = null;
    state.restoreAttachmentObjectCommitPreflight = null;
    state.restorePlanningCommit = null;
    state.workspace.auditLog.unshift(
      createAuditEvent(`Restore commit storage checked: ${result.commitAttemptStatus.replaceAll("_", " ")}`, "System", "amber"),
    );
    await persistWorkspace();
    state.ui.toast = `Restore commit storage checked: ${result.commitAttemptStatus.replaceAll("_", " ")}. No records were overwritten.`;
  } catch (error) {
    state.ui.toast = `Restore commit storage blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function checkRestoreApplicationPreflight(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before checking restore application preflight.";
    render();
    return;
  }

  const preview = state.restorePreview;
  if (!preview) {
    state.ui.toast = "Preview an encrypted backup before checking restore application preflight.";
    render();
    return;
  }

  const approval = state.restoreApproval;
  if (!approval?.approvalId || approval.approvalStatus !== "approved_pending_commit") {
    state.ui.toast = "Record an approved restore approval before checking application preflight.";
    render();
    return;
  }

  const commitAttempt = state.restoreCommitAttempt;
  if (!commitAttempt?.commitAttemptId || commitAttempt.commitAttemptStatus !== "blocked_until_restore_apply") {
    state.ui.toast = "Check restore commit storage before checking application preflight.";
    render();
    return;
  }

  const confirmationPhrase = `RESTORE ${state.workspace.id}`;
  const confirmation = window.prompt(`Type ${confirmationPhrase} to check restore application preflight.`);
  if (!confirmation) {
    state.ui.toast = "Restore application preflight canceled before confirmation.";
    render();
    return;
  }

  try {
    const fallbackPreRestoreBackupId = state.backupDryRun?.storagePersistence === "r2_backup_object"
      ? state.backupDryRun.restorePointId
      : undefined;
    const preRestoreBackupId = commitAttempt.preRestoreBackupId
      ?? approval.preRestoreBackupId
      ?? state.restoreGate?.preRestoreBackupId
      ?? fallbackPreRestoreBackupId;
    const result = await runRestoreApplicationDryRun(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      snapshotWorkspaceId: preview.workspaceId,
      backupCreatedAt: preview.createdAt,
      ...(preRestoreBackupId ? { preRestoreBackupId } : {}),
      approvalId: approval.approvalId,
      commitAttemptId: commitAttempt.commitAttemptId,
      confirmation,
      preview: {
        incomingRecordCount: preview.incomingRecordCount,
        changedRecordCount: preview.changedRecordCount,
        newRecordCount: preview.newRecordCount,
        fieldConflictCount: preview.fieldConflictCount,
        warnings: preview.warnings,
      },
    });
    state.restoreApplicationPreflight = restoreApplicationPreflightStateFromResult(result);
    state.restoreApplicationCommit = null;
    state.restorePlanningCommit = null;
    state.restoreAttachmentPackagePreflight = null;
    state.restoreAttachmentPackageVerification = null;
    state.restoreAttachmentObjectPlan = null;
    state.restoreAttachmentObjectCommitPreflight = null;
    state.restoreAttachmentObjectCommit = null;
    state.workspace.auditLog.unshift(
      createAuditEvent(`Restore application preflight checked: ${result.applicationPreflightStatus.replaceAll("_", " ")}`, "System", "amber"),
    );
    await persistWorkspace();
    state.ui.toast = `Restore application preflight checked: ${result.applicationPreflightStatus.replaceAll("_", " ")}. No records were overwritten.`;
  } catch (error) {
    state.ui.toast = `Restore application preflight blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function commitRestoreApplicationCoreRecords(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before applying restore snapshot records.";
    render();
    return;
  }

  const snapshot = state.restoreSnapshot;
  const preview = state.restorePreview;
  if (!snapshot || !preview) {
    state.ui.toast = "Preview and decrypt a backup before applying restore snapshot records.";
    render();
    return;
  }

  const approval = state.restoreApproval;
  if (!approval?.approvalId || approval.approvalStatus !== "approved_pending_commit") {
    state.ui.toast = "Record an approved restore approval before applying snapshot records.";
    render();
    return;
  }

  const commitAttempt = state.restoreCommitAttempt;
  if (!commitAttempt?.commitAttemptId || commitAttempt.commitAttemptStatus !== "blocked_until_restore_apply") {
    state.ui.toast = "Check restore commit storage before applying snapshot records.";
    render();
    return;
  }

  const applicationPreflight = state.restoreApplicationPreflight;
  if (
    !applicationPreflight?.applicationPreflightId
    || applicationPreflight.applicationPreflightStatus !== "blocked_until_restore_apply_implementation"
  ) {
    state.ui.toast = "Check restore application preflight before applying snapshot records.";
    render();
    return;
  }

  const records = createRestoreSnapshotRecords(snapshot, preview);
  const writeCount = records.filter((record) => record.action !== "skip").length;
  if (writeCount === 0) {
    state.ui.toast = "This backup has no workspace snapshot records to apply.";
    render();
    return;
  }
  if (records.length > 500) {
    state.ui.toast = "Snapshot restore is capped at 500 workspace, project, task, document, person, equipment, and expense records per apply.";
    render();
    return;
  }

  const confirmationPhrase = `RESTORE ${state.workspace.id}`;
  const confirmation = window.prompt(`Type ${confirmationPhrase} to apply workspace snapshot rows.`);
  if (!confirmation) {
    state.ui.toast = "Restore application commit canceled before confirmation.";
    render();
    return;
  }

  try {
    const fallbackPreRestoreBackupId = state.backupDryRun?.storagePersistence === "r2_backup_object"
      ? state.backupDryRun.restorePointId
      : undefined;
    const preRestoreBackupId = applicationPreflight.preRestoreBackupId
      ?? commitAttempt.preRestoreBackupId
      ?? approval.preRestoreBackupId
      ?? state.restoreGate?.preRestoreBackupId
      ?? fallbackPreRestoreBackupId;
    const result = await runRestoreApplicationCommit(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      snapshotWorkspaceId: preview.workspaceId,
      backupCreatedAt: preview.createdAt,
      ...(preRestoreBackupId ? { preRestoreBackupId } : {}),
      approvalId: approval.approvalId,
      commitAttemptId: commitAttempt.commitAttemptId,
      applicationPreflightId: applicationPreflight.applicationPreflightId,
      confirmation,
      preview: {
        incomingRecordCount: preview.incomingRecordCount,
        changedRecordCount: preview.changedRecordCount,
        newRecordCount: preview.newRecordCount,
        fieldConflictCount: preview.fieldConflictCount,
        warnings: preview.warnings,
      },
      applicationTablePlan: preview.applicationPlan.tablePlan,
      records,
    });
    state.restoreApplicationCommit = restoreApplicationCommitStateFromResult(result);
    state.workspace.auditLog.unshift(
      createAuditEvent(`Restore snapshot records applied: ${formatRestoreRecordSummary(result.recordSummary)}`, "System", "amber"),
    );
    await persistWorkspace();
    state.ui.toast = `Restore snapshot records applied: ${formatRestoreRecordSummary(result.recordSummary)}.`;
  } catch (error) {
    state.ui.toast = `Restore application commit blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function checkRestoreAttachmentPackageDryRun(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before checking attachment restore packaging.";
    render();
    return;
  }

  const preview = state.restorePreview;
  if (!preview) {
    state.ui.toast = "Preview an encrypted backup before checking attachment restore packaging.";
    render();
    return;
  }

  const attachmentPackagePlan = preview.applicationPlan.attachmentPackagePlan;
  if (!attachmentPackagePlan.packageRequired) {
    state.ui.toast = "This backup preview has no attachment package requirement.";
    render();
    return;
  }

  try {
    const result = await runRestoreAttachmentPackageDryRun(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      snapshotWorkspaceId: preview.workspaceId,
      backupCreatedAt: preview.createdAt,
      attachmentPackagePlan,
    });
    state.restoreAttachmentPackagePreflight = restoreAttachmentPackagePreflightStateFromResult(result);
    state.restoreAttachmentPackageVerification = null;
    state.restoreAttachmentObjectPlan = null;
    state.restoreAttachmentObjectCommitPreflight = null;
    state.restoreAttachmentObjectCommit = null;
    state.workspace.auditLog.unshift(
      createAuditEvent(`Attachment package preflight: ${result.attachmentPackagePreflightStatus.replaceAll("_", " ")}`, "System", "amber"),
    );
    await persistWorkspace();
    state.ui.toast = `Attachment package preflight checked: ${result.attachmentPackagePreflightStatus.replaceAll("_", " ")}. No bytes were restored.`;
  } catch (error) {
    state.ui.toast = `Attachment package preflight blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function checkRestoreAttachmentPackageVerificationDryRun(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before verifying attachment restore packages.";
    render();
    return;
  }

  const preview = state.restorePreview;
  if (!preview) {
    state.ui.toast = "Preview an encrypted backup before verifying attachment restore packages.";
    render();
    return;
  }

  const preflight = state.restoreAttachmentPackagePreflight;
  if (!preflight?.attachmentPackagePreflightId) {
    state.ui.toast = "Check the attachment package before verifying a downloaded package.";
    render();
    return;
  }

  const packageDownload = state.attachmentExport?.packageDownload;
  if (!packageDownload?.sha256) {
    state.ui.toast = "Download a verified attachment package before package verification.";
    render();
    return;
  }

  try {
    const result = await runRestoreAttachmentPackageVerificationDryRun(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      snapshotWorkspaceId: preview.workspaceId,
      backupCreatedAt: preview.createdAt,
      attachmentPackagePlan: preview.applicationPlan.attachmentPackagePlan,
      attachmentPackagePreflightId: preflight.attachmentPackagePreflightId,
      packageSha256: packageDownload.sha256,
      packageManifest: packageDownload.packageManifest,
    });
    state.restoreAttachmentPackageVerification = restoreAttachmentPackageVerificationStateFromResult(result);
    state.restoreAttachmentObjectPlan = null;
    state.restoreAttachmentObjectCommitPreflight = null;
    state.restoreAttachmentObjectCommit = null;
    state.workspace.auditLog.unshift(
      createAuditEvent(
        `Attachment package verified: ${result.attachmentPackageVerificationStatus.replaceAll("_", " ")}`,
        "System",
        "amber",
      ),
    );
    await persistWorkspace();
    state.ui.toast = `Attachment package verification checked: ${result.attachmentPackageVerificationStatus.replaceAll("_", " ")}. No bytes were restored.`;
  } catch (error) {
    state.ui.toast = `Attachment package verification blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function checkRestoreAttachmentObjectPlanDryRun(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before planning attachment object restore.";
    render();
    return;
  }

  const verification = state.restoreAttachmentPackageVerification;
  if (!verification?.attachmentPackageVerificationId) {
    state.ui.toast = "Verify the attachment package before planning object restore.";
    render();
    return;
  }

  const packageDownload = state.attachmentExport?.packageDownload;
  if (!packageDownload?.sha256) {
    state.ui.toast = "Download a verified attachment package before planning object restore.";
    render();
    return;
  }

	  try {
	    const result = await runRestoreAttachmentObjectPlanDryRun(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      attachmentPackageVerificationId: verification.attachmentPackageVerificationId,
      packageSha256: packageDownload.sha256,
      manifestSha256: verification.manifestSha256,
      packageManifest: packageDownload.packageManifest,
	    });
	    state.restoreAttachmentObjectPlan = restoreAttachmentObjectPlanStateFromResult(result);
	    state.restoreAttachmentObjectCommitPreflight = null;
	    state.restoreAttachmentObjectCommit = null;
	    state.workspace.auditLog.unshift(
	      createAuditEvent(`Attachment object plan: ${result.attachmentObjectPlanStatus.replaceAll("_", " ")}`, "System", "amber"),
	    );
    await persistWorkspace();
    state.ui.toast = `Attachment object restore planned: ${result.attachmentObjectPlanStatus.replaceAll("_", " ")}. No bytes were restored.`;
  } catch (error) {
    state.ui.toast = `Attachment object plan blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
	  render();
	}

async function checkRestoreAttachmentObjectCommitPreflight(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before checking attachment object commit preflight.";
    render();
    return;
  }

  const verification = state.restoreAttachmentPackageVerification;
  const objectPlan = state.restoreAttachmentObjectPlan;
  if (!verification?.attachmentPackageVerificationId || !objectPlan?.attachmentObjectPlanId) {
    state.ui.toast = "Plan attachment object restore before checking commit preflight.";
    render();
    return;
  }

  const packageDownload = state.attachmentExport?.packageDownload;
  if (!packageDownload?.sha256) {
    state.ui.toast = "Download a verified attachment package before checking object commit preflight.";
    render();
    return;
  }

  const confirmationPhrase = `RESTORE ${state.workspace.id}`;
  const confirmation = window.prompt(`Type ${confirmationPhrase} to check attachment byte commit preflight.`);
  if (!confirmation) {
    state.ui.toast = "Attachment commit preflight canceled before confirmation.";
    render();
    return;
  }

  try {
    const result = await runRestoreAttachmentObjectCommitPreflight(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      attachmentPackageVerificationId: verification.attachmentPackageVerificationId,
      attachmentObjectPlanId: objectPlan.attachmentObjectPlanId,
      packageSha256: packageDownload.sha256,
      manifestSha256: verification.manifestSha256,
      packageManifest: packageDownload.packageManifest,
      confirmation,
    });
    state.restoreAttachmentObjectCommitPreflight = restoreAttachmentObjectCommitPreflightStateFromResult(result);
    state.restoreAttachmentObjectCommit = null;
    state.workspace.auditLog.unshift(
      createAuditEvent(
        `Attachment commit preflight: ${result.attachmentObjectCommitPreflightStatus.replaceAll("_", " ")}`,
        "System",
        result.readyForByteCommit ? "teal" : "amber",
      ),
    );
    await persistWorkspace();
    state.ui.toast = `Attachment commit preflight checked: ${result.attachmentObjectCommitPreflightStatus.replaceAll("_", " ")}. No bytes were restored.`;
  } catch (error) {
    state.ui.toast = `Attachment commit preflight blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function commitRestoreAttachmentObjects(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  const preflight = state.restoreAttachmentObjectCommitPreflight;
  const packageDownload = state.attachmentExport?.packageDownload;
  if (!csrfToken) {
    state.ui.toast = "Sign in before restoring attachment bytes.";
    render();
    return;
  }
  if (!preflight?.readyForByteCommit || !preflight.attachmentObjectCommitPreflightId) {
    state.ui.toast = "Run a clear attachment commit preflight before restoring bytes.";
    render();
    return;
  }
  if (!packageDownload?.sha256 || !packageDownload.blob) {
    state.ui.toast = "Download and verify the attachment package before restoring bytes.";
    render();
    return;
  }

  const confirmationPhrase = `RESTORE ${state.workspace.id}`;
  const confirmation = window.prompt(`Type ${confirmationPhrase} to restore verified attachment bytes as new R2 objects.`);
  if (confirmation !== confirmationPhrase) {
    state.ui.toast = "Attachment byte restore canceled before exact confirmation.";
    render();
    return;
  }

  try {
    const packageObjects = await readStoredAttachmentPackageObjects(packageDownload.blob, packageDownload.packageManifest);
    const preflightByDocId = new Map(preflight.objects.map((object) => [object.docId, object]));
    const commits: RestoreAttachmentObjectCommitResult["commit"][] = [];
    let failedCount = 0;
    let idempotentCount = 0;

    for (const packageObject of packageObjects) {
      const destination = preflightByDocId.get(packageObject.manifest.docId);
      if (!destination || destination.action !== "ready_for_explicit_byte_commit") {
        failedCount += 1;
        continue;
      }
      try {
        const result = await commitRestoreAttachmentObject(
          WORKER_URL,
          csrfToken,
          {
            workspaceId: state.workspace.id,
            attachmentPackageVerificationId: preflight.attachmentPackageVerificationId,
            attachmentObjectPlanId: preflight.attachmentObjectPlanId,
            attachmentObjectCommitPreflightId: preflight.attachmentObjectCommitPreflightId,
            docId: packageObject.manifest.docId,
            destinationObjectKey: destination.destinationObjectKey,
            sizeBytes: packageObject.manifest.sizeBytes,
            contentType: packageObject.manifest.contentType ?? "application/octet-stream",
            sha256: packageObject.manifest.sha256,
            packageSha256: packageDownload.sha256,
            manifestSha256: preflight.manifestSha256,
            confirmation,
          },
          packageObject.blob,
        );
        commits.push(result.commit);
        if (result.idempotent) idempotentCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    for (const commit of commits) {
      for (const project of state.workspace.projects) {
        const doc = project.docs.find((candidate) => candidate.id === commit.docId);
        if (!doc) continue;
        doc.attachmentStatus = "stored_r2";
        doc.attachmentR2ObjectKey = commit.destinationObjectKey;
        doc.attachmentCommittedAt = commit.createdAt;
      }
    }
    state.restoreAttachmentObjectCommit = {
      checkedAt: new Date().toISOString(),
      committedCount: commits.length,
      idempotentCount,
      failedCount,
      totalBytes: commits.reduce((total, commit) => total + commit.sizeBytes, 0),
      commits,
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`Attachment byte restore: ${commits.length} stored, ${failedCount} failed`, "System", failedCount ? "amber" : "teal"),
    );
    await persistWorkspace();
    state.ui.toast = failedCount
      ? `Attachment byte restore partially completed: ${commits.length} stored, ${failedCount} failed. Retry uses idempotent commit records.`
      : `Attachment byte restore completed: ${commits.length} verified objects stored.`;
  } catch (error) {
    state.ui.toast = `Attachment byte restore blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function checkRestorePlanningDryRun(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before checking planning restore.";
    render();
    return;
  }

  const preview = state.restorePreview;
  if (!preview) {
    state.ui.toast = "Preview an encrypted backup before checking planning restore.";
    render();
    return;
  }

  if (state.restorePlanningRecords.length === 0) {
    state.ui.toast = "This backup preview does not include planning rows.";
    render();
    return;
  }

  try {
    const result = await runRestorePlanningDryRun(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      snapshotWorkspaceId: preview.workspaceId,
      backupCreatedAt: preview.createdAt,
      records: state.restorePlanningRecords,
    });
    state.restorePlanningDryRun = restorePlanningDryRunStateFromResult(result);
    state.restorePlanningCommit = null;
    state.workspace.auditLog.unshift(
      createAuditEvent(
        `Planning restore preview checked: ${result.createPreview.length} creates, ${result.updatePreview.length} updates`,
        "System",
        result.rejected.length ? "amber" : "green",
      ),
    );
    await persistWorkspace(
      createOperation(
        state.workspace.id,
        "restore.dry_run",
        "planning_restore",
        preview.createdAt,
        "Planning restore preview checked",
        {
          workspaceId: preview.workspaceId,
          backupCreatedAt: preview.createdAt,
          acceptedCount: result.accepted.length,
          rejectedCount: result.rejected.length,
          createPreviewCount: result.createPreview.length,
          idempotentCount: result.idempotent.length,
          updatePreviewCount: result.updatePreview.length,
          tableSummary: result.tableSummary,
          persistence: result.persistence,
          destructiveWrite: result.destructiveWrite,
        },
      ),
    );
    state.ui.toast = result.rejected.length
      ? `Planning restore preview found ${result.rejected.length} rejected records. No rows were overwritten.`
      : "Planning restore preview checked. No rows were overwritten.";
  } catch (error) {
    state.ui.toast = `Planning restore check blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function commitRestorePlanningRows(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before applying planning restore rows.";
    render();
    return;
  }

  const preview = state.restorePreview;
  if (!preview) {
    state.ui.toast = "Preview an encrypted backup before applying planning rows.";
    render();
    return;
  }

  if (state.restorePlanningRecords.length === 0) {
    state.ui.toast = "This backup preview does not include planning rows.";
    render();
    return;
  }

  const approval = state.restoreApproval;
  if (!approval?.approvalId || approval.approvalStatus !== "approved_pending_commit") {
    state.ui.toast = "Record an approved restore approval before applying planning rows.";
    render();
    return;
  }

  const commitAttempt = state.restoreCommitAttempt;
  if (!commitAttempt?.commitAttemptId || commitAttempt.commitAttemptStatus !== "blocked_until_restore_apply") {
    state.ui.toast = "Check restore commit storage before applying planning rows.";
    render();
    return;
  }

  const applicationPreflight = state.restoreApplicationPreflight;
  if (
    !applicationPreflight?.applicationPreflightId
    || applicationPreflight.applicationPreflightStatus !== "blocked_until_restore_apply_implementation"
  ) {
    state.ui.toast = "Check restore application preflight before applying planning rows.";
    render();
    return;
  }

  const planningPreview = state.restorePlanningDryRun;
  if (!planningPreview?.planningPreviewId || planningPreview.planningPreviewStatus !== "preview_only") {
    state.ui.toast = "Check planning restore before applying planning rows.";
    render();
    return;
  }
  if (planningPreview.rejectedCount > 0) {
    state.ui.toast = "Resolve rejected planning restore records before applying planning rows.";
    render();
    return;
  }
  if (planningPreview.createPreviewCount + planningPreview.updatePreviewCount === 0) {
    state.ui.toast = "This planning preview has no create or update rows to apply.";
    render();
    return;
  }

  const confirmationPhrase = `RESTORE ${state.workspace.id}`;
  const confirmation = window.prompt(`Type ${confirmationPhrase} to apply planning rows.`);
  if (!confirmation) {
    state.ui.toast = "Planning restore commit canceled before confirmation.";
    render();
    return;
  }

  try {
    const fallbackPreRestoreBackupId = state.backupDryRun?.storagePersistence === "r2_backup_object"
      ? state.backupDryRun.restorePointId
      : undefined;
    const preRestoreBackupId = applicationPreflight.preRestoreBackupId
      ?? commitAttempt.preRestoreBackupId
      ?? approval.preRestoreBackupId
      ?? state.restoreGate?.preRestoreBackupId
      ?? fallbackPreRestoreBackupId;
    const result = await runRestorePlanningCommit(WORKER_URL, csrfToken, {
      workspaceId: state.workspace.id,
      snapshotWorkspaceId: preview.workspaceId,
      backupCreatedAt: preview.createdAt,
      ...(preRestoreBackupId ? { preRestoreBackupId } : {}),
      approvalId: approval.approvalId,
      commitAttemptId: commitAttempt.commitAttemptId,
      applicationPreflightId: applicationPreflight.applicationPreflightId,
      planningPreviewId: planningPreview.planningPreviewId,
      confirmation,
      preview: {
        incomingRecordCount: preview.incomingRecordCount,
        changedRecordCount: preview.changedRecordCount,
        newRecordCount: preview.newRecordCount,
        fieldConflictCount: preview.fieldConflictCount,
        warnings: preview.warnings,
      },
      applicationTablePlan: preview.applicationPlan.tablePlan,
      records: state.restorePlanningRecords,
    });
    state.restorePlanningCommit = restorePlanningCommitStateFromResult(result);
    state.workspace.auditLog.unshift(
      createAuditEvent(`Planning rows applied: ${formatRestorePlanningCommitSummary(result.result)}`, "System", "amber"),
    );
    await persistWorkspace();
    state.ui.toast = `Planning rows applied: ${formatRestorePlanningCommitSummary(result.result)}.`;
  } catch (error) {
    state.ui.toast = `Planning restore commit blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

function restoreAttachmentPackagePreflightStateFromResult(
  result: RestoreAttachmentPackageDryRunResult,
): RestoreAttachmentPackagePreflightState {
  return {
    checkedAt: new Date().toISOString(),
    restoreMode: result.restoreMode,
    commitPolicy: result.commitPolicy,
    destructiveWrite: result.destructiveWrite,
    canRestoreBytes: result.canRestoreBytes,
    authorizationPolicy: result.authorizationPolicy,
    attachmentPackagePreflightId: result.attachmentPackagePreflightId,
    attachmentPackagePreflightStatus: result.attachmentPackagePreflightStatus,
    attachmentPackagePreflightPersistence: result.attachmentPackagePreflightPersistence,
    metadataRecordCount: result.attachmentPackagePlan.metadataRecordCount,
    totalSourceBytes: result.attachmentPackagePlan.totalSourceBytes,
    blockers: result.blockers,
    auditPersistence: result.auditPersistence ?? null,
  };
}

function restoreAttachmentPackageVerificationStateFromResult(
  result: RestoreAttachmentPackageVerificationDryRunResult,
): RestoreAttachmentPackageVerificationState {
  return {
    checkedAt: new Date().toISOString(),
    restoreMode: result.restoreMode,
    commitPolicy: result.commitPolicy,
    destructiveWrite: result.destructiveWrite,
    canRestoreBytes: result.canRestoreBytes,
    authorizationPolicy: result.authorizationPolicy,
    attachmentPackagePreflightId: result.attachmentPackagePreflightId,
    attachmentPackagePreflightPersistence: result.attachmentPackagePreflightPersistence,
    attachmentPackageVerificationId: result.attachmentPackageVerificationId,
    attachmentPackageVerificationStatus: result.attachmentPackageVerificationStatus,
    attachmentPackageVerificationPersistence: result.attachmentPackageVerificationPersistence,
    packageSha256: result.packageSha256,
    manifestSha256: result.manifestSha256,
    packageManifest: result.packageManifest,
    blockers: result.blockers,
    auditPersistence: result.auditPersistence ?? null,
  };
}

function restoreAttachmentObjectPlanStateFromResult(
  result: RestoreAttachmentObjectPlanDryRunResult,
): RestoreAttachmentObjectPlanState {
  return {
    checkedAt: new Date().toISOString(),
    restoreMode: result.restoreMode,
    commitPolicy: result.commitPolicy,
    destructiveWrite: result.destructiveWrite,
    canRestoreBytes: result.canRestoreBytes,
    authorizationPolicy: result.authorizationPolicy,
    attachmentPackageVerificationId: result.attachmentPackageVerificationId,
    attachmentPackageVerificationPersistence: result.attachmentPackageVerificationPersistence,
    attachmentObjectPlanId: result.attachmentObjectPlanId,
    attachmentObjectPlanStatus: result.attachmentObjectPlanStatus,
    attachmentObjectPlanPersistence: result.attachmentObjectPlanPersistence,
    objectCount: result.result.objectCount,
    totalSourceBytes: result.result.totalSourceBytes,
    blockedDestinationCount: result.result.blockedDestinationCount,
    destinationPolicy: result.result.destinationPolicy,
    overwritePolicy: result.result.overwritePolicy,
    byteSourcePolicy: result.result.byteSourcePolicy,
    sourceVerificationStatus: result.result.sourceVerificationStatus,
    objects: result.result.objects,
    blockers: result.blockers,
    auditPersistence: result.auditPersistence ?? null,
  };
}

function restoreAttachmentObjectCommitPreflightStateFromResult(
  result: RestoreAttachmentObjectCommitPreflightResult,
): RestoreAttachmentObjectCommitPreflightState {
  return {
    checkedAt: new Date().toISOString(),
    restoreMode: result.restoreMode,
    commitPolicy: result.commitPolicy,
    destructiveWrite: result.destructiveWrite,
    canRestoreBytes: result.canRestoreBytes,
    readyForByteCommit: result.readyForByteCommit,
    authorizationPolicy: result.authorizationPolicy,
    attachmentPackageVerificationId: result.attachmentPackageVerificationId,
    attachmentPackageVerificationPersistence: result.attachmentPackageVerificationPersistence,
    attachmentObjectPlanId: result.attachmentObjectPlanId,
    attachmentObjectPlanStatus: result.attachmentObjectPlanStatus,
    attachmentObjectPlanPersistence: result.attachmentObjectPlanPersistence,
    attachmentObjectCommitPreflightId: result.attachmentObjectCommitPreflightId,
    attachmentObjectCommitPreflightStatus: result.attachmentObjectCommitPreflightStatus,
    attachmentObjectCommitPreflightPersistence: result.attachmentObjectCommitPreflightPersistence,
    packageSha256: result.packageSha256,
    manifestSha256: result.manifestSha256,
    objectCount: result.result.objectCount,
    totalSourceBytes: result.result.totalSourceBytes,
    readyDestinationCount: result.result.readyDestinationCount,
    blockedDestinationCount: result.result.blockedDestinationCount,
    destinationPolicy: result.result.destinationPolicy,
    overwritePolicy: result.result.overwritePolicy,
    byteSourcePolicy: result.result.byteSourcePolicy,
    sourceVerificationStatus: result.result.sourceVerificationStatus,
    objects: result.result.objects,
    blockers: result.blockers,
    auditPersistence: result.auditPersistence ?? null,
  };
}

function restorePlanningDryRunStateFromResult(result: RestorePlanningDryRunResult): RestorePlanningDryRunState {
  return {
    checkedAt: new Date().toISOString(),
    ok: result.ok,
    persistence: result.persistence,
    auditPersistence: result.auditPersistence ?? null,
    restoreMode: result.restoreMode,
    commitPolicy: result.commitPolicy,
    destructiveWrite: result.destructiveWrite,
    authorizationPolicy: result.authorizationPolicy,
    planningPreviewId: result.planningPreviewId,
    planningPreviewStatus: result.planningPreviewStatus,
    planningPreviewPersistence: result.planningPreviewPersistence,
    acceptedCount: result.accepted.length,
    rejectedCount: result.rejected.length,
    createPreviewCount: result.createPreview.length,
    idempotentCount: result.idempotent.length,
    updatePreviewCount: result.updatePreview.length,
    accepted: result.accepted,
    createPreview: result.createPreview,
    idempotent: result.idempotent,
    updatePreview: result.updatePreview,
    tableSummary: result.tableSummary,
    updatePreviewDetails: result.updatePreviewDetails,
    rejected: result.rejected,
  };
}

function restorePlanningCommitStateFromResult(result: RestorePlanningCommitResult): RestorePlanningCommitState {
  return {
    checkedAt: new Date().toISOString(),
    planningPreviewId: result.planningPreviewId,
    planningCommitId: result.planningCommitId,
    planningCommitStatus: result.planningCommitStatus,
    planningCommitPersistence: result.planningCommitPersistence,
    restoreMode: result.restoreMode,
    commitStatus: result.commitStatus,
    destructiveWrite: result.destructiveWrite,
    result: result.result,
    unsupportedRestoreDomains: result.unsupportedRestoreDomains,
    auditPersistence: result.auditPersistence ?? null,
  };
}

function restoreGateStateFromResult(result: RestoreCommitDryRunResult): RestoreGateState {
  return {
    checkedAt: new Date().toISOString(),
    commitStatus: result.commitStatus,
    restoreMode: result.restoreMode,
    destructiveWrite: result.destructiveWrite,
    preRestoreBackupRequired: result.preRestoreBackupRequired,
    preRestoreBackupId: result.preRestoreBackupId,
    preRestoreBackupVerified: result.preRestoreBackupVerified,
    preRestoreBackupPersistence: result.preRestoreBackupPersistence,
    preRestoreBackupBlocker: result.preRestoreBackupBlocker,
    authorizationPolicy: result.authorizationPolicy,
    auditPersistence: result.auditPersistence ?? null,
  };
}

function restoreApprovalStateFromResult(result: RestoreApprovalDryRunResult): RestoreApprovalState {
  return {
    checkedAt: new Date().toISOString(),
    approvalId: result.approvalId,
    approvalStatus: result.approvalStatus,
    approvalPersistence: result.approvalPersistence,
    approvalBlockers: result.approvalBlockers,
    commitStatus: result.commitStatus,
    destructiveWrite: result.destructiveWrite,
    preRestoreBackupId: result.preRestoreBackupId,
    preRestoreBackupVerified: result.preRestoreBackupVerified,
    preRestoreBackupPersistence: result.preRestoreBackupPersistence,
    preRestoreBackupBlocker: result.preRestoreBackupBlocker,
    auditPersistence: result.auditPersistence ?? null,
  };
}

function restoreCommitAttemptStateFromResult(result: RestoreCommitStorageDryRunResult): RestoreCommitAttemptState {
  return {
    checkedAt: new Date().toISOString(),
    approvalId: result.approvalId,
    approvalStatus: result.approvalStatus,
    approvalPersistence: result.approvalPersistence,
    commitAttemptId: result.commitAttemptId,
    commitAttemptStatus: result.commitAttemptStatus,
    commitAttemptPersistence: result.commitAttemptPersistence,
    commitStatus: result.commitStatus,
    restoreMode: result.restoreMode,
    destructiveWrite: result.destructiveWrite,
    preRestoreBackupId: result.preRestoreBackupId,
    preRestoreBackupVerified: result.preRestoreBackupVerified,
    preRestoreBackupPersistence: result.preRestoreBackupPersistence,
    preRestoreBackupBlocker: result.preRestoreBackupBlocker,
    auditPersistence: result.auditPersistence ?? null,
  };
}

function restoreApplicationPreflightStateFromResult(result: RestoreApplicationDryRunResult): RestoreApplicationPreflightState {
  return {
    checkedAt: new Date().toISOString(),
    approvalId: result.approvalId,
    approvalStatus: result.approvalStatus,
    approvalPersistence: result.approvalPersistence,
    commitAttemptId: result.commitAttemptId,
    commitAttemptStatus: result.commitAttemptStatus,
    commitAttemptPersistence: result.commitAttemptPersistence,
    applicationPreflightId: result.applicationPreflightId,
    applicationPreflightStatus: result.applicationPreflightStatus,
    applicationPreflightPersistence: result.applicationPreflightPersistence,
    commitStatus: result.commitStatus,
    restoreMode: result.restoreMode,
    destructiveWrite: result.destructiveWrite,
    preRestoreBackupId: result.preRestoreBackupId,
    preRestoreBackupVerified: result.preRestoreBackupVerified,
    preRestoreBackupPersistence: result.preRestoreBackupPersistence,
    preRestoreBackupBlocker: result.preRestoreBackupBlocker,
    rollbackGuidance: {
      blockers: result.rollbackGuidance.blockers,
      requiredBeforeApply: result.rollbackGuidance.requiredBeforeApply,
      previewCounts: result.rollbackGuidance.previewCounts,
      applicationTablePlan: result.rollbackGuidance.applicationTablePlan,
    },
    auditPersistence: result.auditPersistence ?? null,
  };
}

function restoreApplicationCommitStateFromResult(result: RestoreApplicationCommitResult): RestoreApplicationCommitState {
  return {
    checkedAt: new Date().toISOString(),
    applicationCommitId: result.applicationCommitId,
    applicationCommitStatus: result.applicationCommitStatus,
    applicationCommitPersistence: result.applicationCommitPersistence,
    restoreMode: result.restoreMode,
    commitStatus: result.commitStatus,
    destructiveWrite: result.destructiveWrite,
    recordSummary: result.recordSummary,
    result: result.result,
    unsupportedRestoreDomains: result.unsupportedRestoreDomains,
    auditPersistence: result.auditPersistence ?? null,
  };
}

function createRestoreSnapshotRecords(snapshot: BackupSnapshot, preview: RestorePreviewSummary): RestoreCoreRecordRequest[] {
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

function renderRestoreSnapshotReviewTable(snapshot: BackupSnapshot, preview: RestorePreviewSummary): string {
  const records = createRestoreSnapshotRecords(snapshot, preview);
  if (records.length === 0) return "";
  const writeCount = records.filter((record) => record.action !== "skip").length;

  return `
    <div class="restore-record-review" aria-label="Workspace snapshot restore rows" tabindex="0">
      <div class="restore-record-review-row restore-record-review-head">
        <span>Action</span>
        <span>Type</span>
        <span>Title</span>
        <span>Project</span>
        <span>Detail</span>
      </div>
      ${records.map((record) => `
        <div class="restore-record-review-row">
          <span>${escapeHtml(record.action)}</span>
          <span>${escapeHtml(record.entityType.replaceAll("_", " "))}</span>
          <span>${escapeHtml(restoreSnapshotRecordLabel(record))}</span>
          <span>${escapeHtml(record.projectId ?? "workspace")}</span>
          <span>${escapeHtml(restoreSnapshotRecordDetail(record))}</span>
        </div>
      `).join("")}
    </div>
    <small>Snapshot row review: ${writeCount} writes - ${records.length - writeCount} skips - ${records.length} total</small>
  `;
}

function restoreSnapshotRecordLabel(record: RestoreCoreRecordRequest): string {
  return record.title ?? record.name ?? record.category ?? record.entityId;
}

function restoreSnapshotRecordDetail(record: RestoreCoreRecordRequest): string {
  if (record.entityType === "workspace") {
    return [record.backupPolicy, record.nextBackup].filter(Boolean).join(" - ") || "metadata";
  }
  if (record.entityType === "project") {
    return record.phase ?? "project";
  }
  if (record.entityType === "task") {
    return [record.status, record.dueAt].filter(Boolean).join(" - ") || "task";
  }
  if (record.entityType === "document") {
    return record.documentType ?? "document";
  }
  if (record.entityType === "person") {
    return record.role ?? "person";
  }
  if (record.entityType === "equipment") {
    return [record.status, record.statusTone].filter(Boolean).join(" - ") || "equipment";
  }
  if (record.entityType === "expense") {
    return `${record.spent ?? 0} spent / ${record.budget ?? 0} budget`;
  }
  return record.entityId;
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

function formatRestoreRecordSummary(summary: Record<string, number>): string {
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

async function previewEncryptedBackup(): Promise<void> {
  const file = await chooseBackupFile();
  if (!file) {
    state.ui.toast = "Restore preview canceled before file selection.";
    render();
    return;
  }

  const passphrase = window.prompt("Enter the backup passphrase to preview this file.");
  if (!passphrase) {
    state.ui.toast = "Restore preview canceled before decryption.";
    render();
    return;
  }

  try {
    const snapshot = await decryptSelectedBackupFile(file, passphrase);
    state.restoreSnapshot = snapshot;
    state.restorePreview = summarizeRestorePreview(state.workspace, snapshot);
    state.restorePlanningRecords = snapshot.planningExport?.records ?? [];
    state.restoreGate = null;
    state.restoreApproval = null;
    state.restoreCommitAttempt = null;
    state.restoreApplicationPreflight = null;
    state.restoreApplicationCommit = null;
    state.restoreAttachmentPackagePreflight = null;
    state.restoreAttachmentPackageVerification = null;
    state.restoreAttachmentObjectPlan = null;
    state.restoreAttachmentObjectCommitPreflight = null;
    state.restorePlanningDryRun = null;
    state.restorePlanningCommit = null;
    state.workspace.auditLog.unshift(createAuditEvent("Encrypted backup restore previewed", "System", "amber"));
    await persistWorkspace(
      createOperation(
        state.workspace.id,
        "restore.dry_run",
        "backup",
        snapshot.createdAt,
        "Encrypted backup restore previewed",
        {
          workspaceId: snapshot.workspaceId,
          incomingProjectCount: state.restorePreview.incomingProjectCount,
          matchingProjectCount: state.restorePreview.matchingProjectCount,
          newProjectCount: state.restorePreview.newProjectCount,
          incomingRecordCount: state.restorePreview.incomingRecordCount,
          changedRecordCount: state.restorePreview.changedRecordCount,
          newRecordCount: state.restorePreview.newRecordCount,
          fieldConflictCount: state.restorePreview.fieldConflictCount,
          warnings: state.restorePreview.warnings,
        },
      ),
    );
    state.ui.toast = "Encrypted backup decrypted for preview only. No records were overwritten.";
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Could not decrypt backup preview.";
  }
  render();
}

async function decryptSelectedBackupFile(file: File, passphrase: string) {
  if (isZipBackupFile(file)) {
    return decryptEncryptedBackupZipBundle(await file.arrayBuffer(), passphrase);
  }

  const bundle = JSON.parse(await file.text()) as EncryptedBackupBundle;
  return decryptEncryptedBackupBundle(bundle, passphrase);
}

function isZipBackupFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".filmbackup.zip") || name.endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed";
}

function chooseBackupFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".filmbackup.zip,.filmbackup.json,application/zip,application/json";
    input.addEventListener(
      "change",
      () => {
        resolve(input.files?.[0] ?? null);
      },
      { once: true },
    );
    input.click();
  });
}

async function importNotionFolder(): Promise<void> {
  const files = await chooseImportFiles();
  if (files.length === 0) {
    state.ui.toast = "Notion folder import canceled before file selection.";
    render();
    return;
  }

  await importNotionSource({
    sourceLabel: "folder",
    manifest: createNotionManifest(files),
    readFiles: (allowedPaths) => readNotionImportFiles(files, allowedPaths),
  });
}

async function importNotionZip(): Promise<void> {
  const file = await chooseImportZipFile();
  if (!file) {
    state.ui.toast = "Notion ZIP import canceled before file selection.";
    render();
    return;
  }

  try {
    const zip = await openNotionZip(file);
    await importNotionSource({
      sourceLabel: "ZIP",
      manifest: createNotionZipManifest(zip),
      readFiles: (allowedPaths) => readNotionZipImportFiles(zip, allowedPaths),
    });
  } catch (error) {
    state.ui.toast = `Notion import blocked: ${error instanceof Error ? error.message : "ZIP unavailable"}`;
    render();
  }
}

async function importScreenplayFiles(): Promise<void> {
  const files = await chooseScreenplayFiles();
  if (files.length === 0) {
    state.ui.toast = "Screenplay import canceled before file selection.";
    render();
    return;
  }

  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!project) {
    state.ui.toast = "Select a project before importing screenplay files.";
    render();
    return;
  }

  const preview = previewScreenplayFiles(files.map((file) => ({
    path: file.webkitRelativePath || file.name,
    sizeBytes: file.size,
    contentType: file.type || undefined,
  })));
  const filesByPath = new Map(files.map((file) => [file.webkitRelativePath || file.name, file]));
  const reviewBase = files.length === 1
    ? selectedScreenplayBreakdown(screenplayBreakdownsForProject(project.id))
    : null;
  const warnings = [...preview.warnings];
  let docsCreated = 0;
  let breakdownsCreated = 0;
  let scenesParsed = 0;
  let elementsSuggested = 0;
  let selectedBreakdown: ScreenplayBreakdown | null = null;
  let parserPromise: Promise<typeof import("@film/importers/screenplay-parser")> | null = null;
  for (const candidate of preview.candidates) {
    let breakdown: ScreenplayBreakdown | null = null;
    if (candidate.kind === "grainery") {
      warnings.push(`${candidate.path} remains metadata-only because the Grainery file contract is not yet supported.`);
    } else {
      const file = filesByPath.get(candidate.path);
      if (!file) {
        warnings.push(`${candidate.path} could not be matched to the selected local file.`);
        continue;
      }
      try {
        parserPromise ??= import("@film/importers/screenplay-parser");
        const { parseScreenplayFile } = await parserPromise;
        const parsed = parseScreenplayFile({
          projectId: project.id,
          path: candidate.path,
          kind: candidate.kind,
          text: await file.text(),
          sourceSizeBytes: candidate.sizeBytes,
        });
        breakdown = upsertScreenplayBreakdown(parsed, reviewBase);
        selectedBreakdown = breakdown;
        breakdownsCreated += 1;
        scenesParsed += breakdown.scenes.length;
        elementsSuggested += breakdown.elements.filter((element) => element.reviewState === "suggested").length;
      } catch (error) {
        warnings.push(`${candidate.path}: ${error instanceof Error ? error.message : "local parse failed"}`);
        continue;
      }
    }

    const doc = findOrCreateScreenplayDocument(project, candidate, breakdown?.id ?? null);
    if (doc.created) {
      docsCreated += 1;
      await persistWorkspace(
        createOperation(state.workspace.id, "document.created", "document", doc.value.id, `Screenplay imported: ${doc.value.name}`, {
          projectId: project.id,
          name: doc.value.name,
          type: doc.value.type,
          sourcePath: doc.value.sourcePath,
          screenplayKind: candidate.kind,
          screenplayBreakdownId: breakdown?.id ?? null,
        }),
      );
    }
  }

  state.screenplayImport = {
    ...preview,
    warnings,
    importedAt: new Date().toISOString(),
    docsCreated,
    breakdownsCreated,
    scenesParsed,
    elementsSuggested,
  };
  if (selectedBreakdown) {
    state.ui.selectedScreenplayId = selectedBreakdown.id;
    state.ui.selectedScreenplayBaseId = reviewBase && reviewBase.id !== selectedBreakdown.id ? reviewBase.id : null;
    state.ui.selectedScreenplaySceneId = selectedBreakdown.scenes[0]?.id ?? null;
    state.ui.screenplaySearch = "";
    state.ui.workspaceSection = "breakdown";
    persistUi();
  }
  state.workspace.auditLog.unshift(createAuditEvent(
    `Screenplay import: ${breakdownsCreated} breakdowns, ${scenesParsed} scenes`,
    "System",
    breakdownsCreated > 0 ? "teal" : "amber",
  ));
  await persistWorkspace();
  state.ui.toast = breakdownsCreated > 0
    ? `Parsed ${breakdownsCreated} local screenplay revision${breakdownsCreated === 1 ? "" : "s"} with ${scenesParsed} scenes.`
    : docsCreated > 0
      ? `Imported ${docsCreated} screenplay metadata record${docsCreated === 1 ? "" : "s"}.`
      : "No supported screenplay files were imported.";
  render();
}

function upsertScreenplayBreakdown(
  parsed: ScreenplayBreakdown,
  reviewBase: ScreenplayBreakdown | null = null,
): ScreenplayBreakdown {
  const existingIndex = state.workspace.screenplayBreakdowns.findIndex((candidate) => candidate.id === parsed.id);
  const existing = existingIndex >= 0 ? state.workspace.screenplayBreakdowns[existingIndex] ?? null : null;
  const next = existing
    ? preserveScreenplayReviewState(parsed, existing)
    : reviewBase && reviewBase.projectId === parsed.projectId && reviewBase.id !== parsed.id
      ? carryForwardScreenplayReviewState(reviewBase, parsed)
      : parsed;
  if (existingIndex >= 0) {
    state.workspace.screenplayBreakdowns.splice(existingIndex, 1, next);
  } else {
    state.workspace.screenplayBreakdowns.unshift(next);
  }
  return next;
}

function preserveScreenplayReviewState(parsed: ScreenplayBreakdown, existing: ScreenplayBreakdown): ScreenplayBreakdown {
  const previousOccurrences = new Map(existing.occurrences.map((occurrence) => [occurrence.id, occurrence.reviewState]));
  const occurrences = parsed.occurrences.map((occurrence) => ({
    ...occurrence,
    reviewState: previousOccurrences.get(occurrence.id) ?? occurrence.reviewState,
  }));
  return refreshScreenplayElementReviewStates({ ...parsed, occurrences });
}

function refreshScreenplayElementReviewStates(breakdown: ScreenplayBreakdown): ScreenplayBreakdown {
  return {
    ...breakdown,
    elements: breakdown.elements.map((element) => {
      const occurrenceStates = breakdown.occurrences
        .filter((occurrence) => occurrence.elementId === element.id)
        .map((occurrence) => occurrence.reviewState);
      return {
        ...element,
        reviewState: occurrenceStates.length ? aggregateScreenplayReviewState(occurrenceStates) : element.reviewState,
      };
    }),
  };
}

function findOrCreateScreenplayDocument(
  project: FilmProject,
  candidate: ScreenplayImportPreview["candidates"][number],
  breakdownId: string | null,
): { value: ProjectDoc; created: boolean } {
  const existing = project.docs.find((doc) => breakdownId
    ? doc.screenplayBreakdownId === breakdownId
    : doc.sourcePath === candidate.path && !doc.screenplayBreakdownId);
  if (existing) return { value: existing, created: false };

  const doc = createProjectDoc(candidate.title, "ASSET", {
    date: "Imported",
    sourcePath: candidate.path,
    sourceSizeBytes: candidate.sizeBytes,
    sourceContentType: candidate.contentType,
    screenplayBreakdownId: breakdownId ?? undefined,
    attachmentStatus: "metadata_only",
  });
  project.docs.unshift(doc);
  return { value: doc, created: true };
}

function applyScreenplaySearch(input: string): void {
  const query = input.trim().replace(/\s+/g, " ").slice(0, 120);
  const breakdown = selectedScreenplayBreakdown();
  state.ui.screenplaySearch = query;
  if (!breakdown || !query) {
    state.ui.toast = query ? "Screenplay search blocked: no revision selected." : "Enter a screenplay search term.";
    render();
    return;
  }
  const results = searchScreenplayScenes(breakdown, query);
  if (results[0]) state.ui.selectedScreenplaySceneId = results[0].sceneId;
  state.ui.toast = `${results.length} local screenplay match${results.length === 1 ? "" : "es"} for ${query}.`;
  persistUi();
  render();
}

function clearScreenplaySearch(): void {
  state.ui.screenplaySearch = "";
  state.ui.toast = "Screenplay search cleared.";
  render();
}

async function addManualScreenplayElement(formData: FormData): Promise<void> {
  const breakdown = selectedScreenplayBreakdown();
  const sceneId = String(formData.get("sceneId") ?? "");
  const category = String(formData.get("category") ?? "");
  const name = String(formData.get("name") ?? "");
  if (!breakdown || !SCREENPLAY_ELEMENT_CATEGORIES.includes(category as ScreenplayElementCategory)) {
    state.ui.toast = "Manual element blocked: select a scene and supported category.";
    render();
    return;
  }
  try {
    const next = addManualScreenplayElementOccurrence(
      breakdown,
      sceneId,
      category as ScreenplayElementCategory,
      name,
    );
    const index = state.workspace.screenplayBreakdowns.findIndex((candidate) => candidate.id === breakdown.id);
    if (index < 0) return;
    state.workspace.screenplayBreakdowns.splice(index, 1, next);
    state.ui.screenplayElementFilter = category;
    state.ui.toast = `${name.trim().replace(/\s+/g, " ")}: added to the selected scene as ${SCREENPLAY_ELEMENT_LABELS[category as ScreenplayElementCategory]}.`;
    await persistWorkspace();
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Manual screenplay element could not be added.";
  }
  render();
}

async function applyScreenplayElementToSelectedScene(elementId: string): Promise<void> {
  const breakdown = selectedScreenplayBreakdown();
  const scene = breakdown?.scenes.find((candidate) => candidate.id === state.ui.selectedScreenplaySceneId)
    ?? breakdown?.scenes[0];
  const element = breakdown?.elements.find((candidate) => candidate.id === elementId);
  if (!breakdown || !scene || !element || element.reviewState === "dismissed") {
    state.ui.toast = "Element reuse blocked: select an active element and screenplay scene.";
    render();
    return;
  }
  try {
    const next = addExistingScreenplayElementOccurrence(
      breakdown,
      scene.id,
      element.id,
      { sourceLine: scene.sourceStartLine },
    );
    const index = state.workspace.screenplayBreakdowns.findIndex((candidate) => candidate.id === breakdown.id);
    if (index < 0) return;
    state.workspace.screenplayBreakdowns.splice(index, 1, next);
    state.ui.screenplayElementFilter = element.category;
    state.ui.toast = `${element.name}: added to scene ${scene.sceneNumber ?? scene.ordinal}.`;
    await persistWorkspace();
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Screenplay element could not be reused.";
  }
  render();
}

function copyVisibleScreenplayElements(): void {
  const breakdown = selectedScreenplayBreakdown();
  const scene = breakdown ? selectedScreenplayScene(breakdown) : null;
  if (!breakdown || !scene) {
    state.ui.toast = "Element copy blocked: select a screenplay scene.";
    render();
    return;
  }
  const elementIds = [...new Set(screenplayElementRowsForScene(breakdown, scene.id)
    .filter((row) => (
      row.reviewState !== "dismissed"
      && row.element.reviewState !== "dismissed"
      && (state.ui.screenplayElementFilter === "all" || row.element.category === state.ui.screenplayElementFilter)
    ))
    .map((row) => row.element.id))].slice(0, 100);
  if (!elementIds.length) {
    state.ui.toast = "Element copy blocked: no active elements are visible in this scene.";
    render();
    return;
  }
  const sourceSceneLabel = `Scene ${scene.sceneNumber ?? scene.ordinal}`;
  state.screenplayElementClipboard = {
    breakdownId: breakdown.id,
    sourceSceneId: scene.id,
    sourceSceneLabel,
    elementIds,
  };
  state.ui.toast = `Copied ${elementIds.length} active element${elementIds.length === 1 ? "" : "s"} from ${sourceSceneLabel}.`;
  render();
}

async function pasteCopiedScreenplayElements(): Promise<void> {
  const breakdown = selectedScreenplayBreakdown();
  const scene = breakdown ? selectedScreenplayScene(breakdown) : null;
  const clipboard = state.screenplayElementClipboard;
  if (!breakdown || !scene || !clipboard || clipboard.breakdownId !== breakdown.id || clipboard.sourceSceneId === scene.id) {
    state.ui.toast = "Element paste blocked: copy active elements and select another scene in the same revision.";
    render();
    return;
  }
  try {
    const result = applyScreenplayElementsToScene(breakdown, scene.id, clipboard.elementIds);
    const index = state.workspace.screenplayBreakdowns.findIndex((candidate) => candidate.id === breakdown.id);
    if (index < 0) return;
    state.workspace.screenplayBreakdowns.splice(index, 1, result.breakdown);
    state.ui.toast = `Pasted ${result.summary.requestedCount} element${result.summary.requestedCount === 1 ? "" : "s"} into scene ${scene.sceneNumber ?? scene.ordinal}: ${result.summary.addedCount} added, ${result.summary.reactivatedCount} reactivated, ${result.summary.alreadyPresentCount} already present.`;
    await persistWorkspace();
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Copied screenplay elements could not be pasted.";
  }
  render();
}

async function mergeScreenplayElementDuplicate(targetElementId: string, sourceElementId: string): Promise<void> {
  const breakdown = selectedScreenplayBreakdown();
  if (!breakdown) {
    state.ui.toast = "Element merge blocked: select a screenplay revision.";
    render();
    return;
  }
  try {
    const result = mergeScreenplayElementsInWorkspace(
      state.workspace,
      breakdown.id,
      targetElementId,
      sourceElementId,
    );
    state.workspace = result.workspace;
    const summary = result.summary;
    const occurrencePositions = summary.occurrencesReassigned + summary.occurrenceDuplicatesRemoved;
    const livePlanningLinks = summary.availabilityWindowsRelinked
      + summary.locationsRelinked
      + summary.talentRelinked;
    state.ui.toast = `Merged ${summary.sourceName} into ${summary.targetName}: ${occurrencePositions} occurrence position${occurrencePositions === 1 ? "" : "s"}, ${livePlanningLinks} live planning link${livePlanningLinks === 1 ? "" : "s"}. Issued documents unchanged.`;
    await persistWorkspace();
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Screenplay elements could not be merged.";
  }
  render();
}

async function moveScreenplayElementCategory(formData: FormData): Promise<void> {
  const breakdown = selectedScreenplayBreakdown();
  const elementId = String(formData.get("elementId") ?? "");
  const nextCategory = String(formData.get("category") ?? "");
  if (!breakdown || !SCREENPLAY_ELEMENT_CATEGORIES.includes(nextCategory as ScreenplayElementCategory)) {
    state.ui.toast = "Category move blocked: choose an element and destination category.";
    render();
    return;
  }
  try {
    const result = moveScreenplayElementCategoryInWorkspace(
      state.workspace,
      breakdown.id,
      elementId,
      nextCategory as ScreenplayElementCategory,
    );
    state.workspace = result.workspace;
    state.ui.screenplayElementFilter = result.summary.nextCategory;
    const destinationLabel = SCREENPLAY_ELEMENT_LABELS[result.summary.nextCategory];
    state.ui.toast = result.summary.mergedWithExistingElement
      ? `${result.summary.elementName}: moved to ${destinationLabel} and combined with the existing element.`
      : `${result.summary.elementName}: moved from ${SCREENPLAY_ELEMENT_LABELS[result.summary.previousCategory]} to ${destinationLabel}.`;
    await persistWorkspace();
  } catch (error) {
    state.ui.toast = error instanceof Error ? error.message : "Screenplay element category could not be moved.";
  }
  render();
}

async function updateScreenplayElementReview(
  sceneId: string,
  elementId: string,
  requestedState: Exclude<ScreenplayReviewState, "suggested">,
): Promise<void> {
  const breakdown = selectedScreenplayBreakdown();
  if (!breakdown) return;
  const row = screenplayElementRowsForScene(breakdown, sceneId).find((candidate) => candidate.element.id === elementId);
  if (!row) return;
  const nextState: ScreenplayReviewState = row.reviewState === requestedState ? "suggested" : requestedState;
  const occurrenceIds = new Set(row.occurrences.map((occurrence) => occurrence.id));
  const reviewed = refreshScreenplayElementReviewStates({
    ...breakdown,
    occurrences: breakdown.occurrences.map((occurrence) =>
      occurrenceIds.has(occurrence.id) ? { ...occurrence, reviewState: nextState } : occurrence
    ),
    updatedAt: new Date().toISOString(),
  });
  const index = state.workspace.screenplayBreakdowns.findIndex((candidate) => candidate.id === breakdown.id);
  if (index < 0) return;
  state.workspace.screenplayBreakdowns.splice(index, 1, reviewed);
  state.ui.toast = `${row.element.name}: ${nextState}.`;
  await persistWorkspace();
  render();
}

async function exportSelectedScreenplayBreakdown(): Promise<void> {
  const breakdown = selectedScreenplayBreakdown();
  if (!breakdown) {
    state.ui.toast = "Breakdown export blocked: no screenplay revision selected.";
    render();
    return;
  }
  const exportedAt = new Date().toISOString();
  const payload = JSON.stringify({
    exportVersion: 1,
    exportedAt,
    workspaceId: state.workspace.id,
    sourcePolicy: "user_requested_plaintext_export",
    breakdown,
  }, null, 2);
  const filename = `film-breakdown-${slugForLocalRecord(breakdown.revision.title)}-${exportedAt.slice(0, 10)}.json`;
  downloadBlob(new Blob([payload], { type: "application/json;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Screenplay breakdown exported: ${breakdown.revision.title}`, "System", "blue"));
  state.ui.toast = `Breakdown exported for ${breakdown.revision.title}.`;
  await persistWorkspace();
  render();
}

async function exportSelectedScreenplayElementReport(format: "markdown" | "csv"): Promise<void> {
  const breakdown = selectedScreenplayBreakdown();
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!breakdown || !project) {
    state.ui.toast = "Element list export blocked: select a screenplay revision.";
    render();
    return;
  }
  const category = state.ui.screenplayElementFilter === "all" ? null : state.ui.screenplayElementFilter;
  const report = buildScreenplayElementReport(breakdown, category);
  const exportedAt = new Date().toISOString();
  const categorySlug = category ?? "all";
  const filename = `film-element-list-${slugForLocalRecord(project.title)}-${categorySlug}-${exportedAt.slice(0, 10)}.${format === "csv" ? "csv" : "md"}`;
  const content = format === "csv"
    ? createScreenplayElementReportCsv(report)
    : createScreenplayElementReportMarkdown(project, breakdown, report, exportedAt);
  const contentType = format === "csv" ? "text/csv;charset=utf-8" : "text/markdown;charset=utf-8";
  downloadBlob(new Blob([content], { type: contentType }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Screenplay element list exported: ${project.title}`, "System", "blue"));
  state.ui.toast = `Element list exported for ${project.title}.`;
  await persistWorkspace();
  render();
}

function createScreenplayElementReportMarkdown(
  project: FilmProject,
  breakdown: ScreenplayBreakdown,
  report: ReturnType<typeof buildScreenplayElementReport>,
  exportedAt: string,
): string {
  const categoryLabel = report.category ? SCREENPLAY_ELEMENT_LABELS[report.category] : "All categories";
  const lines = [
    `# Element List: ${markdownTableCell(project.title)}`,
    "",
    `Exported: ${markdownTableCell(exportedAt)}`,
    `Revision: ${markdownTableCell(breakdown.revision.title)}`,
    `Filter: ${markdownTableCell(categoryLabel)}`,
    "Policy: metadata-only local export; screenplay source text, contacts, provider credentials, OAuth values, raw attachments, raw import paths, and private Worker state are excluded.",
    "",
    "## Summary",
    `- Elements: ${report.rows.length}`,
    `- Active occurrences: ${report.occurrenceCount}`,
    `- Scene uses: ${report.sceneUseCount}`,
    "",
    "## Elements",
    "| Category | Element | State | Source | Occurrences | Confirmed | Scenes | First Scene | Positions |",
    "| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |",
    ...report.rows.map((row) => {
      const scenes = row.scenes.map((scene) => scene.sceneNumber ?? String(scene.ordinal)).join(", ") || "-";
      const firstScene = row.firstScene
        ? `${row.firstScene.sceneNumber ?? row.firstScene.ordinal} - ${row.firstScene.heading}`
        : "-";
      const positions = row.occurrences.map(formatScreenplayElementOccurrencePosition).join("; ") || "-";
      return `| ${markdownTableCell(SCREENPLAY_ELEMENT_LABELS[row.category])} | ${markdownTableCell(row.name)} | ${markdownTableCell(row.reviewState)} | ${markdownTableCell(row.source.replaceAll("_", " "))} | ${row.occurrenceCount} | ${row.confirmedOccurrenceCount} | ${markdownTableCell(scenes)} | ${markdownTableCell(firstScene)} | ${markdownTableCell(positions)} |`;
    }),
    ...(report.rows.length ? [] : ["| - | No active elements | - | - | 0 | 0 | - | - | - |"]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function createScreenplayElementReportCsv(report: ReturnType<typeof buildScreenplayElementReport>): string {
  const rows = [
    ["Category", "Element", "State", "Source", "Occurrences", "Confirmed occurrences", "Scene count", "Scenes", "First scene", "First heading", "Occurrence positions"],
    ...report.rows.map((row) => [
      SCREENPLAY_ELEMENT_LABELS[row.category],
      row.name,
      row.reviewState,
      row.source.replaceAll("_", " "),
      String(row.occurrenceCount),
      String(row.confirmedOccurrenceCount),
      String(row.sceneCount),
      row.scenes.map((scene) => scene.sceneNumber ?? String(scene.ordinal)).join(", "),
      row.firstScene?.sceneNumber ?? (row.firstScene ? String(row.firstScene.ordinal) : ""),
      row.firstScene?.heading ?? "",
      row.occurrences.map(formatScreenplayElementOccurrencePosition).join("; "),
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map((cell) => safeCsvCell(cell)).join(",")).join("\r\n")}\r\n`;
}

function formatScreenplayElementOccurrencePosition(
  occurrence: ReturnType<typeof buildScreenplayElementReport>["rows"][number]["occurrences"][number],
): string {
  return `${occurrence.sceneNumber ?? occurrence.sceneOrdinal} line ${occurrence.sourceLine} (${occurrence.reviewState})`;
}

function markdownTableCell(value: string): string {
  return packetText(value).replaceAll("|", "\\|");
}

function selectedScreenplayRevisionPair(): {
  previous: ScreenplayBreakdown;
  next: ScreenplayBreakdown;
  comparison: ScreenplayRevisionComparison;
} | null {
  const breakdowns = screenplayBreakdownsForProject(state.ui.selectedProjectId);
  const next = selectedScreenplayBreakdown(breakdowns);
  const previous = next ? selectedScreenplayRevisionBase(breakdowns, next) : null;
  return previous && next
    ? { previous, next, comparison: compareScreenplayRevisions(previous, next) }
    : null;
}

async function carryForwardSelectedScreenplayRevision(): Promise<void> {
  const pair = selectedScreenplayRevisionPair();
  if (!pair) {
    state.ui.toast = "Revision carry-forward blocked: select two screenplay revisions.";
    render();
    return;
  }
  const result = carryForwardScreenplayRevisionPlanning({
    productionSchedules: state.workspace.productionSchedules,
    productionAvailability: state.workspace.productionAvailability,
    productionBudgetScenarios: state.workspace.productionBudgetScenarios,
    productionLocations: state.workspace.productionLocations,
    productionTalent: state.workspace.productionTalent,
    productionShots: state.workspace.productionShots,
  }, pair.previous, pair.next);
  state.workspace.productionSchedules = result.productionSchedules;
  state.workspace.productionAvailability = result.productionAvailability;
  state.workspace.productionBudgetScenarios = result.productionBudgetScenarios;
  state.workspace.productionLocations = result.productionLocations;
  state.workspace.productionTalent = result.productionTalent;
  state.workspace.productionShots = result.productionShots;
  const createdCount = result.summary.schedulesCreated
    + result.summary.budgetScenariosCreated
    + result.summary.availabilityWindowsCreated;
  const relinkedCount = result.summary.locationsRelinked
    + result.summary.talentRelinked
    + result.summary.shotsRelinked;
  const unresolvedCount = result.summary.locationsUnresolved
    + result.summary.talentUnresolved
    + result.summary.shotsUnresolved;
  state.workspace.auditLog.unshift(createAuditEvent(
    `Screenplay revision carried forward: ${createdCount} planning copies, ${relinkedCount} resource links, ${unresolvedCount} unresolved`,
    "System",
    unresolvedCount > 0 ? "amber" : "teal",
  ));
  await persistWorkspace();
  state.ui.toast = createdCount || relinkedCount
    ? `Revision carried forward: ${createdCount} planning copies, ${relinkedCount} resource links, ${unresolvedCount} unresolved.`
    : unresolvedCount
      ? `No matching records changed; ${unresolvedCount} links still require manual review.`
      : "Revision planning was already carried forward.";
  render();
}

async function exportSelectedScreenplayRevisionReport(): Promise<void> {
  const pair = selectedScreenplayRevisionPair();
  const project = getProjectById(state.workspace, state.ui.selectedProjectId);
  if (!pair || !project) {
    state.ui.toast = "Revision report blocked: select a project and two screenplay revisions.";
    render();
    return;
  }
  const exportedAt = new Date().toISOString();
  const markdown = createScreenplayRevisionMarkdown(project, pair.previous, pair.next, pair.comparison, exportedAt);
  const filename = `film-screenplay-revision-${slugForLocalRecord(project.title)}-${exportedAt.slice(0, 10)}.md`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), filename);
  state.workspace.auditLog.unshift(createAuditEvent(`Screenplay revision report exported: ${project.title}`, "System", "blue"));
  state.ui.toast = `Revision report exported for ${project.title}.`;
  await persistWorkspace();
  render();
}

function createScreenplayRevisionMarkdown(
  project: FilmProject,
  previous: ScreenplayBreakdown,
  next: ScreenplayBreakdown,
  comparison: ScreenplayRevisionComparison,
  exportedAt: string,
): string {
  const lines = [
    `# Screenplay Revision Report: ${packetText(project.title)}`,
    "",
    `Exported: ${packetText(exportedAt)}`,
    `Previous: ${packetText(previous.revision.title)} (${packetText(previous.revision.sourceFileName)})`,
    `Next: ${packetText(next.revision.title)} (${packetText(next.revision.sourceFileName)})`,
    "Policy: metadata-only local export; screenplay source text, contacts, provider credentials, OAuth values, raw attachments, and private Worker state are excluded.",
    "",
    "## Summary",
    `- Unchanged scenes: ${comparison.unchangedSceneCount}`,
    `- Changed scenes: ${comparison.changedSceneCount}`,
    `- Added scenes: ${comparison.addedSceneCount}`,
    `- Removed scenes: ${comparison.removedSceneCount}`,
    `- Matched production elements: ${comparison.elementMatches.length}`,
    "",
    "## Scene Changes",
    ...comparison.sceneChanges.filter((change) => change.status !== "unchanged").map((change) => {
      const previousNumber = change.previousSceneNumber ?? (change.previousOrdinal === null ? "-" : String(change.previousOrdinal));
      const nextNumber = change.nextSceneNumber ?? (change.nextOrdinal === null ? "-" : String(change.nextOrdinal));
      const heading = change.nextHeading ?? change.previousHeading ?? "Untitled scene";
      const basis = change.matchBasis?.replaceAll("_", " ") ?? "unmatched";
      return `- ${packetText(change.status.toUpperCase())}: ${packetText(previousNumber)} -> ${packetText(nextNumber)} - ${packetText(heading)} (${packetText(basis)})`;
    }),
    ...(comparison.sceneChanges.some((change) => change.status !== "unchanged") ? [] : ["No scene changes detected."]),
    "",
    "## Carry-Forward Policy",
    "- Existing schedules are preserved; Film creates draft copies against the new revision.",
    "- Matching budget assumptions and cast/location availability are copied to those draft schedules.",
    "- Matching shot, talent, and location records are relinked; unresolved records remain on the previous revision for manual review.",
    "- Final call sheets, sides, and production reports remain pinned to the revision used when they were created.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function importNotionSource(source: NotionImportSource): Promise<void> {
  try {
    const response = await fetch(`${WORKER_URL}/api/imports/notion/dry-run`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": state.auth.session?.csrfToken ?? "local-dry-run-csrf",
      },
      body: JSON.stringify({ files: source.manifest }),
    });
    const body = (await response.json()) as {
      preview?: NotionImportPreview;
      candidates?: Array<{ path?: unknown }>;
      error?: string;
    };
    if (!response.ok || !body.preview || !Array.isArray(body.candidates)) {
      throw new Error(body.error ?? `Notion import preflight failed with ${response.status}`);
    }

    const manifestPaths = new Set(source.manifest.map((file) => file.path.trim()));
    const candidatePaths = new Set<string>();
    for (const candidate of body.candidates) {
      if (typeof candidate.path !== "string" || !manifestPaths.has(candidate.path)) {
        throw new Error("Notion import preflight returned an invalid candidate path.");
      }
      candidatePaths.add(candidate.path);
    }

    const importFiles = await source.readFiles(candidatePaths);
    if (importFiles.length === 0) {
      throw new Error("No importable files were found.");
    }

    const applied = applyNotionImport(state.workspace, importFiles, state.ui.selectedProjectId);
    for (const warning of body.preview.warnings) {
      if (!applied.summary.warnings.includes(warning)) applied.summary.warnings.push(warning);
    }
    let attachmentStage: AttachmentStageSummary = {
      stagedCount: 0,
      stagedBytes: 0,
      skippedCount: 0,
      warnings: [],
    };
    try {
      attachmentStage = await stageNotionAttachmentBlobs(applied.workspace, importFiles, persistAttachmentBlobs);
      applied.summary.warnings.push(...attachmentStage.warnings);
    } catch (error) {
      applied.summary.warnings.push(
        `Attachment bytes were not staged locally: ${error instanceof Error ? error.message : "unknown error"}.`,
      );
    }
    let attachmentUpload: AttachmentUploadDryRunSummary = {
      committedCount: 0,
      uploadMode: "R2 upload dry run skipped",
      persistence: "not_applicable",
    };
    if (attachmentStage.stagedCount > 0) {
      try {
        attachmentUpload = await runAttachmentUploadDryRun(applied.workspace);
      } catch (error) {
        applied.summary.warnings.push(
          `Attachment R2 upload dry run failed: ${error instanceof Error ? error.message : "Worker unavailable"}.`,
        );
      }
    }
    let planningCommit: NotionPlanningCommitSummary = {
      committedCount: 0,
      idempotentCount: 0,
      updatePreviewCount: 0,
      rejectedCount: 0,
      persistence: "not_applicable",
      auditPersistence: "not_applicable",
      truncated: false,
      tableSummary: [],
      updatePreviewDetails: [],
    };
    let coreCommit: NotionCoreCommitSummary = {
      committedCount: 0,
      idempotentCount: 0,
      updatePreviewCount: 0,
      rejectedCount: 0,
      persistence: "not_applicable",
      auditPersistence: "not_applicable",
      destructiveWrite: false,
      truncated: false,
    };
    const coreProject = applied.workspace.projects.find((project) => project.id === state.ui.selectedProjectId)
      ?? applied.workspace.projects[0];
    if (coreProject && applied.coreRecords.length > 0) {
      const coreRecords = applied.coreRecords.filter(
        (record) => record.projectTitle.trim().toLowerCase() === coreProject.title.trim().toLowerCase(),
      );
      if (coreRecords.length < applied.coreRecords.length) {
        applied.summary.warnings.push(`${applied.coreRecords.length - coreRecords.length} core records for other projects stayed local.`);
      }
      if (coreRecords.length > 0) {
        try {
          coreCommit = await commitNotionCoreRecords(
            WORKER_URL,
            state.auth.session?.csrfToken ?? "local-dry-run-csrf",
            {
              workspaceId: applied.workspace.id,
              projectId: coreProject.id,
              records: coreRecords,
            },
          );
          if (coreCommit.truncated) applied.summary.warnings.push("Only the first 200 core records were sent to the Worker commit.");
          if (coreCommit.updatePreviewCount > 0) applied.summary.warnings.push(`${coreCommit.updatePreviewCount} existing core records require review and were not overwritten.`);
          if (coreCommit.rejectedCount > 0) applied.summary.warnings.push(`${coreCommit.rejectedCount} core records were rejected by Worker validation.`);
        } catch (error) {
          applied.summary.warnings.push(
            `Core D1 import failed: ${error instanceof Error ? error.message : "Worker unavailable"}.`,
          );
        }
      }
    }
    if (applied.planningRecords.length > 0) {
      try {
        planningCommit = await commitNotionPlanningImport(applied.workspace.id, applied.planningRecords);
        if (planningCommit.truncated) {
          applied.summary.warnings.push("Only the first 200 planning records were sent to the Worker commit dry run.");
        }
        if (planningCommit.rejectedCount > 0) {
          applied.summary.warnings.push(`${planningCommit.rejectedCount} planning records were rejected by Worker validation.`);
        }
      } catch (error) {
        applied.summary.warnings.push(
          `Planning D1 import dry run failed: ${error instanceof Error ? error.message : "Worker unavailable"}.`,
        );
      }
    }
    state.workspace = applied.workspace;
    if (applied.summary.projectsCreated > 0) {
      state.ui.selectedProjectId = state.workspace.projects[0]?.id ?? state.ui.selectedProjectId;
    }
    state.notionImport = {
      ...applied.summary,
      importedAt: new Date().toISOString(),
      sourceLabel: source.sourceLabel,
      totalFiles: body.preview.totalFiles,
      acceptedFiles: body.preview.acceptedFiles,
      candidateCount: body.candidates?.length ?? 0,
      attachmentsStaged: attachmentStage.stagedCount,
      attachmentBytesStaged: attachmentStage.stagedBytes,
      attachmentDryRunCommitted: attachmentUpload.committedCount,
      attachmentUploadMode: attachmentUpload.uploadMode,
      attachmentPersistence: attachmentUpload.persistence,
      coreCommitted: coreCommit.committedCount,
      coreIdempotent: coreCommit.idempotentCount,
      coreUpdatePreview: coreCommit.updatePreviewCount,
      coreRejected: coreCommit.rejectedCount,
      coreCommitPersistence: coreCommit.persistence,
      coreCommitAuditPersistence: coreCommit.auditPersistence,
      planningCommitted: planningCommit.committedCount,
      planningIdempotent: planningCommit.idempotentCount,
      planningUpdatePreview: planningCommit.updatePreviewCount,
      planningRejected: planningCommit.rejectedCount,
      planningCommitPersistence: planningCommit.persistence,
      planningCommitAuditPersistence: planningCommit.auditPersistence,
      planningTableSummary: planningCommit.tableSummary,
      planningUpdatePreviewDetails: planningCommit.updatePreviewDetails,
    };
    state.workspace.auditLog.unshift(createAuditEvent("Notion export imported", "System", "blue"));
    await persistWorkspace(
      createOperation(
        state.workspace.id,
        "import.notion_applied",
        "import",
        state.notionImport.importedAt,
        "Notion export imported",
        {
          totalFiles: state.notionImport.totalFiles,
          acceptedFiles: state.notionImport.acceptedFiles,
          candidateCount: state.notionImport.candidateCount,
          projectsCreated: state.notionImport.projectsCreated,
          tasksCreated: state.notionImport.tasksCreated,
          docsCreated: state.notionImport.docsCreated,
          attachmentsImported: state.notionImport.attachmentsImported,
          attachmentsStaged: state.notionImport.attachmentsStaged,
          attachmentBytesStaged: state.notionImport.attachmentBytesStaged,
          attachmentDryRunCommitted: state.notionImport.attachmentDryRunCommitted,
          attachmentUploadMode: state.notionImport.attachmentUploadMode,
          attachmentPersistence: state.notionImport.attachmentPersistence,
          coreCommitted: state.notionImport.coreCommitted,
          coreIdempotent: state.notionImport.coreIdempotent,
          coreUpdatePreview: state.notionImport.coreUpdatePreview,
          coreRejected: state.notionImport.coreRejected,
          coreCommitPersistence: state.notionImport.coreCommitPersistence,
          coreCommitAuditPersistence: state.notionImport.coreCommitAuditPersistence,
          planningCommitted: state.notionImport.planningCommitted,
          planningIdempotent: state.notionImport.planningIdempotent,
          planningUpdatePreview: state.notionImport.planningUpdatePreview,
          planningRejected: state.notionImport.planningRejected,
          planningTableSummary: state.notionImport.planningTableSummary,
          planningUpdatePreviewDetails: state.notionImport.planningUpdatePreviewDetails.slice(0, 5),
          planningCommitPersistence: state.notionImport.planningCommitPersistence,
          planningCommitAuditPersistence: state.notionImport.planningCommitAuditPersistence,
          peopleCreated: state.notionImport.peopleCreated,
          equipmentCreated: state.notionImport.equipmentCreated,
          expensesCreated: state.notionImport.expensesCreated,
          planningRecordsTotal: applied.planningRecords.length,
          planningRecordsTruncated: applied.planningRecords.length > 25,
          planningRecords: planningRecordOperationPayload(applied.planningRecords),
          warnings: state.notionImport.warnings,
        },
      ),
    );
    state.planningRows = collectLocalPlanningRows(state.operations);
    state.planningExportView = null;
    const canonicalRefreshed = coreCommit.persistence === "d1_notion_core_import" && state.auth.session
      ? await hydrateCanonicalWorkspace()
      : false;
    state.ui.toast = `Notion import completed: ${state.notionImport.projectsCreated} projects, ${state.notionImport.tasksCreated} tasks, ${state.notionImport.docsCreated} docs, ${state.notionImport.coreCommitted} canonical core records${canonicalRefreshed ? "; workspace refreshed" : ""}.`;
  } catch (error) {
    state.ui.toast = `Notion import blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

function planningRecordOperationPayload(records: NotionPlanningRecord[], maxRecords = 25): Array<{
  kind: NotionPlanningRecord["kind"];
  title: string;
  sourcePath: string;
  projectTitle: string | null;
  projectTitles: string[];
  fields: Record<string, string>;
}> {
  return records.slice(0, maxRecords).map((record) => ({
    kind: record.kind,
    title: record.title.slice(0, 160),
    sourcePath: record.sourcePath.slice(0, 240),
    projectTitle: record.projectTitle?.slice(0, 160) ?? null,
    projectTitles: record.projectTitles.slice(0, 20).map((title) => title.slice(0, 160)),
    fields: Object.fromEntries(
      Object.entries(record.fields)
        .slice(0, 12)
        .map(([key, value]) => [key.slice(0, 80), value.slice(0, 240)]),
    ),
  }));
}

function formatNotionPlanningTableSummary(summary: NotionPlanningTableSummary[]): string {
  return summary
    .slice(0, 5)
    .map((row) => {
      const table = row.tableName.replaceAll("_", " ");
      return `${table} ${row.committedCount}/${row.idempotentCount}/${row.updatePreviewCount}/${row.rejectedCount}`;
    })
    .join(", ");
}

function formatNotionPlanningUpdatePreview(details: NotionPlanningUpdatePreviewDetail[]): string {
  return details
    .slice(0, 3)
    .map((detail) => {
      const firstChange = detail.fieldChanges[0];
      const field = firstChange ? ` - ${firstChange.field}` : "";
      return `${detail.tableName.replaceAll("_", " ")} ${detail.title} (${detail.fieldChangeCount} changes${field})`;
    })
    .join(", ");
}

async function commitNotionPlanningImport(
  workspaceId: string,
  records: NotionPlanningRecord[],
): Promise<NotionPlanningCommitSummary> {
  if (records.length === 0) {
    return {
      committedCount: 0,
      idempotentCount: 0,
      updatePreviewCount: 0,
      rejectedCount: 0,
      persistence: "not_applicable",
      auditPersistence: "not_applicable",
      truncated: false,
      tableSummary: [],
      updatePreviewDetails: [],
    };
  }

  const response = await fetch(`${WORKER_URL}/api/imports/notion/planning/commit`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": state.auth.session?.csrfToken ?? "local-dry-run-csrf",
    },
    body: JSON.stringify({
      workspaceId,
      records: planningRecordOperationPayload(records, 200),
    }),
  });
  const body = (await response.json()) as NotionPlanningCommitResponse;
  if (!response.ok && response.status !== 422) {
    throw new Error(body.error ?? `Planning import commit failed with ${response.status}`);
  }

  return {
    committedCount: body.committed?.length ?? 0,
    idempotentCount: body.idempotent?.length ?? 0,
    updatePreviewCount: body.updatePreview?.length ?? 0,
    rejectedCount: body.rejected?.length ?? 0,
    persistence: body.persistence ?? "dry_run_memoryless",
    auditPersistence: body.auditPersistence ?? "dry_run_memoryless",
    truncated: records.length > 200,
    tableSummary: body.tableSummary ?? [],
    updatePreviewDetails: body.updatePreviewDetails ?? [],
  };
}

async function runAttachmentUploadDryRun(workspace: WorkspaceData): Promise<AttachmentUploadDryRunSummary> {
  const attachments = collectStagedAttachmentMetadata(workspace);
  if (attachments.length === 0) {
    return {
      committedCount: 0,
      uploadMode: "R2 upload dry run skipped",
      persistence: "not_applicable",
    };
  }

  const prepare = await prepareAttachmentUploadDryRun(workspace.id, attachments);
  const rejectedPrepareCount = prepare.rejected?.length ?? 0;
  const commitRequests = createAttachmentCommitRequests(attachments, prepare.accepted ?? []);
  const commit = commitRequests.length > 0
    ? await commitAttachmentUploadDryRun(workspace.id, commitRequests)
    : { accepted: [], rejected: [], persistence: prepare.persistence };
  const rejectedCommitCount = commit.rejected?.length ?? 0;
  const committedCount = applyAttachmentCommitResults(workspace, commit.accepted ?? []);
  if (rejectedPrepareCount > 0 || rejectedCommitCount > 0) {
    throw new Error(`${rejectedPrepareCount + rejectedCommitCount} staged attachments failed R2 upload dry-run validation`);
  }

  return {
    committedCount,
    uploadMode: prepare.uploadMode ?? "R2 upload dry run unavailable",
    persistence: commit.persistence ?? prepare.persistence ?? "dry_run_memoryless",
  };
}

async function storeStagedAttachmentsInR2(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before storing attachment bytes in R2.";
    render();
    return;
  }

  const attachments = collectUploadableAttachmentMetadata(state.workspace);
  if (attachments.length === 0) {
    state.ui.toast = "No staged attachment bytes are ready for R2 storage.";
    render();
    return;
  }

  state.ui.toast = `Preparing ${attachments.length} staged attachments for R2 storage.`;
  render();

  try {
    const prepare = await prepareAttachmentUploadDryRun(state.workspace.id, attachments);
    const intentsByDocId = new Map((prepare.accepted ?? []).map((intent) => [intent.docId, intent]));
    const stored: AttachmentStoreResult[] = [];
    let rejectedCount = prepare.rejected?.length ?? 0;
    let persistence = prepare.persistence ?? "dry_run_memoryless";

    for (const attachment of attachments) {
      const intent = intentsByDocId.get(attachment.docId);
      const staged = await readAttachmentBlob(attachment.storageKey);
      if (!intent || !staged || staged.sha256 !== attachment.sha256 || staged.sizeBytes !== attachment.sizeBytes) {
        rejectedCount += 1;
        continue;
      }

      try {
        const result = await uploadAttachmentObject(
          WORKER_URL,
          state.workspace.id,
          attachment,
          intent,
          staged.blob,
          csrfToken,
        );
        stored.push(result.attachment);
        persistence = result.persistence;
      } catch {
        rejectedCount += 1;
      }
    }

    const storedCount = applyAttachmentStoreResults(state.workspace, stored);
    state.attachmentR2Store = {
      storedCount,
      rejectedCount,
      persistence,
      checkedAt: new Date().toISOString(),
    };
    state.workspace.auditLog.unshift(createAuditEvent(`R2 attachment storage: ${storedCount} stored`, "System", storedCount > 0 ? "teal" : "amber"));
    await persistWorkspace();
    state.ui.toast = `R2 attachment storage finished: ${storedCount} stored, ${rejectedCount} rejected.`;
  } catch (error) {
    state.ui.toast = `R2 attachment storage blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function previewStoredAttachmentExportManifest(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before exporting stored attachment manifests.";
    render();
    return;
  }

  try {
    const manifest = await exportStoredAttachmentManifest(WORKER_URL, state.workspace.id, csrfToken, 100);
    state.attachmentExport = {
      rowCount: manifest.rowCount,
      truncated: manifest.truncated,
      offset: manifest.offset,
      nextOffset: manifest.nextOffset,
      persistence: manifest.persistence,
      checkedAt: new Date().toISOString(),
      objects: manifest.objects,
      latestObject: manifest.objects[0] ?? null,
      latestDownload: null,
      packageDryRun: null,
      packageDownload: null,
    };
    state.workspace.auditLog.unshift(createAuditEvent(`Attachment export manifest: ${manifest.rowCount} objects`, "System", "blue"));
    await persistWorkspace();
    state.ui.toast = `Stored attachment manifest ready: ${manifest.rowCount} objects${manifest.truncated ? " (truncated)" : ""}.`;
  } catch (error) {
    state.ui.toast = `Attachment export manifest blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function packageStoredAttachmentsDryRun(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before packaging stored attachment metadata.";
    render();
    return;
  }

  const attachmentExport = state.attachmentExport;
  if (!attachmentExport?.rowCount) {
    state.ui.toast = "Export the stored attachment manifest before packaging attachments.";
    render();
    return;
  }

  try {
    const objectKeys = attachmentExport.objects.map((object) => object.objectKey);
    const packageDryRun = await createStoredAttachmentPackageDryRun(WORKER_URL, state.workspace.id, csrfToken, 1000, objectKeys);
    state.attachmentExport = {
      ...attachmentExport,
      packageDryRun: {
        objectCount: packageDryRun.objectCount,
        totalSizeBytes: packageDryRun.totalSizeBytes,
        offset: packageDryRun.offset,
        nextOffset: packageDryRun.nextOffset,
        persistence: packageDryRun.persistence,
        packagePlanId: packageDryRun.packagePlanId,
        packageToken: packageDryRun.packageToken,
        packageTokenExpiresAt: packageDryRun.packageTokenExpiresAt,
        packagePlanPersistence: packageDryRun.packagePlanPersistence,
        packageMode: packageDryRun.packageMode,
        byteSource: packageDryRun.byteSource,
        canPackage: packageDryRun.canPackage,
        blockers: packageDryRun.blockers,
        objectKeys: packageDryRun.objects.map((object) => object.objectKey),
        checkedAt: new Date().toISOString(),
      },
      packageDownload: null,
    };
    state.restoreAttachmentPackageVerification = null;
    state.restoreAttachmentObjectPlan = null;
    state.restoreAttachmentObjectCommitPreflight = null;
    state.workspace.auditLog.unshift(
      createAuditEvent(`Attachment package dry run: ${packageDryRun.objectCount} objects`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `Attachment package plan ready: ${packageDryRun.objectCount} objects, ${formatBytes(packageDryRun.totalSizeBytes)}.`;
  } catch (error) {
    state.ui.toast = `Attachment package dry run blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function downloadLatestStoredAttachment(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before downloading stored attachment bytes.";
    render();
    return;
  }

  const attachmentExport = state.attachmentExport;
  const latestObject = attachmentExport?.latestObject;
  if (!latestObject) {
    state.ui.toast = "Export the stored attachment manifest before downloading an attachment.";
    render();
    return;
  }

  try {
    const download = await downloadStoredAttachmentObject(
      WORKER_URL,
      state.workspace.id,
      latestObject.objectKey,
      csrfToken,
    );
    const calculatedSha256 = await sha256HexBlob(download.blob);
    const expectedSha256 = download.sha256 ?? latestObject.sha256;
    if (expectedSha256 && calculatedSha256 !== expectedSha256) {
      throw new Error("downloaded attachment hash did not match the Worker manifest");
    }

    const filename = download.filename ?? latestObject.name;
    downloadBlob(download.blob, filename);
    state.attachmentExport = {
      ...attachmentExport,
      latestDownload: {
        name: filename,
        docId: download.docId ?? latestObject.docId,
        sizeBytes: download.blob.size,
        sha256: calculatedSha256,
        downloadedAt: new Date().toISOString(),
      },
    };
    state.workspace.auditLog.unshift(
      createAuditEvent(`Stored attachment downloaded: ${filename}`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `Downloaded ${filename} (${formatBytes(download.blob.size)}) with verified hash ${calculatedSha256.slice(0, 12)}.`;
  } catch (error) {
    state.ui.toast = `Stored attachment download blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function downloadStoredAttachmentPackageZip(): Promise<void> {
  const csrfToken = state.auth.session?.csrfToken;
  if (!csrfToken) {
    state.ui.toast = "Sign in before downloading stored attachment packages.";
    render();
    return;
  }

  const attachmentExport = state.attachmentExport;
  if (!attachmentExport?.packageDryRun?.canPackage) {
    state.ui.toast = "Run the attachment package plan before downloading the package.";
    render();
    return;
  }
  if (!attachmentExport.packageDryRun.packagePlanId || !attachmentExport.packageDryRun.packageToken) {
    state.ui.toast = "Run the attachment package plan again before downloading the package.";
    render();
    return;
  }

  try {
    const download = await downloadStoredAttachmentPackage(
      WORKER_URL,
      state.workspace.id,
      csrfToken,
      1000,
      attachmentExport.packageDryRun.objectKeys,
      attachmentExport.packageDryRun.packagePlanId,
      attachmentExport.packageDryRun.packageToken,
    );
    const calculatedSha256 = await sha256HexBlob(download.blob);
    if (download.sha256 && calculatedSha256 !== download.sha256) {
      throw new Error("downloaded attachment package hash did not match the Worker manifest");
    }

    const packageManifest = await readStoredAttachmentPackageManifest(download.blob);
    const filename = download.filename ?? `film-attachments-${state.workspace.id}.zip`;
    downloadBlob(download.blob, filename);
    state.attachmentExport = {
      ...attachmentExport,
      packageDownload: {
        name: filename,
        objectCount: download.objectCount,
        sizeBytes: download.blob.size,
        totalSourceBytes: download.totalSourceBytes,
        sha256: calculatedSha256,
        packageManifest,
        blob: download.blob,
        downloadedAt: new Date().toISOString(),
      },
    };
    state.restoreAttachmentPackageVerification = null;
    state.restoreAttachmentObjectPlan = null;
    state.restoreAttachmentObjectCommitPreflight = null;
    state.restoreAttachmentObjectCommit = null;
    state.workspace.auditLog.unshift(
      createAuditEvent(`Attachment package downloaded: ${download.objectCount} objects`, "System", "blue"),
    );
    await persistWorkspace();
    state.ui.toast = `Downloaded attachment package (${download.objectCount} objects, ${formatBytes(download.blob.size)}) with verified hash ${calculatedSha256.slice(0, 12)}.`;
  } catch (error) {
    state.ui.toast = `Attachment package download blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

async function prepareAttachmentUploadDryRun(
  workspaceId: string,
  attachments: AttachmentUploadCandidate[],
): Promise<AttachmentUploadPrepareResponse> {
  const response = await fetch(`${WORKER_URL}/api/attachments/r2/prepare-upload`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": state.auth.session?.csrfToken ?? "local-dry-run-csrf",
    },
    body: JSON.stringify({
      workspaceId,
      attachments,
    }),
  });
  const body = (await response.json()) as AttachmentUploadPrepareResponse;
  if (!response.ok && response.status !== 422) {
    throw new Error(body.error ?? `Attachment upload prepare failed with ${response.status}`);
  }
  return body;
}

async function commitAttachmentUploadDryRun(
  workspaceId: string,
  commits: AttachmentCommitRequest[],
): Promise<AttachmentUploadCommitResponse> {
  const response = await fetch(`${WORKER_URL}/api/attachments/r2/commit`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-film-csrf": state.auth.session?.csrfToken ?? "local-dry-run-csrf",
    },
    body: JSON.stringify({
      workspaceId,
      commits,
    }),
  });
  const body = (await response.json()) as AttachmentUploadCommitResponse;
  if (!response.ok && response.status !== 422) {
    throw new Error(body.error ?? `Attachment upload commit failed with ${response.status}`);
  }
  return body;
}

function chooseImportFiles(): Promise<BrowserImportFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.setAttribute("webkitdirectory", "");
    input.addEventListener(
      "change",
      () => {
        resolve(Array.from(input.files ?? []) as BrowserImportFile[]);
      },
      { once: true },
    );
    input.click();
  });
}

function chooseScreenplayFiles(): Promise<BrowserImportFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".fountain,.fdx,.gwx,text/plain,application/xml";
    input.addEventListener(
      "change",
      () => {
        resolve(Array.from(input.files ?? []) as BrowserImportFile[]);
      },
      { once: true },
    );
    input.click();
  });
}

function chooseImportZipFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip,application/zip";
    input.addEventListener(
      "change",
      () => {
        resolve(input.files?.[0] ?? null);
      },
      { once: true },
    );
    input.click();
  });
}

async function createProjectFromTemplate(title: string, projectType: string): Promise<void> {
  const project = createFilmProjectFromTemplate(title, PROJECT_TYPES.includes(projectType as (typeof PROJECT_TYPES)[number]) ? projectType : "Feature Film");
  state.workspace.projects.unshift(project);
  state.ui.selectedProjectId = project.id;
  state.ui.selectedDocId = project.docs[0]?.id ?? null;
  state.ui.projectCreateOpen = false;
  state.workspace.auditLog.unshift(createAuditEvent(`Project created: ${project.title}`, "Alonso", "blue"));
  await persistWorkspace(
    createOperation(state.workspace.id, "project.created", "project", project.id, `Project created: ${project.title}`, {
      title: project.title,
      projectType: project.type,
      template: "film",
    }),
  );
  persistUi();
  state.ui.toast = `${project.type} created from the film template and queued for sync.`;
  render();
}

async function syncQueuedOperations(): Promise<void> {
  const queued = state.operations.filter((operation) => operation.status === "queued");
  if (queued.length === 0) {
    state.ui.toast = "No queued local operations to sync.";
    render();
    return;
  }

  try {
    const response = await fetch(`${WORKER_URL}/api/operations/dry-run-sync`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        "x-film-csrf": state.auth.session?.csrfToken ?? "local-dry-run-csrf",
      },
      body: JSON.stringify({ operations: queued }),
    });
    const body = (await response.json()) as {
      accepted?: string[];
      replayed?: string[];
      idempotent?: string[];
      canonicalApplied?: string[];
      persistence?: string;
      auditPersistence?: string;
      error?: string;
    };
    if (!response.ok || !body.accepted) {
      throw new Error(body.error ?? `Sync preflight failed with ${response.status}`);
    }

    const auditPersistence = body.auditPersistence ? `; audit ${body.auditPersistence.replaceAll("_", " ")}` : "";
    const auditEvent = createAuditEvent(`Dry-run sync accepted ${body.accepted.length} operations${auditPersistence}`, "System", "teal");
    state.operations = await markOperationsSynced(body.accepted);
    state.workspace.auditLog.unshift(auditEvent);
    try {
      const persistedWorkspace = await appendLocalAuditEvent(state.workspace.id, auditEvent);
      if (persistedWorkspace) state.workspace = persistedWorkspace;
    } catch {
      // Operation status is already persisted; keep the audit entry in memory if the audit append fails.
    }
    const replayed = body.replayed?.length ?? 0;
    const idempotent = body.idempotent?.length ?? 0;
    const canonicalApplied = body.canonicalApplied?.length ?? 0;
    const appliedRecordLabel = canonicalApplied === 1 ? "record" : "records";
    const refreshed = body.persistence === "d1_operation_log" && state.auth.session
      ? await hydrateCanonicalWorkspace()
      : false;
    state.ui.toast = body.persistence === "d1_operation_log"
      ? `D1 replay accepted ${body.accepted.length} operations (${replayed} new, ${idempotent} already applied, ${canonicalApplied} ${appliedRecordLabel} applied${refreshed ? "; workspace refreshed" : ""}).`
      : `Dry-run sync accepted ${body.accepted.length} queued operations.`;
  } catch (error) {
    state.ui.toast = `Dry-run sync blocked: ${error instanceof Error ? error.message : "Worker unavailable"}`;
  }
  render();
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      state.ui.toast = "Offline worker registration failed in this browser session.";
      render();
    });
  });
}

function icon(name: string): string {
  const icons: Record<string, string> = {
    "arrow-down": "<svg viewBox=\"0 0 24 24\"><path d=\"M12 5v14M6 13l6 6 6-6\"/></svg>",
    "arrow-up": "<svg viewBox=\"0 0 24 24\"><path d=\"M12 19V5M6 11l6-6 6 6\"/></svg>",
    backup: "<svg viewBox=\"0 0 24 24\"><path d=\"M7 8a5 5 0 0 1 9.7-1.7A4.5 4.5 0 1 1 17.5 15H8a4 4 0 0 1-1-7.9Z\"/><path d=\"M12 12v7m-3-3 3 3 3-3\"/></svg>",
    "call-sheet": "<svg viewBox=\"0 0 24 24\"><path d=\"M4 7h16v13H4z\"/><path d=\"M4 7l16-3M8 6l3 4M14 5l3 4\"/><path d=\"M8 13h8M8 17h5\"/></svg>",
    calendar: "<svg viewBox=\"0 0 24 24\"><rect x=\"4\" y=\"5\" width=\"16\" height=\"15\" rx=\"2\"/><path d=\"M8 3v4M16 3v4M4 10h16M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01\"/></svg>",
    case: "<svg viewBox=\"0 0 24 24\"><path d=\"M9 7V5h6v2\"/><rect x=\"4\" y=\"7\" width=\"16\" height=\"12\" rx=\"2\"/><path d=\"M4 12h16\"/></svg>",
    check: "<svg viewBox=\"0 0 24 24\"><path d=\"m5 12 4 4L19 6\"/></svg>",
    chevron: "<svg viewBox=\"0 0 24 24\"><path d=\"m8 10 4 4 4-4\"/></svg>",
    close: "<svg viewBox=\"0 0 24 24\"><path d=\"M6 6l12 12M18 6 6 18\"/></svg>",
    copy: "<svg viewBox=\"0 0 24 24\"><rect x=\"8\" y=\"8\" width=\"11\" height=\"11\" rx=\"2\"/><path d=\"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2\"/></svg>",
    coins: "<svg viewBox=\"0 0 24 24\"><ellipse cx=\"12\" cy=\"6\" rx=\"7\" ry=\"3\"/><path d=\"M5 6v8c0 1.7 3.1 3 7 3s7-1.3 7-3V6\"/><path d=\"M5 10c0 1.7 3.1 3 7 3s7-1.3 7-3\"/></svg>",
    doc: "<svg viewBox=\"0 0 24 24\"><path d=\"M7 3h7l4 4v14H7z\"/><path d=\"M14 3v5h5M9 13h6M9 17h6\"/></svg>",
    edit: "<svg viewBox=\"0 0 24 24\"><path d=\"M4 20h4L19 9l-4-4L4 16z\"/><path d=\"m13 7 4 4\"/></svg>",
    filter: "<svg viewBox=\"0 0 24 24\"><path d=\"M4 6h16l-6 7v5l-4 2v-7z\"/></svg>",
    folder: "<svg viewBox=\"0 0 24 24\"><path d=\"M4 6h6l2 2h8v10H4z\"/></svg>",
    grid: "<svg viewBox=\"0 0 24 24\"><rect x=\"4\" y=\"4\" width=\"6\" height=\"6\"/><rect x=\"14\" y=\"4\" width=\"6\" height=\"6\"/><rect x=\"4\" y=\"14\" width=\"6\" height=\"6\"/><rect x=\"14\" y=\"14\" width=\"6\" height=\"6\"/></svg>",
    import: "<svg viewBox=\"0 0 24 24\"><path d=\"M12 3v12\"/><path d=\"m8 11 4 4 4-4\"/><path d=\"M5 19h14\"/><path d=\"M5 15v4M19 15v4\"/></svg>",
    list: "<svg viewBox=\"0 0 24 24\"><path d=\"M8 6h12M8 12h12M8 18h12\"/><path d=\"M4 6h.01M4 12h.01M4 18h.01\"/></svg>",
    lock: "<svg viewBox=\"0 0 24 24\"><rect x=\"5\" y=\"10\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3\"/></svg>",
    logout: "<svg viewBox=\"0 0 24 24\"><path d=\"M10 17v2H5V5h5v2\"/><path d=\"M15 7l5 5-5 5\"/><path d=\"M20 12H9\"/></svg>",
    more: "<svg viewBox=\"0 0 24 24\"><path d=\"M5 12h.01M12 12h.01M19 12h.01\"/></svg>",
    people: "<svg viewBox=\"0 0 24 24\"><path d=\"M16 11a3 3 0 1 0-3-3\"/><path d=\"M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 3c-3 0-5 1.6-5 4v1h10v-1c0-2.4-2-4-5-4Zm8 0c2.8 0 5 1.6 5 4v1h-6\"/></svg>",
    pin: "<svg viewBox=\"0 0 24 24\"><path d=\"M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z\"/><circle cx=\"12\" cy=\"10\" r=\"2\"/></svg>",
    plus: "<svg viewBox=\"0 0 24 24\"><path d=\"M12 5v14M5 12h14\"/></svg>",
    provider: "<svg viewBox=\"0 0 24 24\"><path d=\"M7 8h10v8H7z\"/><path d=\"M12 3v5M12 16v5M3 12h4M17 12h4\"/></svg>",
    search: "<svg viewBox=\"0 0 24 24\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m16 16 4 4\"/></svg>",
    scissors: "<svg viewBox=\"0 0 24 24\"><circle cx=\"6\" cy=\"7\" r=\"3\"/><circle cx=\"6\" cy=\"17\" r=\"3\"/><path d=\"m8.7 8.3 10.3-5.3M8.7 15.7 19 21M8.7 8.3 14 13\"/></svg>",
    sync: "<svg viewBox=\"0 0 24 24\"><path d=\"M20 7v5h-5M4 17v-5h5\"/><path d=\"M6.1 9a7 7 0 0 1 11.7-2.6L20 9M4 15l2.2 2.6A7 7 0 0 0 17.9 15\"/></svg>",
    settings: "<svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1\"/></svg>",
    slate: "<svg viewBox=\"0 0 24 24\"><path d=\"M4 7h16v13H4z\"/><path d=\"M4 7l16-3M8 6l3 4M14 5l3 4\"/></svg>",
    star: "<svg class=\"star\" viewBox=\"0 0 24 24\"><path d=\"m12 3 2.6 5.5 6 .8-4.3 4.2 1 5.9L12 16.6 6.7 19.4l1-5.9-4.3-4.2 6-.8z\"/></svg>",
    trash: "<svg viewBox=\"0 0 24 24\"><path d=\"M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3M7 7l1 13h8l1-13\"/></svg>",
    undo: "<svg viewBox=\"0 0 24 24\"><path d=\"m9 14-5-5 5-5M4 9h10a6 6 0 0 1 6 6v1\"/></svg>",
    save: "<svg viewBox=\"0 0 24 24\"><path d=\"M5 4h12l2 2v14H5z\"/><path d=\"M8 4v6h8V4M8 20v-6h8v6\"/></svg>",
    unlock: "<svg viewBox=\"0 0 24 24\"><rect x=\"5\" y=\"10\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 7.5-2\"/></svg>",
    warning: "<svg viewBox=\"0 0 24 24\"><path d=\"M12 3 2.5 20h19z\"/><path d=\"M12 9v5M12 17h.01\"/></svg>",
    zip: "<svg viewBox=\"0 0 24 24\"><path d=\"M7 3h7l4 4v14H7z\"/><path d=\"M14 3v5h5\"/><path d=\"M10 6h2M12 8h2M10 10h2M12 12h2M10 14h2\"/><path d=\"M10 17h4\"/></svg>",
  };

  return icons[name] ?? "";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function shortHash(value: string | null): string {
  return value ? `${value.slice(0, 8)}...${value.slice(-6)}` : "pending";
}

function formatShortDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDocStatus(doc: ProjectDoc): string {
  if (doc.attachmentStatus === "staged_local") return "Staged local";
  if (doc.attachmentStatus === "metadata_only") return "Metadata only";
  if (doc.attachmentStatus === "r2_dry_run") return "R2 dry run";
  if (doc.attachmentStatus === "stored_r2") return "Stored";
  return doc.date;
}

function initialsFor(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "TM";
}
