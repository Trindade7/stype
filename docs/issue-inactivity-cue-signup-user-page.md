---
title: Inactivity Reset Visual Cue, User Signup & User Details Management
status: completed
---

## Problem Statement

Typists using Stype experience gaps in feedback during typing tests and lack foundational account onboarding and self-service capabilities:

1. When a typist pauses for 10 seconds during an in-progress test run, the typing engine resets elapsed time and typed characters silently. Typists who look away and return have no visual indication that an Inactivity Reset occurred rather than a system glitch or manual reset.
2. New typists who want to persist their test runs and custom passages across devices have no self-registration path. The application only supports logging into pre-existing users or using the seeded admin account.
3. Authenticated users cannot manage their personal details. Users cannot set or change their display name, email address, or password after their account is created.
4. The navigation header still references "My Account", violating the canonical domain model glossary which requires the term User and strictly avoids "account" or "profile".

## Solution

1. Display an absolute-positioned overlay badge inside the typing container reading "Reset due to inactivity" whenever an Inactivity Reset triggers. The badge introduces zero layout shift to the text passage and dismisses automatically on the next keystroke or after 3 seconds.
2. Introduce a user registration flow at `/app/signup` where new typists can register with their name, username, email, and password. Upon successful registration, the application creates an active session, migrates local guest data (test runs and custom passages), clears local guest storage, and redirects to `/app`.
3. Support logging into existing accounts using either username or email.
4. Introduce a dedicated User page at `/app/user` with two distinct cards:
   - "Details": view unique username (read-only) and update display name and email address.
   - "Change Password": update password with current password verification, new password validation, and confirmation matching.
5. Update the navigation header dropdown to replace "My Account" with "User Details" linking to `/app/user`.

## User Stories

1. As a typist whose test run resets after 10 seconds of inactivity, I want to see a visual cue stating that an inactivity reset occurred, so that I know why my test returned to zero.
2. As a typist reading the inactivity reset cue, I want the badge to appear as an overlay with zero layout shift, so that the passage text does not jump on screen.
3. As a typist resuming typing after an inactivity reset, I want the inactivity notice to dismiss immediately on my first keystroke, so that my typing view stays clear of clutter.
4. As a typist reviewing the passage after an inactivity reset without typing, I want the notice to fade out automatically after 3 seconds, so that the screen returns to its default clean state.
5. As a typist resetting a test run manually using the Escape key, I want the inactivity notice not to appear, so that manual resets do not show false inactivity messages.
6. As a typist resetting a test run manually using the restart button, I want the inactivity notice not to appear, so that intentional restarts remain clean.
7. As a typist before entering the first character of a passage, I want the inactivity notice never to appear, so that reading before typing is uninterrupted.
8. As a typist completing a test run, I want the inactivity notice never to appear over the Result Summary, so that post-test analysis is clean.
9. As a typist practicing in Passage Mode, I want the inactivity reset cue to behave consistently with Timed Mode, so that feedback is predictable across modes.
10. As an unauthenticated Guest visiting the login screen, I want a direct link to register for a new user account, so that I can create my account without confusion.
11. As a prospective User visiting `/app/signup`, I want a dedicated registration form requiring display name, username, email, and password, so that I can establish my identity on Stype.
12. As a prospective User registering, I want username validation to enforce 3 to 20 alphanumeric characters, hyphens, or underscores, so that handles are clean and URL-safe.
13. As a prospective User registering, I want email validation to enforce valid email formatting, so that typos are caught before submission.
14. As a prospective User registering, I want password validation to enforce at least 8 characters, so that weak credentials are prevented.
15. As a prospective User entering a username that is already taken, I want an error message indicating the username is unavailable, so that I can pick another handle.
16. As a prospective User entering an email that is already registered, I want an error message indicating the email is already in use, so that I do not register duplicate accounts.
17. As a Guest who completed test runs locally before signing up, I want my local test runs and custom passages automatically synced to my new user account upon registration, so that I do not lose my guest progress.
18. As a Guest registering for an account, I want local browser storage cleared after successful synchronization, so that stale guest state does not linger.
19. As a newly registered User, I want an active session created immediately upon signup and to be redirected straight to `/app`, so that I do not have to log in a second time.
20. As a visitor on `/app/signup`, I want a direct link to `/app/login`, so that existing users who landed on signup by mistake can quickly reach login.
21. As a returning User logging in at `/app/login`, I want to enter either my username or my email address, so that I can authenticate with whichever identifier I remember.
22. As an authenticated User looking at the navigation header dropdown, I want the section header to read "User Details" instead of "My Account", so that domain terminology remains consistent.
23. As an authenticated User opening the header dropdown, I want a direct link to `/app/user`, so that I can easily navigate to manage my user details.
24. As an authenticated User visiting `/app/user`, I want to see my current display name, email, and username displayed in the Details card, so that I can inspect my information.
25. As an authenticated User on `/app/user`, I want my username displayed as read-only, so that identity handle stability is preserved across the system.
26. As an authenticated User on `/app/user`, I want to update my display name, so that my preferred name is reflected across the application.
27. As an authenticated User on `/app/user`, I want to update my email address, so that I can keep my contact and login information current.
28. As an authenticated User submitting a new email address that belongs to another user, I want an error message informing me the email is taken, so that collision is avoided.
29. As an authenticated User submitting valid details changes, I want clear success feedback confirming the update was saved, so that I know my changes persisted.
30. As an authenticated User on `/app/user`, I want a separate Change Password card, so that credential rotation is distinct from contact details editing.
31. As an authenticated User changing password, I want to enter my current password, new password, and confirmation, so that unauthorized changes are prevented.
32. As an authenticated User changing password with an incorrect current password, I want an error message rejecting the change, so that security is enforced.
33. As an authenticated User changing password where the new password and confirmation do not match, I want an error message highlighting the mismatch, so that typos are avoided.
34. As an authenticated User changing password with a new password under 8 characters, I want an error message enforcing the length requirement, so that security standards are maintained.
35. As an authenticated User successfully changing password, I want confirmation feedback and cleared password fields, so that I know the new password is active.
36. As a User who updated their password, I want my next login attempt to succeed with the new password and fail with the old password, so that credential updates are fully respected.
37. As an unauthenticated Guest attempting to access `/app/user`, I want to be redirected to `/app/login`, so that user pages remain strictly protected.

## Implementation Decisions

- Database Schema & Migrations:
  - Add `email` (TEXT UNIQUE) and `name` (TEXT) columns to the `users` table definition.
  - In database initialization, run idempotent column alterations for `email` and `name` in `users` within try-catch blocks to migrate existing SQLite databases safely.
  - Update the seeded admin user routine to include email `admin@stype.local` and name `Admin`.

- Inactivity Reset Visual Cue:
  - Add state in the typing engine to track when an inactivity reset has occurred.
  - Trigger this state only inside the 10-second inactivity timeout callback.
  - Dismiss the state immediately when any valid keystroke occurs or when a 3-second timer expires.
  - Ensure manual resets via Escape or the restart button clear the notice immediately.
  - Render the notice as an absolutely positioned pill badge anchored at the top-right of the typing container with appropriate z-index and pointer-events disabled, guaranteeing zero layout shift on the passage text.

- Authentication & Registration:
  - Update the login action to match either `users.username = identifier` or `users.email = identifier`.
  - Add a dedicated signup route with a server action handling:
    - Trimming and validating name (1 to 50 characters).
    - Validating username (3 to 20 characters, alphanumeric, underscores, hyphens) and checking uniqueness.
    - Validating email format and checking uniqueness.
    - Validating password length (at least 8 characters).
    - Hashing password using the established scrypt password utility.
    - Creating the user record and starting a session.
    - Setting the session cookie with lax SameSite, httpOnly, and appropriate max age.
  - Build the signup page component adhering to the existing card layout and design system, with client-side synchronization of guest test runs and custom passages upon successful registration.
  - Cross-link `/app/login` and `/app/signup`.

- User Management Page:
  - Create route `/app/user` with a server load function requiring an active authenticated user and loading their user record.
  - Create server form actions for:
    - `updateDetails`: validates name and email, ensures new email does not collide with other users, updates the user row, and returns success status.
    - `updatePassword`: verifies current password against stored hash, validates new password length and confirmation match, hashes new password, updates user row, and returns success status.
  - Design the page using two distinct cards for Details and Change Password, styled with standard inputs, labels, submit buttons, and accessible alert notifications for errors and success states.
  - Update the layout navigation dropdown: replace the text "My Account" with "User Details" linking to `/app/user`.

## Testing Decisions

- Good tests verify user-observable behavior through public seams: submitting forms, asserting error and success messages in the DOM, checking session cookies, and inspecting database records. They avoid asserting internal state variables or private functions.
- Modules to be tested:
  - Typing Engine: mount the component, trigger inactivity reset with fake timers, verify the overlay notice appears without shifting text elements, verify it dismisses on keystroke and after 3 seconds.
  - Login Action: verify logging in with valid username, valid email, invalid credentials, and missing fields.
  - Signup Action: verify successful registration, duplicate username rejection, duplicate email rejection, invalid password rejection, and session creation.
  - User Page Actions: verify successful details update, duplicate email rejection on update, incorrect current password rejection on password change, password mismatch rejection, and successful password update.
  - User Page Component: verify rendered form fields, read-only username, and display of feedback alerts.
  - Navigation Layout: verify header dropdown renders "User Details" linking to `/app/user`.
- Prior art in codebase:
  - `src/routes/app/login/actions.test.ts` and `src/routes/app/login/login.test.ts` for form actions and testing-library page tests.
  - `src/routes/app/settings/page.server.test.ts` for authenticated server load and action tests.
  - `src/lib/components/TypingEngine.test.ts` for fake-timer inactivity testing.

## Out of Scope

- Email verification emails or password reset email workflows (no SMTP server configured).
- Username modification after initial registration (usernames remain stable unique handles).
- Account deletion or account deactivation flows.
- Multi-factor authentication (MFA).

## Further Notes

- Maintains strict compliance with `CONTEXT.md` by replacing the legacy "My Account" label in the header with canonical User terminology.
- Preserves full backward compatibility with existing databases and seeded admin accounts.
