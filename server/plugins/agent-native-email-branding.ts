import { defineAppConfig } from "@agent-native/core/server";

export default defineAppConfig({
  app: {
    name: "Still Available?",
    sourceTemplate: "chat",
    homePath: "/listings",
  },
});
