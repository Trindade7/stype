---
title: Admin Users Server-Side Pagination and Shadcn Select
status: ready-for-agent
---

## Problem Statement

As the application user base grows, loading the entire user database into server memory and serializing all records on every request to `/app/admin/users` causes significant latency, creates multi-megabyte payloads, and exhausts browser memory. 

Additionally, user searching is handled entirely within client-side memory without URL query parameter reflection. Administrators cannot bookmark, refresh, or share specific search queries or pages.

Finally, the Create User and Edit User forms rely on native HTML `<select>` inputs for role selection rather than the application's shadcn-svelte Select component. This produces an inconsistent visual design and breaks interaction parity with other dropdowns in the interface.

## Solution

1. Replace full-dataset loading on `/app/admin/users` with server-side pagination backed by database count, limit, and offset queries, using a fixed page size of 25 users per page.
2. Synchronize pagination and search query parameters (`?page=...&search=...`) with the browser URL. Debounce search input changes by 300 milliseconds and update URL state with non-scrolling, focus-preserving client navigation.
3. Clamp invalid, non-numeric, or out-of-bounds page parameters gracefully on the server to the valid page range (`1` to `totalPages`, or `1` if empty) without HTTP redirects.
4. Keep the pagination control bar visible at all times, including single-page and zero-result views. Provide disabled Previous/Next buttons when navigation is unavailable, display page numbers, and show a clear count summary (such as "Showing 1 to 25 of 100 users").
5. Automatically reset pagination to page 1 when an Administrator alters the search query, and navigate to page 1 when an Administrator creates a new user so the newly registered user appears immediately at the top of the table.
6. Replace native `<select>` elements in the Create User and Edit User dialogs with the shadcn-svelte Select component. Present clean, plain-text role options ("User" and "Admin") while retaining full compatibility with standard form submissions and self-demotion confirmation dialogs.

## User Stories

1. As an Administrator, I want to see up to 25 registered users per page in the administration users table, so that the page loads quickly even when the system has thousands of users.
2. As an Administrator, I want users ordered by registration date descending, so that the newest users always appear on the first page.
3. As an Administrator, I want to see a summary text indicating the range and total count of users currently displayed (e.g., "Showing 1 to 25 of 84 users"), so that I know where I am in the user directory.
4. As an Administrator, I want pagination controls to remain visible even when there is only one page of users, so that I have consistent visual confirmation of the total user count.
5. As an Administrator viewing page 1, I want the "Previous" pagination button disabled, so that I cannot navigate before the first page.
6. As an Administrator viewing the final page of users, I want the "Next" pagination button disabled, so that I cannot navigate past the last page.
7. As an Administrator, I want to click page numbers in the pagination bar to jump directly to specific pages of users, so that I can browse the directory quickly.
8. As an Administrator, I want to type into the search bar and have results fetched from the server after a 300ms debounce, so that I can search the entire database without typing friction.
9. As an Administrator searching for users, I want the search to match against display names, usernames, or email addresses, so that I can locate users using any identifier.
10. As an Administrator entering a search query while on page 3 or later, I want the view to reset automatically to page 1, so that filtered results are not hidden behind an obsolete page index.
11. As an Administrator, I want the active page and search query maintained in the URL query string, so that I can reload the page or bookmark a filtered user list.
12. As an Administrator navigating to a URL with a negative or non-numeric page parameter, I want the server to clamp the page to 1, so that the application never errors on malformed parameters.
13. As an Administrator navigating to a URL with a page number higher than the total pages, I want the server to clamp the page to the final page, so that I do not see an empty table when records exist.
14. As an Administrator creating a new user from page 2 or later, I want the table to navigate to page 1 upon successful creation, so that I immediately see the new user at the top.
15. As an Administrator deleting the last remaining user on the final page, I want the table to adjust to the new final page, so that I am not left stranded on an empty page.
16. As an Administrator opening the Create User dialog, I want the role selection input to use the shadcn-svelte Select component, so that it visually matches the rest of the application.
17. As an Administrator creating a user, I want the role select to default to "User", so that regular typists can be created with minimal effort.
18. As an Administrator creating a user, I want to select between "User" and "Admin" roles via the Select dropdown, so that I can provision administrative privileges when needed.
19. As an Administrator opening the Edit User dialog, I want the role select to display the target user's current role ("User" or "Admin"), so that I see their current permissions immediately.
20. As an Administrator editing my own account, I want selecting "User" and saving to trigger a confirmation modal warning of immediate privilege loss, so that I do not accidentally remove my own administrator role.
21. As an Administrator editing another user, I want role changes submitted cleanly through standard form actions, so that role updates are saved reliably in the database.
22. As an unauthenticated visitor requesting `/app/admin/users`, I want to be redirected to the login page, so that administrative tools remain protected.
23. As a non-administrative authenticated typist requesting `/app/admin/users`, I want to receive an HTTP 403 Forbidden response, so that regular users cannot access administrative data.

## Implementation Decisions

- Admin User Data Loading:
  - The server load handler inspects URL query parameters for `page` (defaulting to 1) and `search` (defaulting to empty string).
  - The handler executes a database `COUNT(*)` query matching the search filter across display name, username, and email.
  - The handler calculates `totalPages` (minimum 1). The target `page` is clamped to the integer range between `1` and `totalPages`.
  - The handler queries the users table with a fixed limit of 25 and an offset of `(clampedPage - 1) * 25`, ordered by creation date descending.
  - The handler returns an object containing the paginated users array, pagination metadata (current page, perPage of 25, totalCount, and totalPages), the current search query, and the SMTP configuration status.

- Search and Navigation Reactivity:
  - The search input binds to a reactive string. An effect or input handler debounces changes by 300 milliseconds.
  - Debounced search updates navigate using client-side routing with `replaceState: true`, `noScroll: true`, and `keepFocus: true`, passing the updated `search` parameter and resetting `page` to 1.
  - Clicking pagination links or buttons navigates with `noScroll: true` to preserve viewport stability.

- Pagination Bar Presentation:
  - The pagination bar renders shadcn-svelte pagination primitives beneath the table.
  - Controls are rendered on all states, including single-page and zero-result queries.
  - When the table is empty, the summary indicates "No users found" and pagination buttons remain disabled.
  - When records exist, a text element displays "Showing {start} to {end} of {totalCount} users".

- Shadcn-Svelte Role Select:
  - Both Create User and Edit User modal dialogs replace raw `<select>` elements with `<Select.Root type="single" name="role" bind:value={...}>`.
  - The Select trigger renders an accessible combobox button with a clean text label showing "User" or "Admin".
  - The Select content presents Select items for "User" and "Admin".
  - The primitive automatically generates a hidden form input with `name="role"` and the active value, preserving full compatibility with standard form submissions and progressive enhancement.
  - Existing self-demotion verification logic in the Edit User dialog remains bound to the role value, ensuring the self-demotion warning modal triggers whenever an administrator changes their own role to "user".

- Post-Action Navigation:
  - Successful execution of `createUser` triggers client navigation to `?page=1` with search query cleared, bringing the administrator to the top of the table where the new record is located.
  - Successful deletion or update actions re-run the server load function via standard form enhancement, allowing the server's clamping logic to adjust the page index if a deletion reduced the total page count.

## Testing Decisions

- Definition of a Good Test:
  - Tests must assert observable HTTP statuses, returned data shapes, DOM elements, and accessible attributes, not private variables or internal query structures.
  - Tests should verify user-facing outcomes: typing in search triggers server load with query parameters; out-of-bounds parameters return clamped records; pagination buttons render appropriate disabled states; role dropdowns submit expected values.

- Modules to Test:
  - **Server Load Module:**
    - Rejection of unauthenticated typists (redirect to login) and non-administrators (403 Forbidden).
    - Extraction and application of `page` and `search` query parameters.
    - Graceful clamping of negative, non-numeric, or oversized `page` values.
    - Accurate calculation of `totalCount`, `totalPages`, and correct slicing of returned user records with limit 25 and proper offsets.
    - Correct filtering across name, username, and email when `search` is provided.
  - **Admin Users Page Component:**
    - Rendering of the 25-user paginated table.
    - Presence and behavior of pagination controls (disabled states on page 1 and last page, user count summary text).
    - Replacement of raw role selects with shadcn Select triggers in Create User and Edit User dialogs.
    - Proper opening and closing of role Select dropdowns and selection of options.
    - Preservation of self-demotion confirmation dialog when an administrator changes their role to "user" via the Select component.
    - Navigation to page 1 upon successful user creation.

- Prior Art:
  - `src/routes/app/admin/users/page.server.test.ts`: existing test suite verifying administrative route loads and actions with an in-memory database.
  - `src/routes/app/admin/users/page.svelte.test.ts`: existing component tests verifying modal interactions, search inputs, and table rendering.
  - `src/lib/components/ui/primitives.test.ts`: existing tests verifying bits-ui and shadcn Select component rendering, item selection, and slots.

## Out of Scope

- Client-side pagination changes in `/app/passages` or test run history tables.
- Variable page size selectors (such as 10/25/50/100 dropdowns).
- Additional user roles beyond "user" and "admin".
- Dynamic sorting by arbitrary table columns (e.g., sorting by username or email).

## Further Notes

- Architectural justification and trade-offs are documented in `docs/adr/0004-server-side-pagination-for-user-administration.md`.
