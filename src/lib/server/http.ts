import { NextResponse } from "next/server";
import { getStore } from "./store";

export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(error: string, status: number): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error }, { status });
}

/** Mutating requests must come from this site (defence in depth on top of SameSite=Strict). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const AUTH_LIMIT = 20;
const AUTH_WINDOW_SECONDS = 60;

export async function isRateLimited(req: Request, bucket: string): Promise<boolean> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const count = await getStore().hit(`rl:${bucket}:${ip}`, AUTH_WINDOW_SECONDS);
  return count > AUTH_LIMIT;
}

const MAX_FACE_FAILURES = 8;
const FAILURE_WINDOW_SECONDS = 10 * 60;

const clientIp = (req: Request): string =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";

/** Repeated failed face scans from one address are blocked for a while. */
export async function hasTooManyFailures(req: Request): Promise<boolean> {
  return (await getStore().count(`face-fail:${clientIp(req)}`)) >= MAX_FACE_FAILURES;
}

export async function recordFailure(req: Request): Promise<void> {
  await getStore().hit(`face-fail:${clientIp(req)}`, FAILURE_WINDOW_SECONDS);
}

/** Common gate for POST/PUT routes: same-origin + rate limit. Returns an error response or null. */
export async function guardMutation(
  req: Request,
  bucket: string,
): Promise<NextResponse<ApiResponse<never>> | null> {
  if (!isSameOrigin(req)) return fail("Cross-origin request blocked", 403);
  if (await isRateLimited(req, bucket)) return fail("Too many attempts, slow down", 429);
  return null;
}
