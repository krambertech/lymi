# AI consent

The phone sends nothing to AI services until the learner allows it ([ADR 0039](../../../../docs/adr/0039-the-phone-sends-nothing-to-ai-until-the-learner-allows-it.md)). One sheet, **Use AI in Lymi?**, says what each feature does and sends, at the first AI action: saving a card with AI on, Find terms in Smart add, and the speaker on the learner's own card without a stored clip. Welcome asks as a step before its start choice.

## Reach

Add a word from Today's top bar, with the AI chip on; You → **AI services** for the switch.

## Drive

[`ai-consent.yaml`](ai-consent.yaml), as `learner`, whose choice a reset leaves unanswered: add `la tempesta` with AI on and answer **Not now**, turn the AI chip back on and **Turn on AI**, add `il fulmine`, then open You → **AI services**.

## End state

After Not now the card is added and the chip reads **AI off**; after Turn on AI the next add asks nothing. You's row reads **On** and its sheet holds the switch. `/api/settings` reports `aiConsent: true` and both cards are stored.

## Gotchas

- Local development has no AI keys, so both cards store `enrichmentStatus: null`; that the first was sent without `enrich` and the second with it is proven by `apps/web/src/server/services/ai-consent.test.ts`.
- Welcome's step and Smart add's ask are driven by [welcome.yaml](welcome.yaml) and [smart-add.yaml](smart-add.yaml).
