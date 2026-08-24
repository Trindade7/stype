# 05 — Timeline Snapshots & Speed Chart

**What to build:** A visual representation of how the user's typing speed fluctuated during the test. The typing engine will record the user's performance every second, save this timeline data, and display it as a chart on the result summary.

**Blocked by:** 03 — Test Run Persistence

**Status:** complete

- [x] The typing engine captures WPM and accuracy snapshots every second during an active run.
- [x] Timeline snapshot data (JSON) is included in the test run submission and stored in the database.
- [x] A line chart visualizes the speed and accuracy timeline on the Result Summary screen.