import { parseJsonResponse } from "../parsers";

describe("parseJsonResponse", () => {
  it("parses plain JSON string", () => {
    const result = parseJsonResponse<{ name: string }>('{"name":"test"}');
    expect(result).toEqual({ name: "test" });
  });

  it("parses JSON inside code block", () => {
    const result = parseJsonResponse<{ value: number }>("```json\n{\"value\":42}\n```");
    expect(result).toEqual({ value: 42 });
  });

  it("parses JSON inside code block without lang tag", () => {
    const result = parseJsonResponse<{ ok: boolean }>("```\n{\"ok\":true}\n```");
    expect(result).toEqual({ ok: true });
  });

  it("extracts JSON from surrounding text", () => {
    const result = parseJsonResponse<{ key: string }>(
      'Here is the result: {"key":"value"} Hope this helps.'
    );
    expect(result).toEqual({ key: "value" });
  });

  it("returns null for invalid input", () => {
    const result = parseJsonResponse("not json at all");
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const result = parseJsonResponse("");
    expect(result).toBeNull();
  });

  it("handles nested objects", () => {
    const input = JSON.stringify({ outer: { inner: [1, 2, 3], flag: true } });
    const result = parseJsonResponse<typeof input>(input);
    expect(result).toEqual({ outer: { inner: [1, 2, 3], flag: true } });
  });

  it("trims whitespace before parsing", () => {
    const result = parseJsonResponse<{ a: number }>("  {\"a\":1}  ");
    expect(result).toEqual({ a: 1 });
  });
});
