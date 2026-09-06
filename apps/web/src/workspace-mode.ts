export function isDemoLocation(search: string): boolean {
  return new URLSearchParams(search).get("demo") === "portfolio";
}

export const DEMO_MODE = typeof location !== "undefined" && isDemoLocation(location.search);

export function workspaceStorageKey(key: string): string {
  return DEMO_MODE ? `${key}.demo-portfolio` : key;
}

export const workerFetch: typeof fetch = async (input, init) => {
  if (DEMO_MODE) throw new Error("Demo portfolio is local only. Return to your workspace to use connected services.");
  return fetch(input, init);
};
