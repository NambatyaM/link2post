import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_link2post",
  runtime: "node",
  logLevel: "log",
  dirs: ["src/trigger"],
  maxDuration: 300,
});
