export function parseJsonResponse<T>(raw: string): T | null {
  let cleaned = raw.trim();

  // Strip markdown code blocks
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  // Try direct parse
  try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

  // Extract first JSON object from response
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    try { return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as T; } catch { /* continue */ }
  }

  // Try to find JSON in a larger chunk (sometimes the model adds trailing text)
  const secondBrace = cleaned.indexOf("{", jsonStart + 1);
  if (secondBrace !== -1 && secondBrace < jsonEnd) {
    try { return JSON.parse(cleaned.slice(secondBrace, jsonEnd + 1)) as T; } catch { /* continue */ }
  }

  return null;
}
