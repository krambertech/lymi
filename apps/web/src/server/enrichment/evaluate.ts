/**
 * Runs the enrichment prompt over labelled cards and prints how often each house rule and each
 * expectation holds. It calls OpenAI, so it is a script and never a test:
 *
 *   pnpm --filter @lymi/web eval:enrichment [--cards file.json] [--deck id] [--record] [--save run.json] [--from run.json] [--dry] [--verbose]
 *
 * The key comes from `.dev.vars` and the model from the text-provider helper the Worker uses, so
 * OPENAI_TEXT_MODEL overrides it. `--record` keeps the run in `runs/` beside the one before it,
 * which recorded-run.test.ts rescores on every CI run; record after any change to what the model
 * reads. `--save` keeps every reply elsewhere so `--from` can rescore without another call. `--dry`
 * prints the first request and calls nothing. Keep real learners' cards in a file outside the
 * repository and pass it with `--cards`.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createTextProvider, type TextProvider } from "../ai";
import { evalEnv, requireKeys } from "../ai/eval-env";
import {
  chunked,
  ENRICHMENT_INSTRUCTIONS,
  ENRICHMENT_PROMPT_VERSION,
  REPLY_SCHEMA,
  readReply,
} from "./prompt";
import {
  type Call,
  type FixtureDeck,
  newRun,
  passRates,
  type RecordedRun,
  RUNS_DIR,
  readFixtures,
  recordedRuns,
  requests,
  scoreCalls,
} from "./recorded-run";

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const verbose = args.includes("--verbose");

async function callModel(decks: FixtureDeck[], provider: TextProvider): Promise<Call[]> {
  const jobs = decks.flatMap((deck) => requests(deck).map((request) => ({ deck, ...request })));
  const calls: Call[] = [];
  // A few at a time, so a long run is quick without tripping the vendor's rate limit.
  for (const batch of chunked(jobs, 4)) {
    calls.push(
      ...(await Promise.all(
        batch.map(async ({ deck, input, cases }) => {
          const reply = readReply(
            await provider.complete({
              instructions: ENRICHMENT_INSTRUCTIONS,
              input,
              schema: REPLY_SCHEMA,
            }),
          );
          process.stdout.write(".");
          return { deck: deck.id, input, cases, reply };
        }),
      )),
    );
  }
  process.stdout.write("\n");
  return calls;
}

function score(decks: FixtureDeck[], calls: Call[]) {
  const scored = scoreCalls(decks, calls);
  const failures: string[] = [];
  for (const { deck, item, reply, results } of scored) {
    const broken = results.filter((result) => !result.pass);
    if (!broken.length && !verbose) continue;
    failures.push(`\n${deck.id} · ${item.term}`);
    if (reply) {
      for (const field of ["meaning", "example", "notes", "pronunciation", "language"] as const) {
        if (reply[field]) failures.push(`  ${field}: ${reply[field]?.replaceAll("\n", "⏎ ")}`);
      }
    }
    for (const result of broken) failures.push(`  ✗ ${result.field}: ${result.rule}`);
  }
  const all = scored.flatMap((one) => one.results);
  const passed = all.filter((result) => result.pass).length;
  console.log(`\nPrompt v${ENRICHMENT_PROMPT_VERSION}: ${passed}/${all.length} checks pass`);
  for (const [rule, count] of [...passRates(scored)].sort(([a], [b]) => a.localeCompare(b))) {
    const mark = count.pass === count.total ? " " : "✗";
    console.log(`${mark} ${rule.padEnd(40)} ${count.pass}/${count.total}`);
  }
  console.log(failures.join("\n"));
}

/** Keeps the run in `runs/`, and only the run before it besides. */
function record(run: RecordedRun) {
  mkdirSync(RUNS_DIR, { recursive: true });
  const before = recordedRuns().at(-1)?.file;
  for (const file of readdirSync(RUNS_DIR)) {
    if (file.endsWith(".json") && file !== before) rmSync(new URL(file, RUNS_DIR));
  }
  // A second run of one prompt on one day keeps the first, which the gate reads beside it.
  const day = run.recordedAt.slice(0, 10);
  const taken = before?.startsWith(`${day}-v${run.version}-${run.hash}`);
  const when = taken ? run.recordedAt.slice(0, 16).replace(":", "") : day;
  const file = `${when}-v${run.version}-${run.hash}.json`;
  writeFileSync(new URL(file, RUNS_DIR), `${JSON.stringify(run, null, 2)}\n`);
  console.log(`Recorded runs/${file}`);
}

async function main() {
  const only = option("--deck");
  const decks = readFixtures(option("--cards")).filter((deck) => !only || deck.id === only);
  if (args.includes("--record") && (only || option("--cards"))) {
    throw new Error("--record keeps a run over every deck in evaluation.json");
  }

  if (args.includes("--dry")) {
    const [deck] = decks;
    const [first] = deck ? requests(deck) : [];
    console.log(ENRICHMENT_INSTRUCTIONS);
    console.log(`\n--- input ---\n${JSON.stringify(JSON.parse(first?.input ?? "{}"), null, 2)}`);
    return;
  }

  const from = option("--from");
  let run: RecordedRun;
  if (from) {
    run = JSON.parse(readFileSync(from, "utf8")) as RecordedRun;
  } else {
    const env = evalEnv();
    requireKeys(env, ["OPENAI_API_KEY", "AI_GATEWAY_TOKEN"], "run the evaluation");
    const provider = createTextProvider(env);
    if (!provider) throw new Error("Set OPENAI_API_KEY to run the evaluation");
    console.log(`Model: ${provider.model}`);
    run = newRun(provider.model, await callModel(decks, provider));
  }
  const save = option("--save");
  if (save) writeFileSync(save, `${JSON.stringify(run, null, 2)}\n`);
  if (args.includes("--record")) record(run);
  score(decks, run.calls);
}

await main();
