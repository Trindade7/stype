# 05 — Password Reset Redemption and Session Authentication

**What to build:** Build the completion half of password recovery: validate tokens at `/app/reset-password`, enforce new password validation, update the password hash, invalidate the token, terminate all existing user sessions, create an active authenticated session, and redirect the user directly to the application.

**Blocked by:** 04 — Password Reset Request and Token Generation

**Status:** completed

- [x] A dedicated page at `/app/reset-password` accepts a token parameter and renders password reset inputs.
- [x] If the token is missing, invalid, or expired, the page displays a descriptive error state with a link to request a new link.
- [x] The reset form requires new password entry and confirmation matching.
- [x] Minimum password length of 8 characters is enforced on submission.
- [x] Submitting a valid new password with a valid token updates the user password hash.
- [x] The redeemed token is deleted or marked invalid so it cannot be reused.
- [x] All existing sessions for that user are terminated in the database.
- [x] A new authenticated session cookie is issued, and the user is redirected straight to the main typing interface.
- [x] Subsequent login attempts succeed with the new password and fail with the old password.
- [x] Automated tests verify token validation, session termination, session creation, error states, and end-to-end credential updates.
