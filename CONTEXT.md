# Lymi

A vocabulary app for one learner. Cards come from lessons, by hand or through integrations, and are remembered with spaced repetition.

## Language

### Content

**Card**: One thing worth remembering: a term and whatever context it has. It may hold a word, a phrase or anything else, so the interface counts and names cards, never words. A card added by an integration is an ordinary card from the moment it lands. The public site may say "flashcard" to name the category for people searching for one. _Avoid_: Word, flashcard, entry, proposal, draft, suggestion

**Term**: What the card asks about, in the language being learned: a word, a phrase or anything else worth remembering. _Avoid_: Word, front

**Deck**: A named group of cards. It may carry a default language, but language lives on the card. _Avoid_: Collection, list, folder

**Style**: What the AI learned about a deck from the cards its owner wrote and their corrections of its text: what the deck is about and the habits its cards follow. It sits under the owner's instructions, which it never changes, and only the owner sees it. ADR 0037. _Avoid_: Profile, preferences, memory

**Correction**: The owner's rewrite of a field the AI wrote, kept as the AI's text beside the card's text now, so the deck's style learns what enrichment gets wrong. Emptying the field counts; putting the AI's text back with Undo withdraws it. Only the owner's own cards have them, and nobody sees them. ADR 0037. _Avoid_: Feedback, rating, fix

**Library**: The screen holding every deck. The decks are decks; Library is where they are. _Avoid_: Decks (as a screen name), collections, my decks

**Series**: An owner's optional, ordered group of their own decks, reviewed together. A deck is in at most one series, and a deck without one works as it always has. A member of a shared deck never sees the owner's series. Deleting a series asks whether its decks are archived with it or stay in Library; the series itself is gone for good, and grouping those decks again means making a new one. _Avoid_: Course, collection, folder, playlist, group

**Section**: An optional, ordered part of one deck, such as one lesson. Every learner of the deck sees its sections; only the owner changes them. A card is in at most one section of its own deck, and a card without one works as it always has. The owner chooses how sections open for everyone studying the deck. By default each learner starts with the first, and the next opens automatically once every card of the current section has come up and 80% are Known. The owner can instead make it **ready** at that point, for the learner to **Start**, or open every section at once. **Start anyway** opens a later section early, with every section before it. A section never locks again, and a card the learner already started always stays in review. _Avoid_: Lesson (for the grouping), chapter, unit, module, level

**Tag**: A label on a card that finds it across decks, such as "food" or "verbs". A card's tags are part of the card, so only whoever can change the card changes them, and a member of a shared deck filters and reviews by the owner's tags without adding their own. The same name is one tag in every deck the learner studies, whatever its case. Tags are plain chips with no colour. Not a **Deck tag**. _Avoid_: Label, category, topic, keyword

**Reading**: How a term written in a script that does not show its sound is read, such as たべる for 食べる or xuéxí for 学习. It is stored as the card's pronunciation, and the card form calls that field Reading on a Japanese or Chinese card. **Furigana** is how Lymi draws a Japanese reading: small kana over the kanji, aligned at display so kana the term already shows stay plain. An example carries its readings inline, `毎朝[まいあさ]パンを食[た]べます。`, each one after the kanji it belongs to. In review furigana sits over the term while the card is New or Learning and waits for the reveal once it is Known. In an example, a reading fades over a word the learner knows: its kanji and reading together match a run on one of their Known cards, so 食べます fades for a Known 食べる while 食事 keeps its reading. The card's own term in its example follows the same rule. **Pinyin** is how Lymi draws a Chinese reading: one syllable with its tone mark over each character, in citation tones as dictionaries write them (不是, bù shì), with an erhua 儿 sharing the syllable before it (一点儿, yīdiǎnr). It sits over the term in review on the same rule as furigana, and tone numbers sent as ni3 hao3 are stored as nǐ hǎo. An example carries pinyin inline after each word, `我[wǒ]去[qù]银行[yínháng]。`, and a syllable fades where its character and syllable match a character on a Known card, because a character keeps its reading across words: a Known 银行 fades 行 háng in 行长 but never 行 xíng in 不行. A Chinese card's script, simplified or traditional, comes from its tag, and Lymi never converts between them. A Tamil card's Reading is worked out from its spelling, word by word, and drawn over each word in Latin letters (பாடல் pāḍal) on the same rule; the field holds one only for a word not said as spelled (பஸ் bas), and an example's reading fades over a word written as one of the learner's Known words. **Jyutping** is how Lymi draws a Cantonese reading, on a card tagged `yue` or `zh-yue`: one syllable with its tone number over each character (銀行, ngan4 hong4), drawn and faded as pinyin is, keyed `jyutping:` so it never meets a pinyin pair. _Avoid_: Romaji, romanization, transcription, furigana field, ruby (in copy)

**Stress**: Which syllable of a Russian or Ukrainian word is stressed, which natives never write. The card keeps the term as natives write it and stores the stress as its pronunciation: the term with U+0301 over each stressed vowel of a word of two or more syllables, such as за́мок, and in Russian ё restored where the term writes е, such as ёжик. A term sent with its stress, as a lesson or an Anki deck marks it, is stored as замок stressed за́мок. The card form calls that field Stress on a Russian or Ukrainian card. In review the marked form stands in for the term while the card is New or Learning and the plain term returns once it is Known; the answer always shows the marks. Examples carry their marks inline and never lose them, because stress moves as a word inflects. _Avoid_: Accent, reading (for this field), emphasis

**Supported language**: A language Lymi treats in full, decided by the card's language tag alone, with no mode or setting: Japanese today. Each has its own record in code, which is the only place a language's tag is checked; every other language works as it always has. _Avoid_: First-party language, featured language, native language, profile, mode

**Example translation**: The card's example in the meaning language, kept beside the example rather than in it, so the example stays one sentence in the language being learned. Review shows it after the answer, right after the example, quieter and in parentheses. Where the deck lets it, the AI writes one for every example, whoever wrote the example, and writes it again when the example changes; one a person wrote stays and is marked as written for an earlier example until they rewrite it. Emptying it is a choice the AI leaves alone until Enrich. An edition carries its own. The example and its translation are each at most 250 characters as shown, readings and stress marks not counted. ADR 0038. _Avoid_: Gloss, subtitle, example meaning, sentence meaning

**Lead-in**: The few words said before a term so generated speech hears which sense is meant, such as 川を渡る before はし for a bridge. It is never shown or spoken on its own, and a card gets one only when its reading alone could name another word. _Avoid_: Context, prefix, hint

**Recording**: A clip of the term itself that came with an import, such as an Anki deck's word audio. It is the card's audio: Lymi plays it instead of reading the term aloud, even on a card with no language, and keeps it through every edit but a new term, which drops it. An export carries it out. It goes wherever its deck goes: whoever studies a shared deck hears it, and a published deck's public page plays it. Generated speech fills only a card without one. A sentence's clip is not a recording of the term and is left out. _Avoid_: Sound, voice, native audio, attachment

**Field source**: Where one field's text came from: the lesson, the AI, or the learner. Kept per field, on the meaning, the example, its translation, the notes, the pronunciation and the hook, so AI text is never mistaken for the lesson. "AI" is Lymi's own enrichment and nothing else: text a connected app or the API sends is the learner's whoever composed it, because Activity already names the app, and only the lesson may be claimed for it.

**AI badge**: The violet mark beside a field that says Lymi's enrichment wrote it. Only that is marked: the learner's own words and the lesson's are the ordinary case and carry nothing, which is what makes the badge carry. The text itself stays ordinary text, because the learner is meant to read the meaning, not the label. Editing a field the AI wrote makes it the learner's and the badge goes. _Avoid_: Tag, flag, chip (for this one), "AI-generated", disclaimer

**App language**: The language the interface and reminders are written in. A per-learner setting, taken from the browser on first sign-in and changeable in Settings. Meanings follow it. _Avoid_: Locale, UI language, interface language (in copy)

**Meaning language**: The language meanings are written in. Follows the app language and is not shown as its own setting. Independent of any card's language. The one exception is a published deck added in a chosen edition, which stays in that language whatever the app language becomes. _Avoid_: Native language, mother tongue, L1, base language

**Duplicate**: A card whose normalised term and language match an existing active card anywhere in the learner's decks. Languages match by their primary subtag, so `ja` and `ja-JP` are one language, and a kana spelling never matches a kanji one. In Japanese, two cards whose kana readings both exist, fit the term and differ are two words, so 上手 read じょうず and 上手 read うわて are not duplicates; a card without a reading matches either. In Russian and Ukrainian the Stress counts the same way, so замок stressed за́мок and замок stressed замо́к are two cards, and a term matches with or without its stress marks. In Ukrainian ’, ‘, ʼ and ` are one apostrophe, so м’ясо and м'ясо are one term. Adding one is skipped, never rejected, and the caller is told which card already exists.

**Enrich**: The AI filling in missing fields on an existing card. The deck lists which of meaning, example, the example's translation, notes and pronunciation it may fill, and the language is always filled; the AI fills only the ones that suit the card, following the owner's instructions for the AI, the deck's style and the deck's own cards. It never overwrites a field that has text, except that it rewrites its own example translation for a changed example. ADR 0033. _Avoid_: Prepare, generate, suggest

**AI services**: The third-party services Lymi sends a learner's content to: OpenAI for enrichment and hook drafts, Anthropic and Cloudflare for Smart add, and Google, OpenAI or ElevenLabs for generated pronunciation. The account holds one choice about all of them; the phone app asks for it before the first AI action and sends nothing until the learner allows it, and a no stops the web too. ADR 0039. _Avoid_: AI consent, data sharing, permissions (in copy)

**Extract**: The AI choosing which terms in material the learner brought deserve a card: a lesson read by Smart add, or a passage the learner highlighted while reading. It decides a new card's term, and enrichment then fills the card's fields. An assistant connected over MCP extracts with its own model and adds the cards itself. _Avoid_: Suggest, propose, detect, pick (the learner picks on Smart add's list)

### Remembering

**Review**: The spaced-repetition act: see a card, grade recall. Never used for looking over cards an integration added. _Avoid_: Study, practice, session (for the act itself)

**Grade**: The learner's rating of one recall, 1 Forgot to 4 Easy. _Avoid_: Score, answer, rating (in prose)

**Review mode**: What a review shows before reveal (the cue) and what the learner grades (the target). Recognition is term → meaning and production is meaning → term; picture → term and picture → meaning show the card's picture and are set on the card, never the deck. A deck and a card each have a list, and a card's list overrides its deck's. A card of picture modes only is asked in the text mode with the same target until it has a described picture. Only one mode of a card comes up in a review. ADR 0014. _Avoid_: Card type, side, front and back

**Picture**: A card's one optional image, private to the people who study its deck unless its publisher approves that exact image for a published deck's public page. Its description says what it shows without naming the answer; picture modes wait for one. Called `image` in the API. _Avoid_: Photo, attachment, media

**Direction**: The older name for a deck's or card's text review modes, still accepted by the API. Recognition shows the term. Production shows the meaning.

**Streak**: Days in a row whose daily goal was satisfied, drawn as the flame. Today adds once satisfied and is otherwise skipped, so an unfinished morning still shows yesterday's streak; a confirmed nothing-due day or a rest day keeps the run without adding to it. Distinct from the seven lights, which say which days rather than how many. _Avoid_: Chain, run, days active

**Round**: A review of a chosen set beside the day's draw: one of Today's groups, new cards, forgotten today or slipping, Review forgotten at the end of a review, or cards chosen on a deck page with Select cards. Each card comes once, and every grade counts like any review, except that Easy on a card already seen today counts as Good (ADR 0031). _Avoid_: Session, quiz, practice

**Slipping card**: A card whose first grade of the day was Forgot on at least 3 of the last 5 days it was reviewed, before today. It leaves the group once it is remembered, and review offers it a hook when it has none. ADR 0024. Insights lists them; Today offers them as a round. The interface calls the group "Often forgotten"; "slipping" is the code and API name. _Avoid_: Leech, slipping, stuck card, hard card (in copy)

**Important card**: A card the learner marked as important. On a day with more to review than the goal it is more likely to come up, and its schedule is unchanged. The mark is the learner's own, like a schedule: a member can mark a shared deck's card and nobody else sees it. _Avoid_: Priority, starred, favourite, flagged, pinned

**Hook**: A short association in the meaning language that leads back to a term, such as a sound-alike word or a picture in the mind. The learner writes it while adding or editing the card, or in review from the revealed card's menu or the offer a card shows without one when it is often forgotten or forgotten twice today, where Draft a hook asks the AI for one and puts it in the field to edit. Review shows it under the cue: the learner can **peek** at it before the reveal, or show it after. A peek is recorded with the grade as its aid, and a grade after one cannot be Easy, because Easy means recall without help; showing the hook after the reveal records nothing. A hook is private card content like the notes, written in the deck's own meaning language, so it is not an edition field and a reader of another edition sees none. A hook leads back to the answer and gives none of it away; a hint gives away part of the answer, such as its first letters, so the two are different things. _Avoid_: Hint, mnemonic

**Rest day**: A past day that fell short of its goal, with reviews or none, and still kept the run, because the run had no other rest day in the six days before it. Automatic and never declared or stored. It keeps the streak without adding to it; any other short day breaks the run. _Avoid_: Freeze, skip, pass, grace

**Review day**: One learner-local date measured against its goal. It is open until satisfied, then goal met or exhausted; a day Lymi confirms had nothing eligible is nothing due. The day boundary follows the review timezone. _Avoid_: Session, day (in the API)

**Daily goal**: How many recall attempts satisfy a learner-local day's streak goal: 25 for a new account from its first visit to Today or a skipped Welcome, the learner's choice at Welcome on the phone, and 50 for an account from before either. Every accepted grade counts, Forgot and a card seen again included; completing every eligible review below the goal also satisfies the day. Changed afterwards only in the streak modal. _Avoid_: Target, quota, XP, cards per day

### Integrations and oversight

**Actor**: Who made a write: the learner in the app, the API, an MCP client, the AI, or the system.

**Audit row**: The record of one write: its actor, the connected app behind it and that app's name at the time, what was written and what happened to it. Every write leaves one, and Activity reads them and nothing else, so a write with no audit row is the bug to look for when something lands unseen. _Avoid_: Log entry, event (in copy), history

**Scope**: What a key or OAuth grant may do: read, or read and write. Reviews are never writable by an integration.

**Connected app**: An MCP client the learner let in on the consent screen, listed in Settings. The grant behind it is an OAuth consent; "connected app" is what the learner is shown, because the client is the thing they recognise. _Avoid_: Integration (that is the actor), authorized client, OAuth client (in the interface)

**Disconnect**: Taking a connected app's access back. Revokes its refresh token, so it is locked out once its current access token expires and has to ask again. _Avoid_: Revoke (that is for API keys), remove, delete

**Import**: One file brought in from another app, such as an Anki package, a Mochi export or a Lymi file from another account. It is listed in Activity with its source, counts and warnings, and archiving it archives every card it added and each deck it made that is left empty; restore brings back exactly those. Each imported card keeps the source's id for it, so importing the same file again updates rather than duplicates. A recall from the source's log is history: it shows in Insights and never counts toward a daily goal or the streak. _Avoid_: Migration, sync, upload (for the thing itself)

**Export**: One file the learner takes out of Lymi, for one deck or the whole library: an Anki package that Anki and Mochi open, or a Lymi file that Lymi imports back without loss. The server writes it, it downloads only with the learner's own session or key, and it is deleted a day after it is written. Only decks the learner owns are in it: a member never carries someone else's cards out of Lymi, and the library file leaves their shared decks out. A spreadsheet of one deck is written in the browser and is not an export in this sense. _Avoid_: Backup, download (for the thing itself), dump

**Activity**: The list of what came into the learner's decks from outside the app — imports, and writes made by integrations and the AI — with the files they took out and who is in their shared decks: joins, leaves, removals, and the join link going on or off. Nothing lands unseen. Writes of one kind by one caller in one deck on one day are one row, which opens the cards it wrote so they can be inspected, edited or archived without leaving. _Avoid_: Review queue, inbox, approvals, history (for this screen)

**Settings**: The screen holding every setting: the learner's photo, language, theme, the review timezone, the daily reminder, connected apps and API keys, then exporting the library and importing from another app. Nothing else lives there. The phone has no Settings screen; You holds the same settings there. _Avoid_: You, profile, account, preferences

**Learner menu**: The menu behind the learner's name in the rail and their avatar on the phone. It leads to Settings, Archived, the docs, feedback and sign-out, and on the phone to Activity and Insights as well; keyboard shortcuts appear where there is a keyboard and Install where the browser can do it. _Avoid_: Profile menu, account menu, user menu

**Feedback**: A note a learner writes to Lymi from the learner menu: a bug, an idea or something else. It is kept and sent to the people who make Lymi, who answer by email. _Avoid_: Support ticket, report, request, bug report (as the feature name)

**Inspect**: Looking over a card an integration added, and optionally editing or archiving it. _Avoid_: Review, approve

**Archive**: Hiding a card or deck without destroying it. Restore undoes it. Everything a learner writes is archived rather than deleted, so this is the word for removing cards, decks and sections. _Avoid_: Delete, remove, trash

**Delete**: Removing a series for good. A series is a grouping and holds no writing of its own, so nothing a learner made is lost and there is nothing to restore. Besides **Delete account**, the only delete the app has; never use the word for a card, deck or section.

**Delete account**: Ending the learner's Lymi account and erasing what it holds, for good: their decks, cards, reviews and settings. It is confirmed with a code sent to their email, or with Sign in with Apple, and nothing restores it. Each person who studies one of their unarchived decks, shared or published, keeps a private copy of it with their own progress and without the owner's name; an archived deck goes for everyone, so archiving first is how an owner takes a deck away. Until a member's copy is made, the deck waits under its **former owner**, and nobody can change it. Lymi's own publisher accounts, on `PUBLISHER_EMAILS`, cannot be deleted from the app, since they hold the decks in Explore. _Avoid_: Close, deactivate, remove, archive (for the account)

### Sharing

**Shared deck**: A deck with members. One deck, one owner, many learners: every member sees the same cards, and each keeps their own schedule and history. _Avoid_: Shared copy, class, group, collection

**Owner**: The learner whose deck it is. The only one who writes to it, for now. _Avoid_: Admin, creator, author

**Member**: A learner who joined a shared deck. Studies it, cannot change it, and cannot export it. The deck page and About this deck name its owner, and Leave is the only move offered on it. _Avoid_: Subscriber, follower, student, collaborator

**Role**: What a member may do in a shared deck: owner, editor, contributor, or learner. Only owner and learner exist in the interface yet.

**Join link**: A deck's one shareable link. Anyone who opens it can join. The owner can turn it off. _Avoid_: Share link, invite link, public link

**Published deck**: A shared deck anyone can add from its public page, without a link from the owner. Only Lymi's publishers publish. Withdrawing it stops new adds; members keep studying. Its add page says **Add to Lymi**. ADR 0020. _Avoid_: Public deck (in copy), catalog deck, template, marketplace

**Deck report**: Counts a publisher reads about their own published decks through the API: adds, first reviews, returning learners and page views. It never names a learner. ADR 0028. _Avoid_: Analytics, stats, insights (Insights is the learner's own screen)

**Explore**: Where a learner finds a published deck. One catalogue in two places: `lymi.app/explore`, the page a visitor lands on, and Explore in the app, under Insights in the rail and in the learner menu on a phone, where one press adds a deck to Library. Decks sit on a shelf per language they teach, then a shelf per subject, such as Science or Citizenship. Today's first-run guide offers its decks under **Or start with a ready-made deck**. Both read the same rows, so neither can say something the other does not. _Avoid_: Catalogue (as a screen name), browse, discover, store, marketplace

**First-run guide**: Today until the first review: three steps (create a deck, add cards, finish the first review), then ways to create a first deck and ready-made decks. A new account starts there; its first visit counts as getting set up. In code, `first-run`; the server's word is onboarding. _Avoid_: Tour, wizard, setup flow, checklist

**Welcome**: The phone's screens a new account sees once, before Today: what the learner is learning, a daily goal, and a way to start. The web retired them for the first-run guide, and `/welcome` leads to Today. _Avoid_: Tour, wizard

**Deck tag**: One label from a fixed list that a publisher puts on a published deck, such as Travel or HSK 1. The deck's page shows its tags as plain chips, and Explore's search finds them. It is not a **Tag** on a card, and nothing copies one into the other. _Avoid_: Topic, keyword, category (the category is the deck's shelf)

**More like this**: The row of related published decks at the end of a deck's page, on `lymi.app` and in the app. Decks sharing tags come first, then decks in the same language, then decks on the same shelf; in the app, decks already in Library are left out. _Avoid_: Recommendations, suggested decks, "You may also like"

**Edition**: One meaning-language version of a published deck. The deck's own fields are its original edition, and every further edition is a localization of the meaning side. All editions share the same terms, ordering, pictures, sources and review modes, so they are one deck rather than translated copies. A learner picks an edition when they add the deck and keeps it; changing the app language never moves it. ADR 0015. _Avoid_: Translation, version, variant, locale, copy

**Localization**: The text of one series, deck, section or card in one edition, with who wrote it, whether a publisher has signed it off, and the revision of the original it was written from. Only signed-off text reaches a reader. Text written before the original changed is **stale**, and an edition that is stale or unfinished cannot be published. _Avoid_: Translation row, string, i18n, override

**Invitation**: A deck's welcome to one email address. Accepting it, or joining through the join link, creates the account if there is none. _Avoid_: Invite (as a noun), request, seat

**Report**: A learner telling Lymi that a deck or card someone else wrote is hateful, sexual, harassing, spam or otherwise wrong, in a deck they study but don't own, from the deck's or card's menu or About this deck; someone who has only seen a join page cannot. Lymi reads it within a day. An operator dismisses it, archives the card or deck for good, or **suspends the owner from sharing**, which archives every deck they share and stops them turning on a join link or inviting anyone; their own learning is untouched. The owner never learns who reported. Not a **Deck report**, and not **Feedback**. In code, a content report. _Avoid_: Flag, complaint, abuse report, block

**Join**: Becoming a member of a shared deck. **Leave** is the member's way out and **Remove** is the owner's; neither deletes the member's reviews. _Avoid_: Subscribe, enroll, follow, kick
