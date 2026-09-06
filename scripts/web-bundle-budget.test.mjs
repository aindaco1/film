import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectWebBundle, WEB_BUNDLE_BUDGET } from "./web-bundle-budget.mjs";

function chunk(fileName, overrides = {}) {
  return { type: "chunk", fileName, code: "// static JS", imports: [], modules: {}, isEntry: false, ...overrides };
}

test("startup budget counts transitive static dependencies once and excludes dynamic chunks", () => {
  const report = inspectWebBundle({
    "app.js": chunk("app.js", { isEntry: true, imports: ["shared.js", "nested.js"], dynamicImports: ["lazy.js"] }),
    "shared.js": chunk("shared.js", { imports: ["nested.js"] }),
    "nested.js": chunk("nested.js", { imports: ["shared.js"] }),
    "lazy.js": chunk("lazy.js", { code: "x".repeat(1_000_000), modules: { "/app/src/backup-workspace.ts": {} } }),
  });
  assert.equal(report.initialBytes, Buffer.byteLength("// static JS") * 3);
  assert.equal(report.initialChunks.length, 3);
  assert(report.initialGzipBytes > 0);
});

test("startup budget rejects large entries, transitive graphs, and accidentally eager feature modules", () => {
  assert.throws(() => inspectWebBundle({ "app.js": chunk("app.js", { isEntry: true, code: "x".repeat(WEB_BUNDLE_BUDGET.entryBytes + 1) }) }), /entryBytes/);
  assert.throws(() => inspectWebBundle({
    "app.js": chunk("app.js", { isEntry: true, imports: ["shared.js"] }),
    "shared.js": chunk("shared.js", { code: "x".repeat(WEB_BUNDLE_BUDGET.initialBytes) }),
  }), /initialBytes/);
  for (const module of ["production-documents-view", "backup-workspace", "integration-view", "provider-client", "backup-client", "restore-client"]) {
    assert.throws(() => inspectWebBundle({ "app.js": chunk("app.js", { isEntry: true, modules: { [`/app/src/${module}.ts`]: {} } }) }), /Deferred web feature/);
  }
  assert.throws(() => inspectWebBundle({}), /no entry/);
});
