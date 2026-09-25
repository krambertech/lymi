---
name: ux-copy
description: Write or revise Lymi's learner-facing interface text. Use whenever a product change adds or changes controls, instructions, states, notifications, accessibility names, or localized messages; review English, Ukrainian, and Russian.
---

# Write Lymi UX copy

[The voice rules](../../../docs/design/system/voice.md) own Lymi's tone and its message patterns. This skill is the order you write in.

## Ground the copy

Read the affected behavior in [`PRODUCT.md`](../../../PRODUCT.md), the terms and avoid-list in [`CONTEXT.md`](../../../CONTEXT.md), the voice rules, and the strings already on the same screen. Describe only behavior the product has, and name the learner's task, not the system behind it: "Couldn’t save the card", not "Request failed".

## Choose the message shape

Walk this once per string:

```
Is it a button, menu row, or tab?
├── Yes → a verb that names what happens, 3 words or fewer ("Create deck", "Archive")
└── No
    ├── A field error?            → how to fix it, one sentence ("Keep the term under 500 characters.")
    ├── Any other error?          → "Couldn’t [verb] [thing]." then the fix, never a status code
    ├── An empty state?           → what is empty and why, then one action ("Insights fill in from your first review.")
    ├── A destructive confirm?    → only when nothing can undo it; buttons name the consequence and what stays ("Revoke key" / "Keep key")
    ├── A title or heading?       → 6 words or fewer, sentence case, no final period
    ├── A toast or notice?        → 2 sentences or fewer; say what happened, then what to do if anything
    └── An accessible name?       → what the control does, as a button label would say it
```

The limits exist because a phone row at 393 px holds about 3 words of button and Ukrainian runs longer than English, so a label at the limit in English is often over it in Ukrainian.

## Check each string

- One term for one thing across the flow, taken from `CONTEXT.md`. A learner who reads "archive" on one screen and "remove" on the next assumes two different actions.
- One idea per sentence.
- Sentence case. No exclamation marks, idioms, guilt, urgency, or celebration, because Lymi speaks to one learner who chose to be here.
- Count cards, never words or points.
- Write apostrophes as ’ (U+2019), as every string in the catalog does.
- Mark AI-written content only on the field it wrote.
- Every field has a visible label; every icon-only control has an accessible name.

| Draft | Shipped |
| --- | --- |
| Oops! Something went wrong loading Explore. | Couldn’t load Explore |
| No data yet. Start reviewing to see your stats! | Insights fill in from your first review. |
| Invalid invitation (410) | This join link stopped working. Ask the owner for a new one. |

## Check every language

- English is the source message. Mark a whole sentence for localization; never assemble one from fragments around a value. `AGENTS.md` has the Lingui macros.
- Translate every changed message with [the translate skill](../translate/SKILL.md), then read English, Ukrainian, and Russian in the running interface, in each affected state.
- Check 393 px and 1280 px for wrapping, overflow, and truncation. When a natural translation does not fit, change the layout or shorten the English idea; never bend the translation to fit.
- Mark wording you are unsure of as needing native review, and do not report that language as verified.

## Finish

The copy is done when all three languages carry the same meaning and action, every affected state was read in the running interface, and every uncertain translation is listed. Hand off the languages and states checked, any visual check skipped, and each translation still needing review.
