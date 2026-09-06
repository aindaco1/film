export const LOCAL_PROVIDER_MODES = Object.freeze({
  AUTH_MAGIC_LINK_MODE: "dry_run",
  INVITE_DELIVERY_MODE: "dry_run",
  GOOGLE_OAUTH_MODE: "disabled",
  META_OAUTH_MODE: "disabled",
  SMS_MODE: "disabled",
  TELNYX_WEBHOOK_MODE: "disabled",
  STRIPE_SUMMARY_MODE: "disabled",
});

export function localWorkerArgs({ port = 8787, allowedOrigin = "http://127.0.0.1:5173,http://localhost:5173", rateLimitOverrides } = {}) {
  const vars = {
    ...LOCAL_PROVIDER_MODES,
    ALLOWED_ORIGINS: allowedOrigin,
    ...(rateLimitOverrides ? { RATE_LIMIT_OVERRIDES: JSON.stringify(rateLimitOverrides) } : {}),
  };
  return ["dev", "src/index.ts", "--local", "--port", String(port), ...Object.entries(vars).flatMap(([key, value]) => ["--var", `${key}:${value}`])];
}
