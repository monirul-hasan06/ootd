# OOTD

OOTD is a local-first Expo app that turns personal context into a daily outfit edit.

## Current slice

- Seven-step onboarding for language, nickname, age, style, profession, theme, and daily reminders
- Persistent profile data with AsyncStorage
- Light and dark visual themes
- Location-aware weather screen powered by Open-Meteo, with a graceful Dhaka fallback when location or network access is unavailable
- Local weekly outfit reminder scheduling
- External handoff to the OOTD store at https://canvix-store.netlify.app

Weather data is fetched directly from Open-Meteo, which does not require a client-side API key. Location access is requested only when the app refreshes weather data.

## Run locally

```sh
npm install
npx expo start
```

Use Expo Go where supported, or a development build for native location and notification behavior.

## Quality checks

```sh
npx tsc --noEmit
npx expo-doctor
```

Profile data is stored under `@ootd/profile`. To replay onboarding during development, clear the app's local storage or uninstall and reinstall the app.
