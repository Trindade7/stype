# 04 — Lifetime Stats Performance Graph

**What to build:** A historical performance graph visualizing typing speed (WPM) and accuracy (%) progression across completed Test Runs, integrated into both the Guest (`/stats`) and authenticated User (`/app/stats`) Lifetime Stats pages.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] A reusable PerformanceChart component renders speed (WPM) and accuracy (%) trend lines across historical Test Runs.
- [x] Hovering over data points on the graph displays a tooltip with the test run's WPM, accuracy, mode, and date.
- [x] If no test runs exist, the chart displays an informative empty state.
- [x] The Guest stats page (`/stats`) renders the PerformanceChart using test runs from the Local Store.
- [x] The authenticated stats page (`/app/stats`) renders the PerformanceChart using server-persisted test runs.
- [x] Tests verify chart rendering, tooltip hover interaction, and empty state behavior across Guest and User stats routes.
