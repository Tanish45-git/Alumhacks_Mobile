# Ginjer integration notes

Last checked: 2026-10-30.

## Verified from the supplied repository

- `src/api.js` previously used the GraphQL `signIn(auth: SignInInput!)` operation, with `emailId`, `password`, `application: "Ginjer"`, and `forever` input fields. Its selected response fields included `token`, account IDs, and basic user identity.
- The configured endpoint is `https://devapi.ginjer.io/graphql` unless `GINJER_GRAPHQL_URL` is set.
- Authorized GraphQL calls use the Ginjer token in the `Authorization` header.

## Official documentation check

- Searched Ginjer's public documentation domains for authentication and token-refresh documentation on 2026-10-30; no public official result was found.
- No refresh-token query, mutation, endpoint, or response field has been assumed or implemented. # TODO: verify the official Ginjer refresh contract before adding automatic refresh.

## Security boundary

The current backend is a development LAN proxy. It enforces session separation in its process, but it is not a production identity service. A production deployment requires HTTPS and server-side session persistence/rotation designed for the confirmed Ginjer authentication contract.

## Downlink command contract

The mobile app's downlink request follows the Ginjer web client contract verified on 2026-10-30:

- `sendDownlink` receives `organisationId`, `deviceId`, `downlinkInterfaceId`, plain-text `value`, `timeout: 1000`, `port`, `class` (`CLASS_A`, `CLASS_B`, or `CLASS_C`), and `networkKeyId` as sibling action fields. These must not be nested inside `value`.
- Available downlink interfaces are restricted to controller module IDs configured on the device's exact hardware.
- Network keys are selected by ID from the device's configured network; the app reads key names and IDs only, never key material.
- A returned GraphQL receipt does not prove radio delivery or device execution. Nested network status 200/201/202 is accepted by the network; other explicit statuses and parsing/rejection types are errors. The device's next uplink is required to confirm its state.
