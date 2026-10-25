import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import {
  clearChallengeCookie,
  fromBase64Url,
  readChallengeCookie,
} from "@/lib/server/ceremony";
import { relyingParty } from "@/lib/server/env";
import { fail, guardMutation, ok } from "@/lib/server/http";
import { startUnlockedSession } from "@/lib/server/session";
import {
  findUserByCredential,
  takeChallenge,
  updateCredentialCounter,
} from "@/lib/server/users";

const MISMATCH_MESSAGE = "Face does not match the signed-in user";

export async function POST(req: Request) {
  const blocked = await guardMutation(req, "login-verify");
  if (blocked) return blocked;

  const body = (await req.json().catch(() => null)) as AuthenticationResponseJSON | null;
  if (!body || typeof body.id !== "string" || typeof body.response !== "object") {
    return fail("Invalid request", 400);
  }

  const challengeId = await readChallengeCookie();
  const pending = challengeId ? await takeChallenge(challengeId) : null;
  await clearChallengeCookie();
  if (!pending) return fail("Sign-in expired, try again", 400);

  const user = await findUserByCredential(body.id);
  const credential = user?.credentials.find((c) => c.id === body.id);
  if (!user || !credential) return fail("Face not recognised", 401);
  if (pending.expectedUserId && pending.expectedUserId !== user.id) {
    return fail(MISMATCH_MESSAGE, 403);
  }

  const { rpID, origin } = relyingParty(req);
  try {
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: pending.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: credential.id,
        publicKey: fromBase64Url(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ? [...credential.transports] : undefined,
      },
    });
    if (!verification.verified) return fail("Face check failed", 401);

    await updateCredentialCounter(user, credential.id, verification.authenticationInfo.newCounter);
    await startUnlockedSession(user.id);
    return ok({ status: "unlocked" as const });
  } catch (error: unknown) {
    console.error("login/verify failed", error);
    return fail("Face check failed", 401);
  }
}
