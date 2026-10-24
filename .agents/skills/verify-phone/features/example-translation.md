# Example translation and audio

A card's example keeps its translation into the meaning language beside it (ADR 0038), and the example can be read aloud on a press. Review shows the translation after the reveal, right after the example, in parentheses and quieter, or on its own line when the example reads right to left, and leaves out one written for an earlier example; a tap on the example reads it aloud, and nothing plays on its own. The card page runs the translation on after the example, with one AI badge by the label when the AI wrote both and the badge after the translation when it wrote only that, the speaker at the example's row end, **Translated from an earlier example. Edit it to match.** for the owner when the example changed since, and **Couldn’t translate the example.** with **Try again** when the AI's run failed. Edit card hangs the translation from the example as a chin, a filled strip led by the language mark, once the example has text; a new example clears the AI's translation from the form, and typing the old example back restores it.

## Reach

No persona holds these, so [`example-translation.mjs`](example-translation.mjs) adds four decks to `learner`: **Deutsch** with der Hund and an English translation, **Wörter** with die Katze and a Ukrainian translation beside das Brot, whose example changed after its translation was written, **日本語** with 直角 and an example carrying readings, and **Italiano** with il pane, whose example and translation `/api/dev/enrich` writes as the AI.

## Drive

[`example-translation.yaml`](example-translation.yaml): review Deutsch and check the translation is missing before the reveal and there after it, then open der Hund's card page and press **Play example**. Review 日本語 and reveal, then open 直角's card page. Open die Katze and das Brot from Wörter, then das Brot's **Example** field. Open il pane, its **Example** field, add `oggi` to the example, take it off again, add it back and save. Last, open Add a card and type an example into the empty field key by key, then a translation into its chin, each followed by more keys with no tap.

## End state

`01-review-translation` shows (The dog is sleeping.) after the example, muted, with no speaker. `02-card-page-example` shows the speaker red and its toast without a speech key, and the speaker back at rest after the clip with one. `03-review-japanese` and `04-card-page-japanese` draw ちょっかく over the example's 直角 with the translation after it. `05-card-page-ukrainian` shows the Ukrainian translation, `06-card-page-stale` the stale line, and `07-editor-stale` the example's chin holding I eat bread. with **Translated from an earlier example.** under it. `08-card-page-ai` badges the example AI; `09-editor-new-example` shows the chin emptied with **AI translates it after you save**, and `10-editor-example-typed-back` the AI's translation back. `12-example-typed-key-by-key` and `13-translation-typed-key-by-key` hold every key typed, with the caret still in the field: the chin appearing never remounts the example's input. The check reads il pane with the new example and without the AI's old translation.

## Gotchas

- A local Worker has no speech key, so the speaker's press is answered 503 and only its failure shows; with `GEMINI_API_KEY` in `apps/web/.dev.vars` it plays and reads **Replay example**, and a spent day reads **Today’s new example audio is used up. Examples you’ve played still play.**
- Without `OPENAI_API_KEY` the server queues no translation, so the saved Italian example ends with none and no shimmer. To see the shimmer, then **Couldn’t translate the example.** and **Try again**, set this worktree's `apps/web/.dev.vars` to an invalid key such as `OPENAI_API_KEY=sk-invalid`, restart the stack, and stay on il pane's card page after the save: the run fails within a minute.
- The revealed review card is one VoiceOver element, so its speaker is offered as the card's **Play example** action, which Maestro cannot take; the press is driven on the card page.
- A card page field is one VoiceOver button, so the translation is matched inside its label and the speaker stands at the row's end, outside it.
- Maestro reads no focus from these inputs on iOS (`focused` is false even for the field being typed in), so focus is proven by keys typed after the chin appears landing without another tap.
