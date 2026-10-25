import { describe, expect, test } from "vitest";
import {
  currentStreak,
  dailyProgress,
  dateKey,
  daysInMonth,
  levelFromXp,
  monthSummary,
  toggleCheck,
  topHabits,
  weeklyProgress,
} from "./stats";
import type { HabitState } from "./types";

const habits = [
  { id: "a", name: "A", emoji: "🅰️" },
  { id: "b", name: "B", emoji: "🅱️" },
];

const base: HabitState = {
  habits,
  checks: {
    "2026-07-01": ["a", "b"],
    "2026-07-02": ["a"],
    "2026-07-03": ["a"],
    "2026-07-09": ["b"],
  },
  mood: {},
  sleep: {},
};

describe("daysInMonth", () => {
  test("handles 31-day, 30-day and leap February months", () => {
    expect(daysInMonth(2026, 6)).toBe(31);
    expect(daysInMonth(2026, 8)).toBe(30);
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2026, 1)).toBe(28);
  });
});

describe("dateKey", () => {
  test("zero-pads month and day (month is 0-based)", () => {
    expect(dateKey(2026, 6, 3)).toBe("2026-07-03");
  });
});

describe("dailyProgress", () => {
  test("returns one entry per day with percent of habits done", () => {
    const result = dailyProgress(base, 2026, 6);
    expect(result).toHaveLength(31);
    expect(result[0]).toMatchObject({ day: 1, done: 2, pct: 100 });
    expect(result[1]).toMatchObject({ day: 2, done: 1, pct: 50 });
    expect(result[3]).toMatchObject({ day: 4, done: 0, pct: 0 });
  });

  test("ignores checks for habits that no longer exist", () => {
    const state = { ...base, checks: { "2026-07-01": ["a", "ghost"] } };
    expect(dailyProgress(state, 2026, 6)[0].done).toBe(1);
  });

  test("returns 0% when there are no habits", () => {
    const state = { ...base, habits: [] };
    expect(dailyProgress(state, 2026, 6)[0].pct).toBe(0);
  });
});

describe("weeklyProgress", () => {
  test("groups days 1-7, 8-14, ... and averages their percent", () => {
    const weeks = weeklyProgress(base, 2026, 6);
    expect(weeks).toHaveLength(5);
    expect(weeks[0].week).toBe(1);
    // week 1: (100 + 50 + 50 + 0 + 0 + 0 + 0) / 7
    expect(weeks[0].pct).toBeCloseTo(200 / 7, 5);
    expect(weeks[4].pct).toBe(0);
  });
});

describe("monthSummary", () => {
  test("computes goal, completed, left and percent", () => {
    const s = monthSummary(base, 2026, 6);
    expect(s.goal).toBe(62);
    expect(s.completed).toBe(5);
    expect(s.left).toBe(57);
    expect(s.pct).toBeCloseTo((5 / 62) * 100, 5);
  });
});

describe("topHabits", () => {
  test("ranks habits by completions, highest first, max 10", () => {
    const top = topHabits(base, 2026, 6);
    expect(top.map((t) => t.habit.id)).toEqual(["a", "b"]);
    expect(top[0]).toMatchObject({ count: 3 });
    expect(top[1]).toMatchObject({ count: 2 });
  });
});

describe("currentStreak", () => {
  test("counts consecutive days ending at the given day", () => {
    expect(currentStreak(base, "a", "2026-07-03")).toBe(3);
    expect(currentStreak(base, "a", "2026-07-04")).toBe(0);
    expect(currentStreak(base, "b", "2026-07-02")).toBe(0);
  });

  test("counts across month boundaries", () => {
    const state = {
      ...base,
      checks: { "2026-06-30": ["a"], "2026-07-01": ["a"] },
    };
    expect(currentStreak(state, "a", "2026-07-01")).toBe(2);
  });
});

describe("levelFromXp", () => {
  test("starts at level 1 and grows with xp", () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, intoLevel: 0 });
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(250).level).toBe(3);
  });
});

describe("toggleCheck", () => {
  test("adds a check without mutating the original state", () => {
    const next = toggleCheck(base, "2026-07-04", "a");
    expect(next.checks["2026-07-04"]).toEqual(["a"]);
    expect(base.checks["2026-07-04"]).toBeUndefined();
  });

  test("removes an existing check and drops empty days", () => {
    const next = toggleCheck(base, "2026-07-09", "b");
    expect(next.checks["2026-07-09"]).toBeUndefined();
  });
});
