import { isMetaId, type MetaOAuthConfiguration } from "./meta-oauth";

const META_CALENDAR_MAX_ROWS = 100;
const META_INSIGHT_MAX_SERIES = 10;
const META_DATE_RANGE_MAX_DAYS = 31;
const PAGE_INSIGHT_METRICS = ["page_post_engagements", "page_follows", "page_media_view"];
const INSTAGRAM_INSIGHT_METRICS = ["reach", "profile_views"];

export type MetaCalendarItem = {
  provider: "facebook" | "instagram";
  id: string;
  label: string;
  publishedAt: string;
  permalink: string | null;
  mediaType: string | null;
  engagement: { reactions: number; comments: number; shares: number };
};

export type MetaInsightSeries = {
  provider: "facebook" | "instagram";
  metric: string;
  period: string;
  values: Array<{ endTime: string | null; value: number }>;
};

export type MetaAnalyticsResult = {
  status: "complete" | "partial" | "unavailable";
  since: string;
  until: string;
  calendar: MetaCalendarItem[];
  insights: MetaInsightSeries[];
  warnings: string[];
  dataBoundary: "read_only_calendar_and_bounded_engagement_summaries";
  secretValuesExposed: false;
};

type MetaAnalyticsInput = {
  graphVersion: string;
  pageId: string;
  instagramAccountId: string;
  pageAccessToken: string;
  since: string;
  until: string;
};

export function isValidMetaAnalyticsDateRange(since: string, until: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !/^\d{4}-\d{2}-\d{2}$/.test(until)) return false;
  const start = Date.parse(`${since}T00:00:00.000Z`);
  const end = Date.parse(`${until}T23:59:59.999Z`);
  const rangeDays = (end - start) / (24 * 60 * 60 * 1000);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start && rangeDays < META_DATE_RANGE_MAX_DAYS;
}

export async function readMetaAnalytics(
  input: MetaAnalyticsInput,
  fetcher: typeof fetch = fetch,
): Promise<MetaAnalyticsResult> {
  if (
    !/^v\d{1,2}\.\d$/.test(input.graphVersion)
    || !isMetaId(input.pageId)
    || !isMetaId(input.instagramAccountId)
    || !isValidMetaAnalyticsDateRange(input.since, input.until)
  ) {
    throw new Error("invalid_meta_analytics_request");
  }
  const configuration: Pick<MetaOAuthConfiguration, "graphVersion"> = { graphVersion: input.graphVersion };
  const endpoints = [
    metaGraphUrl(configuration, `${input.pageId}/posts`, {
      fields: "id,message,created_time,permalink_url,shares,comments.limit(0).summary(true),reactions.limit(0).summary(true)",
      limit: "50",
      since: input.since,
      until: input.until,
    }),
    metaGraphUrl(configuration, `${input.instagramAccountId}/media`, {
      fields: "id,caption,media_type,permalink,timestamp,like_count,comments_count",
      limit: "50",
    }),
    metaGraphUrl(configuration, `${input.pageId}/insights`, {
      metric: PAGE_INSIGHT_METRICS.join(","),
      period: "day",
      since: input.since,
      until: input.until,
    }),
    metaGraphUrl(configuration, `${input.instagramAccountId}/insights`, {
      metric: INSTAGRAM_INSIGHT_METRICS.join(","),
      period: "day",
      since: input.since,
      until: input.until,
    }),
  ];
  const results = await Promise.allSettled(
    endpoints.map((url) => fetchMetaJson(url, input.pageAccessToken, fetcher)),
  );
  const warnings: string[] = [];
  const facebookPosts = settledValue(results[0], "facebook_calendar_unavailable", warnings);
  const instagramMedia = settledValue(results[1], "instagram_calendar_unavailable", warnings);
  const facebookInsights = settledValue(results[2], "facebook_insights_unavailable", warnings);
  const instagramInsights = settledValue(results[3], "instagram_insights_unavailable", warnings);
  const calendar = [
    ...normalizeFacebookCalendar(facebookPosts),
    ...normalizeInstagramCalendar(instagramMedia, input.since, input.until),
  ].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)).slice(0, META_CALENDAR_MAX_ROWS);
  const insights = [
    ...normalizeInsights("facebook", facebookInsights, PAGE_INSIGHT_METRICS),
    ...normalizeInsights("instagram", instagramInsights, INSTAGRAM_INSIGHT_METRICS),
  ].slice(0, META_INSIGHT_MAX_SERIES);
  const successCount = results.filter((result) => result.status === "fulfilled").length;
  return {
    status: successCount === results.length ? "complete" : successCount > 0 ? "partial" : "unavailable",
    since: input.since,
    until: input.until,
    calendar,
    insights,
    warnings,
    dataBoundary: "read_only_calendar_and_bounded_engagement_summaries",
    secretValuesExposed: false,
  };
}

function metaGraphUrl(
  configuration: Pick<MetaOAuthConfiguration, "graphVersion">,
  path: string,
  parameters: Record<string, string>,
): URL {
  const url = new URL(`https://graph.facebook.com/${configuration.graphVersion}/${path}`);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url;
}

async function fetchMetaJson(url: URL, accessToken: string, fetcher: typeof fetch): Promise<unknown> {
  if (!/^[A-Za-z0-9._-]{16,4096}$/.test(accessToken)) throw new Error("invalid_meta_access_token");
  const response = await fetcher(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
  });
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new Error("meta_graph_invalid_response");
  }
  if (!response.ok) throw new Error(`meta_graph_http_${response.status}`);
  return parsed;
}

function settledValue(
  result: PromiseSettledResult<unknown> | undefined,
  warning: string,
  warnings: string[],
): unknown {
  if (result?.status === "fulfilled") return result.value;
  warnings.push(warning);
  return null;
}

function normalizeFacebookCalendar(value: unknown): MetaCalendarItem[] {
  if (!isRecord(value) || !Array.isArray(value.data)) return [];
  return value.data.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = boundedId(entry.id);
    const publishedAt = normalizedTimestamp(entry.created_time);
    if (!id || !publishedAt) return [];
    return [{
      provider: "facebook" as const,
      id,
      label: boundedPreview(entry.message, 160) ?? "Facebook post",
      publishedAt,
      permalink: safePermalink(entry.permalink_url),
      mediaType: "post",
      engagement: {
        reactions: summaryTotal(entry.reactions),
        comments: summaryTotal(entry.comments),
        shares: isRecord(entry.shares) ? boundedCount(entry.shares.count) : 0,
      },
    }];
  });
}

function normalizeInstagramCalendar(value: unknown, since: string, until: string): MetaCalendarItem[] {
  if (!isRecord(value) || !Array.isArray(value.data)) return [];
  const start = Date.parse(`${since}T00:00:00.000Z`);
  const end = Date.parse(`${until}T23:59:59.999Z`);
  return value.data.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = boundedId(entry.id);
    const publishedAt = normalizedTimestamp(entry.timestamp);
    const publishedMs = publishedAt ? Date.parse(publishedAt) : Number.NaN;
    if (!id || !publishedAt || !Number.isFinite(publishedMs) || publishedMs < start || publishedMs > end) return [];
    return [{
      provider: "instagram" as const,
      id,
      label: boundedPreview(entry.caption, 160) ?? "Instagram media",
      publishedAt,
      permalink: safePermalink(entry.permalink),
      mediaType: boundedPreview(entry.media_type, 32),
      engagement: {
        reactions: boundedCount(entry.like_count),
        comments: boundedCount(entry.comments_count),
        shares: 0,
      },
    }];
  });
}

function normalizeInsights(
  provider: "facebook" | "instagram",
  value: unknown,
  allowlist: string[],
): MetaInsightSeries[] {
  if (!isRecord(value) || !Array.isArray(value.data)) return [];
  return value.data.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.name !== "string" || !allowlist.includes(entry.name)) return [];
    const period = boundedPreview(entry.period, 32) ?? "day";
    const values = Array.isArray(entry.values)
      ? entry.values.flatMap((point) => normalizeInsightPoint(point)).slice(0, 32)
      : normalizeTotalValue(entry.total_value);
    return values.length ? [{ provider, metric: entry.name, period, values }] : [];
  });
}

function normalizeInsightPoint(value: unknown): Array<{ endTime: string | null; value: number }> {
  if (!isRecord(value) || typeof value.value !== "number" || !Number.isFinite(value.value)) return [];
  return [{ endTime: normalizedTimestamp(value.end_time), value: boundedMetric(value.value) }];
}

function normalizeTotalValue(value: unknown): Array<{ endTime: string | null; value: number }> {
  if (!isRecord(value) || typeof value.value !== "number" || !Number.isFinite(value.value)) return [];
  return [{ endTime: null, value: boundedMetric(value.value) }];
}

function summaryTotal(value: unknown): number {
  return isRecord(value) && isRecord(value.summary) ? boundedCount(value.summary.total_count) : 0;
}

function boundedCount(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 2_147_483_647) : 0;
}

function boundedMetric(value: number): number {
  return Math.max(-1_000_000_000_000, Math.min(1_000_000_000_000, value));
}

function boundedId(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_:-]{5,160}$/.test(value) ? value : null;
}

function boundedPreview(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizedTimestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function safePermalink(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (
      url.hostname === "facebook.com"
      || url.hostname.endsWith(".facebook.com")
      || url.hostname === "instagram.com"
      || url.hostname.endsWith(".instagram.com")
    ) ? url.toString() : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
