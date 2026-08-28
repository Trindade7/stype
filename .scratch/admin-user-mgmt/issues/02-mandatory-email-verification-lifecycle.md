# 02 — Mandatory Email Verification Lifecycle

**What to build:** Make email mandatory on registration and enforce an environment-conditional email confirmation flow. When SMTP is configured, self-registered users receive an Email Confirmation Token valid for 1 hour and are restricted to an email verification prompt until confirmed. When SMTP is unconfigured, self-registered users auto-confirm to support offline installations. Provide routes for resending tokens, logging out unconfirmed sessions, and redeeming confirmation links.

**Blocked by:** 01 — Role Authorization and Administration Route Shell

**Status:** ready-for-agent

- [ ] The user entity includes an email confirmation boolean flag, defaulting to false for self-registered users.
- [ ] A dedicated database entity stores Email Confirmation Tokens with user association, secure SHA-256 token hashes, and a 1-hour expiration timestamp.
- [ ] Database initialization applies the email confirmation column and token table idempotently for existing SQLite stores.
- [ ] The seeded admin user has email confirmation set to true on database startup.
- [ ] Self-registration requires a valid email address; submitting without an email or with invalid email format returns an error.
- [ ] When SMTP environment variables are present, registration sets email confirmation to false, generates a 1-hour token, and sends a confirmation email.
- [ ] When SMTP environment variables are absent, registration sets email confirmation to true immediately so offline instances remain functional.
- [ ] Authenticated users with unconfirmed email on an SMTP-enabled instance are redirected to `/app/verify-email` when accessing app routes.
- [ ] The `/app/verify-email` page displays the recipient email address, a button to resend the confirmation link, and a button to log out.
- [ ] Resending a confirmation email invalidates previous confirmation tokens for that user and issues a fresh 1-hour token.
- [ ] Accessing `/app/confirm-email` with a valid token marks the user email confirmed, invalidates the token, and grants access to the app.
- [ ] Accessing `/app/confirm-email` with an expired or invalid token displays an explanatory error state with an option to request a new token.
- [ ] Automated tests verify registration with and without SMTP, token expiration, resend mechanics, verification link redemption, and route restrictions.
