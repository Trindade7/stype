# 01 — Global Scrollbar Layout Stability

**What to build:** Global scrollbar behavior configured to prevent layout shifts and header jumping when navigating between pages of different lengths or when page content height changes dynamically.

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] The global layout prevents horizontal jumping and content shifting when a vertical scrollbar appears or disappears across page transitions.
- [x] The fixed navigation header remains centered and horizontally aligned with the main container across all pages regardless of document height.
- [x] Automated layout tests verify that scrollbar gutter stabilization is active.
