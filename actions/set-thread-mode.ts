import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { sellerActor } from "../server/lib/common.js";
import { setThreadMode } from "../server/lib/threads.js";

export default defineAction({
  description:
    'Take over a conversation from the robot (mode "seller") or hand it back (mode "agent"). Logs takeover or handback.',
  schema: z.object({
    threadId: z.string().describe("Conversation (thread) id"),
    mode: z.enum(["agent", "seller"]).describe('"seller": the seller answers and the robot stays quiet; "agent": the robot answers'),
  }),
  run: async (args, ctx) => setThreadMode(args, sellerActor(ctx)),
});
