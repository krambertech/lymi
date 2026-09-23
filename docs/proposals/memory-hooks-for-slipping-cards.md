---
status: exploration
date: 2026-09-23
decision: none
---

# Memory hooks for slipping cards

## Outcome

A card that keeps slipping gets a new way into memory instead of more of the same recall. This is a separate layer from cards and review, built only to help the learner remember, with AI as the helper. Today offers a focused pass over those cards once enough of them build up; each card gets a memory hook and a short run of fading hints, and the learner leaves with every card in the pass hooked. Success is slipping cards being remembered at their next ordinary reviews, not time spent in the pass.

Repeating a recall that keeps failing costs motivation and adds little. What the research supports at that point is re-encoding: the keyword method (a vivid image built on a sound-alike in the learner's own language) is among the best-evidenced techniques for vocabulary, and retrieval with fading cues turns each attempt into a success with less help each time. Both work for any card, not only single words.

## Shape

**A pass, not a round.** The pass is separate from review and from the existing **Keeps slipping** round, which stays a plain review of the same cards. A round counts every grade; the pass records none. It opens from a Today block that appears only when at least five slipping cards have no hook yet, and a card leaves the pass's set once it has one. The threshold is an internal rule, not a setting.

**The pass records nothing but hooks.** It never grades, never moves a schedule, and never counts toward the daily goal or the streak. A recall seconds after hints says little, and a card already reviewed today waits for tomorrow anyway, so the card's next ordinary review is the honest test of whether its hook worked.

**A hook is the learner's own.** One short line per learner per card, kept beside their schedule rather than on the card. That makes it work in shared and published decks, where a member cannot write to the card, and keeps it out of card notes, which every member reads and only the owner writes. Nobody else sees it, and it is not exported with the deck.

**AI writes the hook automatically.** When a card becomes slipping for a learner, a background Workflow writes a hook for them in the meaning language, through the same structured-output path enrichment uses: a Zod schema in `packages/core`, a reply that parses or retries. This is not enrichment, which fills a card's empty fields; it is its own AI job in its own layer. The hook carries the AI badge until the learner edits it, and they can rewrite or clear it in the pass. The write goes through `services/audit.ts` like every write. Writing it in the background means the pass opens ready and works offline.

**A hook lives only in the pass.** It never appears in review, on the card page or in the card's fields, so review stays exactly as it is and the card stays the lesson's and the learner's. In the pass it sits beside the term and meaning.

**Fading hints need no AI.** They are cut from the term on the client: first letter, first syllable, half the term, then nothing. The learner types or says the term at each step and sees it straight away; there is no grade.

## Delivery

1. **Hooks and the pass.** Per-learner hook storage, the AI job that writes one when a card becomes slipping, the Today block, and the pass: each card's hook with edit and clear.
2. **Fading hints** in the pass, after each card's hook.
3. **Later, each on its own evidence.** A short AI story that uses several slipping cards, a side-by-side pass for cards that are confused with one another, and listen-and-repeat using existing speech.

## Open

- The learner-facing names of the pass, the hook and the AI's part in it, through the UX-copy skill; `CONTEXT.md` gains them once accepted, leaving "Enrich" as it is.
- Whether Activity lists AI-written hooks, since Activity is about what comes into the learner's decks and a hook is not part of a deck.
- Whether a card that is still slipping after its hook worked should return to the pass for a new one, and how the pass tells it apart.
- Whether the hook prompt can avoid a sound-alike that is itself hard to picture in languages whose phonology is far from the meaning language.
