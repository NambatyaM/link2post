import { TriggerClient } from "@trigger.dev/sdk";

export const triggerClient = new TriggerClient({
  id: "link2post",
  apiKey: process.env.TRIGGER_SECRET_KEY!,
});
