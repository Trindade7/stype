---
title: Administrator User Management and Mandatory Email Verification
status: ready-for-agent
---

## Problem Statement

Self-hosted deployments of Stype have no administrative interface for managing users. Once users register, server administrators cannot view user lists, create users directly, update user details, promote or demote roles, issue password resets, or remove users without raw database access.

Additionally, email addresses are optional and unverified. Self-registered users can provide unverified or fabricated email addresses, which breaks password recovery and leaves instances vulnerable to stale or abandoned accounts. At the same time, forcing external email infrastructure on offline or local desktop installations breaks the zero-dependency self-hosted promise of the application.

Finally, the system has no concept of roles or administrative access controls. Any authenticated user has identical privileges, and the seeded administrative credentials cannot be distinguished from regular typists at the domain level.

## Solution

1. Introduce role-based authorization with two explicit roles: User and Administrator. The seeded default user account is elevated to the Administrator role on database startup.
2. Build an Administrator user management interface at an administration route, guarded against unauthorized access so non-administrators receive a 403 Forbidden response. Add a navigation link in the authenticated user dropdown menu that appears only for Administrators.
3. Provide a user management view displaying a searchable table of all users with their display names, usernames, emails, role badges, verification badges, and registration dates.
4. Implement administrative user lifecycle operations via modal dialogs:
   - Create user: allows an Administrator to directly create an account with a display name, username, email, initial password (with a random password generation button), and role selection. Admin-created users are marked email-verified by default.
   - Edit user details: allows an Administrator to modify a user's display name, email, and role, accompanied by an explicit verification toggle to unblock users manually.
   - Reset user password: allows an Administrator to set a new password directly (enforcing the minimum password length) with an optional random password generator. Doing so invalidates all active sessions for that user. If SMTP is configured and the user has a confirmed email, provide an alternative button to send a password reset link.
   - Delete user: removes the user record and cascades deletion to sessions, custom passages, test runs, settings, and tokens.
5. Protect system stability with a domain invariant: the server must always retain at least one Administrator. Demoting or deleting the final Administrator is rejected within a database transaction to prevent concurrency race conditions. An Administrator deleting or demoting their own account is permitted only if another Administrator exists, and requires an explicit confirmation step in the interface warning of immediate privilege loss or session termination.
6. Make email mandatory for all users while providing an environment-sensitive confirmation lifecycle:
   - When SMTP is configured, self-registered users receive an Email Confirmation Token valid for 1 hour. Unconfirmed sessions are restricted to a verification notice screen where they can inspect delivery instructions, resend the token, or log out. Clicking the confirmation link verifies the email and grants full application access.
   - When SMTP is not configured, self-registered users are auto-confirmed upon registration, ensuring offline and local setups operate smoothly without external email infrastructure.

## User Stories

1. As an Administrator, I want to access an administration area from the navigation dropdown menu, so that I can reach user management tools easily.
2. As a regular User, I want the administration link hidden from my navigation dropdown menu, so that my navigation remains focused solely on my typing activity.
3. As a regular User attempting to visit the administration route directly, I want to receive a 403 Forbidden response, so that unauthorized typists cannot view or alter administrative controls.
4. As an unauthenticated typist navigating to the administration route, I want to be redirected to the login screen, so that protected routes require authentication.
5. As an Administrator viewing the user management table, I want to see every user's display name, username, email, role, confirmation status, and creation date, so that I have a complete picture of who is registered on the server.
6. As an Administrator managing a busy instance, I want a search input that filters the table by display name, username, or email, so that I can quickly find specific users.
7. As an Administrator, I want to create a new user directly from the management interface, so that I can onboard typists without requiring public registration.
8. As an Administrator creating a user, I want to supply a display name, username, email, password, and role, so that the user has complete credentials immediately.
9. As an Administrator creating a user, I want a button to generate a cryptographically strong random password, so that I do not need to invent temporary passwords manually.
10. As an Administrator creating a user, I want the server to enforce the minimum 8-character password policy, so that insecure passwords are rejected even when entered by administrators.
11. As an Administrator creating a user, I want duplicate usernames or duplicate emails rejected with inline validation messages, so that user identities remain unique.
12. As an Administrator creating a user, I want their email confirmation status marked verified by default, so that users I create directly can log in without email hurdles.
13. As an Administrator, I want to edit an existing user's display name, email, and role from a modal dialog, so that I can update user records when details change.
14. As an Administrator editing a user, I want an explicit email verification toggle, so that I can manually verify users who encounter email delivery problems.
15. As an Administrator editing a user, I want email changes validated for correct email syntax and uniqueness against other registered users, so that user records remain consistent.
16. As an Administrator editing a user, I want updating another user's email to maintain their verified status by default unless I explicitly uncheck the verification toggle, so that administrative edits do not accidentally lock typists out.
17. As an Administrator, I want to reset a user's password directly from the user table, so that I can help users who have lost their credentials.
18. As an Administrator resetting a password directly, I want the server to enforce the 8-character minimum policy, so that the new password meets system security rules.
19. As an Administrator resetting a password directly, I want a button to generate a random password, so that I can issue secure credentials quickly.
20. As an Administrator resetting a password directly, I want all active sessions for that user terminated immediately, so that compromised or obsolete sessions cannot persist.
21. As an Administrator on an instance with SMTP configured, I want a button to send a password reset link to a verified user's email, so that the user can choose their own password privately.
22. As an Administrator on an instance without SMTP configured, I want the "Send reset link" button hidden or disabled, so that I am not offered options that cannot succeed.
23. As an Administrator, I want to delete a user from the system, so that I can remove unwanted accounts.
24. As an Administrator deleting a user, I want their associated sessions, custom passages, test runs, settings, and tokens removed cleanly via cascading deletion, so that no orphaned data remains in the database.
25. As an Administrator attempting to delete or demote the sole Administrator on the server, I want the action rejected with a clear error message, so that the server is never left without an administrator.
26. As an Administrator deleting my own account while another Administrator exists, I want to see an explicit confirmation dialog warning that I will be logged out immediately, so that I do not delete myself by mistake.
27. As an Administrator deleting my own account with confirmation, I want my session invalidated and my browser redirected to the login screen, so that my state cleanly reflects my deletion.
28. As an Administrator demoting my own role to User while another Administrator exists, I want to see an explicit confirmation dialog warning that I will lose administrative privileges immediately, so that I do not demote myself accidentally.
29. As an Administrator performing concurrent role demotions or deletions, I want the minimum administrator check executed in a database transaction, so that two administrators cannot simultaneously remove each other and leave zero administrators.
30. As a visitor registering on an instance with SMTP configured, I want email to be mandatory, so that my account is always associated with a reachable address.
31. As a visitor registering on an instance with SMTP configured, I want to receive an email containing a secure confirmation link valid for 1 hour, so that I can verify ownership of my email address.
32. As a freshly registered User with an unconfirmed email on an SMTP-enabled instance, I want my session redirected to an email verification prompt whenever I try to navigate the app, so that I cannot access typing runs until verified.
33. As an unconfirmed User viewing the verification prompt, I want clear instructions showing which email address the confirmation was sent to, so that I can check the proper mailbox.
34. As an unconfirmed User whose confirmation link expired or was lost, I want a "Resend confirmation email" button on the verification screen, so that I can request a fresh link.
35. As an unconfirmed User clicking "Resend confirmation email", I want previous confirmation tokens invalidated and a fresh 1-hour token issued, so that only the latest email is active.
36. As an unconfirmed User viewing the verification prompt, I want a log out button, so that I can switch accounts or exit if I registered with the wrong email.
37. As a User clicking a valid confirmation link, I want my email status updated to verified and my browser redirected directly into the app, so that I can start typing immediately.
38. As a User clicking an expired or invalid confirmation link, I want to see a clear error explanation with an option to request a new verification email, so that I know why verification failed.
39. As a visitor registering on an instance without SMTP configured, I want my email address recorded and my account marked verified immediately, so that local and offline installations remain fully usable without an email server.
40. As an existing typist logging into an unconfirmed account on an SMTP-enabled instance, I want to be redirected to the email verification prompt, so that unconfirmed accounts cannot bypass verification by logging out and back in.
41. As a system operator starting Stype for the first time, I want the seeded default admin account created with the Administrator role and pre-confirmed email, so that initial setup is ready out of the box.

## Implementation Decisions

- User Role Representation:
  - Add a role attribute to the User entity with values restricted to `'admin'` and `'user'`.
  - Default the role attribute to `'user'` for self-registered typists.
  - Elevate the seeded default admin user to the `'admin'` role upon database startup.
  - Include the role attribute in session validation and locals user objects so routing guards can inspect permissions without secondary queries.

- Email Verification State & Token Persistence:
  - Add a boolean flag indicating whether the user's email address is confirmed.
  - For the default seeded user and any user created directly by an Administrator, initialize the confirmation flag to true.
  - Create a dedicated database entity for Email Confirmation Tokens containing a primary key identifier, a foreign key reference to the user identifier with cascading delete on user removal, a secure token hash (SHA-256), a creation timestamp, and an expiration timestamp.
  - Set the token lifespan to 1 hour from creation.
  - Enforce a strict one-active-token rule per user by purging prior unused confirmation tokens when generating a new token.

- SMTP-Conditional Registration Lifecycle:
  - Check for the existence of SMTP configuration in the environment during registration and token issuance.
  - If SMTP configuration is present, set the confirmation flag to false on signup, generate an Email Confirmation Token, transmit the verification link via SMTP, and create the user session.
  - If SMTP configuration is absent, set the confirmation flag to true immediately upon registration and log a note to the server console, keeping local environments frictionless.

- Route Protection & Navigation:
  - Protect `/app/admin/*` routes within the server authentication handle. If an authenticated user's role is not `'admin'`, respond with an HTTP 403 Forbidden status.
  - In the server authentication handle, if an authenticated user's confirmation flag is false and SMTP configuration is active, redirect any request for `/app/*` (except `/app/verify-email`, `/app/confirm-email`, and `/app/logout`) to `/app/verify-email`.
  - Add an administration link to the header user dropdown menu, rendered conditionally only when the authenticated user has the `'admin'` role.

- User Management Interface:
  - Build the user management page at `/app/admin/users`.
  - Present a data table with columns: Display Name, Username, Email, Role badge (`Admin` or `User`), Confirmation badge (`Verified` or `Pending`), and Registration Date.
  - Provide a top toolbar with a search filter input (matching across display name, username, and email in memory or query) and an action button to open the "Create User" dialog.
  - Provide row actions triggering dialog modals for editing user details, resetting password, and deleting the user.

- Domain Invariants & Transactional Concurrency:
  - Enforce the invariant that at least one Administrator must exist at all times.
  - When an Administrator attempts to delete a user or update a user's role:
    1. If the targeted user is currently an Administrator, query the count of total Administrators within an active database transaction.
    2. If the count of Administrators is less than or equal to 1, abort the transaction and return a 400 Bad Request error indicating that the sole administrator cannot be removed or demoted.
    3. If the count is greater than 1, complete the deletion or role update within the same transaction.
  - In the user interface, when an Administrator selects to delete their own account or change their own role to User:
    - Display an explicit warning modal explaining that the action will immediately revoke administrative privileges or terminate their active session.
    - Require explicit confirmation before submitting the action.
    - If the user deletes themselves, terminate their session and redirect to `/app/login`.

- Password Policy & Session Invalidation:
  - Enforce a minimum length of 8 characters on all passwords server-side, applied identically to user registration, administrator-created users, and administrator direct password resets.
  - In the password input dialogs, provide a client-side "Generate random password" helper button that generates a high-entropy string meeting security criteria and populates the password input field.
  - When an Administrator resets a user's password directly, delete all active sessions for that user from the database immediately.

## Testing Decisions

- Definition of a Good Test:
  - Good tests verify external behavior against public HTTP endpoints and UI components, never internal implementation details or private helper functions.
  - Assert on HTTP status codes, redirection targets, cookie states, rendered UI text, and the final state of the database.
  - Tests should survive internal refactorings (such as splitting helper functions or altering internal query builders) as long as behavior is unchanged.

- Modules to Test:
  - **Server Authentication Handle:** Verify that non-admin authenticated users receive a 403 when requesting `/app/admin/users`, that unconfirmed users are redirected to `/app/verify-email` when SMTP is enabled, and that confirmed users and admins pass through freely.
  - **User Management Actions:** Test user creation (successful creation, validation failures for username/email duplicates, password length check), user detail editing (name/email update, role promotion/demotion, email verification toggling), direct password reset (session termination, password change enforcement), and user deletion (cascade verification).
  - **Single Administrator Invariant:** Test that attempting to delete or demote the last remaining Administrator fails with an error and leaves the administrator intact in the database. Test that deleting an administrator succeeds when multiple administrators exist.
  - **Email Confirmation Flow:** Test token generation, 1-hour expiration rejection, successful confirmation updating the user flag, resend mechanics invalidating prior tokens, and auto-confirmation when SMTP is unconfigured.
  - **User Management UI Component:** Test rendering of the user table, search filtering by name/username/email, opening modals, the random password generator button updating the input value, and self-deletion confirmation warnings.

- Prior Art:
  - `src/routes/app/user/page.server.test.ts` and `user-actions.ts`: tests SvelteKit server load and action handlers using an in-memory SQLite database.
  - `src/routes/app/signup/actions.test.ts` and `signup.test.ts`: demonstrates form validation, error responses, cookie creation, and component interaction testing with Testing Library.
  - `src/routes/app/reset-password/actions.test.ts`: demonstrates token lifecycle validation, expiration checks, session invalidation, and password hashing tests.
  - `src/lib/hooks/auth.test.ts`: demonstrates testing SvelteKit server handle routing guards, session verification, and redirect behaviors.

## Out of Scope

- Multi-tenant organizations or granular permission matrices (e.g. passage moderator vs billing manager). Only binary `'admin'` and `'user'` roles are supported.
- Custom email templates or an in-app email template editor.
- Bulk user operations (e.g. bulk user deletion or CSV user import).
- Two-factor authentication (TOTP/WebAuthn).
- User suspension or temporary ban states without deletion.

## Further Notes

- Existing SQLite databases will be migrated on startup via non-destructive `ALTER TABLE` statements in the database initialization routine, defaulting existing typists to the `'user'` role and their existing confirmation state to unconfirmed (or confirmed for the seeded admin).
- The seeded default admin account (`admin` / `admin123`) is automatically upgraded to `'admin'` role and verified email status on initialization to guarantee administrative access on fresh or existing databases.
