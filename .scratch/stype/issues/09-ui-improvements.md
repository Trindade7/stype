# 09 — UI Improvements & Modernization

**What to build:** Comprehensive UI improvements including scrollbar layout stabilization, Guest mobile navigation menu, TypingEngine focus/blur states with reload auto-focus, Lifetime Stats performance graph for Guest and User, and shadcn-svelte form controls.

**Blocked by:** 08 — Lifetime Stats & Test History Dashboards

**Status:** done

- [x] Global layout scrollbar gutter stabilization preventing header shift.
- [x] Responsive Guest mobile navigation dropdown with links to History, Stats, Passages, Settings, theme toggle, and Log in.
- [x] TypingEngine focus/unfocus container border styling, active cursor pulse toggle, and auto-focus on page load.
- [x] Reusable PerformanceChart component visualizing speed (WPM) and accuracy (%) over historical test runs with empty state and tooltips.
- [x] Integration of PerformanceChart on `/stats` (Guest Local Store) and `/app/stats` (authenticated User).
- [x] Replacement of native form elements with shadcn-svelte Select, RadioGroup, Switch/Checkbox, and Textarea primitives.
