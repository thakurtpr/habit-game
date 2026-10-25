export interface Habit {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
}

/** ISO date string, e.g. "2026-10-25". */
export type DateKey = string;

export interface HabitState {
  readonly habits: readonly Habit[];
  /** Date -> ids of habits completed that day. */
  readonly checks: Readonly<Record<DateKey, readonly string[]>>;
  /** Date -> mood 1 (low) .. 5 (great). */
  readonly mood: Readonly<Record<DateKey, number>>;
  /** Date -> hours slept. */
  readonly sleep: Readonly<Record<DateKey, number>>;
}

export const DEFAULT_HABITS: readonly Habit[] = [
  { id: "wake", name: "Wake up at 6AM", emoji: "⏰" },
  { id: "water", name: "Drink 3L water", emoji: "💧" },
  { id: "read", name: "Read 20 pages", emoji: "📖" },
  { id: "workout", name: "Workout", emoji: "🏋️" },
  { id: "code", name: "Deep work 2h", emoji: "💻" },
  { id: "meditate", name: "Meditate", emoji: "🧘" },
  { id: "nosugar", name: "No sugar", emoji: "🚫" },
  { id: "sleep", name: "Sleep before 11PM", emoji: "😴" },
];

export const EMPTY_STATE: HabitState = {
  habits: DEFAULT_HABITS,
  checks: {},
  mood: {},
  sleep: {},
};
