import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// Film docs use inline Markdown links; fenced examples are not navigation.
function localLinks(markdown) {
  const prose = markdown.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, "");
  return [...prose.matchAll(/!?\[[^\]\n]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+"[^"]*")?\s*\)/g)]
    .map((match) => match[1] ?? match[2])
    .filter((target) => !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target))
    .map((target) => decodeURIComponent(target.split(/[?#]/, 1)[0]));
}

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

test("documentation link inventory excludes external links, anchors and fenced examples", () => {
  const sample = [
    "[local](../README.md#develop)",
    "[encoded](folder/a%20b.md)",
    "![image](<folder/a b.png>)",
    "[remote](https://example.com/page) [section](#local)",
    '```md\n[example](missing.md)\n```',
  ].join("\n");
  assert.deepEqual(localLinks(sample), ["../README.md", "folder/a b.md", "folder/a b.png"]);
});

test("repository documentation links resolve without generated build or test output", async () => {
  const files = [resolve(root, "README.md"), resolve(root, "AGENTS.md"), ...await markdownFiles(resolve(root, "docs"))];
  const failures = [];
  for (const file of files) {
    for (const target of localLinks(await readFile(file, "utf8"))) {
      const resolved = resolve(dirname(file), target);
      const repoPath = relative(root, resolved);
      if (repoPath.startsWith("../") || /^(?:test-results|tmp|apps\/web\/dist)(?:\/|$)/.test(repoPath)) {
        failures.push(`${relative(root, file)} -> non-source dependency ${target}`);
        continue;
      }
      try {
        await access(resolved);
      } catch {
        failures.push(`${relative(root, file)} -> missing ${target}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("current documentation entry points delegate changing status to one project ledger", async () => {
  for (const path of ["README.md", "docs/PRODUCT_GOALS.md", "docs/ARCHITECTURE.md", "docs/TESTING.md", "docs/RELEASE.md", "docs/OPERATIONS.md", "docs/adr/README.md"]) {
    const links = localLinks(await readFile(resolve(root, path), "utf8"));
    assert(links.some((link) => resolve(root, dirname(path), link) === resolve(root, "docs/PROJECT_STATUS.md")), `${path} must link the project status ledger`);
  }
});
