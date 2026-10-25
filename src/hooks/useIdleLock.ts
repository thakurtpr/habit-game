import { useEffect, useRef } from "react";

/** No mouse, key, touch or scroll for this long locks the app. */
export const IDLE_LOCK_MS = 2 * 60 * 1000;
/** A hidden / background tab locks the app after this long. */
export const HIDDEN_LOCK_MS = 10 * 1000;

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;

/**
 * Calls `onLock` once the user has been idle, or the tab has been in the
 * background, for long enough. Timers can be throttled in background tabs, so
 * the hidden duration is also checked when the tab becomes visible again.
 */
export function useIdleLock(enabled: boolean, onLock: () => void): void {
  const onLockRef = useRef(onLock);
  useEffect(() => {
    onLockRef.current = onLock;
  }, [onLock]);

  useEffect(() => {
    if (!enabled) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
    let hiddenAt: number | null = null;

    const fire = () => onLockRef.current();
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(fire, IDLE_LOCK_MS);
    };

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        hiddenTimer = setTimeout(fire, HIDDEN_LOCK_MS);
        return;
      }
      clearTimeout(hiddenTimer);
      const wasHiddenFor = hiddenAt === null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      if (wasHiddenFor >= HIDDEN_LOCK_MS) fire();
      else resetIdle();
    };

    resetIdle();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(idleTimer);
      clearTimeout(hiddenTimer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetIdle));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);
}
