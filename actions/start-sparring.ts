import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { sellerActor } from "../server/lib/common.js";
import { PERSONAS, startSparring } from "../server/lib/threads.js";

export default defineAction({
  description:
    "Create a Sparring conversation where an attacker robot tests the seller's robot. Run it from the listing page.",
  schema: z.object({
    listingId: z.string().describe("Listing id"),
    persona: z.enum(PERSONAS).describe('Attacker: "lowballer", "sweet_talker", "prober" or "jailbreaker"'),
  }),
  run: async (args, ctx) => startSparring(args, sellerActor(ctx)),
});
