import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { calledByAgent, sellerActor } from "../server/lib/common.js";
import { agentSafeList, listThreads } from "../server/lib/threads.js";

export default defineAction({
  description:
    "List buyer and Sparring conversations, newest activity first, with the last message, pending approval count and blocked attempt count.",
  schema: z.object({
    listingId: z.string().optional().describe("Only conversations for this listing id"),
    status: z
      .enum(["open", "deal_pending", "deal", "closed"])
      .optional()
      .describe('Filter: "open", "deal_pending", "deal" or "closed"; omit for all'),
    kind: z.enum(["buyer", "sparring"]).optional().describe('Filter: "buyer" or "sparring"; omit for both'),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async (args, ctx) => {
    const rows = await listThreads(args, sellerActor(ctx));
    return calledByAgent(ctx) ? (agentSafeList(rows) as unknown as typeof rows) : rows;
  },
});
