import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

export default defineAction({
  description: "Close the deal at an amount that buyer-submit-offer already returned as a deal.",
  schema: z.object({
    amount: z.number().int().positive().describe("The agreed price in whole USD"),
  }),
  agentTool: false,
  mcpTool: false,
  readOnly: false,
  run: async () =>
    fail("This tool runs only inside a buyer conversation.", { errorCode: "robot_only", statusCode: 403 }),
});
