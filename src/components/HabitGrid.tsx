import { dateKey, daysInMonth } from "@/lib/stats";
import type { DateKey, HabitState } from "@/lib/types";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MOODS = ["😞", "😕", "😐", "🙂", "😄"] as const;
const DAYS_PER_WEEK = 7;

interface HabitGridProps {
  readonly state: HabitState;
  readonly year: number;
  readonly month: number;
  readonly todayKey: DateKey;
  readonly onToggle: (key: DateKey, habitId: string) => void;
  readonly onMood: (key: DateKey, mood: number | null) => void;
  readonly onSleep: (key: DateKey, hours: number | null) => void;
}

export function HabitGrid({
  state,
  year,
  month,
  todayKey,
  onToggle,
  onMood,
  onSleep,
}: HabitGridProps) {
  const total = daysInMonth(year, month);
  const days = Array.from({ length: total }, (_, i) => i + 1);
  const weeks = Array.from({ length: Math.ceil(total / DAYS_PER_WEEK) }, (_, w) => ({
    week: w + 1,
    span: Math.min(DAYS_PER_WEEK, total - w * DAYS_PER_WEEK),
  }));
  const weekday = (day: number) => WEEKDAYS[new Date(Date.UTC(year, month, day)).getUTCDay()];

  return (
    <div className="grid-scroll">
      <table className="habit-grid">
        <thead>
          <tr>
            <th rowSpan={3} className="habit-col">
              My habits
            </th>
            {weeks.map((w) => (
              <th key={w.week} colSpan={w.span} className="week-head">
                Week {w.week}
              </th>
            ))}
          </tr>
          <tr>
            {days.map((d) => (
              <th key={d} className={dateKey(year, month, d) === todayKey ? "today" : undefined}>
                {weekday(d)}
              </th>
            ))}
          </tr>
          <tr>
            {days.map((d) => (
              <th key={d} className={dateKey(year, month, d) === todayKey ? "today" : undefined}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.habits.map((habit) => (
            <tr key={habit.id}>
              <th scope="row" className="habit-col">
                <span aria-hidden="true">{habit.emoji}</span> {habit.name}
              </th>
              {days.map((d) => {
                const key = dateKey(year, month, d);
                const checked = (state.checks[key] ?? []).includes(habit.id);
                return (
                  <td key={d} className={key === todayKey ? "today" : undefined}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={`${habit.name} on ${key}`}
                      className={checked ? "check on" : "check"}
                      onClick={() => onToggle(key, habit.id)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="section-row">
            <th className="habit-col">Mood</th>
            {days.map((d) => {
              const key = dateKey(year, month, d);
              return (
                <td key={d}>
                  <select
                    className="mini-select"
                    aria-label={`Mood on ${key}`}
                    value={state.mood[key] ?? ""}
                    onChange={(e) => onMood(key, e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">·</option>
                    {MOODS.map((emoji, i) => (
                      <option key={emoji} value={i + 1}>
                        {emoji}
                      </option>
                    ))}
                  </select>
                </td>
              );
            })}
          </tr>
          <tr>
            <th className="habit-col">Hours of sleep</th>
            {days.map((d) => {
              const key = dateKey(year, month, d);
              return (
                <td key={d}>
                  <input
                    className="mini-input"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={24}
                    step={0.5}
                    aria-label={`Hours of sleep on ${key}`}
                    value={state.sleep[key] ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const n = Number(raw);
                      onSleep(key, raw === "" || Number.isNaN(n) ? null : Math.min(24, Math.max(0, n)));
                    }}
                  />
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
