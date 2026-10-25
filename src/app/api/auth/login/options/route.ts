import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { setChallengeCookie } from "@/lib/server/ceremony";
import { relyingParty } from "@/lib/server/env";
import { fail, guardMutation, ok } from "@/lib/server/http";
import { readSession } from "@/lib/server/session";
import { findUser, saveChallenge } from "@/lib/server/users";

/**
 * Sign-in (no session): any passkey registered here may answer.
 * Unlock (locked session): only the signed-in user's passkeys are accepted,
 * so a different face on a different enrolled device cannot take over.
 */
export async function POST(req: Request) {
  const blocked = await guardMutation(req, "login-options");
  if (blocked) return blocked;

  const { rpID } = relyingParty(req);
  const session = await readSession();
  const sessionUser = session ? await findUser(session.uid) : null;
  if (session && !sessionUser) return fail("Session is no longer valid", 401);

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: sessionUser?.credentials.map((c) => ({
      id: c.id,
      transports: c.transports ? [...c.transports] : undefined,
    })),
  });

  const challengeId = crypto.randomUUID();
  await saveChallenge(challengeId, {
    challenge: options.challenge,
    expectedUserId: sessionUser?.id,
  });
  await setChallengeCookie(challengeId);
  return ok(options);
}
