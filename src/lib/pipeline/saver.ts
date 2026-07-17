import type { PostRow } from "./types";

export async function savePosts(
  supabase: any,
  projectId: string,
  userId: string,
  posts: PostRow[],
) {
  if (posts.length === 0) return;
  const rows = posts.map((p) => ({
    project_id: projectId, user_id: userId,
    content: p.hook + "\n\n" + p.body, hook: p.hook, post_type: "story",
    virality_score: p.viralityScore ?? 0, authority_score: p.authorityScore ?? 0,
    comment_potential: p.commentPotential ?? 0, readability_score: p.readabilityScore ?? 0,
    image_prompt: p.imagePrompt, status: "draft",
  }));
  const { error } = await supabase.from("posts").insert(rows);
  if (error) {
    console.error("[saver] Failed to save posts:", error);
    throw new Error(`Failed to save posts: ${error.message}`);
  }
}
