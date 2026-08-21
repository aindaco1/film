import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { runScreenplayAcceptance } from "./screenplay-acceptance-core.mjs";

const screenplayPath = process.argv[2];
if (!screenplayPath) {
  console.error("Usage: npm run accept:screenplay -- /absolute/path/to/screenplay.fdx");
  process.exit(2);
}

const absolutePath = resolve(screenplayPath);
const extension = extname(absolutePath).toLowerCase();
const kind = extension === ".fdx" ? "final_draft" : extension === ".fountain" ? "fountain" : null;
if (!kind) {
  console.error("Acceptance supports .fdx and .fountain screenplay files.");
  process.exit(2);
}

const [text, source] = await Promise.all([readFile(absolutePath, "utf8"), stat(absolutePath)]);
const evidence = runScreenplayAcceptance({ kind, text, sourceSizeBytes: source.size });
console.log(JSON.stringify(evidence, null, 2));
