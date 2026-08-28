# 03 — Administrator User Table and Direct User Creation

**What to build:** Provide a user management interface at `/app/admin/users` featuring a searchable table of all registered users and a dialog to create new users directly. Administrators can onboard users by providing display name, username, email, initial password, and role. Admin-created users are marked email-verified by default, and the password policy is enforced server-side.

**Blocked by:** 01 — Role Authorization and Administration Route Shell

**Status:** completed

- [x] Navigating to `/app/admin/users` loads and displays all registered users in a responsive data table.
- [x] Each user row displays display name, username, email, role badge (`Admin` or `User`), confirmation badge (`Verified` or `Pending`), and registration date.
- [x] A search input filters the displayed users in real time matching against display name, username, or email.
- [x] A "Create User" action button opens a dialog with fields for display name, username, email, password, and role selection (`admin` or `user`).
- [x] The create user dialog includes a "Generate random password" helper button that generates a secure password and populates the field.
- [x] Submitting the form validates username uniqueness, email uniqueness, and email format, returning inline field errors on conflict.
- [x] The server strictly enforces the minimum 8-character password policy for admin-created users.
- [x] Users created directly by an Administrator have their email confirmation flag set to true by default.
- [x] Upon successful creation, the dialog closes and the user table updates to include the new user.
- [x] Automated tests verify table rendering, search filtering, user creation validation, random password helper functionality, and pre-confirmed account creation.
