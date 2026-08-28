# 04 — User Detail Editing, Role Management, and Verification Toggle

**What to build:** Allow Administrators to edit existing user details, modify roles between User and Administrator, and explicitly toggle email verification status from a modal dialog. Enforce a domain invariant in a database transaction preventing demotion of the sole Administrator, and present an explicit confirmation warning when an Administrator demotes their own account.

**Blocked by:** 03 — Administrator User Table and Direct User Creation

**Status:** completed

- [x] Each user row includes an action menu with an "Edit Details" option that opens an edit modal dialog.
- [x] The edit modal displays fields for display name, email, role selection (`admin` or `user`), and an "Email Verified" toggle.
- [x] Submitting the form validates display name length, email format, and uniqueness against other registered users.
- [x] Updating a user's details persists the changes and keeps the user verified by default unless the verification toggle was unchecked.
- [x] Demoting an Administrator to User verifies within a database transaction that at least one other Administrator remains; if not, the action is rejected with a clear error.
- [x] Attempting to demote one's own account displays an explicit confirmation dialog warning that administrative privileges will be revoked immediately.
- [x] When an Administrator confirms self-demotion (and another administrator exists), their role updates to User and administrative access is revoked.
- [x] Automated tests verify user detail updates, role changes, verification status toggling, single-admin demotion prevention, and self-demotion confirmation handling.
