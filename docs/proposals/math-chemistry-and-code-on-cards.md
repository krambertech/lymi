---
status: accepted
date: 2026-11-17
decision: Inline math, chemistry and code in every card field, display blocks in notes only, released on web and phone together after a phone renderer test
---

# Math, chemistry and code on cards

A learner studying for a physics, chemistry or programming exam writes `$E = mc^2$`, `$\ce{H2SO4}$` or `` `map()` `` on a card. Review and the card page should show a formula, a chemical formula or code, on the web and the phone. Today every field shows the source as typed. An Anki deck written with MathJax arrives with its `\(…\)` delimiters as literal text.

Not decided yet: the phone renderer, what speech does with a formula, and two parser details. They are listed under [Open questions](#open-questions).

## Evidence

**Other apps, checked November 2026.**

| App | Math | Chemistry | Code | How you write it |
| --- | --- | --- | --- | --- |
| Anki | MathJax | mhchem | HTML only | `\(…\)` inline, `\[…\]` display |
| RemNote | KaTeX | mhchem | Code blocks | Inline editor |
| Mochi | KaTeX | Unclear | Markdown | `$…$` in Markdown |
| Quizlet | No | No | No | A symbol picker |
| Brainscape | No | No | No | Its blog says to screenshot LaTeX |

None of them renders diagrams on a card. They use pictures, and Quizlet's diagram sets are pictures with pins.

**Lymi today.** `parseNotes` reads notes as a Markdown subset and shows code as typed ([the notes guidance](../design/library-decks-and-cards.md#notes)). Term, meaning and example are plain strings. Duplicates ([ADR 0004](../adr/0004-duplicates-are-skipped-not-rejected.md)), search, speech and the picture answer check all read those strings. `speechText` sends the term to the voice almost unchanged, so the voice would read `$x^2$` out loud as source.

**Hypothesis.** Lymi already has exam pages ([exams.ts](../../apps/site/src/lib/exams.ts)). Exam decks need formulas and code more than tables, and tables more than diagrams. No usage data backs this order yet. The events under Delivery will measure it.

## Decision

- **Scope.** Math through KaTeX, chemistry through its mhchem extension (`\ce{…}`), and code. Tables come later. Mermaid and other diagrams are not planned.
- **Inline in every field.** Inline math and inline code render in term, meaning, example, notes and hint.
- **Blocks only in notes.** Display math and fenced code blocks render only in notes, which sit under the answer. The cue stays one line. A formula too wide for the cue scrolls sideways at full size.
- **Delimiters.** Inline math is `$…$` or `\(…\)`. Display math in notes is `$$…$$` or `\[…\]`. A single `$` follows Pandoc's rule: the opening `$` has no space after it, and the closing `$` has no space before it and no digit straight after it. "$5 and $10" and "$HOME and $PATH" stay text. `\$` is a literal dollar in every field, which means the reader for term, meaning and example needs backslash escapes too.
- **Fields store source.** The API, MCP and CSV export carry the source unchanged, and the 2,000-character notes limit counts it. Duplicates, search and the picture answer check compare source or its plain words, as today.
- **One release.** The web and the phone start rendering notation in the same release. A learner never sees a formula on one and its source on the other.
- **The card form stays plain.** It gets no preview, toolbar or symbol picker in this release. If learners who type formulas by hand often save broken ones, a preview comes next.

## Keeping cards readable

Notation makes long derivations tempting. These rules keep a card to one fact:

- The cue renders inline notation only.
- Notes keep their subset. Headings, tables and images still show as typed.
- AI enrichment, Smart add and the MCP instructions write one fact per card and split a derivation into several cards.
- A malformed formula shows its source in `ink-muted`, in place, so the rest of the card still reads.

## Open questions

- **Phone renderer.** KaTeX needs a DOM, and React Native has none. The candidates are MathJax to SVG through `react-native-svg` (already a dependency), RaTeX through `ratex-react-native` (v0.0.x), and a WebView. [Issue #1187](https://github.com/krambertech/lymi/issues/1187) picks one by scroll speed on a long card list, fidelity against KaTeX on one formula set, mhchem support and bundle size.
- **Speech.** The voice could skip a formula, read its plain words, or the card could offer no audio when its term is mostly notation.
- **Parser.** Inline code may use single backticks only. Term, meaning and example may go through `parseNotes` or through a smaller reader that knows only inline notation.

## Delivery

Each slice is one pull request, in this order:

1. **Phone renderer test** ([#1187](https://github.com/krambertech/lymi/issues/1187)). About a day. Done when the issue has a comparison table and a pick. Every later slice waits for it.
2. **Parser.** Math and code tokens in `@lymi/core/notes`, and the inline reader for the other fields. Done when tests cover each delimiter, the `$` rule, `\$` and malformed input, and a count of production cards the parser would render differently is in the pull request with a sample of them. Cards that already hold a `$…$` or backtick pair change on both apps the day the switch turns on, so review that sample before slice 4 turns it on.
3. **Web rendering.** Review, the card page and public deck pages. KaTeX loads only on routes that show cards. Rendering stays switched off until the phone release in slice 4 is live.
4. **Phone rendering.** Review and the card page, with the renderer slice 1 picked. When that phone release is live, switch web rendering on.
5. **Imports and AI.** The Anki importer keeps `\(…\)` and `\[…\]` intact. Enrichment, Smart add and the MCP instructions write notation and keep one fact per card.

The feature is done when all of these hold:

- A heavy-card dev persona has inline math in the term, chemistry in the meaning, and a display formula and a code block in notes. It is screenshotted in review and on the card page, at phone and laptop width, in both themes, on the web and the phone.
- An imported Anki MathJax deck renders on the web and the phone.
- Events answer whether exam learners add notation cards and keep reviewing them, documented in [docs/analytics.md](../analytics.md). `cards_added` carries `notation`, the kinds its cards hold (`math`, `chemistry`, `code`), on every `source`, not only `typed`, because Anki imports bring most MathJax decks. `review_graded` carries the same `notation` for the graded card, so recall on notation cards can be compared with the rest.

When it ships, move the rules into [the notes guidance](../design/library-decks-and-cards.md#notes) and [docs/stack.md](../stack.md), and shorten this proposal to its rationale.
