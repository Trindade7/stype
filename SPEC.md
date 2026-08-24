# Specification: Stype Typing Test Application

## Problem Statement

Typists and developers wanting to measure and improve their typing speed need a distraction-free typing test that runs locally or on a private server. Existing tools often require cloud connectivity, third-party user tracking, heavy ad-laden interfaces, or complex setups. Users need a clean, responsive interface that works equally well on desktop and mobile browsers, starts tracking the instant typing begins, calculates speed and accuracy precisely, and preserves their history and custom texts in a self-contained local database.

## Solution

Stype is a self-hosted browser-based typing test application built with SvelteKit, shadcn-svelte, Bootstrap Icons, and SQLite with Drizzle ORM. It provides Passage Mode and Timed Mode typing tests with instant start on the first keystroke, real-time error highlighting, live HUD feedback with Zen Mode, detailed post-test result summaries with timeline speed charts, lifetime statistics tracking, custom passage management, and local session-based authentication with a pre-seeded default user account.

## User Stories

1. As a user, I want to log in using a username and password, so that my typing history, custom passages, and settings remain isolated to my account.
2. As a new user on a fresh installation, I want a pre-seeded default administrator account, so that I can immediately access the app without manual database setup.
3. As an authenticated user, I want to log out securely, so that my active session terminates on the server and client.
4. As a user, I want the typing test timer to start automatically on my first keystroke, so that I do not need to click a start button.
5. As a user, I want to type in Passage Mode, so that I can practice completing an entire target passage from start to finish.
6. As a user, I want the timer in Passage Mode to count upward from zero, so that I see my total elapsed time upon finishing.
7. As a user, I want to type in Timed Mode with configurable durations of 15, 30, or 60 seconds, so that I can test sprint speeds under time constraints.
8. As a user, I want the timer in Timed Mode to count down to zero and conclude the test run automatically, so that I receive an accurate fixed-duration speed score.
9. As a user, I want real-time visual feedback for every character typed, so that I immediately know whether each character was correct or incorrect.
10. As a user, I want incorrect characters highlighted in red without blocking my cursor, so that I can continue typing naturally or backspace to fix mistakes.
11. As a user, I want to backspace over typed characters, so that I can correct past errors before completing the passage.
12. As a user, I want to see a live HUD displaying current WPM, accuracy percentage, and timer during the test run, so that I can monitor my performance in real time.
13. As a user, I want to toggle Zen Mode on, so that live HUD metrics are hidden during the test to eliminate visual distraction.
14. As a user, I want my net WPM calculated as `(correct_characters / 5) / elapsed_minutes`, so that uncorrected errors do not artificially inflate my score.
15. As a user, I want my accuracy calculated as `(correct_keystrokes / total_keystrokes) * 100`, so that all mistyped attempts and corrections are accurately reflected.
16. As a user, I want a Result Summary displayed immediately upon test completion, so that I can review my final WPM, accuracy, total elapsed time, and character counts.
17. As a user, I want a second-by-second timeline chart on the Result Summary, so that I can analyze how my typing speed varied throughout the run.
18. As a user, I want my completed test runs stored in the database automatically, so that I can track my improvement over time.
19. As a user, I want to practice with pre-seeded passages categorized by length (short, medium, long), so that I have immediate variety without creating my own texts.
20. As a user, I want to create custom passages in the app, so that I can practice specific literature, code snippets, or custom drills.
21. As a user, I want to edit or delete my custom passages, so that I can keep my passage library current.
22. As a user, I want to filter passages by length preference, so that test runs pick random passages matching my desired length.
23. As a user, I want a Lifetime Stats page, so that I can view my total tests completed, average WPM, peak WPM, and average accuracy.
24. As a user, I want a Test History page listing past test runs with filtering by date and mode, so that I can inspect previous results.
25. As a user, I want to switch between Dark, Light, and System themes, so that the interface matches my visual preference.
26. As a user, I want a clean monospace typography layout for the passage display, so that character alignment and cursor positions are legible.
27. As a mobile user, I want the typing interface to support virtual on-screen keyboards without intrusive autocorrect or capitalization, so that I can complete tests on mobile devices.
28. As a user, I want a keyboard shortcut and a UI button to quickly restart a test run or load a new passage, so that I can rapidly repeat tests.

## Implementation Decisions

### Modules and Architectural Boundaries

1. **Typing Engine Core**:
   - Pure state machine managing test run lifecycle (idle, active, completed).
   - Processes keystroke inputs, maintains cursor index, marks character statuses (pending, correct, incorrect, extra), and records second-by-second timeline snapshots.
   - Calculates Net WPM and Keystroke Accuracy.

2. **Authentication and Session Management**:
   - Server-side session verification implemented in modular hooks inside `src/lib/hooks/` and composed in `src/hooks.server.ts`.
   - Populates user and session data on incoming request context.
   - Guarded routes redirect unauthenticated users to the login route.
   - Password hashing and verification using secure cryptographic primitives.

3. **Database and Persistence Layer**:
   - SQLite database accessed through Drizzle ORM.
   - Tables:
     - `users`: User accounts with credentials and timestamps.
     - `sessions`: Active login sessions with expiration timestamps.
     - `passages`: Built-in seeded passages and user-created custom passages with length categorization (short, medium, long).
     - `test_runs`: Completed test records storing mode, duration, WPM, accuracy, character breakdowns, and JSON timeline snapshots.
     - `user_settings`: User preferences for default test mode, timer duration, passage length, Zen Mode, and theme.
   - Automatic seeding on startup creates the default admin user and initial passage collection if not already present.

4. **UI and Presentation**:
   - Built with SvelteKit and Svelte 5 runes (`$state`, `$derived`, `$props`).
   - Styled using shadcn-svelte components with Tailwind CSS.
   - Iconography using Bootstrap Icons via `<i class="bi bi-[icon-name]"></i>`.
   - Passage display rendered in monospace with distinct visual styles for pending, correct, and incorrect characters, plus an active cursor indicator.
   - Dual-mode input capture: underlying transparent focused text input with `autocorrect="off"`, `autocapitalize="none"`, `autocomplete="off"`, and `spellcheck="false"`.

### API and Data Contracts

- **Authentication Actions**: Form actions for `/login` and `/logout`.
- **Passage Management Endpoints**: Endpoints and form actions to list, create, update, and delete custom passages.
- **Test Run Submission**: Endpoint to submit completed test run data, validating metrics and storing timeline snapshots.
- **Settings Endpoint**: Actions to update user preferences in `user_settings`.

## Testing Decisions

### What Makes a Good Test

Tests must verify external behavioral contracts and outcomes, not internal implementation structures. Tests should execute complete input-to-output workflows and avoid mocking domain logic.

### Seams and Scope

1. **Typing Engine Core (Functional Seam)**:
   - Evaluates the typing state machine against various keystroke sequences, backspacing patterns, and timer intervals.
   - Asserts Net WPM, Accuracy, character states, and completion conditions match the domain definitions.
2. **Server and Session Hooks (Integration Seam)**:
   - Evaluates authentication workflows, session resolution via server hooks, route access controls, passage CRUD, and test run persistence against a test SQLite database.
3. **Component and UI Interaction (End-to-End Seam)**:
   - Tests browser keyboard input handling, visual error styling, HUD updates, Zen Mode toggling, and result summary rendering.

## Out of Scope

- Multi-player real-time head-to-head racing.
- Global public leaderboards.
- Third-party OAuth providers (Google, GitHub).
- Audio typing sound effects packs.
- Third-party cloud sync or telemetry.

## Further Notes

- The database file is stored locally in the environment, making the entire application self-contained.
- Default administrator credentials (`admin` / `admin123`) should be seeded on initial database boot.
