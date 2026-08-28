# 06 — User Password Rotation on User Page

**What to build:** A dedicated password change card on `/app/user` allowing authenticated typists to rotate their account password securely. The form requires entering the current password, a new password of at least 8 characters, and confirmation. The server verifies the current password against the stored hash before updating. Once verified, the new password is hashed and stored, input fields are cleared, and a success message is displayed. Subsequent logins require the new password.

**Blocked by:** 05 — User Details Management Page

**Status:** completed

- [x] A "Change Password" card is rendered on `/app/user` with inputs for Current Password, New Password, and Confirm Password.
- [x] Submitting an incorrect current password rejects the update with a clear error message.
- [x] Submitting a new password shorter than 8 characters rejects the update with an error message.
- [x] Submitting a new password and confirmation that do not match rejects the update with an error message.
- [x] Submitting valid password fields updates the password hash in the database.
- [x] After a successful password update, password input fields are cleared and a success alert is shown.
- [x] Logging out and attempting to log in with the old password fails.
- [x] Logging in with the new password succeeds.
