export const DESCRIPTOR_LENGTH = 128;
/** A login attempt must be at least this close (euclidean) to the enrolled face. */
export const MATCH_THRESHOLD = 0.5;
/** Samples taken during one enrolment must agree with each other this well. */
export const ENROLL_CONSISTENCY_THRESHOLD = 0.45;
export const MIN_ENROLL_SAMPLES = 3;
export const MAX_ENROLL_SAMPLES = 8;

const MAX_ABS_VALUE = 10;

export type Descriptor = readonly number[];

export interface FaceCandidate {
  readonly id: string;
  readonly descriptor: Descriptor;
}

export interface FaceMatch {
  readonly id: string;
  readonly distance: number;
}

export function isDescriptor(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === DESCRIPTOR_LENGTH &&
    value.every((n) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= MAX_ABS_VALUE)
  );
}

export function distance(a: Descriptor, b: Descriptor): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function meanDescriptor(samples: readonly Descriptor[]): number[] {
  return Array.from(
    { length: DESCRIPTOR_LENGTH },
    (_, i) => samples.reduce((acc, s) => acc + s[i], 0) / samples.length,
  );
}

export function areConsistent(samples: readonly Descriptor[], threshold: number): boolean {
  const mean = meanDescriptor(samples);
  return samples.every((s) => distance(s, mean) <= threshold);
}

export function findBestMatch(
  candidates: readonly FaceCandidate[],
  probe: Descriptor,
  threshold: number,
): FaceMatch | null {
  let best: FaceMatch | null = null;
  for (const candidate of candidates) {
    const d = distance(candidate.descriptor, probe);
    if (d <= threshold && (best === null || d < best.distance)) {
      best = { id: candidate.id, distance: d };
    }
  }
  return best;
}
