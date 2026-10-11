---
status: in_progress
date: 2026-10-11
decision: Part 1 accepted as ADR 0031; part 2 is exploration
---

# Stuck cards: later returns, and a different way in

A learner who forgets a card should meet it again once, after long enough that the second try tests memory rather than the screen a minute ago, and a card that still will not stick should get a new way in rather than another repeat. Today neither holds: a forgotten card is back after about five cards, can come back four times in one review, and a grade of Easy on that repeat stretches its schedule by about 60%.

Part 1 changes the returns and is decided in [ADR 0031](../adr/0031-a-forgotten-card-returns-once-after-a-while.md). Part 2, drills for cards that stay stuck, is not decided.

## Evidence

**The learner (October 2026).** A missed card "comes back in three cards", so Easy on it means nothing, and on hard words the returns become a loop of seeing the card again and again without it sticking. Hard on a new card brings it back just as fast.

**Other apps (checked 11 October 2026, mostly from manuals and forums).**

| App | When a forgotten card comes back | Does the repeat earn credit? |
| --- | --- | --- |
| Anki | 10 minutes later by default, earlier only when nothing else is left | Yes, but FSRS's developers say same-day reviews do little for long-term memory |
| SuperMemo | In a final drill at the end of the session | No: final drill grades only drop an item from the drill |
| WaniKani | Later in the same session | No: the item is demoted for the miss whatever the repeat does |
| Quizlet Learn | At the end of the round | Only to finish the round |
| Mochi | In a re-review queue | — |

For cards that stay stuck, Anki suspends a card after 8 lapses and its manual says to reformulate it; SuperMemo calls such cards leeches and its leech wizard offers to reformulate, delete or reset. Both leave the fix to the learner. WaniKani gives every item a mnemonic up front. No app found adapts the practice itself to a stuck card.

**Research.**

- Recalling a word once in each of three spaced sessions beat recalling it three times in one session, 68% to 26% a week later (Rawson and Dunlosky's successive relearning; figures from secondary summaries).
- Longer gaps within a session beat short ones (Pyc and Rawson, 2009; Kornell, 2009). Learners believe the opposite, so the short gap feels better while working worse.
- Retrieval with diminishing cues, where letters of the answer are shown and then withdrawn over tries, beat plain retrieval practice in conditions where plain retrieval did not help (Finley et al., 2011; Psychonomic Bulletin & Review, 2018).
- Retrieving a word's meaning from a different sentence each time beat a constant sentence, after 24 hours too, and more so when spaced; learners again judged the constant cue better.
- LLM-generated keyword mnemonics were rated as imageable, coherent and useful as human ones (Lee, McNichols and Lan, EMNLP Findings 2024).

**Our own history.** [ADR 0025](../adr/0025-the-ai-proposes-card-changes-that-apply-only-when-accepted.md) had the AI diagnose why a card was often forgotten; it was withdrawn because the diagnoses were rarely right. A drill that works without a correct diagnosis is the safer bet.

## Part 1: one return, after a while

- Only Forgot owes a return. Hard is a recall, so a card graded Hard waits for tomorrow like any other.
- A forgotten mode returns once, after 20 other attempts, ±2. At the 20 seconds an attempt the simulation assumes, that is about the 10 minutes Anki uses.
- A return is never served before its gap. When the review runs out first, the card waits in Review forgotten, which is now the re-review: SuperMemo's final drill, offered rather than forced.
- Easy on a mode already graded today counts as Good. All four grades stay on screen, so there is nothing new to explain; the second try just earns no bonus.
- A card forgotten twice today offers a hook when it has none, as an often-forgotten card already does, so the second miss leads to a new angle rather than a third repeat.

### Simulation

`pnpm --filter @lymi/core simulate` runs each rule through the real draw and FSRS. A year is 365 days at a goal of 50 over four seeds; a sitting is one 30-card deck reviewed to its end, over 200 seeds. The simulated learner recalls a return 3 times in 4 at any gap, so these numbers measure what returns cost, not what they teach; the gap's value comes from the research above.

| Rule | Returns a day | Mean gap | A card seen 3+ times, per week | Returns in a sitting, and their mean gap | Left for re-review after a sitting |
| --- | --- | --- | --- | --- | --- |
| ADR 0024: 5, 10, 20, early when nothing else is left | 10.8 | 6.4 | 13.9 | 12.7, gap 5.5 | 0.4 |
| One return after 10 | 7.6 | 10 | 0 | 4.7, gap 10.1 | 4.4 |
| One return after 20, Hard also returns | 6.6 | 20 | 0 | 0.8, gap 19.8 | 7.6 |
| **One return after 20 (chosen)** | **6.0** | **20** | **0** | **0.6, gap 19.7** | **7.6** |
| One return after 30 | 4.2 | 30 | 0 | none | 8.1 |
| No same-day return | 0 | — | 0 | none | 8.1 |

The old rule spent a fifth of the goal on returns, mostly within a minute of the miss, and put some card in front of the learner three or more times about twice a day. In a short deck review it served returns early, at a mean of five cards. The chosen rule nearly halves the attempts on returns and ends the loop. Its cost is that a short review hands most of its misses to Review forgotten instead of returning them itself, which is what makes that re-review worth having as its own step. Fewer returns also leave more of the goal for reviews and new cards, so the year's remembered count rises with every cut, up to dropping returns altogether; that rise is the model valuing a same-day repeat at almost nothing, not evidence that returns are useless.

## Part 2: drills for stuck cards (exploration)

A card that is forgotten again on its return is not helped by a fourth look, and a card forgotten day after day is the learner's real frustration. The leaning is a ladder that gives each new failure a different way in, rather than the same card again: the first miss returns as in part 1; the second try offers a hint when the card has no hook; a second miss offers a hook; a card often forgotten across days opens with both on offer. Review forgotten, and the Often forgotten round on Today, are where this happens. The ways in:

1. **A hint that fades.** The first letters of the answer, fewer on each try, as the second review aid after the hook; a hinted grade cannot be Easy, like a hooked one. It needs no AI and has the strongest evidence here. `REVIEW_AIDS` was shaped for it.
2. **A fresh sentence.** The AI writes a new example around the term for each drill, so recall stops leaning on the one sentence on the card. It needs a check that the sentence uses the term in the card's meaning.
3. **A hook drafted for the moment.** Already offered; part 1 brings it to the second miss of a day.
4. **Side by side with its look-alike.** When two cards are confused, ask them together. Lymi is self-graded and never learns what the learner answered instead, so this needs a way to say "I mixed it up with…", which is the weakest idea here.

Open questions: whether drill grades move the schedule at all (SuperMemo's do not), whether drills are their own mode or steps inside Review forgotten, and how to measure that a drill helped, which needs a comparison of next-day recall on drilled and undrilled stuck cards.
