import { gzipSync } from "node:zlib";

// Baselines include every statically imported JS chunk, not just the entry file.
export const WEB_BUNDLE_BUDGET = { entryBytes: 470_000, initialBytes: 565_000, initialGzipBytes: 124_000 };
const deferredModules = ["/src/production-resources-view.ts", "/src/production-documents-view.ts", "/src/backup-workspace.ts", "/src/integration-view.ts", "/src/provider-client.ts", "/src/backup-client.ts", "/src/restore-client.ts", "/src/demo-portfolio.ts", "/src/import-preview.ts"];

export function inspectWebBundle(bundle) {
  const initial = new Map();
  const entries = Object.values(bundle).filter((chunk) => chunk.type === "chunk" && chunk.isEntry);
  function visit(chunk) {
    if (initial.has(chunk.fileName)) return;
    initial.set(chunk.fileName, chunk);
    for (const name of chunk.imports) {
      const imported = bundle[name];
      if (imported?.type === "chunk") visit(imported);
    }
  }
  entries.forEach(visit);
  if (!entries.length) throw new Error("Web bundle has no entry chunk");
  const chunks = [...initial.values()];
  const result = {
    entryBytes: Math.max(...entries.map((chunk) => Buffer.byteLength(chunk.code))),
    initialBytes: chunks.reduce((total, chunk) => total + Buffer.byteLength(chunk.code), 0),
    initialGzipBytes: chunks.reduce((total, chunk) => total + gzipSync(chunk.code).byteLength, 0),
    initialChunks: chunks.map((chunk) => chunk.fileName),
  };
  for (const chunk of chunks) {
    for (const id of Object.keys(chunk.modules)) {
      if (deferredModules.some((suffix) => id.replaceAll("\\", "/").endsWith(suffix))) {
        throw new Error(`Deferred web feature was included at startup: ${id}`);
      }
    }
  }
  for (const [key, limit] of Object.entries(WEB_BUNDLE_BUDGET)) {
    if (result[key] > limit) throw new Error(`Web bundle ${key}: ${result[key]} exceeds ${limit}`);
  }
  return result;
}

export function webBundleBudgetPlugin() {
  return {
    name: "film-web-bundle-budget",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
        const report = inspectWebBundle(bundle);
        console.log(`Film startup JS: ${report.entryBytes} entry bytes; ${report.initialBytes} total bytes; ${report.initialGzipBytes} gzip bytes (${report.initialChunks.length} chunks)`);
      },
    },
  };
}
