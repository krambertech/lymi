---
status: accepted
date: 2026-10-24
---

# Phone AI requests require explicit permission

Each account holds one answer, `user_settings.ai_consent`, to whether Lymi may send the learner's content to third-party AI services: card text for enrichment, example translations, hook drafts, deck choice and import language guesses; lesson photos, PDFs and pasted notes for Smart add; and a term for generated pronunciation. The privacy policy names the current providers; the interface never does, so changing one needs no copy change.

Null means unanswered. A request from the phone app (`x-lymi-client`) sends nothing until the answer is true; the web, the API and MCP carry on until it is false. The server enforces it in the services, so no client, old phone build, Shortcut or share extension can send content without it.

## Context

Apple's guideline 5.1.2(i) requires apps to say where personal data is shared, naming third-party AI, and to get explicit permission first. Lymi's first App Store and Google Play submission adds a card with AI on by default, and Smart add sends pages that can hold names and handwriting. Outside the stores the web's existing disclosure and processor agreements cover the same calls, so Kateryna chose to ask only in the phone app, and to let an explicit no from the phone stop the web too, because that choice should also stop the web from sending their cards.

## Considered options

- **One switch for every AI call:** accepted. One answer is simpler to explain and to enforce, and the prompt explains which card text and lesson material each feature sends to third-party AI services. It links to the privacy policy for details about content and recipients.
- **Name each provider in the ask:** rejected. The ask says the content goes to third-party AI services and links the privacy policy, which names the current providers, so a change of provider changes the policy rather than a build.
- **A switch per feature:** rejected. Four answers to give and keep in step, for a learner who mostly wants AI either on or off.
- **Leave speech out:** rejected. A term is rarely personal, but the rule reads card text as content and a reviewer can test it.
- **Grandfather existing accounts:** rejected. The rule requires explicit permission, so existing accounts are asked at their next AI action like new ones.
- **The system alert:** rejected for a Lymi sheet, which has room to say what each feature does and sends; prototype at https://claude.ai/artifact/WxGg4XwBPiRyEgzerzaGZV.

## Consequences

- The phone asks with one sheet at the first AI action: saving a card with AI on, Find terms in Smart add, and the speaker on the learner's own card or its example without a stored clip. Welcome has the same ask as a step before its start choice. Allow saves true and carries on; Not now saves false and the action carries on without AI. Welcome's Not now saves nothing, so the first AI action still asks.
- You → AI services and the web's Settings hold the switch. Turning it off stops new requests; text AI already wrote stays, and clips already stored still play.
- Without permission the phone saves cards as typed, Smart add explains instead of reading, hook drafts and the list menu's play point to You, and the share extension and Shortcut start with AI off.
- A shared or published deck's words belong to its owner, so generated pronunciation follows the owner's answer, and the hourly cron skips publishers who said no.
- An enrichment run checks again at its start and before each chunk of cards or translations, and an edit queues a translation only with permission, so nothing more is sent once the learner says no.
- `PUT /api/settings/ai-consent` mirrors analytics consent: learner only, product origin only, newest `updated_at` wins, audited as `ai.consent`. `ai_consent_shown`, `_granted`, `_declined` and `_withdrawn` count the asks and answers (docs/analytics.md).
