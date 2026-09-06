import { buildProductionCallSheetManifest, summarizeProductionReport, type FilmProject, type ProductionCallSheet, type ProductionCallSheetManifest, type ProductionDailyReport, type ProductionReportSceneStatus } from "@film/schema";
import { icon } from "./icons";
import { escapeHtml, escapeAttribute, formatDocStatus, formatProductionMinutes, formatShortDateTime, productionUnitLabel } from "./presentation-format";
import { productionCallSheetStripCount } from "./project-summary";
import type { CallSheetsViewState, SidesViewState, ReportsViewState, ProductionDocumentsViewState } from "./production-documents-state";

export function renderProductionDocuments(state: ProductionDocumentsViewState): string {
  switch (state.section) {
    case "call-sheets": return renderCallSheetsWorkspace(state);
    case "sides": return renderSidesWorkspace(state);
    case "reports": return renderProductionReportsWorkspace(state);
  }
}

function renderCallSheetSelector(callSheets: ProductionCallSheet[], selectedId: string | undefined, label: string): string {
  if (!callSheets.length) return "";
  return `<label class="compact-select-label">
    <span>Call sheet</span>
    <select data-action="call-sheet-select" aria-label="${escapeAttribute(label)}">
      ${callSheets.map((candidate) => `<option value="${escapeAttribute(candidate.id)}" ${candidate.id === selectedId ? "selected" : ""}>${escapeHtml(candidate.title)} - ${escapeHtml(candidate.status)}</option>`).join("")}
    </select>
  </label>`;
}

function renderCallSheetsWorkspace({ project, callSheets, callSheet, source, sourceOptions }: CallSheetsViewState): string {
  const legacyCallSheet = project.callSheet;
  const manifest = callSheet && source ? buildProductionCallSheetManifest(callSheet, source.breakdown) : null;
  const sourceChanged = Boolean(callSheet && source && callSheet.sourceScheduleUpdatedAt !== source.schedule.updatedAt);
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
        ${renderCallSheetSelector(callSheets, callSheet?.id, "Selected call sheet")}
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
      ` : `<div class="empty-inline"><p>No unissued schedule day is ready for a call sheet.</p><button type="button" data-workspace-section="schedule">${icon("calendar")} Open Schedule</button></div>`}
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

function renderSidesWorkspace({ project, callSheets, sides, latestBreakdown }: SidesViewState): string {
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
        ${renderCallSheetSelector(callSheets, sides?.callSheet.id, "Selected sides call sheet")}
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

function renderProductionReportsWorkspace({ project, reports, report, source, sourceOptions }: ReportsViewState): string {
  const manifest = source ? buildProductionCallSheetManifest(source.callSheet, source.breakdown) : null;
  const summary = report ? summarizeProductionReport(report) : null;
  const sourceChanged = Boolean(report && source && report.sourceCallSheetUpdatedAt !== source.callSheet.updatedAt);
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
