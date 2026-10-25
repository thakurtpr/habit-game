interface LockScreenProps {
  readonly onUnlock: () => void;
  readonly onUseAnotherAccount: () => void;
}

export function LockScreen({ onUnlock, onUseAnotherAccount }: LockScreenProps) {
  return (
    <main className="center-screen">
      <section className="auth-card" aria-labelledby="lock-title">
        <div className="lock-icon" aria-hidden="true">
          🔒
        </div>
        <h1 id="lock-title">Locked</h1>
        <p className="muted">
          Scan your face to continue. Only the face that signed in here can unlock this session.
        </p>

        <button className="btn primary" onClick={onUnlock} autoFocus>
          Unlock with face
        </button>
        <button className="btn link" onClick={onUseAnotherAccount}>
          Not you? Sign out
        </button>
      </section>
    </main>
  );
}
