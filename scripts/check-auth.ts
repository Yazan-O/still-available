const origin = process.argv[2] ?? "http://localhost:8080";

const reads = ["list-listings", "get-listing", "get-guardrails", "list-threads", "get-thread"];
const writes = [
  "save-listing",
  "set-guardrails",
  "post-message",
  "set-thread-mode",
  "review-offer",
  "close-deal",
  "release-pickup",
  "start-sparring",
  "buyer-read-listing",
  "buyer-submit-offer",
  "buyer-close-deal",
];

let failed = 0;
for (const name of [...reads, ...writes]) {
  const isRead = reads.includes(name);
  const url = `${origin}/_agent-native/actions/${name}${isRead ? "?id=x&listingId=x&threadId=x" : ""}`;
  const response = await fetch(url, {
    method: isRead ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-agent-native-frontend": "1" },
    ...(isRead ? {} : { body: JSON.stringify({ threadId: "x", listingId: "x", offerId: "x", amount: 1, text: "x", mode: "seller", decision: "approve", title: "x", description: "", facts: [], askPrice: 1, persona: "prober" }) }),
  });
  const ok = response.status === 401 || response.status === 403;
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${isRead ? "GET " : "POST"} ${name} -> ${response.status}`);
}
const spar = await fetch(`${origin}/api/spar/x/run`, { method: "POST" });
if (spar.status !== 401 && spar.status !== 403) failed += 1;
console.log(`${spar.status === 401 || spar.status === 403 ? "PASS" : "FAIL"} POST /api/spar/x/run -> ${spar.status}`);
console.log(failed ? `${failed} endpoint(s) answered without a cookie` : "all protected endpoints refused a no-cookie call");
process.exit(failed ? 1 : 0);
