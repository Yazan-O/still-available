import { fail } from "@agent-native/core/action";
import { defineEventHandler, getRouterParam, readBody } from "h3";
import { z } from "zod";

import { MAX_MESSAGE_CHARS, type BuyerTurnResponse } from "../../../../../shared/buyer.js";
import { BuyerToken, badRequest, limitTurns, respond } from "../../../../lib/http.js";
import { listingBySlug, toPublicListing } from "../../../../lib/listings.js";
import { takeTurn } from "../../../../lib/robot-turn.js";
import { openBuyerThread, toBuyerThread } from "../../../../lib/threads.js";

const Body = z
  .object({
    buyerToken: BuyerToken,
    buyerName: z.string().trim().min(1).max(60).optional(),
    text: z.string().trim().min(1).max(MAX_MESSAGE_CHARS).optional(),
    offerAmount: z.number().int().positive().max(10_000_000).optional(),
  })
  .refine((b) => b.text !== undefined || b.offerAmount !== undefined, "Send text or offerAmount.");

export default defineEventHandler((event) =>
  respond(async (): Promise<BuyerTurnResponse> => {
    const parsed = Body.safeParse(await readBody(event).catch(() => undefined));
    if (!parsed.success) badRequest(parsed.error.issues[0]?.message ?? "Invalid request.");
    limitTurns(event, parsed.data.buyerToken);
    const listing = await listingBySlug(getRouterParam(event, "slug") ?? "");
    if (listing.status !== "live") {
      fail("This listing is not taking messages right now.", { errorCode: "listing_not_live", statusCode: 409 });
    }
    const body = parsed.data;
    const thread = await openBuyerThread(listing, body.buyerToken, body.buyerName ?? null);
    const turn = await takeTurn({
      listing,
      thread,
      text: body.text,
      offerAmount: body.offerAmount,
      writer: { kind: "buyer" },
    });
    return {
      reply: turn.reply,
      offerResult: turn.offerResult,
      listing: toPublicListing(listing),
      thread: await toBuyerThread(turn.thread),
    };
  }),
);
