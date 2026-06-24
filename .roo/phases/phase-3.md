# Phase 3 - Incremental Implementation

## Summary
This phase captures the current refactor implementation state and the exact handoff for the next session.

## What has been implemented so far
- Route organization is mostly complete: `routes/shop.js`, `routes/auth.js`, and `routes/admin.js` exist and are mounted from `server.js`.
- Inline JavaScript has been migrated to external files in `public/js/`, and `views/layout.ejs` loads the shared client scripts.
- The `/orders` user route has been restored in `routes/shop.js`.
- The admin order status update route exists in `routes/admin.js`.
- The existing route structure keeps current URLs and UX unchanged.

## What was intentionally NOT changed yet
- Cart logic centralization is not complete: cart add/update/remove/checkout still contain route-specific logic and session persistence code.
- Search/filter centralization is not complete: product list, deals, and search routes still duplicate sort/filter logic.
- No large rewrites were performed; the current refactor preserves existing route behaviors.
- No new dependencies were added.

## Current issues / checks
- Port 3000 is currently occupied by another process, so runtime validation was blocked.
- The footer layout fix was attempted on `public/css/style.css` but may have been reverted.

## Next session handoff
1. Confirm the port conflict is resolved and restart the app on port 3000.
2. Verify `/orders` and `/admin/orders` work correctly for normal and admin users.
3. Continue cart centralization by extracting shared cart helper functions and replacing duplicated route logic.
4. Continue search/filter centralization by creating shared query helpers for product listing, deals, and search.
5. Confirm `views/layout.ejs` remains the single source of JS script injection, and no inline `<script>` blocks exist in EJS templates.

## Notes for the next session
- The current route files are the best source of truth for implemented behavior.
- Keep the refactor small and behavior-preserving: do not change URLs or render outputs.
- Document any change to cart or search logic in `phase-3.md` before moving to phase 4.
