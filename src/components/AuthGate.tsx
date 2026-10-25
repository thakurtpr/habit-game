"use client";

import { useCallback, useEffect, useState } from "react";
import {
  canUseCamera,
  describeAuthError,
  enrollFace,
  getSession,
  lockSession,
  matchFace,
  signOut,
  type SessionStatus,
} from "@/lib/api";
import { AuthScreen } from "./AuthScreen";
import { Dashboard } from "./Dashboard";
import { FaceScanner, type ScanMode } from "./FaceScanner";
import { LockScreen } from "./LockScreen";

type GateStatus = SessionStatus | "loading";
type ScanPurpose = "signup" | "signin" | "unlock";

const MODE_BY_PURPOSE: Record<ScanPurpose, ScanMode> = {
  signup: "enroll",
  signin: "verify",
  unlock: "verify",
};

/**
 * Nothing but this gate is rendered until a face scan succeeds. Every fresh
 * page load starts locked, even if the cookie from an earlier visit is valid.
 */
export function AuthGate() {
  const [status, setStatus] = useState<GateStatus>("loading");
  const [signupAllowed, setSignupAllowed] = useState(true);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [scan, setScan] = useState<ScanPurpose | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCameraSupported(canUseCamera());
    (async () => {
      try {
        const info = await getSession();
        if (cancelled) return;
        setSignupAllowed(info.signupAllowed);
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

  const lock = useCallback(() => {
    setStatus("locked");
    lockSession().catch(() => undefined);
  }, []);

  const logout = useCallback(async () => {
    setStatus("signed-out");
    await signOut().catch(() => undefined);
  }, []);

  const handleCapture = useCallback(
    (samples: number[][]) => (scan === "signup" ? enrollFace(samples) : matchFace(samples)),
    [scan],
  );

  const finishScan = useCallback(() => {
    setScan(null);
    setStatus("unlocked");
  }, []);

  if (status === "loading") return <main className="center-screen" aria-busy="true" />;

  if (status === "unlocked") return <Dashboard onLock={lock} onLogout={logout} />;

  const scanner = scan && (
    <FaceScanner
      key={scan}
      mode={MODE_BY_PURPOSE[scan]}
      onCapture={handleCapture}
      onSuccess={finishScan}
      onCancel={() => setScan(null)}
    />
  );

  if (status === "locked") {
    return (
      <>
        <LockScreen onUnlock={() => setScan("unlock")} onUseAnotherAccount={logout} />
        {scanner}
      </>
    );
  }

  return (
    <>
      <AuthScreen
        error={error}
        cameraSupported={cameraSupported}
        signupAllowed={signupAllowed}
        onSignIn={() => setScan("signin")}
        onSignUp={() => setScan("signup")}
      />
      {scanner}
    </>
  );
}
