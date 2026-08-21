import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".wrangler",
  ".vite",
  "tmp",
  "playwright-report",
  "test-results",
]);
const scannedExtensions = new Set([
  ".js",
  ".mjs",
  ".ts",
  ".tsx",
  ".json",
  ".toml",
  ".yml",
  ".yaml",
  ".md",
  ".sql",
  ".html",
  ".css",
  ".webmanifest",
]);
const riskyPatterns = [
  /sk_live_[A-Za-z0-9]{12,}/,
  /rk_live_[A-Za-z0-9]{12,}/,
  /AIza[0-9A-Za-z_-]{24,}/,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:password|secret|token|api_key)\s*=\s*['"][^'"\r\n]{12,}['"]/i,
];

const findings = [];

await walk(root);

if (findings.length > 0) {
  console.error("Potential secrets found:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("No obvious committed secrets found.");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        await walk(path);
      }
      continue;
    }

    if (!shouldScan(entry.name)) continue;

    const content = await readFile(path, "utf8");
    for (const pattern of riskyPatterns) {
      if (pattern.test(content)) {
        findings.push(path.replace(`${root}/`, ""));
      }
    }
  }
}

function shouldScan(name) {
  const dot = name.lastIndexOf(".");
  const extension = dot >= 0 ? name.slice(dot) : "";
  return scannedExtensions.has(extension);
}
