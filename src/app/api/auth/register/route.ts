import {
  areConsistent,
  ENROLL_CONSISTENCY_THRESHOLD,
  findBestMatch,
  isDescriptor,
  MATCH_THRESHOLD,
  MAX_ENROLL_SAMPLES,
  meanDescriptor,
  MIN_ENROLL_SAMPLES,
} from "@/lib/faceMath";
import { isSignupAllowed } from "@/lib/server/env";
import { fail, guardMutation, ok } from "@/lib/server/http";
import { startUnlockedSession } from "@/lib/server/session";
import { createUser, listFaces } from "@/lib/server/users";

export async function POST(req: Request) {
  const blocked = await guardMutation(req, "register");
  if (blocked) return blocked;
  if (!isSignupAllowed()) return fail("Sign-up is closed", 403);

  const body = (await req.json().catch(() => null)) as { samples?: unknown } | null;
  const samples = body?.samples;
  if (
    !Array.isArray(samples) ||
    samples.length < MIN_ENROLL_SAMPLES ||
    samples.length > MAX_ENROLL_SAMPLES ||
    !samples.every(isDescriptor)
  ) {
    return fail("Invalid face scan", 400);
  }
  if (!areConsistent(samples, ENROLL_CONSISTENCY_THRESHOLD)) {
    return fail("The scan was not steady. Hold still and try again.", 400);
  }

  const face = meanDescriptor(samples);
  const existing = await findBestMatch(await listFaces(), face, MATCH_THRESHOLD);
  if (existing) return fail("This face is already registered. Sign in instead.", 409);

  const id = crypto.randomUUID();
  await createUser({ id, createdAt: Date.now() }, face);
  await startUnlockedSession(id);
  return ok({ status: "unlocked" as const });
}
