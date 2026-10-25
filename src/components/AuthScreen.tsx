interface AuthScreenProps {
  readonly error: string | null;
  readonly cameraSupported: boolean;
  readonly signupAllowed: boolean;
  readonly onSignIn: () => void;
  readonly onSignUp: () => void;
}

export function AuthScreen({
  error,
  cameraSupported,
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
          No username, no password. Allow your camera, look at it, and blink or turn your head
          when asked. If your face matches, you&apos;re in.
        </p>

        {!cameraSupported && (
          <p className="notice" role="alert">
            Face scanning needs a camera and a secure address (https or localhost).
          </p>
        )}

        <button className="btn primary" onClick={onSignIn} disabled={!cameraSupported}>
          Sign in with face
        </button>
        {signupAllowed ? (
          <button className="btn" onClick={onSignUp} disabled={!cameraSupported}>
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
