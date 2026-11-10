import { getSession } from "@agent-native/core/server";
import { defineEventHandler, getRouterParam, readBody } from "h3";

import { respond } from "../../../../lib/http.js";
import { runSparring } from "../../../../lib/sparring.js";

export default defineEventHandler((event) =>
  respond(async () => {
    const session = await getSession(event);
    if (!session?.email) return Response.json({ error: "Sign in first.", errorCode: "unauthenticated" }, { status: 401 });
    const body = (await readBody(event).catch(() => undefined)) as { rounds?: unknown } | undefined;
    const rounds = typeof body?.rounds === "number" && Number.isInteger(body.rounds) ? body.rounds : undefined;
    return runSparring(
      { threadId: getRouterParam(event, "threadId") ?? "", rounds },
      { kind: "seller", email: session.email, orgId: session.orgId ?? null },
    );
  }),
);
