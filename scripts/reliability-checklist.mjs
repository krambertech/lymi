// The reliability checklist: bug classes that reached production or main more than once, each with a
// trigger a diff shows, the question a reviewer answers, and the pull requests behind it.
// `pnpm reliability` prints the items a change triggers. docs/testing.md#check-what-broke-before
// says when to add, sharpen or remove an item.
//
// An item fires on any change to one of its `files`, and on a change to one of its `paths` that adds
// a line matching `added` (any change there when it has no `added`). `ignore` overrides both.
// `example` is a change the item must fire on; scripts/reliability.test.mjs checks it.

const SERVER = ["apps/web/src/server/**/*.ts", "packages/core/src/**/*.ts"];
const TESTS = ["**/*.test.ts", "**/*.test.tsx", "**/*.test.mjs", "**/test-*.ts", "**/fixtures/**"];
const SCREENS = ["apps/web/src/client/**/*.tsx", "apps/mobile/src/**/*.tsx"];

export const ITEMS = [
  {
    id: "d1-bound-parameters",
    paths: SERVER,
    ignore: TESTS,
    added: /\b(?:not)?[iI]nArray\(|\bIN\s*\(\s*\$\{|\bin\s*\(\s*\$\{/,
    check:
      "Can this list hold more than D1's 100 bound parameters? Does it go through `selectIn` from `packages/core/src/db.ts` (or `inCalls` on the client, which caps a call at 200 cards), with a test past the cap?",
    why: "Lists that were short in testing passed the cap in production and answered 500.",
    sources: [320, 436, 840, 896, 1058],
    example: {
      file: "apps/web/src/server/services/cards.ts",
      line: "  .where(inArray(schema.cards.id, ids))",
    },
  },
  {
    id: "guarded-state-move",
    paths: ["apps/web/src/server/**/*.ts"],
    ignore: TESTS,
    added: /\.(?:update|delete)\(\s*schema\.|\bUPDATE\s+\w+\s+SET\b|\bDELETE\s+FROM\b/i,
    check:
      "If another writer, a retry or a replay changes this row between the read and this write, does the write still hold? Does its `WHERE` name the state it leaves, as CODING_STANDARDS.md asks?",
    why: "Writes keyed by id alone undid takedowns, overwrote newer tokens and landed grades on a moved card state.",
    sources: [793, 1090, 1164],
    example: {
      file: "apps/web/src/server/services/imports.ts",
      line: "  await db.update(schema.imports).set({ status: 'done' })",
    },
  },
  {
    id: "offline-replay",
    files: [
      "packages/client/src/{writes,grades,sync,queued,write-projections,dropped-grades,review-draw,cache}.ts",
      "packages/client/src/review-flow/**/*.ts",
      "apps/web/src/server/routes/{cards,review}*.ts",
    ],
    ignore: TESTS,
    check:
      "What happens when the send arrives but the answer is lost, the write is replayed, or the learner signs out mid-flush? Does the server treat the replay as the same write, and does the cached draw and its counts replay exactly once?",
    why: "Lost answers, replays and a flush that outlived its learner dropped grades and adds or counted them twice.",
    sources: [537, 652, 657, 795, 1090, 1093, 1158],
    example: { file: "packages/client/src/writes.ts" },
  },
  {
    id: "flow-one-state",
    paths: [...SCREENS, "apps/desktop/src/*.ts"],
    ignore: TESTS,
    added: /useState(?:<boolean>)?\(\s*(?:true|false)\s*\)/,
    check:
      "Can a late answer, a second tap or a switched form leave this screen in a state no step produces? Should these flags be one tagged state with a pure reducer, as CODING_STANDARDS.md asks for a flow?",
    why: "Booleans that had to agree drifted apart: endless loading, a double add, a stuck sign-in.",
    sources: [711, 1156, 1161, 1162, 1165],
    example: {
      file: "apps/mobile/src/share/share-sheet.tsx",
      line: "  const [sending, setSending] = useState(false);",
    },
  },
  {
    id: "failure-is-not-empty",
    paths: SCREENS,
    ignore: TESTS,
    added: /\buse(?:Suspense|Infinite)?Query\(/,
    check:
      "Does a failed or offline read look different from an empty one? Can it show a skeleton forever, `0`, or an empty-state sentence, and does a cached copy still render?",
    why: "Failed reads showed as endless skeletons, as no reviews and as no search results.",
    sources: [281, 283, 379, 1101, 1103],
    example: {
      file: "apps/web/src/client/routes/insights.tsx",
      line: "  const history = useQuery(historyQuery());",
    },
  },
  {
    id: "swallowed-failure",
    paths: ["apps/web/src/server/**/*.ts"],
    ignore: TESTS,
    added: /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}?\s*$|\.catch\(\s*\(\s*\)\s*=>/,
    check:
      "When this fails, does the step retry or fail where someone sees it, and does a log or Error Tracking record it without learner data?",
    why: "Catch-alls hid failed recordings, copies and Readwise pulls, and one deck's failure stopped a whole cron.",
    sources: [896, 941, 1091],
    example: {
      file: "apps/web/src/server/readwise/pull.ts",
      line: "  } catch {",
    },
  },
  {
    id: "worker-run-budget",
    files: [
      "apps/web/src/server/{imports,exports,enrichment}/workflow.ts",
      "apps/web/src/server/index.ts",
      "apps/web/wrangler.jsonc",
    ],
    paths: ["apps/web/src/server/**/*.ts"],
    ignore: TESTS,
    added: /\bfetch\(|\bnew Request\(/,
    check:
      "How many subrequests does one run make for the largest input a learner can send, such as a 5,000-note Anki deck? Is the work bounded or handed to a fresh run, and does workerd accept every fetch option, with a case in `outgoing-fetch.workers.test.ts`?",
    why: "Picture-heavy imports hit the 10,000-subrequest ceiling, and fetch options Node accepts failed on Workers.",
    sources: [57, 790, 896, 940, 941, 997],
    example: { file: "apps/web/src/server/imports/workflow.ts" },
  },
  {
    id: "telemetry-scrubbed",
    files: ["packages/core/src/telemetry.ts", "apps/web/src/server/posthog.ts"],
    paths: ["apps/web/src/**/*.{ts,tsx}", "apps/mobile/src/**/*.{ts,tsx}"],
    ignore: TESTS,
    added: /console\.(?:error|warn|log)\(|captureException|reportError\(|\$exception/,
    check:
      "Does this error or log keep its class and frames, leave out SQL, bound parameters and learner text, and reach PostHog once?",
    why: "Logs carried card terms and bound parameters; exceptions lost their class or frames and were dropped or sent twice.",
    sources: [155, 767, 815, 1074, 1146],
    example: {
      file: "apps/web/src/server/routes/cards.ts",
      line: "    console.error('enrich failed', error);",
    },
  },
  {
    id: "previous-build",
    files: [
      "apps/web/src/client/lib/stale-build.ts",
      "apps/web/src/client/main.tsx",
      "apps/web/index.html",
      "apps/web/vite.config.ts",
      "packages/client/src/cache.ts",
    ],
    paths: ["apps/web/src/client/**/*.{ts,tsx}"],
    ignore: TESTS,
    added: /location\.reload\(|beforeunload|pagehide/,
    check:
      "What does a tab or a kept cache from the previous build do after this deploys? Can a reload fire while Safari is leaving the page?",
    why: "A deploy removed chunks open tabs still needed, the recovery reload fired on pages being left, and a restored cache hid saved settings.",
    sources: [674, 703, 709, 711],
    example: { file: "apps/web/src/client/lib/stale-build.ts" },
  },
  {
    id: "phone-build",
    files: [
      "apps/mobile/app.json",
      "apps/mobile/eas.json",
      "apps/mobile/plugins/**",
      "apps/mobile/targets/**",
      "apps/mobile/e2e/**",
      ".github/workflows/phone*.yml",
      "scripts/phone-release.mjs",
    ],
    check:
      "Does this hold on EAS's build machine and in a release run, not only locally: entitlements, environment, eas-cli flags? Does the phone journey still pass every screen a new learner sees?",
    why: "Beta builds failed on an entitlement gated on `EAS_BUILD`, a release ran an eas-cli flag EAS refused, and a new question broke the journey before 1.0.0.",
    sources: [653, 658, 754, 1184],
    example: { file: "apps/mobile/eas.json" },
  },
  {
    id: "preview-cleanup",
    files: [
      ".github/workflows/ci.yml",
      ".github/workflows/app-preview-cleanup.yml",
      "scripts/app-preview-*.mjs",
      "scripts/check-app-preview.mjs",
    ],
    paths: ["apps/web/wrangler.jsonc"],
    added: /"(?:r2_buckets|d1_databases|kv_namespaces|queues|workflows)"/,
    check:
      "Does cleanup remove every resource a preview creates, including a bucket with unfinished uploads or one already gone? Does a retried or rebased run repair a half-created preview?",
    why: "Previews leaked when buckets were not empty, and a half-created Worker had no preview URL.",
    sources: [534, 803, 1030],
    example: { file: ".github/workflows/app-preview-cleanup.yml" },
  },
  {
    id: "account-erasure",
    files: [
      "apps/web/src/server/services/account-deletion.ts",
      "apps/web/src/server/services/erasure.ts",
      "apps/web/src/server/services/takedowns.ts",
    ],
    paths: ["apps/web/src/server/**/*.ts"],
    ignore: TESTS,
    added: /\barchivedAt:\s*null\b|\barchived_at\s*=\s*null\b/,
    check:
      "Can this restore bring back something Lymi took down? Does deleting the account end a grant another service holds, and does a kept row or copy hold only what `erasure.ts` says?",
    why: "A restore undid a takedown, and shared decks and Apple's grant needed handling. Tables and R2 objects deletion misses fail `erasure.test.ts`.",
    sources: [972, 1164],
    example: {
      file: "apps/web/src/server/services/sections.ts",
      line: "    db.update(schema.sections).set({ archivedAt: null })",
    },
  },
];
