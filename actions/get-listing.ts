import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { sellerActor } from "../server/lib/common.js";
import { getListing } from "../server/lib/listings.js";

export default defineAction({
  description: "Get one of the seller's listings by id, including its public link path. Never includes guardrails.",
  schema: z.object({ id: z.string().describe("Listing id") }),
  http: { method: "GET" },
  readOnly: true,
  run: async (args, ctx) => getListing(args, sellerActor(ctx)),
});
