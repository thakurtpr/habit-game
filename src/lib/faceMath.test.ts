import { describe, expect, test } from "vitest";
import {
  areConsistent,
  DESCRIPTOR_LENGTH,
  distance,
  findBestMatch,
  isDescriptor,
  meanDescriptor,
} from "./faceMath";

const make = (value: number, offset = 0): number[] =>
  Array.from({ length: DESCRIPTOR_LENGTH }, (_, i) => (i === 0 ? value + offset : value));

describe("isDescriptor", () => {
  test("accepts 128 finite numbers", () => {
    expect(isDescriptor(make(0.1))).toBe(true);
  });

  test("rejects wrong length, NaN, non-numbers and non-arrays", () => {
    expect(isDescriptor([1, 2, 3])).toBe(false);
    expect(isDescriptor(make(0.1).map((v, i) => (i === 5 ? Number.NaN : v)))).toBe(false);
    expect(isDescriptor(make(0.1).map((v, i) => (i === 5 ? "x" : v)))).toBe(false);
    expect(isDescriptor("nope")).toBe(false);
    expect(isDescriptor(null)).toBe(false);
  });

  test("rejects absurdly large values", () => {
    expect(isDescriptor(make(1e9))).toBe(false);
  });
});

describe("distance", () => {
  test("is zero for identical descriptors and euclidean otherwise", () => {
    expect(distance(make(0.2), make(0.2))).toBe(0);
    const a = make(0);
    const b = make(0, 0).map((v, i) => (i === 0 ? 3 : i === 1 ? 4 : v));
    expect(distance(a, b)).toBeCloseTo(5, 10);
  });
});

describe("meanDescriptor", () => {
  test("averages component-wise without mutating inputs", () => {
    const a = make(0);
    const b = make(2);
    const mean = meanDescriptor([a, b]);
    expect(mean[0]).toBe(1);
    expect(mean[1]).toBe(1);
    expect(a[0]).toBe(0);
  });
});

describe("areConsistent", () => {
  test("true when every sample is near the mean", () => {
    expect(areConsistent([make(0.1), make(0.1, 0.01), make(0.1, -0.01)], 0.45)).toBe(true);
  });

  test("false when one sample is far away", () => {
    expect(areConsistent([make(0.1), make(0.1), make(0.1, 5)], 0.45)).toBe(false);
  });
});

describe("findBestMatch", () => {
  const candidates = [
    { id: "alice", descriptor: make(0.1) },
    { id: "bob", descriptor: make(0.1, 0.9) },
  ];

  test("returns the closest candidate under the threshold", () => {
    const match = findBestMatch(candidates, make(0.1, 0.05), 0.5);
    expect(match?.id).toBe("alice");
    expect(match?.distance).toBeCloseTo(0.05, 10);
  });

  test("returns null when nobody is close enough", () => {
    expect(findBestMatch(candidates, make(0.1, 3), 0.5)).toBeNull();
  });

  test("returns null for an empty candidate list", () => {
    expect(findBestMatch([], make(0.1), 0.5)).toBeNull();
  });
});
