import {
  verifyRegistrationResponse,
  type AuthenticatorTransport,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  clearChallengeCookie,
  readChallengeCookie,
  toBase64Url,
} from "@/lib/server/ceremony";
import { isSignupAllowed, relyingParty } from "@/lib/server/env";
import { fail, guardMutation, ok } from "@/lib/server/http";
import { startUnlockedSession } from "@/lib/server/session";
import { createUser, takeChallenge } from "@/lib/server/users";

export async function POST(req: Request) {
  const blocked = await guardMutation(req, "register-verify");
  if (blocked) return blocked;
  if (!isSignupAllowed()) return fail("Sign-up is closed", 403);

  const body = (await req.json().catch(() => null)) as RegistrationResponseJSON | null;
  if (!body || typeof body.id !== "string" || typeof body.response !== "object") {
    return fail("Invalid request", 400);
  }

  const challengeId = await readChallengeCookie();
  const pending = challengeId ? await takeChallenge(challengeId) : null;
  await clearChallengeCookie();
  if (!pending?.userId) return fail("Sign-up expired, try again", 400);

  const { rpID, origin } = relyingParty(req);
  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!verification.verified) return fail("Face check failed", 401);

    const { credential } = verification.registrationInfo;
    await createUser({
      id: pending.userId,
      createdAt: Date.now(),
      credentials: [
        {
          id: credential.id,
          publicKey: toBase64Url(credential.publicKey),
          counter: credential.counter,
          transports: credential.transports as AuthenticatorTransport[] | undefined,
        },
      ],
    });
    await startUnlockedSession(pending.userId);
    return ok({ status: "unlocked" as const });
  } catch (error: unknown) {
    console.error("register/verify failed", error);
    return fail("Face check failed", 401);
  }
}
