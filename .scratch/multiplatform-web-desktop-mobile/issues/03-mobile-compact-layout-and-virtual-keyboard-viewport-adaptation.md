# 03 — Mobile Compact Layout and Virtual Keyboard Viewport Adaptation

**What to build:** Introduce a responsive mobile typing layout that anchors to the dynamic visual viewport (`100dvh`). When the hidden typing input receives focus on narrow screens, the navigation header automatically collapses and container margins shrink, keeping the text passage and live HUD fully visible and legible above virtual keyboards without viewport bouncing or hidden cursor lines.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] On small viewports, focusing the typing input transitions the interface into a compact typing layout.
- [ ] In compact mode, the top navigation header collapses out of view to maximize vertical room for the text passage and live HUD.
- [ ] The typing container anchors to `100dvh` and adjusts dynamically to visual viewport height changes when on-screen virtual keyboards open or close.
- [ ] Finishing a test run or blurring the typing input restores the header and returns the layout to normal padding.
- [ ] Component tests verify that focus and blur events on narrow viewport sizes trigger header collapse and container resize classes correctly.
