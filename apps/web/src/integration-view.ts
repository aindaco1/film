import { formatCurrency } from "@film/schema";
import { TELNYX_SMS_CATEGORIES, TELNYX_SMS_CATEGORY_LABELS, TELNYX_SMS_CONSENT_DISCLOSURE, type ProviderDryRunStatus } from "@film/providers";
import { escapeHtml, escapeAttribute, formatBytes, formatShortDateTime } from "./presentation-format";
import { icon } from "./icons";
import type { SmsConsentManifest } from "./provider-client";
import { integrationRuntimeStatus, type GoogleConnectionState, type GoogleDriveManifestState, type MetaConnectionState, type MetaPageCandidatesState, type MetaAnalyticsState, type StripeSummaryState, type StripeSummaryResultState, type SmsConsentManifestState, type TelnyxProviderReadinessState, type IntegrationViewState } from "./integration-state";
import { renderIntegrationRuntime } from "./integration-runtime-view";

export function renderIntegrationView(state: IntegrationViewState): string {
 const runtime = integrationRuntimeStatus(state, state.demo);
 return `              <section class="inspector-section inspector-section-first">
                <div class="section-head row">
                  <h3>Integrations</h3>
                  <button type="button" data-action="provider-runtime-readiness" aria-busy="${runtime.checking}" ${state.demo || runtime.checking ? "disabled" : ""}>${icon("sync")} Check status</button>
                </div>
                <div class="integration-picker" role="group" aria-label="Integration providers">
                  ${runtime.providers.map((definition) => {
                    const isSelected = state.providerPreview?.key === definition.key;
                    return `
                      <button
                        class="integration-option ${isSelected ? "is-active" : ""}"
                        type="button"
                        aria-pressed="${isSelected}"
                        data-integration="${definition.key}"
                      >
                        ${icon("provider")}
                        <span>
                          <strong>${escapeHtml(definition.label)}</strong>
                          <small data-integration-status="${definition.key}">${escapeHtml(definition.badge)}</small>
                        </span>
                      </button>
                    `;
                  }).join("")}
                </div>
                <div class="provider-runtime-summary" data-integration-runtime="" role="status">${renderIntegrationRuntime(state, state.demo)}</div>
              </section>
              ${
                state.providerPreview
                  ? `
                    <section class="inspector-section">
                      <div class="section-head row"><h3>${escapeHtml(state.providerPreview.label)}</h3><span class="section-kicker">Provider details</span></div>
                      <div class="provider-preview" data-integration-runtime="${state.providerPreview.key}">${renderIntegrationRuntime(state, state.demo, state.providerPreview.key)}</div>
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
                            ? `${state.signedIn ? renderSmsConsentEnrollmentForm() : ""}
                              ${state.canManageSmsConsent
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
                        state.providerPreview.key === "google" && state.googleDriveSync
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
                        state.providerPreview.key === "stripe" && state.stripeSummary
                          ? renderStripeSummaryReadiness(state.stripeSummary)
                          : ""
                      }
                      ${
                        state.providerPreview.key === "stripe" && state.stripeSummaryResult
                          ? renderStripeSummaryResult(state.stripeSummaryResult)
                          : ""
                      }
                    </section>
                  `
                  : ""
              }
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
          <span class="status-dot ${readiness.profile.enabled && readiness.profile.nameMatches && readiness.profile.webhookMatches && readiness.profile.webhookApiV2 && readiness.profile.helpResponseConfigured ? "teal" : "gray"}"></span>
          <div>
            <strong>Film profile</strong>
            <span>${readiness.profile.reachable ? (readiness.profile.enabled ? "Enabled" : "Disabled") : "Unavailable"}</span>
            <small>name ${readiness.profile.nameMatches ? "matched" : "unmatched"} - webhook ${readiness.profile.webhookMatches && readiness.profile.webhookApiV2 ? "v2 ready" : "not ready"} - HELP ${readiness.profile.helpResponseConfigured ? "configured" : "not verified"}</small>
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

function renderGoogleConnection(status: GoogleConnectionState): string {
  const connection = status.connection;
  const active = connection?.status === "active";
  const reconnect = active && connection.reauthorizationRequired;
  const scopeLabels = connection?.scopes.map((scope) => scope.split("/").at(-1) ?? scope) ?? [];
  return `
    <div class="provider-preview" role="status">
      <strong>${reconnect ? "Reconnect Google" : active ? "Google connected" : "Google connection"}</strong>
      <span>${active ? `${scopeLabels.length} approved scope${scopeLabels.length === 1 ? "" : "s"}` : status.readiness.status.replaceAll("_", " ")}</span>
      ${active && scopeLabels.length ? `<span>${escapeHtml(scopeLabels.join(", "))}</span>` : ""}
      ${reconnect ? `<small>Google access expired or was revoked. Reconnect to continue.</small>` : active && connection?.tokenExpiresAt ? `<small>Access refresh due ${escapeHtml(formatShortDateTime(connection.tokenExpiresAt))}</small>` : ""}
      ${!active && status.readiness.blockers.length ? `<small>${escapeHtml(status.readiness.blockers[0] ?? "Google OAuth is not enabled.")}</small>` : ""}
      <div class="inline-actions">
        ${active && !reconnect
          ? `<button class="secondary-button" type="button" data-action="google-drive-manifest">${icon("folder")} Read Drive</button>`
          : `<button class="secondary-button" type="button" data-action="google-connect"${status.readiness.liveOAuthAllowed ? "" : " disabled"}>${icon("provider")} ${reconnect ? "Reconnect Google" : "Connect Google"}</button>`}
        ${active ? `<button class="secondary-button" type="button" data-action="google-disconnect">Disconnect</button>` : ""}
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
      ${active ? `<span>${connection?.instagramAccount ? `Instagram: ${escapeHtml(connection.instagramAccount.username ? `@${connection.instagramAccount.username}` : connection.instagramAccount.id)}` : "Facebook only"}</span>` : ""}
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
  const eligibleCount = result.pages.filter((page) => page.tasks.includes("ANALYZE")).length;
  return `
    <div class="provider-runtime-readiness" role="status">
      <div class="provider-runtime-summary">
        <strong>${eligibleCount} eligible Page${eligibleCount === 1 ? "" : "s"}</strong>
        <span>Facebook Pages</span>
        <small>${escapeHtml(result.persistence.replaceAll("_", " "))} - no access tokens</small>
      </div>
      ${result.pages.length
        ? `<ul class="provider-runtime-list">
            ${result.pages.map((page) => {
              const eligible = page.tasks.includes("ANALYZE");
              return `
                <li>
                  <span class="status-dot ${eligible ? "teal" : "gray"}"></span>
                  <div>
                    <strong>${escapeHtml(page.name)}</strong>
                    <span>${page.instagramAccount ? escapeHtml(page.instagramAccount.username ? `@${page.instagramAccount.username}` : page.instagramAccount.id) : "Facebook only"}</span>
                    ${eligible ? "" : "<small>Analytics access required</small>"}
                  </div>
                  <button class="secondary-button" type="button" aria-label="Select ${escapeHtml(page.name)}" data-action="meta-select-page" data-page-id="${escapeHtml(page.id)}"${eligible ? "" : " disabled"}>Select</button>
                </li>
              `;
            }).join("")}
          </ul>`
        : `<p class="empty-inline">No Facebook Pages available.</p>`}
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
