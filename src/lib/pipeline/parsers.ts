export function parseJsonResponse<T>(raw: string): T | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try { return JSON.parse(cleaned) as T; } catch {
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try { return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as T; } catch { return null; }
    }
    return null;
  }
}
