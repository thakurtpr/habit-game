"use client";

import { useState, type FormEvent } from "react";
import type { Habit } from "@/lib/types";

const MAX_HABITS = 30;
const MAX_NAME_LENGTH = 60;
const DEFAULT_EMOJI = "⭐";

interface HabitEditorProps {
  readonly habits: readonly Habit[];
  readonly onChange: (habits: readonly Habit[]) => void;
}

export function HabitEditor({ habits, onChange }: HabitEditorProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);

  const add = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || habits.length >= MAX_HABITS) return;
    const habit: Habit = {
      id: crypto.randomUUID().slice(0, 8),
      name: trimmed,
      emoji: emoji.trim() || DEFAULT_EMOJI,
    };
    onChange([...habits, habit]);
    setName("");
  };

  const rename = (id: string, next: string) =>
    onChange(habits.map((h) => (h.id === id ? { ...h, name: next.slice(0, MAX_NAME_LENGTH) } : h)));

  const remove = (id: string) => onChange(habits.filter((h) => h.id !== id));

  return (
    <div className="editor">
      <ul>
        {habits.map((h) => (
          <li key={h.id}>
            <span aria-hidden="true">{h.emoji}</span>
            <input
              value={h.name}
              aria-label={`Rename ${h.name}`}
              onChange={(e) => rename(h.id, e.target.value)}
              onBlur={(e) => !e.target.value.trim() && rename(h.id, "Untitled")}
            />
            <button type="button" className="icon-btn" aria-label={`Delete ${h.name}`} onClick={() => remove(h.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="editor-add">
        <input
          className="emoji-input"
          value={emoji}
          maxLength={4}
          aria-label="Emoji"
          onChange={(e) => setEmoji(e.target.value)}
        />
        <input
          value={name}
          placeholder="New habit"
          maxLength={MAX_NAME_LENGTH}
          aria-label="New habit name"
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn small" type="submit" disabled={!name.trim() || habits.length >= MAX_HABITS}>
          Add
        </button>
      </form>
    </div>
  );
}
