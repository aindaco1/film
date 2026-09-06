import { describe, expect, it, vi } from "vitest";
import { isValidMetaAnalyticsDateRange, readMetaAnalytics } from "../src/meta-insights";

const input = {
  graphVersion: "v23.0",
  pageId: "111111111111111",
  instagramAccountId: "222222222222222",
  pageAccessToken: "page_meta_token_123456789",
  since: "2026-07-01",
  until: "2026-07-10",
};

describe("meta insights", () => {
  it.each([
    { failures: [], status: "complete" },
    { failures: ["insights"], status: "partial" },
    { failures: ["posts", "insights"], status: "unavailable" },
  ])("reads only Facebook endpoints without a linked Instagram account: $status", async ({ failures, status }) => {
    const fetcher = vi.fn(async (value: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(value));
      expect(url.pathname).toMatch(new RegExp(`/${input.pageId}/(posts|insights)$`));
      expect(init?.method ?? "GET").toBe("GET");
      expect(url.searchParams.has("access_token")).toBe(false);
      return failures.some(endpoint => url.pathname.endsWith(`/${endpoint}`))
        ? Response.json({ error: { message: "private provider detail" } }, { status: 403 })
        : Response.json({ data: [] });
    });
    const result = await readMetaAnalytics({ ...input, instagramAccountId: null }, fetcher as typeof fetch);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ status, calendar: [], insights: [], secretValuesExposed: false });
    expect(result.warnings).toHaveLength(failures.length);
    expect(JSON.stringify(result)).not.toMatch(/instagram_.*unavailable|private provider detail|page_meta_token/);
  });

  it.each(["", "not-a-meta-id"])("rejects invalid non-null Instagram IDs: %s", async (instagramAccountId) => {
    const fetcher = vi.fn();
    await expect(readMetaAnalytics({ ...input, instagramAccountId }, fetcher))
      .rejects.toThrow("invalid_meta_analytics_request");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("normalizes bounded read-only calendar and engagement data", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.searchParams.has("access_token")).toBe(false);
      expect((init?.headers as Record<string, string>).authorization).toBe("Bearer page_meta_token_123456789");
      if (url.pathname.endsWith("/posts")) {
        return Response.json({ data: [{
          id: "facebook_post_12345",
          message: "Big Sword teaser",
          created_time: "2026-07-09T18:00:00+0000",
          permalink_url: "https://www.facebook.com/bigsword/posts/12345",
          reactions: { summary: { total_count: 41 } },
          comments: { summary: { total_count: 7 } },
          shares: { count: 3 },
          full_picture: "https://scontent.example/private.jpg",
        }] });
      }
      if (url.pathname.endsWith("/media")) {
        return Response.json({ data: [{
          id: "instagram_media_12345",
          caption: "Principal photography day one",
          media_type: "IMAGE",
          media_url: "https://cdn.example/private.jpg",
          permalink: "https://www.instagram.com/p/ABC123/",
          timestamp: "2026-07-08T17:00:00+0000",
          like_count: 99,
          comments_count: 8,
        }] });
      }
      if (url.pathname.endsWith("111111111111111/insights")) {
        return Response.json({ data: [{
          name: "page_post_engagements",
          period: "day",
          values: [{ value: 17, end_time: "2026-07-10T08:00:00+0000" }],
        }] });
      }
      if (url.pathname.endsWith("222222222222222/insights")) {
        return Response.json({ data: [{
          name: "reach",
          period: "day",
          total_value: { value: 1200 },
        }] });
      }
      throw new Error(`Unexpected Meta request: ${url}`);
    });

    const result = await readMetaAnalytics(input, fetcher as typeof fetch);

    expect(result.status).toBe("complete");
    expect(result.calendar).toHaveLength(2);
    expect(result.calendar[0]).toMatchObject({
      provider: "facebook",
      label: "Big Sword teaser",
      engagement: { reactions: 41, comments: 7, shares: 3 },
    });
    expect(result.insights).toEqual([
      {
        provider: "facebook",
        metric: "page_post_engagements",
        period: "day",
        values: [{ value: 17, endTime: "2026-07-10T08:00:00.000Z" }],
      },
      {
        provider: "instagram",
        metric: "reach",
        period: "day",
        values: [{ value: 1200, endTime: null }],
      },
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("page_meta_token");
    expect(serialized).not.toContain("media_url");
    expect(serialized).not.toContain("private.jpg");
    expect(result.secretValuesExposed).toBe(false);
  });

  it("returns redacted partial results when one provider endpoint fails", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/posts")) {
        return Response.json({ data: [{
          id: "facebook_post_12345",
          message: "Production update",
          created_time: "2026-07-09T18:00:00Z",
        }] });
      }
      return Response.json({ error: { message: "provider secret detail" } }, { status: 503 });
    });

    const result = await readMetaAnalytics(input, fetcher as typeof fetch);
    expect(result.status).toBe("partial");
    expect(result.calendar).toHaveLength(1);
    expect(result.warnings).toEqual([
      "instagram_calendar_unavailable:meta_graph_http_503",
      "facebook_insights_unavailable:meta_graph_http_503",
      "instagram_insights_unavailable:meta_graph_http_503",
    ]);
    expect(JSON.stringify(result)).not.toContain("provider secret detail");
  });

  it.each([100, "private-code", -1, 1000000])("bounds provider diagnostics without reflecting private data: %j", async (code) => {
    const fetcher = vi.fn(async (value: string | URL | Request) => new URL(String(value)).pathname.endsWith("/posts")
      ? Response.json({ data: [] })
      : Response.json({ error: { code, message: "private-provider-message", fbtrace_id: "private-trace" } }, { status: 400 }));
    const result = await readMetaAnalytics({ ...input, instagramAccountId: null }, fetcher as typeof fetch);
    expect(result.status).toBe("partial");
    expect(result.warnings).toEqual([`facebook_insights_unavailable:meta_graph_http_400${code === 100 ? "_code_100" : ""}`]);
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("enforces a bounded ISO date range", () => {
    expect(isValidMetaAnalyticsDateRange("2026-07-01", "2026-07-31")).toBe(true);
    expect(isValidMetaAnalyticsDateRange("2026-07-01", "2026-08-01")).toBe(false);
    expect(isValidMetaAnalyticsDateRange("2026-07-10", "2026-07-01")).toBe(false);
    expect(isValidMetaAnalyticsDateRange("07/01/2026", "2026-07-10")).toBe(false);
  });
});
