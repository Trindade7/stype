# 03 — Server-Side Search Filtering and URL State Synchronization

**What to build:** The administration users search input filters users on the server across display name, username, and email. Changes to the search field trigger a 300ms debounced client navigation to `?page=1&search=...`, keeping input focus and scroll position. Database count and pagination calculations reflect the active search query. Zero-result queries display an empty state notification with disabled pagination controls.

**Blocked by:** 02 — Server-Side Pagination and Persistent Pagination Controls

**Status:** completed

- [x] Route load handler extracts `search` query parameter and filters users matching display name, username, or email.
- [x] Server recalculates total count and total pages based on the filtered dataset.
- [x] Search input binds to reactive state and triggers debounced (300ms) navigation to `?page=1&search=...` while keeping focus in the input and preserving scroll position.
- [x] Entering a search query while viewing page 2 or later resets the page parameter to 1.
- [x] Search query remains synchronized in the browser URL for bookmarking and deep linking.
- [x] Searching with no matches renders a clear "No users found" message while keeping the disabled pagination bar visible.
- [x] Clearing the search query navigates back to the unfiltered paginated user list.
- [x] Server and component tests verify filtered querying, search debounce behavior, URL parameter synchronization, and empty state rendering.
