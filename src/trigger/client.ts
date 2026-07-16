import { TriggerClient } from "@trigger.dev/sdk";

export const triggerClient = new TriggerClient({
  accessToken: process.env.TRIGGER_SECRET_KEY!,
});
