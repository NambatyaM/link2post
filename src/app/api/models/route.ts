import { getActiveProviders } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const active = getActiveProviders();

  const options = active.flatMap((entry) =>
    entry.models.map((m) => ({
      providerId: entry.provider.id,
      providerLabel: entry.provider.label,
      tagline: entry.provider.tagline,
      modelId: m.id,
      modelLabel: m.label,
    })),
  );

  const defaultSelection = active.length > 0
    ? { providerId: active[0].provider.id, modelId: active[0].models[0].id }
    : null;

  return Response.json({ options, default: defaultSelection });
}
