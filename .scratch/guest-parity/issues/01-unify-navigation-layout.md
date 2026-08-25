# 01 — Unify Navigation and Guest Layout

**What to build:** The navigation bar should be fixed to the top of the viewport on all pages, the "Session active" badge must be removed, and navigation links (History, Stats, Passages, Settings) should be centered on wide screens using a 3-column layout. Additionally, the content on the unauthenticated Guest home page should align at the top to match the authenticated App home page.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The header in `GuestHeader.svelte` and `+layout.svelte` uses `fixed inset-x-0 top-0 z-50`
- [x] The `main` container below the header has appropriate top margin (`mt-[69px]`) to prevent content overlap
- [x] The "Session active" badge is removed from `+layout.svelte`
- [x] Both headers use a 3-column flex layout (`w-1/3` each) so navigation links sit perfectly in the center (hidden on mobile, visible on `sm:`)
- [x] The Guest `+page.svelte` `main` container drops the `justify-center` class (or adopts a non-flex structural equivalent) so the typing engine renders near the top of the page.