import { getSupabaseServer } from "./supabase-server";

export interface AnalyticsSummary {
  signups: { total: number; today: number; thisWeek: number; bySource: Record<string, number> };
  generations: { total: number; today: number; thisWeek: number; byType: Record<string, number>; successRate: number };
  visits: { total: number; today: number; thisWeek: number; returnRate: number; uniqueDevices: number };
}

export async function recordSignup(opts: {
  userId: string;
  source?: string;
  referrerCode?: string;
  deviceId?: string;
}): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase.from("signup_events").insert({
    user_id: opts.userId,
    source: opts.source || "direct",
    referrer_code: opts.referrerCode || null,
    device_id: opts.deviceId || null,
  });
}

export async function recordVisit(opts: {
  userId?: string;
  deviceId?: string;
  fingerprint?: string;
  path?: string;
  sessionId?: string;
}): Promise<{ isReturn: boolean }> {
  const supabase = getSupabaseServer();
  const { userId, deviceId, fingerprint, path = "/", sessionId } = opts;

  let isReturn = false;

  if (userId) {
    const { count } = await supabase
      .from("visit_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    isReturn = (count ?? 0) > 0;
  } else if (deviceId) {
    const { count } = await supabase
      .from("visit_events")
      .select("*", { count: "exact", head: true })
      .eq("device_id", deviceId);
    isReturn = (count ?? 0) > 0;
  }

  await supabase.from("visit_events").insert({
    user_id: userId || null,
    device_id: deviceId || null,
    fingerprint: fingerprint || null,
    path,
    is_return: isReturn,
    session_id: sessionId || null,
  });

  return { isReturn };
}

export async function recordGenerationEvent(opts: {
  userId?: string;
  deviceId?: string;
  generationType: string;
  providerId?: string;
  modelId?: string;
  success: boolean;
  errorMessage?: string;
  durationMs?: number;
}): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase.from("generation_analytics").insert({
    user_id: opts.userId || null,
    device_id: opts.deviceId || null,
    generation_type: opts.generationType,
    provider_id: opts.providerId || null,
    model_id: opts.modelId || null,
    success: opts.success,
    error_message: opts.errorMessage || null,
    duration_ms: opts.durationMs || null,
  });
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const supabase = getSupabaseServer();
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [signupsTotal, signupsToday, signupsWeek, signupsBySource] = await Promise.all([
    supabase.from("signup_events").select("*", { count: "exact", head: true }),
    supabase.from("signup_events").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("signup_events").select("*", { count: "exact", head: true }).gte("created_at", weekStart),
    supabase.from("signup_events").select("source"),
  ]);

  const [gensTotal, gensToday, gensWeek, gensByType, gensFailed] = await Promise.all([
    supabase.from("generation_analytics").select("*", { count: "exact", head: true }),
    supabase.from("generation_analytics").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("generation_analytics").select("*", { count: "exact", head: true }).gte("created_at", weekStart),
    supabase.from("generation_analytics").select("generation_type"),
    supabase.from("generation_analytics").select("*", { count: "exact", head: true }).eq("success", false),
  ]);

  const [visitsTotal, visitsToday, visitsWeek, returnVisits, uniqueDevices] = await Promise.all([
    supabase.from("visit_events").select("*", { count: "exact", head: true }),
    supabase.from("visit_events").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("visit_events").select("*", { count: "exact", head: true }).gte("created_at", weekStart),
    supabase.from("visit_events").select("*", { count: "exact", head: true }).eq("is_return", true),
    supabase.from("visit_events").select("device_id").not("device_id", "is", null),
  ]);

  const sourceCounts: Record<string, number> = {};
  for (const s of signupsBySource.data || []) {
    sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
  }

  const typeCounts: Record<string, number> = {};
  for (const g of gensByType.data || []) {
    typeCounts[g.generation_type] = (typeCounts[g.generation_type] || 0) + 1;
  }

  const totalGenCount = gensTotal.count ?? 0;
  const failedGenCount = gensFailed.count ?? 0;
  const uniqueDeviceCount = new Set((uniqueDevices.data || []).map((d) => d.device_id)).size;

  return {
    signups: {
      total: signupsTotal.count ?? 0,
      today: signupsToday.count ?? 0,
      thisWeek: signupsWeek.count ?? 0,
      bySource: sourceCounts,
    },
    generations: {
      total: totalGenCount,
      today: gensToday.count ?? 0,
      thisWeek: gensWeek.count ?? 0,
      byType: typeCounts,
      successRate: totalGenCount > 0 ? Math.round(((totalGenCount - failedGenCount) / totalGenCount) * 100) : 100,
    },
    visits: {
      total: visitsTotal.count ?? 0,
      today: visitsToday.count ?? 0,
      thisWeek: visitsWeek.count ?? 0,
      returnRate: (visitsTotal.count ?? 0) > 0
        ? Math.round(((returnVisits.count ?? 0) / (visitsTotal.count ?? 1)) * 100)
        : 0,
      uniqueDevices: uniqueDeviceCount,
    },
  };
}
