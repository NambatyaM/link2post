import { z } from "zod";

export const GeneratePipelineParamsSchema = z.object({
  id: z.string().min(1, "Project ID is required"),
});

export const GeneratePipelineBodySchema = z.object({
  audience: z.string().optional(),
  voiceProfilePrompt: z.string().optional(),
});

export type GeneratePipelineParams = z.infer<typeof GeneratePipelineParamsSchema>;
export type GeneratePipelineBody = z.infer<typeof GeneratePipelineBodySchema>;
