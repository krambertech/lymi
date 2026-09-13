# Data model and API

Reference for what is in D1 and what the API returns. Source of truth is `packages/core/src/schema` for tables, `packages/core/src/types.ts` for request bodies and `packages/core/src/responses.ts` for responses. This page describes; it does not decide.

## Entities

```mermaid
erDiagram
  user ||--o{ session : has
  user ||--o{ account : "signs in with"
  user ||--o{ decks : owns
  user ||--o{ cards : owns
  decks ||--o{ cards : contains
  decks ||--o{ deck_members : "shared with"
  decks ||--o{ deck_invitations : "join link"
  user ||--o{ deck_members : "studies"
  cards ||--o{ card_states : "one per learner per review mode"
  cards ||--o{ card_images : "one active picture"
  card_states ||--o{ reviews : "append-only"
  user ||--o{ review_days : "one per local date"
  review_days ||--o{ reviews : "counts toward"
  reviews ||--o| review_undos : "taken back"
  user ||--o{ audit_log : "every write"
  user ||--|| user_settings : has
  user ||--o| user_avatars : "photo"
  user ||--o{ apikey : "personal keys"
  user ||--o{ push_subscriptions : "one per subscribed device"

  decks {
    text id PK
    text user_id FK
    text name
    text description
    text default_language "nullable, convenience only"
    text directions "recognition | production | both"
    int position
    int archived_at "nullable"
  }
  cards {
    text id PK
    text user_id FK
    text deck_id FK
    text term "the word or phrase"
    text normalized_term "normaliseTerm(term), duplicate key"
    text meaning "nullable"
    text pronunciation "nullable, IPA or hint"
    text example "nullable"
    text notes "nullable, grammar etc"
    text language "nullable BCP 47"
    json tags "string array, global per user"
    text source "nullable free text: where it came from"
    text directions "nullable override of the deck setting"
    text meaning_source "lesson | ai | manual"
    text example_source "lesson | ai | manual"
    text audio_key "nullable R2 key"
    json review_modes "nullable mode keys, read only while directions is set"
    text image_version "nullable opaque token of the last picture write"
    text created_by "user | api | mcp | ai | system"
    int archived_at "nullable"
  }
  user_settings {
    text user_id PK
    text app_language "nullable en | uk | ru"
    text meaning_language "default en"
    int daily_goal "recall attempts, default 50"
    int daily_goal_chosen_at "nullable until chosen"
    text review_timezone "nullable IANA zone"
    text review_timezone_mode "automatic | manual"
    int review_timezone_updated_at "nullable"
  }
  user_avatars {
    text user_id PK
    text custom_key "nullable opaque R2 key"
    text custom_version "nullable delivery token"
    int custom_revision "bumped by every learner write"
    text google_key "nullable opaque R2 key"
    text google_version "nullable delivery token"
    int google_fetched_at "nullable, when that fetch began"
  }
  deck_members {
    text id PK
    text deck_id FK
    text user_id FK
    text role "owner | editor | contributor | learner"
    text invitation_id "nullable"
    int joined_at
    int removed_at "nullable, never deleted"
    text removed_by "nullable: owner | self"
  }
  deck_invitations {
    text id PK
    text deck_id FK
    text kind "link"
    text token "unique, 32 base64url chars"
    int revoked_at "nullable, permanent"
  }
  card_states {
    text id PK
    text card_id FK
    text user_id FK
    text direction "recognition | production | picture mode key"
    text mode "mode key; null only on rows an older Worker wrote"
    int due "ms timestamp"
    int state "0 New 1 Learning 2 Review 3 Relearning"
    text fsrs "ts-fsrs Card as JSON"
    int last_review "nullable"
  }
  reviews {
    text id PK
    text card_state_id FK
    text card_id FK
    text user_id FK
    text direction
    text mode "mode key; null only on rows an older Worker wrote"
    int rating "1 Again 2 Hard 3 Good 4 Easy"
    int state "state before review"
    int elapsed_days
    int scheduled_days
    real stability_after "FSRS memory model after this review"
    real difficulty_after
    int reviewed_at
    text source "web | api | mcp"
    text review_day_id FK "nullable: null before daily goals"
    text state_before "nullable JSON card state this grade replaced, for Undo"
  }
  card_images {
    text id PK
    text card_id FK
    text user_id FK "the card's owner"
    text object_key "private R2 key, never returned"
    text content_type "image/webp"
    int width
    int height
    int byte_size
    text description "nullable; picture modes wait for one"
    text source_kind "upload | url"
    text source_host "nullable, host of an imported link"
    text status "active | archived | replaced, one active per card"
    text created_by "user | api | mcp | ai | system"
  }
  review_days {
    text id PK
    text user_id FK
    text date "local YYYY-MM-DD, unique per user"
    int goal "snapshot; follows goal changes while open"
    text timezone "IANA zone the date was taken in"
    int zero_due_confirmed_at "nullable"
    text outcome "open | goal_met | exhausted | nothing_due"
  }
  review_undos {
    text review_id PK
    text user_id FK
    int undone_at
  }
  audit_log {
    text id PK
    text user_id FK
    text actor "user | api | mcp | ai | system"
    text action "create update archive restore grade"
    text entity "deck | card | review"
    text entity_id
    json payload
    int created_at
  }
  push_subscriptions {
    text id PK
    text user_id FK
    text endpoint "globally unique browser capability"
    text p256dh "browser public key"
    text auth "browser auth secret"
    int expiration_time "nullable"
    text reminder_time "local HH:MM, quarter-hour"
    text timezone "IANA time zone"
    text last_sent_local_date "nullable YYYY-MM-DD"
  }
```

All tables carry `created_at` and `updated_at` as millisecond integers. Ids are 19-character strings, time-prefixed so they sort by creation. Learning content is never deleted by the app: decks and cards archive, while reviews and audit rows are permanent. Push subscriptions are device capabilities, not learning content, and are deleted when the learner turns reminders off or the push service reports that the subscription has expired.

The `user`, `session`, `account`, `verification` and `apikey` tables belong to Better Auth and are generated, not hand-written. Every app table has `user_id` so a second user is a policy change, not a migration.

### Review days

A review day is one learner-local date measured against its streak goal. Attempts are counted from `reviews` less `review_undos`, never stored as a counter. A grade fixes `review_day_id` when it lands, in the review timezone of that moment, so a later timezone change never moves completed history. `outcome` only moves forward on a grade or a lower goal; Undo recomputes it and can reopen a day. Reviews from before daily goals have no day and still count as a reviewed day. The rules are in [the daily review goal proposal](proposals/daily-review-goal-and-rolling-queue.md) and live in `services/review-days.ts`.

### Shared decks

A deck's owner is `decks.user_id`. Everyone else who studies it has a `deck_members` row. Leaving or being removed sets `removed_at` and keeps the row; `removed_by = 'owner'` blocks the join link until a named invitation. `card_states` is unique per `(card_id, user_id, direction)`, so each learner of a shared card has their own schedule. Every read goes through `memberOf` in `services/members.ts`; every write to a deck's content requires the owner. [ADR 0011](adr/0011-a-shared-deck-is-one-deck-with-many-learners.md).

A deck has at most one unrevoked `deck_invitations` link, enforced by a partial unique index. Turning the link off sets `revoked_at` for good, and turning it on again inserts a new row with a new token. The token is a capability: it appears in the join URL and nowhere else, never in audit payloads, logs or error messages. `/join/<token>` is rendered by the product Worker; it shows up to three recent cards, and its title and Open Graph tags carry none. A signed-out visitor's link rides through sign-in in a ten-minute HttpOnly cookie, which lets `user.create.before` admit an account that is not on `ALLOWED_EMAILS`, and `session.create.after` completes the membership. Repeated joins make one membership and one audit row.

### Avatars

The learner's upload and the Google fallback sit in separate columns, and the upload wins while it exists. Both are 320 px WebP objects in the private `PRIVATE_IMAGES` bucket, re-encoded by the Images binding so no metadata survives, under random keys that name neither the learner nor the source. `/api/avatar/<version>` serves only the active version, with `private, no-store`; the client holds the bytes in memory through TanStack Query, so sign-out clears them. An upload or removal sends `If-Match` with `custom_revision` and gets 409 if the photo changed since. Each Google sign-in refreshes the fallback from the ID token's `picture`, fetched only from `*.googleusercontent.com`; a refresh that started earlier than the stored one is dropped, and a failed one keeps the previous photo and never blocks sign-in.

### Why the scheduling state is JSON

`card_states.fsrs` holds the full ts-fsrs Card object (stability, difficulty, reps, lapses, learning step, due, last review). `due` and `state` are copied out into real columns so the queue can be queried without parsing JSON. If ts-fsrs adds a field, nothing needs a migration.

### Review modes

A review mode is a cue and a target: `term_to_meaning` (recognition), `meaning_to_term` (production), `image_to_term` or `image_to_meaning`. Picture modes are set on cards only; a deck refuses them. The API sends a list of `{ cue, target }` as `reviewModes` on decks and cards, and a card's list overrides its deck's. Each mode a card is asked in gets its own `card_states` row with its own schedule, because recognising and producing are different skills. Turning a mode on creates the missing rows due now; turning one off leaves them uncounted (ADR 0007). A picture mode is asked only while the card has an active picture with a description. A card whose list holds only picture modes stores the text mode with the same target in `directions` and is asked in it until it has such a picture; that fallback is never asked beside the picture mode. ADR 0014 is the decision.

The move from directions is expand and contract, and it is in the expand phase. `decks.directions` stores a deck's list, since a text-mode list maps one-to-one onto it, and `cards.directions` stores a card's text modes. `cards.review_modes` adds a card's order and picture modes, and `effectiveModes` in `packages/core/src/modes.ts` heals a list an older Worker left stale by writing only `directions`. A legacy `directions` write replaces a card's text modes and keeps its picture modes. `directions` stays in the API as the legacy spelling. `card_states.direction` and `reviews.direction` stay the identity a grade finds: `recognition` and `production` for text modes, the mode key for picture modes, so the legacy unique index covers every mode; `mode` is written beside them and read as `coalesce(mode, mapping of direction)`, so a row an older Worker writes during a deploy still reads correctly. Migration 0012 adds `mode` and backfills it idempotently without touching schedules or review facts. Grades may name `mode` or the legacy `direction`, so queued offline grades replay onto the same schedule. Queue items carry `direction` for text modes only, so an app from before modes cannot grade a picture mode as its text sibling.

Contraction is a later, separate migration, once apps and offline outboxes from before modes are gone. Run the backfill updates at the end of 0012 again first. Do not rebuild `card_states` or `reviews` with `DROP TABLE`: D1 keeps foreign keys on, and dropping `card_states` cascades into `reviews`.

### Pictures

A card has at most one active `card_images` row; a replaced picture keeps its row and its R2 object, and an archived one comes back with restore. Pictures share the private `PRIVATE_IMAGES` bucket and the Images binding with avatars, re-encoded to WebP of at most 1600 px a side under random keys, and `/api/cards/:id/image/:imageId` serves only the active one with `private, no-store`. Every picture write claims `cards.image_version` with a fresh token in the same batch as the change, and the batch's other statements run only if the claim landed, so of two writes from the same read exactly one wins and the loser is a 409 that deletes its uploaded object. Callers may send the `imageVersion` they read as `version`. Descriptions that contain the term or the whole meaning are refused. Object keys, descriptions and source URLs never go into logs or errors, and only the host of an imported link is kept.

### Tags and source

Tags are labels on a card, global to the user, any number per card, stored as a JSON array until search or renaming needs a table. `source` is free text saying where the card came from. When AI capture arrives, pasted material becomes a `sources` row and cards point at it with `source_id`; the text column stays for hand-added cards.

### Why language is on the card

Decks can mix languages or hold non-vocabulary cards. `cards.language` is nullable. A null language means no audio and no language-specific AI for that card, and everything else works. `decks.default_language` only prefills new cards.

## API

The API is documented by the running app: [`lymi.app/docs`](https://lymi.app/docs) is the documentation site, [`lymi.app/docs/api`](https://lymi.app/docs/api) its reference, and [`my.lymi.app/api/openapi.json`](https://my.lymi.app/api/openapi.json) the OpenAPI 3.1 document the reference renders. The OpenAPI document is generated from the route descriptions in `apps/web/src/server/routes` and the Zod schemas in `packages/core/src/types.ts` (request bodies) and `packages/core/src/responses.ts` (responses), so it cannot drift from the code. This page keeps only what the document does not say.

Three ways in, one shape on the server. A session cookie is the learner in the app, actor `user`, scope `write`. An `x-api-key` header is a personal key, actor `api`, with the key's scope. An OAuth bearer token is an MCP client, actor `mcp`. `apps/web/src/server/principal.ts` resolves all three into `{ user, actor, scope }`.

### Rules the API enforces

- Reads need any credential. Writes need the `write` scope, or 403.
- Grading, key management and the learner's photo are the learner's alone. Any key or token gets 403, whatever its scope.
- Join links are managed and followed only from the app. Reading, turning on, or turning off a deck's link needs the owner's session; joining needs the learner's session. Any key or token gets 403.
- A deck's content is the owner's alone. A member who edits, archives, or adds a card, or changes the deck, gets 403 whatever the credential. Deck responses carry `role` and `owner` so a client can tell.
- A duplicate (same normalised term and language as an active card anywhere in the learner's decks) is skipped and reported with the existing card, never rejected. Adds return one outcome per card sent. ADR 0004.
- A grade older than the state's last review is ignored and reported as `duplicate`. This is what makes offline replay safe.
- Every write appends to `audit_log` with its actor, and every card carries `created_by`, so Activity can show what integrations and the AI wrote.
- Archive learning content instead of deleting it. Device push subscriptions are removed when disabled or expired.
- `language` on a new card defaults to the deck's `default_language` when not given.
- Validation failures return `400 { error, issues }` with the Zod issues. Missing or bad credentials return `401 { error }`.

## Not decided yet

- One `meaning` string per card, or multiple senses as rows. Decide before the first deploy with real data.
- Tags as a JSON column (current) or a table, once search needs them.
