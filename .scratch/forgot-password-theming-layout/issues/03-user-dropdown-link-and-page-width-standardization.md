# 03 — User Dropdown Link and Page Width Standardization

**What to build:** Refactor the authenticated user dropdown menu to turn the user identity label into the primary interactive link to the user details page, remove the redundant menu label, and standardize all content pages to a uniform maximum container width and padding matching the header across guest and authenticated routes.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The user navigation dropdown in the header displays "Logged in as [username]" as an interactive link that navigates directly to the user details page.
- [ ] The redundant "User Details" entry is removed from the dropdown menu.
- [ ] Long usernames in the dropdown link truncate cleanly without breaking menu bounds.
- [ ] History, Statistics, Passages, Settings, and User Details pages enforce a uniform maximum container width matching the navigation header.
- [ ] Content containers use consistent horizontal and vertical padding across both guest and authenticated routes.
- [ ] Switching between navigation tabs produces no horizontal layout jumps.
- [ ] Automated tests verify the updated dropdown menu links and the standardized page container constraints.
