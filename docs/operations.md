# Operations

Production alerts email k.porshnieva@gmail.com from Cloudflare and PostHog. Content reports from learners go to hello@lymi.app and are handled under [A content report arrives](#a-content-report-arrives); [app-review.md](app-review.md) is what App Review and Google Play are told about it. Every alert links to its section below: what it means, then what to check first. [The stack](stack.md#analytics-workers-analytics-engine-and-posthog-eu) says why monitoring is split this way.

## What watches production

The 15-minute cron runs a canary on the production Worker (`apps/web/src/server/canary.ts`). It calls D1, KV, R2, the public site's health endpoint, OpenAI text, the Anthropic lesson reader and Workers AI the way a learner's request would. Every hour it also calls each configured speech provider once with "ok", in English or, for ElevenLabs, which has no native English voice, in Estonian, and asks the lead-in writer for one Japanese word's lead-in, because Google admits only keys that already used Gemini 2.5. Each service gets one verdict per run, after one retry, so a single dropped request does not alert.

Every real call to an outside service records its outcome too: `meteredFetch` and `metered` in `apps/web/src/server/dependency-health.ts`, covering AI text, the lesson reader, Workers AI, speech, email and web push. Both write to the `lymi_health` Analytics Engine dataset, which holds no account, card or request content.

| Field | Holds |
| --- | --- |
| `index1` | The dependency: `d1`, `kv`, `r2`, `site`, `openai_text`, `anthropic`, `workers_ai`, `elevenlabs`, `gemini_text`, `gemini_speech`, `google_speech`, `openai_speech`, `email`, `web_push` |
| `blob1` | `call` for one attempt, `check` for the canary's verdict |
| `blob2` | `ok`, `gone`, `limited`, `rejected`, `failed`, `timeout` or `unreachable` |
| `blob3` | HTTP status class, or `none` |
| `blob4` | `traffic` or `canary` |
| `blob5` | The Worker version tag, which is the commit it was built from |
| `double1` | Duration in milliseconds |

Unexpected errors still reach PostHog Error Tracking: HTTP and MCP failures, exhausted enrichment, internal import and export failures, failed lesson reads and failed cron jobs (`route` is `cron/<job>`).

## Alerts

| Alert | Lives in | Fires when |
| --- | --- | --- |
| [A production check is failing](#a-production-check-is-failing) | Cloudflare | Any canary verdict other than `ok` in a 15-minute run |
| [Production checks stopped](#production-checks-stopped) | Cloudflare | No canary verdict for 45 minutes |
| [Outside calls are failing for learners](#outside-calls-are-failing-for-learners) | Cloudflare | 3 or more failed `traffic` calls in 30 minutes to a service with no fallback |
| [Server errors](#server-errors) | Cloudflare | 3 or more HTTP 5xx responses in 15 minutes |
| [Cloudflare Worker issue](#cloudflare-worker-issue) | Cloudflare | Any real-time issue on `lymi` or `lymi-site` |
| [Cloudflare incident](#cloudflare-incident) | Cloudflare | A major or critical Cloudflare incident |
| [Errors in production](#errors-in-production) | PostHog | Any `$exception` in an hour |
| [AI calls are failing](#ai-calls-are-failing) | PostHog | 2 or more failed `$ai_generation` events in an hour, leaving out `$ai_span_name` `pronunciation` and `lead_in` |
| [Nobody reviewed yesterday](#nobody-reviewed-yesterday) | PostHog | Zero `review_graded` in a day, checked at 09:00 Tallinn |

Cloudflare alerts are under Observability → Alerts and re-send at most hourly while firing. PostHog alerts are on [the alerts page](https://eu.posthog.com/project/292417/alerts) and read the insights tagged `ops`. The three `lymi_health` alerts use these queries, with Cloudflare supplying the time range:

```sql
-- A production check is failing: threshold >= 1, 15m window, every 15m
SELECT count() AS "value" FROM "events"."analyticsEngine"."lymi_health"
WHERE "accountTag" = 'ce6da857aeb521aa2730848a194b8866' AND "blob1" = 'check' AND "blob2" != 'ok'

-- Production checks stopped: threshold < 1, 45m window, every 15m
SELECT count() AS "value" FROM "events"."analyticsEngine"."lymi_health"
WHERE "accountTag" = 'ce6da857aeb521aa2730848a194b8866' AND "blob1" = 'check'

-- Outside calls are failing for learners: threshold >= 3, 30m window, every 5m
SELECT count() AS "value" FROM "events"."analyticsEngine"."lymi_health"
WHERE "accountTag" = 'ce6da857aeb521aa2730848a194b8866' AND "blob1" = 'call' AND "blob4" = 'traffic'
  AND "blob2" IN ('rejected', 'failed', 'timeout', 'unreachable')
  AND "index1" NOT IN ('elevenlabs', 'gemini_text', 'gemini_speech', 'google_speech', 'openai_speech')
```

## First steps for any alert

1. Run `pnpm deploy:health` and compare the version tag with the latest commit on `main`. A failure that began with a deploy is usually fixed by reverting that commit.
2. Break the failures down by dependency and version in the Cloudflare dashboard (Workers & Pages → Analytics Engine → `lymi_health`) or with the SQL API:

   ```sql
   SELECT index1 AS dependency, blob2 AS outcome, blob5 AS version, count() AS n
   FROM lymi_health WHERE timestamp > NOW() - INTERVAL '2' HOUR
   GROUP BY dependency, outcome, version ORDER BY n DESC
   ```
3. Read the Worker's logs in Cloudflare (Observability → Logs, script `lymi`) for the same window.

## A production check is failing

The canary could not use a service after a retry. `unreachable` means the request never got an answer, which is a code or configuration fault more often than an outage: 17 October 2026 was a `redirect` option Workers rejects. `rejected` means our request is wrong or a key was revoked; `failed` means the vendor or AI Gateway answered with an error. Check the vendor's status page and AI Gateway's logs, then the last deploy.

## Production checks stopped

The canary has not reported for 45 minutes, so the cron, the Worker or Analytics Engine has stopped. Check that the Worker still has its `*/15 * * * *` trigger, that `pnpm deploy:health` answers, and Cloudflare's status page.

## Outside calls are failing for learners

Real requests are failing against a dependency, which the breakdown above names. If the canary is passing, the failure is specific to some input, such as one file type in imports. Speech and the Japanese lead-in (`gemini_text`) are left out because each failed attempt falls through to the next provider or to kana-only speech; a learner sees a speech failure only when every provider fails, which [Server errors](#server-errors) catches as a 503 from `/api/audio/:cardId`.

## Server errors

The product returned HTTP 5xx. `lymi_requests` names the route (`blob1`), and a 503 usually means a dependency was unavailable: `/api/audio/:cardId` answers 503 when every speech provider failed. Error Tracking has the stack for a 500.

## Cloudflare Worker issue

Cloudflare recorded an uncaught exception or an exceeded limit, such as CPU time, which never reaches our own error handler. Open the issue under Observability → Logs for its message and stack.

## Cloudflare incident

Cloudflare itself is degraded. Check whether the affected components include Workers, D1, KV, R2, Workers AI or AI Gateway; if not, no action is needed.

## Errors in production

An exception reached PostHog Error Tracking. Open [Error Tracking](https://eu.posthog.com/project/292417/error_tracking), find the newest issue, and use its `route`, `surface` and `release` to locate the code and the deploy. A browser error with `caught_by=router` or `react` broke a screen. Frames name the source file and line when the build uploaded its source maps; a build without `POSTHOG_CLI_API_KEY` ([testing.md](testing.md#delivery-checks)) logs a warning and its stacks stay minified.

## A deploy fails at the source map upload

The product build uploads its source maps to PostHog, and a failed upload fails the build, so a PostHog outage or an expired key blocks every deploy. To ship anyway, remove `POSTHOG_CLI_API_KEY` from the product's Workers Builds project and retry the build; it warns and deploys with minified stacks. Put a working key back once PostHog recovers ([testing.md](testing.md#delivery-checks)).

## AI calls are failing

`$ai_generation` events with `$ai_is_error` are piling up: enrichment, hook drafts, deck choice, import language detection or lesson reads. Pronunciation and its Japanese lead-in are left out, because a failed speech attempt falls through to the next provider and a failed lead-in to kana-only speech. Learners see empty drafts, failed enrichment and "Try again". Follow [A production check is failing](#a-production-check-is-failing).

## Nobody reviewed yesterday

A whole day passed without a graded review. Open the product and review a card; if that works, check grade delivery in the phone and web outboxes and the `review_graded` event in PostHog before assuming learners stopped.

Japanese term audio logs `lead_in_resolved` with `outcome: cached|cooldown|unambiguous|written|no_fragment|refused|failed|invalid_cache`, its policy's `language`, the writer model, and generation latency and input/output token counts on successful replies. No text, reading, meaning, card or owner identifier enters this log. A failed context call has a 24-hour cooldown and an interrupted one 5 minutes; concurrent generation returns unavailable for up to 45 seconds rather than purchasing a duplicate. `pronunciation_lease_release_failed` names a storage failure without the private object key.

## A content report arrives

A learner reported a deck or card someone else wrote ([Report](../CONTEXT.md)). The email to hello@lymi.app carries the content as it read when reported, the reason, the reporter's note and the report's id, and replying reaches the reporter. Lymi tells reporters and [App Review](app-review.md) that every report is read within a day, so act the same day.

```bash
pnpm moderate show <report-id>
```

`pnpm moderate list` shows every open report, oldest first; a report whose email never arrived is still there. Each command needs `LYMI_API_KEY`, a write-scoped key on an account in `OPERATOR_EMAILS`. Then settle it with one of:

| Action | When | What happens |
| --- | --- | --- |
| `dismiss` | Nothing breaks the rules | The report closes; nothing changes |
| `archive_card` | One card is the problem | The card leaves every member's deck, and its owner cannot restore it |
| `archive_deck` | The deck itself is the problem | The deck leaves every member's Library, its join link and invitations stop working, and its owner cannot restore it |
| `suspend_sharing` | The owner shares abuse, or keeps coming back | Every deck they share is archived for good, and they can no longer turn on a join link or invite anyone |

```bash
pnpm moderate resolve <report-id> archive_card --apply
```

Settling a report settles the other open reports about the same card, deck or owner. The owner sees the archive in Activity as Lymi's, with no reporter named. Reply to the reporter by email when the action matters to them. To lift a suspension, delete its `sharing_suspensions` row and the owner can share again; archived decks stay archived.

## The stress backfill

The `stress-backfill` cron job moves U+0301 out of Russian and Ukrainian terms stored before the stress fold, and rekeys a Ukrainian term written with ’, ‘, ʼ or ` to the key ' gives without changing the term (ADR 0004): a stressed term with an empty pronunciation becomes the plain term with the stress as its pronunciation, a card beside another pronunciation keeps its stressed term, and two cards that become duplicates both stay. It runs hourly as the system actor and logs one JSON line with `split`, `folded`, `kept`, `rekeyed`, `duplicates` and `written`. `pnpm --filter @lymi/web backfill:stress --remote` prints the same counts against production without writing. Remove the job once a production run logs `written: 0`.
