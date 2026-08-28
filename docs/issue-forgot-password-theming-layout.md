---
title: Forgot Password Recovery, Theme Color Standardization, Light Mode Visibility & Layout Consistency
status: ready-for-agent
---

## Problem Statement

Typists using Stype encounter several usability, accessibility, and credential management barriers:

1. When an authenticated typist forgets their password, there is no self-service recovery mechanism. Typists locked out of their accounts cannot regain access without manual database intervention.
2. In light mode, essential typing and configuration surfaces have poor visual contrast. Specifically, the typing engine uses dark-mode hardcoded background and text colors where correctly typed letters turn nearly white against light backgrounds, and select inputs feature near-invisible borders with a translucent dropdown menu that blurs into the background.
3. Content containers vary arbitrarily in maximum width across pages. The header and typing interface span wide layouts while history and statistics pages contract to medium widths, and settings and user details pages narrow even further. Navigating across tabs causes distracting horizontal layout jumps.
4. The authenticated user dropdown menu contains a redundant "User Details" entry while the "Logged in as [username]" item beneath it remains inert text, cluttering the top of the menu and missing a direct interaction pattern.
5. The application relies on scattered, raw utility color classes rather than a centralized, semantic color token system defined in the theme stylesheets, leading to theme drift and poor contrast in non-dark modes.

## Solution

1. Provide a secure Password Reset Request and redemption flow. Typists can submit either their username or registered email at `/app/forgot-password`. If a matching account exists, a time-limited single-use Password Reset Token is created and sent via SMTP (or logged to the server console in local environments lacking SMTP configuration). A generic confirmation message appears regardless of account presence to prevent user enumeration.
2. Provide a Password Reset completion screen at `/app/reset-password?token=...`. Redeeming a valid token updates the user password, terminates all active sessions for that user, starts a fresh session immediately, and redirects the typist directly to the main typing interface. Expired or invalid tokens show clear error feedback and a link to request a fresh token.
3. Introduce a "Forgot password?" link on the login screen aligned with the password field label.
4. In the user navigation dropdown, remove the redundant "User Details" entry and transform "Logged in as [username]" into the primary clickable link navigating directly to the user details page.
5. Standardize content container widths to a uniform maximum width matching the header across both guest and authenticated routes for History, Statistics, Passages, Settings, and User Details pages, eliminating layout shifts between navigation transitions.
6. Centralize all color styling into semantic theme tokens in `app.css` for both light and dark themes, including dedicated tokens for success states, typing engine character states (untyped, correct, error, and caret), and form borders.
7. Resolve light mode visibility defects by converting the typing surface to use theme tokens, giving select triggers solid surface fills and crisp borders, and making select dropdown content fully opaque with clear item highlight states.

## User Stories

1. As an unauthenticated User who cannot recall my password, I want a "Forgot password?" link on the login page, so that I can easily find the recovery flow.
2. As a User scanning the login form, I want the "Forgot password?" link placed in line with the password label, so that it is positioned where I look when entering credentials.
3. As a User navigating to `/app/forgot-password`, I want a dedicated form where I can enter either my username or my registered email, so that I can initiate recovery using whichever identifier I remember.
4. As a User submitting a Password Reset Request with an existing email, I want a time-limited Password Reset Token generated and sent to my registered email address, so that I can securely reset my credentials.
5. As a User submitting a Password Reset Request with an existing username, I want the system to find my account and deliver the reset link to my registered email address, so that I can recover access even if I forgot which email I used.
6. As a User submitting a Password Reset Request for an account that does not exist, I want to see the same positive confirmation message, so that attackers cannot probe the system to discover registered accounts.
7. As a User requesting a password reset multiple times, I want any previously issued unused tokens to be invalidated when a new token is generated, so that only the latest reset link remains valid.
8. As a User receiving a reset link, I want the token to expire after 15 minutes, so that stale links cannot be exploited if an inbox is compromised later.
9. As a developer running Stype without SMTP configured, I want the generated reset link logged to the server console, so that password recovery can be tested and used in self-hosted or offline environments without external mail dependencies.
10. As an administrator with SMTP credentials configured via environment variables, I want reset emails sent via standard email delivery, so that typists receive real emails in production.
11. As a User clicking a valid reset link, I want to arrive at `/app/reset-password` with my token prefilled, so that I can set a new password immediately.
12. As a User setting a new password, I want to enter a new password and confirm it in separate fields, so that I do not lock myself out with an accidental typo.
13. As a User entering mismatched passwords on the reset screen, I want clear error feedback preventing submission, so that my passwords match before saving.
14. As a User entering a new password shorter than 8 characters, I want validation feedback rejecting the submission, so that security standards match registration requirements.
15. As a User attempting to use an expired or invalid reset token, I want to see an explanatory error state with a direct button to request a new link, so that I am never stranded on a broken page.
16. As a User submitting a valid new password with a valid token, I want all of my existing active sessions to terminate immediately, so that any compromised sessions are cleanly severed.
17. As a User completing a successful password reset, I want a fresh session created immediately and to be redirected straight to the typing test, so that I can continue practicing without an extra login step.
18. As a User who updated my password via reset, I want subsequent login attempts to succeed with the new password and fail with the old password, so that credential updates are fully enforced.
19. As an authenticated User viewing the navigation dropdown, I want the top item to read "Logged in as [username]" as an interactive link, so that clicking my identity takes me directly to my user details.
20. As an authenticated User viewing the navigation dropdown, I want the redundant "User Details" label removed, so that the menu remains uncluttered.
21. As a typist navigating between Passages, History, Stats, Settings, and User Details, I want all page content containers to share the exact same maximum container width, so that the layout does not jump horizontally between pages.
22. As a typist browsing guest pages (History, Stats, Passages, Settings), I want the content width to match the header width identically to authenticated pages, so that visual alignment is consistent regardless of authentication state.
23. As a typist using light mode, I want untyped passage text to have clear, readable contrast against the typing container background, so that I can read upcoming words effortlessly.
24. As a typist using light mode, I want correctly typed characters to display in high-contrast dark text rather than near-white text, so that completed words remain visible.
25. As a typist using light mode, I want incorrectly typed characters to display with unmistakable error highlighting, so that I immediately notice mistakes.
26. As a typist using light mode, I want the active typing caret to stand out distinctly on the current character, so that my current typing position is obvious.
27. As a typist using light mode, I want the typing test toolbar, HUD metrics, and bottom control buttons to adapt to the light theme surface rather than appearing as dark pills, so that the entire typing interface feels cohesive.
28. As a typist configuring settings in light mode, I want Select input triggers to have distinct borders and solid backgrounds, so that input controls do not blend invisibly into the card background.
29. As a typist opening a Select dropdown in light mode, I want the dropdown menu to be fully opaque with a clear border, so that options are crisp and legible without translucent blur artifacts.
30. As a typist navigating Select options, I want focused and highlighted items to have clear, high-contrast background and text colors, so that keyboard and mouse selection is intuitive.
31. As a designer or maintainer, I want all color shades across the application defined via semantic CSS variables in `app.css` rather than scattered utility classes, so that themes can be adjusted globally and consistently.
32. As a typist viewing Result Summary and charts in light mode, I want speed lines, accuracy lines, grid lines, and badges to render with adequate contrast, so that performance metrics are readable in both themes.

## Implementation Decisions

- Password Reset Token Persistence:
  - Add a dedicated database entity for Password Reset Tokens containing a primary key identifier, a reference to the user identifier with cascading delete on user removal, a secure token hash, an expiration timestamp, and a creation timestamp.
  - When persisting a token, generate a high-entropy random token using cryptographic utilities. Store the hashed token in the database to prevent token exposure in database snapshots, and supply the raw token only in the single-use reset URL.
  - When generating a new token for a user, purge all existing unused reset tokens for that user to ensure a strict one-active-token rule.

- Reset Token Delivery Abstraction:
  - Create a server-side delivery utility that checks for SMTP configuration environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`).
  - When SMTP environment variables are present, transmit the reset link through standard SMTP transport with plaintext and HTML fallback templates.
  - When SMTP environment variables are absent, log the formatted reset URL to the server console output, allowing local and offline test flows to complete without external services.

- Password Reset Request & Confirmation Actions:
  - Implement the request form handling at `/app/forgot-password`.
  - Look up typists by matching either the username or registered email.
  - If a user record is found, generate the token and trigger the delivery utility.
  - Always respond with a generic success status indicating that if an account matched, instructions have been dispatched.
  - Implement token redemption at `/app/reset-password`.
  - Validate that the token exists, is unexpired, and matches the stored hash.
  - Enforce password confirmation equality and a minimum password length of 8 characters.
  - Update the user password hash with salt derivation matching existing authentication hashing.
  - Invalidate the redeemed reset token.
  - Delete all existing session records for that user in the database.
  - Issue a new session record and cookie for the user, redirecting with immediate access to `/app`.

- Navigation Dropdown Restructuring:
  - In the shared application layout header, update the user dropdown menu.
  - Remove the separate "User Details" label element.
  - Wrap the "Logged in as [username]" menu item in an interactive link pointing to `/app/user`.
  - Ensure keyboard focus, hover states, and truncated usernames function seamlessly.

- Layout Width & Padding Alignment:
  - Update the main container wrappers for History, Statistics, Passages, Settings, and User Details pages across both guest routes (`/history`, `/stats`, `/passages`, `/settings`) and authenticated routes (`/app/history`, `/app/stats`, `/app/passages`, `/app/settings`, `/app/user`).
  - Standardize all content containers to use `max-w-5xl` with `px-6 py-8` (matching the layout header max-width and padding), replacing disparate `max-w-3xl` and `max-w-4xl` containers.

- Theme Architecture in `app.css`:
  - Extend `:root` (light mode) with semantic tokens:
    - `--success` and `--success-foreground` for positive confirmations, stats, and badges.
    - `--typing-untyped` for unentered passage characters, balanced for high readability in light mode.
    - `--typing-correct` for typed characters matching passage text.
    - `--typing-error` for incorrect keystrokes.
    - `--typing-caret` for active caret focus.
    - Refine `--input` and `--border` in `:root` to ensure inputs maintain crisp 3:1 contrast against light card backgrounds.
  - Extend `.dark` with the corresponding dark-mode values for each semantic token.
  - Expose all custom tokens within `@theme inline` in `app.css` so Tailwind classes (`text-typing-untyped`, `text-typing-correct`, `bg-typing-caret`, `bg-success`, etc.) are natively generated and available across components.

- Component Contrast Refactoring:
  - Refactor the typing engine to eliminate hardcoded dark palette classes. The typing container adapts using theme surface and border tokens (`bg-card`, `border-border`).
  - Untyped text uses `--typing-untyped`. Correct text uses `--typing-correct`. Incorrect text uses `--typing-error`. Caret uses `--typing-caret`.
  - Toolbar, HUD, and bottom controls in the typing engine use theme tokens (`bg-muted/50`, `text-muted-foreground`, `hover:text-foreground`, `hover:bg-secondary`).
  - Refactor Select trigger to use solid `bg-background border border-input shadow-xs` in light mode.
  - Refactor Select content to use opaque `bg-popover border border-border shadow-md` without translucent backdrop filters.
  - Refactor Select item highlights to use `data-highlighted:bg-secondary data-highlighted:text-secondary-foreground`.
  - Update Result Summary and Timeline charts to use `--success` and theme tokens rather than raw palette colors.

## Testing Decisions

- High-Seam Testing Principle:
  - All tests should exercise external behavior through public component properties, rendered DOM assertions, and server form action invocations. No test should verify internal helper functions or private state variables.

- Seam 1: Server Form Actions & Authentication Seam
  - Test `/app/forgot-password` action with existing email, existing username, and nonexistent user, verifying the generic success response and token generation.
  - Test `/app/reset-password` action with valid tokens, expired tokens, and invalid tokens.
  - Verify that successful password reset terminates previous user sessions, creates a new session cookie, hashes the new password, and redirects to `/app`.
  - Verify that subsequent login succeeds with the new password and fails with the old password.
  - Prior art: `src/routes/app/login/actions.test.ts`, `src/routes/app/signup/actions.test.ts`, `src/routes/app/user/page.server.test.ts`.

- Seam 2: Component DOM & Interaction Seam
  - Test login page rendering to verify the "Forgot password?" link exists, points to `/app/forgot-password`, and is aligned with the password label.
  - Test user navigation dropdown to verify "Logged in as [username]" links to `/app/user` and the old "User Details" label is absent.
  - Test typing engine rendering across light and dark theme classes to ensure character and container tokens apply correctly without hardcoded dark palette utilities.
  - Test Select trigger and content primitives to ensure opaque popover classes, border tokens, and highlight attributes are present.
  - Prior art: `src/routes/app/login/login.test.ts`, `src/routes/layout.test.ts`, `src/lib/components/TypingEngine.test.ts`.

- Seam 3: Theme Stylesheet & Layout Geometry Seam
  - Test `src/app.css` to verify the declaration of new semantic tokens (`--success`, `--typing-*`) in both `:root` and `.dark` blocks, and their registration in `@theme inline`.
  - Test page containers across guest and authenticated routes to verify uniform `max-w-5xl` constraints.
  - Prior art: `src/lib/design-system.test.ts`.

## Out of Scope

- Native desktop and mobile application packages (deferred to subsequent milestone).
- Social OAuth authentication (GitHub, Google, etc.).
- Multi-factor authentication (TOTP or WebAuthn).
- User account deletion or data purge flows.
- Custom user-uploaded avatar images.

## Further Notes

- The database migration for the new Password Reset Tokens table must follow the idempotent table creation pattern used across the project to maintain seamless SQLite initialization during test runs and server starts.
- All email communications must format URLs using the active host origin determined by the incoming request event headers.
