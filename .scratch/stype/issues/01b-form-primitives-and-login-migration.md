# 01b — Form Primitives and Login View Migration

**What to build:** Install accessible form and container primitives, install the Hugeicons icon suite, and refactor the authentication login screen to use native shadcn-svelte components. Users experience consistent input styling, clear validation error banners, and keyboard-navigable form controls.

**Blocked by:** 01a — Initialize Design System and Theme Engine

**Status:** ready-for-agent

- [ ] `button`, `card`, `input`, and `label` primitives are installed and exported in the component library.
- [ ] `@hugeicons/svelte` and `@hugeicons/core-free-icons` packages are installed and configured for component use.
- [ ] Login screen is refactored to use `Card`, `Input`, `Label`, and `Button` components instead of hardcoded raw HTML elements.
- [ ] Form submission, error alert banners, and input validation feedback remain fully functional.
- [ ] Automated tests verify the login view contract and form submission workflows.
