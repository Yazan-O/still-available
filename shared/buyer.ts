export const MAX_OFFERS = 3;
export const MAX_BUYER_TURNS = 30;
export const MAX_MESSAGE_CHARS = 600;

export type PublicListing = {
  slug: string;
  title: string;
  description: string;
  facts: string[];
  photoUrl: string | null;
  askPrice: number;
  currency: string;
  status: "live" | "paused" | "sold";
};

export type BuyerVerdict =
  | { verdict: "deal"; amount: number }
  | { verdict: "countered"; counterAmount: number }
  | { verdict: "passed" }
  | { verdict: "pending" }
  | { verdict: "refused"; reason: "descending" | "over_cap" };

export type BuyerOffer = {
  amount: number;
  outcome: "deal" | "countered" | "passed" | "refused" | "pending";
  counterAmount: number | null;
  createdAt: string;
};

export type BuyerMessage = {
  id: string;
  role: "buyer" | "agent" | "seller" | "system";
  text: string;
  createdAt: string;
};

export type BuyerThread = {
  status: "open" | "deal_pending" | "deal" | "closed";
  mode: "agent" | "seller";
  buyerName: string | null;
  offersUsed: number;
  offersLeft: number;
  highestOffer: number | null;
  currentCounter: number | null;
  agreedPrice: number | null;
  turnsLeft: number;
  pickupDetails: string | null;
  messages: BuyerMessage[];
  offers: BuyerOffer[];
};

export type BuyerThreadResponse = {
  listing: PublicListing;
  thread: BuyerThread | null;
};

export type BuyerTurnResponse = {
  reply: string | null;
  offerResult: BuyerVerdict | null;
  listing: PublicListing;
  thread: BuyerThread;
};
