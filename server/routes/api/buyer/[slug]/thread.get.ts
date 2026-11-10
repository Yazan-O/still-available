import { defineEventHandler, getRouterParam } from "h3";

import type { BuyerThreadResponse } from "../../../../../shared/buyer.js";
import { buyerTokenFrom, respond } from "../../../../lib/http.js";
import { listingBySlug, toPublicListing } from "../../../../lib/listings.js";
import { buyerThreadView } from "../../../../lib/threads.js";

export default defineEventHandler((event) =>
  respond(async (): Promise<BuyerThreadResponse> => {
    const listing = await listingBySlug(getRouterParam(event, "slug") ?? "");
    const token = buyerTokenFrom(event);
    return { listing: toPublicListing(listing), thread: token ? await buyerThreadView(listing, token) : null };
  }),
);
