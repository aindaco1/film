import { formatCurrency, type FilmProject, type WorkspaceData } from "@film/schema";
import { escapeHtml, expenseCategoryLabel, formatDocStatus, productionUnitLabel } from "./presentation-format";
import { formatShootDate, productionCallSheetStripCount, productionSummaryForProject } from "./project-summary";

const PREVIEW_LIMIT = 5;
type OverviewItem = { marker?: string; taskStatus?: string; title: string; detail: string; docId?: string; selected?: boolean; overdue?: boolean };

function renderOverviewList(title: string, section: string, items: OverviewItem[]): string {
  return `<section class="panel compact-panel">
    <div class="section-head row"><h2>${title} <small>(${items.length})</small></h2><button type="button" data-workspace-section="${section}">View all</button></div>
    <ul class="line-list">${items.length ? items.slice(0, PREVIEW_LIMIT).map((item) => {
      const marker = item.taskStatus ? `<span class="task-dot ${escapeHtml(item.taskStatus)}"></span>` : `<span class="file-token">${escapeHtml(item.marker ?? "")}</span>`;
      const content = `${marker}<span>${escapeHtml(item.title)}</span><strong${item.overdue ? ' class="danger"' : ""}>${escapeHtml(item.detail)}</strong>`;
      return `<li>${item.docId ? `<button class="doc-row-button ${item.selected ? "is-selected" : ""}" type="button" data-open-doc="${escapeHtml(item.docId)}">${content}</button>` : content}</li>`;
    }).join("") : `<li class="overview-empty">No ${title.toLowerCase()} yet.</li>`}</ul>
    ${items.length > PREVIEW_LIMIT ? `<p class="overview-more">${items.length - PREVIEW_LIMIT} more</p>` : ""}
  </section>`;
}

export function renderOperationsGrid(project: FilmProject, selectedDocId: string | null): string {
  return `<section class="operations-grid">
    ${renderOverviewList("Tasks", "tasks", project.openTasks.map((task) => ({ taskStatus: task.status, title: task.title, detail: task.due, overdue: task.status === "overdue" })))}
    ${renderOverviewList("Docs", "docs", project.docs.map((doc) => ({ marker: doc.type, title: doc.name, detail: formatDocStatus(doc), docId: doc.id, selected: doc.id === selectedDocId })))}
    ${renderOverviewList("People", "people", project.people.map((person) => ({ marker: person.initials, title: person.name, detail: person.role })))}
    ${renderOverviewList("Equipment", "equipment", project.equipment.map((item) => ({ marker: "EQ", title: item.name, detail: item.status })))}
  </section>`;
}

export function renderProductionOverview(project: FilmProject, workspace: WorkspaceData): string {
  const production = productionSummaryForProject(project, workspace);
  const metrics = [
    [production.sceneCount, "Source scenes"], [production.days.length, "Shoot days"],
    [production.assignedStrips, "Assigned strips"], [production.unassignedStrips, "Unassigned strips"],
    [production.issuedReports, "Issued reports"],
  ] as const;
  return `<section class="panel production-overview" aria-labelledby="production-overview-title">
    <div class="section-head"><div><h2 id="production-overview-title">Production overview</h2>
      <p>${production.schedule ? `${escapeHtml(production.schedule.title)} - latest edited schedule - ${escapeHtml(production.schedule.status)}` : "No production schedule"}</p></div>
      <button type="button" data-workspace-section="schedule">Open Schedule</button>
    </div>
    <div class="production-overview-metrics">${metrics.map(([value, label]) => `<span><strong>${value}</strong><small>${label}</small></span>`).join("")}</div>
    ${production.days.length ? `<div class="production-overview-days" aria-label="Scheduled shoot days">
      ${production.days.slice(0, 6).map((day) => `<div><strong>Day ${day.ordinal}</strong><span>${day.date ? escapeHtml(formatShootDate(day.date)) : "Date not set"}</span><small>${productionUnitLabel(day.unit)} - ${day.sceneIds.length + (day.sceneParts?.length ?? 0)} strips</small></div>`).join("")}
      ${production.days.length > 6 ? `<p>${production.days.length - 6} more days in Schedule</p>` : ""}
    </div>` : ""}
  </section>`;
}

export function renderOverviewBottom(project: FilmProject, workspace: WorkspaceData): string {
  const production = productionSummaryForProject(project, workspace);
  const sheet = production.callSheet;
  return `<section class="bottom-grid">
    <section class="panel expense-panel">
      <div class="section-head row"><h2>Expenses</h2><button type="button" data-workspace-section="expenses">View all</button></div>
      <div class="expense-table">${project.expenses.length ? project.expenses.slice(0, PREVIEW_LIMIT).map((expense) => {
        const percent = expense.budget ? Math.round(expense.spent / expense.budget * 100) : 0;
        return `<div><span>${escapeHtml(expenseCategoryLabel(expense))}</span><span>${formatCurrency(expense.spent)}</span><span>${formatCurrency(expense.budget)}</span><span>${expense.budget ? `${percent}%` : "--"}</span><span class="meter small"><span style="width:${Math.min(100, percent)}%"></span></span></div>`;
      }).join("") : `<p class="overview-empty">No expenses yet.</p>`}</div>
      ${project.expenses.length > PREVIEW_LIMIT ? `<p class="overview-more">${project.expenses.length - PREVIEW_LIMIT} more</p>` : ""}
    </section>
    <section class="panel call-sheet-panel">
      <div class="section-head row"><h2>${escapeHtml(production.callSheetLabel)}</h2></div>
      ${sheet ? `<div class="call-sheet overview-call-sheet">
        <div><strong>${escapeHtml(sheet.title)}</strong><p>${sheet.date ? escapeHtml(formatShootDate(sheet.date)) : "Date not set"} - ${escapeHtml(sheet.status)}</p>
          <p><strong>Call:</strong> ${escapeHtml(sheet.callTime)} - <strong>Wrap:</strong> ${escapeHtml(sheet.estimatedWrapTime)}</p><p>${escapeHtml(sheet.primaryLocation || "Location not set")}</p></div>
        <div><p>Day ${sheet.dayOrdinal} - ${productionUnitLabel(sheet.unit)}</p><p>${productionCallSheetStripCount(sheet)} strips - ${sheet.castCalls.length} cast calls</p>
          <button class="secondary-button" type="button" data-open-call-sheet="${escapeHtml(sheet.id)}">Open Call Sheet</button></div>
      </div>` : `<div class="empty-inline"><p>No call sheet has been generated.</p><button type="button" data-workspace-section="call-sheets">Open Call Sheets</button></div>`}
    </section>
  </section>`;
}
