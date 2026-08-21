import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FILM_USER_FLOWS, WORKSPACE_FLOW_SECTIONS } from "./user-flow-catalog.mjs";
import { renderUserFlowCatalog } from "./render-user-flows.mjs";

const root = resolve(import.meta.dirname, "..");

test("every canonical Film user flow has concrete regression evidence", async () => {
  assert(FILM_USER_FLOWS.length >= 45, "Expected a comprehensive flow inventory");
  assert.equal(new Set(FILM_USER_FLOWS.map((flow) => flow.id)).size, FILM_USER_FLOWS.length);
  for (const flow of FILM_USER_FLOWS) {
    assert(flow.steps.length >= 2, `${flow.id} needs executable steps`);
    assert(flow.success.length >= 40, `${flow.id} needs a concrete successful outcome`);
    assert.equal(flow.uxChecks.length, 4, `${flow.id} must inherit the shared UX contract`);
    assert(flow.regressions.length >= 1, `${flow.id} needs regression evidence`);
    for (const regression of flow.regressions) {
      const source = await readFile(resolve(root, regression.file), "utf8");
      assert(source.includes(regression.marker), `${flow.id} regression marker is missing: ${regression.file} -> ${regression.marker}`);
    }
  }
});

test("every application workspace is represented by the flow catalog", async () => {
  const source = await readFile(resolve(root, "apps/web/src/main.ts"), "utf8");
  for (const [section] of WORKSPACE_FLOW_SECTIONS) {
    assert(source.includes(`"${section}"`), `Application workspace is missing: ${section}`);
    assert(FILM_USER_FLOWS.some((flow) => flow.section === section), `No flow covers workspace: ${section}`);
  }
});

test("generated user-flow documentation matches the executable catalog", async () => {
  const documentation = await readFile(resolve(root, "docs/USER_FLOWS.md"), "utf8");
  assert.equal(documentation, renderUserFlowCatalog());
});
