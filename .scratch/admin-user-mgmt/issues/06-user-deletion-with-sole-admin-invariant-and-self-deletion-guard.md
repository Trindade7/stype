# 06 — User Deletion with Sole-Admin Invariant and Self-Deletion Guard

**What to build:** Allow Administrators to delete users from the system, cascading deletion across all associated sessions, passages, test runs, settings, and tokens. Protect system integrity by enforcing in a transaction that at least one Administrator must always exist. If an Administrator deletes their own account, require an explicit confirmation warning about immediate session termination, delete the user, and redirect cleanly to the login screen.

**Blocked by:** 03 — Administrator User Table and Direct User Creation

**Status:** completed

- [x] Each user row action menu includes a "Delete User" option that opens a confirmation modal dialog.
- [x] Deleting a user removes the user record and cleanly cascades deletion to sessions, custom passages, test runs, settings, and tokens.
- [x] Deleting an Administrator checks within a database transaction that at least one other Administrator remains.
- [x] Attempting to delete the last remaining Administrator fails with a clear error message, leaving the user intact in the database.
- [x] Attempting to delete one's own account displays a specific confirmation warning that the current session will terminate immediately.
- [x] Confirming self-deletion (when another administrator exists) deletes the user record, clears the session cookie, and redirects to `/app/login`.
- [x] Automated tests verify cascading deletion across all related entities, sole-admin deletion rejection within transactions, self-deletion session termination, and race condition resilience.
