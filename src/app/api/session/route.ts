import { isSignupAllowed } from "@/lib/server/env";
import { ok } from "@/lib/server/http";
import { readSession, statusOf } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  return ok(
    { status: statusOf(session), signupAllowed: isSignupAllowed() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
