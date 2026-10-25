"use client";

import { useCallback, useEffect, useState } from "react";
import {
  canUseFaceAuth,
  describeAuthError,
  getSession,
  lockSession,
  signInWithFace,
  signOut,
  signUpWithFace,
  type SessionStatus,
} from "@/lib/api";
import { AuthScreen } from "./AuthScreen";
import { Dashboard } from "./Dashboard";
import { LockScreen } from "./LockScreen";

type GateStatus = SessionStatus | "loading";

/**
 * Nothing but this gate is rendered until a face check succeeds. Every fresh
 * page load starts locked, even if the cookie from an earlier visit is valid.
 */
export function AuthGate() {
  const [status, setStatus] = useState<GateStatus>("loading");
  const [signupAllowed, setSignupAllowed] = useState(true);
  const [faceSupported, setFaceSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [info, supported] = await Promise.all([getSession(), canUseFaceAuth()]);
        if (cancelled) return;
        setSignupAllowed(info.signupAllowed);
        setFaceSupported(supported);
        if (info.status === "unlocked") {
          await lockSession();
          if (!cancelled) setStatus("locked");
          return;
        }
        setStatus(info.status);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(describeAuthError(e));
        setStatus("signed-out");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runFaceCheck = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setStatus("unlocked");
    } catch (e: unknown) {
      setError(describeAuthError(e));
    } finally {
      setBusy(false);
    }
  }, []);

  const lock = useCallback(() => {
    setStatus("locked");
    lockSession().catch(() => undefined);
  }, []);

  const logout = useCallback(async () => {
    setStatus("signed-out");
    await signOut().catch(() => undefined);
  }, []);

  if (status === "loading") return <main className="center-screen" aria-busy="true" />;

  if (status === "unlocked") return <Dashboard onLock={lock} onLogout={logout} />;

  if (status === "locked") {
    return (
      <LockScreen
        busy={busy}
        error={error}
        onUnlock={() => runFaceCheck(signInWithFace)}
        onUseAnotherAccount={logout}
      />
    );
  }

  return (
    <AuthScreen
      busy={busy}
      error={error}
      faceSupported={faceSupported}
      signupAllowed={signupAllowed}
      onSignIn={() => runFaceCheck(signInWithFace)}
      onSignUp={() => runFaceCheck(signUpWithFace)}
    />
  );
}
