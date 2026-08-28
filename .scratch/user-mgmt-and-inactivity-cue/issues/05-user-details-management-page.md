# 05 — User Details Management Page

**What to build:** A self-service user page at `/app/user` where authenticated typists can view their read-only username and update their display name and email address. In the navigation header dropdown, replace the legacy "My Account" label with "User Details", linking directly to `/app/user`. Submitting updated details validates email formatting, ensures email uniqueness across accounts, persists changes to the database, and provides clear success feedback.

**Blocked by:** 03 — User Registration Flow at Signup

**Status:** completed

- [x] Header dropdown replaces "My Account" with "User Details" and links directly to `/app/user`.
- [x] Navigating to `/app/user` while unauthenticated redirects to `/app/login`.
- [x] Authenticated users visiting `/app/user` see their username displayed in a read-only field.
- [x] The Details form is pre-filled with the user's current display name and email address.
- [x] Updating the display name (1 to 50 characters) persists the new name and shows success feedback.
- [x] Updating the email address to a valid, unused address persists the new email and shows success feedback.
- [x] Submitting an invalid email address displays a validation error message.
- [x] Submitting an email address that belongs to another user displays a duplicate email error message.
- [x] The updated display name is immediately reflected in the interface after page refresh.
