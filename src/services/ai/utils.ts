export function isValidJson(str: string): boolean {
  try {
    const trimmed = str.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function extractJson(content: string): string {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];
  const arrMatch = content.match(/\[[\s\S]*\]/);
  if (arrMatch) return arrMatch[0];
  return content;
}

export function isRateLimited(statusCode: number): boolean {
  return statusCode === 429;
}

export function getApiKey(envVar: string): string {
  const key = process.env[envVar];
  if (!key) throw new Error(`Missing API key: ${envVar}`);
  return key;
}
