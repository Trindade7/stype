# 02 — Core Typing Engine & Seeded Passages (Passage Mode)

**What to build:** The core typing interface where a user can practice typing a text passage. The timer starts automatically on the first keystroke. As the user types, characters are visually highlighted as correct or incorrect. The interface works on both desktop and mobile without intrusive autocorrect, supports backspacing, and displays live metrics (WPM, accuracy, and a count-up timer). When finished, an in-memory summary screen is displayed.

**Blocked by:** 01 — Project Skeleton & Session Authentication

**Status:** ready-for-agent

- [ ] `passages` schema is defined and initial sample texts are automatically seeded.
- [ ] Typing interface fetches and displays a random seeded passage in monospace typography.
- [ ] Typing input is captured correctly on desktop and mobile keyboards (transparent input field, no autocorrect).
- [ ] Characters are highlighted in real-time (correct, incorrect, pending) and backspacing reverses state.
- [ ] Live HUD displays current WPM, accuracy, and an active count-up timer starting on the first keystroke.
- [ ] Completing the passage transitions to a result summary screen displaying final metrics (in-memory).