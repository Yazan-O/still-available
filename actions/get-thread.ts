import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { calledByAgent, sellerActor } from "../server/lib/common.js";
import { agentSafeDetail, getThread } from "../server/lib/threads.js";

export default defineAction({
  description:
    "Get one conversation with its messages, offers (with review state and approvalCard flag) and event timeline.",
  schema: z.object({ threadId: z.string().describe("Conversation (thread) id") }),
  http: { method: "GET" },
  readOnly: true,
  run: async (args, ctx) => {
    const detail = await getThread(args, sellerActor(ctx));
    return calledByAgent(ctx) ? (agentSafeDetail(detail) as unknown as typeof detail) : detail;
  },
});
