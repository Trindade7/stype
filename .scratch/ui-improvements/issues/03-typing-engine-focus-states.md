# 03 — Typing Engine Focus States & Auto-Focus Readiness

**What to build:** Visual focus indicators for the Typing Engine container border and character cursor, automatic input focus upon page load or reload, and global keystroke refocusing.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] The typing container border and ring dynamically highlight when the typing input is focused and dim when blurred.
- [x] The character cursor underline pulses only when the typing engine is focused and remains static or hidden when blurred.
- [x] The typing engine input automatically receives focus when the page loads or mounts.
- [x] Pressing standard typing keystrokes while blurred refocuses the typing engine and captures the keystroke.
- [x] Component tests verify focus and blur state transitions, cursor visibility, and auto-focus on mount.
