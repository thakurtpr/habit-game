# Habit Game

A spreadsheet-style habit tracker with a game layer (XP, levels, streaks) that you unlock with your face.
There are no usernames or passwords. Sign-up and sign-in both use passkeys (WebAuthn): your device
checks your face (Face ID, Touch ID, Windows Hello) and the site only receives a signed proof.

## How the lock works

- Every fresh page load starts locked, even if you signed in earlier.
- The app locks again after 2 minutes without activity, or 10 seconds in a background tab.
  Locking clears the data from the page and marks the server session as locked, so the API refuses
  data until the next face check.
- Unlocking only accepts passkeys belonging to the signed-in user.
- A face check is valid server-side for at most 8 hours.
- Passkeys require a secure origin: `https://` or `http://localhost`.

## Stack

Next.js (App Router) + TypeScript, `@simplewebauthn`, `jose` session cookies, Upstash Redis for storage,
Vitest, GitHub Actions CI.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional locally
npm run dev                  # http://localhost:3000
npm test
```

Without Redis credentials a dev-only in-memory store is used (data resets on restart).

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. In Vercel, add the Upstash Redis integration (Marketplace) so `UPSTASH_REDIS_REST_URL` / `_TOKEN` (or `KV_REST_API_*`) are set.
3. Add `SESSION_SECRET` (32+ random characters).
4. Deploy, open the site, and sign up with your face.
5. Set `ALLOW_SIGNUP=false` and redeploy so nobody else can enrol.

Passkeys are bound to the domain. If you change the domain later, you need to sign up again.

## CI

`.github/workflows/ci.yml` runs type check, tests, build and a dependency audit on every push and pull request.
Vercel's Git integration handles deployment once CI is green.
