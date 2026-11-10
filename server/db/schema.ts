import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const owner = {
  ownerEmail: text("owner_email").notNull(),
  orgId: text("org_id"),
};

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    ...owner,
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    facts: jsonb("facts").$type<string[]>().notNull().default([]),
    photoUrl: text("photo_url"),
    askPrice: integer("ask_price").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status", { enum: ["draft", "live", "paused", "sold"] })
      .notNull()
      .default("draft"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("listings_slug_uq").on(t.slug),
    index("listings_owner_idx").on(t.ownerEmail, t.updatedAt),
    check("listings_ask_positive", sql`${t.askPrice} > 0`),
    check(
      "listings_status_valid",
      sql`${t.status} in ('draft','live','paused','sold')`,
    ),
  ],
);

export const listingGuardrails = pgTable(
  "listing_guardrails",
  {
    listingId: text("listing_id")
      .primaryKey()
      .references(() => listings.id),
    ...owner,
    floorPrice: integer("floor_price").notNull(),
    robotLimitPrice: integer("robot_limit_price").notNull(),
    counterSteps: integer("counter_steps").notNull().default(3),
    autoClose: boolean("auto_close").notNull().default(false),
    pickupDetails: text("pickup_details").notNull().default(""),
    tone: text("tone", { enum: ["friendly", "dry", "cheerful"] })
      .notNull()
      .default("friendly"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    check(
      "guardrails_floor_le_limit",
      sql`${t.floorPrice} > 0 and ${t.floorPrice} <= ${t.robotLimitPrice}`,
    ),
    check(
      "guardrails_steps_range",
      sql`${t.counterSteps} between 1 and 10`,
    ),
    check(
      "guardrails_tone_valid",
      sql`${t.tone} in ('friendly','dry','cheerful')`,
    ),
  ],
);

export const threads = pgTable(
  "threads",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    ...owner,
    kind: text("kind", { enum: ["buyer", "sparring"] }).notNull(),
    buyerToken: text("buyer_token"),
    buyerName: text("buyer_name"),
    sparPersona: text("spar_persona", {
      enum: ["lowballer", "sweet_talker", "prober", "jailbreaker"],
    }),
    mode: text("mode", { enum: ["agent", "seller"] })
      .notNull()
      .default("agent"),
    status: text("status", {
      enum: ["open", "deal_pending", "deal", "closed"],
    })
      .notNull()
      .default("open"),
    offersUsed: integer("offers_used").notNull().default(0),
    highestOffer: integer("highest_offer"),
    agreedPrice: integer("agreed_price"),
    pickupReleased: boolean("pickup_released").notNull().default(false),
    turnsUsed: integer("turns_used").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("threads_one_open_per_token")
      .on(t.listingId, t.buyerToken)
      .where(sql`${t.status} <> 'closed' and ${t.buyerToken} is not null`),
    index("threads_owner_idx").on(t.ownerEmail, t.updatedAt),
    index("threads_listing_idx").on(t.listingId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id),
    ...owner,
    role: text("role", {
      enum: ["buyer", "agent", "seller", "system"],
    }).notNull(),
    text: text("text").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("messages_thread_idx").on(t.threadId, t.createdAt)],
);

export const offers = pgTable(
  "offers",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id),
    ...owner,
    amount: integer("amount").notNull(),
    outcome: text("outcome", {
      enum: ["deal", "countered", "passed", "refused", "pending"],
    }).notNull(),
    counterAmount: integer("counter_amount"),
    review: text("review", { enum: ["pending", "approved", "declined"] }),
    reviewDueAt: text("review_due_at"),
    approvalCard: boolean("approval_card").notNull().default(false),
    dueNoticePosted: boolean("due_notice_posted").notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("offers_thread_idx").on(t.threadId, t.createdAt),
    index("offers_review_due_idx").on(t.review, t.reviewDueAt),
  ],
);

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id").notNull(),
    threadId: text("thread_id"),
    ...owner,
    actor: text("actor", {
      enum: ["seller", "agent", "buyer", "sparbot", "system"],
    }).notNull(),
    type: text("type", {
      enum: [
        "message",
        "offer",
        "counter",
        "blocked_attempt",
        "takeover",
        "handback",
        "review",
        "deal",
        "pickup_released",
        "spar_started",
      ],
    }).notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("events_thread_idx").on(t.threadId, t.createdAt)],
);
