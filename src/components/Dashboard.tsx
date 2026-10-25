"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, loadHabits, saveHabits } from "@/lib/api";
import {
  currentStreak,
  dailyProgress,
  dateKey,
  levelFromXp,
  monthSummary,
  toggleCheck,
  topHabits,
  totalXp,
  weeklyProgress,
} from "@/lib/stats";
import type { DateKey, Habit, HabitState } from "@/lib/types";
import { useIdleLock } from "@/hooks/useIdleLock";
import { BarChart, Donut, LineChart } from "./Charts";
import { HabitEditor } from "./HabitEditor";
import { HabitGrid } from "./HabitGrid";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type SaveStatus = "saved" | "saving" | "error";

interface DashboardProps {
  readonly onLock: () => void;
  readonly onLogout: () => void;
}

function withEntry<T>(
  record: Readonly<Record<DateKey, T>>,
  key: DateKey,
  value: T | null,
): Readonly<Record<DateKey, T>> {
  const { [key]: _removed, ...rest } = record;
  return value === null ? rest : { ...rest, [key]: value };
}

function keyFor(date: Date): DateKey {
  return dateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function Dashboard({ onLock, onLogout }: DashboardProps) {
  const today = useMemo(() => new Date(), []);
  const todayKey = keyFor(today);
  const yesterdayKey = keyFor(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));

  const [state, setState] = useState<HabitState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const stateRef = useRef<HabitState | null>(null);
  const saveChain = useRef<Promise<unknown>>(Promise.resolve());

  const handleApiError = useCallback(
    (error: unknown): boolean => {
      if (error instanceof ApiError && error.status === 401) {
        onLock();
        return true;
      }
      return false;
    },
    [onLock],
  );

  useEffect(() => {
    let cancelled = false;
    loadHabits()
      .then((loaded) => {
        if (cancelled) return;
        stateRef.current = loaded;
        setState(loaded);
      })
      .catch((error: unknown) => {
        if (cancelled || handleApiError(error)) return;
        setLoadError("Could not load your habits. Please refresh.");
      });
    return () => {
      cancelled = true;
    };
  }, [handleApiError]);

  const commit = useCallback(
    (update: (current: HabitState) => HabitState) => {
      const current = stateRef.current;
      if (!current) return;
      const next = update(current);
      stateRef.current = next;
      setState(next);
      setSaveStatus("saving");
      saveChain.current = saveChain.current
        .then(() => saveHabits(next))
        .then(() => setSaveStatus("saved"))
        .catch((error: unknown) => {
          if (!handleApiError(error)) setSaveStatus("error");
        });
    },
    [handleApiError],
  );

  const lockAfterSaving = useCallback(async () => {
    await saveChain.current;
    onLock();
  }, [onLock]);

  useIdleLock(true, lockAfterSaving);

  const derived = useMemo(() => {
    if (!state) return null;
    const daily = dailyProgress(state, year, month);
    const xp = totalXp(state);
    const streak = Math.max(
      0,
      ...state.habits.map((h) =>
        Math.max(currentStreak(state, h.id, todayKey), currentStreak(state, h.id, yesterdayKey)),
      ),
    );
    return {
      daily,
      weekly: weeklyProgress(state, year, month),
      summary: monthSummary(state, year, month),
      top: topHabits(state, year, month),
      level: levelFromXp(xp),
      xp,
      streak,
    };
  }, [state, year, month, todayKey, yesterdayKey]);

  if (loadError) {
    return (
      <main className="center-screen">
        <p className="notice error" role="alert">
          {loadError}
        </p>
      </main>
    );
  }
  if (!state || !derived) return <main className="center-screen" aria-busy="true" />;

  const { daily, weekly, summary, top, level, xp, streak } = derived;
  const dayLabels = daily.map((d) => String(d.day));

  return (
    <main className="sheet">
      <header className="topbar">
        <div className="title">
          HABIT TRACKER <span className="muted">· {MONTHS[month]} {year}</span>
        </div>
        <div className="game-chip" title={`${xp} XP total`}>
          <strong>LVL {level.level}</strong>
          <progress value={level.intoLevel} max={level.needed} aria-label="XP to next level" />
          <span>🔥 {streak}d</span>
        </div>
        <div className="actions">
          <span className={`save save-${saveStatus}`} role="status">
            {saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Not saved" : "Saved"}
          </span>
          <button className="btn small" onClick={lockAfterSaving}>
            Lock
          </button>
          <button className="btn small" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="overview">
        <div className="panel">
          <h2>Daily progress</h2>
          <BarChart values={daily.map((d) => d.pct)} labels={dayLabels} ariaLabel="Daily progress" />
        </div>
        <div className="panel">
          <h2>Weekly progress</h2>
          <BarChart
            values={weekly.map((w) => w.pct)}
            labels={weekly.map((w) => `W${w.week}`)}
            ariaLabel="Weekly progress"
            step={34}
          />
        </div>
        <div className="panel stats">
          <h2>Overall stats</h2>
          <Donut pct={summary.pct} />
          <dl>
            <div>
              <dt>Goal</dt>
              <dd>{summary.goal}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{summary.completed}</dd>
            </div>
            <div>
              <dt>Left</dt>
              <dd>{summary.left}</dd>
            </div>
          </dl>
        </div>
      </section>

      <HabitGrid
        state={state}
        year={year}
        month={month}
        todayKey={todayKey}
        onToggle={(key, habitId) => commit((s) => toggleCheck(s, key, habitId))}
        onMood={(key, mood) => commit((s) => ({ ...s, mood: withEntry(s.mood, key, mood) }))}
        onSleep={(key, hours) => commit((s) => ({ ...s, sleep: withEntry(s.sleep, key, hours) }))}
      />

      <section className="overview lower">
        <div className="panel">
          <h2>Overall wellness</h2>
          <LineChart
            labels={dayLabels}
            ariaLabel="Mood and hours of sleep"
            series={[
              {
                name: "Mood",
                color: "#16a34a",
                max: 5,
                values: daily.map((d) => state.mood[dateKey(year, month, d.day)] ?? null),
              },
              {
                name: "Hours of sleep",
                color: "#111111",
                max: 12,
                values: daily.map((d) => state.sleep[dateKey(year, month, d.day)] ?? null),
              },
            ]}
          />
          <p className="legend">
            <span className="dot green" /> Mood <span className="dot black" /> Hours of sleep
          </p>
        </div>
        <div className="panel">
          <h2>Top habits</h2>
          <ol className="top-list">
            {top.map(({ habit, count, pct }) => (
              <li key={habit.id}>
                <span>
                  {habit.emoji} {habit.name}
                </span>
                <progress value={pct} max={100} aria-label={`${habit.name} completion`} />
                <span className="count">{count}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="panel">
          <h2>My habits</h2>
          <HabitEditor
            habits={state.habits}
            onChange={(habits: readonly Habit[]) => commit((s) => ({ ...s, habits }))}
          />
        </div>
      </section>

      <nav className="month-tabs" aria-label="Month">
        <button className="tab-year" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
          ‹
        </button>
        <span className="tab-year-label">{year}</span>
        <button className="tab-year" onClick={() => setYear((y) => y + 1)} aria-label="Next year">
          ›
        </button>
        {MONTHS.map((name, i) => (
          <button
            key={name}
            className={i === month ? "tab active" : "tab"}
            aria-current={i === month ? "page" : undefined}
            onClick={() => setMonth(i)}
          >
            {name}
          </button>
        ))}
      </nav>
    </main>
  );
}
