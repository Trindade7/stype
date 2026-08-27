# 04 — Typing Engine Active Line Auto-scrolling

**What to build:** The typing engine automatically tracks the active line being typed and scrolls the passage container according to the configured `scrollMode`. In `center` mode, the current line stays vertically centered. In `step` mode, the box scrolls down when the cursor approaches the bottom threshold. In `manual` mode, no automatic scrolling occurs. Scrolling resets to the top on restart or passage transition, and updates backward when backspacing across lines.

**Blocked by:** 02 — Full Viewport Layout Lock for Typing Screens, 03 — Scroll Mode Setting and Persistence

**Status:** done

- [x] `TypingEngine` accepts `initialScrollMode` / `scrollMode` prop defaulting to `center`.
- [x] In `center` mode, advancing keystrokes smoothly scroll the passage container to keep the active typing line centered vertically.
- [x] In `step` mode, the container scrolls down in stepped increments when the active line approaches the bottom visible boundary.
- [x] In `manual` mode, automatic container scrolling is disabled.
- [x] Backspacing across line boundaries keeps the active line visible.
- [x] Restarting a test run (`Escape`) or loading a new passage (`Tab`) resets container scroll position to `0`.
- [x] Guest and authenticated typing pages pass the user's saved `scrollMode` into `TypingEngine`.
- [x] Component tests verify scroll tracking calculations and reset behavior across all three scroll modes.
