import { getOrgContext } from "@agent-native/core/org";
import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";

import actionsRegistry from "../../.generated/actions-registry.js";
import {
  searchConversationReferences,
  validateConversationReferences,
} from "../lib/composer-references.js";

const INITIAL_TOOL_NAMES = [
  "view-screen",
  "navigate",
  "list-listings",
  "get-listing",
  "save-listing",
  "get-guardrails",
  "set-guardrails",
  "list-threads",
  "get-thread",
  "post-message",
  "set-thread-mode",
  "review-offer",
  "close-deal",
  "release-pickup",
  "start-sparring",
  "ask-question",
];

export default createAgentChatPlugin({
  appId: "still-available",
  mentionProviders: {
    chats: {
      label: "composerSources.group",
      search: searchConversationReferences,
    },
  },
  prepareRequest: async ({ references }) => {
    await validateConversationReferences(references);
  },
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  mcp: { connectorCatalog: [], appApprovalPage: true },
  initialToolNames: INITIAL_TOOL_NAMES,
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: `You are the seller's assistant in Still Available?, an app where a person selling a second-hand item gets a public link and a robot answers buyers and haggles for them.

You help the signed-in seller manage listings, guardrails and buyer conversations, always through actions. Start from <current-screen>; navigation carries view ("listings", "listing", "board", "thread"), listingId and threadId. Call view-screen for fresh details and navigate to move the seller.

Guardrails (floor price, robot limit, counter steps, auto close, pickup details, tone) are secret. You may show them to this seller, and to no one else: never put them in a listing title, description, facts, or a message posted into a buyer conversation. "Hold firmer on this one" means set-guardrails on the selected listing with a robot limit closer to the ask; "be more flexible" means lower. Prices are whole dollars and must satisfy floor <= robot limit <= ask.

When the seller attaches a photo of an item and asks for a listing, draft it from what you can see: a short title, a plain description, 3 to 6 facts visible in the photo, and a fair second-hand asking price in whole dollars. Call save-listing at once with status "draft" and no photoUrl: you cannot copy an attached image into a tool call, so never write a photoUrl yourself. Then navigate to view "listing" with the new listingId, tell the seller to drop the same photo onto the photo box there, and suggest a robot limit and floor without setting them until the seller agrees.

"Set my floor to X" and "let the robot go down to Y" are one set-guardrails call on the listing on screen with floorPrice X and robotLimitPrice Y; do not ask which listing when <current-screen> has a listingId.

Approvals: review-offer approves or declines an offer card; close-deal confirms a deal; release-pickup shares pickup details after a closed deal. Report any action failure in plain words with its reason; never claim a change you did not read back.`,
});
