# Review guide

The mistakes that review of Lymi's merged pull requests has caught and the author then fixed, each with the reason it matters. A reviewer, human or agent, reads this with [`AGENTS.md`](AGENTS.md) and [`CONTEXT.md`](CONTEXT.md). Cite an entry by its id, such as `REVIEW.md D1`. The [review-pr skill](.agents/skills/review-pr/SKILL.md) is how an agent runs a review.

## What is not a finding

- A problem on a line the pull request did not add or change, unless the change makes it newly reachable. Note it as pre-existing, at most.
- Anything a rule in `AGENTS.md`'s enforced-rules table already fails a check for. Raise it only when the diff suppresses, excludes or weakens that check.
- A preference, a rename for taste, or an optional nit. When a suggestion is optional, it is not worth a comment.
- A concern the reviewer could not confirm from the code or the running app. It goes under what was not checked.
- A decision the pull request or its issue already records, such as a deliberate trade-off under Risks or Follow-ups.

## Data and the Worker

- **D1. Keep every statement under D1's 100 bound parameters.** An `IN (…)` list, a multi-row insert or a per-item pair of parameters built from learner data fails the whole batch once the list passes 100, often after earlier writes in the request have landed. Chunk with `selectIn` or slices of about 90, or use an insert-select over a subquery.
- **D2. Bound every input a request can grow.** Cap list lengths and each string's length in the Zod schema, share one budget across a `multi` or nested call rather than per inner call, and stop loops and look-backs over learner text at a fixed length. One unbounded request becomes thousands of D1 queries, a 500 past D1's 2 MB value limit, or tens of seconds of CPU.
- **D3. Make the condition part of the write.** A check read before a write races with a parallel request, a retry or a second device: count then insert, check a link then join, check the latest grade then undo. Put the condition in the `WHERE` of a conditional insert or update and act on the rows it returns.
- **D4. A retry repairs a half-finished write.** When a write commits before its fan-out, audit or cleanup, a retry that sees the first part done must still finish the rest, or the gap is permanent. Prefer one batch; otherwise make each later step idempotent and run it on every retry.
- **D5. One failing item never stops a scheduled run.** Wrap each item of a cron or queue loop in its own try/catch that reports and moves on, keep independent jobs as separate `run` calls rather than chaining them with `.then`, and let a failed item fall behind the others instead of holding the front of the queue on every run.
- **D6. Scheduled queries stay bounded and indexed.** Filter in SQL rather than JavaScript, add a `LIMIT`, and index the column a cron filters on, such as an expiry time. A query that is fine at today's size runs every 15 minutes forever.
- **D7. Respect the Worker's clocks and budgets.** `waitUntil` gets about 30 seconds after the response, and a scheduled invocation shares one subrequest budget across every job in it. Work that can exceed either goes to the cron in small batches, and a lease or lock lasts about as long as the call it guards, not minutes.
- **D8. Use the domain's own predicate instead of re-deriving it.** Active cards need both the card and its deck unarchived (`activeDecks`); review states need the shared `asked` predicate because inactive directions are kept; duplicates compare `termKey` or `normaliseTerm`; a hook needs `hookable`; dense scripts use core's `standsAlone`. A copy written in place drifts from the server's rule.
- **D9. Archive and delete keep what must survive.** A foreign key's cascade can take a record worth keeping, such as a report, with it; use `set null` on a nullable key. A trigger guards deletes that skip the service, and a restore or a join must create the states the archive or the absence left out.
- **D10. A new migration number is claimed by one open pull request at a time.** Parallel branches often add the same number; whichever merges second regenerates its migration, snapshot and manifest entry. Say so in review when another open pull request holds the number.

## Client state and offline

- **C1. A late response never overwrites newer input.** Clear a field only if it still holds what was sent, drop a reply when the sheet closed or reopened on another card (an opening id), and check a `mounted` ref before touching a released player. Otherwise a learner's typing or a different card's draft is replaced.
- **C2. A pending action cannot run twice.** `aria-disabled` does not stop a click, and buttons that come back before navigation finishes invite a second press. Return early while pending, keep a leaving state until the next screen shows, and reuse the id a failed first attempt created.
- **C3. Trust what the server saved, not what was sent.** When the server can keep a newer value (newest client clock wins, a cap, a refusal), resolve the action from the response. An optimistic success that the server never stored misleads the learner and every caller after it.
- **C4. Learner progress is never dropped silently.** Queued grades survive sign-out, account switches and id changes; a refused write shows a recoverable error that keeps the draft; Undo restores the whole earlier state, sections included, and reports "X of Y" when part of it fails.
- **C5. Cached data follows the writes that change it.** `invalidateQueries` only marks a query with no observers stale, so a value derived from it stays wrong until something refetches; invalidate every query a mutation changes or refetch on mount. A query keyed by variable input sets `persist: false` so the cache does not keep a copy per filter for a month.
- **C6. Loading, failure and offline are three different screens.** An error must not leave a skeleton forever, a paused offline query shows the offline line with Try again, and changing a period keeps the previous payload on screen while the next one loads.

## Web and phone

- **P1. Check the other client.** The web and the phone share behaviour, so a change to one usually needs the same change, copy or failure branch on the other: the import messages, what Return does in a picker, how a refusal reads. The pull request either makes both match or says why they differ.

## Interface

`DESIGN.md` and the [review-ui skill](.agents/skills/review-ui/SKILL.md) own the visual and interaction rules; these are the ones review keeps catching.

- **U1. Phone targets are at least 44 px.** A button, chip or field measured at 24 to 40 px fails the learner's thumb; give it the size or a non-overlapping hit area.
- **U2. Text meets 4.5:1 and state colours 3:1.** `text-faint` is decorative only, so meaningful text such as dates or intervals uses a passing token in both themes.
- **U3. Every control and announcement says the truth to a screen reader.** A combobox trigger has its label, a dialog its title, a failure is not announced as success, and text drawn as real characters (stress marks) is not repeated by an `sr-only` copy.
- **U4. Keyboard handlers respect IME composition, focus and order.** Enter handlers return on `isComposing || keyCode === 229`, since Safari confirms a Japanese word with an Enter that is not composing; a dismissed panel returns focus to its trigger; tab order matches visual order; a modal keeps Tab inside; a global shortcut checks modifiers first and skips while a real dialog (not a toast) is open.
- **U5. A responsive shape is decided once.** A component that reads the live media query while its dialog froze its shape mixes drawer and dialog layouts; read the shape from the dialog and keep desktop sizing classes off the touch drawer.

## Copy and languages

- **L1. Copy matches what the code does.** "Report sent" when the report was dropped, "Private" when members keep access, "due today" for a count that means due now: each misleads the learner. When behaviour changes, the sentence, the comment and the docs that describe it change in the same pull request.
- **L2. Test language rules with that language's real words.** Unicode case folding beyond ASCII, NFC against combining marks, hyphenated and apostrophe-joined words, full-width IME digits, one-kana readings inside longer words, script subtags and email case all broke rules that passed on English examples.
- **L3. Localized pages keep their locale.** A link, download or Add button on `/uk/` or `/ru/` passes the page's locale or edition, and changelog entries link the unprefixed path the way earlier entries do.

## Privacy and security

- **S1. Learner content stays out of logs and unconsented calls.** Logging a Drizzle error writes SQL parameters, which can hold card text, into Worker logs; log a category instead. Every call that sends content to an AI service checks the learner's AI choice, and a long run checks it again at each step.
- **S2. A read grant never writes.** A read-scoped key, connection or MCP tool must not insert or store anything, including a getter that creates a default row; a new write power changes what the consent screen says.
- **S3. Credentials and releases are scoped.** A secret is visible only to the step that uses it, a release job runs only from `main`, a trusted origin or redirect is added only when its flow needs it, and a one-time verifier is deleted only after the exchange succeeds. Development routes and fixtures stay out of the production bundle.

## AI and cost

- **A1. Every paid model call is visible and bounded.** It sends `$ai_generation` with its cost, failed calls included; a refused reply is cached as an answer rather than retried daily; a provider with a fallback is excluded from the alerts that page.
- **A2. A cache key change re-pays for everything under it.** Changing a voice, a prompt input or an audio key regenerates every clip on its next play; say so, and keep the old key as a last resort where it still fits.

## Instrumentation

- **I1. An event fires once, at the committed outcome.** Send it when the draft is applied or the server accepts the write, not on each tick of the interface; count only rows this run changed, so overlapping runs do not double-count; give it the property that answers the question the pull request states. `docs/analytics.md` and `packages/core/src/analytics.ts` match what the producers send.

## Tests and docs

- **T1. A test fails without the change it covers.** Check that the test reaches the guarded branch: a test that still passes with the fix removed proves nothing. Cover the branch that keeps a fix working, not only the happy path, and wait for an observable condition instead of a fixed sleep.
- **T2. Docs, specimens and comments move with the code.** A design specimen, `docs/site-structure.md`, `docs/analytics.md` or a doc comment that now describes old behaviour is part of the change. Check that an inserted line did not separate a comment from the code it documents.
- **T3. A lockfile diff holds only the intended packages.** An unrelated re-resolution moves other importers to different copies; reset the lockfile and add only what the change needs.

## Performance

- **F1. Lists and bundles stay as light as before.** A prop that changes identity redraws every memoised row, a sheet or hook per row multiplies by the deck size, a shared island ships one page's code to every page, and a root import pulls a route into the shell chunk. Move the work to where it is used.
