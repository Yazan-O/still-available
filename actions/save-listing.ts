import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { sellerActor } from "../server/lib/common.js";
import { saveListing } from "../server/lib/listings.js";

export default defineAction({
  description:
    "Create a listing (omit id) or update one (pass id). New listings start with guardrails at the ask (no discount) until set-guardrails changes them.",
  schema: z.object({
    id: z.string().optional().describe("Listing id to update; omit to create a new listing"),
    title: z.string().min(1).max(120).describe('Short item title, for example "Mid-century desk lamp"'),
    description: z.string().max(2000).describe("Plain-text item description shown to buyers"),
    facts: z.array(z.string().max(200)).max(20).describe("Short public facts buyers may ask about, one per entry"),
    photoUrl: z
      .string()
      .max(400_000)
      .nullable()
      .optional()
      .describe("Photo URL or data URL under 400,000 characters; null removes the photo; omit to keep it"),
    askPrice: z.number().int().positive().describe("Asking price in whole currency units (USD), for example 180"),
    status: z
      .enum(["draft", "live", "paused", "sold"])
      .optional()
      .describe('Listing status: "draft", "live" (public link works), "paused" or "sold"; omit to keep; new listings default to "draft"'),
  }),
  run: async (args, ctx) => saveListing(args, sellerActor(ctx)),
});
