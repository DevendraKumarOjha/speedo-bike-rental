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

This is a closed-test app: payments are mocked and OTP verification is disabled. Do not use it to collect real payments or expose demo credentials publicly.
