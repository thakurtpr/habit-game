import { z } from "zod";
import { fail, guardMutation, ok } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { isUnlocked, readSession } from "@/lib/server/session";
import { EMPTY_STATE, type HabitState } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_HABITS = 30;
const MAX_DAYS_STORED = 1500;

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const habitStateSchema = z.object({
  habits: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        name: z.string().min(1).max(60),
        emoji: z.string().max(8),
      }),
    )
    .max(MAX_HABITS),
  checks: z.record(dateKeySchema, z.array(z.string().max(40)).max(MAX_HABITS)),
  mood: z.record(dateKeySchema, z.number().int().min(1).max(5)),
  sleep: z.record(dateKeySchema, z.number().min(0).max(24)),
});

const habitsKey = (uid: string) => `habits:${uid}`;

export async function GET() {
  const session = await readSession();
  if (!isUnlocked(session)) return fail("Locked", 401);
  const saved = await getStore().get<HabitState>(habitsKey(session.uid));
  return ok(saved ?? EMPTY_STATE, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const blocked = await guardMutation(req, "habits");
  if (blocked) return blocked;

  const session = await readSession();
  if (!isUnlocked(session)) return fail("Locked", 401);

  const parsed = habitStateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid habit data", 400);
  if (Object.keys(parsed.data.checks).length > MAX_DAYS_STORED) {
    return fail("Too much history stored", 400);
  }

  await getStore().set(habitsKey(session.uid), parsed.data);
  return ok({ saved: true });
}
