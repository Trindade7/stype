# 04 — Password Reset Request and Token Generation

**What to build:** Build the initiation half of password recovery: store cryptographically secure, time-limited reset tokens in the database, deliver reset links via SMTP or fallback stdout logging, provide a request form at `/app/forgot-password` accepting username or email, and place a "Forgot password?" link on the login screen.

**Blocked by:** 01 — Theme Tokens and Form Input Visibility

**Status:** ready-for-agent

- [ ] A dedicated database table stores password reset tokens with user association, secure token hashes, and expiration timestamps.
- [ ] Database initialization applies the new table idempotently for existing SQLite stores.
- [ ] A "Forgot password?" link appears on the login screen aligned with the password label, navigating to `/app/forgot-password`.
- [ ] The forgot password page accepts either a username or a registered email.
- [ ] Submitting a request for an existing user generates a 15-minute single-use token and invalidates any prior unused tokens for that user.
- [ ] When SMTP environment variables are configured, the reset link is sent via email.
- [ ] When SMTP environment variables are unconfigured, the reset URL is logged to the server console for local testing.
- [ ] The submission response displays a generic confirmation message regardless of whether the account exists, preventing account enumeration.
- [ ] Automated tests verify request action handling, token generation, single-active-token enforcement, and login page link placement.
