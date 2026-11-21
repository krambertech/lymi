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

The nine screenshots are one page, [`set.html`](screenshots/set.html): each shot is a function that places phones, lifted pieces of a capture and drawn cards in the night room. Their order and the story they tell:

1. Learn anything. Remember it. The review screen under the lantern, with cards from four kinds of subject.
2. Works with your AI. The Library screen with the assistants' marks in one row and Claude's note.
3. Start with a ready deck. No phone: the 27 languages in their own scripts and the practical subjects.
4. Snap a page, get cards. Smart add drawn: a textbook page in the camera's frame and the picked terms.
5. Learn together. No phone: one shared deck and the people who joined it.
6. Hear every word. A card with its voice and the languages it speaks.
7. Learning Japanese? The card page with its kanji and reading lifted out.
8. Switching from Anki? Other apps' decks falling into Lymi.
9. Keep the flame lit. Today and the streak, side by side.

Every word on them, in each language, is in [`copy.js`](screenshots/copy.js). The drawn faces come from the dev panel's persona avatars and the assistant marks from the site's assistant pages; [`art.js`](screenshots/art.js) holds both, so regenerate it when either changes. A headline that is too long for its language shrinks until it fits in three lines.

The captures in `raw/<language>/` come from an iPhone 17 Pro Max Simulator with the `learner` persona, status bar at 9:41, the app language set to the capture's language and the persona's own cards given meanings in it. `04-japanese` is the `japanese` persona's 天気. Retake them when a captured screen changes visibly, from your own Simulator as [`docs/local-dev.md`](../../../docs/local-dev.md) describes.
