# 03 — Scroll Mode Setting and Persistence

**What to build:** A `scrollMode` setting (`manual`, `center`, `step` with default `center`) persisted across the database schema for authenticated users and local storage for guests. The setting is exposed in the Settings form under "Display & Focus" and can be updated by guests on `/settings` and authenticated users on `/app/settings`.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] SQLite `userSettings` table includes `scrollMode` column (`manual` | `center` | `step`) defaulting to `center`.
- [ ] Guest `DEFAULT_GUEST_SETTINGS` and `localStore` support `scrollMode` defaulting to `center`.
- [ ] `SettingsForm` displays a "Scroll Mode" selector under "Display & Focus" with options for `Centered (Default)`, `Step Scroll`, and `Manual`.
- [ ] Updating and submitting the Settings form persists the selected `scrollMode` to SQLite for authenticated users and `localStore` for guests.
- [ ] Unit and integration tests verify schema defaults, persistence roundtrips, and form interaction for both user and guest modes.
