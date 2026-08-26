# 02 — Full Viewport Layout Lock for Typing Screens

**What to build:** The typing test screens for both guests (`/`) and authenticated users (`/app`) fit completely within `100dvh` with page-level scrolling disabled. The header, HUD metrics, test mode toolbar, and bottom controls stay fixed in place. The typing container card flexes to fill available vertical space with internal scrolling enabled. When a test completes, `ResultSummary` renders inside the scrollable container without causing outer window overflow.

**Blocked by:** None — can start immediately

**Status:** complete

- [x] The root typing screen (`/`) and authenticated app typing screen (`/app`) are constrained to `100dvh` with `overflow-hidden`.
- [x] Navigation header, HUD metrics, test mode toolbar, and bottom restart/next controls remain fixed in place and visible within the viewport.
- [x] The typing container expands vertically to fill available screen height (`flex-1 min-h-0`) with internal text scrolling (`overflow-y-auto`).
- [x] Completing a test run displays `ResultSummary` within the internal scrollable container on compact screens without expanding the outer window or triggering page scrollbars.
- [x] Route and layout tests verify viewport constraint classes and non-overflowing behavior.
