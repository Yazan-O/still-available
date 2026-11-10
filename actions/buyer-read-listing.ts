import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

export default defineAction({
  description: "Read the item's public details and the current negotiation state (offers used, latest counter).",
  schema: z.object({}),
  agentTool: false,
  mcpTool: false,
  readOnly: true,
  run: async () =>
    fail("This tool runs only inside a buyer conversation.", { errorCode: "robot_only", statusCode: 403 }),
});
