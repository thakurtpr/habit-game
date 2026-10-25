import { findBestMatch, isDescriptor, MATCH_THRESHOLD } from "@/lib/faceMath";
import {
  fail,
  guardMutation,
  hasTooManyFailures,
  ok,
  recordFailure,
} from "@/lib/server/http";
import { readSession, startUnlockedSession } from "@/lib/server/session";
import { listFaces } from "@/lib/server/users";

const MISMATCH_MESSAGE = "Face does not match the signed-in user";

/**
 * Sign-in (no session): the scan may match any enrolled face.
 * Unlock (locked session): it must match the signed-in user, so a different
 * enrolled face cannot take over someone else's session.
 */
export async function POST(req: Request) {
  const blocked = await guardMutation(req, "login");
  if (blocked) return blocked;
  if (await hasTooManyFailures(req)) {
    return fail("Too many failed scans. Wait a few minutes and try again.", 429);
  }

  const body = (await req.json().catch(() => null)) as { descriptor?: unknown } | null;
  if (!isDescriptor(body?.descriptor)) return fail("Invalid face scan", 400);

  const session = await readSession();
  const faces = await listFaces();
  if (!session && faces.length === 0) {
    return fail("No face is registered yet. Choose Sign up first.", 404);
  }
  const candidates = session ? faces.filter((f) => f.id === session.uid) : faces;
  if (session && candidates.length === 0) return fail("Session is no longer valid", 401);

  const match = findBestMatch(candidates, body.descriptor, MATCH_THRESHOLD);
  if (!match) {
    await recordFailure(req);
    return session ? fail(MISMATCH_MESSAGE, 403) : fail("Face not recognised", 401);
  }

  await startUnlockedSession(match.id);
  return ok({ status: "unlocked" as const });
}
