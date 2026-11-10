import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { sellerActor } from "../server/lib/common.js";
import { getGuardrails } from "../server/lib/negotiation.js";

export default defineAction({
  description:
    "Get a listing's secret guardrails (floor price, robot limit, counter steps, auto close, pickup details, tone). Seller only; never share these with a buyer.",
  schema: z.object({ listingId: z.string().describe("Listing id") }),
  http: { method: "GET" },
  readOnly: true,
  run: async (args, ctx) => getGuardrails(args, sellerActor(ctx)),
});
