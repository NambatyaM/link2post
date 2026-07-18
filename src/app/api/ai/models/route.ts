import { NextRequest, NextResponse } from "next/server";
import { listModels, checkHealth } from "@/services/ai/providers/ollama";

export async function GET(_req: NextRequest) {
  try {
    const health = await checkHealth();
    const models = health.models;
    
    return NextResponse.json({
      running: health.running,
      models: models.map((m) => ({
        name: m.name,
        model: m.model,
        size: m.size,
        modified_at: m.modified_at,
        details: m.details,
      })),
      error: health.error,
    });
  } catch (err) {
    console.error("[ollama/models] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch models", running: false, models: [] },
      { status: 500 }
    );
  }
}