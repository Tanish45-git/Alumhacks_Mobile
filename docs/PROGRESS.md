# Progress

## Completed

- Replaced the shared Ginjer token variable with isolated in-memory sessions keyed by cryptographically random opaque IDs.
- Removed the pasted-token login path and added individual email/password sign-in through the existing source-verified Ginjer GraphQL operation.
- Added protected device storage for the opaque session ID, logout cleanup, session restoration, and HTTP 401/403 expiry handling.
- Added Set Color command validation so only the four labels displayed by Ginjer are submitted, plus clearer queued-versus-executed feedback after a downlink response.
- Fixed live output indicators so each reflects its own reported color value instead of inheriting the first output's status.
- Corrected downlink submission to send the controller value, port, `CLASS_*` enum, timeout, and configured `networkKeyId` in Ginjer's expected top-level fields. Controller and key choices are now restricted to the selected device's hardware and network, and Ginjer rejection statuses are shown as errors.
- Made unreported device outputs display as neutral rather than green and clarified that an accepted downlink is not proof of a physical color change.

## Noticed

- The bundled native `.fig` canvas cannot be inspected for exact icon vector specifications in this environment. The app retains its existing Material Community icon system; a Figma export or design access is required for exact asset replacement.
