import { extractBearerToken, verifyToken, type AuthUser } from "./auth";

export async function authenticateRequest(req: Request): Promise<AuthUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  return verifyToken(token);
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
