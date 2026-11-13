---
status: exploration
date: 2026-10-20
decision: none
---

# Right-to-left

An Arabic or Hebrew learner should see their words written right to left, in a typeface with enough space for vowel marks, with English meanings, Latin words and numbers each staying in order. Later, harakat and niqqud should sit on the cue until the word is Known. This is the platform work [supported languages](supported-languages.md) puts before Arabic and Hebrew get records. The two cases are:

- **An RTL deck language inside an LTR interface.** Any learner with an Arabic, Hebrew, Persian or Urdu deck needs this now.
- **An RTL interface locale.** Nobody has asked for it.

Not decided: who reviews Arabic and Hebrew, marks on Quran decks, and the Arabic face (see Open questions).

## Evidence

Today's code, as of 2026-10-20:

- **Web direction.** Nothing sets `dir`. `apps/web/index.html:2` and `lib/i18n.ts:44,60` set only `lang`.
  - The logical rule mostly worked: no `ml-` or `text-left` classes remain, and 28 files carry `rtl:` variants, such as mirrored icons (`shell.tsx:301`), meters on `insetInlineStart` (`review-timeline.tsx:91`) and the sheet (`ui/dialog.tsx:212`).
  - Those variants never switch on, nor do the `[dir="rtl"]` rules in `styles/streak.css:38` and `styles/deck.css:189`, nor `endEdge()` in `ui/dialog.tsx:43`, which reads `documentElement.dir`.
  - What it missed: four unmirrored `ChevronRight` icons (`new-cards-row.tsx:38`, `move-cards-to-deck-dialog.tsx:39`, `word-view.tsx:766`, `deck-settings-view.tsx:312`), `→` in `command-menu.tsx:651`, `scrollBy({left})` with no sign flip in `shelf-bar.tsx:154`, the `import-sweep` keyframes in `lantern.css:39`, `x: 16` in `first-run.tsx:709`, and `marginRight` in `run-strip.tsx:58`.
  - `scripts/check-styling.mjs` checks only added lines, and skips `translate-x-`, `origin-left`, keyframes and inline `left`.
- **Phone direction.** Nothing calls `I18nManager.forceRTL`, and `app.json` has no `supportsRTL`. Rows are `flex-row` with no physical classes, so they flip; undo swipe already reads `isRTL` (`review/undo-swipe.tsx:32`).
  - Under an RTL layout these would break: `back`/`forward` chevrons (`ui/icons.tsx:126`), the switch's positive `translateX` (`ui/switch.tsx:43`), `welcome/questions.tsx:39`, the day ring (`insights/day-grid.tsx:200`), the streak bands (`streak/calendar.tsx:250`), and `renderRightActions` (`sections/section-path.tsx:206`).
  - Neither platform has swipe to grade.
- **Mixed-direction text.** No `<bdi>`, `unicode-bidi` or Unicode isolate exists.
  - The web's `TermText` returns a bare string (`components/term-text.tsx:34`).
  - The card form's inputs (`card-form.tsx:476,524`) and the search boxes set no `dir`.
  - 64 strings put learner text into interface text, such as `` t`Archived “${archivedTerm}”` `` (`routes/review.tsx:1015`). The phone joins learner text with `" · "` (`app/review.tsx:1391`) and `", "` (`app/(tabs)/library/card/[card].tsx:158`).
  - The phone's `Furigana` lays reading boxes in `flex-row` (`ui/furigana.tsx:161`), which follows the app's direction. Text with no reading stays one `Text`.
- **Faces and keys.** `Script` is `"Jpan" | "Hans" | "Hant"` (`packages/core/src/languages/types.ts:11`).
  - `normaliseTerm` keeps marks (`packages/core/src/terms.ts:10`), so كَتَبَ and كتب are two terms, but unmarked كتب cannot tell كَتَبَ (he wrote) from كُتُب (books).
  - Speech already maps `ar` and `he` to voices (`apps/web/src/server/ai/speech.ts:23,51`).

## Decision (leaning)

**Direction comes from the tag, for any language.** The language index gains `textDirection(tag)`:

- An explicit script subtag decides: `rtl` for Arab, Hebr, Thaa, Syrc, Nkoo or Adlm, so `az-Arab` is right to left and `sd-Deva` and `ks-Deva` are not.
- Without one, `rtl` for a primary subtag that defaults to an RTL script: `ar`, `he`, `fa`, `ur`, `ps`, `sd`, `ks`, `ug`, `ckb`, `yi`, `dv`, and the Arabic dialects `arz`, `apc`, `ajp`, `acm`, `afb`, `ary`, `aeb`, `arq`, `ayl` and `apd`. Otherwise `auto`.
- It is a literal list in `packages/core/src/languages/`, because Firefox lacks `Intl.Locale#getTextInfo` and the phone cannot rely on Hermes for it.
- It applies in every tier, since a Persian deck needs it as much as an Arabic one.

**Case 1: the RTL deck language.** The document stays LTR, and learner text takes direction at the smallest element that holds it:

| Where | What |
| --- | --- |
| A term or example inline (rows, chips, glossary) | `TermText` and `ExampleText` render `<span lang dir>`, which isolates it and leaves the row's alignment alone |
| A block of card-language text only (the cue, the example) | `dir` on the block, so `text-start` aligns it right |
| Meanings, notes, tags, deck and section names | `dir="auto"` |
| Every input and textarea, search included | `dir="auto"` in `ui/input.tsx` and `ui/textarea.tsx`, so an empty field keeps its placeholder's side |
| Learner text in interface text in the DOM | `<bdi>` |
| Learner text in a string (toast, `aria-label`, push copy) | `isolate(text)`, which adds U+2068…U+2069 at render time only and never reaches storage, export or speech |
| Separators between learner texts | Isolate each item before joining |

On the phone, `Text` sets iOS `writingDirection` from `textDirection`. React Native ignores `text-start`, and `writingDirection` does nothing on Android, so a block of card-language text also takes a `textAlign` worked out from `textDirection`, as `TEXT_END` does (`theme/type.ts:115`). Strings use the same `isolate()`, and the term and example inputs follow the deck. Icons, gestures and motion do not change in case 1.

**Faces.** `Script` gains `Arab` and `Hebr`, with tokens on slice 1's pattern and no web font. Leaning: `--face-arab: "Geeza Pro", "Segoe UI", "Noto Naskh Arabic"` and `--face-hebr: "Arial Hebrew", "Segoe UI", "Noto Sans Hebrew"`. Arabic text gets a taller line height so harakat clear the lines around it.

**Marks in place.** Both use the engine Russian's slices build.

- **The mark set.** Each language's mark set is the nonspacing marks (`\p{Mn}`) in its block, removed only after NFC. NFD would split أ and lose its hamza.
- **The pronunciation** is the marked term, drawn on the cue until Known. Leaning for Arabic: full vowels in pausal form, as dictionaries write it; text from the Quran keeps its marks as printed.
- **Examples** carry marks inline and never fade, since case endings and Hebrew vowels change as words inflect.
- **Known.** A Known card switches from the marked string to the plain one. Nothing colours a mark alone, because its own span splits shaping in WebKit and Blink.
- **On the phone,** a marked term stays one `Text`, never `Furigana`'s boxes.

**Hebrew's pointed spelling.** Pointed spelling often has fewer letters (שֻׁלְחָן for שולחן). When removing the points gives the term back, they are drawn in place; otherwise the pointed form is drawn whole as a line on the cue, under the same Known rule. A pointed term sent alone splits into its unpointed letters and the pointed form, and the AI may propose the everyday spelling as a change the learner accepts (ADR 0025).

**Duplicates and search.**

- **Duplicates.** For `ar` and `he`, `normalized_term` drops the mark set and tatweel, and Hebrew folds `'` and `"` to geresh and gershayim. This uses Russian's fold and its ADR 0004 paragraph.
- **The reading key** is the folded marked pronunciation, so كَتَبَ and كُتُب stay two cards and an unmarked add matches either.
- **Search.** `searchKey` drops both mark sets and tatweel for everyone, and folds أ إ آ ٱ to ا, ى to ي, ة to ه, and Persian ی ک to Arabic. Duplicates keep those letters distinct. Term filters fold their needle with `normaliseTerm` and compare `normalized_term` in SQL with no language (`termConditions` in `services/card-search.ts:499`), so they drop both mark sets and tatweel too, which matches the stored `ar` and `he` keys.
- **Backfill.** A backfill splits marked terms with an empty pronunciation, as Russian's does. Unlike Russian, many Arabic and Hebrew cards hold a Latin transliteration there, which the marks engine does not accept. The backfill moves that transliteration into a notes line, then splits the term the same way, so these cards also get the plain key instead of missing unmarked duplicates. Imports do the same.

**Speech.** Vowelled Arabic resolves كتب for the voice. `saysReading` is true for Arabic only if each voice passes Russian's listening test with a fluent listener; Hebrew decides the same way.

**Case 2: the RTL interface.** Deferred until a learner asks. It needs `ar` or `he` in ADR 0013's `appLanguage` enum with a reviewed catalog, `<html dir>` beside `lang`, `supportsRTL` and a reload after `forceRTL` on the phone, and the fixes in Evidence: about fifteen locations identified in this audit.

## Delivery

1. **Direction for every RTL deck language, on both platforms.**
   - `textDirection`, `dir` in `TermText`, `ExampleText` and the cue, `dir="auto"` in the input primitives, and `isolate()` or `<bdi>` at the 64 interpolations and in joins.
   - The `Arab` and `Hebr` faces.
   - A Grit rule that fails learner text interpolated into `t`, `msg` or `<Trans>` without isolation.
   - No record and no schema change.
2. **The Arabic record,** after Russian's first slice: the split, fold, reading key, search fold, backfill and conformance fixture, plus the listening test.
3. **Harakat on the cue on the web and the phone,** then the `ar` prompt module, imports, decks, the page, and `ar` joining `SupportedTag`.
4. **Hebrew, the same way,** plus the pointed line.
5. **Unscheduled: case 2,** starting with a developer-palette switch for `<html dir="rtl">` and `check:styling` covering `translate-x-`, `origin-*` and inline `left`.

## Verification

- **Component tests.** `term-text.browser.test.tsx` checks computed `direction` and word order for an Arabic term holding a Latin word and digits, isolates in a toast title, and an input turning RTL as Arabic is typed.
- **Playwright.** `e2e/right-to-left.spec.ts`, in Chromium and iPhone WebKit, seeds an Arabic deck with mixed examples, a tag and notes. It checks order by bounding boxes, and checks that a search without harakat finds a vowelled term.
- **Verify skills.** A `right-to-left.md` feature in each skill reviews an Arabic card, archives it and reads the toast; the phone's runs in Maestro. `arabic.md` and `hebrew.md` come with their records.

## Instrumentation

The question: do learners with an RTL deck keep reviewing as others do, before and after slice 1? `review_graded` gains `text_direction=rtl` when the card's tag is RTL, and carries no text. Slice 3 adds `reading` and `reading_language=ar`.

## Open questions

1. Who reviews Arabic and Hebrew prompts, decks and listening tests? Without one, slices 3 and 4 wait; 1 and 2 do not.
2. On a Quran deck, should harakat leave the cue once Known, though the mushaf is always vowelled? Lean: yes, one rule, since a setting is ruled out.
3. A Naskh face, matching textbooks and the mushaf, or the system sans? Lean: Naskh.
4. Do `arz`, `apc` and `ary` resolve to the Arabic record? Lean: no, direction only, since prompts and voices are Modern Standard.
5. Arabic first? Lean: yes, with more demand and no letter-changing spelling.
6. Should the backfill move a transliteration into notes, which changes learner content, or leave those cards on their marked key? Lean: notes, since the transliteration stays visible and the duplicate rule then holds.
