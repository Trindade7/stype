# 03 — User Registration Flow at Signup

**What to build:** A dedicated registration page at `/app/signup` allowing new typists to create an authenticated account with display name, unique username, unique email, and password. Successful registration creates a user in the database, establishes an active session cookie, and redirects the user directly to `/app`. Clear error messages prevent duplicate usernames, duplicate emails, invalid email formats, and passwords shorter than 8 characters. The login and signup pages link directly to each other.

**Blocked by:** 02 — User Schema Migration and Dual Identifier Login

**Status:** completed

- [x] A registration page is available at `/app/signup` with fields for Name, Username, Email, and Password.
- [x] Submitting the form validates that display name is between 1 and 50 characters.
- [x] Submitting the form validates that username is between 3 and 20 alphanumeric characters, hyphens, or underscores.
- [x] Submitting the form validates standard email format.
- [x] Submitting the form requires password to be at least 8 characters.
- [x] Attempting to sign up with a username that is already taken displays a clear error message.
- [x] Attempting to sign up with an email that is already registered displays a clear error message.
- [x] Successful registration hashes the password using scrypt and stores the new user record.
- [x] Successful registration sets the authenticated session cookie and redirects directly to `/app`.
- [x] The login page displays a link to navigate to `/app/signup`.
- [x] The signup page displays a link to navigate back to `/app/login`.
- [x] The signup page retains previously entered values (except password) when returning with a validation error.
