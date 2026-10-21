# Bike Rental – React Native app

This delivery contains the Expo React Native mobile application and the Node.js API backend it uses. The Next.js admin website from the source archive is not part of this mobile-focused package.

## Requirements
- Node.js LTS (18 or newer)
- Android Studio + Android emulator, or Expo Go on a phone
- For iOS builds, macOS + Xcode

## 1. Install dependencies

From this folder:

```bash
npm run install:all
```

## 2. Start the backend

Open terminal 1:

```bash
cd apps/backend
copy .env.example .env
npm install
npm start
```

The API listens on port `3002` on all network interfaces. Local OTP mode is enabled (`OTP_MODE=mock`).

## 3. Start the React Native app

Open terminal 2 at the project root:

```bash
cd apps/mobile
npm install
npx expo start
```

Press `a` for Android emulator or scan the QR code with Expo Go. You can also run `npm run android` from `apps/mobile`.

## API address configuration

- During Expo development, the app uses the host address from the Expo dev server automatically.
- If automatic detection is unavailable or you are using an Expo tunnel, create `apps/mobile/.env` and set your computer's Wi-Fi LAN IP (not `localhost` or `127.0.0.1`):

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3002/api
```

Replace `192.168.1.10` with your computer's LAN IP. Make sure the phone and computer are on the same Wi-Fi and Windows Firewall allows Node.js on port 3002. Restart Expo after changing `.env`.

## Main mobile features

- OTP login and saved login session
- User, Admin and Super Admin role-based screens
- Browse/filter available bikes
- Bike registration and admin bike management
- Booking, mock payment and booking confirmation
- User booking history and admin earnings

## Important notes

- Payment is a mock/demo flow; do not use it to collect real payments.
- Backend OTP mode defaults to mock for local development. Configure a real SMS provider before production.
- `apps/backend/data/app-data.json` stores local demo data. Back it up before resetting or replacing it.
- The original backend `.env` file is intentionally not included because environment files can contain private credentials. Use `.env.example` as a starting point.
- This is an Expo React Native project (native Android/iOS UI), not a WebView wrapper.