import { readFileSync } from "node:fs";
import path from "node:path";

type Discovery = { origin: string; token: string };

const discoveryFile = path.resolve(".agent-native/dev-server.json");

function readDiscovery(): Discovery {
  try {
    return JSON.parse(readFileSync(discoveryFile, "utf8")) as Discovery;
  } catch {
    throw new Error(`Start the dev server first (pnpm exec agent-native dev); ${discoveryFile} was not readable.`);
  }
}

async function callAction<T>(d: Discovery, name: string, input: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${d.origin}/_agent-native/dev/action`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-agent-native-dev-token": d.token },
    body: JSON.stringify({ name, input }),
  });
  const body = (await response.json()) as { ok?: boolean; result?: T; error?: string };
  if (!response.ok || !body.ok) throw new Error(`${name} failed (${response.status}): ${body.error ?? "no message"}`);
  return body.result as T;
}

const d = readDiscovery();
const existingId = process.argv[2];
const listing = await callAction<{ id: string; slug: string; publicPath: string }>(d, "save-listing", {
  ...(existingId ? { id: existingId } : {}),
  title: "Mid-century desk lamp",
  description: "Brass and walnut desk lamp from the 1960s. Rewired, works well, light patina on the shade.",
  facts: ["Height 18 inches", "Brass shade, walnut base", "Rewired in 2024, standard E26 bulb", "Small dent on the back of the shade"],
  photoUrl: "/demo-desk-lamp.svg",
  askPrice: 180,
  status: "live",
});
await callAction(d, "set-guardrails", {
  listingId: listing.id,
  floorPrice: 137,
  robotLimitPrice: 150,
  counterSteps: 3,
  autoClose: false,
  pickupDetails: "Porch pickup, 12 Elm St, after 5 pm",
  tone: "friendly",
});
console.log(`listingId=${listing.id}`);
console.log(`slug=${listing.slug}`);
console.log(`public=${d.origin}${listing.publicPath}`);
