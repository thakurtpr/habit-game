import { fail, guardMutation, ok } from "@/lib/server/http";
import { lockSession, readSession } from "@/lib/server/session";

/** Idle / hidden-tab lock: keeps the identity, drops access until the next face check. */
export async function POST(req: Request) {
  const blocked = await guardMutation(req, "lock");
  if (blocked) return blocked;

  const session = await readSession();
  if (!session) return fail("Not signed in", 401);
  await lockSession(session.uid);
  return ok({ status: "locked" as const });
}
