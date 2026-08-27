# 01 — Global Pointer Cursors and Custom Scrollbars

**What to build:** Interactive elements across the application must display pointer cursors so users immediately recognize clickable buttons and links. Disabled elements must indicate non-interactivity with a not-allowed cursor. Thick default OS scrollbars must be replaced with slim, rounded custom scrollbars with transparent tracks that look clean in both light and dark themes.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] All native buttons, links, and elements with role="button" display a pointer cursor when hovered.
- [x] Disabled buttons, aria-disabled links, and disabled button roles display a not-allowed cursor and prevent pointer interactions.
- [x] Scrollbars across the entire window and scrollable subcontainers render with a 6px slim width and transparent track.
- [x] Scrollbar thumbs render with rounded edges matching border and muted color tokens in both light and dark themes.
- [x] Scrollbar thumbs visibly react with subtle contrast change on hover.
- [x] The invisible character capture input in the typing engine retains its default non-pointer cursor.
