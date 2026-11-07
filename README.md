# Groundwork

A personal workout journal: onboarding, a weekly bodyweight plan, guided workouts, streaks,
history, weight and BMI tracking, and custom workouts. It's an installable PWA with no backend.
All data stays in this browser on this device.

## Run

Needs Node 20+ and npm.

    npm install
    npm run dev          # http://localhost:5173
    npm test             # unit + IndexedDB tests (vitest, fake-indexeddb)
    npm run typecheck
    npm run build        # production build in dist/, with service worker
    npm run preview      # serve dist/ at http://localhost:4173
    npm run e2e          # browser test; run while `preview` is running (uses Chrome at /usr/bin/google-chrome, or $CHROME)

## Where data lives

- IndexedDB database `groundwork` (Dexie) holds the profile, sessions, weights,
  customWorkouts, schedules (versioned weekly plans) and active (the in-progress workout).
- localStorage key `gw.prefs` holds theme, units and reminder settings.
- Schema changes: add a new `this.version(n+1).stores(...).upgrade(...)` in `src/lib/db.ts`.
  Never edit old versions. Backups carry a `version` field, and imports from newer versions are refused.

## Layout

    src/types.ts            data model
    src/data/               exercises, built-in workouts and week, messages
    src/lib/                dates, streak/progress maths, BMI/units, db, session state, backup, prefs
    src/components/         Figure (line-drawn exercise poses), Rings, WeekStrip, Layout, ui
    src/pages/              one file per screen
