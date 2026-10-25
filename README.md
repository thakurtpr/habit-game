# Habit Game

A spreadsheet-style habit tracker with a game layer (XP, levels, streaks) that you unlock with your face.
There are no usernames, passwords, fingerprints or device PINs. The browser asks for camera access,
scans your face with an on-screen animation, and only lets you in if it matches the face enrolled at sign-up.

## How the face lock works

1. **Camera:** the browser asks for camera access. Video never leaves your device.
2. **Liveness:** you are asked to blink or turn your head, picked at random, so a still photo is not enough.
3. **Scan:** a few frames are turned into a 128-number face template on your device (TensorFlow.js + face-api models served from `/public/models`).
4. **Match:** only the template is sent to the server, which compares it to the enrolled one.

- Sign-up needs 3 or more consistent frames, and refuses a face that is already enrolled.
- Every fresh page load starts locked, even if you signed in earlier.
- The app locks again after 2 minutes without activity, or 10 seconds in a background tab. Locking removes
  the data from the page and marks the server session as locked, so the API refuses data until the next scan.
- Unlocking only accepts the signed-in user's face.
- Repeated failed scans from one address are blocked for 10 minutes.
- A scan is valid server-side for at most 8 hours.
- The camera needs a secure origin: `https://` or `http://localhost`.

## Security trade-offs (read this)

Camera face matching inside a web page is weaker than passkeys or a device-level biometric:

- The match is a template comparison. Anyone who obtains the stored template could send it to the API
  without a camera. Keep the Redis credentials secret.
- Blink / head-turn checks stop printed photos, but a good video replay or deepfake may pass.
- The template is biometric data. It is stored in your Redis database and never in the code or the repo.

Use it for a personal habit tracker, not for anything sensitive. Set `ALLOW_SIGNUP=false` after you register.

## Stack

Next.js (App Router) + TypeScript, `@vladmandic/face-api`, `jose` session cookies, Upstash Redis for storage,
Vitest, GitHub Actions CI.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional locally
npm run dev                  # http://localhost:3000
npm test
```

Without Redis credentials a dev-only in-memory store is used (data and your enrolled face reset on restart).

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. In Vercel, add the Upstash Redis integration (Marketplace) so `UPSTASH_REDIS_REST_URL` / `_TOKEN` (or `KV_REST_API_*`) are set.
3. Add `SESSION_SECRET` (32+ random characters).
4. Deploy, open the site, and sign up with your face.
5. Set `ALLOW_SIGNUP=false` and redeploy so nobody else can enrol.

## CI

`.github/workflows/ci.yml` runs type check, tests, build and a dependency audit on every push and pull request.
Vercel's Git integration handles deployment once CI is green.

## Credits

Face models and library: [@vladmandic/face-api](https://github.com/vladmandic/face-api) (MIT).
