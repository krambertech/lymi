---
name: ux-copy
description: Write or audit Lymi's learner-facing interface text. Use when adding or changing controls, instructions, states, notifications, accessibility names, or localized messages; review English, Ukrainian, and Russian.
---

# Write Lymi UX copy

[The voice rules](../../../docs/design/system/voice.md) own Lymi’s tone and message patterns. This skill is the order you write in.

## Ground the copy

Read the affected behavior in [`PRODUCT.md`](../../../PRODUCT.md), the terms and avoid-list in [`CONTEXT.md`](../../../CONTEXT.md), the voice rules, and the strings on the same screen. Check the code behind a claim: what is saved, who can see it, what can be undone, and what happens next. Describe the learner’s task in ordinary language.

For an audit, walk the flow before rewriting individual strings. Cover navigation, forms, loading, success, empty results, errors and confirmations. Record which states you saw running and which you inspected only in source. Read the final screen as a whole to catch repetition and inconsistent terms.

## Choose the message shape

| Place | Write |
| --- | --- |
| Navigation or tab | The destination: “Settings”, “Library”. |
| Action | What happens: “Create deck”, “Send feedback”. Include the object when context is ambiguous. |
| Command palette | A searchable action and destination. |
| Field | A visible label; a useful example or format instruction where needed. |
| Error or empty result | What is missing or failed and a usable next step, in text or a nearby control. |
| Irreversible action | What is lost, what stays and whether it can be undone; buttons name the choices. |
| Wait | What is happening. Give a duration only when measured and reliable. |
| Toast | What changed; add a next step only if one is needed. |
| Icon-only control | An accessible name that identifies its action and object. |

Use short labels and headings, but let clarity decide their length. “New deck” opens the form; “Create deck” saves it. Check the available space rather than enforcing a word count.

## Edit in context

Apply these checks together, adapted from Rene Wang’s [Wording in Interfaces](https://rene.wang/essay/wording-in-interfaces):

- **Purpose:** Each line adds a useful fact. Remove text that repeats a heading, control or result.
- **Precision:** Choose the verb for the actual action. Keep one name for each concept throughout the flow.
- **Recovery:** A learner can tell what to try next after failure or an empty search.
- **Consequences:** Explain concrete effects without repeated warnings or fear.
- **Intent:** Speak about what the learner can do; keep implementation details out of ordinary flows.
- **Shape:** Read the rendered text for density, line breaks and scanning, not just grammar.

Then read it aloud. Replace strained phrases such as “Insights fill in” or “the usual answer” with a concrete subject and action. Shorter is useful only when the meaning stays clear. Keep necessary caveats; remove filler, invented certainty and claims about what is worth learning.

Follow Lymi’s vocabulary and voice: count cards; use sentence case and curly quotes; mark AI text only on the field it wrote. Keep screen and grade names capitalized in sentences. A visible label and its accessible name must describe the same action.

## Check every language

- English is the source message. Localize a whole sentence; `AGENTS.md` has the Lingui macros.
- Extract and translate every changed message with [the translate skill](../translate/SKILL.md). Keep placeholders, complete plurals and the same consequences in each language.
- Read English, Ukrainian and Russian in the running interface at 393 px and 1280 px, including changed error and empty states. Check wrapping, overflow, truncation and competing labels.
- When a translation does not fit, adjust the layout or simplify the idea without changing the meaning. List uncertain wording for native review.

## Finish

Re-read each changed flow from entry to outcome. Report the main defects and replacements, checks that ran, states or languages not visually checked, and translations needing native review. Distinguish changes made locally from copy verified in production.
