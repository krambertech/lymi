# AI services

The account's one choice whether Lymi may send the learner's cards, lesson pages and words to AI services ([ADR 0038](../../../../docs/adr/0038-the-phone-sends-nothing-to-ai-until-the-learner-allows-it.md)). The web never asks: an unanswered choice shows as on and AI runs, and turning the switch off stops every AI request for the account, from the phone too.

## Reach

Settings → **AI services**, the group after Daily reminder.

## Drive

[`ai-services.mjs`](ai-services.mjs), as `learner` from Settings: the **Use AI services** switch starts on for an account that never answered, turn it off, reload, then turn it on again.

## End state

Off, the switch's description says **Off. Cards stay as you type them, and only your own recordings play.** and `/api/settings` reports `aiConsent: false`, also after a reload. On again, it names the services and `/api/settings` reports `aiConsent: true`.

## Gotchas

- A persona reset leaves the choice unanswered, which the web shows as on; only the phone treats it as off.
- What each AI feature does without the choice is proven by `apps/web/src/server/services/ai-consent.test.ts`, since local development has no AI keys.
