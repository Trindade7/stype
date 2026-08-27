# 03 — Typing Layout Stability and Result Summary Mobile Polish

**What to build:** Keep the typing area stationary during practice by preventing the top toolbar, HUD stats, and bottom controls from unmounting. When typing begins, smoothly fade the toolbar and bottom controls to zero opacity and disable pointer events instead of destroying their DOM nodes. When Zen Mode is enabled, smoothly fade the HUD stats to zero opacity when typing starts. When a test run finishes, prevent the scrollbar flash on the Result Summary by replacing vertical slide entrance animations with a clean fade. Optimize the post-test metric grid on mobile screens so speed, accuracy, and elapsed time fit without wrapping.

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] The top mode and timer toolbar remains mounted in the DOM when typing begins, transitioning to zero opacity and disabling pointer events.
- [x] The bottom controls remain mounted in the DOM when typing begins, transitioning to zero opacity and disabling pointer events.
- [x] In Zen Mode, the HUD stats remain mounted in the DOM and smoothly fade to zero opacity when typing begins.
- [x] With Zen Mode disabled, the HUD stats remain fully visible and responsive throughout the active test run.
- [x] Resetting the test restores the toolbar, HUD, and bottom controls to full opacity without causing layout jumping.
- [x] The Result Summary entrance animation uses a fade without downward vertical translation, eliminating the opening scrollbar flash.
- [x] The Result Summary stats grid uses compact spacing and padding on mobile screens so that metric values never wrap or overflow.
