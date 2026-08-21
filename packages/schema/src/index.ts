export type ProjectPhase = "Development" | "Pre-Production" | "Production" | "Post-Production";
export type Tone = "teal" | "amber" | "blue" | "gray" | "red";
export type IntegrationKey = "pool" | "store" | "stripe" | "social" | "google" | "resend" | "sms";

export type IntegrationStatus = {
  key: IntegrationKey;
  label: string;
  mode: "dry-run" | "connected";
  status: "ready" | "needs_scope" | "disabled";
  lastCheckedAt: string;
};

export type WorkspaceRole = "owner" | "producer" | "director" | "department_lead" | "contributor" | "reviewer";

export type WorkspaceMember = {
  id: string;
  displayName: string;
  emailHash: string;
  role: WorkspaceRole;
  status: "active" | "invited" | "disabled";
  lastSeenAt: string | null;
};

export type WorkspaceData = {
  id: string;
  name: string;
  archivedProjectCount: number;
  backupPolicy: string;
  nextBackup: string;
  integrations: IntegrationStatus[];
  members: WorkspaceMember[];
  projects: FilmProject[];
  screenplayBreakdowns: ScreenplayBreakdown[];
  productionSchedules: ProductionScheduleVersion[];
  productionAvailability: ProductionAvailabilityWindow[];
  productionBudgetScenarios: ProductionBudgetScenario[];
  productionCallSheets: ProductionCallSheet[];
  productionReports: ProductionDailyReport[];
  productionLocations: ProductionLocation[];
  productionTalent: ProductionTalent[];
  productionShots: ProductionShot[];
  restorePoints: RestorePoint[];
  auditLog: AuditEvent[];
};

export type ScreenplayFormat = "fountain" | "final_draft";
export type ScreenplayReviewState = "suggested" | "confirmed" | "dismissed";
export type ScreenplayElementCategory =
  | "cast"
  | "background"
  | "location"
  | "prop"
  | "wardrobe"
  | "makeup"
  | "vehicle"
  | "animal"
  | "stunt"
  | "special_effect"
  | "visual_effect"
  | "sound"
  | "music"
  | "equipment"
  | "other";
export type ScreenplayElementSource = "scene_heading" | "character_cue" | "inline_tag" | "manual";

export type ScreenplayRevision = {
  id: string;
  projectId: string;
  title: string;
  format: ScreenplayFormat;
  sourceFileName: string;
  sourceSizeBytes: number;
  sourceText: string;
  importedAt: string;
  parserVersion: string;
  warnings: string[];
};

export type ScreenplayScene = {
  id: string;
  revisionId: string;
  ordinal: number;
  sceneNumber: string | null;
  heading: string;
  interiorExterior: string | null;
  location: string | null;
  timeOfDay: string | null;
  synopsis: string | null;
  sourceStartLine: number;
  sourceEndLine: number;
  sourceText: string;
};

export type ProductionElement = {
  id: string;
  projectId: string;
  revisionId: string;
  category: ScreenplayElementCategory;
  name: string;
  normalizedName: string;
  source: ScreenplayElementSource;
  reviewState: ScreenplayReviewState;
};

export type SceneElementOccurrence = {
  id: string;
  sceneId: string;
  elementId: string;
  sourceLine: number;
  excerpt: string;
  reviewState: ScreenplayReviewState;
};

export type ScreenplayBreakdown = {
  schemaVersion: 1;
  id: string;
  projectId: string;
  revision: ScreenplayRevision;
  scenes: ScreenplayScene[];
  elements: ProductionElement[];
  occurrences: SceneElementOccurrence[];
  updatedAt: string;
};

export type ScreenplayRevisionSceneStatus = "unchanged" | "changed" | "added" | "removed";
export type ScreenplayRevisionMatchBasis = "scene_number" | "exact_content" | "heading_position";

export type ScreenplayRevisionSceneChange = {
  id: string;
  status: ScreenplayRevisionSceneStatus;
  matchBasis: ScreenplayRevisionMatchBasis | null;
  previousSceneId: string | null;
  nextSceneId: string | null;
  previousOrdinal: number | null;
  nextOrdinal: number | null;
  previousSceneNumber: string | null;
  nextSceneNumber: string | null;
  previousHeading: string | null;
  nextHeading: string | null;
};

export type ScreenplayRevisionElementMatch = {
  previousElementId: string;
  nextElementId: string;
  category: ScreenplayElementCategory;
  name: string;
};

export type ScreenplayRevisionComparison = {
  previousBreakdownId: string;
  nextBreakdownId: string;
  unchangedSceneCount: number;
  changedSceneCount: number;
  addedSceneCount: number;
  removedSceneCount: number;
  sceneChanges: ScreenplayRevisionSceneChange[];
  elementMatches: ScreenplayRevisionElementMatch[];
};

export type ScreenplaySceneSearchMatchKind = "heading" | "source" | "synopsis" | "element";

export type ScreenplaySceneSearchResult = {
  sceneId: string;
  matchKinds: ScreenplaySceneSearchMatchKind[];
  matchingElementIds: string[];
};

export type ScreenplayElementReportScene = {
  id: string;
  ordinal: number;
  sceneNumber: string | null;
  heading: string;
};

export type ScreenplayElementReportOccurrence = {
  id: string;
  sceneId: string;
  sceneOrdinal: number;
  sceneNumber: string | null;
  sceneHeading: string;
  sourceLine: number;
  reviewState: Exclude<ScreenplayReviewState, "dismissed">;
};

export type ScreenplayElementReportRow = {
  elementId: string;
  category: ScreenplayElementCategory;
  name: string;
  source: ScreenplayElementSource;
  reviewState: Exclude<ScreenplayReviewState, "dismissed">;
  occurrenceCount: number;
  confirmedOccurrenceCount: number;
  sceneCount: number;
  scenes: ScreenplayElementReportScene[];
  occurrences: ScreenplayElementReportOccurrence[];
  firstScene: ScreenplayElementReportScene | null;
};

export type ScreenplayElementReport = {
  screenplayBreakdownId: string;
  screenplayRevisionId: string;
  category: ScreenplayElementCategory | null;
  rows: ScreenplayElementReportRow[];
  occurrenceCount: number;
  sceneUseCount: number;
};

export type ScreenplayElementBatchApplySummary = {
  targetSceneId: string;
  requestedCount: number;
  addedCount: number;
  reactivatedCount: number;
  alreadyPresentCount: number;
};

export type ScreenplayElementBatchApplyResult = {
  breakdown: ScreenplayBreakdown;
  summary: ScreenplayElementBatchApplySummary;
};

export type ScreenplayElementDuplicateReason =
  | "normalized_match"
  | "name_containment"
  | "shared_terms"
  | "similar_spelling";

export type ScreenplayElementDuplicateSuggestion = {
  category: ScreenplayElementCategory;
  firstElementId: string;
  firstName: string;
  firstOccurrenceCount: number;
  secondElementId: string;
  secondName: string;
  secondOccurrenceCount: number;
  score: number;
  reasons: ScreenplayElementDuplicateReason[];
};

export type ScreenplayElementDuplicateSuggestionSet = {
  screenplayBreakdownId: string;
  category: ScreenplayElementCategory;
  activeElementCount: number;
  comparedElementCount: number;
  truncated: boolean;
  suggestions: ScreenplayElementDuplicateSuggestion[];
};

export type ScreenplayElementMergeSummary = {
  targetElementId: string;
  targetName: string;
  sourceElementId: string;
  sourceName: string;
  occurrencesReassigned: number;
  occurrenceDuplicatesRemoved: number;
  castDayAnnotationsRelinked: number;
  castDayAnnotationDuplicatesRemoved: number;
  availabilityWindowsRelinked: number;
  availabilityDuplicatesRemoved: number;
  locationsRelinked: number;
  talentRelinked: number;
  historicalCastCallsPreserved: number;
};

export type ScreenplayElementMergeResult = {
  workspace: WorkspaceData;
  summary: ScreenplayElementMergeSummary;
};

export type ScreenplayElementCategoryMoveSummary = {
  elementId: string;
  elementName: string;
  previousCategory: ScreenplayElementCategory;
  nextCategory: ScreenplayElementCategory;
  canonicalElementId: string;
  mergedWithExistingElement: boolean;
  occurrencesReassigned: number;
  occurrenceDuplicatesRemoved: number;
  castDayAnnotationsRelinked: number;
  castDayAnnotationDuplicatesRemoved: number;
  availabilityWindowsRelinked: number;
  availabilityDuplicatesRemoved: number;
  locationsRelinked: number;
  talentRelinked: number;
  historicalCastCallsPreserved: number;
};

export type ScreenplayElementCategoryMoveResult = {
  workspace: WorkspaceData;
  summary: ScreenplayElementCategoryMoveSummary;
};

export type ProductionScheduleStatus = "draft" | "locked";
export type ProductionUnit = "main" | "second";

export type ProductionScheduleScenePart = {
  id: string;
  sceneId: string;
  label: string;
  sourceStartLine: number;
  sourceEndLine: number;
};

export type ProductionShootDay = {
  id: string;
  ordinal: number;
  date: string | null;
  unit: ProductionUnit;
  sceneIds: string[];
  sceneParts?: ProductionScheduleScenePart[];
  notes: string;
};

export type ProductionCastDayStatus = "travel" | "hold";

export type ProductionCastDayAnnotation = {
  elementId: string;
  dayId: string;
  status: ProductionCastDayStatus;
};

export type ProductionScheduleVersion = {
  schemaVersion: 1;
  id: string;
  projectId: string;
  screenplayBreakdownId: string;
  title: string;
  status: ProductionScheduleStatus;
  assumptions: ProductionScheduleAssumptions;
  shootDays: ProductionShootDay[];
  unassignedSceneIds: string[];
  unassignedSceneParts?: ProductionScheduleScenePart[];
  castDayAnnotations?: ProductionCastDayAnnotation[];
  derivedFromScheduleId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductionScheduleStripReference =
  | { kind: "scene"; id: string }
  | { kind: "scene_part"; id: string };

export type ProductionScheduleBatchMoveSummary = {
  targetDayId: string | null;
  requestedCount: number;
  movedCount: number;
  alreadyInTargetCount: number;
};

export type ProductionScheduleBatchMoveResult = {
  schedule: ProductionScheduleVersion;
  summary: ProductionScheduleBatchMoveSummary;
};

export type ProductionScheduleAssumptions = {
  maxScenesPerDay: number;
  maxLocationsPerDay: number;
  maxCastPerDay: number;
  maxConsecutiveShootDays: number;
  companyMoveMinutes: number;
};

export const MICRO_BUDGET_SCHEDULE_ASSUMPTIONS: ProductionScheduleAssumptions = {
  maxScenesPerDay: 6,
  maxLocationsPerDay: 2,
  maxCastPerDay: 8,
  maxConsecutiveShootDays: 6,
  companyMoveMinutes: 90,
};

export type ProductionAvailabilityStatus = "available" | "preferred" | "unavailable";
export type ProductionAvailabilityResourceCategory = "cast" | "location";

export type ProductionAvailabilityWindow = {
  schemaVersion: 1;
  id: string;
  projectId: string;
  screenplayBreakdownId: string;
  elementId: string;
  resourceCategory: ProductionAvailabilityResourceCategory;
  resourceName: string;
  status: ProductionAvailabilityStatus;
  startDate: string;
  endDate: string;
  notes: string;
  derivedFromAvailabilityWindowId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductionScheduleConflict = {
  id: string;
  severity: "blocking" | "warning";
  kind: "resource_unavailable" | "availability_unknown" | "shoot_day_undated" | "cast_cross_unit_conflict";
  scheduleId: string;
  dayId: string;
  dayOrdinal: number;
  date: string | null;
  resourceId: string | null;
  resourceCategory: ProductionAvailabilityResourceCategory | null;
  resourceName: string | null;
  sceneIds: string[];
  message: string;
};

export type ProductionDoodDay = {
  dayId: string;
  dayOrdinal: number;
  date: string | null;
  unit: ProductionUnit;
  state: "work" | "off" | ProductionCastDayStatus;
  sceneIds: string[];
};

export type ProductionDoodRow = {
  elementId: string;
  name: string;
  totalWorkDays: number;
  firstWorkDay: number | null;
  lastWorkDay: number | null;
  spanDays: number;
  idleDays: number;
  travelDays: number;
  holdDays: number;
  days: ProductionDoodDay[];
};

export type ProductionScheduleAnalysis = {
  scheduleId: string;
  screenplayBreakdownId: string;
  blockingConflictCount: number;
  warningConflictCount: number;
  conflicts: ProductionScheduleConflict[];
  doodRows: ProductionDoodRow[];
};

export type ProductionScheduleAssumptionBreach = {
  id: string;
  kind: "scene_limit" | "location_limit" | "cast_limit" | "consecutive_day_limit";
  dayId: string | null;
  dayOrdinal: number | null;
  actual: number;
  limit: number;
  message: string;
};

export type ProductionScheduleScenarioAnalysis = {
  scheduleId: string;
  assumptions: ProductionScheduleAssumptions;
  shootDayCount: number;
  assignedSceneCount: number;
  companyMoveCount: number;
  estimatedCompanyMoveMinutes: number;
  maxScenesInDay: number;
  maxLocationsInDay: number;
  maxCastInDay: number;
  maxConsecutiveShootDays: number;
  blockingConflictCount: number;
  warningConflictCount: number;
  assumptionBreaches: ProductionScheduleAssumptionBreach[];
};

export type ProductionScheduleScenarioMetric = {
  key: keyof Omit<ProductionScheduleScenarioAnalysis, "scheduleId" | "assumptions" | "assumptionBreaches"> | "assumptionBreachCount";
  label: string;
  left: number;
  right: number;
  delta: number;
};

export type ProductionScheduleScenarioComparison = {
  left: ProductionScheduleScenarioAnalysis;
  right: ProductionScheduleScenarioAnalysis;
  metrics: ProductionScheduleScenarioMetric[];
};

export type ProductionBudgetAssumptions = {
  crewDayCostCents: number;
  castDayRateCents: number;
  locationDayRateCents: number;
  equipmentDayCostCents: number;
  companyMoveCostCents: number;
  crewHeadcount: number;
  mealCostPerPersonCents: number;
  contingencyBasisPoints: number;
};

export const EMPTY_PRODUCTION_BUDGET_ASSUMPTIONS: ProductionBudgetAssumptions = {
  crewDayCostCents: 0,
  castDayRateCents: 0,
  locationDayRateCents: 0,
  equipmentDayCostCents: 0,
  companyMoveCostCents: 0,
  crewHeadcount: 0,
  mealCostPerPersonCents: 0,
  contingencyBasisPoints: 0,
};

export type ProductionBudgetScenario = {
  schemaVersion: 1;
  id: string;
  projectId: string;
  productionScheduleId: string;
  title: string;
  assumptions: ProductionBudgetAssumptions;
  derivedFromBudgetScenarioId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ScreenplayRevisionPlanningCollections = {
  productionSchedules: ProductionScheduleVersion[];
  productionAvailability: ProductionAvailabilityWindow[];
  productionBudgetScenarios: ProductionBudgetScenario[];
  productionLocations: ProductionLocation[];
  productionTalent: ProductionTalent[];
  productionShots: ProductionShot[];
};

export type ScreenplayRevisionCarryForwardSummary = {
  schedulesCreated: number;
  budgetScenariosCreated: number;
  availabilityWindowsCreated: number;
  locationsRelinked: number;
  talentRelinked: number;
  shotsRelinked: number;
  locationsUnresolved: number;
  talentUnresolved: number;
  shotsUnresolved: number;
};

export type ScreenplayRevisionCarryForwardResult = ScreenplayRevisionPlanningCollections & {
  comparison: ScreenplayRevisionComparison;
  summary: ScreenplayRevisionCarryForwardSummary;
};

export type ProductionBudgetEstimateLine = {
  key: "crew" | "cast" | "locations" | "equipment" | "company_moves" | "meals";
  label: string;
  units: number;
  unitLabel: string;
  unitCostCents: number;
  totalCents: number;
};

export type ProductionBudgetEstimate = {
  budgetScenarioId: string;
  productionScheduleId: string;
  scheduledShootDays: number;
  castWorkDays: number;
  locationDayUses: number;
  companyMoves: number;
  mealPersonDays: number;
  lines: ProductionBudgetEstimateLine[];
  subtotalCents: number;
  contingencyCents: number;
  totalCents: number;
};

export type ProductionCallSheetStatus = "draft" | "final";

export type ProductionCallSheetCastCall = {
  elementId: string;
  name: string;
  performerName?: string;
  sceneIds: string[];
  callTime: string;
  notes: string;
};

export type ProductionCallSheet = {
  schemaVersion: 1;
  id: string;
  projectId: string;
  productionScheduleId: string;
  screenplayBreakdownId: string;
  shootDayId: string;
  sourceScheduleUpdatedAt: string;
  title: string;
  status: ProductionCallSheetStatus;
  date: string | null;
  callTime: string;
  estimatedWrapTime: string;
  primaryLocation: string;
  parkingInstructions: string;
  nearestHospital: string;
  weatherNotes: string;
  generalNotes: string;
  safetyNotes: string;
  sceneIds: string[];
  sceneParts?: ProductionScheduleScenePart[];
  sceneStripOrder?: string[];
  dayOrdinal: number;
  unit?: ProductionUnit;
  totalShootDays: number;
  castCalls: ProductionCallSheetCastCall[];
  createdAt: string;
  updatedAt: string;
};

export type ProductionCallSheetScene = {
  id: string;
  ordinal: number;
  sceneNumber: string | null;
  heading: string;
  location: string | null;
  timeOfDay: string | null;
  synopsis: string | null;
};

export type ProductionCallSheetManifest = {
  callSheetId: string;
  scenes: ProductionCallSheetScene[];
  castCalls: ProductionCallSheetCastCall[];
  locations: string[];
  missingSceneIds: string[];
};

export type ProductionSidesScene = ProductionCallSheetScene & {
  schedulePartId?: string;
  schedulePartLabel?: string;
  sourceStartLine: number;
  sourceEndLine: number;
  sourceText: string;
  castCalls: ProductionCallSheetCastCall[];
};

export type ProductionSidesManifest = {
  callSheetId: string;
  screenplayBreakdownId: string;
  screenplayRevisionId: string;
  screenplayTitle: string;
  scenes: ProductionSidesScene[];
  missingSceneIds: string[];
};

export type ProductionShotStatus = "planned" | "ready" | "captured" | "omitted";

export type ProductionShot = {
  schemaVersion: 1;
  id: string;
  projectId: string;
  screenplayBreakdownId: string;
  sceneId: string;
  sourceBreakdownUpdatedAt: string;
  ordinal: number;
  shotNumber: string;
  description: string;
  status: ProductionShotStatus;
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
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProductionShotCallSheetUse = {
  callSheetId: string;
  title: string;
  status: ProductionCallSheetStatus;
  date: string | null;
  dayOrdinal: number;
  unit: ProductionUnit;
};

export type ProductionShotManifest = {
  productionShotId: string;
  scene: ProductionCallSheetScene | null;
  scheduleUses: ProductionResourceScheduleUse[];
  callSheetUses: ProductionShotCallSheetUse[];
  sourceMissing: boolean;
  sourceChanged: boolean;
};

export type ProductionLocationStatus = "scouting" | "hold" | "confirmed" | "released";
export type ProductionLocationPermitStatus = "unknown" | "not_required" | "planned" | "submitted" | "approved";

export type ProductionLocation = {
  schemaVersion: 1;
  id: string;
  projectId: string;
  screenplayBreakdownId: string | null;
  screenplayElementId: string | null;
  sourceBreakdownUpdatedAt: string | null;
  name: string;
  status: ProductionLocationStatus;
  address: string;
  contactName: string;
  contactDetails: string;
  permitStatus: ProductionLocationPermitStatus;
  permitNotes: string;
  parkingAccess: string;
  powerNotes: string;
  soundNotes: string;
  restroomNotes: string;
  accessibilityNotes: string;
  nearestHospital: string;
  weatherNotes: string;
  safetyNotes: string;
  generalNotes: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProductionResourceScheduleUse = {
  scheduleId: string;
  scheduleTitle: string;
  scheduleStatus: ProductionScheduleStatus;
  shootDayId: string;
  dayOrdinal: number;
  unit: ProductionUnit;
  date: string | null;
  sceneIds: string[];
};

export type ProductionLocationScheduleUse = ProductionResourceScheduleUse;

export type ProductionLocationManifest = {
  productionLocationId: string;
  scenes: ProductionCallSheetScene[];
  scheduleUses: ProductionLocationScheduleUse[];
  availability: ProductionAvailabilityWindow[];
  sourceMissing: boolean;
  sourceChanged: boolean;
};

export type ProductionTalentStatus = "prospect" | "contacted" | "auditioning" | "offered" | "cast" | "released";
export type ProductionTalentPaperworkStatus = "not_started" | "requested" | "partial" | "complete";
export type ProductionTalentRateBasis = "not_set" | "unpaid" | "flat" | "day" | "week" | "deferred" | "other";

export type ProductionTalent = {
  schemaVersion: 1;
  id: string;
  projectId: string;
  screenplayBreakdownId: string | null;
  screenplayElementId: string | null;
  sourceBreakdownUpdatedAt: string | null;
  characterName: string;
  performerName: string;
  status: ProductionTalentStatus;
  contactName: string;
  contactDetails: string;
  representativeName: string;
  representativeDetails: string;
  paperworkStatus: ProductionTalentPaperworkStatus;
  rateBasis: ProductionTalentRateBasis;
  agreedRateCents: number;
  dealNotes: string;
  travelNotes: string;
  dietaryNotes: string;
  accessibilityNotes: string;
  wardrobeNotes: string;
  generalNotes: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ProductionTalentManifest = {
  productionTalentId: string;
  scenes: ProductionCallSheetScene[];
  scheduleUses: ProductionResourceScheduleUse[];
  availability: ProductionAvailabilityWindow[];
  sourceMissing: boolean;
  sourceChanged: boolean;
};

export type ProductionReportSceneStatus = "planned" | "completed" | "partial" | "held";

export type ProductionReportSceneResult = {
  sceneId: string;
  status: ProductionReportSceneStatus;
  notes: string;
};

export type ProductionDailyReport = {
  schemaVersion: 1;
  id: string;
  projectId: string;
  productionCallSheetId: string;
  productionScheduleId: string;
  screenplayBreakdownId: string;
  sourceCallSheetUpdatedAt: string;
  title: string;
  status: ProductionCallSheetStatus;
  date: string | null;
  dayOrdinal: number;
  unit?: ProductionUnit;
  primaryLocation: string;
  sceneResults: ProductionReportSceneResult[];
  actualCrewCallTime: string | null;
  firstShotTime: string | null;
  mealStartTime: string | null;
  mealEndTime: string | null;
  cameraWrapTime: string | null;
  crewWrapTime: string | null;
  crewCount: number;
  castCount: number;
  backgroundCount: number;
  mealCount: number;
  setupCount: number;
  takeCount: number;
  footageMinutes: number;
  weatherActual: string;
  delayNotes: string;
  productionNotes: string;
  safetyIncidentNotes: string;
  tomorrowNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductionDailyReportSummary = {
  productionReportId: string;
  plannedSceneCount: number;
  completedSceneCount: number;
  partialSceneCount: number;
  heldSceneCount: number;
  remainingSceneCount: number;
  completionPercent: number;
  grossDayMinutes: number;
  mealMinutes: number;
  workingMinutes: number;
};

export type CanonicalWorkspaceSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  persistence: "d1_canonical_workspace_snapshot" | "dry_run_seed_snapshot";
  readPolicy: "workspace_role_and_record_scope";
  workspace: {
    id: string;
    name: string;
    updatedAt: string;
  };
  currentMember: {
    id: string | null;
    role: WorkspaceRole;
  };
  members: CanonicalWorkspaceMember[];
  projects: CanonicalProject[];
  filmProfiles: CanonicalFilmProfile[];
  tasks: CanonicalTask[];
  documents: CanonicalDocument[];
  people: CanonicalPerson[];
  projectPeople: CanonicalProjectPerson[];
  equipment: CanonicalEquipment[];
  expenses: CanonicalExpense[];
  restorePoints: RestorePoint[];
  truncatedCollections: CanonicalWorkspaceCollection[];
};

export type CanonicalWorkspaceCollection =
  | "members"
  | "projects"
  | "filmProfiles"
  | "tasks"
  | "documents"
  | "people"
  | "projectPeople"
  | "equipment"
  | "expenses"
  | "restorePoints";

export type CanonicalWorkspaceMember = {
  id: string;
  displayName: string | null;
  emailHash: string | null;
  role: WorkspaceRole;
  status: "active" | "invited" | "disabled";
  lastSeenAt: string | null;
};

export type CanonicalProject = {
  id: string;
  title: string;
  projectType: string;
  status: string;
  phase: string;
  logline: string | null;
  ownerMemberId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CanonicalFilmProfile = {
  projectId: string;
  runtimeMinutes: number | null;
  format: string | null;
  shootStart: string | null;
  shootEnd: string | null;
  budgetCents: number;
  spentCents: number;
  updatedAt: string;
};

export type CanonicalTask = {
  id: string;
  projectId: string | null;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  assigneeMemberId: string | null;
  ownerMemberId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CanonicalDocument = {
  id: string;
  projectId: string | null;
  title: string;
  documentType: string;
  markdownSnapshot: string | null;
  markdownTruncated: boolean;
  externalUrl: string | null;
  sensitive: boolean;
  ownerMemberId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CanonicalPerson = {
  id: string;
  displayName: string;
  roleTags: string[];
  sensitive: boolean;
  ownerMemberId: string | null;
  updatedAt: string;
};

export type CanonicalProjectPerson = {
  projectId: string;
  personId: string;
  projectRole: string | null;
};

export type CanonicalEquipment = {
  id: string;
  projectId: string | null;
  name: string;
  equipmentType: string | null;
  status: string;
  ownerMemberId: string | null;
  updatedAt: string;
};

export type CanonicalExpense = {
  id: string;
  projectId: string | null;
  category: string;
  spentCents: number;
  budgetCents: number;
  purchasedAt: string | null;
  ownerMemberId: string | null;
  updatedAt: string;
};

export type FilmProject = {
  id: string;
  title: string;
  type: string;
  runtimeMinutes: number;
  format: string;
  phase: ProjectPhase;
  phaseTone: Tone;
  color: Tone;
  starred: boolean;
  progress: number;
  shootDates: string;
  spentBudget: number;
  totalBudget: number;
  location: string;
  workflow: string;
  description: string;
  tasks: {
    done: number;
    total: number;
  };
  timeline: TimelineItem[];
  openTasks: ProjectTask[];
  docs: ProjectDoc[];
  people: ProjectPerson[];
  equipment: EquipmentItem[];
  expenses: ExpenseLine[];
  callSheet: CallSheetSummary;
};

export type TimelineItem = {
  month: string;
  label: ProjectPhase;
  start: number;
  width: number;
  tone: Tone;
};

export type ProjectTask = {
  id: string;
  title: string;
  due: string;
  status: "overdue" | "pending" | "ready";
};

export type ProjectDoc = {
  id: string;
  name: string;
  date: string;
  type: "PDF" | "XLSX" | "MD" | "CSV" | "ASSET";
  sourcePath?: string;
  sourceSizeBytes?: number;
  sourceContentType?: string;
  screenplayBreakdownId?: string;
  attachmentStatus?: "metadata_only" | "staged_local" | "r2_dry_run" | "stored_r2";
  attachmentStorageKey?: string;
  attachmentSha256?: string;
  attachmentStagedAt?: string;
  attachmentR2ObjectKey?: string;
  attachmentCommittedAt?: string;
  markdownSnapshot?: string;
  canonicalUpdatedAt?: string;
};

export type ProjectPerson = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

export type EquipmentItem = {
  id: string;
  name: string;
  status: string;
  statusTone: Tone;
};

export type ExpenseLine = {
  id: string;
  category: string;
  spent: number;
  budget: number;
  percent: number;
};

export type CallSheetSummary = {
  day: string;
  month: string;
  callTime: string;
  wrapTime: string;
  location: string;
  dayNumber: number;
  totalDays: number;
  scenes: number;
  pages: string;
  people: number;
  weather: string;
};

export type RestorePoint = {
  id: string;
  label: string;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  message: string;
  actor: string;
  when: string;
  tone: Tone;
};

export type BackupSnapshot = {
  schemaVersion: 1;
  workspaceId: string;
  createdAt: string;
  data: WorkspaceData;
  secretPolicy: "provider_secrets_excluded";
  attachmentManifest: BackupAttachmentManifest;
  planningExport?: BackupPlanningExport;
};

export type BackupPlanningExport = {
  policy: "d1_planning_rows";
  persistence: string;
  exportedAt: string;
  rowCount: number;
  truncated: boolean;
  records: BackupPlanningRecord[];
};

export type BackupPlanningRecord = {
  kind:
    | "location"
    | "opportunity"
    | "meeting_note"
    | "equipment_request"
    | "show"
    | "merch"
    | "media"
    | "role";
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  sourcePath?: string;
  fields: Record<string, string | number | boolean | null | string[]>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type BackupAttachmentManifest = {
  policy: "metadata_only";
  totalAssets: number;
  stagedLocal: number;
  r2DryRun: number;
  storedR2: number;
  totalSourceBytes: number;
  items: BackupAttachmentItem[];
};

export type BackupAttachmentItem = {
  projectId: string;
  docId: string;
  name: string;
  status: ProjectDoc["attachmentStatus"] | "none";
  sourcePath?: string;
  sizeBytes?: number;
  contentType?: string;
  sha256?: string;
  r2ObjectKey?: string;
};

export type OperationKind =
  | "workspace.seeded"
  | "project.created"
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "document.created"
  | "document.updated"
  | "person.created"
  | "equipment.created"
  | "expense.created"
  | "backup.exported"
  | "restore.dry_run"
  | "import.notion_applied";

export type OperationRecord = {
  id: string;
  workspaceId: string;
  kind: OperationKind;
  entityType: "workspace" | "project" | "task" | "document" | "person" | "equipment" | "expense" | "backup" | "restore_point" | "import";
  entityId: string;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: "queued" | "synced";
};

export type OperationRejection = {
  id: string;
  reason: string;
};

export type OperationBatchValidation = {
  accepted: string[];
  rejected: OperationRejection[];
};

export type RecordMutationEntityType = "project" | "document" | "task" | "person" | "equipment" | "expense";
export type RecordMutationFieldInput = "text" | "textarea" | "number" | "boolean" | "select" | "id" | "list";
export type RecordMutationFieldDefinition = {
  key: string;
  label: string;
  input: RecordMutationFieldInput;
  nullable: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: string[];
  placeholder?: string;
};
export type FilmProfileMutationFieldKey = "runtimeMinutes" | "format" | "shootStart" | "shootEnd" | "budgetCents" | "spentCents";
export type FilmProfileMutationFieldDefinition = RecordMutationFieldDefinition & {
  key: FilmProfileMutationFieldKey;
};

export const RECORD_MUTATION_FIELD_DEFINITIONS: Record<RecordMutationEntityType, RecordMutationFieldDefinition[]> = {
  project: [
    { key: "title", label: "Title", input: "text", nullable: false, maxLength: 180, placeholder: "Project title" },
    { key: "projectType", label: "Project type", input: "text", nullable: false, maxLength: 80, placeholder: "Feature Film" },
    { key: "status", label: "Status", input: "text", nullable: false, maxLength: 40, placeholder: "active" },
    {
      key: "phase",
      label: "Phase",
      input: "select",
      nullable: false,
      options: ["Development", "Pre-Production", "Production", "Post-Production"],
    },
    { key: "logline", label: "Logline", input: "textarea", nullable: true, maxLength: 500, placeholder: "Short project logline" },
  ],
  task: [
    { key: "title", label: "Title", input: "text", nullable: false, maxLength: 180, placeholder: "Task title" },
    { key: "status", label: "Status", input: "select", nullable: false, options: ["overdue", "pending", "ready"] },
    { key: "priority", label: "Priority", input: "select", nullable: false, options: ["low", "normal", "high", "urgent"] },
    { key: "dueAt", label: "Due date", input: "text", nullable: true, maxLength: 80, placeholder: "YYYY-MM-DD or production date" },
    { key: "projectId", label: "Project ID", input: "id", nullable: true, placeholder: "proj_..." },
    { key: "assigneeMemberId", label: "Assignee member ID", input: "id", nullable: true, placeholder: "member_..." },
  ],
  document: [
    { key: "title", label: "Title", input: "text", nullable: false, maxLength: 180, placeholder: "Document title" },
    {
      key: "documentType",
      label: "Document type",
      input: "select",
      nullable: false,
      options: ["native", "google_doc", "uploaded_file", "screenplay", "markdown"],
    },
    { key: "projectId", label: "Project ID", input: "id", nullable: true, placeholder: "proj_..." },
    { key: "sensitive", label: "Sensitive", input: "boolean", nullable: false },
    { key: "externalUrl", label: "External URL", input: "text", nullable: true, maxLength: 500, placeholder: "https://..." },
  ],
  person: [
    { key: "displayName", label: "Display name", input: "text", nullable: false, maxLength: 160, placeholder: "Crew member name" },
    { key: "roleTags", label: "Role tags", input: "list", nullable: false, maxLength: 80, placeholder: "Producer, Director" },
    { key: "sensitive", label: "Sensitive", input: "boolean", nullable: false },
  ],
  equipment: [
    { key: "name", label: "Name", input: "text", nullable: false, maxLength: 160, placeholder: "Equipment name" },
    { key: "equipmentType", label: "Equipment type", input: "text", nullable: true, maxLength: 80, placeholder: "Camera, sound, grip" },
    { key: "status", label: "Status", input: "text", nullable: false, maxLength: 80, placeholder: "Prepped" },
    { key: "projectId", label: "Project ID", input: "id", nullable: true, placeholder: "proj_..." },
    { key: "notes", label: "Notes", input: "textarea", nullable: true, maxLength: 500, placeholder: "Metadata-only gear notes" },
  ],
  expense: [
    { key: "category", label: "Category", input: "text", nullable: false, maxLength: 120, placeholder: "Crew" },
    { key: "amountCents", label: "Amount cents", input: "number", nullable: false, min: 0, max: 100_000_000_000 },
    { key: "purchasedAt", label: "Purchased at", input: "text", nullable: true, maxLength: 80, placeholder: "YYYY-MM-DD" },
    { key: "projectId", label: "Project ID", input: "id", nullable: true, placeholder: "proj_..." },
    { key: "comment", label: "Comment", input: "textarea", nullable: true, maxLength: 500, placeholder: "Metadata-only budget note" },
  ],
};

export function getRecordMutationFieldDefinitions(entityType: RecordMutationEntityType): RecordMutationFieldDefinition[] {
  return RECORD_MUTATION_FIELD_DEFINITIONS[entityType];
}

export function getRecordMutationFieldKeys(entityType: RecordMutationEntityType): string[] {
  return getRecordMutationFieldDefinitions(entityType).map((field) => field.key);
}

export function isRecordMutationFieldKeyForEntity(entityType: RecordMutationEntityType, key: string): boolean {
  return getRecordMutationFieldKeys(entityType).includes(key);
}

export function normalizeRecordMutationFieldKeysForEntity(entityType: RecordMutationEntityType, keys: Iterable<unknown>): string[] {
  const allowed = new Set(getRecordMutationFieldKeys(entityType));
  const normalized = new Set<string>();
  for (const key of keys) {
    if (typeof key !== "string") continue;
    const trimmed = key.trim().slice(0, 80);
    if (allowed.has(trimmed)) {
      normalized.add(trimmed);
    }
    if (normalized.size >= 12) break;
  }
  return [...normalized];
}

export const FILM_PROFILE_MUTATION_FIELD_DEFINITIONS: FilmProfileMutationFieldDefinition[] = [
  { key: "runtimeMinutes", label: "Runtime minutes", input: "number", nullable: true, min: 0, max: 600 },
  { key: "format", label: "Format", input: "text", nullable: true, maxLength: 80, placeholder: "Color, B&W, mixed" },
  { key: "shootStart", label: "Shoot start", input: "text", nullable: true, maxLength: 80, placeholder: "YYYY-MM-DD" },
  { key: "shootEnd", label: "Shoot end", input: "text", nullable: true, maxLength: 80, placeholder: "YYYY-MM-DD" },
  { key: "budgetCents", label: "Budget cents", input: "number", nullable: false, min: 0, max: 100_000_000_000 },
  { key: "spentCents", label: "Spent cents", input: "number", nullable: false, min: 0, max: 100_000_000_000 },
];

export function getFilmProfileMutationFieldDefinitions(): FilmProfileMutationFieldDefinition[] {
  return FILM_PROFILE_MUTATION_FIELD_DEFINITIONS;
}

export function getFilmProfileMutationFieldKeys(): FilmProfileMutationFieldKey[] {
  return FILM_PROFILE_MUTATION_FIELD_DEFINITIONS.map((field) => field.key);
}

export function isFilmProfileMutationFieldKey(key: string): key is FilmProfileMutationFieldKey {
  return getFilmProfileMutationFieldKeys().includes(key as FilmProfileMutationFieldKey);
}

export function normalizeFilmProfileMutationFieldKeys(keys: Iterable<unknown>): FilmProfileMutationFieldKey[] {
  const normalized = new Set<FilmProfileMutationFieldKey>();
  for (const key of keys) {
    if (typeof key !== "string") continue;
    const trimmed = key.trim().slice(0, 80);
    if (isFilmProfileMutationFieldKey(trimmed)) {
      normalized.add(trimmed);
    }
    if (normalized.size >= FILM_PROFILE_MUTATION_FIELD_DEFINITIONS.length) break;
  }
  return [...normalized];
}

const seedProjectShell: Omit<
  FilmProject,
  | "id"
  | "title"
  | "phase"
  | "phaseTone"
  | "color"
  | "progress"
  | "shootDates"
  | "spentBudget"
  | "totalBudget"
  | "tasks"
  | "starred"
  | "description"
> = {
  type: "Feature Film",
  runtimeMinutes: 82,
  format: "Color",
  location: "TBD",
  workflow: "Native docs + Local backups",
  timeline: [
    { month: "Mar", label: "Development", start: 8, width: 22, tone: "blue" },
    { month: "Apr", label: "Pre-Production", start: 34, width: 18, tone: "amber" },
    { month: "May", label: "Production", start: 55, width: 18, tone: "teal" },
    { month: "Jun", label: "Post-Production", start: 75, width: 16, tone: "gray" },
  ],
  openTasks: [
    { id: "task_template_1", title: "Confirm project package", due: "This week", status: "pending" },
    { id: "task_template_2", title: "Review budget top sheet", due: "Next", status: "ready" },
  ],
  docs: [
    { id: "doc_template_treatment", name: "Treatment.md", date: "Draft", type: "MD" },
    { id: "doc_template_budget", name: "Budget top sheet.xlsx", date: "Draft", type: "XLSX" },
  ],
  people: [
    { id: "person_template_producer", name: "Unassigned Producer", role: "Producer", initials: "UP" },
    { id: "person_template_director", name: "Unassigned Director", role: "Director", initials: "UD" },
  ],
  equipment: [
    { id: "equipment_template_camera", name: "Camera package", status: "TBD", statusTone: "gray" },
    { id: "equipment_template_sound", name: "Sound kit", status: "TBD", statusTone: "gray" },
  ],
  expenses: [
    { id: "expense_template_crew", category: "Crew", spent: 0, budget: 10000, percent: 0 },
    { id: "expense_template_equipment", category: "Equipment", spent: 0, budget: 8000, percent: 0 },
  ],
  callSheet: {
    day: "TBD",
    month: "Unscheduled",
    callTime: "TBD",
    wrapTime: "TBD",
    location: "TBD",
    dayNumber: 0,
    totalDays: 0,
    scenes: 0,
    pages: "0",
    people: 0,
    weather: "TBD",
  },
};

export const seedWorkspace: WorkspaceData = {
  id: "workspace_acme",
  name: "Acme Films",
  archivedProjectCount: 1,
  backupPolicy: "Daily at 8:00 AM",
  nextBackup: "In 11h 18m",
  integrations: [
    integration("pool", "Pool", "dry-run", "ready"),
    integration("store", "Store", "dry-run", "ready"),
    integration("stripe", "Stripe", "dry-run", "needs_scope"),
    integration("social", "Meta Insights", "dry-run", "needs_scope"),
    integration("google", "Google Drive", "dry-run", "needs_scope"),
    integration("resend", "Resend", "dry-run", "needs_scope"),
    integration("sms", "Telnyx SMS", "dry-run", "needs_scope"),
  ],
  members: [
    {
      id: "member_owner",
      displayName: "Alonso",
      emailHash: "9b11d8ec2d4f0d9b1ed62ed61f56c4f6d48f8f7bd724b7c364dad5229f7169d6",
      role: "owner",
      status: "active",
      lastSeenAt: "2026-07-07T00:00:00.000Z",
    },
    {
      id: "member_producer",
      displayName: "Sarah R.",
      emailHash: "533a2f5f8025d97f09a49ad74f2b6b0a940b75f7dd81b1b8a2b9234e6c442f12",
      role: "producer",
      status: "active",
      lastSeenAt: "2026-07-06T18:30:00.000Z",
    },
    {
      id: "member_director",
      displayName: "Julia L.",
      emailHash: "118a8a06fe6bbf5c7e6074aa770dc3f2dd46d41d2e34b88e1b82f8b7f37223aa",
      role: "director",
      status: "invited",
      lastSeenAt: null,
    },
  ],
  projects: [
    {
      id: "proj_echoes",
      title: "Echoes in the Static",
      type: "Feature Film",
      runtimeMinutes: 90,
      format: "Color",
      phase: "Production",
      phaseTone: "teal",
      color: "teal",
      starred: true,
      progress: 62,
      shootDates: "May 27 - Jun 14, 2025",
      spentBudget: 82410,
      totalBudget: 120000,
      location: "Los Angeles, CA",
      workflow: "Native docs + Local backups",
      description:
        "A near-future thriller about a sound engineer who uncovers a signal that should not exist.",
      tasks: { done: 18, total: 29 },
      timeline: [
        { month: "Mar", label: "Development", start: 14, width: 16, tone: "blue" },
        { month: "Apr", label: "Pre-Production", start: 31, width: 19, tone: "amber" },
        { month: "May", label: "Production", start: 50, width: 18, tone: "teal" },
        { month: "Jun", label: "Post-Production", start: 69, width: 21, tone: "gray" },
      ],
      openTasks: [
        { id: "task_1", title: "Review final shot list", due: "Overdue", status: "overdue" },
        { id: "task_2", title: "Confirm location permits", due: "May 18", status: "pending" },
        { id: "task_3", title: "Camera test day", due: "May 20", status: "pending" },
        { id: "task_4", title: "Lock picture edit", due: "May 28", status: "ready" },
        { id: "task_5", title: "Sound equipment prep", due: "May 29", status: "ready" },
      ],
      docs: [
        { id: "doc_script_v7", name: "Script v7.pdf", date: "May 2", type: "PDF" },
        { id: "doc_shot_list_v3", name: "Shot List v3.xlsx", date: "May 5", type: "XLSX" },
        { id: "doc_budget_v5", name: "Budget v5.xlsx", date: "May 7", type: "XLSX" },
        { id: "doc_location_scout", name: "Location Scout.pdf", date: "May 9", type: "PDF" },
        { id: "doc_call_sheet_0518", name: "Call Sheet 05-18.pdf", date: "May 17", type: "PDF" },
      ],
      people: [
        { id: "person_julia_lee", name: "Julia Lee", role: "Director", initials: "JL" },
        { id: "person_mateo_cruz", name: "Mateo Cruz", role: "DP", initials: "MC" },
        { id: "person_sarah_reyes", name: "Sarah Reyes", role: "Producer", initials: "SR" },
        { id: "person_daniel_watts", name: "Daniel Watts", role: "Production Designer", initials: "DW" },
        { id: "person_alex_kim", name: "Alex Kim", role: "1st AD", initials: "AK" },
      ],
      equipment: [
        { id: "equipment_arri_alexa_mini_lf", name: "ARRI Alexa Mini LF", status: "Prepped", statusTone: "teal" },
        { id: "equipment_zeiss_supreme_prime_set", name: "Zeiss Supreme Prime Set", status: "Prepped", statusTone: "teal" },
        { id: "equipment_aputure_600d_2x", name: "Aputure 600d (2x)", status: "Kit", statusTone: "amber" },
        { id: "equipment_dji_ronin_4d", name: "DJI Ronin 4D", status: "Checked Out", statusTone: "blue" },
        { id: "equipment_sennheiser_avx_kit", name: "Sennheiser AVX Kit", status: "Kit", statusTone: "amber" },
      ],
      expenses: [
        { id: "expense_crew", category: "Crew", spent: 28540, budget: 45000, percent: 63 },
        { id: "expense_equipment", category: "Equipment", spent: 18230, budget: 24000, percent: 76 },
        { id: "expense_locations", category: "Locations", spent: 9640, budget: 15000, percent: 64 },
        { id: "expense_other", category: "Other", spent: 7000, budget: 11000, percent: 64 },
      ],
      callSheet: {
        day: "18",
        month: "May 2025",
        callTime: "7:00 AM",
        wrapTime: "7:00 PM",
        location: "Riverside Warehouse, 1420 Dock St, Los Angeles, CA",
        dayNumber: 12,
        totalDays: 15,
        scenes: 4,
        pages: "5 3/8",
        people: 28,
        weather: "68 / Sunny",
      },
    },
    makeProject("proj_midnight", "Midnight Roads", "Pre-Production", "amber", 34, "Aug 11 - Aug 29, 2025", 46300, 95000, 12, 35),
    makeProject("proj_glassline", "Glassline", "Development", "blue", 18, "TBD", 6200, 35000, 5, 22),
    makeProject("proj_last_light", "The Last Light", "Post-Production", "gray", 76, "Wrapped", 38550, 60000, 14, 18),
  ],
  screenplayBreakdowns: [],
  productionSchedules: [],
  productionAvailability: [],
  productionBudgetScenarios: [],
  productionCallSheets: [],
  productionReports: [],
  productionLocations: [],
  productionTalent: [],
  productionShots: [],
  restorePoints: [
    {
      id: "restore_latest",
      label: "May 18, 2025 at 8:42 AM (Latest)",
      createdAt: "2025-05-18T08:42:00.000Z",
    },
    { id: "restore_prior", label: "May 17, 2025 at 8:00 AM", createdAt: "2025-05-17T08:00:00.000Z" },
  ],
  auditLog: [
    {
      id: "audit_seed_backup",
      message: "Backup completed",
      actor: "System",
      tone: "teal",
      when: "May 18, 8:42 AM",
    },
    {
      id: "audit_seed_call_sheet",
      message: "Call Sheet 05-17.pdf updated",
      actor: "Sarah R.",
      tone: "blue",
      when: "May 17, 6:21 PM",
    },
    {
      id: "audit_seed_budget",
      message: "Budget v5.xlsx updated",
      actor: "Mateo C.",
      tone: "amber",
      when: "May 17, 2:11 PM",
    },
    {
      id: "audit_seed_equipment",
      message: "Equipment list updated",
      actor: "Alex K.",
      tone: "gray",
      when: "May 16, 11:03 AM",
    },
  ],
};

export const dustWaveWorkspace: WorkspaceData = makeDustWaveWorkspace();

export function createBackupSnapshot(
  data: WorkspaceData,
  options: { planningExport?: BackupPlanningExport } = {},
): BackupSnapshot {
  const sanitizedData = sanitizeBackupData(data) as WorkspaceData;
  const sanitizedPlanningExport = options.planningExport
    ? sanitizeBackupData(options.planningExport) as BackupPlanningExport
    : undefined;
  return {
    schemaVersion: 1,
    workspaceId: sanitizedData.id,
    createdAt: new Date().toISOString(),
    data: sanitizedData,
    secretPolicy: "provider_secrets_excluded",
    attachmentManifest: createAttachmentBackupManifest(sanitizedData),
    ...(sanitizedPlanningExport ? { planningExport: sanitizedPlanningExport } : {}),
  };
}

function sanitizeBackupData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeBackupData(item));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, childValue] of Object.entries(value)) {
      if (isBackupSecretKey(key)) {
        continue;
      }
      output[key] = sanitizeBackupData(childValue);
    }
    return output;
  }

  if (typeof value === "string" && isSecretLikeBackupValue(value)) {
    return "[redacted]";
  }

  return value;
}

function isBackupSecretKey(key: string): boolean {
  if (key === "secretPolicy" || key === "secretsPolicy") {
    return false;
  }
  const normalizedKey = key.toLowerCase();
  if (normalizedKey.endsWith("secrets") || normalizedKey.endsWith("credentials")) {
    return true;
  }

  return [
    /(^|_)(access|refresh|id)?_?token$/i,
    /(^|_)(api|client|consumer|webhook|signing)_?secret$/i,
    /(^|_)(api|secret|private)_?key$/i,
    /^authorization$/i,
    /^bearer$/i,
    /^password$/i,
    /^secret$/i,
  ].some((pattern) => pattern.test(key));
}

function isSecretLikeBackupValue(value: string): boolean {
  return /sk_live_[A-Za-z0-9_]+/.test(value)
    || /AIza[0-9A-Za-z_-]+/.test(value)
    || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value);
}

export function createAttachmentBackupManifest(data: WorkspaceData): BackupAttachmentManifest {
  const items: BackupAttachmentItem[] = data.projects.flatMap((project) =>
    project.docs
      .filter((doc) => doc.type === "ASSET")
      .map((doc) => ({
        projectId: project.id,
        docId: doc.id,
        name: doc.name,
        status: doc.attachmentStatus ?? "none",
        sourcePath: doc.sourcePath,
        sizeBytes: doc.sourceSizeBytes,
        contentType: doc.sourceContentType,
        sha256: doc.attachmentSha256,
        r2ObjectKey: doc.attachmentR2ObjectKey,
      })),
  );

  return {
    policy: "metadata_only",
    totalAssets: items.length,
    stagedLocal: items.filter((item) => item.status === "staged_local").length,
    r2DryRun: items.filter((item) => item.status === "r2_dry_run").length,
    storedR2: items.filter((item) => item.status === "stored_r2").length,
    totalSourceBytes: items.reduce((total, item) => total + (item.sizeBytes ?? 0), 0),
    items,
  };
}

export function createTask(title: string, due = "Unscheduled"): ProjectTask {
  return {
    id: `task_${cryptoSafeId()}`,
    title: title.trim().slice(0, 180) || "Untitled task",
    due: due.trim().slice(0, 80) || "Unscheduled",
    status: "pending",
  };
}

export function createProjectDoc(
  name: string,
  type: ProjectDoc["type"] = "MD",
  options: Partial<
    Pick<
      ProjectDoc,
      | "date"
      | "sourcePath"
      | "sourceSizeBytes"
      | "sourceContentType"
      | "screenplayBreakdownId"
      | "attachmentStatus"
      | "attachmentStorageKey"
      | "attachmentSha256"
      | "attachmentStagedAt"
      | "attachmentR2ObjectKey"
      | "attachmentCommittedAt"
      | "markdownSnapshot"
    >
  > = {},
): ProjectDoc {
  const normalizedName = ensureExtension(name, type);
  return {
    id: `doc_${cryptoSafeId()}`,
    name: normalizedName,
    date: options.date ?? "Draft",
    type,
    sourcePath: options.sourcePath,
    sourceSizeBytes: options.sourceSizeBytes,
    sourceContentType: options.sourceContentType,
    screenplayBreakdownId: options.screenplayBreakdownId,
    attachmentStatus: options.attachmentStatus,
    attachmentStorageKey: options.attachmentStorageKey,
    attachmentSha256: options.attachmentSha256,
    attachmentStagedAt: options.attachmentStagedAt,
    attachmentR2ObjectKey: options.attachmentR2ObjectKey,
    attachmentCommittedAt: options.attachmentCommittedAt,
    markdownSnapshot: options.markdownSnapshot,
  };
}

export function createProjectPerson(name: string, role: string): ProjectPerson {
  const normalizedName = name.trim().slice(0, 120) || "New person";
  const normalizedRole = role.trim().slice(0, 80) || "Crew";
  return {
    id: `person_${slugify(normalizedName)}_${cryptoSafeId()}`,
    name: normalizedName,
    role: normalizedRole,
    initials: initialsForName(normalizedName),
  };
}

export function createEquipmentItem(name: string, status = "Planned"): EquipmentItem {
  const normalizedName = name.trim().slice(0, 120) || "New equipment";
  return {
    id: `equipment_${slugify(normalizedName)}_${cryptoSafeId()}`,
    name: normalizedName,
    status: status.trim().slice(0, 80) || "Planned",
    statusTone: "gray",
  };
}

export function createExpenseLine(category: string, spent: number, budget: number): ExpenseLine {
  const safeSpent = normalizeMoney(spent);
  const safeBudget = normalizeMoney(budget);
  const percent = safeBudget > 0 ? Math.min(100, Math.round((safeSpent / safeBudget) * 100)) : 0;
  const normalizedCategory = category.trim().slice(0, 80) || "Other";
  return {
    id: `expense_${slugify(normalizedCategory)}_${cryptoSafeId()}`,
    category: normalizedCategory,
    spent: safeSpent,
    budget: safeBudget,
    percent,
  };
}

export function createFilmProjectFromTemplate(title: string, projectType = "Feature Film"): FilmProject {
  const normalizedTitle = title.trim().slice(0, 160) || "Untitled Film";
  const normalizedProjectType = projectType.trim().slice(0, 80) || "Feature Film";
  const id = `proj_${slugify(normalizedTitle)}_${cryptoSafeId()}`;

  return {
    ...clone(seedProjectShell),
    id,
    title: normalizedTitle,
    type: normalizedProjectType,
    phase: "Development",
    phaseTone: "blue",
    color: "blue",
    progress: 8,
    shootDates: "TBD",
    spentBudget: 0,
    totalBudget: 25000,
    tasks: { done: 0, total: 2 },
    starred: false,
    description: `${normalizedTitle} is staged from the reusable film project template.`,
  };
}

export function createOperation(
  workspaceId: string,
  kind: OperationKind,
  entityType: OperationRecord["entityType"],
  entityId: string,
  summary: string,
  payload: Record<string, unknown> = {},
): OperationRecord {
  return {
    id: `op_${cryptoSafeId()}`,
    workspaceId,
    kind,
    entityType,
    entityId,
    summary,
    payload,
    createdAt: new Date().toISOString(),
    status: "queued",
  };
}

export function validateOperationBatchForSync(operations: OperationRecord[]): OperationBatchValidation {
  const accepted: string[] = [];
  const rejected: OperationRejection[] = [];

  for (const operation of operations) {
    const reason = validateOperationForSync(operation);
    if (reason) {
      rejected.push({ id: operation?.id ?? "unknown", reason });
    } else {
      accepted.push(operation.id);
    }
  }

  return { accepted, rejected };
}

export function createProductionScheduleFromBreakdown(
  breakdown: ScreenplayBreakdown,
  title = "Schedule 1",
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  return {
    schemaVersion: 1,
    id: `production_schedule_${cryptoSafeId()}`,
    projectId: breakdown.projectId,
    screenplayBreakdownId: breakdown.id,
    title: normalizeScheduleTitle(title),
    status: "draft",
    assumptions: { ...MICRO_BUDGET_SCHEDULE_ASSUMPTIONS },
    shootDays: [createProductionShootDay(1)],
    unassignedSceneIds: breakdown.scenes.map((scene) => scene.id),
    unassignedSceneParts: [],
    castDayAnnotations: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function orderScreenplayScenesByProductionSchedule(
  breakdown: ScreenplayBreakdown,
  schedule: ProductionScheduleVersion | null,
): ScreenplayScene[] {
  if (!schedule || schedule.screenplayBreakdownId !== breakdown.id || schedule.projectId !== breakdown.projectId) {
    return [...breakdown.scenes];
  }
  const scenesById = new Map(breakdown.scenes.map((scene) => [scene.id, scene]));
  const seenSceneIds = new Set<string>();
  const orderedScenes: ScreenplayScene[] = [];
  const appendScene = (sceneId: string): void => {
    const scene = scenesById.get(sceneId);
    if (!scene || seenSceneIds.has(scene.id)) return;
    seenSceneIds.add(scene.id);
    orderedScenes.push(scene);
  };
  for (const day of schedule.shootDays) {
    day.sceneIds.forEach(appendScene);
    (day.sceneParts ?? []).forEach((part) => appendScene(part.sceneId));
  }
  schedule.unassignedSceneIds.forEach(appendScene);
  (schedule.unassignedSceneParts ?? []).forEach((part) => appendScene(part.sceneId));
  breakdown.scenes.forEach((scene) => appendScene(scene.id));
  return orderedScenes;
}

export function duplicateProductionSchedule(
  schedule: ProductionScheduleVersion,
  title = `${schedule.title} Copy`,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  const duplicateParts = (parts: ProductionScheduleScenePart[] | undefined): ProductionScheduleScenePart[] => (parts ?? []).map((part) => {
    const id = `production_scene_part_${cryptoSafeId()}`;
    return { ...clone(part), id };
  });
  const dayIdBySource = new Map(schedule.shootDays.map((day) => [day.id, `production_day_${cryptoSafeId()}`]));
  return {
    ...clone(schedule),
    id: `production_schedule_${cryptoSafeId()}`,
    title: normalizeScheduleTitle(title),
    status: "draft",
    shootDays: schedule.shootDays.map((day, index) => ({
      ...clone(day),
      id: dayIdBySource.get(day.id)!,
      ordinal: index + 1,
      sceneParts: duplicateParts(day.sceneParts),
    })),
    unassignedSceneParts: duplicateParts(schedule.unassignedSceneParts),
    castDayAnnotations: normalizeProductionCastDayAnnotations(schedule.castDayAnnotations, new Set(schedule.shootDays.map((day) => day.id)))
      .flatMap((annotation): ProductionCastDayAnnotation[] => {
        const dayId = dayIdBySource.get(annotation.dayId);
        return dayId ? [{ ...annotation, dayId }] : [];
      }),
    createdAt: now,
    updatedAt: now,
  };
}

export function addProductionShootDay(
  schedule: ProductionScheduleVersion,
  date: string | null = null,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === "locked") return schedule;
  return {
    ...schedule,
    shootDays: [...schedule.shootDays, createProductionShootDay(schedule.shootDays.length + 1, date)],
    updatedAt: now,
  };
}

export function updateProductionShootDay(
  schedule: ProductionScheduleVersion,
  dayId: string,
  patch: { date?: string | null; notes?: string; unit?: ProductionUnit },
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === "locked") return schedule;
  const day = schedule.shootDays.find((candidate) => candidate.id === dayId);
  if (!day) return schedule;
  const date = patch.date === undefined ? day.date : normalizeShootDayDate(patch.date);
  const notes = patch.notes === undefined ? day.notes : patch.notes.trim().slice(0, 1_000);
  const unit = patch.unit === undefined ? normalizeProductionUnit(day.unit) : normalizeProductionUnit(patch.unit);
  return {
    ...schedule,
    shootDays: schedule.shootDays.map((candidate) => candidate.id === dayId ? { ...candidate, date, notes, unit } : candidate),
    updatedAt: now,
  };
}

export function setProductionScheduleStatus(
  schedule: ProductionScheduleVersion,
  status: ProductionScheduleStatus,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === status) return schedule;
  return { ...schedule, status, updatedAt: now };
}

export function updateProductionScheduleAssumptions(
  schedule: ProductionScheduleVersion,
  patch: Partial<ProductionScheduleAssumptions>,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === "locked") return schedule;
  return {
    ...schedule,
    assumptions: normalizeProductionScheduleAssumptions({ ...schedule.assumptions, ...patch }),
    updatedAt: now,
  };
}

export function normalizeProductionScheduleVersion(schedule: ProductionScheduleVersion): ProductionScheduleVersion {
  const dayIds = new Set(schedule.shootDays.map((day) => day.id));
  return {
    ...schedule,
    assumptions: normalizeProductionScheduleAssumptions(schedule.assumptions ?? {}),
    shootDays: schedule.shootDays.map((day) => ({
      ...day,
      unit: normalizeProductionUnit(day.unit),
      sceneParts: normalizeProductionScheduleSceneParts(day.sceneParts),
    })),
    unassignedSceneParts: normalizeProductionScheduleSceneParts(schedule.unassignedSceneParts),
    castDayAnnotations: normalizeProductionCastDayAnnotations(schedule.castDayAnnotations, dayIds),
  };
}

export function setProductionScheduleCastDayStatus(
  schedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
  elementId: string,
  dayId: string,
  status: ProductionCastDayStatus | null,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === "locked") return schedule;
  if (schedule.projectId !== breakdown.projectId || schedule.screenplayBreakdownId !== breakdown.id) {
    throw new Error("Cast day status requires the schedule's screenplay breakdown.");
  }
  const element = breakdown.elements.find((candidate) => candidate.id === elementId);
  if (!element || element.category !== "cast" || element.reviewState === "dismissed") {
    throw new Error("Cast day status requires an active cast element.");
  }
  const day = schedule.shootDays.find((candidate) => candidate.id === dayId);
  if (!day) throw new Error("Cast day status requires a shoot day from this schedule.");
  if (status !== null && status !== "travel" && status !== "hold") {
    throw new Error("Cast day status must be Travel, Hold, or Off.");
  }
  const requirements = buildScheduleResourceRequirements(schedule, breakdown);
  if (requirements.requiredResourceIdsByDay.get(day.id)?.has(element.id)) {
    throw new Error(`${element.name} is working on Day ${day.ordinal}; Work is derived from assigned scenes.`);
  }
  const annotations = normalizeProductionCastDayAnnotations(
    schedule.castDayAnnotations,
    new Set(schedule.shootDays.map((candidate) => candidate.id)),
  ).filter((annotation) => annotation.elementId !== element.id || annotation.dayId !== day.id);
  if (status !== null) {
    if (annotations.length >= 5_000) throw new Error("Cast day status blocked by the 5,000-annotation safety cap.");
    annotations.push({ elementId: element.id, dayId: day.id, status });
  }
  return { ...schedule, castDayAnnotations: annotations, updatedAt: now };
}

function normalizeProductionCastDayAnnotations(
  annotations: ProductionCastDayAnnotation[] | undefined,
  validDayIds: ReadonlySet<string>,
): ProductionCastDayAnnotation[] {
  const normalized = new Map<string, ProductionCastDayAnnotation>();
  for (const annotation of annotations ?? []) {
    if (
      !annotation
      || typeof annotation.elementId !== "string"
      || !annotation.elementId
      || typeof annotation.dayId !== "string"
      || !validDayIds.has(annotation.dayId)
      || (annotation.status !== "travel" && annotation.status !== "hold")
    ) continue;
    normalized.set(`${annotation.elementId}\u0000${annotation.dayId}`, {
      elementId: annotation.elementId,
      dayId: annotation.dayId,
      status: annotation.status,
    });
  }
  return [...normalized.values()].slice(0, 5_000);
}

export function removeProductionShootDay(
  schedule: ProductionScheduleVersion,
  dayId: string,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === "locked") return schedule;
  const removed = schedule.shootDays.find((day) => day.id === dayId);
  if (!removed) return schedule;
  const shootDays = schedule.shootDays
    .filter((day) => day.id !== dayId)
    .map((day, index) => ({ ...day, ordinal: index + 1 }));
  return {
    ...schedule,
    shootDays,
    unassignedSceneIds: uniqueStrings([...schedule.unassignedSceneIds, ...removed.sceneIds]),
    unassignedSceneParts: [...(schedule.unassignedSceneParts ?? []), ...(removed.sceneParts ?? [])],
    castDayAnnotations: (schedule.castDayAnnotations ?? []).filter((annotation) => annotation.dayId !== dayId),
    updatedAt: now,
  };
}

export function moveProductionScheduleScene(
  schedule: ProductionScheduleVersion,
  sceneId: string,
  targetDayId: string | null,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === "locked") return schedule;
  const sceneExists = schedule.unassignedSceneIds.includes(sceneId)
    || schedule.shootDays.some((day) => day.sceneIds.includes(sceneId));
  if (!sceneExists) return schedule;
  const targetExists = targetDayId === null || schedule.shootDays.some((day) => day.id === targetDayId);
  if (!targetExists) return schedule;

  const shootDays = schedule.shootDays.map((day) => ({
    ...day,
    sceneIds: day.sceneIds.filter((candidate) => candidate !== sceneId),
  }));
  const unassignedSceneIds = schedule.unassignedSceneIds.filter((candidate) => candidate !== sceneId);
  if (targetDayId === null) {
    unassignedSceneIds.push(sceneId);
  } else {
    shootDays.find((day) => day.id === targetDayId)?.sceneIds.push(sceneId);
  }
  return { ...schedule, shootDays, unassignedSceneIds, updatedAt: now };
}

export function reorderProductionScheduleScene(
  schedule: ProductionScheduleVersion,
  sceneId: string,
  direction: -1 | 1,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === "locked") return schedule;
  const next = clone(schedule);
  const sceneIds = next.unassignedSceneIds.includes(sceneId)
    ? next.unassignedSceneIds
    : next.shootDays.find((day) => day.sceneIds.includes(sceneId))?.sceneIds;
  if (!sceneIds) return schedule;
  const currentIndex = sceneIds.indexOf(sceneId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sceneIds.length) return schedule;
  [sceneIds[currentIndex], sceneIds[targetIndex]] = [sceneIds[targetIndex]!, sceneIds[currentIndex]!];
  next.updatedAt = now;
  return next;
}

export function splitProductionScheduleScene(
  schedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
  sceneId: string,
  splitAfterLine: number,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === "locked") return schedule;
  if (schedule.projectId !== breakdown.projectId || schedule.screenplayBreakdownId !== breakdown.id) {
    throw new Error("Scene splitting requires the schedule's screenplay revision.");
  }
  const scene = breakdown.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) throw new Error("The scene to split was not found.");
  if (productionScheduleSceneParts(schedule).some((part) => part.sceneId === sceneId)) {
    throw new Error("This scene is already split. Merge it before creating another split.");
  }
  const source = schedule.unassignedSceneIds.includes(sceneId)
    ? { dayId: null as string | null }
    : schedule.shootDays.find((day) => day.sceneIds.includes(sceneId))
      ? { dayId: schedule.shootDays.find((day) => day.sceneIds.includes(sceneId))!.id }
      : null;
  if (!source) throw new Error("Only a scheduled or unassigned scene can be split.");
  if (!Number.isInteger(splitAfterLine) || splitAfterLine < scene.sourceStartLine || splitAfterLine >= scene.sourceEndLine) {
    throw new Error(`Split after a source line from ${scene.sourceStartLine} through ${Math.max(scene.sourceStartLine, scene.sourceEndLine - 1)}.`);
  }
  const parts: ProductionScheduleScenePart[] = [
    {
      id: `production_scene_part_${cryptoSafeId()}`,
      sceneId,
      label: "A",
      sourceStartLine: scene.sourceStartLine,
      sourceEndLine: splitAfterLine,
    },
    {
      id: `production_scene_part_${cryptoSafeId()}`,
      sceneId,
      label: "B",
      sourceStartLine: splitAfterLine + 1,
      sourceEndLine: scene.sourceEndLine,
    },
  ];
  return {
    ...schedule,
    shootDays: schedule.shootDays.map((day) => ({
      ...day,
      sceneIds: day.sceneIds.filter((candidate) => candidate !== sceneId),
      sceneParts: day.id === source.dayId ? [...(day.sceneParts ?? []), ...parts] : [...(day.sceneParts ?? [])],
    })),
    unassignedSceneIds: schedule.unassignedSceneIds.filter((candidate) => candidate !== sceneId),
    unassignedSceneParts: source.dayId === null ? [...(schedule.unassignedSceneParts ?? []), ...parts] : [...(schedule.unassignedSceneParts ?? [])],
    updatedAt: now,
  };
}

export function moveProductionScheduleScenePart(
  schedule: ProductionScheduleVersion,
  scenePartId: string,
  targetDayId: string | null,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === "locked") return schedule;
  const targetExists = targetDayId === null || schedule.shootDays.some((day) => day.id === targetDayId);
  if (!targetExists) return schedule;
  const part = productionScheduleSceneParts(schedule).find((candidate) => candidate.id === scenePartId);
  if (!part) return schedule;
  const shootDays = schedule.shootDays.map((day) => ({
    ...day,
    sceneParts: (day.sceneParts ?? []).filter((candidate) => candidate.id !== scenePartId),
  }));
  const unassignedSceneParts = (schedule.unassignedSceneParts ?? []).filter((candidate) => candidate.id !== scenePartId);
  if (targetDayId === null) {
    unassignedSceneParts.push(part);
  } else {
    shootDays.find((day) => day.id === targetDayId)?.sceneParts?.push(part);
  }
  return { ...schedule, shootDays, unassignedSceneParts, updatedAt: now };
}

export function moveProductionScheduleStrips(
  schedule: ProductionScheduleVersion,
  stripReferences: ProductionScheduleStripReference[],
  targetDayId: string | null,
  now = new Date().toISOString(),
): ProductionScheduleBatchMoveResult {
  const uniqueReferences = new Map<string, ProductionScheduleStripReference>();
  for (const reference of stripReferences) {
    const id = reference?.id?.trim();
    if (!id || (reference.kind !== "scene" && reference.kind !== "scene_part")) {
      throw new Error("Batch strip movement requires valid scene or scene-part references.");
    }
    uniqueReferences.set(`${reference.kind}:${id}`, { kind: reference.kind, id } as ProductionScheduleStripReference);
  }
  const requestedReferences = [...uniqueReferences.values()];
  if (!requestedReferences.length) throw new Error("Batch strip movement requires at least one strip.");
  if (requestedReferences.length > 200) throw new Error("Batch strip movement is limited to 200 strips at a time.");
  if (targetDayId !== null && !schedule.shootDays.some((day) => day.id === targetDayId)) {
    throw new Error("The batch strip destination was not found in this schedule.");
  }

  const locatedReferences = requestedReferences.map((reference) => {
    if (reference.kind === "scene") {
      if (schedule.unassignedSceneIds.includes(reference.id)) return { reference, dayId: null as string | null };
      const day = schedule.shootDays.find((candidate) => candidate.sceneIds.includes(reference.id));
      if (day) return { reference, dayId: day.id as string | null };
    } else {
      if ((schedule.unassignedSceneParts ?? []).some((part) => part.id === reference.id)) {
        return { reference, dayId: null as string | null };
      }
      const day = schedule.shootDays.find((candidate) => candidate.sceneParts?.some((part) => part.id === reference.id));
      if (day) return { reference, dayId: day.id as string | null };
    }
    throw new Error("A selected strip was not found in this schedule.");
  });
  const alreadyInTargetCount = locatedReferences.filter(({ dayId }) => dayId === targetDayId).length;
  const plannedMoveCount = requestedReferences.length - alreadyInTargetCount;
  const summary: ProductionScheduleBatchMoveSummary = {
    targetDayId,
    requestedCount: requestedReferences.length,
    movedCount: schedule.status === "locked" ? 0 : plannedMoveCount,
    alreadyInTargetCount,
  };
  if (schedule.status === "locked" || plannedMoveCount === 0) return { schedule, summary };

  let next = schedule;
  for (const { reference, dayId } of locatedReferences) {
    if (dayId === targetDayId) continue;
    next = reference.kind === "scene"
      ? moveProductionScheduleScene(next, reference.id, targetDayId, now)
      : moveProductionScheduleScenePart(next, reference.id, targetDayId, now);
  }
  return { schedule: next, summary };
}

export function reorderProductionScheduleScenePart(
  schedule: ProductionScheduleVersion,
  scenePartId: string,
  direction: -1 | 1,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === "locked") return schedule;
  const next = clone(schedule);
  const sceneParts = next.unassignedSceneParts?.some((part) => part.id === scenePartId)
    ? next.unassignedSceneParts
    : next.shootDays.find((day) => day.sceneParts?.some((part) => part.id === scenePartId))?.sceneParts;
  if (!sceneParts) return schedule;
  const currentIndex = sceneParts.findIndex((part) => part.id === scenePartId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sceneParts.length) return schedule;
  [sceneParts[currentIndex], sceneParts[targetIndex]] = [sceneParts[targetIndex]!, sceneParts[currentIndex]!];
  next.updatedAt = now;
  return next;
}

export function mergeProductionScheduleSceneParts(
  schedule: ProductionScheduleVersion,
  sceneId: string,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  if (schedule.status === "locked") return schedule;
  if (!productionScheduleSceneParts(schedule).some((part) => part.sceneId === sceneId)) return schedule;
  return {
    ...schedule,
    shootDays: schedule.shootDays.map((day) => ({
      ...day,
      sceneParts: (day.sceneParts ?? []).filter((part) => part.sceneId !== sceneId),
    })),
    unassignedSceneIds: uniqueStrings([...schedule.unassignedSceneIds, sceneId]),
    unassignedSceneParts: (schedule.unassignedSceneParts ?? []).filter((part) => part.sceneId !== sceneId),
    updatedAt: now,
  };
}

export function reconcileProductionScheduleScenes(
  schedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
): ProductionScheduleVersion {
  const scenesById = new Map(breakdown.scenes.map((scene) => [scene.id, scene]));
  const knownSceneIds = new Set(scenesById.keys());
  const seenPartIds = new Set<string>();
  const takeKnownSceneParts = (parts: ProductionScheduleScenePart[] | undefined): ProductionScheduleScenePart[] => (
    normalizeProductionScheduleSceneParts(parts).flatMap((part) => {
      const scene = scenesById.get(part.sceneId);
      if (!scene || seenPartIds.has(part.id)) return [];
      const sourceStartLine = Math.max(scene.sourceStartLine, part.sourceStartLine);
      const sourceEndLine = Math.min(scene.sourceEndLine, part.sourceEndLine);
      if (sourceStartLine > sourceEndLine) return [];
      seenPartIds.add(part.id);
      return [{ ...part, sourceStartLine, sourceEndLine }];
    })
  );
  const dayParts = schedule.shootDays.map((day) => takeKnownSceneParts(day.sceneParts));
  const unassignedSceneParts = takeKnownSceneParts(schedule.unassignedSceneParts);
  const splitSceneIds = new Set([...dayParts.flat(), ...unassignedSceneParts].map((part) => part.sceneId));
  const seen = new Set<string>();
  const takeKnownSceneIds = (sceneIds: string[]): string[] => sceneIds.filter((sceneId) => {
    if (!knownSceneIds.has(sceneId) || splitSceneIds.has(sceneId) || seen.has(sceneId)) return false;
    seen.add(sceneId);
    return true;
  });
  const shootDays = schedule.shootDays.map((day, index) => ({
    ...day,
    ordinal: index + 1,
    sceneIds: takeKnownSceneIds(day.sceneIds),
    sceneParts: dayParts[index] ?? [],
  }));
  const unassignedSceneIds = takeKnownSceneIds(schedule.unassignedSceneIds);
  for (const scene of breakdown.scenes) {
    if (!seen.has(scene.id) && !splitSceneIds.has(scene.id)) unassignedSceneIds.push(scene.id);
  }
  return {
    ...schedule,
    projectId: breakdown.projectId,
    screenplayBreakdownId: breakdown.id,
    shootDays,
    unassignedSceneIds,
    unassignedSceneParts,
  };
}

export function aggregateScreenplayReviewState(states: ScreenplayReviewState[]): ScreenplayReviewState {
  if (states.length === 0 || states.some((state) => state === "suggested")) return "suggested";
  if (states.every((state) => state === "dismissed")) return "dismissed";
  return "confirmed";
}

export function normalizeScreenplayElementName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleUpperCase("en-US");
}

export function addExistingScreenplayElementOccurrence(
  breakdown: ScreenplayBreakdown,
  sceneId: string,
  elementId: string,
  options: { excerpt?: string; sourceLine?: number } = {},
  now = new Date().toISOString(),
): ScreenplayBreakdown {
  const scene = breakdown.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) throw new Error("Screenplay element reuse requires a scene from the selected revision.");
  const element = breakdown.elements.find((candidate) => candidate.id === elementId);
  if (!element) throw new Error("Screenplay element reuse requires an element from the selected revision.");
  const matchingOccurrences = breakdown.occurrences.filter((occurrence) => (
    occurrence.sceneId === scene.id && occurrence.elementId === element.id
  ));
  if (matchingOccurrences.length) {
    const matchingIds = new Set(matchingOccurrences.map((occurrence) => occurrence.id));
    const occurrences = breakdown.occurrences.map((occurrence) => (
      matchingIds.has(occurrence.id) ? { ...occurrence, reviewState: "confirmed" as const } : occurrence
    ));
    return {
      ...breakdown,
      elements: breakdown.elements.map((candidate) => candidate.id === element.id
        ? { ...candidate, reviewState: aggregateElementOccurrenceState(candidate.id, occurrences, "confirmed") }
        : candidate),
      occurrences,
      updatedAt: now,
    };
  }
  if (breakdown.occurrences.length >= 50_000) {
    throw new Error("Screenplay element reuse blocked by the 50,000-occurrence safety cap.");
  }
  const sourceLine = boundedInteger(options.sourceLine, scene.sourceStartLine, scene.sourceStartLine, scene.sourceEndLine);
  const occurrence: SceneElementOccurrence = {
    id: `scene_element_manual_${cryptoSafeId()}`,
    sceneId: scene.id,
    elementId: element.id,
    sourceLine,
    excerpt: normalizeManualScreenplayElementText(options.excerpt ?? element.name, 240),
    reviewState: "confirmed",
  };
  const occurrences = [...breakdown.occurrences, occurrence];
  return {
    ...breakdown,
    elements: breakdown.elements.map((candidate) => candidate.id === element.id
      ? { ...candidate, reviewState: aggregateElementOccurrenceState(candidate.id, occurrences, "confirmed") }
      : candidate),
    occurrences,
    updatedAt: now,
  };
}

export function applyScreenplayElementsToScene(
  breakdown: ScreenplayBreakdown,
  targetSceneId: string,
  elementIds: string[],
  now = new Date().toISOString(),
): ScreenplayElementBatchApplyResult {
  const targetScene = breakdown.scenes.find((scene) => scene.id === targetSceneId);
  if (!targetScene) {
    throw new Error("Element paste requires a target scene from the selected revision.");
  }
  const requestedElementIds = uniqueStrings(elementIds.map((elementId) => elementId.trim()).filter(Boolean));
  if (!requestedElementIds.length) throw new Error("Element paste requires at least one copied element.");
  if (requestedElementIds.length > 100) throw new Error("Element paste is limited to 100 elements at a time.");
  const elementsById = new Map(breakdown.elements.map((element) => [element.id, element]));
  for (const elementId of requestedElementIds) {
    const element = elementsById.get(elementId);
    if (!element || element.reviewState === "dismissed") {
      throw new Error("Element paste requires active elements from the selected revision.");
    }
  }

  let addedCount = 0;
  let reactivatedCount = 0;
  let alreadyPresentCount = 0;
  let next = breakdown;
  for (const elementId of requestedElementIds) {
    const matchingOccurrences = breakdown.occurrences.filter((occurrence) => (
      occurrence.sceneId === targetSceneId && occurrence.elementId === elementId
    ));
    if (matchingOccurrences.some((occurrence) => occurrence.reviewState !== "dismissed")) {
      alreadyPresentCount += 1;
    } else if (matchingOccurrences.length) {
      reactivatedCount += 1;
    } else {
      addedCount += 1;
    }
    next = addExistingScreenplayElementOccurrence(
      next,
      targetSceneId,
      elementId,
      { sourceLine: targetScene.sourceStartLine },
      now,
    );
  }

  return {
    breakdown: next,
    summary: {
      targetSceneId,
      requestedCount: requestedElementIds.length,
      addedCount,
      reactivatedCount,
      alreadyPresentCount,
    },
  };
}

export function addManualScreenplayElementOccurrence(
  breakdown: ScreenplayBreakdown,
  sceneId: string,
  category: ScreenplayElementCategory,
  name: string,
  options: { excerpt?: string; sourceLine?: number } = {},
  now = new Date().toISOString(),
): ScreenplayBreakdown {
  const scene = breakdown.scenes.find((candidate) => candidate.id === sceneId);
  if (!scene) throw new Error("Manual screenplay tags require a scene from the selected revision.");
  if (!isScreenplayElementCategory(category)) throw new Error("Manual screenplay tags require a supported category.");
  const displayName = normalizeManualScreenplayElementText(name, 180);
  const normalizedName = normalizeScreenplayElementName(displayName);
  if (!displayName || !normalizedName) throw new Error("Manual screenplay tags require an element name.");
  const existingElement = breakdown.elements.find((element) => (
    element.category === category && normalizeScreenplayElementName(element.normalizedName || element.name) === normalizedName
  ));
  if (!existingElement && breakdown.elements.length >= 5_000) {
    throw new Error("Manual screenplay tag blocked by the 5,000-element safety cap.");
  }
  const element: ProductionElement = existingElement ?? {
    id: `production_element_manual_${cryptoSafeId()}`,
    projectId: breakdown.projectId,
    revisionId: breakdown.revision.id,
    category,
    name: displayName,
    normalizedName,
    source: "manual",
    reviewState: "confirmed",
  };
  if (existingElement) return addExistingScreenplayElementOccurrence(breakdown, scene.id, element.id, options, now);
  if (breakdown.occurrences.length >= 50_000) {
    throw new Error("Manual screenplay tag blocked by the 50,000-occurrence safety cap.");
  }
  const sourceLine = boundedInteger(options.sourceLine, scene.sourceStartLine, scene.sourceStartLine, scene.sourceEndLine);
  const occurrence: SceneElementOccurrence = {
    id: `scene_element_manual_${cryptoSafeId()}`,
    sceneId: scene.id,
    elementId: element.id,
    sourceLine,
    excerpt: normalizeManualScreenplayElementText(options.excerpt ?? displayName, 240),
    reviewState: "confirmed",
  };
  const occurrences = [...breakdown.occurrences, occurrence];
  return {
    ...breakdown,
    elements: existingElement
      ? breakdown.elements.map((candidate) => candidate.id === element.id
        ? { ...candidate, reviewState: aggregateElementOccurrenceState(candidate.id, occurrences, "confirmed") }
        : candidate)
      : [...breakdown.elements, element],
    occurrences,
    updatedAt: now,
  };
}

export function searchScreenplayScenes(
  breakdown: ScreenplayBreakdown,
  query: string,
  limit = 200,
): ScreenplaySceneSearchResult[] {
  const normalizedQuery = normalizeScreenplayElementName(query).slice(0, 120);
  if (!normalizedQuery) return [];
  const boundedLimit = boundedInteger(limit, 200, 1, 1_000);
  const elementsById = new Map(breakdown.elements.map((element) => [element.id, element]));
  const occurrenceElementIdsByScene = new Map<string, Set<string>>();
  for (const occurrence of breakdown.occurrences) {
    if (occurrence.reviewState === "dismissed") continue;
    const element = elementsById.get(occurrence.elementId);
    if (!element || !normalizeScreenplayElementName(element.name).includes(normalizedQuery)) continue;
    const elementIds = occurrenceElementIdsByScene.get(occurrence.sceneId) ?? new Set<string>();
    elementIds.add(element.id);
    occurrenceElementIdsByScene.set(occurrence.sceneId, elementIds);
  }
  return breakdown.scenes.flatMap((scene): ScreenplaySceneSearchResult[] => {
    const matchKinds: ScreenplaySceneSearchMatchKind[] = [];
    if (normalizeScreenplayElementName(scene.heading).includes(normalizedQuery)) matchKinds.push("heading");
    if (normalizeScreenplayElementName(scene.sourceText).includes(normalizedQuery)) matchKinds.push("source");
    if (scene.synopsis && normalizeScreenplayElementName(scene.synopsis).includes(normalizedQuery)) matchKinds.push("synopsis");
    const matchingElementIds = [...(occurrenceElementIdsByScene.get(scene.id) ?? [])];
    if (matchingElementIds.length) matchKinds.push("element");
    return matchKinds.length ? [{ sceneId: scene.id, matchKinds, matchingElementIds }] : [];
  }).slice(0, boundedLimit);
}

export function buildScreenplayElementReport(
  breakdown: ScreenplayBreakdown,
  category: ScreenplayElementCategory | null = null,
): ScreenplayElementReport {
  if (category !== null && !isScreenplayElementCategory(category)) {
    throw new Error("Element report requires a supported category.");
  }
  const scenesById = new Map(breakdown.scenes.map((scene) => [scene.id, scene]));
  const occurrencesByElementId = new Map<string, SceneElementOccurrence[]>();
  const seenOccurrenceIds = new Set<string>();
  for (const occurrence of breakdown.occurrences) {
    if (seenOccurrenceIds.has(occurrence.id) || occurrence.reviewState === "dismissed" || !scenesById.has(occurrence.sceneId)) continue;
    seenOccurrenceIds.add(occurrence.id);
    const occurrences = occurrencesByElementId.get(occurrence.elementId) ?? [];
    occurrences.push(occurrence);
    occurrencesByElementId.set(occurrence.elementId, occurrences);
  }
  const rows = breakdown.elements.flatMap((element): ScreenplayElementReportRow[] => {
    if (element.reviewState === "dismissed" || (category !== null && element.category !== category)) return [];
    const occurrences = (occurrencesByElementId.get(element.id) ?? []).sort((left, right) => {
      const leftScene = scenesById.get(left.sceneId);
      const rightScene = scenesById.get(right.sceneId);
      return (leftScene?.ordinal ?? Number.MAX_SAFE_INTEGER) - (rightScene?.ordinal ?? Number.MAX_SAFE_INTEGER)
        || left.sourceLine - right.sourceLine
        || left.id.localeCompare(right.id);
    });
    const reportOccurrences = occurrences.flatMap((occurrence): ScreenplayElementReportOccurrence[] => {
      const scene = scenesById.get(occurrence.sceneId);
      return scene ? [{
        id: occurrence.id,
        sceneId: scene.id,
        sceneOrdinal: scene.ordinal,
        sceneNumber: scene.sceneNumber,
        sceneHeading: scene.heading,
        sourceLine: occurrence.sourceLine,
        reviewState: occurrence.reviewState === "confirmed" ? "confirmed" : "suggested",
      }] : [];
    });
    const seenSceneIds = new Set<string>();
    const scenes = reportOccurrences.flatMap((occurrence): ScreenplayElementReportScene[] => {
      if (seenSceneIds.has(occurrence.sceneId)) return [];
      seenSceneIds.add(occurrence.sceneId);
      return [{
        id: occurrence.sceneId,
        ordinal: occurrence.sceneOrdinal,
        sceneNumber: occurrence.sceneNumber,
        heading: occurrence.sceneHeading,
      }];
    });
    return [{
      elementId: element.id,
      category: element.category,
      name: element.name,
      source: element.source,
      reviewState: element.reviewState,
      occurrenceCount: occurrences.length,
      confirmedOccurrenceCount: occurrences.filter((occurrence) => occurrence.reviewState === "confirmed").length,
      sceneCount: scenes.length,
      scenes,
      occurrences: reportOccurrences,
      firstScene: scenes[0] ?? null,
    }];
  }).sort((left, right) => (
    left.category.localeCompare(right.category)
    || (left.firstScene?.ordinal ?? Number.MAX_SAFE_INTEGER) - (right.firstScene?.ordinal ?? Number.MAX_SAFE_INTEGER)
    || left.name.localeCompare(right.name)
  ));
  return {
    screenplayBreakdownId: breakdown.id,
    screenplayRevisionId: breakdown.revision.id,
    category,
    rows,
    occurrenceCount: rows.reduce((total, row) => total + row.occurrenceCount, 0),
    sceneUseCount: rows.reduce((total, row) => total + row.sceneCount, 0),
  };
}

export function suggestScreenplayElementDuplicates(
  breakdown: ScreenplayBreakdown,
  category: ScreenplayElementCategory,
  options: { maximumElements?: number; maximumSuggestions?: number } = {},
): ScreenplayElementDuplicateSuggestionSet {
  if (!isScreenplayElementCategory(category)) {
    throw new Error("Duplicate suggestions require a supported category.");
  }
  const maximumElements = boundedInteger(options.maximumElements, 300, 2, 500);
  const maximumSuggestions = boundedInteger(options.maximumSuggestions, 100, 1, 500);
  const occurrenceCounts = new Map<string, number>();
  for (const occurrence of breakdown.occurrences) {
    if (occurrence.reviewState === "dismissed") continue;
    occurrenceCounts.set(occurrence.elementId, (occurrenceCounts.get(occurrence.elementId) ?? 0) + 1);
  }
  const activeElements = breakdown.elements
    .filter((element) => element.category === category && element.reviewState !== "dismissed")
    .sort((left, right) => (
      normalizeScreenplayElementName(left.name).localeCompare(normalizeScreenplayElementName(right.name))
      || left.id.localeCompare(right.id)
    ));
  const comparedElements = activeElements.slice(0, maximumElements);
  const suggestions: ScreenplayElementDuplicateSuggestion[] = [];
  for (let firstIndex = 0; firstIndex < comparedElements.length; firstIndex += 1) {
    const first = comparedElements[firstIndex];
    if (!first) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < comparedElements.length; secondIndex += 1) {
      const second = comparedElements[secondIndex];
      if (!second) continue;
      const similarity = compareScreenplayElementNames(first.name, second.name);
      if (!similarity) continue;
      suggestions.push({
        category,
        firstElementId: first.id,
        firstName: first.name,
        firstOccurrenceCount: occurrenceCounts.get(first.id) ?? 0,
        secondElementId: second.id,
        secondName: second.name,
        secondOccurrenceCount: occurrenceCounts.get(second.id) ?? 0,
        score: similarity.score,
        reasons: similarity.reasons,
      });
    }
  }
  suggestions.sort((left, right) => (
    right.score - left.score
    || left.firstName.localeCompare(right.firstName)
    || left.secondName.localeCompare(right.secondName)
    || left.firstElementId.localeCompare(right.firstElementId)
    || left.secondElementId.localeCompare(right.secondElementId)
  ));
  return {
    screenplayBreakdownId: breakdown.id,
    category,
    activeElementCount: activeElements.length,
    comparedElementCount: comparedElements.length,
    truncated: activeElements.length > comparedElements.length || suggestions.length > maximumSuggestions,
    suggestions: suggestions.slice(0, maximumSuggestions),
  };
}

export function mergeScreenplayElementsInWorkspace(
  workspace: WorkspaceData,
  screenplayBreakdownId: string,
  targetElementId: string,
  sourceElementId: string,
  now = new Date().toISOString(),
): ScreenplayElementMergeResult {
  const breakdown = workspace.screenplayBreakdowns.find((candidate) => candidate.id === screenplayBreakdownId);
  if (!breakdown) throw new Error("Element merge requires a screenplay revision in this workspace.");
  const target = breakdown.elements.find((element) => element.id === targetElementId);
  const source = breakdown.elements.find((element) => element.id === sourceElementId);
  if (!target || !source || target.reviewState === "dismissed" || source.reviewState === "dismissed") {
    throw new Error("Element merge requires two active elements from the selected revision.");
  }
  if (target.id === source.id) throw new Error("Element merge requires two different elements.");
  if (target.category !== source.category) throw new Error("Element merge requires elements from the same category.");

  const mergedBreakdown = mergeScreenplayBreakdownElements(breakdown, target, source, now);
  let castDayAnnotationsRelinked = 0;
  let castDayAnnotationDuplicatesRemoved = 0;
  const productionSchedules = workspace.productionSchedules.map((schedule) => {
    if (
      schedule.screenplayBreakdownId !== breakdown.id
      || !(schedule.castDayAnnotations ?? []).some((annotation) => annotation.elementId === source.id)
    ) return schedule;
    const annotations = normalizeProductionCastDayAnnotations(
      schedule.castDayAnnotations,
      new Set(schedule.shootDays.map((day) => day.id)),
    );
    const targetDayIds = new Set(annotations.flatMap((annotation) => (
      annotation.elementId === target.id ? [annotation.dayId] : []
    )));
    const relinkedDayIds = new Set<string>();
    const castDayAnnotations = annotations.flatMap((annotation): ProductionCastDayAnnotation[] => {
      if (annotation.elementId !== source.id) return [annotation];
      if (targetDayIds.has(annotation.dayId) || relinkedDayIds.has(annotation.dayId)) {
        castDayAnnotationDuplicatesRemoved += 1;
        return [];
      }
      relinkedDayIds.add(annotation.dayId);
      castDayAnnotationsRelinked += 1;
      return [{ ...annotation, elementId: target.id }];
    });
    return { ...schedule, castDayAnnotations, updatedAt: now };
  });
  let availabilityWindowsRelinked = 0;
  let availabilityDuplicatesRemoved = 0;
  const existingAvailabilityKeys = new Set(workspace.productionAvailability.flatMap((window) => (
    window.screenplayBreakdownId === breakdown.id && window.elementId === target.id
      ? [screenplayAvailabilityMergeKey(window, target.id)]
      : []
  )));
  const relinkedAvailabilityKeys = new Set<string>();
  const productionAvailability = workspace.productionAvailability.flatMap((window): ProductionAvailabilityWindow[] => {
    if (window.screenplayBreakdownId !== breakdown.id || window.elementId !== source.id) return [window];
    const mergeKey = screenplayAvailabilityMergeKey(window, target.id);
    if (existingAvailabilityKeys.has(mergeKey) || relinkedAvailabilityKeys.has(mergeKey)) {
      availabilityDuplicatesRemoved += 1;
      return [];
    }
    relinkedAvailabilityKeys.add(mergeKey);
    availabilityWindowsRelinked += 1;
    return [{ ...window, elementId: target.id, resourceName: target.name, updatedAt: now }];
  });
  let locationsRelinked = 0;
  const productionLocations = workspace.productionLocations.map((location) => {
    if (location.screenplayBreakdownId !== breakdown.id || location.screenplayElementId !== source.id) return location;
    locationsRelinked += 1;
    return {
      ...location,
      screenplayElementId: target.id,
      sourceBreakdownUpdatedAt: mergedBreakdown.breakdown.updatedAt,
      updatedAt: now,
    };
  });
  let talentRelinked = 0;
  const productionTalent = workspace.productionTalent.map((talent) => {
    if (talent.screenplayBreakdownId !== breakdown.id || talent.screenplayElementId !== source.id) return talent;
    talentRelinked += 1;
    return {
      ...talent,
      screenplayElementId: target.id,
      sourceBreakdownUpdatedAt: mergedBreakdown.breakdown.updatedAt,
      updatedAt: now,
    };
  });
  const historicalCastCallsPreserved = workspace.productionCallSheets.reduce((total, callSheet) => (
    callSheet.screenplayBreakdownId === breakdown.id
      ? total + callSheet.castCalls.filter((castCall) => castCall.elementId === source.id).length
      : total
  ), 0);

  return {
    workspace: {
      ...workspace,
      screenplayBreakdowns: workspace.screenplayBreakdowns.map((candidate) => (
        candidate.id === breakdown.id ? mergedBreakdown.breakdown : candidate
      )),
      productionSchedules,
      productionAvailability,
      productionLocations,
      productionTalent,
    },
    summary: {
      targetElementId: target.id,
      targetName: target.name,
      sourceElementId: source.id,
      sourceName: source.name,
      occurrencesReassigned: mergedBreakdown.occurrencesReassigned,
      occurrenceDuplicatesRemoved: mergedBreakdown.occurrenceDuplicatesRemoved,
      castDayAnnotationsRelinked,
      castDayAnnotationDuplicatesRemoved,
      availabilityWindowsRelinked,
      availabilityDuplicatesRemoved,
      locationsRelinked,
      talentRelinked,
      historicalCastCallsPreserved,
    },
  };
}

export function moveScreenplayElementCategoryInWorkspace(
  workspace: WorkspaceData,
  screenplayBreakdownId: string,
  elementId: string,
  nextCategory: ScreenplayElementCategory,
  now = new Date().toISOString(),
): ScreenplayElementCategoryMoveResult {
  if (!isScreenplayElementCategory(nextCategory)) {
    throw new Error("Category move requires a supported destination category.");
  }
  const breakdown = workspace.screenplayBreakdowns.find((candidate) => candidate.id === screenplayBreakdownId);
  const element = breakdown?.elements.find((candidate) => candidate.id === elementId);
  if (!breakdown || !element || element.reviewState === "dismissed") {
    throw new Error("Category move requires an active element from the selected revision.");
  }
  if (element.category === nextCategory) throw new Error("Element is already in the selected category.");
  const blockers = screenplayElementCategoryMoveBlockers(workspace, breakdown.id, element.id, nextCategory);
  if (blockers.length) {
    throw new Error(`Category move blocked: ${blockers.join(", ")} still require ${element.name} in its current resource category.`);
  }
  const historicalCastCallsPreserved = workspace.productionCallSheets.reduce((total, callSheet) => (
    callSheet.screenplayBreakdownId === breakdown.id
      ? total + callSheet.castCalls.filter((castCall) => castCall.elementId === element.id).length
      : total
  ), 0);
  const existingDestinationElement = breakdown.elements.find((candidate) => (
    candidate.id !== element.id
    && candidate.category === nextCategory
    && candidate.reviewState !== "dismissed"
    && normalizeScreenplayElementName(candidate.normalizedName || candidate.name)
      === normalizeScreenplayElementName(element.normalizedName || element.name)
  ));
  if (existingDestinationElement) {
    const recategorizedBreakdown: ScreenplayBreakdown = {
      ...breakdown,
      elements: breakdown.elements.map((candidate) => (
        candidate.id === element.id ? { ...candidate, category: nextCategory } : candidate
      )),
    };
    const merged = mergeScreenplayElementsInWorkspace(
      {
        ...workspace,
        screenplayBreakdowns: workspace.screenplayBreakdowns.map((candidate) => (
          candidate.id === breakdown.id ? recategorizedBreakdown : candidate
        )),
      },
      breakdown.id,
      existingDestinationElement.id,
      element.id,
      now,
    );
    return {
      workspace: merged.workspace,
      summary: {
        elementId: element.id,
        elementName: element.name,
        previousCategory: element.category,
        nextCategory,
        canonicalElementId: existingDestinationElement.id,
        mergedWithExistingElement: true,
        occurrencesReassigned: merged.summary.occurrencesReassigned,
        occurrenceDuplicatesRemoved: merged.summary.occurrenceDuplicatesRemoved,
        castDayAnnotationsRelinked: merged.summary.castDayAnnotationsRelinked,
        castDayAnnotationDuplicatesRemoved: merged.summary.castDayAnnotationDuplicatesRemoved,
        availabilityWindowsRelinked: merged.summary.availabilityWindowsRelinked,
        availabilityDuplicatesRemoved: merged.summary.availabilityDuplicatesRemoved,
        locationsRelinked: merged.summary.locationsRelinked,
        talentRelinked: merged.summary.talentRelinked,
        historicalCastCallsPreserved: merged.summary.historicalCastCallsPreserved,
      },
    };
  }
  const movedBreakdown: ScreenplayBreakdown = {
    ...breakdown,
    elements: breakdown.elements.map((candidate) => (
      candidate.id === element.id ? { ...candidate, category: nextCategory } : candidate
    )),
    updatedAt: now,
  };
  return {
    workspace: {
      ...workspace,
      screenplayBreakdowns: workspace.screenplayBreakdowns.map((candidate) => (
        candidate.id === breakdown.id ? movedBreakdown : candidate
      )),
    },
    summary: {
      elementId: element.id,
      elementName: element.name,
      previousCategory: element.category,
      nextCategory,
      canonicalElementId: element.id,
      mergedWithExistingElement: false,
      occurrencesReassigned: 0,
      occurrenceDuplicatesRemoved: 0,
      castDayAnnotationsRelinked: 0,
      castDayAnnotationDuplicatesRemoved: 0,
      availabilityWindowsRelinked: 0,
      availabilityDuplicatesRemoved: 0,
      locationsRelinked: 0,
      talentRelinked: 0,
      historicalCastCallsPreserved,
    },
  };
}

function screenplayElementCategoryMoveBlockers(
  workspace: WorkspaceData,
  screenplayBreakdownId: string,
  elementId: string,
  nextCategory: ScreenplayElementCategory,
): string[] {
  const blockers: string[] = [];
  const incompatibleCastDayAnnotations = nextCategory === "cast" ? 0 : workspace.productionSchedules.reduce((total, schedule) => (
    schedule.screenplayBreakdownId === screenplayBreakdownId
      ? total + (schedule.castDayAnnotations ?? []).filter((annotation) => annotation.elementId === elementId).length
      : total
  ), 0);
  if (incompatibleCastDayAnnotations) {
    blockers.push(`${incompatibleCastDayAnnotations} cast day annotation${incompatibleCastDayAnnotations === 1 ? "" : "s"}`);
  }
  const incompatibleAvailability = workspace.productionAvailability.filter((window) => (
    window.screenplayBreakdownId === screenplayBreakdownId
    && window.elementId === elementId
    && window.resourceCategory !== nextCategory
  )).length;
  if (incompatibleAvailability) {
    blockers.push(`${incompatibleAvailability} availability window${incompatibleAvailability === 1 ? "" : "s"}`);
  }
  const incompatibleLocations = nextCategory === "location" ? 0 : workspace.productionLocations.filter((location) => (
    location.screenplayBreakdownId === screenplayBreakdownId && location.screenplayElementId === elementId
  )).length;
  if (incompatibleLocations) {
    blockers.push(`${incompatibleLocations} location record${incompatibleLocations === 1 ? "" : "s"}`);
  }
  const incompatibleTalent = nextCategory === "cast" ? 0 : workspace.productionTalent.filter((talent) => (
    talent.screenplayBreakdownId === screenplayBreakdownId && talent.screenplayElementId === elementId
  )).length;
  if (incompatibleTalent) {
    blockers.push(`${incompatibleTalent} talent record${incompatibleTalent === 1 ? "" : "s"}`);
  }
  return blockers;
}

function mergeScreenplayBreakdownElements(
  breakdown: ScreenplayBreakdown,
  target: ProductionElement,
  source: ProductionElement,
  now: string,
): { breakdown: ScreenplayBreakdown; occurrencesReassigned: number; occurrenceDuplicatesRemoved: number } {
  const occurrenceIdByPosition = new Map<string, string>();
  for (const occurrence of breakdown.occurrences) {
    if (occurrence.elementId !== target.id) continue;
    const key = screenplayOccurrencePositionKey(occurrence);
    if (!occurrenceIdByPosition.has(key)) occurrenceIdByPosition.set(key, occurrence.id);
  }
  const mergedStatesByOccurrenceId = new Map<string, ScreenplayReviewState[]>();
  let occurrencesReassigned = 0;
  let occurrenceDuplicatesRemoved = 0;
  const occurrences = breakdown.occurrences.flatMap((occurrence): SceneElementOccurrence[] => {
    if (occurrence.elementId !== source.id) return [occurrence];
    const key = screenplayOccurrencePositionKey(occurrence);
    const retainedOccurrenceId = occurrenceIdByPosition.get(key);
    if (retainedOccurrenceId) {
      const retained = breakdown.occurrences.find((candidate) => candidate.id === retainedOccurrenceId);
      const states = mergedStatesByOccurrenceId.get(retainedOccurrenceId) ?? (retained ? [retained.reviewState] : []);
      states.push(occurrence.reviewState);
      mergedStatesByOccurrenceId.set(retainedOccurrenceId, states);
      occurrenceDuplicatesRemoved += 1;
      return [];
    }
    occurrenceIdByPosition.set(key, occurrence.id);
    occurrencesReassigned += 1;
    return [{ ...occurrence, elementId: target.id }];
  }).map((occurrence) => {
    const mergedStates = mergedStatesByOccurrenceId.get(occurrence.id);
    return mergedStates ? { ...occurrence, reviewState: aggregateScreenplayReviewState(mergedStates) } : occurrence;
  });
  const targetReviewState = aggregateElementOccurrenceState(target.id, occurrences, target.reviewState);
  return {
    breakdown: {
      ...breakdown,
      elements: breakdown.elements.flatMap((element): ProductionElement[] => {
        if (element.id === source.id) return [];
        return element.id === target.id ? [{ ...element, reviewState: targetReviewState }] : [element];
      }),
      occurrences,
      updatedAt: now,
    },
    occurrencesReassigned,
    occurrenceDuplicatesRemoved,
  };
}

function compareScreenplayElementNames(
  firstName: string,
  secondName: string,
): { score: number; reasons: ScreenplayElementDuplicateReason[] } | null {
  const first = normalizeScreenplayDuplicateCandidate(firstName);
  const second = normalizeScreenplayDuplicateCandidate(secondName);
  if (!first || !second) return null;
  if (first === second) return { score: 100, reasons: ["normalized_match"] };
  const firstNumbers = duplicateCandidateNumberTerms(first);
  const secondNumbers = duplicateCandidateNumberTerms(second);
  if (firstNumbers.length && secondNumbers.length && firstNumbers.join("|") !== secondNumbers.join("|")) return null;

  const reasons: ScreenplayElementDuplicateReason[] = [];
  let score = 0;
  const shorter = first.length <= second.length ? first : second;
  const longer = first.length <= second.length ? second : first;
  if (shorter.length >= 4 && (` ${longer} `).includes(` ${shorter} `)) {
    reasons.push("name_containment");
    score = Math.max(score, Math.min(96, 86 + Math.round((shorter.length / longer.length) * 10)));
  }
  const firstTerms = duplicateCandidateMeaningfulTerms(first);
  const secondTerms = duplicateCandidateMeaningfulTerms(second);
  const sharedTerms = firstTerms.filter((term) => secondTerms.includes(term));
  const unionSize = new Set([...firstTerms, ...secondTerms]).size;
  const termSimilarity = unionSize ? sharedTerms.length / unionSize : 0;
  if (sharedTerms.length >= 2 && termSimilarity >= 0.5) {
    reasons.push("shared_terms");
    score = Math.max(score, Math.min(95, 75 + Math.round(termSimilarity * 20)));
  }
  const maximumLength = Math.max(first.length, second.length);
  if (
    first[0] === second[0]
    && Math.min(first.length, second.length) >= 4
    && Math.abs(first.length - second.length) <= Math.ceil(maximumLength * 0.2)
  ) {
    const spellingSimilarity = 1 - levenshteinDistance(first, second) / maximumLength;
    if (spellingSimilarity >= 0.82) {
      reasons.push("similar_spelling");
      score = Math.max(score, Math.round(spellingSimilarity * 100));
    }
  }
  return reasons.length ? { score, reasons } : null;
}

function normalizeScreenplayDuplicateCandidate(value: string): string {
  return normalizeScreenplayElementName(value).replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function duplicateCandidateNumberTerms(value: string): string[] {
  return value.split(" ").filter((term) => /^\p{N}+$/u.test(term));
}

function duplicateCandidateMeaningfulTerms(value: string): string[] {
  return [...new Set(value.split(" ").filter((term) => term.length >= 3 && !/^\p{N}+$/u.test(term)))];
}

function levenshteinDistance(first: string, second: string): number {
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = firstIndex;
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const above = previous[secondIndex] ?? secondIndex;
      const left = previous[secondIndex - 1] ?? firstIndex;
      const substitution = diagonal + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1);
      diagonal = above;
      previous[secondIndex] = Math.min(above + 1, left + 1, substitution);
    }
  }
  return previous[second.length] ?? 0;
}

function screenplayOccurrencePositionKey(occurrence: SceneElementOccurrence): string {
  return `${occurrence.sceneId}\u0000${occurrence.sourceLine}`;
}

function screenplayAvailabilityMergeKey(window: ProductionAvailabilityWindow, elementId: string): string {
  return [
    window.screenplayBreakdownId,
    elementId,
    window.resourceCategory,
    window.status,
    window.startDate,
    window.endDate,
    window.notes,
    window.derivedFromAvailabilityWindowId ?? "",
  ].join("\u0000");
}

function aggregateElementOccurrenceState(
  elementId: string,
  occurrences: SceneElementOccurrence[],
  fallback: ScreenplayReviewState,
): ScreenplayReviewState {
  const states = occurrences
    .filter((occurrence) => occurrence.elementId === elementId)
    .map((occurrence) => occurrence.reviewState);
  return states.length ? aggregateScreenplayReviewState(states) : fallback;
}

function normalizeManualScreenplayElementText(value: string, maximumLength: number): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}

function isScreenplayElementCategory(value: string): value is ScreenplayElementCategory {
  return [
    "cast", "background", "location", "prop", "wardrobe", "makeup", "vehicle", "animal", "stunt",
    "special_effect", "visual_effect", "sound", "music", "equipment", "other",
  ].includes(value);
}

export function compareScreenplayRevisions(
  previous: ScreenplayBreakdown,
  next: ScreenplayBreakdown,
): ScreenplayRevisionComparison {
  assertRevisionPair(previous, next);
  const matchedPrevious = new Set<string>();
  const matchedNext = new Set<string>();
  const sceneMatches = new Map<string, { nextSceneId: string; basis: ScreenplayRevisionMatchBasis }>();

  pairRevisionScenes(
    previous,
    next,
    matchedPrevious,
    matchedNext,
    sceneMatches,
    (scene) => normalizeRevisionSceneNumber(scene.sceneNumber),
    "scene_number",
    true,
  );
  pairRevisionScenes(
    previous,
    next,
    matchedPrevious,
    matchedNext,
    sceneMatches,
    normalizeRevisionSceneContent,
    "exact_content",
    false,
  );
  pairRevisionScenes(
    previous,
    next,
    matchedPrevious,
    matchedNext,
    sceneMatches,
    (scene) => normalizeRevisionText(scene.heading),
    "heading_position",
    false,
  );

  const previousScenes = new Map(previous.scenes.map((scene) => [scene.id, scene]));
  const sceneChanges: ScreenplayRevisionSceneChange[] = [];
  for (const nextScene of next.scenes) {
    const match = [...sceneMatches.entries()].find(([, candidate]) => candidate.nextSceneId === nextScene.id);
    const previousScene = match ? previousScenes.get(match[0]) ?? null : null;
    const status: ScreenplayRevisionSceneStatus = previousScene
      ? normalizeRevisionSceneContent(previousScene) === normalizeRevisionSceneContent(nextScene) ? "unchanged" : "changed"
      : "added";
    sceneChanges.push(buildRevisionSceneChange(previousScene, nextScene, status, match?.[1].basis ?? null));
  }
  for (const previousScene of previous.scenes) {
    if (!matchedPrevious.has(previousScene.id)) {
      sceneChanges.push(buildRevisionSceneChange(previousScene, null, "removed", null));
    }
  }

  const nextElementsByKey = new Map(next.elements.map((element) => [revisionElementKey(element), element]));
  const elementMatches = previous.elements.flatMap((element): ScreenplayRevisionElementMatch[] => {
    const nextElement = nextElementsByKey.get(revisionElementKey(element));
    return nextElement ? [{
      previousElementId: element.id,
      nextElementId: nextElement.id,
      category: nextElement.category,
      name: nextElement.name,
    }] : [];
  });

  return {
    previousBreakdownId: previous.id,
    nextBreakdownId: next.id,
    unchangedSceneCount: sceneChanges.filter((change) => change.status === "unchanged").length,
    changedSceneCount: sceneChanges.filter((change) => change.status === "changed").length,
    addedSceneCount: sceneChanges.filter((change) => change.status === "added").length,
    removedSceneCount: sceneChanges.filter((change) => change.status === "removed").length,
    sceneChanges,
    elementMatches,
  };
}

export function carryForwardScreenplayReviewState(
  previous: ScreenplayBreakdown,
  next: ScreenplayBreakdown,
  comparison = compareScreenplayRevisions(previous, next),
): ScreenplayBreakdown {
  assertComparisonPair(previous, next, comparison);
  const nextSceneByPrevious = new Map(comparison.sceneChanges.flatMap((change) => (
    change.previousSceneId && change.nextSceneId ? [[change.previousSceneId, change.nextSceneId] as const] : []
  )));
  const nextElementByPrevious = new Map(comparison.elementMatches.map((match) => [match.previousElementId, match.nextElementId]));
  const previousReviewQueues = new Map<string, ScreenplayReviewState[]>();
  for (const occurrence of [...previous.occurrences].sort((left, right) => left.sourceLine - right.sourceLine)) {
    const nextSceneId = nextSceneByPrevious.get(occurrence.sceneId);
    const nextElementId = nextElementByPrevious.get(occurrence.elementId);
    if (!nextSceneId || !nextElementId) continue;
    const key = `${nextSceneId}\u0000${nextElementId}`;
    const states = previousReviewQueues.get(key) ?? [];
    states.push(occurrence.reviewState);
    previousReviewQueues.set(key, states);
  }

  const occurrences = next.occurrences.map((occurrence) => {
    const key = `${occurrence.sceneId}\u0000${occurrence.elementId}`;
    const states = previousReviewQueues.get(key);
    const reviewState = states?.shift();
    return reviewState ? { ...occurrence, reviewState } : occurrence;
  });
  const directElementStates = new Map(previous.elements.flatMap((element) => {
    const nextElementId = nextElementByPrevious.get(element.id);
    return nextElementId ? [[nextElementId, element.reviewState] as const] : [];
  }));
  return {
    ...next,
    elements: next.elements.map((element) => {
      const occurrenceStates = occurrences
        .filter((occurrence) => occurrence.elementId === element.id)
        .map((occurrence) => occurrence.reviewState);
      return {
        ...element,
        reviewState: occurrenceStates.length
          ? aggregateScreenplayReviewState(occurrenceStates)
          : directElementStates.get(element.id) ?? element.reviewState,
      };
    }),
    occurrences,
  };
}

export function rebaseProductionScheduleToRevision(
  schedule: ProductionScheduleVersion,
  previous: ScreenplayBreakdown,
  next: ScreenplayBreakdown,
  comparison = compareScreenplayRevisions(previous, next),
  title = `${schedule.title} - Revision ${next.revision.importedAt.slice(0, 10)}`,
  now = new Date().toISOString(),
): ProductionScheduleVersion {
  assertComparisonPair(previous, next, comparison);
  if (schedule.projectId !== previous.projectId || schedule.screenplayBreakdownId !== previous.id) {
    throw new Error("Schedule must reference the previous screenplay breakdown before revision carry-forward.");
  }
  const nextSceneByPrevious = new Map(comparison.sceneChanges.flatMap((change) => (
    change.previousSceneId && change.nextSceneId ? [[change.previousSceneId, change.nextSceneId] as const] : []
  )));
  const sceneChangesByPrevious = new Map(comparison.sceneChanges.flatMap((change) => (
    change.previousSceneId ? [[change.previousSceneId, change] as const] : []
  )));
  const previousScenesById = new Map(previous.scenes.map((scene) => [scene.id, scene]));
  const nextScenesById = new Map(next.scenes.map((scene) => [scene.id, scene]));
  const nextElementsById = new Map(next.elements.map((element) => [element.id, element]));
  const nextElementIdByPrevious = new Map(comparison.elementMatches.map((match) => (
    [match.previousElementId, match.nextElementId] as const
  )));
  const seen = new Set<string>();
  const mapSceneIds = (sceneIds: string[]): string[] => sceneIds.flatMap((sceneId) => {
    const nextSceneId = nextSceneByPrevious.get(sceneId);
    if (!nextSceneId || seen.has(nextSceneId)) return [];
    seen.add(nextSceneId);
    return [nextSceneId];
  });
  const mapSceneParts = (parts: ProductionScheduleScenePart[] | undefined): ProductionScheduleScenePart[] => (
    normalizeProductionScheduleSceneParts(parts).flatMap((part) => {
      const change = sceneChangesByPrevious.get(part.sceneId);
      if (!change?.nextSceneId || change.status !== "unchanged") return [];
      const previousScene = previousScenesById.get(part.sceneId);
      const nextScene = nextScenesById.get(change.nextSceneId);
      if (!previousScene || !nextScene) return [];
      seen.add(nextScene.id);
      const startOffset = part.sourceStartLine - previousScene.sourceStartLine;
      const endOffset = part.sourceEndLine - previousScene.sourceStartLine;
      return [{
        ...clone(part),
        id: `production_scene_part_${cryptoSafeId()}`,
        sceneId: nextScene.id,
        sourceStartLine: Math.min(nextScene.sourceEndLine, nextScene.sourceStartLine + Math.max(0, startOffset)),
        sourceEndLine: Math.min(nextScene.sourceEndLine, nextScene.sourceStartLine + Math.max(0, endOffset)),
      }];
    })
  );
  const dayIdByPrevious = new Map(schedule.shootDays.map((day) => [day.id, `production_day_${cryptoSafeId()}`]));
  const shootDays = schedule.shootDays.map((day, index) => ({
    ...clone(day),
    id: dayIdByPrevious.get(day.id)!,
    ordinal: index + 1,
    sceneIds: mapSceneIds(day.sceneIds),
    sceneParts: mapSceneParts(day.sceneParts),
  }));
  const unassignedSceneIds = mapSceneIds(schedule.unassignedSceneIds);
  const unassignedSceneParts = mapSceneParts(schedule.unassignedSceneParts);
  for (const scene of next.scenes) {
    if (!seen.has(scene.id)) unassignedSceneIds.push(scene.id);
  }
  const castDayAnnotations = normalizeProductionCastDayAnnotations(
    schedule.castDayAnnotations,
    new Set(schedule.shootDays.map((day) => day.id)),
  ).flatMap((annotation): ProductionCastDayAnnotation[] => {
    const dayId = dayIdByPrevious.get(annotation.dayId);
    const nextElementId = nextElementIdByPrevious.get(annotation.elementId);
    const nextElement = nextElementId ? nextElementsById.get(nextElementId) : null;
    return dayId && nextElement?.category === "cast" && nextElement.reviewState !== "dismissed"
      ? [{ ...annotation, dayId, elementId: nextElement.id }]
      : [];
  });
  return {
    ...clone(schedule),
    id: `production_schedule_${cryptoSafeId()}`,
    screenplayBreakdownId: next.id,
    title: normalizeScheduleTitle(title),
    status: "draft",
    shootDays,
    unassignedSceneIds,
    unassignedSceneParts,
    castDayAnnotations,
    derivedFromScheduleId: schedule.id,
    createdAt: now,
    updatedAt: now,
  };
}

export function carryForwardScreenplayRevisionPlanning(
  collections: ScreenplayRevisionPlanningCollections,
  previous: ScreenplayBreakdown,
  next: ScreenplayBreakdown,
  now = new Date().toISOString(),
): ScreenplayRevisionCarryForwardResult {
  const comparison = compareScreenplayRevisions(previous, next);
  const sceneChangesByPrevious = new Map(comparison.sceneChanges.flatMap((change) => (
    change.previousSceneId && change.nextSceneId ? [[change.previousSceneId, change] as const] : []
  )));
  const elementMatchesByPrevious = new Map(comparison.elementMatches.map((match) => [match.previousElementId, match]));
  const nextElementsById = new Map(next.elements.map((element) => [element.id, element]));
  const summary: ScreenplayRevisionCarryForwardSummary = {
    schedulesCreated: 0,
    budgetScenariosCreated: 0,
    availabilityWindowsCreated: 0,
    locationsRelinked: 0,
    talentRelinked: 0,
    shotsRelinked: 0,
    locationsUnresolved: 0,
    talentUnresolved: 0,
    shotsUnresolved: 0,
  };

  const createdSchedules: ProductionScheduleVersion[] = [];
  const targetScheduleBySource = new Map<string, ProductionScheduleVersion>();
  for (const source of collections.productionSchedules.filter((schedule) => schedule.screenplayBreakdownId === previous.id)) {
    const existing = collections.productionSchedules.find((schedule) => (
      schedule.screenplayBreakdownId === next.id && schedule.derivedFromScheduleId === source.id
    ));
    const target = existing ?? rebaseProductionScheduleToRevision(source, previous, next, comparison, undefined, now);
    targetScheduleBySource.set(source.id, target);
    if (!existing) createdSchedules.push(target);
  }
  summary.schedulesCreated = createdSchedules.length;
  const productionSchedules = [...createdSchedules, ...collections.productionSchedules];

  const createdBudgetScenarios: ProductionBudgetScenario[] = [];
  for (const source of collections.productionBudgetScenarios) {
    const targetSchedule = targetScheduleBySource.get(source.productionScheduleId);
    if (!targetSchedule) continue;
    const existing = collections.productionBudgetScenarios.find((scenario) => (
      scenario.productionScheduleId === targetSchedule.id && scenario.derivedFromBudgetScenarioId === source.id
    ));
    if (existing) continue;
    createdBudgetScenarios.push({
      ...clone(source),
      id: `production_budget_${cryptoSafeId()}`,
      productionScheduleId: targetSchedule.id,
      title: normalizeBudgetScenarioTitle(`${source.title} - Revision`),
      derivedFromBudgetScenarioId: source.id,
      createdAt: now,
      updatedAt: now,
    });
  }
  summary.budgetScenariosCreated = createdBudgetScenarios.length;

  const createdAvailability: ProductionAvailabilityWindow[] = [];
  for (const source of collections.productionAvailability.filter((window) => window.screenplayBreakdownId === previous.id)) {
    const match = elementMatchesByPrevious.get(source.elementId);
    if (!match) continue;
    const existing = collections.productionAvailability.find((window) => (
      window.screenplayBreakdownId === next.id && window.derivedFromAvailabilityWindowId === source.id
    ));
    if (existing) continue;
    const nextElement = nextElementsById.get(match.nextElementId);
    if (!nextElement) continue;
    createdAvailability.push({
      ...clone(source),
      id: `production_availability_${cryptoSafeId()}`,
      screenplayBreakdownId: next.id,
      elementId: nextElement.id,
      resourceName: nextElement.name,
      derivedFromAvailabilityWindowId: source.id,
      createdAt: now,
      updatedAt: now,
    });
  }
  summary.availabilityWindowsCreated = createdAvailability.length;

  const productionLocations = collections.productionLocations.map((location) => {
    if (location.screenplayBreakdownId !== previous.id || !location.screenplayElementId) return location;
    const match = elementMatchesByPrevious.get(location.screenplayElementId);
    if (!match || match.category !== "location") {
      summary.locationsUnresolved += 1;
      return location;
    }
    summary.locationsRelinked += 1;
    return {
      ...location,
      screenplayBreakdownId: next.id,
      screenplayElementId: match.nextElementId,
      sourceBreakdownUpdatedAt: next.updatedAt,
      updatedAt: now,
    };
  });
  const productionTalent = collections.productionTalent.map((talent) => {
    if (talent.screenplayBreakdownId !== previous.id || !talent.screenplayElementId) return talent;
    const match = elementMatchesByPrevious.get(talent.screenplayElementId);
    if (!match || match.category !== "cast") {
      summary.talentUnresolved += 1;
      return talent;
    }
    summary.talentRelinked += 1;
    return {
      ...talent,
      screenplayBreakdownId: next.id,
      screenplayElementId: match.nextElementId,
      sourceBreakdownUpdatedAt: next.updatedAt,
      updatedAt: now,
    };
  });
  const productionShots = collections.productionShots.map((shot) => {
    if (shot.screenplayBreakdownId !== previous.id) return shot;
    const change = sceneChangesByPrevious.get(shot.sceneId);
    if (!change?.nextSceneId) {
      summary.shotsUnresolved += 1;
      return shot;
    }
    summary.shotsRelinked += 1;
    return {
      ...shot,
      screenplayBreakdownId: next.id,
      sceneId: change.nextSceneId,
      sourceBreakdownUpdatedAt: change.status === "changed" ? shot.sourceBreakdownUpdatedAt : next.updatedAt,
      updatedAt: now,
    };
  });

  return {
    comparison,
    productionSchedules,
    productionAvailability: [...createdAvailability, ...collections.productionAvailability],
    productionBudgetScenarios: [...createdBudgetScenarios, ...collections.productionBudgetScenarios],
    productionLocations,
    productionTalent,
    productionShots,
    summary,
  };
}

function pairRevisionScenes(
  previous: ScreenplayBreakdown,
  next: ScreenplayBreakdown,
  matchedPrevious: Set<string>,
  matchedNext: Set<string>,
  matches: Map<string, { nextSceneId: string; basis: ScreenplayRevisionMatchBasis }>,
  keyForScene: (scene: ScreenplayScene) => string,
  basis: ScreenplayRevisionMatchBasis,
  requireUnique: boolean,
): void {
  const previousByKey = revisionSceneBuckets(previous.scenes, matchedPrevious, keyForScene);
  const nextByKey = revisionSceneBuckets(next.scenes, matchedNext, keyForScene);
  for (const [key, previousScenes] of previousByKey) {
    const nextScenes = nextByKey.get(key) ?? [];
    if (requireUnique && (previousScenes.length !== 1 || nextScenes.length !== 1)) continue;
    const pairCount = Math.min(previousScenes.length, nextScenes.length);
    for (let index = 0; index < pairCount; index += 1) {
      const previousScene = previousScenes[index];
      const nextScene = nextScenes[index];
      if (!previousScene || !nextScene) continue;
      matchedPrevious.add(previousScene.id);
      matchedNext.add(nextScene.id);
      matches.set(previousScene.id, { nextSceneId: nextScene.id, basis });
    }
  }
}

function revisionSceneBuckets(
  scenes: ScreenplayScene[],
  matched: Set<string>,
  keyForScene: (scene: ScreenplayScene) => string,
): Map<string, ScreenplayScene[]> {
  const buckets = new Map<string, ScreenplayScene[]>();
  for (const scene of scenes) {
    if (matched.has(scene.id)) continue;
    const key = keyForScene(scene);
    if (!key) continue;
    const bucket = buckets.get(key) ?? [];
    bucket.push(scene);
    buckets.set(key, bucket);
  }
  return buckets;
}

function buildRevisionSceneChange(
  previousScene: ScreenplayScene | null,
  nextScene: ScreenplayScene | null,
  status: ScreenplayRevisionSceneStatus,
  matchBasis: ScreenplayRevisionMatchBasis | null,
): ScreenplayRevisionSceneChange {
  const previousId = previousScene?.id ?? "none";
  const nextId = nextScene?.id ?? "none";
  return {
    id: `screenplay_revision_change_${previousId}_${nextId}`,
    status,
    matchBasis,
    previousSceneId: previousScene?.id ?? null,
    nextSceneId: nextScene?.id ?? null,
    previousOrdinal: previousScene?.ordinal ?? null,
    nextOrdinal: nextScene?.ordinal ?? null,
    previousSceneNumber: previousScene?.sceneNumber ?? null,
    nextSceneNumber: nextScene?.sceneNumber ?? null,
    previousHeading: previousScene?.heading ?? null,
    nextHeading: nextScene?.heading ?? null,
  };
}

function normalizeRevisionSceneNumber(value: string | null): string {
  return value ? normalizeRevisionText(value) : "";
}

function normalizeRevisionSceneContent(scene: ScreenplayScene): string {
  return [
    scene.heading,
    scene.interiorExterior ?? "",
    scene.location ?? "",
    scene.timeOfDay ?? "",
    scene.synopsis ?? "",
    scene.sourceText,
  ].map(normalizeRevisionText).join("\u0000");
}

function normalizeRevisionText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("en-US");
}

function revisionElementKey(element: ProductionElement): string {
  return `${element.category}\u0000${normalizeRevisionText(element.normalizedName || element.name)}`;
}

function assertRevisionPair(previous: ScreenplayBreakdown, next: ScreenplayBreakdown): void {
  if (previous.projectId !== next.projectId) throw new Error("Screenplay revisions must belong to the same project.");
  if (previous.id === next.id) throw new Error("Screenplay revision comparison requires two different revisions.");
}

function assertComparisonPair(
  previous: ScreenplayBreakdown,
  next: ScreenplayBreakdown,
  comparison: ScreenplayRevisionComparison,
): void {
  assertRevisionPair(previous, next);
  if (comparison.previousBreakdownId !== previous.id || comparison.nextBreakdownId !== next.id) {
    throw new Error("Screenplay revision comparison does not match the requested revisions.");
  }
}

export function createProductionAvailabilityWindow(
  breakdown: ScreenplayBreakdown,
  elementId: string,
  status: ProductionAvailabilityStatus,
  startDate: string,
  endDate: string,
  notes = "",
  now = new Date().toISOString(),
): ProductionAvailabilityWindow {
  const element = breakdown.elements.find((candidate) => candidate.id === elementId);
  if (!element || (element.category !== "cast" && element.category !== "location")) {
    throw new Error("Availability requires a cast or location breakdown element.");
  }
  const normalizedStartDate = requireCalendarDate(startDate, "start date");
  const normalizedEndDate = requireCalendarDate(endDate, "end date");
  if (normalizedStartDate > normalizedEndDate) {
    throw new Error("Availability end date must be on or after the start date.");
  }
  return {
    schemaVersion: 1,
    id: `production_availability_${cryptoSafeId()}`,
    projectId: breakdown.projectId,
    screenplayBreakdownId: breakdown.id,
    elementId: element.id,
    resourceCategory: element.category,
    resourceName: element.name,
    status,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    notes: notes.trim().slice(0, 500),
    createdAt: now,
    updatedAt: now,
  };
}

export function removeProductionAvailabilityWindow(
  windows: ProductionAvailabilityWindow[],
  windowId: string,
): ProductionAvailabilityWindow[] {
  return windows.filter((window) => window.id !== windowId);
}

export function analyzeProductionSchedule(
  schedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
  availabilityWindows: ProductionAvailabilityWindow[],
): ProductionScheduleAnalysis {
  const { elementsById, requiredResourceIdsByDay, scenesByResourceAndDay } = buildScheduleResourceRequirements(schedule, breakdown);

  const relevantWindows = availabilityWindows.filter((window) => (
    window.projectId === schedule.projectId
    && window.screenplayBreakdownId === breakdown.id
  ));
  const conflicts: ProductionScheduleConflict[] = [];
  for (const day of schedule.shootDays) {
    const resourceIds = requiredResourceIdsByDay.get(day.id) ?? new Set<string>();
    if (!day.date && productionShootDayAssignmentCount(day) > 0) {
      conflicts.push(createScheduleConflict(schedule, day, {
        severity: "warning",
        kind: "shoot_day_undated",
        resource: null,
        sceneIds: productionShootDaySourceSceneIds(day),
        message: `Day ${day.ordinal} has assigned scenes but no date.`,
      }));
      continue;
    }
    if (!day.date) continue;
    for (const resourceId of resourceIds) {
      const resource = elementsById.get(resourceId);
      if (!resource || (resource.category !== "cast" && resource.category !== "location")) continue;
      const matchingWindows = relevantWindows.filter((window) => (
        window.elementId === resourceId
        && window.startDate <= day.date!
        && window.endDate >= day.date!
      ));
      const sceneIds = scenesByResourceAndDay.get(`${day.id}:${resourceId}`) ?? [];
      if (matchingWindows.some((window) => window.status === "unavailable")) {
        conflicts.push(createScheduleConflict(schedule, day, {
          severity: "blocking",
          kind: "resource_unavailable",
          resource: { id: resource.id, category: resource.category, name: resource.name },
          sceneIds,
          message: `${resource.name} is unavailable on ${day.date}.`,
        }));
      } else if (!matchingWindows.some((window) => window.status === "available" || window.status === "preferred")) {
        conflicts.push(createScheduleConflict(schedule, day, {
          severity: "warning",
          kind: "availability_unknown",
          resource: { id: resource.id, category: resource.category, name: resource.name },
          sceneIds,
          message: `${resource.name} has no availability confirmation for ${day.date}.`,
        }));
      }
    }
  }

  const datedDays = schedule.shootDays.filter((day): day is ProductionShootDay & { date: string } => Boolean(day.date));
  const castResources = breakdown.elements.filter((element) => element.category === "cast" && element.reviewState !== "dismissed");
  for (const resource of castResources) {
    const workDays = datedDays.filter((day) => requiredResourceIdsByDay.get(day.id)?.has(resource.id));
    const dates = uniqueStrings(workDays.map((day) => day.date));
    for (const date of dates) {
      const sameDateDays = workDays.filter((day) => day.date === date).sort((left, right) => left.ordinal - right.ordinal);
      if (new Set(sameDateDays.map((day) => normalizeProductionUnit(day.unit))).size < 2) continue;
      const conflictDay = sameDateDays.find((day) => normalizeProductionUnit(day.unit) === "second") ?? sameDateDays.at(-1);
      if (!conflictDay) continue;
      const sceneIds = uniqueStrings(sameDateDays.flatMap((day) => scenesByResourceAndDay.get(`${day.id}:${resource.id}`) ?? []));
      conflicts.push(createScheduleConflict(schedule, conflictDay, {
        severity: "blocking",
        kind: "cast_cross_unit_conflict",
        resource: { id: resource.id, category: "cast", name: resource.name },
        sceneIds,
        message: `${resource.name} is scheduled with both Main and Second units on ${date}.`,
      }));
    }
  }

  const cast = breakdown.elements
    .filter((element) => element.category === "cast" && element.reviewState !== "dismissed")
    .filter((element) => schedule.shootDays.some((day) => requiredResourceIdsByDay.get(day.id)?.has(element.id)))
    .sort((left, right) => left.name.localeCompare(right.name));
  const castDayStatusByElementAndDay = new Map(normalizeProductionCastDayAnnotations(
    schedule.castDayAnnotations,
    new Set(schedule.shootDays.map((day) => day.id)),
  ).map((annotation) => [`${annotation.elementId}\u0000${annotation.dayId}`, annotation.status]));
  const doodRows = cast.map((element): ProductionDoodRow => {
    const days = schedule.shootDays.map((day): ProductionDoodDay => {
      const sceneIds = scenesByResourceAndDay.get(`${day.id}:${element.id}`) ?? [];
      return {
        dayId: day.id,
        dayOrdinal: day.ordinal,
        date: day.date,
        unit: normalizeProductionUnit(day.unit),
        state: sceneIds.length > 0
          ? "work"
          : castDayStatusByElementAndDay.get(`${element.id}\u0000${day.id}`) ?? "off",
        sceneIds,
      };
    });
    const workDayOrdinals = days.filter((day) => day.state === "work").map((day) => day.dayOrdinal);
    const firstWorkDay = workDayOrdinals[0] ?? null;
    const lastWorkDay = workDayOrdinals.at(-1) ?? null;
    const spanDays = firstWorkDay === null || lastWorkDay === null ? 0 : lastWorkDay - firstWorkDay + 1;
    return {
      elementId: element.id,
      name: element.name,
      totalWorkDays: workDayOrdinals.length,
      firstWorkDay,
      lastWorkDay,
      spanDays,
      idleDays: days.filter((day) => (
        day.state === "off"
        && firstWorkDay !== null
        && lastWorkDay !== null
        && day.dayOrdinal >= firstWorkDay
        && day.dayOrdinal <= lastWorkDay
      )).length,
      travelDays: days.filter((day) => day.state === "travel").length,
      holdDays: days.filter((day) => day.state === "hold").length,
      days,
    };
  });

  return {
    scheduleId: schedule.id,
    screenplayBreakdownId: breakdown.id,
    blockingConflictCount: conflicts.filter((conflict) => conflict.severity === "blocking").length,
    warningConflictCount: conflicts.filter((conflict) => conflict.severity === "warning").length,
    conflicts,
    doodRows,
  };
}

export function analyzeProductionScheduleScenario(
  schedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
  availabilityWindows: ProductionAvailabilityWindow[] = [],
): ProductionScheduleScenarioAnalysis {
  const normalizedSchedule = normalizeProductionScheduleVersion(schedule);
  const assumptions = normalizedSchedule.assumptions;
  const requirements = buildScheduleResourceRequirements(normalizedSchedule, breakdown);
  const availabilityAnalysis = analyzeProductionSchedule(normalizedSchedule, breakdown, availabilityWindows);
  const scenesById = new Map(breakdown.scenes.map((scene) => [scene.id, scene]));
  const assumptionBreaches: ProductionScheduleAssumptionBreach[] = [];
  let assignedSceneCount = 0;
  let companyMoveCount = 0;
  let maxScenesInDay = 0;
  let maxLocationsInDay = 0;
  let maxCastInDay = 0;

  for (const day of normalizedSchedule.shootDays) {
    const scenes = productionShootDaySourceSceneIds(day).flatMap((sceneId) => {
      const scene = scenesById.get(sceneId);
      return scene ? [scene] : [];
    });
    const locations = scenes.map((scene) => scene.location?.trim() ?? "").filter(Boolean);
    const uniqueLocationCount = new Set(locations).size;
    const castCount = [...(requirements.requiredResourceIdsByDay.get(day.id) ?? [])]
      .filter((elementId) => requirements.elementsById.get(elementId)?.category === "cast")
      .length;
    let previousLocation: string | null = null;
    for (const location of locations) {
      if (previousLocation !== null && previousLocation !== location) companyMoveCount += 1;
      previousLocation = location;
    }

    const assignmentCount = productionShootDayAssignmentCount(day);
    assignedSceneCount += assignmentCount;
    maxScenesInDay = Math.max(maxScenesInDay, assignmentCount);
    maxLocationsInDay = Math.max(maxLocationsInDay, uniqueLocationCount);
    maxCastInDay = Math.max(maxCastInDay, castCount);
    addDailyAssumptionBreach(assumptionBreaches, normalizedSchedule, day, "scene_limit", assignmentCount, assumptions.maxScenesPerDay, "scene strips");
    addDailyAssumptionBreach(assumptionBreaches, normalizedSchedule, day, "location_limit", uniqueLocationCount, assumptions.maxLocationsPerDay, "locations");
    addDailyAssumptionBreach(assumptionBreaches, normalizedSchedule, day, "cast_limit", castCount, assumptions.maxCastPerDay, "cast members");
  }

  const maxConsecutiveShootDays = countMaxConsecutiveShootDays(normalizedSchedule.shootDays);
  if (maxConsecutiveShootDays > assumptions.maxConsecutiveShootDays) {
    assumptionBreaches.push({
      id: `${normalizedSchedule.id}:consecutive_day_limit`,
      kind: "consecutive_day_limit",
      dayId: null,
      dayOrdinal: null,
      actual: maxConsecutiveShootDays,
      limit: assumptions.maxConsecutiveShootDays,
      message: `${maxConsecutiveShootDays} consecutive dated shoot days exceeds the ${assumptions.maxConsecutiveShootDays}-day assumption.`,
    });
  }

  return {
    scheduleId: normalizedSchedule.id,
    assumptions,
    shootDayCount: normalizedSchedule.shootDays.length,
    assignedSceneCount,
    companyMoveCount,
    estimatedCompanyMoveMinutes: companyMoveCount * assumptions.companyMoveMinutes,
    maxScenesInDay,
    maxLocationsInDay,
    maxCastInDay,
    maxConsecutiveShootDays,
    blockingConflictCount: availabilityAnalysis.blockingConflictCount,
    warningConflictCount: availabilityAnalysis.warningConflictCount,
    assumptionBreaches,
  };
}

export function compareProductionScheduleScenarios(
  leftSchedule: ProductionScheduleVersion,
  rightSchedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
  availabilityWindows: ProductionAvailabilityWindow[] = [],
): ProductionScheduleScenarioComparison {
  const left = analyzeProductionScheduleScenario(leftSchedule, breakdown, availabilityWindows);
  const right = analyzeProductionScheduleScenario(rightSchedule, breakdown, availabilityWindows);
  const metricInputs: Array<[ProductionScheduleScenarioMetric["key"], string, number, number]> = [
    ["shootDayCount", "Shoot days", left.shootDayCount, right.shootDayCount],
    ["assignedSceneCount", "Assigned strips", left.assignedSceneCount, right.assignedSceneCount],
    ["companyMoveCount", "Company moves", left.companyMoveCount, right.companyMoveCount],
    ["estimatedCompanyMoveMinutes", "Move minutes", left.estimatedCompanyMoveMinutes, right.estimatedCompanyMoveMinutes],
    ["maxScenesInDay", "Peak scenes/day", left.maxScenesInDay, right.maxScenesInDay],
    ["maxLocationsInDay", "Peak locations/day", left.maxLocationsInDay, right.maxLocationsInDay],
    ["maxCastInDay", "Peak cast/day", left.maxCastInDay, right.maxCastInDay],
    ["blockingConflictCount", "Blocking conflicts", left.blockingConflictCount, right.blockingConflictCount],
    ["warningConflictCount", "Warnings", left.warningConflictCount, right.warningConflictCount],
    ["assumptionBreachCount", "Assumption breaches", left.assumptionBreaches.length, right.assumptionBreaches.length],
  ];
  return {
    left,
    right,
    metrics: metricInputs.map(([key, label, leftValue, rightValue]) => ({
      key,
      label,
      left: leftValue,
      right: rightValue,
      delta: rightValue - leftValue,
    })),
  };
}

export function createProductionBudgetScenario(
  schedule: ProductionScheduleVersion,
  title = `${schedule.title} Estimate`,
  now = new Date().toISOString(),
): ProductionBudgetScenario {
  return {
    schemaVersion: 1,
    id: `production_budget_${cryptoSafeId()}`,
    projectId: schedule.projectId,
    productionScheduleId: schedule.id,
    title: normalizeBudgetScenarioTitle(title),
    assumptions: { ...EMPTY_PRODUCTION_BUDGET_ASSUMPTIONS },
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProductionBudgetScenario(
  scenario: ProductionBudgetScenario,
  patch: Partial<ProductionBudgetAssumptions>,
  now = new Date().toISOString(),
): ProductionBudgetScenario {
  return {
    ...scenario,
    assumptions: normalizeProductionBudgetAssumptions({ ...scenario.assumptions, ...patch }),
    updatedAt: now,
  };
}

export function estimateProductionBudget(
  scenario: ProductionBudgetScenario,
  schedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
): ProductionBudgetEstimate {
  const assumptions = normalizeProductionBudgetAssumptions(scenario.assumptions);
  const scheduleAnalysis = analyzeProductionScheduleScenario(schedule, breakdown);
  const dood = analyzeProductionSchedule(schedule, breakdown, []).doodRows;
  const scenesById = new Map(breakdown.scenes.map((scene) => [scene.id, scene]));
  const scheduledDays = schedule.shootDays.filter((day) => productionShootDaySourceSceneIds(day).some((sceneId) => scenesById.has(sceneId)));
  const castWorkDays = dood.reduce((total, row) => total + row.totalWorkDays, 0);
  const locationDayUses = scheduledDays.reduce((total, day) => {
    const locations = productionShootDaySourceSceneIds(day).flatMap((sceneId) => {
      const location = scenesById.get(sceneId)?.location?.trim();
      return location ? [location] : [];
    });
    return total + new Set(locations).size;
  }, 0);
  const mealPersonDays = scheduledDays.reduce((total, day) => {
    const workingCast = dood.filter((row) => row.days.some((doodDay) => doodDay.dayId === day.id && doodDay.state === "work")).length;
    return total + assumptions.crewHeadcount + workingCast;
  }, 0);
  const lineInputs: Array<[ProductionBudgetEstimateLine["key"], string, number, string, number]> = [
    ["crew", "Crew", scheduledDays.length, "shoot days", assumptions.crewDayCostCents],
    ["cast", "Cast", castWorkDays, "cast work days", assumptions.castDayRateCents],
    ["locations", "Locations", locationDayUses, "location days", assumptions.locationDayRateCents],
    ["equipment", "Equipment", scheduledDays.length, "shoot days", assumptions.equipmentDayCostCents],
    ["company_moves", "Company moves", scheduleAnalysis.companyMoveCount, "moves", assumptions.companyMoveCostCents],
    ["meals", "Meals", mealPersonDays, "person days", assumptions.mealCostPerPersonCents],
  ];
  const lines = lineInputs.map(([key, label, units, unitLabel, unitCostCents]): ProductionBudgetEstimateLine => ({
    key,
    label,
    units,
    unitLabel,
    unitCostCents,
    totalCents: units * unitCostCents,
  }));
  const subtotalCents = lines.reduce((total, line) => total + line.totalCents, 0);
  const contingencyCents = Math.round(subtotalCents * assumptions.contingencyBasisPoints / 10_000);
  return {
    budgetScenarioId: scenario.id,
    productionScheduleId: schedule.id,
    scheduledShootDays: scheduledDays.length,
    castWorkDays,
    locationDayUses,
    companyMoves: scheduleAnalysis.companyMoveCount,
    mealPersonDays,
    lines,
    subtotalCents,
    contingencyCents,
    totalCents: subtotalCents + contingencyCents,
  };
}

export function createProductionCallSheetFromScheduleDay(
  schedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
  shootDayId: string,
  title?: string,
  now = new Date().toISOString(),
): ProductionCallSheet {
  const { castRequirements, ...snapshot } = productionCallSheetScheduleSnapshot(schedule, breakdown, shootDayId);
  const defaultCallTime = "07:00";
  return {
    schemaVersion: 1,
    id: `production_call_sheet_${cryptoSafeId()}`,
    ...snapshot,
    title: normalizeCallSheetTitle(title ?? `${schedule.title} - Day ${snapshot.dayOrdinal}${snapshot.unit === "second" ? " - Second Unit" : ""}`),
    status: "draft",
    callTime: defaultCallTime,
    estimatedWrapTime: "19:00",
    parkingInstructions: "",
    nearestHospital: "",
    weatherNotes: "",
    safetyNotes: "",
    castCalls: castRequirements.map((requirement) => ({
      ...requirement,
      performerName: "",
      callTime: defaultCallTime,
      notes: "",
    })),
    createdAt: now,
    updatedAt: now,
  };
}

export function syncProductionCallSheetFromScheduleDay(
  callSheet: ProductionCallSheet,
  schedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
  now = new Date().toISOString(),
): ProductionCallSheet {
  if (callSheet.status === "final") return callSheet;
  if (
    callSheet.projectId !== schedule.projectId
    || callSheet.productionScheduleId !== schedule.id
    || callSheet.screenplayBreakdownId !== breakdown.id
  ) {
    throw new Error("Call sheet sync requires its original schedule and screenplay breakdown.");
  }
  const snapshot = productionCallSheetScheduleSnapshot(schedule, breakdown, callSheet.shootDayId);
  const existingCastCalls = new Map(callSheet.castCalls.map((castCall) => [castCall.elementId, castCall]));
  return {
    ...callSheet,
    projectId: snapshot.projectId,
    productionScheduleId: snapshot.productionScheduleId,
    screenplayBreakdownId: snapshot.screenplayBreakdownId,
    shootDayId: snapshot.shootDayId,
    sourceScheduleUpdatedAt: snapshot.sourceScheduleUpdatedAt,
    date: snapshot.date,
    sceneIds: snapshot.sceneIds,
    sceneParts: snapshot.sceneParts,
    sceneStripOrder: snapshot.sceneStripOrder,
    dayOrdinal: snapshot.dayOrdinal,
    unit: snapshot.unit,
    totalShootDays: snapshot.totalShootDays,
    castCalls: snapshot.castRequirements.map((requirement) => {
      const existing = existingCastCalls.get(requirement.elementId);
      return {
        ...requirement,
        performerName: existing?.performerName ?? "",
        callTime: existing?.callTime ?? callSheet.callTime,
        notes: existing?.notes ?? "",
      };
    }),
    updatedAt: now,
  };
}

function productionCallSheetScheduleSnapshot(
  schedule: ProductionScheduleVersion,
  breakdown: ScreenplayBreakdown,
  shootDayId: string,
): Pick<ProductionCallSheet,
  | "projectId"
  | "productionScheduleId"
  | "screenplayBreakdownId"
  | "shootDayId"
  | "sourceScheduleUpdatedAt"
  | "date"
  | "primaryLocation"
  | "generalNotes"
  | "sceneIds"
  | "sceneParts"
  | "sceneStripOrder"
  | "dayOrdinal"
  | "unit"
  | "totalShootDays"
> & { castRequirements: Array<Pick<ProductionCallSheetCastCall, "elementId" | "name" | "sceneIds">> } {
  if (schedule.projectId !== breakdown.projectId || schedule.screenplayBreakdownId !== breakdown.id) {
    throw new Error("Call sheet schedule and screenplay breakdown must match.");
  }
  const day = schedule.shootDays.find((candidate) => candidate.id === shootDayId);
  if (!day) throw new Error("Call sheet shoot day was not found.");
  const scenesById = new Map(breakdown.scenes.map((scene) => [scene.id, scene]));
  const sceneIds = productionShootDaySourceSceneIds(day).filter((sceneId) => scenesById.has(sceneId));
  if (sceneIds.length === 0) throw new Error("Call sheets require at least one scheduled scene.");
  const castRequirements = productionCallSheetCastRequirements(sceneIds, breakdown);
  const primaryLocation = sceneIds
    .map((sceneId) => scenesById.get(sceneId)?.location?.trim() ?? "")
    .find(Boolean) ?? "";
  return {
    projectId: schedule.projectId,
    productionScheduleId: schedule.id,
    screenplayBreakdownId: breakdown.id,
    shootDayId: day.id,
    sourceScheduleUpdatedAt: schedule.updatedAt,
    date: day.date,
    primaryLocation: normalizeCallSheetText(primaryLocation, 200),
    generalNotes: normalizeCallSheetText(day.notes, 2_000),
    sceneIds,
    sceneParts: normalizeProductionScheduleSceneParts(day.sceneParts),
    sceneStripOrder: [...day.sceneIds, ...(day.sceneParts ?? []).map((part) => part.id)],
    dayOrdinal: day.ordinal,
    unit: normalizeProductionUnit(day.unit),
    totalShootDays: schedule.shootDays.length,
    castRequirements,
  };
}

export function updateProductionCallSheet(
  callSheet: ProductionCallSheet,
  patch: Partial<Pick<ProductionCallSheet,
    | "title"
    | "date"
    | "callTime"
    | "estimatedWrapTime"
    | "primaryLocation"
    | "parkingInstructions"
    | "nearestHospital"
    | "weatherNotes"
    | "generalNotes"
    | "safetyNotes"
  >>,
  now = new Date().toISOString(),
): ProductionCallSheet {
  if (callSheet.status === "final") return callSheet;
  return {
    ...callSheet,
    title: patch.title === undefined ? callSheet.title : normalizeCallSheetTitle(patch.title),
    date: patch.date === undefined ? callSheet.date : normalizeShootDayDate(patch.date),
    callTime: patch.callTime === undefined ? callSheet.callTime : normalizeClockTime(patch.callTime, callSheet.callTime),
    estimatedWrapTime: patch.estimatedWrapTime === undefined
      ? callSheet.estimatedWrapTime
      : normalizeClockTime(patch.estimatedWrapTime, callSheet.estimatedWrapTime),
    primaryLocation: patch.primaryLocation === undefined
      ? callSheet.primaryLocation
      : normalizeCallSheetText(patch.primaryLocation, 200),
    parkingInstructions: patch.parkingInstructions === undefined
      ? callSheet.parkingInstructions
      : normalizeCallSheetText(patch.parkingInstructions, 1_000),
    nearestHospital: patch.nearestHospital === undefined
      ? callSheet.nearestHospital
      : normalizeCallSheetText(patch.nearestHospital, 200),
    weatherNotes: patch.weatherNotes === undefined
      ? callSheet.weatherNotes
      : normalizeCallSheetText(patch.weatherNotes, 500),
    generalNotes: patch.generalNotes === undefined
      ? callSheet.generalNotes
      : normalizeCallSheetText(patch.generalNotes, 2_000),
    safetyNotes: patch.safetyNotes === undefined
      ? callSheet.safetyNotes
      : normalizeCallSheetText(patch.safetyNotes, 2_000),
    updatedAt: now,
  };
}

export function updateProductionCallSheetCastCall(
  callSheet: ProductionCallSheet,
  elementId: string,
  patch: Partial<Pick<ProductionCallSheetCastCall, "performerName" | "callTime" | "notes">>,
  now = new Date().toISOString(),
): ProductionCallSheet {
  if (callSheet.status === "final" || !callSheet.castCalls.some((castCall) => castCall.elementId === elementId)) {
    return callSheet;
  }
  return {
    ...callSheet,
    castCalls: callSheet.castCalls.map((castCall) => castCall.elementId === elementId
        ? {
          ...castCall,
          performerName: patch.performerName === undefined
            ? castCall.performerName
            : normalizeCallSheetText(patch.performerName, 200),
          callTime: patch.callTime === undefined
            ? castCall.callTime
            : normalizeClockTime(patch.callTime, castCall.callTime),
          notes: patch.notes === undefined ? castCall.notes : normalizeCallSheetText(patch.notes, 500),
        }
      : castCall),
    updatedAt: now,
  };
}

export function setProductionCallSheetStatus(
  callSheet: ProductionCallSheet,
  status: ProductionCallSheetStatus,
  now = new Date().toISOString(),
): ProductionCallSheet {
  return callSheet.status === status ? callSheet : { ...callSheet, status, updatedAt: now };
}

export function buildProductionCallSheetManifest(
  callSheet: ProductionCallSheet,
  breakdown: ScreenplayBreakdown,
): ProductionCallSheetManifest {
  const scenesById = new Map(breakdown.scenes.map((scene) => [scene.id, scene]));
  const scenes = callSheet.sceneIds.flatMap((sceneId): ProductionCallSheetScene[] => {
    const scene = scenesById.get(sceneId);
    return scene ? [{
      id: scene.id,
      ordinal: scene.ordinal,
      sceneNumber: scene.sceneNumber,
      heading: scene.heading,
      location: scene.location,
      timeOfDay: scene.timeOfDay,
      synopsis: scene.synopsis,
    }] : [];
  });
  return {
    callSheetId: callSheet.id,
    scenes,
    castCalls: clone(callSheet.castCalls),
    locations: uniqueStrings(scenes.map((scene) => scene.location?.trim() ?? "").filter(Boolean)),
    missingSceneIds: callSheet.sceneIds.filter((sceneId) => !scenesById.has(sceneId)),
  };
}

export function buildProductionSidesManifest(
  callSheet: ProductionCallSheet,
  breakdown: ScreenplayBreakdown,
): ProductionSidesManifest {
  if (callSheet.projectId !== breakdown.projectId || callSheet.screenplayBreakdownId !== breakdown.id) {
    throw new Error("Sides call sheet and screenplay breakdown must match.");
  }
  const scenesById = new Map(breakdown.scenes.map((scene) => [scene.id, scene]));
  const sceneParts = normalizeProductionScheduleSceneParts(callSheet.sceneParts);
  const scenePartsById = new Map(sceneParts.map((part) => [part.id, part]));
  const splitSceneIds = new Set(sceneParts.map((part) => part.sceneId));
  const fallbackOrder = [...callSheet.sceneIds.filter((sceneId) => !splitSceneIds.has(sceneId)), ...sceneParts.map((part) => part.id)];
  const sceneRefs: Array<{ sceneId: string; part: ProductionScheduleScenePart | null }> = (callSheet.sceneStripOrder ?? fallbackOrder)
    .flatMap((stripId): Array<{ sceneId: string; part: ProductionScheduleScenePart | null }> => {
      const part = scenePartsById.get(stripId) ?? null;
      if (part) return [{ sceneId: part.sceneId, part }];
      return callSheet.sceneIds.includes(stripId) && !splitSceneIds.has(stripId) ? [{ sceneId: stripId, part: null }] : [];
    });
  const scenes = sceneRefs.flatMap(({ sceneId, part }): ProductionSidesScene[] => {
    const scene = scenesById.get(sceneId);
    if (!scene) return [];
    const sourceStartLine = part?.sourceStartLine ?? scene.sourceStartLine;
    const sourceEndLine = part?.sourceEndLine ?? scene.sourceEndLine;
    return [{
      id: scene.id,
      ordinal: scene.ordinal,
      sceneNumber: scene.sceneNumber,
      heading: scene.heading,
      location: scene.location,
      timeOfDay: scene.timeOfDay,
      synopsis: scene.synopsis,
      ...(part ? { schedulePartId: part.id, schedulePartLabel: part.label } : {}),
      sourceStartLine,
      sourceEndLine,
      sourceText: sliceScreenplaySceneSource(scene, sourceStartLine, sourceEndLine),
      castCalls: clone(callSheet.castCalls.filter((castCall) => castCall.sceneIds.includes(scene.id))),
    }];
  });
  return {
    callSheetId: callSheet.id,
    screenplayBreakdownId: breakdown.id,
    screenplayRevisionId: breakdown.revision.id,
    screenplayTitle: breakdown.revision.title,
    scenes,
    missingSceneIds: callSheet.sceneIds.filter((sceneId) => !scenesById.has(sceneId)),
  };
}

export function createProductionShot(
  input: {
    projectId: string;
    breakdown: ScreenplayBreakdown;
    sceneId: string;
    description: string;
    existingShots?: ProductionShot[];
    documentIds?: string[];
  },
  now = new Date().toISOString(),
): ProductionShot {
  if (input.breakdown.projectId !== input.projectId) {
    throw new Error("Shot screenplay breakdown must belong to the project.");
  }
  if (!input.breakdown.scenes.some((scene) => scene.id === input.sceneId)) {
    throw new Error("Shots require a scene from the selected screenplay breakdown.");
  }
  const sceneShots = (input.existingShots ?? []).filter((shot) => (
    shot.projectId === input.projectId
    && shot.screenplayBreakdownId === input.breakdown.id
    && shot.sceneId === input.sceneId
  ));
  const ordinal = sceneShots.reduce((maximum, shot) => Math.max(maximum, shot.ordinal), 0) + 1;
  return {
    schemaVersion: 1,
    id: `production_shot_${cryptoSafeId()}`,
    projectId: input.projectId,
    screenplayBreakdownId: input.breakdown.id,
    sceneId: input.sceneId,
    sourceBreakdownUpdatedAt: input.breakdown.updatedAt,
    ordinal,
    shotNumber: String(ordinal),
    description: normalizeRequiredProductionShotDescription(input.description),
    status: "planned",
    shotSize: "",
    angle: "",
    movement: "",
    lens: "",
    cameraSupport: "",
    frameRate: "",
    estimatedMinutes: 0,
    setupGroup: "",
    audioNotes: "",
    lightingNotes: "",
    notes: "",
    documentIds: normalizeProductionResourceDocumentIds(input.documentIds ?? []),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProductionShot(
  shot: ProductionShot,
  patch: Partial<Pick<ProductionShot,
    | "shotNumber"
    | "description"
    | "status"
    | "shotSize"
    | "angle"
    | "movement"
    | "lens"
    | "cameraSupport"
    | "frameRate"
    | "estimatedMinutes"
    | "setupGroup"
    | "audioNotes"
    | "lightingNotes"
    | "notes"
    | "documentIds"
  >>,
  now = new Date().toISOString(),
): ProductionShot {
  return {
    ...shot,
    shotNumber: patch.shotNumber === undefined ? shot.shotNumber : normalizeProductionResourceText(patch.shotNumber, 40),
    description: patch.description === undefined
      ? shot.description
      : normalizeRequiredProductionShotDescription(patch.description),
    status: patch.status && isProductionShotStatus(patch.status) ? patch.status : shot.status,
    shotSize: patch.shotSize === undefined ? shot.shotSize : normalizeProductionResourceText(patch.shotSize, 100),
    angle: patch.angle === undefined ? shot.angle : normalizeProductionResourceText(patch.angle, 100),
    movement: patch.movement === undefined ? shot.movement : normalizeProductionResourceText(patch.movement, 200),
    lens: patch.lens === undefined ? shot.lens : normalizeProductionResourceText(patch.lens, 100),
    cameraSupport: patch.cameraSupport === undefined
      ? shot.cameraSupport
      : normalizeProductionResourceText(patch.cameraSupport, 200),
    frameRate: patch.frameRate === undefined ? shot.frameRate : normalizeProductionResourceText(patch.frameRate, 100),
    estimatedMinutes: boundedInteger(patch.estimatedMinutes, shot.estimatedMinutes, 0, 1_440),
    setupGroup: patch.setupGroup === undefined ? shot.setupGroup : normalizeProductionResourceText(patch.setupGroup, 100),
    audioNotes: patch.audioNotes === undefined ? shot.audioNotes : normalizeProductionResourceText(patch.audioNotes, 1_000),
    lightingNotes: patch.lightingNotes === undefined ? shot.lightingNotes : normalizeProductionResourceText(patch.lightingNotes, 1_000),
    notes: patch.notes === undefined ? shot.notes : normalizeProductionResourceText(patch.notes, 2_000),
    documentIds: patch.documentIds === undefined
      ? shot.documentIds
      : normalizeProductionResourceDocumentIds(patch.documentIds),
    updatedAt: now,
  };
}

export function reorderProductionShot(
  shots: ProductionShot[],
  shotId: string,
  direction: -1 | 1,
  now = new Date().toISOString(),
): ProductionShot[] {
  const selected = shots.find((shot) => shot.id === shotId);
  if (!selected) return clone(shots);
  const ordered = shots
    .filter((shot) => (
      shot.projectId === selected.projectId
      && shot.screenplayBreakdownId === selected.screenplayBreakdownId
      && shot.sceneId === selected.sceneId
    ))
    .sort((left, right) => left.ordinal - right.ordinal || left.createdAt.localeCompare(right.createdAt));
  const currentIndex = ordered.findIndex((shot) => shot.id === shotId);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return clone(shots);
  [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex]!, ordered[currentIndex]!];
  const ordinals = new Map(ordered.map((shot, index) => [shot.id, index + 1]));
  return shots.map((shot) => {
    const ordinal = ordinals.get(shot.id);
    return ordinal === undefined || ordinal === shot.ordinal ? clone(shot) : { ...shot, ordinal, updatedAt: now };
  });
}

export function buildProductionShotManifest(
  shot: ProductionShot,
  breakdown: ScreenplayBreakdown | null,
  schedules: ProductionScheduleVersion[],
  callSheets: ProductionCallSheet[],
): ProductionShotManifest {
  const sourceMissing = breakdown?.id !== shot.screenplayBreakdownId;
  const sourceChanged = Boolean(
    breakdown
    && shot.sourceBreakdownUpdatedAt
    && breakdown.updatedAt !== shot.sourceBreakdownUpdatedAt,
  );
  const matchingSceneIds = new Set([shot.sceneId]);
  return {
    productionShotId: shot.id,
    scene: productionResourceScenes(breakdown, matchingSceneIds)[0] ?? null,
    scheduleUses: productionResourceScheduleUses(
      shot.projectId,
      shot.screenplayBreakdownId,
      schedules,
      matchingSceneIds,
    ),
    callSheetUses: callSheets
      .filter((callSheet) => (
        callSheet.projectId === shot.projectId
        && callSheet.screenplayBreakdownId === shot.screenplayBreakdownId
        && callSheet.sceneIds.includes(shot.sceneId)
      ))
      .sort((left, right) => left.dayOrdinal - right.dayOrdinal || left.title.localeCompare(right.title))
      .map((callSheet) => ({
        callSheetId: callSheet.id,
        title: callSheet.title,
        status: callSheet.status,
        date: callSheet.date,
        dayOrdinal: callSheet.dayOrdinal,
        unit: normalizeProductionUnit(callSheet.unit),
      })),
    sourceMissing,
    sourceChanged,
  };
}

export function createProductionLocation(
  input: {
    projectId: string;
    name?: string;
    breakdown?: ScreenplayBreakdown | null;
    screenplayElementId?: string | null;
    documentIds?: string[];
  },
  now = new Date().toISOString(),
): ProductionLocation {
  const breakdown = input.breakdown ?? null;
  if (breakdown && breakdown.projectId !== input.projectId) {
    throw new Error("Location screenplay breakdown must belong to the project.");
  }
  const screenplayElementId = input.screenplayElementId ?? null;
  const element = screenplayElementId
    ? breakdown?.elements.find((candidate) => candidate.id === screenplayElementId) ?? null
    : null;
  if (screenplayElementId && (!element || element.category !== "location" || element.reviewState === "dismissed")) {
    throw new Error("Location records can link only to an active screenplay location element.");
  }
  const name = normalizeProductionResourceText(element?.name ?? input.name ?? "", 200);
  if (!name) throw new Error("Location records require a name.");
  return {
    schemaVersion: 1,
    id: `production_location_${cryptoSafeId()}`,
    projectId: input.projectId,
    screenplayBreakdownId: breakdown?.id ?? null,
    screenplayElementId,
    sourceBreakdownUpdatedAt: breakdown?.updatedAt ?? null,
    name,
    status: "scouting",
    address: "",
    contactName: "",
    contactDetails: "",
    permitStatus: "unknown",
    permitNotes: "",
    parkingAccess: "",
    powerNotes: "",
    soundNotes: "",
    restroomNotes: "",
    accessibilityNotes: "",
    nearestHospital: "",
    weatherNotes: "",
    safetyNotes: "",
    generalNotes: "",
    documentIds: normalizeProductionResourceDocumentIds(input.documentIds ?? []),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProductionLocation(
  location: ProductionLocation,
  patch: Partial<Pick<ProductionLocation,
    | "name"
    | "status"
    | "address"
    | "contactName"
    | "contactDetails"
    | "permitStatus"
    | "permitNotes"
    | "parkingAccess"
    | "powerNotes"
    | "soundNotes"
    | "restroomNotes"
    | "accessibilityNotes"
    | "nearestHospital"
    | "weatherNotes"
    | "safetyNotes"
    | "generalNotes"
    | "documentIds"
  >>,
  now = new Date().toISOString(),
): ProductionLocation {
  return {
    ...location,
    name: patch.name === undefined ? location.name : normalizeRequiredProductionLocationName(patch.name),
    status: patch.status && isProductionLocationStatus(patch.status) ? patch.status : location.status,
    address: patch.address === undefined ? location.address : normalizeProductionResourceText(patch.address, 500),
    contactName: patch.contactName === undefined ? location.contactName : normalizeProductionResourceText(patch.contactName, 200),
    contactDetails: patch.contactDetails === undefined
      ? location.contactDetails
      : normalizeProductionResourceText(patch.contactDetails, 500),
    permitStatus: patch.permitStatus && isProductionLocationPermitStatus(patch.permitStatus)
      ? patch.permitStatus
      : location.permitStatus,
    permitNotes: patch.permitNotes === undefined ? location.permitNotes : normalizeProductionResourceText(patch.permitNotes, 1_000),
    parkingAccess: patch.parkingAccess === undefined
      ? location.parkingAccess
      : normalizeProductionResourceText(patch.parkingAccess, 2_000),
    powerNotes: patch.powerNotes === undefined ? location.powerNotes : normalizeProductionResourceText(patch.powerNotes, 1_000),
    soundNotes: patch.soundNotes === undefined ? location.soundNotes : normalizeProductionResourceText(patch.soundNotes, 1_000),
    restroomNotes: patch.restroomNotes === undefined
      ? location.restroomNotes
      : normalizeProductionResourceText(patch.restroomNotes, 1_000),
    accessibilityNotes: patch.accessibilityNotes === undefined
      ? location.accessibilityNotes
      : normalizeProductionResourceText(patch.accessibilityNotes, 1_000),
    nearestHospital: patch.nearestHospital === undefined
      ? location.nearestHospital
      : normalizeProductionResourceText(patch.nearestHospital, 500),
    weatherNotes: patch.weatherNotes === undefined
      ? location.weatherNotes
      : normalizeProductionResourceText(patch.weatherNotes, 1_000),
    safetyNotes: patch.safetyNotes === undefined ? location.safetyNotes : normalizeProductionResourceText(patch.safetyNotes, 2_000),
    generalNotes: patch.generalNotes === undefined
      ? location.generalNotes
      : normalizeProductionResourceText(patch.generalNotes, 2_000),
    documentIds: patch.documentIds === undefined
      ? location.documentIds
      : normalizeProductionResourceDocumentIds(patch.documentIds),
    updatedAt: now,
  };
}

export function buildProductionLocationManifest(
  location: ProductionLocation,
  breakdown: ScreenplayBreakdown | null,
  schedules: ProductionScheduleVersion[],
  availability: ProductionAvailabilityWindow[],
): ProductionLocationManifest {
  const sourceMissing = Boolean(location.screenplayBreakdownId) && breakdown?.id !== location.screenplayBreakdownId;
  const sourceChanged = Boolean(
    breakdown
    && location.sourceBreakdownUpdatedAt
    && breakdown.updatedAt !== location.sourceBreakdownUpdatedAt,
  );
  const matchingSceneIds = productionResourceSceneIds(breakdown, "location", location.screenplayElementId, location.name);
  return {
    productionLocationId: location.id,
    scenes: productionResourceScenes(breakdown, matchingSceneIds),
    scheduleUses: productionResourceScheduleUses(
      location.projectId,
      location.screenplayBreakdownId,
      schedules,
      matchingSceneIds,
    ),
    availability: availability.filter((window) => (
      window.projectId === location.projectId
      && location.screenplayElementId !== null
      && window.elementId === location.screenplayElementId
    )),
    sourceMissing,
    sourceChanged,
  };
}

export function applyProductionLocationToCallSheet(
  location: ProductionLocation,
  callSheet: ProductionCallSheet,
  now = new Date().toISOString(),
): ProductionCallSheet {
  if (location.projectId !== callSheet.projectId) throw new Error("Location and call sheet projects must match.");
  if (location.status !== "confirmed") throw new Error("Only confirmed locations can populate a call sheet.");
  if (callSheet.status === "final") throw new Error("Final call sheets must be reopened before location logistics can be applied.");
  const label = [location.name, location.address].filter(Boolean).join(" - ");
  return updateProductionCallSheet(callSheet, {
    primaryLocation: label,
    parkingInstructions: location.parkingAccess || callSheet.parkingInstructions,
    nearestHospital: location.nearestHospital || callSheet.nearestHospital,
    weatherNotes: location.weatherNotes || callSheet.weatherNotes,
    safetyNotes: location.safetyNotes || callSheet.safetyNotes,
  }, now);
}

export function createProductionTalent(
  input: {
    projectId: string;
    characterName?: string;
    breakdown?: ScreenplayBreakdown | null;
    screenplayElementId?: string | null;
    documentIds?: string[];
  },
  now = new Date().toISOString(),
): ProductionTalent {
  const breakdown = input.breakdown ?? null;
  if (breakdown && breakdown.projectId !== input.projectId) {
    throw new Error("Talent screenplay breakdown must belong to the project.");
  }
  const screenplayElementId = input.screenplayElementId ?? null;
  const element = screenplayElementId
    ? breakdown?.elements.find((candidate) => candidate.id === screenplayElementId) ?? null
    : null;
  if (screenplayElementId && (!element || element.category !== "cast" || element.reviewState === "dismissed")) {
    throw new Error("Talent records can link only to an active screenplay cast element.");
  }
  const characterName = normalizeProductionResourceText(element?.name ?? input.characterName ?? "", 200);
  if (!characterName) throw new Error("Talent records require a character name.");
  return {
    schemaVersion: 1,
    id: `production_talent_${cryptoSafeId()}`,
    projectId: input.projectId,
    screenplayBreakdownId: breakdown?.id ?? null,
    screenplayElementId,
    sourceBreakdownUpdatedAt: breakdown?.updatedAt ?? null,
    characterName,
    performerName: "",
    status: "prospect",
    contactName: "",
    contactDetails: "",
    representativeName: "",
    representativeDetails: "",
    paperworkStatus: "not_started",
    rateBasis: "not_set",
    agreedRateCents: 0,
    dealNotes: "",
    travelNotes: "",
    dietaryNotes: "",
    accessibilityNotes: "",
    wardrobeNotes: "",
    generalNotes: "",
    documentIds: normalizeProductionResourceDocumentIds(input.documentIds ?? []),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProductionTalent(
  talent: ProductionTalent,
  patch: Partial<Pick<ProductionTalent,
    | "characterName"
    | "performerName"
    | "status"
    | "contactName"
    | "contactDetails"
    | "representativeName"
    | "representativeDetails"
    | "paperworkStatus"
    | "rateBasis"
    | "agreedRateCents"
    | "dealNotes"
    | "travelNotes"
    | "dietaryNotes"
    | "accessibilityNotes"
    | "wardrobeNotes"
    | "generalNotes"
    | "documentIds"
  >>,
  now = new Date().toISOString(),
): ProductionTalent {
  return {
    ...talent,
    characterName: patch.characterName === undefined
      ? talent.characterName
      : normalizeRequiredProductionTalentCharacter(patch.characterName),
    performerName: patch.performerName === undefined
      ? talent.performerName
      : normalizeProductionResourceText(patch.performerName, 200),
    status: patch.status && isProductionTalentStatus(patch.status) ? patch.status : talent.status,
    contactName: patch.contactName === undefined ? talent.contactName : normalizeProductionResourceText(patch.contactName, 200),
    contactDetails: patch.contactDetails === undefined
      ? talent.contactDetails
      : normalizeProductionResourceText(patch.contactDetails, 500),
    representativeName: patch.representativeName === undefined
      ? talent.representativeName
      : normalizeProductionResourceText(patch.representativeName, 200),
    representativeDetails: patch.representativeDetails === undefined
      ? talent.representativeDetails
      : normalizeProductionResourceText(patch.representativeDetails, 500),
    paperworkStatus: patch.paperworkStatus && isProductionTalentPaperworkStatus(patch.paperworkStatus)
      ? patch.paperworkStatus
      : talent.paperworkStatus,
    rateBasis: patch.rateBasis && isProductionTalentRateBasis(patch.rateBasis) ? patch.rateBasis : talent.rateBasis,
    agreedRateCents: boundedInteger(patch.agreedRateCents, talent.agreedRateCents, 0, 100_000_000_000),
    dealNotes: patch.dealNotes === undefined ? talent.dealNotes : normalizeProductionResourceText(patch.dealNotes, 2_000),
    travelNotes: patch.travelNotes === undefined ? talent.travelNotes : normalizeProductionResourceText(patch.travelNotes, 1_000),
    dietaryNotes: patch.dietaryNotes === undefined ? talent.dietaryNotes : normalizeProductionResourceText(patch.dietaryNotes, 1_000),
    accessibilityNotes: patch.accessibilityNotes === undefined
      ? talent.accessibilityNotes
      : normalizeProductionResourceText(patch.accessibilityNotes, 1_000),
    wardrobeNotes: patch.wardrobeNotes === undefined ? talent.wardrobeNotes : normalizeProductionResourceText(patch.wardrobeNotes, 1_000),
    generalNotes: patch.generalNotes === undefined ? talent.generalNotes : normalizeProductionResourceText(patch.generalNotes, 2_000),
    documentIds: patch.documentIds === undefined
      ? talent.documentIds
      : normalizeProductionResourceDocumentIds(patch.documentIds),
    updatedAt: now,
  };
}

export function buildProductionTalentManifest(
  talent: ProductionTalent,
  breakdown: ScreenplayBreakdown | null,
  schedules: ProductionScheduleVersion[],
  availability: ProductionAvailabilityWindow[],
): ProductionTalentManifest {
  const sourceMissing = Boolean(talent.screenplayBreakdownId) && breakdown?.id !== talent.screenplayBreakdownId;
  const sourceChanged = Boolean(
    breakdown
    && talent.sourceBreakdownUpdatedAt
    && breakdown.updatedAt !== talent.sourceBreakdownUpdatedAt,
  );
  const matchingElementId = talent.screenplayElementId ?? breakdown?.elements.find((element) => (
    element.category === "cast"
    && element.reviewState !== "dismissed"
    && normalizeProductionResourceMatchValue(element.name) === normalizeProductionResourceMatchValue(talent.characterName)
  ))?.id ?? null;
  const matchingSceneIds = productionResourceSceneIds(breakdown, "cast", matchingElementId, talent.characterName);
  return {
    productionTalentId: talent.id,
    scenes: productionResourceScenes(breakdown, matchingSceneIds),
    scheduleUses: productionResourceScheduleUses(
      talent.projectId,
      talent.screenplayBreakdownId,
      schedules,
      matchingSceneIds,
    ),
    availability: availability.filter((window) => (
      window.projectId === talent.projectId
      && matchingElementId !== null
      && window.elementId === matchingElementId
    )),
    sourceMissing,
    sourceChanged,
  };
}

export function applyProductionTalentToCallSheet(
  talent: ProductionTalent,
  callSheet: ProductionCallSheet,
  now = new Date().toISOString(),
): ProductionCallSheet {
  if (talent.projectId !== callSheet.projectId) throw new Error("Talent and call sheet projects must match.");
  if (talent.status !== "cast") throw new Error("Only cast talent can populate a call sheet.");
  if (!talent.performerName) throw new Error("Cast talent requires a performer name before call-sheet use.");
  if (!talent.screenplayElementId) throw new Error("Talent must link to a screenplay cast element before call-sheet use.");
  if (callSheet.status === "final") throw new Error("Final call sheets must be reopened before performer details can be applied.");
  if (!callSheet.castCalls.some((castCall) => castCall.elementId === talent.screenplayElementId)) {
    throw new Error("This call sheet does not require the linked character.");
  }
  return updateProductionCallSheetCastCall(callSheet, talent.screenplayElementId, {
    performerName: talent.performerName,
  }, now);
}

export function createProductionReportFromCallSheet(
  callSheet: ProductionCallSheet,
  crewCount = 0,
  title = `${callSheet.title} Report`,
  now = new Date().toISOString(),
): ProductionDailyReport {
  if (callSheet.sceneIds.length === 0) throw new Error("Production reports require a call sheet with scenes.");
  const normalizedCrewCount = boundedInteger(crewCount, 0, 0, 1_000);
  return {
    schemaVersion: 1,
    id: `production_report_${cryptoSafeId()}`,
    projectId: callSheet.projectId,
    productionCallSheetId: callSheet.id,
    productionScheduleId: callSheet.productionScheduleId,
    screenplayBreakdownId: callSheet.screenplayBreakdownId,
    sourceCallSheetUpdatedAt: callSheet.updatedAt,
    title: normalizeProductionReportTitle(title),
    status: "draft",
    date: callSheet.date,
    dayOrdinal: callSheet.dayOrdinal,
    unit: normalizeProductionUnit(callSheet.unit),
    primaryLocation: callSheet.primaryLocation,
    sceneResults: callSheet.sceneIds.map((sceneId) => ({ sceneId, status: "planned", notes: "" })),
    actualCrewCallTime: callSheet.callTime,
    firstShotTime: null,
    mealStartTime: null,
    mealEndTime: null,
    cameraWrapTime: null,
    crewWrapTime: callSheet.estimatedWrapTime,
    crewCount: normalizedCrewCount,
    castCount: callSheet.castCalls.length,
    backgroundCount: 0,
    mealCount: normalizedCrewCount + callSheet.castCalls.length,
    setupCount: 0,
    takeCount: 0,
    footageMinutes: 0,
    weatherActual: "",
    delayNotes: "",
    productionNotes: "",
    safetyIncidentNotes: "",
    tomorrowNotes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProductionReport(
  report: ProductionDailyReport,
  patch: Partial<Pick<ProductionDailyReport,
    | "title"
    | "date"
    | "primaryLocation"
    | "actualCrewCallTime"
    | "firstShotTime"
    | "mealStartTime"
    | "mealEndTime"
    | "cameraWrapTime"
    | "crewWrapTime"
    | "crewCount"
    | "castCount"
    | "backgroundCount"
    | "mealCount"
    | "setupCount"
    | "takeCount"
    | "footageMinutes"
    | "weatherActual"
    | "delayNotes"
    | "productionNotes"
    | "safetyIncidentNotes"
    | "tomorrowNotes"
  >>,
  now = new Date().toISOString(),
): ProductionDailyReport {
  if (report.status === "final") return report;
  return {
    ...report,
    title: patch.title === undefined ? report.title : normalizeProductionReportTitle(patch.title),
    date: patch.date === undefined ? report.date : normalizeShootDayDate(patch.date),
    primaryLocation: patch.primaryLocation === undefined
      ? report.primaryLocation
      : normalizeCallSheetText(patch.primaryLocation, 200),
    actualCrewCallTime: normalizeOptionalReportTime(patch.actualCrewCallTime, report.actualCrewCallTime),
    firstShotTime: normalizeOptionalReportTime(patch.firstShotTime, report.firstShotTime),
    mealStartTime: normalizeOptionalReportTime(patch.mealStartTime, report.mealStartTime),
    mealEndTime: normalizeOptionalReportTime(patch.mealEndTime, report.mealEndTime),
    cameraWrapTime: normalizeOptionalReportTime(patch.cameraWrapTime, report.cameraWrapTime),
    crewWrapTime: normalizeOptionalReportTime(patch.crewWrapTime, report.crewWrapTime),
    crewCount: normalizeOptionalReportCount(patch.crewCount, report.crewCount, 1_000),
    castCount: normalizeOptionalReportCount(patch.castCount, report.castCount, 1_000),
    backgroundCount: normalizeOptionalReportCount(patch.backgroundCount, report.backgroundCount, 10_000),
    mealCount: normalizeOptionalReportCount(patch.mealCount, report.mealCount, 10_000),
    setupCount: normalizeOptionalReportCount(patch.setupCount, report.setupCount, 10_000),
    takeCount: normalizeOptionalReportCount(patch.takeCount, report.takeCount, 100_000),
    footageMinutes: normalizeOptionalReportCount(patch.footageMinutes, report.footageMinutes, 1_000_000),
    weatherActual: patch.weatherActual === undefined ? report.weatherActual : normalizeCallSheetText(patch.weatherActual, 500),
    delayNotes: patch.delayNotes === undefined ? report.delayNotes : normalizeCallSheetText(patch.delayNotes, 2_000),
    productionNotes: patch.productionNotes === undefined ? report.productionNotes : normalizeCallSheetText(patch.productionNotes, 4_000),
    safetyIncidentNotes: patch.safetyIncidentNotes === undefined
      ? report.safetyIncidentNotes
      : normalizeCallSheetText(patch.safetyIncidentNotes, 4_000),
    tomorrowNotes: patch.tomorrowNotes === undefined ? report.tomorrowNotes : normalizeCallSheetText(patch.tomorrowNotes, 2_000),
    updatedAt: now,
  };
}

export function updateProductionReportSceneResult(
  report: ProductionDailyReport,
  sceneId: string,
  patch: Partial<Pick<ProductionReportSceneResult, "status" | "notes">>,
  now = new Date().toISOString(),
): ProductionDailyReport {
  if (report.status === "final" || !report.sceneResults.some((result) => result.sceneId === sceneId)) return report;
  return {
    ...report,
    sceneResults: report.sceneResults.map((result) => result.sceneId === sceneId
      ? {
          ...result,
          status: patch.status && isProductionReportSceneStatus(patch.status) ? patch.status : result.status,
          notes: patch.notes === undefined ? result.notes : normalizeCallSheetText(patch.notes, 1_000),
        }
      : result),
    updatedAt: now,
  };
}

export function setProductionReportStatus(
  report: ProductionDailyReport,
  status: ProductionCallSheetStatus,
  now = new Date().toISOString(),
): ProductionDailyReport {
  return report.status === status ? report : { ...report, status, updatedAt: now };
}

export function summarizeProductionReport(report: ProductionDailyReport): ProductionDailyReportSummary {
  const completedSceneCount = report.sceneResults.filter((result) => result.status === "completed").length;
  const partialSceneCount = report.sceneResults.filter((result) => result.status === "partial").length;
  const heldSceneCount = report.sceneResults.filter((result) => result.status === "held").length;
  const plannedSceneCount = report.sceneResults.length;
  const grossDayMinutes = clockDurationMinutes(report.actualCrewCallTime, report.crewWrapTime);
  const mealMinutes = Math.min(grossDayMinutes, clockDurationMinutes(report.mealStartTime, report.mealEndTime));
  return {
    productionReportId: report.id,
    plannedSceneCount,
    completedSceneCount,
    partialSceneCount,
    heldSceneCount,
    remainingSceneCount: plannedSceneCount - completedSceneCount,
    completionPercent: plannedSceneCount > 0 ? Math.round(completedSceneCount / plannedSceneCount * 100) : 0,
    grossDayMinutes,
    mealMinutes,
    workingMinutes: Math.max(0, grossDayMinutes - mealMinutes),
  };
}

function isProductionReportSceneStatus(value: string): value is ProductionReportSceneStatus {
  return value === "planned" || value === "completed" || value === "partial" || value === "held";
}

function normalizeOptionalReportTime(value: string | null | undefined, fallback: string | null): string | null {
  if (value === undefined) return fallback;
  if (value === null || value.trim() === "") return null;
  const normalized = normalizeClockTime(value, "");
  return normalized || fallback;
}

function normalizeOptionalReportCount(value: number | undefined, fallback: number, maximum: number): number {
  return value === undefined ? fallback : boundedInteger(value, fallback, 0, maximum);
}

function clockDurationMinutes(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const startMinutes = clockTimeMinutes(start);
  const endMinutes = clockTimeMinutes(end);
  if (startMinutes === null || endMinutes === null) return 0;
  return endMinutes >= startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
}

function clockTimeMinutes(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour! * 60 + minute!;
}

function productionCallSheetCastRequirements(
  sceneIds: string[],
  breakdown: ScreenplayBreakdown,
): Array<Pick<ProductionCallSheetCastCall, "elementId" | "name" | "sceneIds">> {
  const includedSceneIds = new Set(sceneIds);
  const elementsById = new Map(breakdown.elements.map((element) => [element.id, element]));
  const scenesByElementId = new Map<string, string[]>();
  for (const occurrence of breakdown.occurrences) {
    if (!includedSceneIds.has(occurrence.sceneId) || occurrence.reviewState === "dismissed") continue;
    const element = elementsById.get(occurrence.elementId);
    if (!element || element.category !== "cast" || element.reviewState === "dismissed") continue;
    const elementSceneIds = scenesByElementId.get(element.id) ?? [];
    if (!elementSceneIds.includes(occurrence.sceneId)) elementSceneIds.push(occurrence.sceneId);
    scenesByElementId.set(element.id, elementSceneIds);
  }
  return [...scenesByElementId.entries()]
    .flatMap(([elementId, requiredSceneIds]) => {
      const element = elementsById.get(elementId);
      return element ? [{ elementId, name: element.name, sceneIds: requiredSceneIds }] : [];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function createScheduleConflict(
  schedule: ProductionScheduleVersion,
  day: ProductionShootDay,
  input: {
    severity: ProductionScheduleConflict["severity"];
    kind: ProductionScheduleConflict["kind"];
    resource: { id: string; category: ProductionAvailabilityResourceCategory; name: string } | null;
    sceneIds: string[];
    message: string;
  },
): ProductionScheduleConflict {
  return {
    id: `${schedule.id}:${day.id}:${input.kind}:${input.resource?.id ?? "day"}`,
    severity: input.severity,
    kind: input.kind,
    scheduleId: schedule.id,
    dayId: day.id,
    dayOrdinal: day.ordinal,
    date: day.date,
    resourceId: input.resource?.id ?? null,
    resourceCategory: input.resource?.category ?? null,
    resourceName: input.resource?.name ?? null,
    sceneIds: [...input.sceneIds],
    message: input.message,
  };
}

function buildScheduleResourceRequirements(schedule: ProductionScheduleVersion, breakdown: ScreenplayBreakdown): {
  elementsById: Map<string, ProductionElement>;
  requiredResourceIdsByDay: Map<string, Set<string>>;
  scenesByResourceAndDay: Map<string, string[]>;
} {
  const elementsById = new Map(breakdown.elements.map((element) => [element.id, element]));
  const requiredResourceIdsByDay = new Map<string, Set<string>>();
  const scenesByResourceAndDay = new Map<string, string[]>();
  for (const day of schedule.shootDays) {
    const sceneIds = new Set(productionShootDaySourceSceneIds(day));
    const requiredIds = new Set<string>();
    for (const occurrence of breakdown.occurrences) {
      if (!sceneIds.has(occurrence.sceneId) || occurrence.reviewState === "dismissed") continue;
      const element = elementsById.get(occurrence.elementId);
      if (!element || element.reviewState === "dismissed" || (element.category !== "cast" && element.category !== "location")) continue;
      requiredIds.add(element.id);
      const key = `${day.id}:${element.id}`;
      const requiredSceneIds = scenesByResourceAndDay.get(key) ?? [];
      if (!requiredSceneIds.includes(occurrence.sceneId)) requiredSceneIds.push(occurrence.sceneId);
      scenesByResourceAndDay.set(key, requiredSceneIds);
    }
    requiredResourceIdsByDay.set(day.id, requiredIds);
  }
  return { elementsById, requiredResourceIdsByDay, scenesByResourceAndDay };
}

function addDailyAssumptionBreach(
  breaches: ProductionScheduleAssumptionBreach[],
  schedule: ProductionScheduleVersion,
  day: ProductionShootDay,
  kind: Exclude<ProductionScheduleAssumptionBreach["kind"], "consecutive_day_limit">,
  actual: number,
  limit: number,
  unit: string,
): void {
  if (actual <= limit) return;
  breaches.push({
    id: `${schedule.id}:${day.id}:${kind}`,
    kind,
    dayId: day.id,
    dayOrdinal: day.ordinal,
    actual,
    limit,
    message: `Day ${day.ordinal} has ${actual} ${unit}; the current assumption is ${limit}.`,
  });
}

function countMaxConsecutiveShootDays(days: ProductionShootDay[]): number {
  return Math.max(
    ...(["main", "second"] as ProductionUnit[]).map((unit) => countMaxConsecutiveDates(
      uniqueStrings(days
        .filter((day) => normalizeProductionUnit(day.unit) === unit && day.date)
        .map((day) => day.date!))
        .sort(),
    )),
  );
}

function countMaxConsecutiveDates(dates: string[]): number {
  let maximum = 0;
  let current = 0;
  let previousDate: string | null = null;
  for (const date of dates) {
    current = previousDate && calendarDayDifference(previousDate, date) === 1 ? current + 1 : 1;
    maximum = Math.max(maximum, current);
    previousDate = date;
  }
  return maximum;
}

function calendarDayDifference(left: string, right: string): number {
  return Math.round((Date.parse(`${right}T00:00:00.000Z`) - Date.parse(`${left}T00:00:00.000Z`)) / 86_400_000);
}

function createProductionShootDay(ordinal: number, date: string | null = null): ProductionShootDay {
  return {
    id: `production_day_${cryptoSafeId()}`,
    ordinal,
    date,
    unit: "main",
    sceneIds: [],
    notes: "",
  };
}

function normalizeProductionUnit(value: unknown): ProductionUnit {
  return value === "second" ? "second" : "main";
}

function normalizeProductionScheduleSceneParts(parts: ProductionScheduleScenePart[] | undefined): ProductionScheduleScenePart[] {
  if (!Array.isArray(parts)) return [];
  const seen = new Set<string>();
  return parts.slice(0, 10_000).flatMap((part) => {
    if (!part || typeof part.id !== "string" || !part.id || seen.has(part.id) || typeof part.sceneId !== "string" || !part.sceneId) return [];
    if (!Number.isInteger(part.sourceStartLine) || !Number.isInteger(part.sourceEndLine) || part.sourceStartLine < 1 || part.sourceEndLine < part.sourceStartLine) return [];
    seen.add(part.id);
    return [{
      id: part.id,
      sceneId: part.sceneId,
      label: part.label.trim().replace(/\s+/g, " ").slice(0, 12) || "Part",
      sourceStartLine: part.sourceStartLine,
      sourceEndLine: part.sourceEndLine,
    }];
  });
}

function productionScheduleSceneParts(schedule: ProductionScheduleVersion): ProductionScheduleScenePart[] {
  return [
    ...(schedule.unassignedSceneParts ?? []),
    ...schedule.shootDays.flatMap((day) => day.sceneParts ?? []),
  ];
}

function productionShootDaySourceSceneIds(day: ProductionShootDay): string[] {
  return uniqueStrings([...day.sceneIds, ...(day.sceneParts ?? []).map((part) => part.sceneId)]);
}

function productionShootDayAssignmentCount(day: ProductionShootDay): number {
  return day.sceneIds.length + (day.sceneParts?.length ?? 0);
}

function sliceScreenplaySceneSource(scene: ScreenplayScene, sourceStartLine: number, sourceEndLine: number): string {
  const startOffset = Math.max(0, sourceStartLine - scene.sourceStartLine);
  const endOffset = Math.max(startOffset, sourceEndLine - scene.sourceStartLine + 1);
  return scene.sourceText.split("\n").slice(startOffset, endOffset).join("\n");
}

function normalizeScheduleTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 120) || "Untitled schedule";
}

function normalizeProductionScheduleAssumptions(input: Partial<ProductionScheduleAssumptions>): ProductionScheduleAssumptions {
  return {
    maxScenesPerDay: boundedInteger(input.maxScenesPerDay, MICRO_BUDGET_SCHEDULE_ASSUMPTIONS.maxScenesPerDay, 1, 30),
    maxLocationsPerDay: boundedInteger(input.maxLocationsPerDay, MICRO_BUDGET_SCHEDULE_ASSUMPTIONS.maxLocationsPerDay, 1, 12),
    maxCastPerDay: boundedInteger(input.maxCastPerDay, MICRO_BUDGET_SCHEDULE_ASSUMPTIONS.maxCastPerDay, 1, 50),
    maxConsecutiveShootDays: boundedInteger(input.maxConsecutiveShootDays, MICRO_BUDGET_SCHEDULE_ASSUMPTIONS.maxConsecutiveShootDays, 1, 14),
    companyMoveMinutes: boundedInteger(input.companyMoveMinutes, MICRO_BUDGET_SCHEDULE_ASSUMPTIONS.companyMoveMinutes, 0, 240),
  };
}

function normalizeProductionBudgetAssumptions(input: Partial<ProductionBudgetAssumptions>): ProductionBudgetAssumptions {
  return {
    crewDayCostCents: boundedInteger(input.crewDayCostCents, 0, 0, 100_000_000_000),
    castDayRateCents: boundedInteger(input.castDayRateCents, 0, 0, 100_000_000_000),
    locationDayRateCents: boundedInteger(input.locationDayRateCents, 0, 0, 100_000_000_000),
    equipmentDayCostCents: boundedInteger(input.equipmentDayCostCents, 0, 0, 100_000_000_000),
    companyMoveCostCents: boundedInteger(input.companyMoveCostCents, 0, 0, 100_000_000_000),
    crewHeadcount: boundedInteger(input.crewHeadcount, 0, 0, 1_000),
    mealCostPerPersonCents: boundedInteger(input.mealCostPerPersonCents, 0, 0, 10_000_000),
    contingencyBasisPoints: boundedInteger(input.contingencyBasisPoints, 0, 0, 5_000),
  };
}

function normalizeBudgetScenarioTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 120) || "Untitled estimate";
}

function normalizeCallSheetTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 120) || "Untitled call sheet";
}

function normalizeProductionReportTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 120) || "Untitled production report";
}

function normalizeRequiredProductionLocationName(value: string): string {
  const name = normalizeProductionResourceText(value, 200);
  if (!name) throw new Error("Location records require a name.");
  return name;
}

function normalizeRequiredProductionTalentCharacter(value: string): string {
  const name = normalizeProductionResourceText(value, 200);
  if (!name) throw new Error("Talent records require a character name.");
  return name;
}

function normalizeRequiredProductionShotDescription(value: string): string {
  const description = normalizeProductionResourceText(value, 500);
  if (!description) throw new Error("Shots require a description.");
  return description;
}

function normalizeProductionResourceText(value: string, maximumLength: number): string {
  return value.trim().replace(/\r\n?/g, "\n").slice(0, maximumLength);
}

function normalizeProductionResourceDocumentIds(values: string[]): string[] {
  return uniqueStrings(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim())).slice(0, 100);
}

function normalizeProductionResourceMatchValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase();
}

function isProductionLocationStatus(value: string): value is ProductionLocationStatus {
  return value === "scouting" || value === "hold" || value === "confirmed" || value === "released";
}

function isProductionLocationPermitStatus(value: string): value is ProductionLocationPermitStatus {
  return value === "unknown" || value === "not_required" || value === "planned" || value === "submitted" || value === "approved";
}

function isProductionTalentStatus(value: string): value is ProductionTalentStatus {
  return value === "prospect" || value === "contacted" || value === "auditioning" || value === "offered" || value === "cast" || value === "released";
}

function isProductionTalentPaperworkStatus(value: string): value is ProductionTalentPaperworkStatus {
  return value === "not_started" || value === "requested" || value === "partial" || value === "complete";
}

function isProductionTalentRateBasis(value: string): value is ProductionTalentRateBasis {
  return value === "not_set" || value === "unpaid" || value === "flat" || value === "day" || value === "week" || value === "deferred" || value === "other";
}

function isProductionShotStatus(value: string): value is ProductionShotStatus {
  return value === "planned" || value === "ready" || value === "captured" || value === "omitted";
}

function productionResourceSceneIds(
  breakdown: ScreenplayBreakdown | null,
  category: "cast" | "location",
  screenplayElementId: string | null,
  resourceName: string,
): Set<string> {
  const sceneIds = new Set<string>();
  if (!breakdown) return sceneIds;
  const normalizedName = normalizeProductionResourceMatchValue(resourceName);
  const matchingElementIds = new Set(breakdown.elements.flatMap((element) => (
    element.category === category
    && element.reviewState !== "dismissed"
    && (element.id === screenplayElementId || (!screenplayElementId && normalizeProductionResourceMatchValue(element.name) === normalizedName))
      ? [element.id]
      : []
  )));
  for (const occurrence of breakdown.occurrences) {
    if (matchingElementIds.has(occurrence.elementId) && occurrence.reviewState !== "dismissed") sceneIds.add(occurrence.sceneId);
  }
  if (category === "location" && !screenplayElementId) {
    for (const scene of breakdown.scenes) {
      if (normalizeProductionResourceMatchValue(scene.location ?? "") === normalizedName) sceneIds.add(scene.id);
    }
  }
  return sceneIds;
}

function productionResourceScenes(
  breakdown: ScreenplayBreakdown | null,
  matchingSceneIds: Set<string>,
): ProductionCallSheetScene[] {
  return breakdown?.scenes.flatMap((scene): ProductionCallSheetScene[] => matchingSceneIds.has(scene.id) ? [{
    id: scene.id,
    ordinal: scene.ordinal,
    sceneNumber: scene.sceneNumber,
    heading: scene.heading,
    location: scene.location,
    timeOfDay: scene.timeOfDay,
    synopsis: scene.synopsis,
  }] : []) ?? [];
}

function productionResourceScheduleUses(
  projectId: string,
  screenplayBreakdownId: string | null,
  schedules: ProductionScheduleVersion[],
  matchingSceneIds: Set<string>,
): ProductionResourceScheduleUse[] {
  return schedules
    .filter((schedule) => schedule.projectId === projectId && (
      !screenplayBreakdownId || schedule.screenplayBreakdownId === screenplayBreakdownId
    ))
    .flatMap((schedule) => schedule.shootDays.flatMap((day): ProductionResourceScheduleUse[] => {
      const sceneIds = productionShootDaySourceSceneIds(day).filter((sceneId) => matchingSceneIds.has(sceneId));
      return sceneIds.length ? [{
        scheduleId: schedule.id,
        scheduleTitle: schedule.title,
        scheduleStatus: schedule.status,
        shootDayId: day.id,
        dayOrdinal: day.ordinal,
        unit: normalizeProductionUnit(day.unit),
        date: day.date,
        sceneIds,
      }] : [];
    }));
}

function normalizeCallSheetText(value: string, maximumLength: number): string {
  return value.trim().replace(/\r\n?/g, "\n").slice(0, maximumLength);
}

function normalizeClockTime(value: string, fallback: string): string {
  const normalized = value.trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) return fallback;
  return normalized;
}

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, Math.round(value)))
    : fallback;
}

function normalizeShootDayDate(value: string | null): string | null {
  return value && isCalendarDate(value) ? value : null;
}

function requireCalendarDate(value: string, label: string): string {
  if (!isCalendarDate(value)) throw new Error(`Availability ${label} must use YYYY-MM-DD.`);
  return value;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function cloneWorkspace(data: WorkspaceData): WorkspaceData {
  return clone(data);
}

export function createAuditEvent(
  message: string,
  actor: string,
  tone: Tone,
  when = "Just now",
): AuditEvent {
  return {
    id: `audit_${cryptoSafeId()}`,
    message,
    actor,
    tone,
    when,
  };
}

export function getProjectById(data: WorkspaceData, id: string): FilmProject | undefined {
  return data.projects.find((project) => project.id === id);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatWorkspaceRole(role: WorkspaceRole): string {
  return role.split("_").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
}

function integration(
  key: IntegrationKey,
  label: string,
  mode: IntegrationStatus["mode"],
  status: IntegrationStatus["status"],
): IntegrationStatus {
  return {
    key,
    label,
    mode,
    status,
    lastCheckedAt: "2026-07-07T00:00:00.000Z",
  };
}

function makeProject(
  id: string,
  title: string,
  phase: ProjectPhase,
  tone: Tone,
  progress: number,
  shootDates: string,
  spentBudget: number,
  totalBudget: number,
  done: number,
  total: number,
): FilmProject {
  return {
    ...seedProjectShell,
    id,
    title,
    phase,
    phaseTone: tone,
    color: tone,
    progress,
    shootDates,
    spentBudget,
    totalBudget,
    tasks: { done, total },
    starred: false,
    description: `${title} is staged from the reusable film project template.`,
  };
}

function makeDustWaveWorkspace(): WorkspaceData {
  const feature: FilmProject = {
    ...clone(seedProjectShell),
    id: "proj_dust_wave_feature",
    title: "Dust Wave Feature",
    type: "Feature Film",
    runtimeMinutes: 96,
    format: "Color",
    phase: "Pre-Production",
    phaseTone: "amber",
    color: "amber",
    starred: true,
    progress: 42,
    shootDates: "Sep 9 - Sep 30, 2026",
    spentBudget: 18450,
    totalBudget: 88000,
    location: "Marfa, TX",
    workflow: "Notion import rehearsal + Native docs",
    description:
      "Dust Wave follows a desert archivist assembling a film from fragments, permits, grants, and borrowed equipment.",
    tasks: { done: 7, total: 18 },
    timeline: [
      { month: "Jul", label: "Development", start: 10, width: 20, tone: "blue" },
      { month: "Aug", label: "Pre-Production", start: 32, width: 26, tone: "amber" },
      { month: "Sep", label: "Production", start: 62, width: 18, tone: "teal" },
      { month: "Oct", label: "Post-Production", start: 82, width: 12, tone: "gray" },
    ],
    openTasks: [
      { id: "task_dust_pitch", title: "Lock pitch deck", due: "Jul 20", status: "pending" },
      { id: "task_dust_permits", title: "Confirm desert location permits", due: "Aug 2", status: "pending" },
      { id: "task_dust_lenses", title: "Reserve vintage lens set", due: "Aug 5", status: "ready" },
    ],
    docs: [
      { id: "doc_dust_lookbook", name: "Lookbook.pdf", date: "Imported", type: "PDF", sourcePath: "Docs/Lookbook.pdf" },
      { id: "doc_dust_pitch", name: "Pitch deck.pdf", date: "Imported", type: "PDF", sourcePath: "Docs/Pitch deck.pdf" },
      {
        id: "doc_dust_poster",
        name: "Poster still.png",
        date: "Stored",
        type: "ASSET",
        sourcePath: "Assets/Poster still.png",
        sourceSizeBytes: 4096,
        sourceContentType: "image/png",
        attachmentStatus: "stored_r2",
        attachmentSha256: "d".repeat(64),
        attachmentR2ObjectKey: "workspaces/workspace_dust_wave/attachments/doc_dust_poster/poster-still.png",
        attachmentCommittedAt: "2026-07-08T00:00:00.000Z",
      },
    ],
    people: [
      { id: "person_jordan_vale", name: "Jordan Vale", role: "Director", initials: "JV" },
      { id: "person_mina_ortiz", name: "Mina Ortiz", role: "Producer", initials: "MO" },
      { id: "person_kai_mercer", name: "Kai Mercer", role: "DP", initials: "KM" },
    ],
    equipment: [
      { id: "equipment_vintage_lens_set", name: "Vintage Lens Set", status: "Checkout Closet", statusTone: "amber" },
      { id: "equipment_dustproof_camera_build", name: "Dustproof Camera Build", status: "Prep", statusTone: "blue" },
      { id: "equipment_field_recorder_kit", name: "Field Recorder Kit", status: "Ready", statusTone: "teal" },
    ],
    expenses: [
      { id: "expense_festival_submission", category: "Festival submission", spent: 75, budget: 350, percent: 21 },
      { id: "expense_location_permits", category: "Location permits", spent: 1800, budget: 5000, percent: 36 },
      { id: "expense_equipment_holds", category: "Equipment holds", spent: 3200, budget: 12000, percent: 27 },
    ],
    callSheet: {
      day: "09",
      month: "Sep 2026",
      callTime: "6:15 AM",
      wrapTime: "6:45 PM",
      location: "Ranch Road Unit Base, Marfa, TX",
      dayNumber: 1,
      totalDays: 18,
      scenes: 3,
      pages: "4 1/8",
      people: 19,
      weather: "94 / Dry",
    },
  };

  const operations = makeProject("proj_dust_operations", "Dust Wave Operations", "Development", "blue", 18, "Rolling", 2100, 12000, 3, 11);
  operations.workflow = "Relation-list import staging";
  operations.description = "Operational records used to test relation-list imports, grants, equipment, and docs.";

  return {
    id: "workspace_dust_wave",
    name: "Dust Wave Pictures",
    archivedProjectCount: 0,
    backupPolicy: "Manual after import rehearsal",
    nextBackup: "Not scheduled",
    integrations: [
      integration("pool", "Pool", "dry-run", "ready"),
      integration("store", "Store", "dry-run", "ready"),
      integration("stripe", "Stripe", "dry-run", "needs_scope"),
      integration("social", "Meta Insights", "dry-run", "needs_scope"),
      integration("google", "Google Drive", "dry-run", "needs_scope"),
      integration("resend", "Resend", "dry-run", "needs_scope"),
      integration("sms", "Telnyx SMS", "dry-run", "needs_scope"),
    ],
    members: [
      {
        id: "member_dust_owner",
        displayName: "Dust Owner",
        emailHash: "8d4e2f7d2b3b2b3db9bd46ddf15c55f0212d7a764cbb92f07a7dd9f623c8fd15",
        role: "owner",
        status: "active",
        lastSeenAt: "2026-07-08T00:00:00.000Z",
      },
      {
        id: "member_dust_producer",
        displayName: "Mina O.",
        emailHash: "c48f9d3215b6f2f2f03d85c17d88f8d08a0f8bf09d4fd5515037ea92686b8b91",
        role: "producer",
        status: "active",
        lastSeenAt: "2026-07-07T18:00:00.000Z",
      },
    ],
    projects: [feature, operations],
    screenplayBreakdowns: [],
    productionSchedules: [],
    productionAvailability: [],
    productionBudgetScenarios: [],
    productionCallSheets: [],
    productionReports: [],
    productionLocations: [],
    productionTalent: [],
    productionShots: [],
    restorePoints: [
      { id: "restore_dust_latest", label: "Jul 8, 2026 at 12:00 AM", createdAt: "2026-07-08T00:00:00.000Z" },
    ],
    auditLog: [
      { id: "audit_dust_import", message: "Dust Wave fixture imported", actor: "System", tone: "blue", when: "Jul 8, 12:00 AM" },
      { id: "audit_dust_backup", message: "Fixture backup verified", actor: "System", tone: "teal", when: "Jul 8, 12:05 AM" },
    ],
  };
}

function validateOperationForSync(operation: OperationRecord): string | null {
  if (!operation || typeof operation !== "object") return "invalid_operation";
  if (typeof operation.id !== "string" || !operation.id.startsWith("op_")) return "invalid_id";
  if (typeof operation.workspaceId !== "string" || !operation.workspaceId) return "invalid_workspace";
  if (operation.status !== "queued") return "invalid_status";
  if (!isAllowedOperationPair(operation.kind, operation.entityType)) return "invalid_kind_entity";
  if (typeof operation.entityId !== "string" || !operation.entityId) return "invalid_entity";
  if (typeof operation.summary !== "string" || operation.summary.length > 240) return "invalid_summary";
  if (!isIsoDate(operation.createdAt)) return "invalid_created_at";
  if (!isSafePayload(operation.payload)) return "invalid_payload";
  return null;
}

function isAllowedOperationPair(
  kind: OperationKind,
  entityType: OperationRecord["entityType"],
): boolean {
  const allowed: Record<OperationKind, OperationRecord["entityType"][]> = {
    "workspace.seeded": ["workspace"],
    "project.created": ["project"],
    "task.created": ["task"],
    "task.updated": ["task"],
    "task.completed": ["task"],
    "document.created": ["document"],
    "document.updated": ["document"],
    "person.created": ["person"],
    "equipment.created": ["equipment"],
    "expense.created": ["expense"],
    "backup.exported": ["backup"],
    "restore.dry_run": ["restore_point", "backup"],
    "import.notion_applied": ["import"],
  };
  return Boolean(allowed[kind]?.includes(entityType));
}

function isIsoDate(value: string): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isSafePayload(value: Record<string, unknown>): boolean {
  try {
    const encoded = JSON.stringify(value);
    return typeof encoded === "string" && encoded.length <= 64 * 1024;
  } catch {
    return false;
  }
}

function initialsForName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("");
  return initials || "P";
}

function normalizeMoney(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return slug || "film";
}

function ensureExtension(name: string, type: ProjectDoc["type"]): string {
  const trimmed = name.trim();
  if (type === "ASSET") return trimmed;
  if (/\.[a-z0-9]+$/i.test(trimmed)) return trimmed;

  const extension = type === "XLSX" ? "xlsx" : type === "PDF" ? "pdf" : type === "CSV" ? "csv" : "md";
  return `${trimmed}.${extension}`;
}

function cryptoSafeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}
