# 01 — Inactivity Reset Visual Overlay Notice

**What to build:** When a typist leaves an active test run idle for 10 seconds, the typing engine resets elapsed time and characters back to zero and immediately displays a visual overlay notice reading "Reset due to inactivity". The notice floats over the typing area without shifting the text passage or altering document flow. It dismisses automatically on the first subsequent keystroke or after 3 seconds, while intentional restarts via Escape or the restart button do not trigger the notice.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] When 10 seconds elapse without a keystroke during an active test run, an overlay notice displaying "Reset due to inactivity" appears.
- [x] The notice is positioned as an overlay inside the typing container so that no layout shift occurs on the passage text.
- [x] Typing any valid keystroke after an inactivity reset dismisses the notice immediately.
- [x] If no typing occurs after an inactivity reset, the notice automatically disappears after 3 seconds.
- [x] Manually resetting the test with the Escape key does not display the inactivity notice.
- [x] Manually resetting the test with the restart button does not display the inactivity notice.
- [x] Navigating to a new passage does not display the inactivity notice.
- [x] The notice never displays before the first keystroke of a passage or after a test run is completed.
- [x] The overlay notice functions identically in both Passage Mode and Timed Mode.
