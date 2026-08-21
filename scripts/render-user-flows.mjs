import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { FILM_USER_FLOWS } from "./user-flow-catalog.mjs";

export function renderUserFlowCatalog(flows = FILM_USER_FLOWS) {
  const areas = [...new Set(flows.map((flow) => flow.area))];
  const lines = [
    "# Film User Flows",
    "",
    "This is the canonical user-flow inventory for Film. The source of truth is `scripts/user-flow-catalog.mjs`; regenerate this document with `npm run docs:user-flows`.",
    "",
    `Current inventory: ${flows.length} flows across ${areas.length} areas. Every flow declares automated regression evidence and shared UX acceptance criteria.`,
    "",
    "## Automated UX Audit",
    "",
    "- `node --test scripts/user-flow-catalog.test.mjs` verifies unique flow IDs, complete steps/outcomes, all 17 application workspaces, concrete regression markers, and generated-document freshness.",
    "- `npm run test:browser` drives every workspace on desktop and mobile, requiring the correct heading and active navigation state, a behavior contract for every visible enabled command, and no document-level horizontal overflow.",
    "- The same browser run applies serious/critical axe checks to the full shell and representative interactive states while exercising primary local workflows, exports, auth, protected mutations, provider readiness, encrypted backup preview, and restore preflight. Provider consent, carrier approval, and live owned-account acceptance remain explicit external gates.",
    "",
    "## Coverage Summary",
    "",
    "| Area | Flows |",
    "| --- | ---: |",
    ...areas.map((area) => `| ${area} | ${flows.filter((flow) => flow.area === area).length} |`),
    "",
  ];
  for (const area of areas) {
    lines.push(`## ${area}`, "");
    for (const flow of flows.filter((candidate) => candidate.area === area)) {
      lines.push(
        `### ${flow.id}: ${flow.title}`,
        "",
        `- Persona: ${flow.persona}`,
        `- Primary workspace: ${flow.section}`,
        "- Steps:",
        ...flow.steps.map((step, index) => `  ${index + 1}. ${step}`),
        `- Successful outcome: ${flow.success}`,
        "- UX checks:",
        ...flow.uxChecks.map((check) => `  - ${check}`),
        "- Regression evidence:",
        ...flow.regressions.map((regression) => `  - ${regression.kind}: \`${regression.file}\` contains \`${regression.marker}\``),
        "",
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  await writeFile(resolve(root, "docs/USER_FLOWS.md"), renderUserFlowCatalog(), "utf8");
}
