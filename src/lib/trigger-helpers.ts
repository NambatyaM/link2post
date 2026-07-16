import { triggerClient } from "@/trigger/client";

interface RunProgress {
  step: string;
  progress: number;
  message: string;
}

export async function getRunProgress(runId: string): Promise<RunProgress | null> {
  try {
    const run = await triggerClient.runs.retrieve(runId);
    const metadata = run.metadata as Record<string, unknown> | undefined;
    const progress = metadata?.progress as RunProgress | undefined;
    return progress ?? null;
  } catch {
    return null;
  }
}

export function subscribeToProgress(
  runId: string,
  callback: (progress: RunProgress | null) => void,
): () => void {
  let active = true;

  const poll = async () => {
    while (active) {
      try {
        const progress = await getRunProgress(runId);
        callback(progress);
      } catch {
        callback(null);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  };

  poll();

  return () => {
    active = false;
  };
}
