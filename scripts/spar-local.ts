import { loadEnv } from "@agent-native/core/scripts";

loadEnv();

const [threadId, email, rounds] = process.argv.slice(2);
if (!threadId || !email) throw new Error("Usage: tsx scripts/spar-local.ts <threadId> <sellerEmail> [rounds] (dev server stopped)");
const { runSparring } = await import("../server/lib/sparring.js");
console.log(
  JSON.stringify(
    await runSparring({ threadId, rounds: rounds ? Number(rounds) : undefined }, { kind: "seller", email, orgId: null }),
    null,
    2,
  ),
);
process.exit(0);
