import { defineAction, fail } from "@agent-native/core/action";
import { writeAppStateForCurrentTab } from "@agent-native/core/application-state";
import { z } from "zod";

export default defineAction({
  description:
    'Navigate the UI. Views: "listings", "listing" (needs listingId), "board", "thread" (needs threadId of a buyer conversation), "chat", "home", "settings". Or pass a path.',
  schema: z.object({
    view: z.string().optional().describe('View name: "listings", "listing", "board", "thread", "chat", "home" or "settings"'),
    path: z.string().optional().describe("URL path to navigate to, for example /board"),
    listingId: z.string().optional().describe('Listing id to open with view "listing"'),
    threadId: z
      .string()
      .optional()
      .describe('Buyer conversation id with view "thread", or chat thread id with view "chat"'),
  }),
  http: false,
  run: async (args) => {
    if (!args.view && !args.path) fail("Pass a view or a path.", { errorCode: "view_required" });
    if (args.view === "listing" && !args.listingId) fail('View "listing" needs listingId.', { errorCode: "listing_required" });
    if (args.view === "thread" && !args.threadId) fail('View "thread" needs threadId.', { errorCode: "thread_required" });
    const nav: Record<string, string> = {};
    if (args.view) nav.view = args.view;
    if (args.path) nav.path = args.path;
    if (args.listingId) nav.listingId = args.listingId;
    if (args.threadId) nav.threadId = args.threadId;
    nav._writeId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await writeAppStateForCurrentTab("navigate", nav);
    return `Navigating to ${args.view || args.path}`;
  },
});
