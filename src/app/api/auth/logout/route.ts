import { guardMutation, ok } from "@/lib/server/http";
import { clearSession } from "@/lib/server/session";

export async function POST(req: Request) {
  const blocked = await guardMutation(req, "logout");
  if (blocked) return blocked;

  await clearSession();
  return ok({ status: "signed-out" as const });
}
