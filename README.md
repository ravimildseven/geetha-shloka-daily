# Geetha Shloka Daily

A simple, beautiful website to help kids and adults learn a daily shloka from the Bhagavad Geetha. Earn points for completing each day and build a streak.

## Features
- Daily rotating shloka (sample set included)
- "Mark as learned" to earn points (+10/day) and build a streak
- Bonus reward on every 7-day streak (+20 points)
- Clean UI with subtle graphics, works offline (static site)

## Getting started
Open index.html directly in your browser, or serve it locally for best results:

- Using Python (if available):
  - Python 3: `python3 -m http.server 8080`
  - Then open http://localhost:8080/

- Or just double-click index.html to open in your default browser.

## How it works
- JavaScript stores your progress locally using localStorage (points, last completed date, and streak).
- Today’s shloka is selected deterministically by date, cycling through the included samples.

## Next ideas
- Add more shlokas and meanings (chapters/verses)
- Audio recitation and pronunciation guides
- User accounts and cloud sync (requires backend)
- Badges for long streaks and milestones
