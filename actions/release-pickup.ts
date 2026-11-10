import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { agentNeedsApproval, sellerActor } from "../server/lib/common.js";
import { releasePickup } from "../server/lib/negotiation.js";
import { toSellerThread } from "../server/lib/threads.js";

export default defineAction({
  description: "Release the listing's pickup details to the buyer of a closed deal. Seller only; the deal must be closed.",
  schema: z.object({ threadId: z.string().describe("Conversation (thread) id with a closed deal") }),
  needsApproval: agentNeedsApproval,
  run: async (args, ctx) => toSellerThread(await releasePickup(args, sellerActor(ctx))),
});
