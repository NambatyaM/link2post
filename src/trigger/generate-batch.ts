import { task, metadata } from "@trigger.dev/sdk/v3";
import { generateContentTask } from "./generate-content";

interface GenerateBatchPayload {
  userId: string;
  projectIds: string[];
  niche?: string;
  audience?: string;
}

export const generateBatchTask = task({
  id: "generate-batch",
  maxDuration: 900,
  run: async (payload: GenerateBatchPayload, { ctx: _ctx }) => {
    const { userId, projectIds, niche: _niche, audience } = payload;
    const results: Array<{ projectId: string; ok: boolean; error?: string }> = [];
    const total = projectIds.length;

    for (let i = 0; i < projectIds.length; i++) {
      const projectId = projectIds[i];

      metadata.set("batch_progress", {
        currentIndex: i,
        total,
        completedCount: results.length,
        projectId,
      });
      await metadata.flush();

      try {
        const result = await generateContentTask.triggerAndWait({
          projectId,
          userId,
          audience,
        });

        if (result.ok) {
          results.push({ projectId, ok: true });
        } else {
          results.push({ projectId, ok: false, error: String(result.error) });
        }
      } catch (error) {
        results.push({
          projectId,
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    metadata.set("batch_progress", {
      currentIndex: total,
      total,
      completedCount: results.length,
      projectId: null,
    });

    return results;
  },
});
