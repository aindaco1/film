import { readFile } from "node:fs/promises";

export const PRODUCTION_VIEW_MODULES = ["production-documents-view", "production-resources-view"] as const;

export async function readUiSources(...modules: string[]): Promise<string> {
  return (await Promise.all(modules.map(module => readFile(`src/${module}.ts`, "utf8")))).join("\n");
}
