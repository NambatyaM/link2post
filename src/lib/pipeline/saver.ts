import type { PostRow } from "./types";

function getUpcomingWeekday(index: number): string {
  const now = new Date();
  const day = now.getDay();
  let daysUntilMonday = (1 - day + 7) % 7;
  if (daysUntilMonday === 0 && now.getHours() >= 17) daysUntilMonday = 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday + index);
  monday.setHours(9, 0, 0, 0);
  return monday.toISOString();
}

export async function savePosts(
  supabase: any,
  projectId: string,
  userId: string,
  posts: PostRow[],
) {
  if (posts.length === 0) return;
  const rows = posts.map((p, i) => ({
    project_id: projectId, user_id: userId,
    content: p.hook + "\n\n" + p.body, hook: p.hook, post_type: p.postType || "story",
    virality_score: p.viralityScore ?? 0, authority_score: p.authorityScore ?? 0,
    comment_potential: p.commentPotential ?? 0, readability_score: p.readabilityScore ?? 0,
    image_prompt: p.imagePrompt, status: "scheduled",
    scheduled_date: getUpcomingWeekday(i),
  }));
  const { error } = await supabase.from("posts").insert(rows);
  if (error) {
    console.error("[saver] Failed to save posts:", error);
    throw new Error(`Failed to save posts: ${error.message}`);
  }
}

export async function saveArticles(
  supabase: any,
  projectId: string,
  userId: string,
  articles: Array<{ title: string; body: string; imagePrompts: string[] }>,
  startOffset: number,
) {
  if (articles.length === 0) return;
  const rows = articles.map((a, i) => ({
    project_id: projectId, user_id: userId,
    content: a.title + "\n\n" + a.body,
    hook: a.title,
    post_type: "article",
    virality_score: 0,
    authority_score: 0,
    comment_potential: 0,
    readability_score: 0,
    image_prompt: a.imagePrompts?.join(", ") || "",
    status: "draft",
    scheduled_date: null,
  }));
  const { error } = await supabase.from("posts").insert(rows);
  if (error) {
    console.error("[saver] Failed to save articles:", error);
  }
}
