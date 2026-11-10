import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { agentNeedsApproval, sellerActor } from "../server/lib/common.js";
import { closeDeal } from "../server/lib/negotiation.js";
import { toSellerThread } from "../server/lib/threads.js";

export default defineAction({
  description: "Confirm and close a deal on a conversation at an amount the seller chooses.",
  schema: z.object({
    threadId: z.string().describe("Conversation (thread) id"),
    amount: z.number().int().positive().describe("Agreed price in whole USD"),
  }),
  needsApproval: agentNeedsApproval,
  run: async (args, ctx) => toSellerThread(await closeDeal(args, sellerActor(ctx))),
});
