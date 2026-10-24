# Store listings

What the App Store and Google Play show about Lymi, kept here so each release changes it in one place and pastes it into both consoles.

- [`listing/`](listing) holds the text per language: English, Ukrainian and Russian. Each field's heading carries its limit; keywords count bytes, so a Cyrillic letter costs two.
- [`privacy.md`](privacy.md) holds the App Privacy and Data safety answers. The same data types are declared in `ios.privacyManifests` in [`app.json`](../app.json), and the share and controls extensions carry their own `PrivacyInfo.xcprivacy`.
- [`review.md`](review.md) holds the review account steps and the notes for App Review and Play's app access.
- [`checklist.md`](checklist.md) is every step in both consoles, in order.
- [`screenshots/`](screenshots) holds the raw Simulator captures and the frame that turns them into store screenshots.

Public text calls Lymi a flashcard app; screen names and product words follow [`CONTEXT.md`](../../../CONTEXT.md) and the app's own catalogs. Ukrainian and Russian are written from the English, not from each other.

## Screenshots

```bash
node apps/mobile/store/screenshots/render.mjs
```

It writes `screenshots/out/<style>/<language>/` in three sizes: `6.9` (1320 × 2868) and `6.3` (1206 × 2622) for App Store Connect's two iPhone slots, and `play` (1440 × 2880) for Google Play, which allows at most 1:2. It also writes Play's feature graphic per language to `out/play-feature/`. `out/` is not committed. Captions and the order of shots are in [`shots.json`](screenshots/shots.json); `shots.json` also names the default style; `render.mjs glow` renders the other style from the same captures.

The captures in `raw/<language>/` come from an iPhone 17 Pro Max Simulator with the `learner` persona, status bar at 9:41, the app language set to the capture's language and the persona's own cards given meanings in it. `04-japanese` is the `japanese` persona's 天気. Retake them when a captured screen changes visibly, from your own Simulator as [`docs/local-dev.md`](../../../docs/local-dev.md) describes.
