import { cookies } from "next/headers";
import { CHALLENGE_TTL_SECONDS, IS_PROD } from "./env";

const CHALLENGE_COOKIE = "hg_ch";

export async function setChallengeCookie(id: string): Promise<void> {
  (await cookies()).set(CHALLENGE_COOKIE, id, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

export async function readChallengeCookie(): Promise<string | null> {
  return (await cookies()).get(CHALLENGE_COOKIE)?.value ?? null;
}

export async function clearChallengeCookie(): Promise<void> {
  (await cookies()).delete({ name: CHALLENGE_COOKIE, path: "/api/auth" });
}

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Buffer.from(value, "base64url"));
}
