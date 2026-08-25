# 02 — Visually Disable Time Selection in Passage Mode

**What to build:** When a user or guest selects "Passage Mode" in the Typing Engine, the time duration selection buttons (15s, 30s, 60s) should remain visible but visually disabled, instead of completely disappearing from the UI.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] In `TypingEngine.svelte`, remove the `{#if mode === 'timed'}` block wrapping the duration selection buttons.
- [x] When `mode === 'passage'`, apply disabled CSS classes (`opacity-50 pointer-events-none`) to the duration buttons.
- [x] Ensure that clicking the disabled buttons does not update the selected time duration or cause any state changes.
- [x] Write or update component tests in `TypingEngine.test.ts` to assert that duration buttons render but are disabled when initialMode is 'passage'.