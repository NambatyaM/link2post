import { savePosts } from "../saver";

describe("savePosts", () => {
  it("inserts rows for each post", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    const supabase = { from: () => ({ insert }) };

    const posts = [
      { hook: "Test hook", body: "Test body", imagePrompt: "An image", viralityScore: 80, authorityScore: 75, commentPotential: 70, readabilityScore: 85 },
    ];

    await savePosts(supabase as any, "proj-1", "user-1", posts);

    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({
        project_id: "proj-1",
        user_id: "user-1",
        hook: "Test hook",
        content: "Test hook\n\nTest body",
        virality_score: 80,
        authority_score: 75,
        comment_potential: 70,
        readability_score: 85,
        image_prompt: "An image",
        status: "draft",
      }),
    ]);
  });

  it("skips insert when posts array is empty", async () => {
    const insert = jest.fn();
    const supabase = { from: () => ({ insert }) };

    await savePosts(supabase as any, "proj-1", "user-1", []);

    expect(insert).not.toHaveBeenCalled();
  });

  it("defaults missing scores to 0", async () => {
    const insert = jest.fn().mockResolvedValue({ error: null });
    const supabase = { from: () => ({ insert }) };

    await savePosts(supabase as any, "proj-1", "user-1", [
      { hook: "H", body: "B", imagePrompt: "P" },
    ]);

    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({
        virality_score: 0,
        authority_score: 0,
        comment_potential: 0,
        readability_score: 0,
      }),
    ]);
  });
});
