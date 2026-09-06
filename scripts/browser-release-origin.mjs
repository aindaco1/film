import { normalizeSecureHttpBaseUrl, parseCliArgs } from "./script-input.mjs";

export function browserReleaseOrigin(argv) {
  if (!argv.includes("--release-origin")) return null;
  const args = parseCliArgs(argv, { values: ["--release-origin"] });
  let url;
  try { url = new URL(args["release-origin"]); } catch { throw new Error("Release origin must be an absolute HTTP(S) origin"); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Release origin must not contain credentials, a path, query, or fragment");
  }
  return `${normalizeSecureHttpBaseUrl(url.href, "Release origin")}/`;
}
