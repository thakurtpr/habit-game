import type { AuthenticatorTransport } from "@simplewebauthn/server";
import { getStore } from "./store";
import { CHALLENGE_TTL_SECONDS } from "./env";

export interface StoredCredential {
  readonly id: string;
  /** base64url-encoded COSE public key. */
  readonly publicKey: string;
  readonly counter: number;
  readonly transports?: readonly AuthenticatorTransport[];
}

export interface User {
  readonly id: string;
  readonly createdAt: number;
  readonly credentials: readonly StoredCredential[];
}

export interface PendingChallenge {
  readonly challenge: string;
  /** Only set for sign-up: the id the new user will get. */
  readonly userId?: string;
  /** Only set for unlock: the session user the ceremony must match. */
  readonly expectedUserId?: string;
}

const userKey = (id: string) => `user:${id}`;
const credKey = (id: string) => `cred:${id}`;
const challengeKey = (id: string) => `challenge:${id}`;

export async function findUser(id: string): Promise<User | null> {
  return getStore().get<User>(userKey(id));
}

export async function findUserByCredential(credentialId: string): Promise<User | null> {
  const userId = await getStore().get<string>(credKey(credentialId));
  return userId ? findUser(userId) : null;
}

export async function createUser(user: User): Promise<void> {
  const store = getStore();
  await store.set(userKey(user.id), user);
  await Promise.all(user.credentials.map((c) => store.set(credKey(c.id), user.id)));
}

export async function updateCredentialCounter(
  user: User,
  credentialId: string,
  counter: number,
): Promise<void> {
  const updated: User = {
    ...user,
    credentials: user.credentials.map((c) => (c.id === credentialId ? { ...c, counter } : c)),
  };
  await getStore().set(userKey(user.id), updated);
}

export async function saveChallenge(id: string, pending: PendingChallenge): Promise<void> {
  await getStore().set(challengeKey(id), pending, CHALLENGE_TTL_SECONDS);
}

export async function takeChallenge(id: string): Promise<PendingChallenge | null> {
  return getStore().take<PendingChallenge>(challengeKey(id));
}
