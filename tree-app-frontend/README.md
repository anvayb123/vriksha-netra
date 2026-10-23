# Tree Tracker — Mobile App (React Native + Expo)

## Setup

```bash
npm install -g eas-cli    # only needed once, globally
npm install
```

## Before Running — Set Your Backend URL

Open `src/api/client.js` and update:

```js
export const BASE_URL = 'https://your-backend-url.onrender.com/api';
```

If testing locally (backend running on your laptop, not deployed yet), use your
computer's local network IP instead of `localhost` (phone can't reach your laptop's
`localhost`):

```js
export const BASE_URL = 'http://192.168.1.5:5000/api';
```

Find your local IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux). Phone and
laptop must be on the same WiFi network.

## Run for Development (Expo Go)

```bash
npx expo start
```

Scan the QR code with the Expo Go app (install from Play Store) on your Android phone.

## Build a Real Android APK

```bash
eas login
eas build:configure
eas build --platform android --profile preview
```

This gives you a downloadable `.apk` link — share it directly with volunteers
(WhatsApp, Google Drive, etc.). No Play Store needed.

## Push Updates Without Rebuilding APK (OTA)

For JS/UI-only changes (no new native permissions/libraries):

```bash
eas update --branch production
```

Volunteers get the update automatically next time they open the app.

## App Structure

```
App.js                          → entry point
src/
├── api/client.js                → axios instance, auto-attaches JWT token
├── context/AuthContext.js       → login state management
├── navigation/RootNavigator.js  → screen routing (auth flow vs main app)
└── screens/
    ├── LoginScreen.js
    ├── RegisterScreen.js
    ├── HomeScreen.js             → main menu
    ├── ScanScreen.js             → CORE FEATURE: camera → AI identify → confirm → save
    ├── DrivesScreen.js           → list upcoming plantation drives
    ├── DashboardScreen.js        → volunteer's own stats
    ├── CertificateScreen.js      → download PDF certificate
    └── AdminPanelScreen.js       → admin: manage species/drives, review flagged entries
```

## Notes

- No GPS/location permissions anywhere — deliberate design choice.
- The Scan flow is single-photo (not live/continuous scanning) — matches the final
  project decision for better accuracy and simpler battery/performance profile.
- Admin panel is shown on the Home screen only if `user.role === 'admin'`.
