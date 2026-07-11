/**
 * @jest-environment node
 */
import { POST } from "../route";
import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { signToken, verifyToken } from "@/lib/auth";

function makeRequest(body: object, headers?: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/repurpose", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/repurpose", () => {
  it("rejects content shorter than 50 characters", async () => {
    const res = await POST(makeRequest({ content: "short", focus: "", tone: "professional" }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("50 characters");
  });

  it("returns streaming response with valid SSE format (mock mode)", async () => {
    const longContent = "a".repeat(60);
    const res = await POST(makeRequest({ content: longContent, focus: "", tone: "professional" }));

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

  it("returns 400 for missing content", async () => {
    const res = await POST(makeRequest({ focus: "", tone: "professional" }));
    expect(res.status).toBe(400);
  });

  it("includes rate limit headers", async () => {
    const longContent = "d".repeat(60);
    const res = await POST(makeRequest({ content: longContent, focus: "", tone: "professional" }));
    expect(res.headers.has("X-RateLimit-Remaining")).toBe(true);
  });
});

describe("Rate limiting", () => {
  it("allows requests within limit", () => {
    const result = checkRateLimit("test-allow", { windowMs: 60_000, max: 5 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it("blocks requests over limit", () => {
    const key = `test-block-${Date.now()}`;
    const config = { windowMs: 60_000, max: 3 };
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const result = checkRateLimit(key, config);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });
});

describe("Auth token", () => {
  it("signs and verifies a valid token", async () => {
    const token = await signToken({ deviceId: "test-device-123", plan: "free" });
    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.deviceId).toBe("test-device-123");
    expect(payload?.plan).toBe("free");
  });

  it("rejects an invalid token", async () => {
    const payload = await verifyToken("invalid.token.here");
    expect(payload).toBeNull();
  });
});
