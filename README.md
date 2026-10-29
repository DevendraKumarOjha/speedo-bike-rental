# Bike Rental – Hostycare and Android test deployment

The project has three parts:

- Android/iOS mobile app: Expo React Native in `apps/mobile`
- API: Node.js and Express in `apps/backend`
- Database: MySQL

This guide prepares a closed Android test build for you and a few friends. The API domain configured for the app is `https://api.speedoryde.com`. The API must be deployed and reachable before building/installing an APK.

## Current deployment status

The API hostname resolves, but `https://api.speedoryde.com/api/test` currently returns Hostycare/LiteSpeed's HTML 404 page. This means the Node.js app is not yet attached to that subdomain or is not running. Do not build/share an APK until that URL returns the API JSON health response.

## 1. Connect the MySQL database you created

In cPanel, open **MySQL Databases** (or **MySQL Database Wizard**) and:

The database and user have already been created and assigned. The values provided so far are:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=speedory_root
MYSQL_DATABASE=speedory_speedo-bike-rental
```

In **MySQL Databases**, confirm `speedory_root` is assigned to `speedory_speedo-bike-rental` with **All Privileges**. If the cPanel screen shows a prefixed or different username, use the exact displayed username instead.

Do not send the database password to anyone or commit it to Git.

## 2. Configure the Node.js app and API subdomain

In cPanel **Setup Node.js App** (the exact label may vary):

1. Create an application and select a supported Node.js version (use Node 20 or newer if offered).
2. Map the application to `api.speedoryde.com` and enable/issue its SSL certificate.
3. Upload the `apps/backend` and `apps/super-admin` folders to the server, preserving them as siblings. Set the application root to the `apps/backend` directory (the directory containing `server.js` and `package.json`); the sibling `apps/super-admin` directory is required for the Super Admin portal.
4. Set the startup file to `server.js`. Install the backend dependencies (`npm install` in the backend directory, or use cPanel's Run NPM Install action).
5. Add the environment variables listed below in cPanel. Set `PORT` to the port cPanel assigns, if it requires one.
6. Restart the application after saving the environment variables.

The backend creates the MySQL tables on first startup. Keep the database credentials and secrets in cPanel's environment-variable settings or the server's private `.env`; do not commit a real `.env` file.

### Backend environment variables

Use the names below, replacing every placeholder with the values from your Hostycare account. `MYSQL_HOST`, database name, and database user must match cPanel exactly. Set the password and secrets directly in cPanel; don't paste them into chat or source control.

```env
PORT=the_port_assigned_by_hostycare
NODE_ENV=production
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=speedory_root
MYSQL_PASSWORD=set_this_privately_in_cpanel
MYSQL_DATABASE=speedory_speedo-bike-rental
APP_IMPORT_LEGACY_DATA=false
SESSION_SECRET=a_unique_random_secret_of_at_least_32_characters
JWT_SECRET=a_different_unique_random_secret_of_at_least_32_characters
SUPER_ADMIN_COMMISSION_RATE=0.10
ADMIN_LOGIN_MOBILE=your_10_digit_admin_mobile
ADMIN_LOGIN_PASSWORD=your_unique_8_digit_admin_password
SUPER_ADMIN_LOGIN_MOBILE=your_10_digit_super_admin_mobile
SUPER_ADMIN_LOGIN_PASSWORD=a_different_unique_8_digit_password
```

The app validates privileged phone numbers and requires each privileged password to be exactly eight digits. Production also rejects the default demo password `00000000`. Choose credentials you control and do not reuse personal banking or email passwords. Generate two separate random secrets locally, for example in PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Use one output for `SESSION_SECRET`, the other for `JWT_SECRET`. Do not share or commit them.

### Verify the API deployment

Open either `https://api.speedoryde.com/api/test` or `https://api.speedoryde.com/api/health` in a browser. These public test endpoints return success only after the backend has initialized its MySQL connection. A healthy response looks like:

```json
{"success":true,"status":"ok","service":"bike-rental-api","database":"connected"}
```

If it still shows a LiteSpeed 404, check the cPanel application root, startup file, domain mapping, app logs, and restart status with Hostycare support. If the Node.js app reports a MySQL connection error, verify the database username/password, database name, host, and that the user has **All Privileges** on this database.

## 3. Build the Android APK

The Expo EAS `preview` profile builds an installable APK and embeds `https://api.speedoryde.com/api` as the API URL. Build only after the API health check above succeeds.

From PowerShell at the repository root:

```powershell
Set-Location apps/mobile
npx expo config --type public
npx eas login
npx eas whoami
npx eas build --platform android --profile preview
```

The Expo account must have access to the EAS project configured in `apps/mobile/app.json`. If `eas whoami` shows an account without access, ask the project owner to grant access or coordinate linking a project to your own Expo account before building. Never share your Expo password or access token.

When EAS finishes, use its build page/link to download the APK, install it on your Android phone, and share the APK with your testers. Android may ask each tester to allow installation from that download source.

## 4. Closed-test limitations

- Payments and weekly settlements are demo/mock records; no real money is processed.
- OTP/mobile ownership verification is disabled. Only use accounts and phone numbers belonging to your test group.
- This is a closed-test setup, not a public launch configuration. Do not collect real payments or expose the demo privileged accounts publicly.
- Android APK builds are for Android devices. iOS requires a separate iOS build and Apple signing/distribution setup.

## Local development

For local development, create `apps/backend/.env` from `.env.example` with local MySQL details, then run:

```powershell
npm --prefix apps/backend start
```

In another terminal:

```powershell
Set-Location apps/mobile
npm install
npx expo start
```

For local physical-device testing, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to the computer's Wi-Fi LAN address. The EAS preview build uses the deployed HTTPS address instead.
