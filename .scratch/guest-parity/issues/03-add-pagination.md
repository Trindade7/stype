# 03 — Add Client-Side Pagination to History and Passage Tables

**What to build:** The History and Passage tables can grow extremely long and stretch the page. Implement client-side pagination limiting the visible items to 10 per page, with functional "Previous" and "Next" controls at the bottom of the tables.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Add a `currentPage` state variable to `HistoryTable.svelte` and slice the filtered runs `((currentPage - 1) * 10, currentPage * 10)` before rendering.
- [x] Add "Previous" and "Next" buttons below the History table that increment/decrement `currentPage`. Disable "Previous" on page 1 and "Next" on the last page.
- [x] Implement the identical pagination logic and UI in `PassageTable.svelte`.
- [x] Update `HistoryTable.test.ts` (and `PassageTable.test.ts` if it exists) to verify that only 10 rows are rendered initially, and clicking "Next" reveals the 11th row.