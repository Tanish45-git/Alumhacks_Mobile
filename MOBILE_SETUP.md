# Run Alumhacks Mobile on your phone

This is a React Native app built with Expo. Its screens are native React Native components, including the device map. It does not load the interface from a WebView. A small local backend is still required to securely proxy Ginjer API calls.

## Development with Expo Go

1. Install **Expo Go** on your Android or iPhone.
2. Connect the phone and computer to the same trusted Wi-Fi network.
3. On Windows, double-click **Start Alumhacks Mobile.bat**. On macOS or Linux, run `npm run backend` in one terminal and `npm start -- --lan` in another.
4. Wait for Expo to show the QR code and scan it with Expo Go.
5. In Alumhacks Mobile, enter the backend address beginning `Phone on the same Wi-Fi:` from the backend terminal, such as `http://192.168.1.20:8787`.

Keep both command windows open while using the app. If Windows Firewall asks, allow Node.js on **Private networks** only. Do not allow public networks or configure router port forwarding.

## Installable app package

Expo Go is for development previews. An installable APK or iOS app requires a native build (commonly EAS Build) and a configured signing account. To use Google Maps on both Android and iOS, create a Google Maps API key with the Maps SDK for Android and Maps SDK for iOS enabled, restrict it to this app's package and bundle identifiers, and set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in the environment used to create a custom development or standalone native build. `app.config.js` passes the key to the `react-native-maps` native plugin, and the map screens select Google's provider when the key is present. Expo Go uses the map provider included in its own native app; changing this project's native map configuration requires a custom native build. The key is included in the mobile app, so restrict it by app identifier and API; never use an unrestricted key. Without a key, the app keeps the platform's default map provider. After adding or changing the key, create a new native build; reloading JavaScript alone cannot change native map configuration.

## API and credentials

The phone sends Ginjer requests to the local Node backend on the computer. The backend keeps each user's Ginjer token in a separate in-memory session and proxies requests to `https://devapi.ginjer.io/graphql` by default. The phone stores only its opaque session identifier with Expo SecureStore. To use another endpoint, set `GINJER_GRAPHQL_URL` before starting the backend. Use your own account, never commit credentials, and keep the backend on a trusted private network.

While connected to Ginjer, the app reloads the selected project's device list and details every 20 seconds. When **All Projects** is selected, it refreshes all projects in the active organization. The device list shows the last successful refresh time; if a refresh fails, it shows **Refresh delayed** and retries on the next interval. Automation and notification data are preview-only because the supplied Ginjer API collection has no automation or notification query/mutation.
