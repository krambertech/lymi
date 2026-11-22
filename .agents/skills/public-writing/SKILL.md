---
name: public-writing
description: Write, edit or review prose Lymi publishes. Use before drafting and again before publishing a blog post, article, landing or comparison page, docs guide, email, store listing, social post or video caption. Interface text uses ux-copy, changelog updates use changelog, and repository documents use docs/guidance.md.
---

# Write for the public

[The voice rules](../../../docs/design/system/voice.md) and [CONTEXT.md](../../../CONTEXT.md) own the tone and the words. `pnpm check:copy` holds what a scan can see. This skill is the rest: each step ends in something to show, because a draft that only feels finished is the one that comes back.

## 1. Say what the reader gets

Write one sentence: who reads this, and what they can do or know afterwards. Show it first. When it cannot be written, ask what the piece is for.

## 2. List the facts

Make a table of claim and source before the draft. A source is code on `main`, a default or label read from it, a measurement with its date, or a study with a link. A claim without a source stays out.

Check that a feature has shipped, on which platform and for whom. Never invent a learner, teacher, quote, number, price, date or experience. A piece in a person's name tells only what that person said; ask for what is missing, and use their voice skill, such as `writing-as-kateryna`, when it is installed.

## 3. Offer three openings

Write three titles with their first paragraph: a plain statement, the reader's own question, and one concrete case. The first paragraph answers the title in at most two sentences. Say which you would use and why. Draft only the chosen one.

## 4. Draft

- State one fact per sentence, with the literal verb. Lymi adds, shows, saves, imports.
- Show a real card, screen or sentence where a description would go, and have a native speaker's check for any other language.
- Name Lymi where it does the thing being explained, and nowhere else.
- Stop when the point is made. Cut a section that restates another one, and a summary of what was just read.

## 5. Strike

Read the rendered piece aloud, line by line. Make a table of line, test and rewrite, and show it even when it is short. A line that fails any test is rewritten or deleted.

| Test | Fails when | Was | Became |
| --- | --- | --- | --- |
| Loss | Deleting it loses no fact | “Questions before you start.” | “Common questions.” |
| Swap | Another flashcard app could print it unchanged | “Keep the nerves, the drugs and the numbers.” | “Flashcards for medical school.” |
| Literal | A thing does what only a person or a plane does | “The key terms land in Lymi.” | “It adds the key terms to Lymi.” |
| Promise | Nobody can keep it: for good, forever, in seconds | “It comes back just as it starts to fade.” | “The gaps grow as you learn.” |
| Beat | Two short halves answer each other | “Type one word. Get a whole card.” | “Type a word. AI fills in the rest.” |
| Clever | It is admired before it is understood | “A deck, not a quiz.” | “Review every question until you know the answer.” |
| Twice | The phrase, claim or shape is already on this page or its siblings | “The flashcard app that gets Japanese.” on eight pages | What only that page can say |
| Outsider | Someone who has never used Lymi asks what it means | “What your assistant writes counts as yours.” | “Look over new cards after your assistant adds them.” |
| Machine | Three parallel items, “not X but Y”, a heading per paragraph, a closing line that sums up | | The natural number, the point, prose, nothing |

A rewrite can fail another test, so run the table again on what changed. Leave a strong sentence alone: flattening every line reads as machine-made too.

## 6. Check

Run `pnpm check:copy`, or `pnpm check:copy <file>` for a draft. A phrase someone strikes later that a scan could have seen goes into `RULES` in `scripts/check-copy.mjs` in the same pull request, with the line as its test.

Write Ukrainian and Russian with [the translate skill](../translate/SKILL.md), and run the strike table on each language: a tell often survives translation.

## 7. Hand over

Show the rendered page at 393 px and 1280 px, the sentence from step 1, the facts table, the three openings with your pick, the strike table, and what you are unsure of. Publishing waits for an explicit yes.

## Blog posts

A post teaches one thing to someone who does not use Lymi yet. It lives under `apps/site/src/content`, where `check:copy` reads it, with a page in each language. An interactive figure answers a question the text has just raised, and the text still makes sense without it.
