import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { sellerActor } from "../server/lib/common.js";
import { listListings } from "../server/lib/listings.js";

export default defineAction({
  description:
    "List the seller's listings, newest first, with buyer thread counts. Never includes guardrails (floor, robot limit).",
  schema: z.object({
    status: z
      .enum(["draft", "live", "paused", "sold"])
      .optional()
      .describe('Filter by status: "draft", "live", "paused" or "sold"; omit for all'),
  }),
  http: { method: "GET" },
  readOnly: true,
  run: async (args, ctx) => listListings(args, sellerActor(ctx)),
});
