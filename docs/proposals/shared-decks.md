---
status: exploration
date: 2026-09-06
decision: none
---

# Shared decks

This document preserves a promising future product direction. It is not an accepted decision, an implementation plan, or a commitment to build classroom features. Lymi's current focus remains the private, single-user experience and its missing fundamentals.

## Opportunity

Vocabulary is often collected socially even when it is learned individually. Classmates study the same material, friends divide the work of preparing for an exam, and teachers or tutors already curate words and examples for learners.

Shared decks could let:

- a study group build one useful deck together;
- one person prepare a deck that several friends can learn from;
- a teacher or tutor maintain a deck for a class;
- learners suggest additions or corrections without taking control of the material.

The central product principle is:

> The group shares the material. Each person owns their learning.

People may see the same canonical cards, but review history, FSRS state, due dates, queue, and personal learning choices must remain separate for every learner.

## Sharing models worth distinguishing

"Share a deck" can describe several different products:

1. **Share a copy.** The recipient duplicates a snapshot and owns it from then on. This is simple and safe, but later improvements do not flow back to the copy.
2. **Share a live deck.** One canonical deck has multiple learners. Content updates reach everyone while learning progress stays personal.
3. **Collaboratively edit a live deck.** Multiple people can change the canonical content. This needs permissions, attribution, recovery, and a way to prevent low-quality or accidental changes.

If Lymi explores this direction, a private live deck is the most promising foundation. Copying can remain available as an escape hatch. Unrestricted simultaneous editing is not required to make the feature valuable.

## Candidate collaboration model

This is a direction to test, not a predetermined permission system.

| Role | Possible responsibility |
| --- | --- |
| Owner | Controls the deck, membership, permissions, and final content |
| Editor | Makes direct changes to trusted shared content |
| Contributor | Suggests new cards and corrections for approval |
| Learner | Studies the deck without changing shared content |

The smallest useful interface may expose only **Can study** and **Can contribute** when an owner creates an invitation. More explicit roles would be useful only if real groups need them.

A possible contribution flow:

1. A member proposes a card or correction.
2. The owner or an editor can approve it, adjust it, or decline it.
3. An approved card becomes ordinary deck content and appears as new for each learner.
4. The activity history records who contributed and who accepted the change.

For a small trusted study group, the owner could allow direct editing. For a teacher-led deck, learners would more likely study or contribute while the teacher retains editorial control.

The contribution lifecycle described here is distinct from AI and MCP writes in [ADR 0001](../adr/0001-integration-cards-are-ordinary-cards.md). That ADR deliberately makes authorized integration writes ordinary cards in a learner's own space. If shared deck contributions are adopted, their trust boundary and relationship to ADR 0001 will need an explicit decision.

## Personal and shared boundaries

Likely shared content:

- term and meaning;
- pronunciation and examples;
- source and shared tags;
- deck settings that define how its cards are presented.

Likely personal state:

- FSRS state and complete review history;
- due dates and daily queue;
- pausing or hiding a card for oneself;
- personal mnemonics or notes;
- personal progress and statistics;
- possibly a personal recall-direction override.

Teacher-visible learning analytics are a separate product decision. They would move Lymi toward an assessment or learning-management product and introduce additional expectations around privacy, consent, and interpretation. Deck sharing does not require them.

## Changes to shared cards

The product would need predictable behavior when canonical content changes. Some plausible principles to explore:

- a new shared card starts as new for every learner;
- a minor correction preserves learning progress and is visibly attributed;
- a material change to the prompt or answer is called out to people who already learned it;
- archiving removes the card from future queues without erasing review history;
- invite links and member access can be revoked;
- the owner explicitly controls whether members may keep a personal copy after leaving.

The exact boundary between a minor and material edit is open.

## Existing product patterns

- [Anki](https://docs.ankiweb.net/contrib.html#sharing-decks-publicly) supports public or private deck packages. Recipients own imported copies, and updates are manual rather than collaborative.
- [AnkiHub](https://www.ankihub.net/) adds canonical subscribed decks, private decks, member suggestions, administrator approval, and automatic updates to subscribers.
- [Quizlet](https://help.quizlet.com/hc/en-us/articles/360037864311-Changing-a-set-s-editing-permissions) lets an owner make a set editable by selected classes or by people with a password.
- [Brainscape](https://brainscape.zendesk.com/hc/en-us/articles/115002384212-How-do-I-change-users-Editing-permissions-for-my-flashcards) uses class-level Admin, Edit, Full Study, and Preview permissions.
- [RemNote](https://help.remnote.com/en/articles/7322908-how-can-i-create-flashcards-with-someone-else) offers both read-only group sharing and shared knowledge bases. Its documentation warns that review history in a shared knowledge base is currently shared between users, which demonstrates why shared content and personal scheduling must be separate.
- [Knowt](https://help.knowt.com/en/articles/10716299-how-to-add-multiple-teachers-to-my-class) supports teacher-owned classes with co-owner, contributor, and viewer roles, alongside learner progress features.

The useful pattern across these products is not simply sharing a link. Stronger systems separate access, editorial authority, content updates, and personal study state.

## Implications for the current Lymi model

This direction would be more than an authorization toggle.

Today, decks and cards belong to one user. `card_states` includes a `user_id`, but its uniqueness rule is only `(card_id, direction)`. A live shared card would need separate scheduling state for every learner and direction. The product would also need deck membership, invitations, roles, content attribution, and authorization across the app, API, and MCP.

No exact schema is proposed here. If the direction is validated, the implementation work should begin with a fresh product decision and a migration designed around the chosen sharing model.

## Possible initial boundary

If this becomes active work, the smallest coherent scope to evaluate is:

- private shared decks;
- account-based, revocable invitations;
- independent learning progress;
- study-only members and moderated contributions;
- visible attribution and reversible content changes.

This boundary deliberately excludes a public marketplace, discovery feed, assignments, grades, class chat, competitive leaderboards, real-time cursor-based editing, and a full teacher dashboard.

## Questions to answer before deciding

- Is the first audience a peer study group, a teacher and learners, or both?
- Do early users primarily want a copy or a continuously updated canonical deck?
- Should trusted contributors edit directly, or should every contribution be approved?
- Which parts of a card can learners personalize without forking it?
- What should happen to learned cards after a material content change?
- May a member keep a copy after access is revoked or the shared deck is archived?
- Is progress always private, optionally shared, or visible to a teacher by default?
- How should API and MCP writes behave when the destination is a shared deck?
- What evidence would justify moving shared decks into the product roadmap?

An ADR should be written only after these questions are sufficiently resolved and Lymi commits to a particular collaboration and ownership model. An implementation plan would follow that decision.
