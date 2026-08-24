# 01c — Shell Navigation and Extended UI Primitives Suite

**What to build:** Install the remaining UI component primitives (`dropdown-menu`, `dialog`, `badge`, `tabs`, `separator`, and `tooltip`), refactor the application shell and navigation header to include a user profile dropdown, session badge, and theme switcher, and remove `bootstrap-icons` completely from the project.

**Blocked by:** 01b — Form Primitives and Login View Migration

**Status:** done

- [x] `dropdown-menu`, `dialog`, `badge`, `tabs`, `separator`, and `tooltip` primitives are installed and exported in the component library.
- [x] Application header in the main layout includes a user profile dropdown menu, session indicator badge, and theme switcher (Dark, Light, System).
- [x] `bootstrap-icons` dependency is removed from `package.json` and its CSS import is removed from global styles.
- [x] All icons throughout the layout shell use Hugeicons components.
- [x] Automated tests verify layout rendering, dropdown interactions, and theme toggling without console or hydration errors.
