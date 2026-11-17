---
status: accepted
date: 2026-11-17
decision: Inline math, chemistry and code in every card field, display blocks in notes only, released on web and phone together after a phone renderer test
---

# Math, chemistry and code on cards

A learner preparing for a physics, chemistry or programming exam should see `$E = mc^2$`, `$\ce{H2SO4}$` or `` `map()` `` on a card as a formula, a chemical formula or code, in review and on the card page, on the web and the phone. Today every card field shows that source as typed, and an Anki deck written with MathJax arrives with its `\(…\)` delimiters as literal text.

The decided shape is below. The phone renderer, how speech treats a formula and the exact parser rules are not decided.

## Evidence

**Other apps (checked November 2026).**

| App | Math | Chemistry | Code | How you write it |
| --- | --- | --- | --- | --- |
| Anki | MathJax | mhchem | HTML only | `\(…\)` inline, `\[…\]` display |
| RemNote | KaTeX | mhchem | Code blocks | Inline editor |
| Mochi | KaTeX | Unclear | Markdown | `$…$` in Markdown |
| Quizlet | No | No | No | A symbol picker |
| Brainscape | No | No | No | Its blog says to screenshot LaTeX |

None of them renders diagrams on a card. They use pictures instead, and Quizlet's diagram sets are pictures with pins.

**Lymi today.** Notes are a Markdown subset read by `parseNotes` ([the notes guidance](../design/library-decks-and-cards.md#notes)), with code shown as typed. Term, meaning and example are plain strings, and duplicates ([ADR 0004](../adr/0004-duplicates-are-skipped-not-rejected.md)), search, speech and the picture answer check read them as such. `speechText` passes the term to the voice almost unchanged, so `$x^2$` would be read out as source.

**Learners.** Exam learners are an audience Lymi already serves ([exam pages](../../apps/site/src/lib/exams.ts)). Formulas and code snippets are the content their decks need most. Tables are useful later. Diagrams are rare on cards and heavy to author.

## Decision

- **Scope.** Math through KaTeX, chemistry through its mhchem extension (`\ce{…}`), and code. Tables come later. Mermaid and other diagrams are not planned.
- **Inline everywhere.** Inline math and inline code render in every text field: term, meaning, example, notes and hint.
- **Blocks only in notes.** Display math and fenced code blocks render only in notes, which sit under the answer, so the cue keeps one line. A wide formula on the cue scrolls within its own line instead of shrinking.
- **Delimiters.** `$…$` and `\(…\)` for inline math; `$$…$$` and `\[…\]` for display math in notes. A single `$` follows Pandoc's rule: no space after the opening `$`, no digit straight after the closing one. So "$5 and $10" stays text.
- **Source stays the record.** Every field still stores the typed source. The API, MCP and CSV export carry it unchanged, and the 2,000-character notes limit counts it. Duplicates, search and the picture answer check keep comparing source or its plain words.
- **One release.** The web and the phone render notation in the same release. Nobody sees a formula on one and its source on the other.
- **The card form stays plain.** No preview, toolbar or symbol picker in this release. A preview is the first thing to add if learners write formulas by hand and get them wrong.

## Keeping cards readable

Supporting notation invites long derivations on a card. The release holds to these rules:

- The cue has no blocks, so it stays one fact.
- Notes keep their existing subset. Headings, tables and images still show as typed.
- AI enrichment, Smart add and the MCP instructions write one fact per card and split a long derivation into several cards.
- A malformed formula shows its source in `ink-muted`, never an error box or a blank.

## Open questions

- **Phone renderer.** KaTeX needs a DOM, which React Native lacks. Candidates are MathJax to SVG through `react-native-svg` (already a dependency), RaTeX through `ratex-react-native` (v0.0.x), or a WebView. The test picks one by speed on a long card list, fidelity against KaTeX on the same set of formulas, mhchem support and bundle size.
- **Speech.** Whether the voice skips a formula, reads its plain words, or the card offers no audio when its term is mostly notation.
- **Parser rules.** Whether inline code uses single backticks only, and whether notation in term, meaning and example goes through `parseNotes` or a smaller inline-only reader.

## Delivery

1. **Phone renderer test.** About a day, ending in a pick with numbers. It gates the rest.
2. **Parser.** Math and code tokens in `@lymi/core/notes` and an inline-only reader for the other fields, with the `$` rule under test.
3. **Web rendering.** Review, the card page and public deck pages, with KaTeX loaded only on routes that show cards.
4. **Phone rendering.** Review and the card page, using the renderer the test picked.
5. **Imports and AI.** Anki keeps `\(…\)` and `\[…\]` intact. Enrichment, Smart add and MCP instructions write notation and keep one fact per card.

Slices 2 to 5 can land behind one release switch, so the web and the phone turn on together.

**Done when** a heavy-card dev persona (inline math in the term, chemistry in the meaning, a display formula and a code block in notes) is screenshotted in review and on the card page, at phone and laptop width, in both themes, on web and phone; an imported Anki MathJax deck renders on both; and `cards_added` carries the notation each card holds, answering whether exam learners add notation cards and keep reviewing them.

When it ships, the rules move into [the notes guidance](../design/library-decks-and-cards.md#notes) and [docs/stack.md](../stack.md), and this proposal shortens to its rationale.
