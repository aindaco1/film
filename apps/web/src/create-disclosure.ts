import { icon } from "./icons";
import { escapeHtml } from "./presentation-format";

export function renderCreateDisclosure(label: string, form: string): string {
  return `
    <details class="create-disclosure">
      <summary>${icon("plus")} <span>${escapeHtml(label)}</span> ${icon("chevron")}</summary>
      <div class="create-disclosure-body">${form}</div>
    </details>
  `;
}
