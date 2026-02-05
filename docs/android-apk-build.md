# Android APK Build (Capacitor)

This document captures the steps and settings used to generate the debug APK for the Kue app.

## App details
- App name: Kue
- App id / package name: com.arshii.kue
- API base URL (production): https://kue-api.arshii.net

## Files added/updated
- Capacitor config: `frontend/capacitor.config.json`
- Production API env: `frontend/.env.production`
- Android project: `frontend/android`

## Build commands (CLI)
From the `frontend` directory:

```bash
npm install
npm run build
npx cap sync android
```

Build the APK from the Android project (requires a standard JDK):

```bash
cd android
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew assembleDebug
```

## APK output
`frontend/android/app/build/outputs/apk/debug/app-debug.apk`

## Install to device/emulator
```bash
adb install -r frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

## Notes
- The build can fail with `jlink` if using Graal JDK. Use a standard JDK 21 via `JAVA_HOME` as shown above.
- If web assets change, re-run `npm run build` and `npx cap sync android` before rebuilding the APK.
