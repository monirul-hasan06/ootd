# OOTD

OOTD is a local-first Expo app that turns personal context into a daily outfit edit.

## Current slice

- Four-step onboarding for nickname, age, gender, profession, and theme
- Persistent profile data with AsyncStorage
- Light and dark visual themes
- Weather-inspired home screen with two outfit recommendations
- External handoff to the OOTD store at https://canvix-store.netlify.app

The current weather panel is a designed placeholder. The next integration adds Expo Location and a protected OpenWeatherMap proxy; the mobile app must never contain an OpenWeatherMap secret.

## Run locally

```sh
npm install
npx expo start
```

Use Expo Go where supported, or a development build for native location and notification behavior.

## Quality checks

```sh
npx tsc --noEmit
```

Profile data is stored under `@ootd/profile`. To replay onboarding during development, clear the app's local storage or uninstall and reinstall the app.
