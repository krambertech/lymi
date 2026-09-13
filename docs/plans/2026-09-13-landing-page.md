# The landing page below the hand of cards

**Status:** Shaped 13 September 2026. The hand of cards and the first review fixes shipped in [PR 76](https://github.com/krambertech/lymi/pull/76); the rest is tracked in [issue 86](https://github.com/krambertech/lymi/issues/86). Voice and visual rules are in [PRODUCT.md](../../PRODUCT.md) and [DESIGN.md](../../DESIGN.md); translating the site is Phase 3 of [the localization plan](2026-09-12-localization.md), and self-hosting Onest is [PR 79](https://github.com/krambertech/lymi/pull/79).

## Done when

- The landing sections run in the order below, and every section reads correctly before any script runs or any demo plays.
- Nothing on the page moves unless the visitor caused it, except the hand's deal, which plays once per session.
- `pnpm verify`, `pnpm deploy:check:site` and `pnpm test:e2e` pass, and each changed section is checked at 1440 px and 375 px, in both themes, and with reduced motion.
- `lymi.app/languages` exists and is built from the same section components as the landing page.

## Decisions

- The words stay broad and the examples lean on languages. The headline remains "Keep what you learn."; vertical pages are where the page narrows to one field.
- Motion follows the visitor. A demo waits at rest until it is pressed, dragged or played; there are no scroll-triggered fade-ins.
- Assistants appear as their own marks in their brand colour on plain plates, the rule DESIGN.md already sets for the consent screen. The copy says "Connect from", never "Works with", and the footer names the trademarks, because OpenAI's terms forbid implying a partnership.
- The Join section says the beta is free and promises nothing about future limits.
- The daily goal section may grow the lantern flame inside its demo. The logo keeps the one canonical flame, and PRODUCT.md records this exception.
- There is no phone-and-laptop section in this round.

## Section order

1. The hand of cards. Shipped.
2. The right moment: a forgetting curve the visitor changes.
3. Recall first, reveal second: the review demo.
4. A goal you set: the daily goal, the seven lights and the flame.
5. Enrichment, with pronunciation the visitor can play.
6. For whatever you're learning: use cases that open vertical pages.
7. Your assistant: marks, the conversation demo and setup links.
8. The API.
9. Join the beta.

The three-step strip under the hero goes. The hand already teaches the loop, and the strip repeats it in smaller type.

## Slices

1. **Order and rest state.** [Issue 87](https://github.com/krambertech/lymi/issues/87). Reorder the sections, remove the strip and every scroll-triggered fade-in, make the review demo wait for the visitor, and change the Join copy to say the beta is free. Every later slice builds on this one.
2. **The forgetting curve responds.** [Issue 88](https://github.com/krambertech/lymi/issues/88). The visitor moves review days or grades a point and sees the next gap grow or shrink. The research citations stay and link to their sources.
3. **Enrichment plays pronunciation.** [Issue 89](https://github.com/krambertech/lymi/issues/89). The enrichment demo uses a card from the hand's set and plays its generated clip on request, never on its own. The Lesson and AI labels stay.
4. **Assistants and the API.** [Issue 90](https://github.com/krambertech/lymi/issues/90). Claude, ChatGPT, Claude Code and Codex marks link to their guides, with **Connect an assistant** as a button. The API section says what a visitor can build and offers **Quickstart** and **API reference**.
5. **The daily goal and flame.** [Issue 91](https://github.com/krambertech/lymi/issues/91). The visitor picks a goal, grades a few sample cards, and watches today's light fill and the flame rise. Waits for [issue 69](https://github.com/krambertech/lymi/issues/69), because the page must not advertise a goal chooser the product lacks.
6. **Share image.** [Issue 92](https://github.com/krambertech/lymi/issues/92). Landing and Join links show a designed image in both large and small cards.
7. **Use cases open pages.** [Issue 93](https://github.com/krambertech/lymi/issues/93). Each use case holds one sample card and links to its page once the page exists. The landing sections take their words and cards as props.
8. **Languages page.** [Issue 94](https://github.com/krambertech/lymi/issues/94). `lymi.app/languages` deals only language cards and speaks to learners with lessons, tutors and reading. It is in the sitemap. Waits for slice 7.

A driving-theory page is a later candidate. Rules differ by country, so it would be one page per test, and it would cover the theory exam and never imply the practical one.
