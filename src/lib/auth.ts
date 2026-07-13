import { getSupabaseServer } from "./supabase-server";

export interface AuthUser {
  userId: string;
}

export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return { userId: data.user.id };
  } catch {
    return null;
  }
}
