import { getSupabaseServer } from "./supabase-server";
import { TRIAL_LIMIT } from "./constants";

const FREE_LIMIT = 10;
const STARTER_LIMIT = 50;
const WINDOW_MS = 3_600_000; // 1 hour

export type Plan = "anonymous" | "free" | "starter" | "pro";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  limit: number;
  plan: Plan;
}

function getLimitForPlan(plan: Plan): number {
  switch (plan) {
    case "anonymous": return TRIAL_LIMIT;
    case "free": return FREE_LIMIT;
    case "starter": return STARTER_LIMIT;
    case "pro": return Infinity;
  }
}

async function getUserPlan(userId: string): Promise<Plan> {
  try {
    const supabase = getSupabaseServer();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.plan === "starter" || profile?.plan === "pro") {
      return profile.plan;
    }
  } catch { /* fall through to default */ }
  return "free";
}

export async function checkRateLimit(opts: {
  userId?: string;
  deviceId?: string;
  plan?: Plan;
}): Promise<RateLimitResult> {
  const { userId, deviceId } = opts;
  const supabase = getSupabaseServer();

  const plan = opts.plan || (userId ? await getUserPlan(userId) : "anonymous");

  if (plan === "pro") {
    return { allowed: true, remaining: Infinity, retryAfterMs: 0, limit: Infinity, plan };
  }

  const limit = getLimitForPlan(plan);
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  if (userId) {
    const { count } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", windowStart);

    const used = count ?? 0;
    if (used >= limit) {
      const { data: oldest } = await supabase
        .from("rate_limits")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", windowStart)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      const retryAfterMs = oldest
        ? Math.max(WINDOW_MS - (Date.now() - new Date(oldest.created_at).getTime()), 1000)
        : WINDOW_MS;

      return { allowed: false, remaining: 0, retryAfterMs, limit, plan };
    }

    await supabase.from("rate_limits").insert({ user_id: userId });
    return { allowed: true, remaining: limit - used - 1, retryAfterMs: 0, limit, plan };
  }

  if (deviceId) {
    const { count } = await supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("device_id", deviceId)
      .gte("created_at", windowStart);

    const used = count ?? 0;
    if (used >= limit) {
      const { data: oldest } = await supabase
        .from("generations")
        .select("created_at")
        .eq("device_id", deviceId)
        .gte("created_at", windowStart)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      const retryAfterMs = oldest
        ? Math.max(WINDOW_MS - (Date.now() - new Date(oldest.created_at).getTime()), 1000)
        : WINDOW_MS;

      return { allowed: false, remaining: 0, retryAfterMs, limit, plan };
    }

    return { allowed: true, remaining: limit - used - 1, retryAfterMs: 0, limit, plan };
  }

  if (!userId && !deviceId) {
    return { allowed: false, remaining: 0, retryAfterMs: WINDOW_MS, limit: 0, plan };
  }

  return { allowed: true, remaining: limit, retryAfterMs: 0, limit, plan };
}

export async function recordGeneration(opts: {
  userId?: string;
  deviceId?: string;
  fingerprint?: string;
}): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase.from("generations").insert({
    user_id: opts.userId || null,
    device_id: opts.deviceId || null,
    fingerprint: opts.fingerprint || null,
  });
}

export async function linkDeviceToUser(deviceId: string, userId: string): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase
    .from("generations")
    .update({ user_id: userId })
    .eq("device_id", deviceId)
    .is("user_id", null);
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining === Infinity ? 999 : result.remaining),
    "X-RateLimit-Limit": String(result.limit === Infinity ? 999 : result.limit),
    "X-RateLimit-Plan": result.plan,
  };
  if (!result.allowed) {
    headers["Retry-After"] = String(Math.ceil(result.retryAfterMs / 1000));
  }
  return headers;
}
