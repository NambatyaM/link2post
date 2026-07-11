/**
 * @jest-environment node
 */
import { POST } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/token", () => {
  it("returns a JWT for a valid device ID", async () => {
    const deviceId = "550e8400-e29b-41d4-a716-446655440000";
    const res = await POST(makeRequest({ deviceId }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(typeof data.token).toBe("string");
    expect(data.token.split(".")).toHaveLength(3);
  });

  it("rejects an invalid device ID format", async () => {
    const res = await POST(makeRequest({ deviceId: "not-a-uuid" }));

    expect(res.status).toBe(400);
  });

  it("rejects missing device ID", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
  });
});
