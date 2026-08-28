# 02 — Typing Engine and Metric Charts Contrast

**What to build:** Migrate the typing test engine, result summary, and timeline charts from hardcoded dark palette utilities to semantic theme tokens, ensuring high-contrast legibility in light mode and preserving visual balance in dark mode.

**Blocked by:** 01 — Theme Tokens and Form Input Visibility

**Status:** ready-for-agent

- [ ] Untyped passage text displays with clear, legible contrast in light mode using theme tokens.
- [ ] Correctly typed characters render in dark, high-contrast text in light mode instead of near-white shades.
- [ ] Incorrect characters render with clear error highlighting across light and dark modes.
- [ ] The active typing caret is distinctly visible on the current character in both modes.
- [ ] The typing container adapts using theme surface and border tokens rather than fixed dark palette styles.
- [ ] The test toolbar, HUD metrics, and bottom control buttons adapt cleanly to light and dark surfaces.
- [ ] The result summary card and timeline metric charts use theme tokens for speed lines, accuracy lines, grid lines, and labels.
- [ ] Automated tests verify the typing engine and charts render expected semantic token classes without raw hardcoded palette classes.
