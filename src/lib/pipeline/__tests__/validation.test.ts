import { GeneratePipelineParamsSchema, GeneratePipelineBodySchema } from "../validation";

describe("GeneratePipelineParamsSchema", () => {
  it("accepts valid id", () => {
    const result = GeneratePipelineParamsSchema.safeParse({ id: "abc-123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = GeneratePipelineParamsSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const result = GeneratePipelineParamsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("GeneratePipelineBodySchema", () => {
  it("accepts empty body", () => {
    const result = GeneratePipelineBodySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts optional audience", () => {
    const result = GeneratePipelineBodySchema.safeParse({ audience: "developers" });
    expect(result.success).toBe(true);
  });

  it("allows extra fields (voiceProfilePrompt is common)", () => {
    const result = GeneratePipelineBodySchema.safeParse({ extra: "field" });
    expect(result.success).toBe(true);
  });
});
