/**
 * @jest-environment node
 */
import { POST } from "../route";
import { NextRequest } from "next/server";

jest.mock("@/lib/supabase-server", () => ({
  getSupabaseServer: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      head: jest.fn().mockReturnThis(),
    })),
  })),
}));

function makeRequest(body: object, headers?: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate", () => {
  it("rejects short transcript", async () => {
    const res = await POST(makeRequest({
      videoInfo: { title: "T", description: "D", transcript: "short", url: "url", videoId: "x" },
      timezone: "America/New_York",
    }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("too short");
  });

  it("returns streaming response with valid SSE format (mock mode)", async () => {
    const res = await POST(makeRequest({
      videoInfo: { title: "Test Video", description: "Desc", transcript: "a ".repeat(200), url: "https://youtube.com/watch?v=abc", videoId: "abc" },
      timezone: "America/New_York",
    }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toContain("no-cache");

    const reader = res.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let accumulated = "";

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
      }
    }

    expect(accumulated).toContain("data: ");
    expect(accumulated).toContain("[DONE]");

    const dataLines = accumulated
      .split("\n")
      .filter((l) => l.startsWith("data: ") && !l.includes("[DONE]"));
    expect(dataLines.length).toBeGreaterThan(0);

    const fullContent = dataLines
      .map((l) => {
        const parsed = JSON.parse(l.slice(6));
        return parsed.content || "";
      })
      .join("");

    expect(fullContent.length).toBeGreaterThan(0);
  });

  it("returns 400 for missing videoInfo", async () => {
    const res = await POST(makeRequest({ timezone: "America/New_York" }));
    expect(res.status).toBe(400);
  });

  it("includes rate limit headers", async () => {
    const res = await POST(makeRequest({
      videoInfo: { title: "T", description: "D", transcript: "word ".repeat(200), url: "url", videoId: "x" },
      timezone: "America/New_York",
    }));
    expect(res.headers.has("X-RateLimit-Remaining")).toBe(true);
  });
});
