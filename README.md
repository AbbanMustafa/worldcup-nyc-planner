# World Cup NYC Planner

An Expo app for New Yorkers planning where to watch the 2026 World Cup and which neighborhoods to explore around the teams playing.

## Run

```bash
npm install
npm run web
```

For native previews:

```bash
npm run ios
npm run android
```

## What is included

- Airbnb-inspired mobile UI with a search bar, filter pills, cards, and soft map styling.
- Real maps: Leaflet + OpenStreetMap on web, and `react-native-maps` on iOS/Android.
- Tappable lat/lon pins with the same filters and selected-place detail card.
- Seeded watch hubs, fan-zone ideas, culture-first neighborhood routes, and upcoming match pairings.
- Verification note in-app because hours, tickets, capacity rules, and watch-party programming can change.

## Data notes

The seed data is intentionally editable in `src/data.ts`. It uses public June 2026 tournament and NY/NJ fan-zone reporting as starter content, including the June 11-July 19 tournament window, 48-team/104-match format, New York/New Jersey Stadium final, and listed NY/NJ fan-zone concepts. Map pins use approximate latitude/longitude coordinates and render on real map tiles. Verify event details before publishing or sending users to a venue.
