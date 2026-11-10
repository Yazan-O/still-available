import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { sellerActor } from "../server/lib/common.js";
import { reviewOffer } from "../server/lib/negotiation.js";
import { toSellerThread } from "../server/lib/threads.js";

export default defineAction({
  description:
    'Approve or decline an offer waiting for the seller. Approve makes a deal at that amount at once. Decline posts nothing; at the hidden due time of the offer the buyer gets the same neutral "No answer from the seller" line every unanswered offer gets.',
  schema: z.object({
    offerId: z.string().describe("Offer id from get-thread"),
    decision: z.enum(["approve", "decline"]).describe('"approve" or "decline"'),
  }),
  run: async (args, ctx) => {
    const { offer, thread } = await reviewOffer(args, sellerActor(ctx));
    return {
      offer: {
        id: offer.id,
        amount: offer.amount,
        outcome: offer.outcome,
        counterAmount: offer.counterAmount,
        review: offer.review,
        createdAt: offer.createdAt,
      },
      thread: toSellerThread(thread),
    };
  },
});
