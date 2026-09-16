# 05 — Real-time Server-Sent Events Subscription and Live Sync

**What to build:** Add real-time cross-device updates using PocketBase Server-Sent Events subscriptions. When a typist completes a test run or updates a passage on one device, other active devices receive the update immediately, falling back to periodic polling and automatic reconnection when network drops occur.

**Blocked by:** 04 — PocketBase Bidirectional Data Synchronization.

**Status:** completed

- [x] Linking to a PocketBase server establishes a Server-Sent Events subscription on collections.
- [x] Incoming real-time events for new test runs merge into local storage and update history views without page reloads.
- [x] Incoming updates for custom passages and settings apply to local storage and update the active interface.
- [x] Network drops trigger automatic reconnect attempts and fall back to polling until reconnection succeeds.
- [x] Unlinking an account or closing the session cleanly terminates the event subscription.
- [x] Automated tests verify event listener setup, record updates on event reception, and subscription cleanup.
