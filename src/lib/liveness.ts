export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface PoseSample {
  /** Eye aspect ratio averaged over both eyes. */
  readonly ear: number;
  /** Nose position between the jaw ends: 0.5 is facing the camera. */
  readonly yaw: number;
}

/** An eye counts as closed once it drops to this share of the person's own open eye. */
const BLINK_CLOSE_RATIO = 0.75;
const BLINK_REOPEN_RATIO = 0.9;
/** Below this the "open" baseline is too small to be a real open eye. */
const MIN_OPEN_EAR = 0.15;
const YAW_FRONTAL = 0.1;
/** Change in nose position, relative to the resting pose, that counts as a turn. */
const YAW_TURN_DELTA = 0.12;

const LEFT_EYE_START = 36;
const RIGHT_EYE_START = 42;
const EYE_POINTS = 6;
const JAW_LEFT = 0;
const JAW_RIGHT = 16;
const NOSE_TIP = 30;

const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Eye aspect ratio from the six eye landmarks (p1..p6). */
export function eyeAspectRatio(eye: readonly Point[]): number {
  const horizontal = dist(eye[0], eye[3]);
  if (horizontal === 0) return 0;
  return (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2 * horizontal);
}

export function averageEar(landmarks: readonly Point[]): number {
  const left = landmarks.slice(LEFT_EYE_START, LEFT_EYE_START + EYE_POINTS);
  const right = landmarks.slice(RIGHT_EYE_START, RIGHT_EYE_START + EYE_POINTS);
  return (eyeAspectRatio(left) + eyeAspectRatio(right)) / 2;
}

export function yawRatio(landmarks: readonly Point[]): number {
  const left = landmarks[JAW_LEFT].x;
  const width = landmarks[JAW_RIGHT].x - left;
  if (width === 0) return 0.5;
  return (landmarks[NOSE_TIP].x - left) / width;
}

/** Open eyes, then a clear dip against the person's own baseline, then open again. */
function blinked(samples: readonly PoseSample[]): boolean {
  let baseline = 0;
  let closedSeen = false;
  for (const { ear } of samples) {
    if (!closedSeen) {
      if (baseline >= MIN_OPEN_EAR && ear <= baseline * BLINK_CLOSE_RATIO) closedSeen = true;
      else baseline = Math.max(baseline, ear);
    } else if (ear >= baseline * BLINK_REOPEN_RATIO) {
      return true;
    }
  }
  return false;
}

/** A roughly frontal start, then the nose moves clearly to either side of that pose. */
function turned(samples: readonly PoseSample[]): boolean {
  const start = samples.findIndex((s) => Math.abs(s.yaw - 0.5) <= YAW_FRONTAL);
  if (start < 0) return false;
  const resting = samples[start].yaw;
  return samples.some((s, i) => i > start && Math.abs(s.yaw - resting) >= YAW_TURN_DELTA);
}

/** Live when the person blinked or turned their head, whichever comes first. */
export function isLive(samples: readonly PoseSample[]): boolean {
  return blinked(samples) || turned(samples);
}
