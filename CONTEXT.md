# Stype

A lightweight typing test application for web, desktop, and mobile for practicing and tracking typing speed and accuracy.

## Language

**User**:
An authenticated typist identified by a unique username and email, with a display name, who owns test history, custom passages, and settings.
_Avoid_: Account, member, profile

**Administrator**:
A user with elevated permissions to manage other users and server configuration.
_Avoid_: Server manager, superuser, operator, mod, root


**Session**:
An active authenticated login state represented by a secure session token stored in the database and client cookie.
_Avoid_: Auth token, login, connection

**Passage**:
The target text presented to the user to type during a test run, categorized by length (short, medium, long) and source (seeded or custom).
_Avoid_: Prompt, quote, snippet, text

**Custom Passage**:
A user-created passage stored in the local database alongside seeded passages.
_Avoid_: User text, manual passage, imported snippet

**Passage Mode**:
A test mode where the user types an entire passage while the timer counts up until completion.
_Avoid_: Full text mode, count up mode

**Timed Mode**:
A test mode with a fixed duration where the timer counts down to zero and ends the test automatically.
_Avoid_: Time limit mode, countdown mode

**Test Run**:
A single typing test session against a passage that records speed, accuracy, and elapsed time.
_Avoid_: Attempt, session, game, trial

**Result Summary**:
The post-test performance overview displayed upon completing a test run, including WPM, accuracy, errors, and speed timeline.
_Avoid_: Scorecard, test report, summary screen

**Lifetime Stats**:
Aggregated statistics for a user across all completed test runs, including average WPM, peak WPM, and total tests taken.
_Avoid_: Total stats, profile stats, aggregate metrics

**Timeline Snapshot**:
A time-series data point recorded during a test run tracking speed and error rate per second for post-test charting.
_Avoid_: Stat point, graph sample, timeline tick

**WPM**:
Net words per minute, calculated as `(correct_characters / 5) / elapsed_minutes`.
_Avoid_: CPM, typing speed, gross WPM, raw WPM

**Accuracy**:
The percentage of correct keystrokes out of total keystrokes entered, calculated as `(correct_keystrokes / total_keystrokes) * 100`.
_Avoid_: Precision, score, correctness percentage

**Keystroke**:
A single character input event registered during a test run, tracked as either correct or incorrect.
_Avoid_: Keypress, input event, stroke

**Settings**:
Stored user preferences that control test behavior such as timer direction, passage selection, Zen Mode, and Scroll Mode.
_Avoid_: Options, config, preferences

**Scroll Mode**:
A setting that controls how the passage text scrolls within the typing area during a test run (`manual`, `center`, or `step`).
_Avoid_: Scroll behavior, auto-scroll type, viewport scroll

**HUD**:
The live metrics display showing elapsed or remaining time, current WPM, and accuracy during an active test run.
_Avoid_: Status bar, overlay, dashboard, stats bar

**Zen Mode**:
A setting that hides the live HUD metrics during typing until the test run completes.
_Avoid_: Distraction-free mode, blind mode, focus mode

**Inactivity Reset**:
An automatic reset of an in-progress Test Run after 10 seconds without a keystroke, returning the input and timer to zero on the same passage.
_Avoid_: Idle timeout, auto-restart, pause timeout

**Guest**:
An unauthenticated user interacting with the static SPA, whose test history and settings are stored locally.
_Avoid_: Anonymous user, visitor, local user

**Local Store**:
The client-side storage mechanism on a device used to save a typist's `Test Run`s, `Custom Passage`s, and `Settings`, whether operating as a Guest or an authenticated User.
_Avoid_: Offline cache, local database

**Sync**:
The background process of reconciling local test runs, custom passages, and settings on a client device with a remote user account.
_Avoid_: Replication, upload, backup, cloud sync

**Component Props Strategy**:
Shared UI components (like HUD and History tables) receive their data entirely via props. They do not know whether they are rendering Guest data (from Local Store) or User data (from the database).

**Password Reset Token**:
A cryptographically secure, time-limited single-use token associated with a user, used to authenticate password reset requests.
_Avoid_: Reset code, recovery key, temporary password

**Password Reset Request**:
An unauthenticated action by a user to initiate credential recovery using their username or registered email.
_Avoid_: Recovery ticket, reset claim

**Email Confirmation Token**:
A cryptographically secure, time-limited single-use token sent to verify a user's email address.
_Avoid_: Verification code, activation key, confirm link



