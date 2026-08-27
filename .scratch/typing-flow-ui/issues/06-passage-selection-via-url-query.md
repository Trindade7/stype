# 06 — Passage Selection via URL Query State

**What to build:** Allow users and guests to select any specific passage from the Passages catalog and practice it directly. Add a "Practice" button to each card in both the guest `/passages` view and the authenticated `/app/passages` view. Route the typist to the typing screen with `passageId` in the URL query string. The typing engine loads and presents the requested passage. When the user completes the passage or advances with Next Passage, clear the query parameter from the URL so normal rotation resumes.

**Blocked by:** 04 — Result Summary Post-Test Actions

**Status:** ready-for-agent

- [ ] Each passage card in `/passages` renders a "Practice" button linking to `/?passageId=<id>`.
- [ ] Each passage card in `/app/passages` renders a "Practice" button linking to `/app?passageId=<id>`.
- [ ] Visiting `/?passageId=<id>` as a guest loads the specified passage from the local store into the typing engine.
- [ ] Visiting `/app?passageId=<id>` as an authenticated user loads the specified passage from the database into the typing engine.
- [ ] If an invalid or unpermitted `passageId` is provided in the URL, the application gracefully falls back to normal random passage selection.
- [ ] Clicking "Retry" or pressing Space after completing a selected passage retains the selected passage.
- [ ] Clicking "Next Passage" or pressing Tab after completing a selected passage clears the `passageId` parameter from the URL using state replacement and loads a normal random passage.
