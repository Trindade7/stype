# 05 — Administrator Password Reset and Email Reset Link

**What to build:** Allow Administrators to reset any user's password directly or trigger an email reset link from a modal dialog. Direct resets strictly enforce the minimum password length, support generating random passwords, and immediately invalidate all active sessions for the targeted user. If SMTP is configured and the user has a verified email, provide an option to send a password reset link directly to their inbox.

**Blocked by:** 03 — Administrator User Table and Direct User Creation

**Status:** completed

- [x] Each user row action menu includes a "Reset Password" option that opens a reset modal dialog.
- [x] The dialog includes a new password input field with a "Generate random password" helper button.
- [x] The server enforces the minimum 8-character password length for administrator-entered passwords.
- [x] Submitting a direct password reset updates the user's password hash and immediately deletes all active sessions for that user.
- [x] When SMTP environment variables are configured and the user has a confirmed email, the dialog displays a secondary action to send a reset link.
- [x] Clicking the send reset link action creates a time-limited Password Reset Token, delivers it via email, and keeps existing sessions intact until redeemed.
- [x] When SMTP environment variables are unconfigured or the user has an unverified email, the send reset link action is hidden or disabled.
- [x] Subsequent login attempts for the targeted user require the new password.
- [x] Automated tests verify password updates, session termination upon reset, server-side length validation, and conditional email reset link dispatch.
