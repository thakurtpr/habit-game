import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { IS_PROD, MAX_UNLOCK_SECONDS, SESSION_TTL_SECONDS, sessionSecret } from "./env";

const SESSION_COOKIE = "hg_session";

export interface Session {
  readonly uid: string;
  /** Epoch seconds of the last passkey check; 0 means locked. */
  readonly vat: number;
}

export type SessionStatus = "signed-out" | "locked" | "unlocked";

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export function isUnlocked(session: Session | null): session is Session {
  if (!session || session.vat <= 0) return false;
  return nowSeconds() - session.vat < MAX_UNLOCK_SECONDS;
}

export function statusOf(session: Session | null): SessionStatus {
  if (!session) return "signed-out";
  return isUnlocked(session) ? "unlocked" : "locked";
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ["HS256"] });
    if (typeof payload.uid !== "string" || typeof payload.vat !== "number") return null;
    return { uid: payload.uid, vat: payload.vat };
  } catch {
    return null;
  }
}

async function writeSession(session: Session): Promise<void> {
  const token = await new SignJWT({ uid: session.uid, vat: session.vat })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(sessionSecret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Called right after a successful passkey ceremony. */
export function startUnlockedSession(uid: string): Promise<void> {
  return writeSession({ uid, vat: nowSeconds() });
}

/** Keeps the identity but requires a new passkey check before data is served. */
export function lockSession(uid: string): Promise<void> {
  return writeSession({ uid, vat: 0 });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
