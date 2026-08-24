# 03 — Test Run Persistence

**What to build:** Saving completed typing test runs to the database. When a user finishes a passage, their performance metrics are saved and linked to their authenticated session. The post-test result summary screen is updated to load its data from this persisted record.

**Blocked by:** 02 — Core Typing Engine & Seeded Passages (Passage Mode)

**Status:** ready-for-agent

- [ ] `test_runs` schema is defined (WPM, accuracy, elapsed time, character breakdown).
- [ ] Completing a test automatically submits the metrics to the server via a form action or API endpoint.
- [ ] The saved test run is correctly associated with the currently authenticated user.
- [ ] The result summary screen fetches and displays the finalized run data from the database.