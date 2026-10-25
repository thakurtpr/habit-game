import type { Descriptor, FaceCandidate } from "../faceMath";
import { getStore } from "./store";

export interface User {
  readonly id: string;
  readonly createdAt: number;
}

const FACES_KEY = "faces:index";
const userKey = (id: string) => `user:${id}`;

export async function findUser(id: string): Promise<User | null> {
  return getStore().get<User>(userKey(id));
}

/** Every enrolled face. Fine for a personal app; move to per-user keys if this grows. */
export async function listFaces(): Promise<readonly FaceCandidate[]> {
  return (await getStore().get<FaceCandidate[]>(FACES_KEY)) ?? [];
}

export async function createUser(user: User, face: Descriptor): Promise<void> {
  const store = getStore();
  const faces = await listFaces();
  await store.set(userKey(user.id), user);
  await store.set(FACES_KEY, [...faces, { id: user.id, descriptor: [...face] }]);
}
