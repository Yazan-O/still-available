import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

export default defineAction({
  description: "Record the buyer's price offer and get the verdict: deal, countered (with counterAmount), passed or refused. Call it whenever the buyer names a price.",
  schema: z.object({
    amount: z.number().int().positive().describe("The buyer's offered price in whole USD"),
  }),
  agentTool: false,
  mcpTool: false,
  readOnly: false,
  run: async () =>
    fail("This tool runs only inside a buyer conversation.", { errorCode: "robot_only", statusCode: 403 }),
});
