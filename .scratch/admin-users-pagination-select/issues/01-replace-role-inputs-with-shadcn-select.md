# 01 — Replace Role Inputs with Shadcn-Svelte Select in User Forms

**What to build:** In the Administrator user management dialogs (Create User and Edit User), replace raw HTML `<select>` inputs with the shadcn-svelte Select component. Role options ("User" and "Admin") display as accessible combobox triggers with plain text labels. The selected role submits cleanly with form actions, and self-demotion warnings continue to prompt an administrator when changing their own role to User.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Create User dialog renders a shadcn-svelte Select component for role selection, defaulting to "User".
- [x] Edit User dialog renders a shadcn-svelte Select component pre-populated with the targeted user's role ("User" or "Admin").
- [x] Selecting roles within the Select dropdown updates form state and submits the expected role value upon form submission.
- [x] When an administrator changes their own role to "User" in the Edit User dialog and attempts to save, the self-demotion warning dialog opens before submission.
- [x] Component tests verify role dropdown rendering, keyboard interaction, option selection, and self-demotion guard behavior.
