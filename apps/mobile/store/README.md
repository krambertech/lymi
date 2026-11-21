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
node apps/mobile/store/screenshots/set.mjs
```

It writes `screenshots/out/<language>/` in three sizes: `6.9` (1320 × 2868) and `6.3` (1206 × 2622) for App Store Connect's two iPhone slots, and `play` (1440 × 2560) for Google Play, which takes only 16:9 or 9:16. It also writes Play's feature graphic per language to `out/play-feature/`. `out/` is not committed. Pass languages to render fewer, as in `set.mjs uk`.

[`upload.mjs`](screenshots/upload.mjs) sends them to App Store Connect and Google Play; [the checklist](checklist.md#uploading-by-api) has its commands and keys.

The nine screenshots are one page, [`set.html`](screenshots/set.html): each shot is a function that places phones and drawn cards in the night room. Their order and the story they tell:

1. Learn anything. Remember it. The lantern over the headline, Today in front and a review behind it.
2. Start with a ready deck. No phone: the 27 languages in their own scripts and the practical subjects.
3. Create cards from your notes. Smart add drawn: a textbook page in the camera's frame and the picked terms.
4. Works with your AI. The assistants' icons and the Library with Claude's and ChatGPT's notes.
5. Learn together. A shared deck with sections, and the people who joined it around the phone.
6. Hear every word. A card with its voice and three more languages speaking.
7. Made for your language. No phone: Japanese with furigana and pitch accent, Chinese with pinyin, Ukrainian with stress.
8. Bring your existing decks. The icons of the apps Lymi imports from, falling into Lymi.
9. Your goal, your pace. The goal picker over the streak.

Every word on them, in each language, is in [`copy.js`](screenshots/copy.js). The drawn faces come from the dev panel's persona avatars and the assistant marks from the site's assistant pages; [`art.js`](screenshots/art.js) holds both, so regenerate it when either changes. A headline that is too long for its language shrinks until it fits in three lines.

The captures in `raw/<language>/` come from an iPhone 13 mini Simulator with the `learner` persona, status bar at 9:41, the app language set to the capture's language and the review card's meaning in it. The mini is 375 points wide against the Pro Max's 440, so every element comes out larger in the same frame; keep that device when you retake them. `06-streak` is taken in dark appearance. `07-deck` is the shared deck Lisboa a dois after some reviews, so its sections show progress. Retake them when a captured screen changes visibly, from your own Simulator as [`docs/local-dev.md`](../../../docs/local-dev.md) describes.
