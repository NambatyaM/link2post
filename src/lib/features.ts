import type { Plan } from "./rate-limit";
import { PLANS } from "./paddle";
import { getSupabaseServer } from "./supabase-server";

export type Feature =
  | "brand_voice"
  | "carousel_editor"
  | "analytics"
  | "export_txt"
  | "export_md"
  | "export_csv"
  | "export_pdf"
  | "export_docx"
  | "export_xlsx"
  | "export_zip";

const FEATURE_MAP: Record<Feature, Plan[]> = {
  export_txt: ["free", "starter", "pro"],
  export_md: ["starter", "pro"],
  export_csv: ["starter", "pro"],
  export_pdf: ["starter", "pro"],
  export_docx: ["starter", "pro"],
  export_xlsx: ["starter", "pro"],
  export_zip: ["starter", "pro"],
  brand_voice: ["starter", "pro"],
  carousel_editor: ["starter", "pro"],
  analytics: ["starter", "pro"],
};

export function hasFeature(plan: Plan, feature: Feature): boolean {
  if (plan === "anonymous") return false;
  return FEATURE_MAP[feature]?.includes(plan) ?? false;
}

export type QuotaResource = "projects" | "posts";

export function getMonthlyLimit(plan: Plan, resource: QuotaResource): number {
  if (plan === "anonymous") return 0;
  const planConfig = PLANS[plan];
  if (!planConfig) return 0;
  return resource === "projects" ? planConfig.projectsPerMonth : planConfig.postsPerMonth;
}

function getMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function getMonthlyUsage(
  userId: string,
  resource: QuotaResource,
): Promise<number> {
  const supabase = getSupabaseServer();
  const monthStart = getMonthStart();

  if (resource === "projects") {
    const { count } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart);
    return count ?? 0;
  }

  const { count } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart);
  return count ?? 0;
}

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export async function checkMonthlyQuota(
  userId: string,
  resource: QuotaResource,
  plan: Plan,
): Promise<QuotaCheckResult> {
  const limit = getMonthlyLimit(plan, resource);
  if (limit === Infinity) {
    return { allowed: true, used: 0, limit: Infinity, remaining: Infinity };
  }
  const used = await getMonthlyUsage(userId, resource);
  const remaining = Math.max(0, limit - used);
  return { allowed: used < limit, used, limit, remaining };
}
