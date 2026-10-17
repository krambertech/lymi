---
status: exploration
date: 2026-10-17
decision: none
---

# A lighter card form on the web

Adding a card on the web should ask for the term and the meaning, and show other fields only when the learner asks for one. It works when Kateryna adds a lesson's cards on the web without scrolling past fields she never uses, and an edited card opens showing what the card holds rather than everything a card could hold. What is not decided is listed under [Open questions](#open-questions).

## The form today

On a desktop, `CardForm` shows Term, Meaning, Deck and Section, then a **More fields** fold. Opened, it adds example, pronunciation, source, tags, notes with a line of Markdown syntax, the hook with its own description, the picture drop zone, the language, and four captioned review-mode checkboxes. At 1280 px that is 1,366 px of form in an 828 px sheet, and every field is an empty box of the same weight. An edited card opens with the fold open whenever it uses any of these fields, which is almost every card.

At 393 px the same four fields lead a sideways-scrolling row of eight chips, of which three and a half fit: Example, Pronunciation, Source and part of Tags. Each chip opens its field in its own drawer.

The furigana pull request ([#785](https://github.com/krambertech/lymi/pull/785)) relabels Pronunciation as **Reading** on Japanese and Chinese cards. It also adds a "how it reads" preview of the term with furigana and the example with its readings. The preview shows only for a Japanese card with a kana reading over kanji, or an example with `[かな]` readings. On a desktop it is a full-width block under the Reading and Source row. In the touch layout it sits inside the Example and Reading drawers.

The phone app already has the lighter shape ([phone.md](../design/system/phone.md), Add a word). Term and meaning are always shown, and every other text field appears only once it holds something or its chip adds it in place, drawn as a name over a line with no box. The chips are ordered by last use on that phone, and the choices (deck, section, picture, how it's asked, tags) each open a row sheet.

## Evidence

These counts come from Kateryna's library on 2026-10-17: 798 active cards in two Estonian decks.

| Field | Cards holding it | Who wrote it |
| --- | --- | --- |
| Meaning | 798 | the lesson 532, the learner 259, the AI 7 |
| Notes | 785 | never the AI |
| Section | 798 | |
| Source, tags | 750 each | |
| Example | 0 | |
| Pronunciation | 0 | |

Most of these cards came from an assistant or Smart add, so the counts show what a finished card holds, not what was typed into the sheet; no event records that, and hooks and pictures cannot be counted through search. These decks keep examples inside the notes. The form's first two extras, Example and Pronunciation, are the two these cards never use.

## Where each field belongs

| Field | When adding | Does the AI enrich it? |
| --- | --- | --- |
| Term, meaning | always | the meaning, when the deck allows it |
| Deck, section, source, tags | once per lesson, carried to the next card | no |
| Notes | often, per card | when the deck allows it |
| Example, pronunciation or reading | rarely typed | when the deck allows it ([defaults](../../packages/core/src/enrichment.ts)) |
| Language | follows the deck | always |
| Memory hook | almost never: a hook is for a word that keeps failing (card-writing rule 8), and review offers one then | its draft, in review only |
| Picture | sometimes, by paste | no |
| How it's asked | almost never | no |

Every field can be changed later from the card page's edit sheet. When adding, any field the AI may fill can be left blank: the card page shimmers until the AI's text lands, marks it with the AI badge, and it can be corrected from there.

## Options

- **A. A shorter fold.** Keep More fields, move the language and review modes into a fold of their own, show the notes syntax line only on focus, and put notes first. It is the cheapest, but opening the fold still shows a stack of empty boxes.
- **B. The phone's shape on the web.** Term and meaning, then the deck on a row of its own, then one chip row on every screen size. The chips stay on one line that scrolls sideways, and the row's edge fades wherever more chips are hidden; a mouse wheel scrolls it on a desktop. Each chip leads with its field's icon, as on the phone, and ends in a mark that says what a press does. Chips are ordered by how much the deck's cards use each field. There are two kinds of chip:
  - **A text chip** (notes, example, pronunciation or reading, source, picture) ends in a small plus and adds its field in place, focused. A field that holds text stays. Notes keeps one short syntax line under it, always visible: "**bold**, *italic*, [link](https://…), and - for a list".
  - **A picker chip** (section, tags, how it's asked) never becomes a field. It ends in a small chevron, opens a popover on a desktop or a drawer on touch, and then shows what was chosen. How it's asked lists the picture modes only once the card has a picture, as on the phone. Section, only when the deck has sections, comes first and reads "Lesson 7". Tags opens a combobox of the tags in use, with Create for a new one, and reads the tag's name, or "2 tags" for more than one. How it's asked reads its label while it follows the deck, the mode's name for one, or "Asked 2 ways". When the chip shows a count, hovering it lists the names after Lymi's half-second tooltip delay, and the chip's accessible name carries the full list. A text label on a chip needs no tooltip of its own ([overlays.md](../design/system/overlays.md)).
- **C. Lesson details.** Source, tags and section already carry from card to card, so they could become one line under the deck, such as "Lesson 7 · word, частое", that opens to change them.
- **D. Fewer fields when adding.** Offer the hook and the language only when editing. How it's asked stays on the add sheet, because as a picker chip it costs one chip. A pasted picture still works when adding, because pasting adds the picture chip.

## Leaning

B with D. Adding shows two fields, the deck and a chip row, with no hook and no language. Editing is the same form: every field that holds text is shown, every empty one is a chip, the hook included, and the language joins how it's asked in the last picker. The phone app and the web then share one shape, as long as D reaches the phone too: its Add a word drops the hook chip, and Edit card keeps it. The furigana preview becomes one block under the last of Reading and Example that is shown, and only while one of them holds a reading. It never takes its own row while both are still chips. C is an [open question](#open-questions).

## Instrumentation

Product question: which optional fields does a learner fill by hand when adding a card, and after the change, do they still open fields they leave empty? Add `fields` to `cards_added` with `source=typed`: the fixed names of the optional fields that held text, never their content. Add a browser event, `card_field_added`, with `field` and `form` (`add` or `edit`), fired when a chip adds a field. Ship `fields` on the current form first, so there is a baseline to compare against.

## Open questions

1. Should desktops use the chip row too (B), or a shorter fold (A)? Settled: B, with the scrolling row of icon chips described above.
2. Should the chips be ordered by last use on this device, or by how many of the deck's cards hold each field? Lean: the deck's cards, because the order is then right on every device and stays still while a lesson is added. In Kateryna's Estonian decks that gives Notes, Tags, Source, then Example and Pronunciation, which no card uses. A deck with no cards yet follows its language's enrichment preset ([defaults](../../packages/core/src/enrichment.ts)): Reading and Example first for Japanese or Chinese, and Notes first for Estonian or German. Section comes first when the deck has sections, and How it's asked comes last. The phone orders by last use today, so it would change too.
3. Should the hook and the language leave the add sheet in both apps (D)? Lean: yes. Leaving them on the phone would keep the two apps different.
4. Should the fields be drawn without boxes, as on the phone, or keep the standard control box from [forms.md](../design/system/forms.md)? Lean: keep the box, because showing only the added fields removes most of the weight. Drawing them without boxes would change the design system's rule that every control is the same box.
5. Should Source also be a chip with a value, since it is one short line that carries per lesson? Lean: yes, a one-line popover. The phone keeps Source as a field, so the phone would change too.
6. Should source, tags and section become a lesson line (C)? Lean: not in the first slice. Revisit once `fields` shows how often they change between cards.
7. How should a chip say what a press does without a mark on every chip? Lean: group them. Pickers come first as small selects with their value and a chevron, then one muted "+ Add" label, then the text chips as plain words with no box, icon or mark. The alternatives are a label with its end mark and no field icon, or the icon, label and mark described above. The prototype's chips tweak shows all three.
