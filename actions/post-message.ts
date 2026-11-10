import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { agentNeedsApproval, sellerActor } from "../server/lib/common.js";
import { postMessage } from "../server/lib/threads.js";

export default defineAction({
  description: "Post a message from the seller into a conversation. Use after taking over with set-thread-mode.",
  schema: z.object({
    threadId: z.string().describe("Conversation (thread) id"),
    text: z.string().min(1).max(600).describe("Message text, at most 600 characters"),
  }),
  needsApproval: agentNeedsApproval,
  run: async (args, ctx) => postMessage(args, sellerActor(ctx)),
});
