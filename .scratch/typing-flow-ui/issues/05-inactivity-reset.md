# 05 — Inactivity Reset for In-Progress Test Runs

**What to build:** Automatically reset abandoned typing runs when the typist stops typing for 10 seconds. Apply this rule during an active test run in both Passage Mode and Timed Mode. Resetting clears typed input and elapsed time back to zero on the same passage, allowing the typist to start over immediately without manual keyboard or mouse intervention.

**Blocked by:** 03 — Typing Layout Stability and Result Summary Mobile Polish

**Status:** complete

- [x] Typing the first character initiates a 10-second inactivity countdown in both Passage Mode and Timed Mode.
- [x] Each subsequent keystroke resets the countdown back to a full 10 seconds.
- [x] When 10 seconds elapse without a keystroke while a test is in progress, the engine resets typed text, elapsed time, and snapshots back to zero.
- [x] The inactivity reset keeps the typist on the same passage rather than advancing to a new text.
- [x] Before typing begins, the inactivity timer does not run, allowing typists to read the passage without being reset.
- [x] When a test run is completed and the Result Summary is visible, the inactivity timer is disabled.
- [x] Manually resetting with the Escape key or the restart button properly cancels any pending inactivity timer.
