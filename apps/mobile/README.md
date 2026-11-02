# Bike Rental Mobile App

The Expo app is configured to call `https://api.speedoryde.com/api` and the EAS `preview` profile produces an Android APK for closed testing.

## Build an APK

Build only after the backend health endpoint at `https://api.speedoryde.com/api/test` returns JSON successfully.

From this directory:

```powershell
npx expo config --type public
npx eas login
npx eas whoami
npx eas build --platform android --profile preview
```

The signed-in Expo account must have access to the project configured in `app.json`. EAS provides an APK download link when the build completes.

To override the API URL for a build, set `EXPO_PUBLIC_API_URL` in the build environment. Do not use `localhost` in an APK shared with testers.

## Run locally with Expo Go

This project uses Expo SDK 58, so update Expo Go from the Play Store before testing.

From this directory, copy the local environment template:

```powershell
Copy-Item .env.development.local.example .env.development.local
npx expo start --clear
```

Expo Go uses the current computer running Expo as the local API host by default, using the Metro connection address; you should not need to edit an IP when it changes. `localhost` cannot be used from Expo Go on a physical phone because it refers to the phone itself. Keep the phone and computer on the same Wi-Fi network. The local backend must be running and reachable on port `3002`; allow it through Windows Firewall if needed. For an Android emulator, use `http://10.0.2.2:3002/api` as a manual override instead. This ignored local file overrides the production URL; EAS profiles remain configured to use the hosted API.

If you see an Imunify360 bot-protection response, the request reached the hosting firewall rather than the app's login handler. Use the local backend for development. For production, ask your hosting provider to allow legitimate mobile API requests; changing the app cannot override the server firewall.

This is a closed-test app: payments are mocked and OTP verification is disabled. Do not use it to collect real payments or expose demo credentials publicly.
