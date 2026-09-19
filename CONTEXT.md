# Lymi

A vocabulary app for one learner. Cards come from lessons, by hand or through integrations, and are remembered with spaced repetition.

## Language

### Content

**Card**: One thing worth remembering: a term and whatever context it has. It may hold a word, a phrase or anything else, so the interface counts and names cards, never words. A card added by an integration is an ordinary card from the moment it lands. The public site may say "flashcard" to name the category for people searching for one. _Avoid_: Word, flashcard, entry, proposal, draft, suggestion

**Term**: What the card asks about, in the language being learned: a word, a phrase or anything else worth remembering. _Avoid_: Word, front

**Deck**: A named group of cards. It may carry a default language, but language lives on the card. _Avoid_: Collection, list, folder

**Library**: The screen holding every deck. The decks are decks; Library is where they are. _Avoid_: Decks (as a screen name), collections, my decks

**Series**: An owner's optional, ordered group of their own decks, reviewed together. A deck is in at most one series, and a deck without one works as it always has. A member of a shared deck never sees the owner's series. Deleting a series asks whether its decks are archived with it or stay in Library; the series itself is gone for good, and grouping those decks again means making a new one. _Avoid_: Course, collection, folder, playlist, group

**Section**: An optional, ordered part of one deck, such as one lesson. Every learner of the deck sees its sections; only the owner changes them. A card is in at most one section of its own deck, and a card without one works as it always has. The owner chooses how sections open for everyone studying the deck. By default each learner starts with the first, and the next opens automatically once every card of the current section has come up and 80% are Known. The owner can instead make it **ready** at that point, for the learner to **Start**, or open every section at once. **Start anyway** opens a later section early, with every section before it. A section never locks again, and a card the learner already started always stays in review. _Avoid_: Lesson (for the grouping), chapter, unit, module, level

**Field source**: Where one field's text came from: the lesson, the AI, or the learner. Kept per field, on the meaning, the example and the pronunciation, so AI text is never mistaken for the lesson. "AI" is Lymi's own enrichment and nothing else: text a connected app or the API sends is the learner's whoever composed it, because Activity already names the app, and only the lesson may be claimed for it.

**AI badge**: The violet mark beside a field that says Lymi's enrichment wrote it. Only that is marked: the learner's own words and the lesson's are the ordinary case and carry nothing, which is what makes the badge carry. The text itself stays ordinary text, because the learner is meant to read the meaning, not the label. Editing a field the AI wrote makes it the learner's and the badge goes. _Avoid_: Tag, flag, chip (for this one), "AI-generated", disclaimer

**App language**: The language the interface and reminders are written in. A per-learner setting, taken from the browser on first sign-in and changeable in Settings. Meanings follow it. _Avoid_: Locale, UI language, interface language (in copy)

**Meaning language**: The language meanings are written in. Follows the app language and is not shown as its own setting. Independent of any card's language. The one exception is a published deck added in a chosen edition, which stays in that language whatever the app language becomes. _Avoid_: Native language, mother tongue, L1, base language

**Duplicate**: A card whose normalised term and language match an existing active card anywhere in the learner's decks. Adding one is skipped, never rejected, and the caller is told which card already exists.

**Enrich**: The AI filling in missing fields on an existing card: meaning, example, pronunciation, language. It never overwrites a field that has text. The only AI work the server does; extraction from lesson material happens in the MCP client. _Avoid_: Prepare, generate, suggest

### Remembering

**Review**: The spaced-repetition act: see a card, grade recall. Never used for looking over cards an integration added. _Avoid_: Study, practice, session (for the act itself)

**Grade**: The learner's rating of one recall, 1 Forgot to 4 Easy. _Avoid_: Score, answer, rating (in prose)

**Review mode**: What a review shows before reveal (the cue) and what the learner grades (the target). Recognition is term → meaning and production is meaning → term; picture → term and picture → meaning show the card's picture and are set on the card, never the deck. A deck and a card each have a list, and a card's list overrides its deck's. A card of picture modes only is asked in the text mode with the same target until it has a described picture. Only one mode of a card comes up in a review. ADR 0014. _Avoid_: Card type, side, front and back

**Picture**: A card's one optional image, private to the people who study its deck unless its publisher approves that exact image for a published deck's public page. Its description says what it shows without naming the answer; picture modes wait for one. Called `image` in the API. _Avoid_: Photo, attachment, media

**Direction**: The older name for a deck's or card's text review modes, still accepted by the API. Recognition shows the term. Production shows the meaning.

**Streak**: Days in a row whose daily goal was satisfied, drawn as the flame. Today adds once satisfied and is otherwise skipped, so an unfinished morning still shows yesterday's streak; a confirmed nothing-due day keeps the run without adding to it. Distinct from the seven lights, which say which days rather than how many. _Avoid_: Chain, run, days active

**Round**: A review of a chosen set beside the day's draw: one of Today's groups, new cards, forgotten today or slipping, or Review forgotten at the end of a review. Each card comes once, and every grade counts like any review. _Avoid_: Session, quiz, practice

**Slipping card**: A card forgotten at least 4 times in at least 6 reviews. Insights lists them; Today offers them as a round. The interface calls the group "Often forgotten"; "slipping" is the code and API name. _Avoid_: Leech, slipping, stuck card, hard card (in copy)

**Review day**: One learner-local date measured against its goal. It is open until satisfied, then goal met or exhausted; a day Lymi confirms had nothing eligible is nothing due. The day boundary follows the review timezone. _Avoid_: Session, day (in the API)

**Daily goal**: How many recall attempts satisfy a learner-local day's streak goal, 50 unless the learner chooses otherwise. Every accepted grade counts, Forgot and a card seen again included; completing every eligible review below the goal also satisfies the day. Changed only in the streak modal. _Avoid_: Target, quota, XP, cards per day

### Integrations and oversight

**Actor**: Who made a write: the learner in the app, the API, an MCP client, the AI, or the system.

**Audit row**: The record of one write: its actor, the connected app behind it and that app's name at the time, what was written and what happened to it. Every write leaves one, and Activity reads them and nothing else, so a write with no audit row is the bug to look for when something lands unseen. _Avoid_: Log entry, event (in copy), history

**Scope**: What a key or OAuth grant may do: read, or read and write. Reviews are never writable by an integration.

**Connected app**: An MCP client the learner let in on the consent screen, listed in Settings. The grant behind it is an OAuth consent; "connected app" is what the learner is shown, because the client is the thing they recognise. _Avoid_: Integration (that is the actor), authorized client, OAuth client (in the interface)

**Disconnect**: Taking a connected app's access back. Revokes its refresh token, so it is locked out once its current access token expires and has to ask again. _Avoid_: Revoke (that is for API keys), remove, delete

**Import**: One file brought in from another app, such as an Anki package, a Mochi export or a Lymi file from another account. It is listed in Activity with its source, counts and warnings, and archiving it archives every card it added and each deck it made that is left empty; restore brings back exactly those. Each imported card keeps the source's id for it, so importing the same file again updates rather than duplicates. A recall from the source's log is history: it shows in Insights and never counts toward a daily goal or the streak. _Avoid_: Migration, sync, upload (for the thing itself)

**Export**: One file the learner takes out of Lymi, for one deck or the whole library: an Anki package that Anki and Mochi open, or a Lymi file that Lymi imports back without loss. The server writes it, it downloads only with the learner's own session or key, and it is deleted a day after it is written. Only decks the learner owns are in it: a member never carries someone else's cards out of Lymi, and the library file leaves their shared decks out. A spreadsheet of one deck is written in the browser and is not an export in this sense. _Avoid_: Backup, download (for the thing itself), dump

**Activity**: The list of what came into the learner's decks from outside the app — imports, and writes made by integrations and the AI — with the files they took out and who is in their shared decks: joins, leaves, removals, and the join link going on or off. Nothing lands unseen. Writes of one kind by one caller in one deck on one day are one row, which opens the cards it wrote so they can be inspected, edited or archived without leaving. _Avoid_: Review queue, inbox, approvals, history (for this screen)

**Settings**: The screen holding every setting: the learner's photo, language, theme, the review timezone, the daily reminder, connected apps and API keys, then exporting the library and importing from another app. Nothing else lives there. _Avoid_: You, profile, account, preferences

**Learner menu**: The menu behind the learner's name in the rail and their avatar on the phone. It leads to Settings, Archived, the docs, feedback and sign-out, and on the phone to Activity and Insights as well; keyboard shortcuts appear where there is a keyboard and Install where the browser can do it. _Avoid_: Profile menu, account menu, user menu

**Feedback**: A note a learner writes to Lymi from the learner menu: a bug, an idea or something else. It is kept and sent to the people who make Lymi, who answer by email. _Avoid_: Support ticket, report, request, bug report (as the feature name)

**Inspect**: Looking over a card an integration added, and optionally editing or archiving it. _Avoid_: Review, approve

**Archive**: Hiding a card or deck without destroying it. Restore undoes it. Everything a learner writes is archived rather than deleted, so this is the word for removing cards, decks and sections. _Avoid_: Delete, remove, trash

**Delete**: Removing a series for good. A series is a grouping and holds no writing of its own, so nothing a learner made is lost and there is nothing to restore. The only delete the app has; never use the word for a card, deck or section.

### Sharing

**Shared deck**: A deck with members. One deck, one owner, many learners: every member sees the same cards, and each keeps their own schedule and history. _Avoid_: Shared copy, class, group, collection

**Owner**: The learner whose deck it is. The only one who writes to it, for now. _Avoid_: Admin, creator, author

**Member**: A learner who joined a shared deck. Studies it, cannot change it, and cannot export it. The deck page and About this deck name its owner, and Leave is the only move offered on it. _Avoid_: Subscriber, follower, student, collaborator

**Role**: What a member may do in a shared deck: owner, editor, contributor, or learner. Only owner and learner exist in the interface yet.

**Join link**: A deck's one shareable link. Anyone who opens it can join. The owner can turn it off. _Avoid_: Share link, invite link, public link

**Published deck**: A shared deck anyone can add from its public page, without a link from the owner. Only Lymi's publishers publish. Withdrawing it stops new adds; members keep studying. Its add page says **Add to Lymi**. ADR 0020. _Avoid_: Public deck (in copy), catalog deck, template, marketplace

**Explore**: Where a learner finds a published deck. One catalogue in two places: `lymi.app/explore`, the page a visitor lands on, and Explore in the app, under Insights in the rail and in the learner menu on a phone, where one press adds a deck to Library. Both read the same rows, so neither can say something the other does not. _Avoid_: Catalogue (as a screen name), browse, discover, store, marketplace

**Edition**: One meaning-language version of a published deck. The deck's own fields are its original edition, and every further edition is a localization of the meaning side. All editions share the same terms, ordering, pictures, sources and review modes, so they are one deck rather than translated copies. A learner picks an edition when they add the deck and keeps it; changing the app language never moves it. ADR 0015. _Avoid_: Translation, version, variant, locale, copy

**Localization**: The text of one series, deck, section or card in one edition, with who wrote it, whether a publisher has signed it off, and the revision of the original it was written from. Only signed-off text reaches a reader. Text written before the original changed is **stale**, and an edition that is stale or unfinished cannot be published. _Avoid_: Translation row, string, i18n, override

**Invitation**: A deck's welcome to one email address. Accepting it, or joining through the join link, creates the account if there is none. _Avoid_: Invite (as a noun), request, seat

**Join**: Becoming a member of a shared deck. **Leave** is the member's way out and **Remove** is the owner's; neither deletes the member's reviews. _Avoid_: Subscribe, enroll, follow, kick
