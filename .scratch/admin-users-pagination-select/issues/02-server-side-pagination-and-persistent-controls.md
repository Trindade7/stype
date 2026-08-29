# 02 — Server-Side Pagination and Persistent Pagination Controls

**What to build:** The administration users table loads a fixed page size of 25 users ordered by registration date descending, driven by the `?page=` URL parameter. The server counts records, slices pages using database limits and offsets, and clamps negative, non-numeric, or oversized page requests into the valid range [1, totalPages]. The pagination bar remains visible at all times beneath the table, showing disabled Previous/Next buttons at boundaries, page links, and a user count summary ("Showing 1 to 25 of X users"). Creating a new user navigates to page 1 to display the newly registered user immediately.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Administrative route load handler extracts `page` from URL search parameters, defaults to 1, and clamps out-of-bounds or non-numeric values to the valid page range without HTTP redirects.
- [x] Users table fetches up to 25 users ordered by creation date descending, accompanied by pagination metadata (`page`, `perPage`, `totalCount`, and `totalPages`).
- [x] Pagination control bar renders beneath the user table in all states, including single-page and zero-user views.
- [x] "Previous" button is disabled on page 1, and "Next" button is disabled on the final page.
- [x] User count summary displays formatted range text (e.g. "Showing 1 to 25 of 60 users") corresponding to the current page and total records.
- [x] Clicking a page number or navigation button updates the URL query parameter and displays the corresponding slice of users.
- [x] Creating a new user navigates to page 1 so the new record is visible at the top.
- [x] Deleting a user on the final page gracefully clamps to the preceding page if total pages decrease.
- [x] Tests verify server-side query clamping, pagination metadata calculation, and UI component pagination interactions.
