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
  cards ||--o{ card_states : "one per learner per direction"
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
    text direction "recognition | production"
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

### Directions

`decks.directions` says how cards in the deck are asked: `recognition` (see the term, recall the meaning), `production` (see the meaning, produce the term) or `both`. A card may override with its own `directions`. Each concrete direction gets its own `card_states` row with its own schedule, because recognising and producing are different skills. When a deck switches to `both`, the missing state rows are created due now.

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
- Holding back the second direction of a card until the next day, so seeing the term is not a giveaway for producing it later in the same session. Queue logic, not schema.
- Tags as a JSON column (current) or a table, once search needs them.
