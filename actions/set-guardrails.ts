import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { agentNeedsApproval, sellerActor } from "../server/lib/common.js";
import { setGuardrails } from "../server/lib/negotiation.js";

export default defineAction({
  description:
    "Change a listing's secret guardrails. Prices must satisfy floor <= robot limit <= ask. Raising the robot limit toward the ask makes the robot hold firmer.",
  schema: z.object({
    listingId: z.string().describe("Listing id"),
    floorPrice: z.number().int().positive().optional().describe("Lowest price the seller would accept, whole USD; never shown to buyers"),
    robotLimitPrice: z.number().int().positive().optional().describe("Lowest price the robot may agree to on its own, whole USD"),
    counterSteps: z.number().int().min(1).max(10).optional().describe("How many counters it takes to walk from the ask to the robot limit, 1 to 10; default 3"),
    autoClose: z.boolean().optional().describe("true: a robot deal closes at once; false (default): the seller confirms each deal"),
    pickupDetails: z.string().max(1000).optional().describe("Pickup address and time, shown to the buyer only after release-pickup"),
    tone: z.enum(["friendly", "dry", "cheerful"]).optional().describe('Robot tone: "friendly", "dry" or "cheerful"'),
  }),
  needsApproval: agentNeedsApproval,
  run: async (args, ctx) => setGuardrails(args, sellerActor(ctx)),
});
