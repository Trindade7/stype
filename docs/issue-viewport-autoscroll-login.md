---
title: Viewport Fitting, Auto-scrolling Typing Area & Guest Login Navigation
status: ready-for-agent
---

## Problem Statement

Users and Guests of Stype encounter friction with navigation, screen framing, and long text reading during typing sessions:

1. **No Guest Escape Path on Login**: When an unauthenticated Guest navigates to the login screen (`/app/login`), there is no explicit button or link to return directly to Guest practice mode (`/`). Users must rely on browser back buttons or manually editing the URL.
2. **Page Overflow and Viewport Shifting**: On the main typing screens (`/` and `/app`), longer passages or smaller viewport heights cause the entire browser window to scroll. This pushes the header, HUD metrics, and bottom action controls out of view, disrupting the user's fixed baseline focus during speed tests.
3. **Lack of Active Line Visibility for Long Passages**: When passage text wraps onto multiple lines and exceeds the visible container height, the typing container does not automatically scroll to keep the active character and line in view. Typists are forced to type blind off-screen or manually scroll while actively testing.
4. **Missing Scroll Preference Control**: Different typists prefer different viewport tracking behaviors (such as fixed vertical line centering vs. page step scrolling vs. static manual layouts), but there is currently no setting to configure scroll behavior.

## Solution

Stype will implement complete viewport containment, automatic active line tracking with user-configurable scroll modes, and direct guest navigation on the login screen:

1. **Guest Mode Action on Login Screen**: Add a full-width secondary button labeled "Continue as Guest" directly beneath the "Log in" button on `/app/login` that routes immediately to `/`.
2. **Locked Viewport Layout**: Lock the typing test routes (`/` and `/app`) to `100dvh` with `overflow-hidden`. The header, HUD, toolbar, and controls remain fixed in place, while the typing area container expands flexibly (`flex-1 min-h-0`) to utilize available vertical space.
3. **Auto-scrolling Typing Area**: Automatically scroll the passage container as the user types so that the current active character and line remain visible.
4. **Configurable Scroll Mode Setting**: Add a `Scroll Mode` user setting supporting three modes:
   - `center` (default): Vertically centers the active line in the typing container once typing passes the midpoint.
   - `step`: Scrolls down in increments when the cursor reaches the bottom visible threshold.
   - `manual`: Disables automatic scrolling for users who prefer static container behavior.
   Persist this setting in both the SQLite database (`userSettings`) for authenticated Users and the Local Store (`GuestSettings`) for Guests, exposed in `SettingsForm` under "Display & Focus".
5. **Contained Result Summary**: Ensure the `ResultSummary` view cleanly scrolls internally (`overflow-y-auto`) if its content exceeds available viewport height on compact screens, preserving the locked viewport layout without outer scrollbars.

## User Stories

1. As an unauthenticated Guest on the login page, I want a "Continue as Guest" button, so that I can quickly return to typing practice without logging in.
2. As a User who accidentally navigated to the login page, I want an obvious secondary action to return to the home screen, so that I do not need to use the browser back button.
3. As a User, I want the "Continue as Guest" button to be styled with an outline variant, so that the primary "Log in" action remains visually distinct.
4. As a Guest on the home page (`/`), I want the entire page to fit within the browser viewport (`100dvh`), so that no outer page scrollbars appear.
5. As an authenticated User on the app page (`/app`), I want the entire page to fit within the browser viewport (`100dvh`), so that the layout never shifts or scrolls vertically.
6. As a User practicing typing, I want the navigation header, HUD metrics, and bottom control buttons to remain stationary, so that my visual frame of reference does not move while typing.
7. As a User typing a multi-line passage, I want the active line currently being typed to remain visible at all times, so that I do not type into invisible off-screen space.
8. As a User with Scroll Mode set to `center`, I want the typing text container to smoothly center the active line vertically as I advance past the middle of the box, so that my eye level stays consistent throughout the test.
9. As a User with Scroll Mode set to `step`, I want the text container to scroll down in steps when my cursor approaches the bottom visible boundary, so that upcoming lines appear before I reach them.
10. As a User with Scroll Mode set to `manual`, I want the text container not to scroll automatically, so that I can manage scrolling manually if desired.
11. As a new Guest or User, I want `center` to be the default Scroll Mode, so that long passages are immediately readable and track smoothly out of the box.
12. As a Guest, I want to configure my Scroll Mode in Settings, so that my preference is saved to my browser's Local Store.
13. As an authenticated User, I want to configure my Scroll Mode in Settings, so that my preference is saved to my account record in the database.
14. As a Guest or User on the Settings page, I want to select Scroll Mode using a design-system select component under "Display & Focus", so that it is logically grouped with other visual preferences.
15. As a User backspacing across lines to fix past errors, I want the auto-scrolling to track backward and keep the active line in view, so that I can see the text I am correcting.
16. As a User restarting a test run with Escape or Tab, I want the typing container scroll position to immediately reset to the top, so that the new passage is presented from the beginning.
17. As a User finishing a test run on a compact screen or mobile viewport, I want the Result Summary to scroll cleanly inside its container if needed, so that the overall application viewport remains locked without page layout jumping.

## Implementation Decisions

- **Login Screen Guest Navigation**:
  - Add a full-width button linking to `/` inside the login card content area in `src/routes/app/login/+page.svelte`.
  - Render with `variant="outline"` and label "Continue as Guest".

- **Full Viewport Framing for Typing Routes**:
  - Constrain the root typing page (`/`) and authenticated typing page (`/app`) to `h-screen` / `h-[100dvh]` with `overflow-hidden`.
  - Structure the layout with a fixed header, a stationary HUD / Toolbar section, a flexible typing box (`flex-1 min-h-0`), and stationary bottom controls.
  - Apply `overflow-y-auto` to the typing container or passage wrapper so text scrolling is strictly isolated within the typing card.

- **Typing Engine Auto-scrolling Mechanism**:
  - In `TypingEngine.svelte`, maintain a reference to the active character span or cursor position.
  - On every keystroke or cursor advancement:
    - If `scrollMode === 'center'`: calculate the active element's vertical offset relative to the scrolling container and adjust `scrollTop` to keep the active line centered within the visible container height.
    - If `scrollMode === 'step'`: inspect whether the active element has approached the bottom visible threshold (e.g. within one line height of the bottom edge) and scroll down by a stepped increment (e.g. 1 to 2 line heights).
    - If `scrollMode === 'manual'`: perform no automated scroll adjustments.
  - Reset `scrollTop` to `0` whenever `reset()` or `loadNewPassage()` is invoked.

- **Contained Result Summary**:
  - Wrap the `ResultSummary` view inside an `overflow-y-auto` container with `max-h-full` inside `TypingEngine.svelte`.
  - On smaller screens where charts and cards exceed viewport height, internal scrolling within the card allows inspecting the full summary without expanding the root page.

- **Schema and Persistence Layer**:
  - Database schema (`src/lib/server/db/schema.ts`):
    - Extend `userSettings` table with `scrollMode: text('scroll_mode').$type<'manual' | 'center' | 'step'>().notNull().default('center')`.
  - Local storage (`src/lib/localStore.ts`):
    - Extend `GuestSettings` interface with `scrollMode: 'manual' | 'center' | 'step'`.
    - Set default `scrollMode: 'center'` in `DEFAULT_GUEST_SETTINGS`.
  - Update settings database helpers (`src/lib/server/db/settings.ts`) and API / form actions to parse, validate, and persist `scrollMode`.

- **Settings UI**:
  - Add a "Scroll Mode" select dropdown in `SettingsForm.svelte` under the "Display & Focus" card with options for Centered (Default), Step Scroll, and Manual.
  - Bind `scrollMode` across both authenticated server actions and Guest local store submission flows.

## Testing Decisions

### What Makes a Good Test

Tests must verify external behaviors and contracts through rendered components, user interactions, and persistence interfaces, without coupling to internal private state.

### Modules and Seams to Test

1. **Login View Contract (`src/routes/app/login/login.test.ts`)**:
   - Verify that the login card renders the "Continue as Guest" button with `href="/"`.
   - Verify button accessibility, styling variant, and positioning relative to the login form.

2. **Typing Engine & Viewport Layout Contract (`src/lib/components/TypingEngine.test.ts`, `src/routes/page.test.ts`, `src/routes/app/page.test.ts`)**:
   - Verify that typing pages enforce viewport fitting classes (`h-screen` / `100dvh`, `overflow-hidden`).
   - Verify that the typing container accepts and respects `scrollMode` (`manual`, `center`, `step`).
   - Verify that active keystrokes trigger appropriate container scrolling calculations for each mode.
   - Verify that `reset()` and passage navigation resets container scroll position to `0`.
   - Verify that `ResultSummary` renders inside an internally scrollable container when finished.

3. **Settings Form and Persistence Seams (`src/lib/components/SettingsForm.test.ts`, `src/lib/localStore.test.ts`, `src/lib/server/db/settings.test.ts`, `src/routes/app/settings/page.server.test.ts`)**:
   - Verify that `SettingsForm` renders the Scroll Mode selector with correct options and defaults.
   - Verify that saving settings updates `scrollMode` in `localStore` for Guests and in `userSettings` for authenticated Users.
   - Verify that server form actions validate and persist `scrollMode` correctly.

### Prior Art in Codebase

- Component testing with `@testing-library/svelte` in `src/lib/components/TypingEngine.test.ts` and `src/lib/components/SettingsForm.test.ts`.
- Route view contract tests in `src/routes/app/login/login.test.ts` and `src/routes/page.test.ts`.
- LocalStore unit tests in `src/lib/localStore.test.ts`.
- Database settings integration tests in `src/lib/server/db/settings.test.ts`.

## Out of Scope

- Horizontal single-line ticker-tape typing mode.
- Custom user-defined pixel scroll padding controls.
- Smooth scroll animation speed sliders.
- Native mobile app wrapping (Capacitor/Cordova).

## Further Notes

- The `center` scroll mode should use smooth or direct vertical scroll adjustments that do not cause cursor jitter or lag behind high-speed typing (100+ WPM).
- Ensure virtual on-screen keyboards on mobile devices do not occlude the centered active line.
