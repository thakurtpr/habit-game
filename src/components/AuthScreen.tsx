interface AuthScreenProps {
  readonly busy: boolean;
  readonly error: string | null;
  readonly faceSupported: boolean;
  readonly signupAllowed: boolean;
  readonly onSignIn: () => void;
  readonly onSignUp: () => void;
}

export function AuthScreen({
  busy,
  error,
  faceSupported,
  signupAllowed,
  onSignIn,
  onSignUp,
}: AuthScreenProps) {
  return (
    <main className="center-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="logo" aria-hidden="true">
          HABIT
          <br />
          GAME
        </div>
        <h1 id="auth-title">Face sign-in</h1>
        <p className="muted">
          No username, no password. Your device checks your face (Face ID, Touch ID or Windows
          Hello) and this site only receives a signed yes.
        </p>

        {!faceSupported && (
          <p className="notice" role="alert">
            This device has no face or fingerprint unlock set up. Turn one on in your system
            settings, or open the site on your phone.
          </p>
        )}

        <button className="btn primary" onClick={onSignIn} disabled={busy || !faceSupported}>
          {busy ? "Waiting for your face…" : "Sign in with face"}
        </button>
        {signupAllowed ? (
          <button className="btn" onClick={onSignUp} disabled={busy || !faceSupported}>
            Sign up with face
          </button>
        ) : (
          <p className="muted small">Sign-up is closed on this site.</p>
        )}

        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
