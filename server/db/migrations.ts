import type { MigrationEntry } from "@agent-native/core/db";

export const MIGRATIONS_TABLE = "still_available_migrations";

export const migrations: MigrationEntry[] = [
  {
    version: 1,
    name: "listings",
    sql: `CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      org_id TEXT,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      facts JSONB NOT NULL DEFAULT '[]'::jsonb,
      photo_url TEXT,
      ask_price INTEGER NOT NULL CONSTRAINT listings_ask_positive CHECK (ask_price > 0),
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'draft' CONSTRAINT listings_status_valid CHECK (status IN ('draft','live','paused','sold')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS listings_slug_uq ON listings (slug);
    CREATE INDEX IF NOT EXISTS listings_owner_idx ON listings (owner_email, updated_at)`,
  },
  {
    version: 2,
    name: "listing-guardrails",
    sql: `CREATE TABLE IF NOT EXISTS listing_guardrails (
      listing_id TEXT PRIMARY KEY REFERENCES listings(id),
      owner_email TEXT NOT NULL,
      org_id TEXT,
      floor_price INTEGER NOT NULL,
      robot_limit_price INTEGER NOT NULL,
      counter_steps INTEGER NOT NULL DEFAULT 3 CONSTRAINT guardrails_steps_range CHECK (counter_steps BETWEEN 1 AND 10),
      auto_close BOOLEAN NOT NULL DEFAULT false,
      pickup_details TEXT NOT NULL DEFAULT '',
      tone TEXT NOT NULL DEFAULT 'friendly' CONSTRAINT guardrails_tone_valid CHECK (tone IN ('friendly','dry','cheerful')),
      updated_at TEXT NOT NULL,
      CONSTRAINT guardrails_floor_le_limit CHECK (floor_price > 0 AND floor_price <= robot_limit_price)
    )`,
  },
  {
    version: 3,
    name: "threads",
    sql: `CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL REFERENCES listings(id),
      owner_email TEXT NOT NULL,
      org_id TEXT,
      kind TEXT NOT NULL CHECK (kind IN ('buyer','sparring')),
      buyer_token TEXT,
      buyer_name TEXT,
      spar_persona TEXT CHECK (spar_persona IS NULL OR spar_persona IN ('lowballer','sweet_talker','prober','jailbreaker')),
      mode TEXT NOT NULL DEFAULT 'agent' CHECK (mode IN ('agent','seller')),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','deal_pending','deal','closed')),
      offers_used INTEGER NOT NULL DEFAULT 0 CHECK (offers_used BETWEEN 0 AND 3),
      highest_offer INTEGER,
      agreed_price INTEGER,
      pickup_released BOOLEAN NOT NULL DEFAULT false,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS threads_one_open_per_token ON threads (listing_id, buyer_token) WHERE status <> 'closed' AND buyer_token IS NOT NULL;
    CREATE INDEX IF NOT EXISTS threads_owner_idx ON threads (owner_email, updated_at);
    CREATE INDEX IF NOT EXISTS threads_listing_idx ON threads (listing_id)`,
  },
  {
    version: 4,
    name: "messages",
    sql: `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id),
      owner_email TEXT NOT NULL,
      org_id TEXT,
      role TEXT NOT NULL CHECK (role IN ('buyer','agent','seller','system')),
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages (thread_id, created_at)`,
  },
  {
    version: 5,
    name: "offers",
    sql: `CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id),
      owner_email TEXT NOT NULL,
      org_id TEXT,
      amount INTEGER NOT NULL,
      outcome TEXT NOT NULL CHECK (outcome IN ('deal','countered','passed','refused')),
      counter_amount INTEGER,
      review TEXT CHECK (review IS NULL OR review IN ('pending','approved','declined')),
      review_due_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS offers_thread_idx ON offers (thread_id, created_at);
    CREATE INDEX IF NOT EXISTS offers_review_due_idx ON offers (review, review_due_at)`,
  },
  {
    version: 6,
    name: "events",
    sql: `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      thread_id TEXT,
      owner_email TEXT NOT NULL,
      org_id TEXT,
      actor TEXT NOT NULL CHECK (actor IN ('seller','agent','buyer','sparbot','system')),
      type TEXT NOT NULL CHECK (type IN ('message','offer','counter','blocked_attempt','takeover','handback','review','deal','pickup_released','spar_started')),
      detail JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS events_thread_idx ON events (thread_id, created_at)`,
  },
  {
    version: 7,
    name: "neutral-review-timing",
    sql: `ALTER TABLE offers ADD COLUMN IF NOT EXISTS approval_card BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE offers ADD COLUMN IF NOT EXISTS due_notice_posted BOOLEAN NOT NULL DEFAULT false;
    UPDATE offers SET approval_card = true WHERE review = 'pending' AND review_due_at IS NULL;
    UPDATE offers SET due_notice_posted = true WHERE review IS NULL OR review <> 'pending';
    ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_outcome_check;
    ALTER TABLE offers ADD CONSTRAINT offers_outcome_check CHECK (outcome IN ('deal','countered','passed','refused','pending'));
    ALTER TABLE threads ADD COLUMN IF NOT EXISTS turns_used INTEGER NOT NULL DEFAULT 0;
    UPDATE threads SET turns_used = (SELECT count(*) FROM messages m WHERE m.thread_id = threads.id AND m.role = 'buyer');
    CREATE INDEX IF NOT EXISTS offers_due_notice_idx ON offers (due_notice_posted, review_due_at)`,
  },
];
