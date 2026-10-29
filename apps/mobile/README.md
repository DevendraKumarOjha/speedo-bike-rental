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

From this directory, copy the local environment template and replace its example IP with your computer's Wi-Fi LAN IPv4 address:

```powershell
Copy-Item .env.development.local.example .env.development.local
npx expo start --clear
```

Keep the phone and computer on the same Wi-Fi network. The local backend must be running and reachable on port `3002`; allow it through Windows Firewall if needed. For an Android emulator, set `EXPO_PUBLIC_API_URL=http://10.0.2.2:3002/api` in `.env.development.local` instead. This ignored local file overrides the production URL; EAS profiles remain configured to use the hosted API.

This is a closed-test app: payments are mocked and OTP verification is disabled. Do not use it to collect real payments or expose demo credentials publicly.
