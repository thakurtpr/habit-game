import { meanDescriptor } from "./faceMath";
import type { HabitState } from "./types";

export type SessionStatus = "signed-out" | "locked" | "unlocked";

export interface SessionInfo {
  readonly status: SessionStatus;
  readonly signupAllowed: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Envelope<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
  });
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || !body?.success || body.data === undefined) {
    throw new ApiError(body?.error ?? "Request failed", response.status);
  }
  return body.data;
}

const post = <T>(path: string, payload: unknown = {}, keepalive = false): Promise<T> =>
  call<T>(path, { method: "POST", body: JSON.stringify(payload), keepalive });

export const getSession = (): Promise<SessionInfo> => call<SessionInfo>("/api/session");

/** Face scanning needs a camera and a secure origin (https or localhost). */
export function canUseCamera(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

export async function enrollFace(samples: readonly number[][]): Promise<void> {
  await post("/api/auth/register", { samples });
}

/** Used for both first sign-in and unlocking a locked session. */
export async function matchFace(samples: readonly number[][]): Promise<void> {
  await post("/api/auth/login", { descriptor: meanDescriptor(samples) });
}

export const lockSession = (): Promise<unknown> => post("/api/auth/lock", {}, true);
export const signOut = (): Promise<unknown> => post("/api/auth/logout");

export const loadHabits = (): Promise<HabitState> => call<HabitState>("/api/habits");

export const saveHabits = (state: HabitState): Promise<unknown> =>
  call("/api/habits", { method: "PUT", body: JSON.stringify(state), keepalive: true });

export function describeAuthError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}
