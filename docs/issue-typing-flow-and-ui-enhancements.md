---
title: Typing Flow, Inactivity Reset, Passage Selection & UI Polish
status: ready-for-agent
---

## Problem Statement

Typists using Stype encounter several behavioral interruptions, visual shifts, and navigation hurdles during practice sessions:

1. Abandoned typing runs linger indefinitely. If a user walks away or stops typing mid-test, the timers and partially entered keystrokes remain stuck on screen until manually cleared.
2. Layout shifting occurs during active typing. When a test run starts, the top toolbar unmounts entirely, and when Zen Mode is active, the HUD unmounts. Removing these elements from the layout causes the typing card below them to jump abruptly upward.
3. Post-test navigation lacks choice. When completing a passage, the Result Summary only presents a single action that forces the user onto a new passage. Typists who want to drill the same text to improve their speed have no direct retry option.
4. Passage selection is detached from the typing experience. The Passages catalog lists seeded and custom passages with options to edit and delete, but offers no way to select a specific passage to type. Typists must rely on random selection.
5. Visual polish defects distract from typing. Native browser scrollbars look clunky and wide across both light and dark themes. Interactive buttons and links lack pointer cursors. The Result Summary opening animation causes a scrollbar flash due to downward translation, and its stats grid cramps on mobile viewports.
6. The login screen gives insufficient prominence to guest practice. The button to continue as a Guest appears as a standard outline button below the login form, failing to communicate that users can practice immediately without an account.

## Solution

1. Add an Inactivity Reset that automatically resets an in-progress Test Run back to zero on the same passage after 10 seconds without keystrokes.
2. Keep the top toolbar, HUD, and bottom controls mounted in the DOM throughout the test run, transitioning them to zero opacity and disabling pointer events instead of unmounting them.
3. Provide two distinct post-test actions on the Result Summary: Next Passage via the Tab shortcut, and Retry via the Space shortcut.
4. Allow users and guests to launch a test run for any specific passage directly from the Passages catalog using a URL query parameter, clearing the parameter when advancing to the next passage.
5. Eliminate the Result Summary entrance scrollbar flash by using a fade animation without vertical translation, and reduce mobile stats grid spacing.
6. Apply custom thin scrollbars and pointer cursors across all buttons and links globally.
7. Revamp the login screen with a clear divider, a prominent secondary Guest action with an explanatory note, and quick-fill helpers for default credentials.

## User Stories

1. As a typist practicing in Passage Mode, I want the test run to reset automatically if I stop typing for 10 seconds, so that abandoned attempts do not corrupt my timing.
2. As a typist practicing in Timed Mode, I want the test run to reset automatically if I stop typing for 10 seconds, so that pausing does not leave an incomplete countdown on screen.
3. As a typist before entering the first keystroke, I want the 10-second inactivity timer not to run, so that I can review the passage without time pressure.
4. As a typist who triggers an Inactivity Reset, I want the typing area and timer to return to zero on the exact same passage, so that I can restart the test immediately.
5. As a typist viewing the Result Summary, I want the inactivity reset timer to be inactive, so that my post-test results stay on screen as long as I need to inspect them.
6. As a typist starting a test run, I want the top toolbar to fade smoothly to zero opacity without unmounting, so that the typing container does not jump upward.
7. As a typist practicing with Zen Mode enabled, I want the HUD stats to fade smoothly to zero opacity when typing starts without unmounting, so that the layout remains stable.
8. As a typist practicing with Zen Mode disabled, I want the HUD stats to stay visible throughout the test run, so that I can monitor my live speed and accuracy.
9. As a typist resetting a test run with Escape, I want the top toolbar and bottom controls to fade back to full opacity immediately, so that I can change test settings.
10. As a typist completing a test run, I want to see two distinct actions on the Result Summary for retrying the same passage and taking a new passage, so that I can choose whether to drill or rotate.
11. As a typist on the Result Summary screen, I want "Next Passage" to be the primary action, so that I can quickly move to a fresh text.
12. As a typist on the Result Summary screen, I want pressing the Tab key to load the next passage, so that I can continue typing without using a mouse.
13. As a typist on the Result Summary screen, I want "Retry" to be an available secondary action, so that I can practice the same text again.
14. As a typist on the Result Summary screen, I want pressing the Space key to retry the same passage, so that I have a fast keyboard shortcut to restart.
15. As a typist pressing Space on the Result Summary screen, I want page scrolling to be prevented, so that the viewport does not jump downward when activating the shortcut.
16. As a Guest browsing `/passages`, I want a Practice button on each passage card, so that I can choose the exact text I want to practice.
17. As an authenticated User browsing `/app/passages`, I want a Practice button on each passage card, so that I can choose the exact custom or seeded text I want to practice.
18. As a Guest clicking Practice on a passage card, I want to navigate to `/?passageId=<id>`, so that the home typing engine loads that specific passage.
19. As an authenticated User clicking Practice on a passage card, I want to navigate to `/app?passageId=<id>`, so that the authenticated typing engine loads that specific passage.
20. As a typist who loaded a specific passage via query parameter, I want pressing Tab for Next Passage to clear the query parameter from the URL, so that the engine returns to normal passage rotation.
21. As a typist who loaded a specific passage via query parameter, I want pressing Space for Retry to keep the same passage, so that I can drill the chosen text repeatedly.
22. As a typist completing a passage, I want the Result Summary to open without triggering a scrollbar flash, so that the screen transition is clean and flicker-free.
23. As a mobile typist viewing the Result Summary, I want the Speed, Accuracy, and Time cards to display with compact spacing, so that none of the metric values wrap or clip.
24. As a typist using a mouse, I want all buttons, links, and clickable controls across the entire application to display a pointer cursor, so that interactive elements are clearly recognizable.
25. As a typist navigating disabled buttons, I want the cursor to indicate non-interactivity, so that I know the control cannot be clicked.
26. As a typist reading scrollable text or passage lists, I want modern slim scrollbars with a transparent track and rounded thumb, so that browser scrollbars match the application design system.
27. As an unauthenticated Guest landing on the login page, I want a prominent "Continue as Guest" action separated from the form, so that I can jump into typing practice without confusion.
28. As a Guest considering logging in, I want an explanatory note under the Guest button stating that test history is saved locally in the browser, so that I understand how my data is stored.
29. As a developer or tester on the login page, I want quick-fill buttons or clear chips for the default seeded admin credentials, so that logging into the test account requires minimal typing.

## Implementation Decisions

- Inactivity Reset logic:
  - Add an inactivity timer to the typing engine state machine.
  - When typed character length exceeds zero and the test run has not finished, start a 10-second timer.
  - Reset the timer on every valid keystroke.
  - When the timer reaches 10 seconds without input, invoke the engine reset routine to restore typed text, elapsed time, and timeline snapshots to zero on the current passage.
  - Clear the timer when the test finishes or is manually reset.

- Stable layout visibility:
  - Keep the toolbar container permanently in the markup instead of unmounting it. Use CSS classes to transition opacity to zero and disable pointer events when typing is in progress or when the test finishes.
  - Keep the HUD stats container permanently in the markup. When Zen Mode is active, transition its opacity to zero and disable pointer events during typing. When Zen Mode is inactive, keep it visible during typing. Transition HUD opacity to zero when the test finishes and Result Summary displays.
  - Keep bottom controls permanently in markup, transitioning opacity to zero during active typing.

- Result Summary actions:
  - Update the Result Summary component interface to accept both onRetry and onNextPassage callbacks, along with their respective labels and shortcut indicators.
  - Render a primary button for Next Passage and a secondary outline button for Retry.
  - Listen for the Space keydown event when the summary is active, prevent default browser scrolling, and invoke the retry routine.
  - Listen for the Tab keydown event when the summary is active, prevent default focus navigation, and invoke the next passage routine.

- Passage selection via URL query parameter:
  - Add a Practice action to passage cards in both guest and authenticated passage catalog views.
  - The Practice action links to the home typing route for guests and the app typing route for authenticated users, appending `passageId` as a query parameter.
  - In the guest typing view, check for the `passageId` query parameter on mount and during navigation. If present, load the matching passage from the client store.
  - In the authenticated typing server loader, check for the `passageId` parameter. If present and valid for the requesting user, return that passage instead of a random selection.
  - When the user triggers Next Passage, clear the `passageId` parameter from the URL using client-side navigation replacement without causing a full page reload, then pick a random passage.
  - When the user triggers Retry, preserve the current passage.

- Result Summary animation and mobile spacing:
  - Replace the sliding entrance animation on the Result Summary container with a pure fade animation to prevent content from temporarily translating past the container boundary.
  - Adjust the stats grid gap on compact viewports to compact spacing and reduce card padding so that three-column metrics fit without wrapping text.

- Global scrollbar and cursor styling:
  - In the global base styles, declare modern thin scrollbar rules alongside WebKit pseudo-element rules for broad browser support. Set the thumb color to match border tokens and the track to transparent.
  - In the global base styles, declare cursor pointer for buttons, links, and elements with button roles. Ensure disabled elements use not-allowed or default pointers.

- Login screen layout revamp:
  - Redesign the login card layout to place a visual divider below the credentials form.
  - Render the "Continue as Guest" action as a full-width secondary button with an icon and an explanatory caption about local browser storage.
  - Restyle the default credentials container with interactive quick-fill chips that populate the username and password fields when clicked.

## Testing Decisions

- Test user-visible behaviors through the highest available seam, testing rendered components and route pages with user events rather than testing internal state variables.
- Typing engine seam:
  - Use mock timers to verify that an active test run in both Passage and Timed modes resets typed text and elapsed time to zero after 10 seconds of inactivity.
  - Verify that the inactivity timer does not fire before the first keystroke or after test completion.
  - Verify that the top toolbar, HUD, and controls retain their DOM nodes with zero opacity and disabled pointer events while typing.
  - Verify that completing a test run renders both Next Passage and Retry actions on the Result Summary.
  - Verify that pressing Space on the Result Summary triggers the retry callback and prevents default scrolling, while pressing Tab triggers the next passage callback.
- Passage selection seam:
  - Verify that passage cards in both guest and authenticated views render Practice links with the expected query parameter.
  - Verify that passing `passageId` to the guest typing view loads the specified passage.
  - Verify that passing `passageId` to the authenticated page loader returns the specified passage when valid.
  - Verify that advancing to the next passage clears the query parameter from the URL.
- Login screen seam:
  - Verify that the login view renders the divider, the prominent Guest button linking to `/`, and the credentials helper.
- Styling seam:
  - Verify that the global stylesheet contains the expected cursor pointer rules and scrollbar definitions.

## Out of Scope

- User account registration and signup flows (scheduled for subsequent updates).
- User profile updates including email, display name, and password changes.
- Desktop and mobile native application packaging.
- Multiplayer or real-time competitive typing modes.

## Further Notes

- Inactivity Reset is recorded in the project domain model glossary (`CONTEXT.md`).
- All keyboard shortcuts (Escape to restart, Tab for next passage, Space for retry) must call `preventDefault` to avoid conflicting with standard browser navigation and page scrolling.
