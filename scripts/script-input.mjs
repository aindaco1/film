export function parseCliArgs(argv, { booleans = [], values = [] } = {}) {
  const booleanArgs = new Set(booleans);
  const valueArgs = new Set(values);
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (booleanArgs.has(arg)) {
      parsed[arg.slice(2)] = true;
      continue;
    }
    if (valueArgs.has(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      parsed[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

export function parseEnvFile(value) {
  const vars = new Map();
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const name = trimmed.slice(0, index).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
    vars.set(name, unquoteEnvValue(trimmed.slice(index + 1).trim()));
  }
  return vars;
}

export function unquoteEnvValue(value) {
  if (
    value.length >= 2
    && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function boundedInteger(value, fallback, min, max, label) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid ${label}.`);
  }
  return parsed;
}

export function normalizeSecureHttpBaseUrl(value, label) {
  const parsed = new URL(value);
  const localHttp = parsed.protocol === "http:" && ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHttp) {
    throw new Error(`${label} must use HTTPS or local HTTP`);
  }
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}
