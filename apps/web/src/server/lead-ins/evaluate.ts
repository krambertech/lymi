/**
 * Scores each language's evaluation cases with the decision model and prints how well the policy's
 * threshold separates readings that name another word from those that do not. It calls Workers AI
 * through Wrangler's login, so it is a script and never a test:
 *
 *   pnpm --filter @lymi/web eval:lead-ins [--language ja] [--write] [--save run.json]
 *
 * `--write` also asks the writer for every case at or above the threshold; it needs
 * `GEMINI_API_KEY` and the AI Gateway variables in `.dev.vars`.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";
import { evalEnv, requireKeys } from "../ai/eval-env";
import { createLeadInWriter } from "../ai/lead-in-writer";
import { leadInPolicy, leadInScore } from ".";
import type { LeadInInput } from "./policy";

type Case = LeadInInput & { ambiguous: boolean; rivals?: string };

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const here = new URL(".", import.meta.url).pathname;
const fixture = JSON.parse(readFileSync(join(here, "evaluation.json"), "utf8")) as {
  languages: Record<string, Case[]>;
};
const account = /"account_id":\s*"([^"]+)"/.exec(
  readFileSync(join(here, "../../../wrangler.jsonc"), "utf8"),
)?.[1];
const dir = mkdtempSync(join(tmpdir(), "lead-ins-"));
const config = join(dir, "wrangler.jsonc");
writeFileSync(
  config,
  JSON.stringify({
    name: "lead-in-evaluation",
    account_id: account,
    compatibility_date: "2026-10-01",
    ai: { binding: "AI", remote: true },
  }),
);
const { env, dispose } = await getPlatformProxy<{ AI: Ai }>({ configPath: config });
const ai = { run: (model: string, input: unknown) => env.AI.run(model as never, input as never) };
const keys = evalEnv();
if (args.includes("--write"))
  requireKeys(keys, ["GEMINI_API_KEY", "AI_GATEWAY_TOKEN"], "write lead-ins");
const writer = args.includes("--write") ? createLeadInWriter(keys) : null;
const results: unknown[] = [];

try {
  for (const [language, cases] of Object.entries(fixture.languages)) {
    if (option("--language") && option("--language") !== language) continue;
    const policy = leadInPolicy(language);
    if (!policy) throw new Error(`No lead-in policy for ${language}`);
    const scored = await Promise.all(
      cases.map(async (item) => {
        const started = Date.now();
        const score = await leadInScore(ai, policy, item);
        return { ...item, score, ms: Date.now() - started };
      }),
    );
    const judged = scored.filter((item) => item.score !== null) as (Case & { score: number })[];
    const yes = judged.filter((item) => item.ambiguous);
    const no = judged.filter((item) => !item.ambiguous);
    let pairs = 0;
    for (const a of yes)
      for (const b of no) pairs += a.score > b.score ? 1 : a.score === b.score ? 0.5 : 0;
    const flagged = (item: { score: number }) => item.score >= policy.threshold;
    const ms = scored.map((item) => item.ms).sort((a, b) => a - b);
    console.log(
      `${language}: ${judged.length}/${cases.length} judged, AUC ${(pairs / (yes.length * no.length)).toFixed(3)}, at ${policy.threshold} ${yes.filter(flagged).length}/${yes.length} ambiguous flagged and ${no.filter(flagged).length}/${no.length} clear flagged, median ${ms[Math.floor(ms.length / 2)]} ms`,
    );
    for (const item of yes.filter((item) => !flagged(item)))
      console.log(
        `  missed ${item.term} ${item.reading} (${item.rivals}) ${item.score.toFixed(2)}`,
      );
    for (const item of no.filter(flagged))
      console.log(`  extra ${item.term} ${item.reading} ${item.score.toFixed(2)}`);
    for (const item of scored) {
      let previousText: string | null | undefined;
      if (writer && item.score !== null && item.score >= policy.threshold) {
        previousText = await writer
          .write({
            instructions: policy.instructions,
            input: { term: item.term, reading: item.reading, meaning: item.meaning },
          })
          .then((reply) =>
            policy.accepts(reply.previousText, item) ? reply.previousText : undefined,
          )
          .catch(() => undefined);
        console.log(`  ${item.term} ${item.reading}: ${previousText ?? "(none)"}`);
      }
      results.push({ language, ...item, ...(previousText === undefined ? {} : { previousText }) });
    }
  }
  const save = option("--save");
  if (save) writeFileSync(save, JSON.stringify(results, null, 2));
} finally {
  await dispose();
  rmSync(dir, { recursive: true, force: true });
}
