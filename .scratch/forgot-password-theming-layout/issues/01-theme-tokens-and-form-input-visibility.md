# 01 — Theme Tokens and Form Input Visibility

**What to build:** Introduce a centralized semantic color token system in the theme stylesheet for both light and dark modes, and upgrade form input and select primitives so that form elements have crisp borders, solid surfaces, and high-contrast dropdown states in light theme.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Semantic tokens for positive feedback, typing character states (untyped, correct, error, caret), and refined input borders are defined in the light theme stylesheet.
- [ ] Corresponding dark mode values for all new semantic tokens are defined in the dark theme stylesheet.
- [ ] All new semantic tokens are exposed to the utility classes generator.
- [ ] Select triggers render with a solid background and a distinct border with sufficient contrast against light backgrounds.
- [ ] Select dropdown content renders fully opaque with a clear border and shadow, without translucent backdrop blur artifacts.
- [ ] Select menu items provide clear visual contrast between unhighlighted, hovered, and keyboard-focused states.
- [ ] Text inputs maintain clean contrast and legible borders across light and dark modes.
- [ ] Automated tests verify the presence of all required theme tokens and the styling classes of the select primitives.
