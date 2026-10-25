import { generateRegistrationOptions } from "@simplewebauthn/server";
import { setChallengeCookie } from "@/lib/server/ceremony";
import { isSignupAllowed, RP_NAME, relyingParty } from "@/lib/server/env";
import { fail, guardMutation, ok } from "@/lib/server/http";
import { saveChallenge } from "@/lib/server/users";

export async function POST(req: Request) {
  const blocked = await guardMutation(req, "register-options");
  if (blocked) return blocked;
  if (!isSignupAllowed()) return fail("Sign-up is closed", 403);

  const { rpID } = relyingParty(req);
  const userId = crypto.randomUUID();

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: new TextEncoder().encode(userId),
    userName: `player-${userId.slice(0, 8)}`,
    userDisplayName: "Habit Game player",
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "required",
      userVerification: "required",
    },
  });

  const challengeId = crypto.randomUUID();
  await saveChallenge(challengeId, { challenge: options.challenge, userId });
  await setChallengeCookie(challengeId);
  return ok(options);
}
