# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.
``

Project: Geetha Shloka Daily (static site)

Overview
- Purpose: A lightweight, offline-capable website to learn one Bhagavad Geetha shloka per day, with points and streaks tracked locally.
- Stack: Plain HTML/CSS/JavaScript. No build system, no package manager, no external runtime.
- Key files: index.html (UI), styles.css (styling), script.js (logic/state).

Commands (development)
- Serve locally (recommended for consistent behavior):
  - Python 3: python3 -m http.server 8080
  - Then open http://localhost:8080/
- Alternatively: open index.html directly in a browser (as noted in README).
- Build/lint/test: Not configured in this repository (there are no test or lint commands).

Architecture (big picture)
- Deterministic daily selection
  - script.js computes today’s index via daysBetween(epoch, today) % SHLOKAS.length.
  - Epoch is fixed at 2020-01-01; SHLOKAS is a curated in-file array of samples (text, transliteration, meaning, source).
- Local state and persistence
  - Uses localStorage under keys: gsd_points, gsd_last_completed, gsd_streak.
  - loadState/saveState read/write these values; state is reflected in the UI (points, streak, last completed date).
- Rewards and streak logic
  - Mark as learned: +10 points per day; streak increments if lastCompleted was yesterday, otherwise resets to 1.
  - Bonus reward: every 7-day streak grants +20 additional points and shows a temporary banner; a milestone banner also appears on each 100-point boundary.
- UI rendering and events
  - renderToday() hydrates today’s shloka, source, meaning text, stats, and button state (disabled after completion for the day).
  - Button handlers: Mark as learned updates state and triggers rewards; Show meaning toggles visibility and button label.
- Styling and layout
  - styles.css defines a dark theme with decorative gradient orbs, responsive grid for stats, and card-based layout. No CSS frameworks.

Notes from README
- The app works offline as a static site; serving locally via a simple HTTP server is recommended for best results.
- Progress is stored locally; there are no accounts or backend sync.

Operational considerations
- There is no CI/CD, no package.json/pyproject, and no lint/test tooling in-repo.
- To reset user progress during manual testing, clear the three localStorage keys mentioned above in the browser.
