# Bike Rental – React Native app

This delivery contains the Expo React Native rider/provider application, a separate browser-based Super Admin portal, and the shared Node.js API backend.

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

The API listens on port `3002` on all network interfaces. Authentication currently uses mobile number and password only; OTP is temporarily disabled.

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

- Mobile-number/password login and registration with saved login session
- Rider and bike-provider role-based screens in the mobile app
- Separate Super Admin portal at `http://localhost:3002/super-admin`
- Browse/filter available bikes
- Bike registration and admin bike management
- Booking, mock payment and booking confirmation
- User booking history and admin earnings

## Important notes

- Start the backend, then open `http://localhost:3002/super-admin` in a browser to access the separate portal. Sign in with username/mobile `7777777777` and password `123456`. If you changed `PORT` in `apps/backend/.env`, use that port in the URL instead.
- The mobile app and Super Admin portal both use mobile number as username and password authentication. Rider and provider registration are available from the mobile login screen; OTP is temporarily disabled.
- Payment is a mock/demo flow; do not use it to collect real payments.
- The Super Admin portal is bootstrapped with mobile `7777777777` and password `123456` for local development. Add additional Super Admin entries to `SUPER_ADMIN_ACCOUNTS` in `apps/backend/server.js` when needed. This demo credential is intentionally hard-coded as requested; the backend refuses to start in production until it is replaced with secure credentials.
- New rider and provider accounts can register with a mobile number and password. After registration, providers can add bikes and riders can book available bikes. Super Admin accounts are provisioned by the backend and sign in only through the separate portal. Existing passwordless accounts can complete registration again using the same mobile number and their existing account type to set a password.
- OTP sign-in and verification endpoints are temporarily disabled and return HTTP `410 Gone`. Because registration currently does not verify mobile ownership, use this password-only mode for local testing only; restore SMS verification before public launch.
- The rider/provider app sends requests with short-lived signed tokens. API permissions enforce that riders see their own bookings, providers manage their own bikes and earnings without platform commission details, and Super Admin-only endpoints expose platform-wide data.
- Set `JWT_SECRET` to a long random value in the private backend `.env`. `SUPER_ADMIN_COMMISSION_RATE` is a decimal fraction and defaults to `0.10` (10%).
- Rider payments and weekly provider settlements are demo ledger records only. The Super Admin portal shows those records and can record completed rides for weekly payouts, but it does not transfer money; integrate and verify a payment provider before handling real payments.
- `apps/backend/data/app-data.json` stores local demo data. Back it up before resetting or replacing it.
- The original backend `.env` file is intentionally not included because environment files can contain private credentials. Use `.env.example` as a starting point.
- This is an Expo React Native project (native Android/iOS UI), not a WebView wrapper.