# Lymi

A vocabulary app for one learner. Cards come from lessons, by hand or through integrations, and are remembered with spaced repetition.

## Language

### Content

**Card**: One thing worth remembering: a term and whatever context it has. A card added by an integration is an ordinary card from the moment it lands. _Avoid_: Flashcard, entry, proposal, draft, suggestion

**Term**: The word or phrase on the card, in the language being learned. _Avoid_: Word, front

**Deck**: A named group of cards. It may carry a default language, but language lives on the card. _Avoid_: Collection, list, folder

**Library**: The screen holding every deck. The decks are decks; Library is where they are. _Avoid_: Decks (as a screen name), collections, my decks

**Field source**: Where one field's text came from: the lesson, the AI, or the learner by hand. Shown so AI text is never mistaken for the lesson.

**App language**: The language the interface and reminders are written in. A per-learner setting, taken from the browser on first sign-in and changeable in Settings. Meanings follow it. _Avoid_: Locale, UI language, interface language (in copy)

**Meaning language**: The language meanings are written in. Follows the app language and is not shown as its own setting. Independent of any card's language. _Avoid_: Native language, mother tongue, L1, base language

**Duplicate**: A card whose normalised term and language match an existing active card anywhere in the learner's decks. Adding one is skipped, never rejected, and the caller is told which card already exists.

**Enrich**: The AI filling in missing fields on an existing card: meaning, example, pronunciation, language. It never overwrites a field that has text. The only AI work the server does; extraction from lesson material happens in the MCP client. _Avoid_: Prepare, generate, suggest

### Remembering

**Review**: The spaced-repetition act: see a card, grade recall. Never used for looking over cards an integration added. _Avoid_: Study, practice, session (for the act itself)

**Grade**: The learner's rating of one recall, 1 Forgot to 4 Easy. _Avoid_: Score, answer, rating (in prose)

**Direction**: Which way a card is asked. Recognition shows the term. Production shows the meaning.

**Streak**: Days in a row with at least one review, drawn as the flame. Today counts once it has a review and is otherwise skipped, so an unreviewed morning still shows yesterday's streak. Distinct from the seven lights, which say which days rather than how many. _Avoid_: Chain, run, days active

### Integrations and oversight

**Actor**: Who made a write: the learner in the app, the API, an MCP client, the AI, or the system.

**Scope**: What a key or OAuth grant may do: read, or read and write. Reviews are never writable by an integration.

**Connected app**: An MCP client the learner let in on the consent screen, listed in Settings. The grant behind it is an OAuth consent; "connected app" is what the learner is shown, because the client is the thing they recognise. _Avoid_: Integration (that is the actor), authorized client, OAuth client (in the interface)

**Disconnect**: Taking a connected app's access back. Revokes its refresh token, so it is locked out once its current access token expires and has to ask again. _Avoid_: Revoke (that is for API keys), remove, delete

**Activity**: The list of writes made by integrations and the AI, shown in the app so nothing lands unseen. Cards can be inspected, edited or archived from there. _Avoid_: Review queue, inbox, approvals, history (for this screen)

**Settings**: The screen holding every setting: theme, the daily reminder, connected apps and API keys. Nothing else lives there. _Avoid_: You, profile, account, preferences

**Learner menu**: The menu behind the learner's name in the rail and their avatar on the phone. It leads to Settings, Archived, the docs and sign-out, and on the phone to Activity and Insights as well; keyboard shortcuts appear where there is a keyboard and Install where the browser can do it. _Avoid_: Profile menu, account menu, user menu

**Inspect**: Looking over a card an integration added, and optionally editing or archiving it. _Avoid_: Review, approve

**Archive**: Hiding a card or deck without destroying it. The only kind of removal the app has. Restore undoes it. _Avoid_: Delete, remove, trash

### Sharing

**Shared deck**: A deck with members. One deck, one owner, many learners: every member sees the same cards, and each keeps their own schedule and history. _Avoid_: Shared copy, class, group, collection

**Owner**: The learner whose deck it is. The only one who writes to it, for now. _Avoid_: Admin, creator, author

**Member**: A learner who joined a shared deck. Studies it, cannot change it. _Avoid_: Subscriber, follower, student, collaborator

**Role**: What a member may do in a shared deck: owner, editor, contributor, or learner. Only owner and learner exist in the interface yet.

**Join link**: A deck's one shareable link. Anyone who opens it can join. The owner can turn it off. _Avoid_: Share link, invite link, public link

**Invitation**: A deck's welcome to one Google email. Accepting it, or joining through the join link, creates the account if there is none. _Avoid_: Invite (as a noun), request, seat

**Join**: Becoming a member of a shared deck. **Leave** is the member's way out and **Remove** is the owner's; neither deletes the member's reviews. _Avoid_: Subscribe, enroll, follow, kick
