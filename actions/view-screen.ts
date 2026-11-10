import { defineAction } from "@agent-native/core/action";
import { readAppState } from "@agent-native/core/application-state";
import { z } from "zod";

import { sellerActor } from "../server/lib/common.js";
import { getListing } from "../server/lib/listings.js";
import { agentSafeDetail, getThread } from "../server/lib/threads.js";

type Navigation = { view?: string; listingId?: string; threadId?: string };

export default defineAction({
  description:
    "Read the current screen: navigation (view, listingId, threadId) plus the visible listing or buyer conversation. Basic navigation is already in <current-screen>; use this for fresh details.",
  schema: z.object({}),
  http: false,
  readOnly: true,
  run: async (_args, ctx) => {
    const navigation = (await readAppState("navigation")) as Navigation | null;
    if (!navigation) return "No application state found. Is the app running?";
    const screen: Record<string, unknown> = { navigation };
    if (!ctx?.userEmail) return screen;
    const seller = sellerActor(ctx);
    if (navigation.view === "listing" && navigation.listingId) {
      screen.listing = await getListing({ id: navigation.listingId }, seller).catch(() => null);
    }
    if (navigation.view === "thread" && navigation.threadId) {
      const detail = await getThread({ threadId: navigation.threadId }, seller).catch(() => null);
      screen.thread = detail && agentSafeDetail({
        ...detail,
        messages: detail.messages.slice(-20),
        events: detail.events.slice(-20),
      });
    }
    return screen;
  },
});
