import type { FilmProject, ProductionAvailabilityWindow, ProductionCallSheet, ProductionLocation, ProductionLocationManifest, ProductionLocationStatus, ProductionLocationPermitStatus, ProductionShot, ProductionShotManifest, ProductionShotStatus, ProductionTalent, ProductionTalentManifest, ProductionTalentStatus, ProductionTalentPaperworkStatus, ProductionTalentRateBasis, ScreenplayBreakdown } from "@film/schema";
import { icon } from "./icons";
import { escapeHtml, escapeAttribute, productionUnitLabel, productionValueLabel } from "./presentation-format";
import { renderCreateDisclosure } from "./create-disclosure";
import type { ShotsViewState, LocationsViewState, TalentViewState, ProductionResourcesViewState } from "./production-resources-state";

export function renderProductionResources(state: ProductionResourcesViewState): string {
  switch (state.section) {
    case "shots": return renderShotsWorkspace(state);
    case "locations": return renderLocationsWorkspace(state);
    case "talent": return renderTalentWorkspace(state);
  }
}

function unlinkedElements(breakdown: ScreenplayBreakdown | null, records: Array<{ screenplayElementId?: string | null }>, category: "cast" | "location") {
  const linked = new Set(records.map(record => record.screenplayElementId));
  return breakdown?.elements.filter(element => element.category === category && element.reviewState !== "dismissed" && !linked.has(element.id))
    .sort((left, right) => left.name.localeCompare(right.name)) ?? [];
}

function renderValueOptions(values: readonly string[], selected: string): string {
  return values.map(value => `<option value="${escapeAttribute(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(productionValueLabel(value))}</option>`).join("");
}

function renderShotsWorkspace({ project, breakdown, rows, selectedId, sceneFilter }: ShotsViewState): string {
  const shots = rows.map(row => row.shot);
  const selectedRow = rows.find(row => row.shot.id === selectedId) ?? rows[0];
  const selected = selectedRow?.shot ?? null;
  const manifest = selectedRow?.manifest ?? null;
  const filterScene = breakdown?.scenes.find(scene => scene.id === sceneFilter) ?? null;
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
          ${shots.length ? rows.map(({ shot, manifest: shotManifest }) => {
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
          <label><span>Status</span><select name="status">${renderValueOptions(["planned", "ready", "captured", "omitted"] satisfies ProductionShotStatus[], shot.status)}</select></label>
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

function renderLocationsWorkspace({ project, records, location, manifest, breakdown: candidateBreakdown, callSheet, locationRows }: LocationsViewState): string {
  const candidateElements = unlinkedElements(candidateBreakdown, records, "location");
  const confirmedCount = records.filter(record => record.status === "confirmed").length;
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
                      <span>${escapeHtml(row.fieldSummary)}</span>
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
          <label><span>Status</span><select name="status">${renderValueOptions(["scouting", "hold", "confirmed", "released"] satisfies ProductionLocationStatus[], location.status)}</select></label>
          <label><span>Permit</span><select name="permitStatus">${renderValueOptions(["unknown", "not_required", "planned", "submitted", "approved"] satisfies ProductionLocationPermitStatus[], location.permitStatus)}</select></label>
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

function renderTalentWorkspace({ project, records, talent, manifest, breakdown, callSheet }: TalentViewState): string {
  const candidateElements = unlinkedElements(breakdown, records, "cast");
  const castCount = records.filter(record => record.status === "cast").length;
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
          <label><span>Status</span><select name="status">${renderValueOptions(["prospect", "contacted", "auditioning", "offered", "cast", "released"] satisfies ProductionTalentStatus[], talent.status)}</select></label>
          <label><span>Paperwork</span><select name="paperworkStatus">${renderValueOptions(["not_started", "requested", "partial", "complete"] satisfies ProductionTalentPaperworkStatus[], talent.paperworkStatus)}</select></label>
          <label><span>Direct contact</span><input name="contactName" value="${escapeAttribute(talent.contactName)}" maxlength="200" /></label>
          <label><span>Contact details</span><input name="contactDetails" value="${escapeAttribute(talent.contactDetails)}" maxlength="500" autocomplete="off" /></label>
          <label><span>Representative</span><input name="representativeName" value="${escapeAttribute(talent.representativeName)}" maxlength="200" /></label>
          <label><span>Representative details</span><input name="representativeDetails" value="${escapeAttribute(talent.representativeDetails)}" maxlength="500" autocomplete="off" /></label>
          <label><span>Entered rate basis</span><select name="rateBasis">${renderValueOptions(["not_set", "unpaid", "flat", "day", "week", "deferred", "other"] satisfies ProductionTalentRateBasis[], talent.rateBasis)}</select></label>
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

function renderProjectDocumentReferenceCheckboxes(project: FilmProject, selectedIds: string[]): string {
  return project.docs.length ? project.docs.map((doc) => `
    <label><input type="checkbox" name="documentId" value="${escapeAttribute(doc.id)}" ${selectedIds.includes(doc.id) ? "checked" : ""} /> <span>${escapeHtml(doc.name)}</span></label>
  `).join("") : `<small>No project documents available.</small>`;
}
