# Phase 2 - Create Refactor Plan

**Summary of Work Done:**
- Defined a plan for Route Organization by splitting the monolithic `server.js` file into smaller, more manageable route modules.
- Defined a plan for Inline JavaScript Removal by moving inline JavaScript from EJS templates to separate JavaScript files.
- Defined a plan to centralize cart logic so cart behavior is managed from a single shared module.
- Defined a plan to centralize search and filter logic so product query behavior is reusable and consistent.
- Defined a plan for Admin Features Separation by organizing admin-specific behavior into dedicated route and helper boundaries.

**Actions Taken:**
1. Reviewed `server.js`, discovered monolithic routing and middleware structure.
2. Identified duplicate cart and cart persistence logic across routes and auth handling.
3. Identified duplicate product search/filter/sort logic across list and search routes.
4. Reviewed EJS templates and confirmed inline scripts should move to `public/js/` external files.
5. Confirmed admin order and product management behavior should be isolated in admin-specific routes.

**Decisions Made:**
- Split `server.js` into separate route files for shop, auth, and admin features.
- Move inline JavaScript from EJS templates into external scripts and load them from `views/layout.ejs`.
- Defer cart logic centralization until after route organization is complete, keeping the initial refactor minimal.
- Defer search/filter centralization until route and view structure are stable.
- Keep admin routes and UI behavior separated, but preserve existing URLs and UX.

**Next Steps:**
1. Implement the Route Organization plan by creating and wiring route modules in `server.js`.
2. Implement the Inline JavaScript Removal plan by moving inline scripts to `public/js/` and updating views.
3. Implement the Cart Logic Centralization plan by extracting shared cart operations into a helper module.
4. Implement the Search/Filter Logic Centralization plan with reusable query helpers.
5. Continue Admin Features Separation by isolating admin routes and keeping admin workflows intact.