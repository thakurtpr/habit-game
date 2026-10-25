interface LockScreenProps {
  readonly busy: boolean;
  readonly error: string | null;
  readonly onUnlock: () => void;
  readonly onUseAnotherAccount: () => void;
}

export function LockScreen({ busy, error, onUnlock, onUseAnotherAccount }: LockScreenProps) {
  return (
    <main className="center-screen">
      <section className="auth-card" aria-labelledby="lock-title">
        <div className="lock-icon" aria-hidden="true">
          🔒
        </div>
        <h1 id="lock-title">Locked</h1>
        <p className="muted">
          Verify it&apos;s you. Only the face that signed in here can unlock this session.
        </p>

        <button className="btn primary" onClick={onUnlock} disabled={busy} autoFocus>
          {busy ? "Waiting for your face…" : "Unlock with face"}
        </button>
        <button className="btn link" onClick={onUseAnotherAccount} disabled={busy}>
          Not you? Sign out
        </button>

        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
