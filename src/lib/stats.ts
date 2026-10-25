import type { DateKey, Habit, HabitState } from "./types";

export const XP_PER_CHECK = 10;
const DAYS_PER_WEEK = 7;
const TOP_HABITS_LIMIT = 10;

export interface DayProgress {
  readonly day: number;
  readonly done: number;
  readonly pct: number;
}

export interface WeekProgress {
  readonly week: number;
  readonly pct: number;
}

export interface MonthSummary {
  readonly goal: number;
  readonly completed: number;
  readonly left: number;
  readonly pct: number;
}

export interface HabitRank {
  readonly habit: Habit;
  readonly count: number;
  readonly pct: number;
}

export interface LevelInfo {
  readonly level: number;
  readonly intoLevel: number;
  readonly needed: number;
}

/** `month` is 0-based, like `Date`. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function dateKey(year: number, month: number, day: number): DateKey {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function validIds(state: HabitState): ReadonlySet<string> {
  return new Set(state.habits.map((h) => h.id));
}

function doneOn(state: HabitState, key: DateKey, ids: ReadonlySet<string>): number {
  return (state.checks[key] ?? []).filter((id) => ids.has(id)).length;
}

export function dailyProgress(
  state: HabitState,
  year: number,
  month: number,
): readonly DayProgress[] {
  const ids = validIds(state);
  const total = ids.size;
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => {
    const day = i + 1;
    const done = doneOn(state, dateKey(year, month, day), ids);
    return { day, done, pct: total === 0 ? 0 : (done / total) * 100 };
  });
}

export function weeklyProgress(
  state: HabitState,
  year: number,
  month: number,
): readonly WeekProgress[] {
  const days = dailyProgress(state, year, month);
  const weekCount = Math.ceil(days.length / DAYS_PER_WEEK);
  return Array.from({ length: weekCount }, (_, w) => {
    const slice = days.slice(w * DAYS_PER_WEEK, (w + 1) * DAYS_PER_WEEK);
    const sum = slice.reduce((acc, d) => acc + d.pct, 0);
    return { week: w + 1, pct: sum / slice.length };
  });
}

export function monthSummary(state: HabitState, year: number, month: number): MonthSummary {
  const days = dailyProgress(state, year, month);
  const goal = state.habits.length * days.length;
  const completed = days.reduce((acc, d) => acc + d.done, 0);
  return {
    goal,
    completed,
    left: goal - completed,
    pct: goal === 0 ? 0 : (completed / goal) * 100,
  };
}

export function topHabits(
  state: HabitState,
  year: number,
  month: number,
): readonly HabitRank[] {
  const total = daysInMonth(year, month);
  return state.habits
    .map((habit) => {
      let count = 0;
      for (let day = 1; day <= total; day++) {
        if ((state.checks[dateKey(year, month, day)] ?? []).includes(habit.id)) count++;
      }
      return { habit, count, pct: (count / total) * 100 };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_HABITS_LIMIT);
}

function previousDay(key: DateKey): DateKey {
  const [y, m, d] = key.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  return dateKey(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate());
}

/** Consecutive completed days ending at (and including) `endKey`. */
export function currentStreak(state: HabitState, habitId: string, endKey: DateKey): number {
  let streak = 0;
  let key = endKey;
  while ((state.checks[key] ?? []).includes(habitId)) {
    streak++;
    key = previousDay(key);
  }
  return streak;
}

/** Total xp needed to reach `level`: 25 * (n - 1) * (n + 2) -> 0, 100, 250, 450... */
function xpForLevel(level: number): number {
  return 25 * (level - 1) * (level + 2);
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return {
    level,
    intoLevel: xp - xpForLevel(level),
    needed: xpForLevel(level + 1) - xpForLevel(level),
  };
}

export function totalXp(state: HabitState): number {
  const ids = validIds(state);
  const checks = Object.keys(state.checks).reduce(
    (acc, key) => acc + doneOn(state, key, ids),
    0,
  );
  return checks * XP_PER_CHECK;
}

export function toggleCheck(state: HabitState, key: DateKey, habitId: string): HabitState {
  const current = state.checks[key] ?? [];
  const next = current.includes(habitId)
    ? current.filter((id) => id !== habitId)
    : [...current, habitId];
  const { [key]: _removed, ...rest } = state.checks;
  return {
    ...state,
    checks: next.length === 0 ? rest : { ...rest, [key]: next },
  };
}
