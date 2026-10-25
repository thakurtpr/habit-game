import { describe, expect, test } from "vitest";
import {
  averageEar,
  eyeAspectRatio,
  isLive,
  yawRatio,
  type Point,
  type PoseSample,
} from "./liveness";

const OPEN_EYE: Point[] = [
  { x: 0, y: 5 },
  { x: 3, y: 2 },
  { x: 7, y: 2 },
  { x: 10, y: 5 },
  { x: 7, y: 8 },
  { x: 3, y: 8 },
];

const CLOSED_EYE: Point[] = OPEN_EYE.map((p) => ({ x: p.x, y: 5 + (p.y - 5) * 0.1 }));

function landmarks(eye: Point[], noseX: number): Point[] {
  const points: Point[] = Array.from({ length: 68 }, () => ({ x: 0, y: 0 }));
  points[0] = { x: 0, y: 0 };
  points[16] = { x: 100, y: 0 };
  points[30] = { x: noseX, y: 0 };
  eye.forEach((p, i) => {
    points[36 + i] = p;
    points[42 + i] = p;
  });
  return points;
}

const sample = (ear: number, yaw = 0.5): PoseSample => ({ ear, yaw });

describe("eyeAspectRatio", () => {
  test("is high for an open eye and near zero for a closed eye", () => {
    expect(eyeAspectRatio(OPEN_EYE)).toBeGreaterThan(0.5);
    expect(eyeAspectRatio(CLOSED_EYE)).toBeLessThan(0.1);
  });
});

describe("averageEar / yawRatio", () => {
  test("averages both eyes", () => {
    expect(averageEar(landmarks(OPEN_EYE, 50))).toBeCloseTo(eyeAspectRatio(OPEN_EYE), 10);
  });

  test("yaw is 0.5 when the nose is centred and shifts when turned", () => {
    expect(yawRatio(landmarks(OPEN_EYE, 50))).toBeCloseTo(0.5, 10);
    expect(yawRatio(landmarks(OPEN_EYE, 25))).toBeCloseTo(0.25, 10);
  });
});

describe("isLive (blink)", () => {
  test("needs open, then closed, then open again", () => {
    expect(isLive([sample(0.3), sample(0.1), sample(0.3)])).toBe(true);
  });

  test("a face that never closes its eyes fails", () => {
    expect(isLive([sample(0.3), sample(0.31), sample(0.29)])).toBe(false);
  });

  test("eyes that start closed and only open do not count", () => {
    expect(isLive([sample(0.1), sample(0.3), sample(0.3)])).toBe(false);
  });

  test("adapts to a smaller natural eye opening by using the person's own baseline", () => {
    expect(isLive([sample(0.22), sample(0.22), sample(0.15), sample(0.22)])).toBe(true);
  });

  test("ignores normal measurement jitter", () => {
    expect(isLive([sample(0.3), sample(0.28), sample(0.31), sample(0.29)])).toBe(false);
  });

  test("needs the eyes to open again afterwards", () => {
    expect(isLive([sample(0.3), sample(0.1), sample(0.1)])).toBe(false);
  });
});

describe("isLive (head turn)", () => {
  test("needs a frontal pose followed by a clear turn to either side", () => {
    expect(isLive([sample(0.3, 0.5), sample(0.3, 0.3)])).toBe(true);
    expect(isLive([sample(0.3, 0.5), sample(0.3, 0.7)])).toBe(true);
  });

  test("a still face fails", () => {
    expect(isLive([sample(0.3, 0.5), sample(0.3, 0.52)])).toBe(false);
  });

  test("starting already turned does not count", () => {
    expect(isLive([sample(0.3, 0.3), sample(0.3, 0.25)])).toBe(false);
  });

  test("measures the turn from the person's own resting pose", () => {
    expect(isLive([sample(0.3, 0.45), sample(0.3, 0.58)])).toBe(true);
    expect(isLive([sample(0.3, 0.45), sample(0.3, 0.5)])).toBe(false);
  });
});

describe("isLive (either gesture)", () => {
  test("no samples is not live", () => {
    expect(isLive([])).toBe(false);
  });
});
