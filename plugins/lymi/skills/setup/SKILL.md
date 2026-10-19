---
name: setup
description: Guide a learner from connecting Lymi to their first review. Use after install or first connection, or when they ask to get started, create their first deck, or understand how Lymi works.
---

# Set up Lymi

Guide the learner through a real start: a deck with cards they want to remember, then their first review in Lymi. Ask one question at a time, use answers and material already in the conversation, and explain each part when they reach it. Follow an existing learner's request without making them repeat setup. For an explanation-only request, explain how Lymi works and offer guided setup.

## Connect and orient

Call `list_decks` and `get_settings`. If sign-in is needed, direct the learner to the host's Lymi connection flow and resume after it succeeds. A read-only connection can show existing cards; adding cards needs write access. If a write is refused for that reason, explain how to reconnect with write access and wait for a successful connection before continuing.

Briefly explain that the assistant helps turn what they learn into cards, while Lymi brings those cards back for review at intervals based on their recall. Keep the introduction short enough that the next question is clear.

## Choose or create a deck

- **A deck is already named:** use it. If the name matches several decks, ask which one.
- **Existing decks, no choice yet:** offer the relevant decks by name and ask whether to use one or create a new one. Avoid listing an entire large library.
- **No decks:** ask what language or subject they are learning. Propose a deck named after that language, course or subject. Explain that a deck groups their cards; they can organise it further later.

When they choose a new deck, call `create_deck` and confirm the saved name. Set `defaultLanguage` for a language deck, or `purpose: "subject"` for a subject or exam. Check the returned result before saying the deck exists. If creation fails, explain the failure and the next step; after an uncertain outcome, call `list_decks` before retrying so setup does not create a duplicate. If an existing deck refuses additions because someone else owns it, help the learner create their own deck.

## Add something worth remembering

If the chosen deck already has cards, offer to start review now or add material first. For an empty deck, ask for lesson notes, a transcript, a worksheet photo, or a few terms they want to remember. Use material already shared instead of asking for it again; unfamiliar sample cards make a poor first review.

Use [lesson-to-cards](../lesson-to-cards/SKILL.md) to extract and save their material into the chosen deck. A request to inspect possible cards calls for a preview; a request to add them authorises saving. Create any needed section only after saving is authorised. Write meanings in the returned `meaningLanguage`; explain that this follows their app language if they ask about it, and change `appLanguage` with `update_settings` only when requested, explaining that the interface changes too.

Report the actual added and skipped counts from the tool result. If they lack material or prefer to stop, leave the deck ready and explain that they can send a lesson later; do not fill it without their agreement.

## Begin the first review

Once the deck has cards, invite the learner to start Review with a link to `https://my.lymi.app/review?deck=` followed by the URL-encoded saved deck id. This opens the deck they just prepared; [Today](https://my.lymi.app/today) is the fallback. Explain the sequence before they leave:

- Try to recall the answer from the cue, then reveal it. Depending on the review mode, the cue may be a meaning or a term.
- Choose Forgot, Hard, Good or Easy to describe how recall felt. Forgot means they could not recall it; Hard means they recalled it with difficulty; Good means they recalled it; Easy means they recalled it effortlessly without help.
- Lymi uses that grade to decide when the card returns. Forgetting is part of learning, and every accepted grade counts toward the daily goal.

Review and grading happen in Lymi; a chat quiz does not update the schedule, daily goal or streak. If Lymi has nothing available to review, follow its current state rather than promising a review can start.

## Finish at the handoff

Setup reaches its handoff when the deck and usable cards are confirmed saved, and the learner has the review link and knows how to begin. Say they can return here with the next lesson to add more cards. If they return after reviewing, use `get_streak` to check progress before claiming a review was recorded; opening the app alone does not prove it. Respect a pause or a decision to skip any step, and resume from what is already saved when they come back.
