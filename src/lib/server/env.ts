const DEV_SECRET = "dev-only-secret-change-me-dev-only-secret-change-me";

export const IS_PROD = process.env.NODE_ENV === "production";

/** A face check stays valid server-side for at most this long. */
export const MAX_UNLOCK_SECONDS = 8 * 60 * 60;
/** The session cookie itself lives this long; after it, a fresh sign-in is needed. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export function sessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET ?? (IS_PROD ? "" : DEV_SECRET);
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

/** Set ALLOW_SIGNUP=false once you have registered, so nobody else can enrol. */
export function isSignupAllowed(): boolean {
  return process.env.ALLOW_SIGNUP !== "false";
}
