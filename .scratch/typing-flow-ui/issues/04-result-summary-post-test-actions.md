# 04 — Result Summary Post-Test Actions

**What to build:** Provide typists with two distinct post-test choices on the Result Summary: retrying the passage they just completed or moving to a different passage. Present "Next Passage" as the primary button with the Tab shortcut indicator, and "Retry" as an outline secondary button with the Space shortcut indicator. Prevent page scrolling when Space is pressed on the completion screen.

**Blocked by:** 03 — Typing Layout Stability and Result Summary Mobile Polish

**Status:** ready-for-agent

- [ ] The Result Summary renders both a primary "Next Passage" button and a secondary outline "Retry" button side by side.
- [ ] Pressing the Tab key while viewing the Result Summary triggers the action to load a new passage.
- [ ] Pressing the Space key while viewing the Result Summary resets and starts the same passage again.
- [ ] Pressing Space on the Result Summary prevents the default browser page scroll behavior.
- [ ] Retrying resets the typed characters, timer, and snapshots to zero on the exact same passage without network refetching or passage rotation.
- [ ] Advancing to the next passage properly loads a fresh passage in both guest mode and authenticated mode.
