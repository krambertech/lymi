/**
 * Runs the diagnosis prompt over labelled cards and prints agreement per cause, a confusion
 * table and the threshold that makes the fewest costly mistakes. It calls OpenAI, so it is a
 * script and never a test:
 *
 *   pnpm --filter @lymi/web eval:diagnosis [--cards file.json] [--save run.json] [--from run.json] [--verbose]
 *
 * The key comes from `.dev.vars` and the model from the text-provider helper the Worker uses, so
 * OPENAI_TEXT_MODEL overrides it. `--save` keeps every reply so `--from` can rescore without
 * another call. Cards marked `oftenForgotten` instead of labelled only count toward how many
 * landed on each cause; keep real cards like that outside the repository.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { DIAGNOSIS_CAUSES, type DiagnosisCause, type ReviewModeKey } from "@lymi/core";
import { createTextProvider } from "../ai";
import {
  DIAGNOSIS_THRESHOLD,
  type DiagnosisCard,
  type DiagnosisInput,
  diagnosisRequest,
  type Proposal,
  readReply,
  settle,
} from "./prompt";

type FixtureCard = DiagnosisCard & {
  expected?: DiagnosisCause;
  /** For `confused_pair`: the card it is confused with. */
  pair?: string;
  /** Often forgotten without a label, for a run over real cards. */
  oftenForgotten?: boolean;
};

type FixtureDeck = {
  name: string;
  language: string;
  meaningLanguage: string;
  asked: ReviewModeKey[];
  cards: FixtureCard[];
};

type Scored = {
  deck: string;
  term: string;
  expected: DiagnosisCause | null;
  pair: string | null;
  proposal: Proposal | null;
};

/** The same sample sizes the service reads. */
const DECK_SAMPLE = 12;
const OFTEN_FORGOTTEN_SAMPLE = 20;

/** A named cause that is wrong misleads the learner; a missed one only costs them a better fix. */
const WRONG_CLAIM_COST = 2;
const MISSED_COST = 1;

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const verbose = args.includes("--verbose");

/** Nearest neighbours by position, as the service takes them by when they were added. */
function neighbours(deck: FixtureDeck, index: number): DiagnosisCard[] {
  return deck.cards
    .map((card, at) => ({ card, distance: Math.abs(at - index) }))
    .filter(({ distance }) => distance > 0)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, DECK_SAMPLE)
    .map(({ card }) => ({ id: card.id, term: card.term, meaning: card.meaning }));
}

function inputFor(deck: FixtureDeck, index: number): DiagnosisInput {
  const card = deck.cards[index] as FixtureCard;
  return {
    meaningLanguage: deck.meaningLanguage,
    card: {
      id: card.id,
      term: card.term,
      meaning: card.meaning,
      example: card.example ?? null,
      notes: card.notes ?? null,
      language: deck.language,
      asked: deck.asked,
    },
    deck: { name: deck.name, cards: neighbours(deck, index) },
    oftenForgotten: deck.cards
      .filter((other) => other.id !== card.id && sticky(other))
      .slice(0, OFTEN_FORGOTTEN_SAMPLE)
      .map(({ id, term, meaning }) => ({ id, term, meaning })),
  };
}

/** The cards diagnosed: every labelled card, and real ones marked often forgotten. */
function sticky(card: FixtureCard) {
  return card.expected !== undefined || card.oftenForgotten === true;
}

async function diagnoseAll(decks: FixtureDeck[]): Promise<Scored[]> {
  const { OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_TEXT_MODEL, AI_GATEWAY_TOKEN } = process.env;
  const provider = createTextProvider({
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_TEXT_MODEL,
    AI_GATEWAY_TOKEN,
  });
  if (!provider) throw new Error("Set OPENAI_API_KEY to run the evaluation");
  console.log(`Model: ${provider.model}`);
  const jobs = decks.flatMap((deck) =>
    deck.cards.flatMap((card, index) => (sticky(card) ? [{ deck, card, index }] : [])),
  );
  const scored: Scored[] = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      if (!job) return;
      const input = inputFor(job.deck, job.index);
      let proposal: Proposal | null = null;
      try {
        proposal = readReply(await provider.complete(diagnosisRequest(input)), input);
      } catch (error) {
        console.error(`${job.card.term}: ${error instanceof Error ? error.message : error}`);
      }
      scored.push({
        deck: job.deck.name,
        term: job.card.term,
        expected: job.card.expected ?? null,
        pair: job.card.pair ?? null,
        proposal,
      });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return scored;
}

/** The cause the learner would be told at this threshold, and whether it counts as agreeing. */
function outcome(row: Scored, threshold: number) {
  const told = settle(row.proposal, threshold);
  const agrees =
    told.cause === row.expected &&
    (told.cause !== "confused_pair" || told.draft.otherCardId === row.pair);
  return { told: told.cause, agrees };
}

function costAt(rows: Scored[], threshold: number) {
  let wrong = 0;
  let missed = 0;
  let agreed = 0;
  for (const row of rows) {
    const { told, agrees } = outcome(row, threshold);
    if (agrees) agreed += 1;
    else if (told === "unclear") missed += 1;
    else wrong += 1;
  }
  return {
    threshold,
    agreed,
    wrong,
    missed,
    cost: wrong * WRONG_CLAIM_COST + missed * MISSED_COST,
  };
}

function report(rows: Scored[]) {
  const labelled = rows.filter((row) => row.expected);
  if (labelled.length === 0) {
    const counts = Object.fromEntries(DIAGNOSIS_CAUSES.map((cause) => [cause, 0]));
    for (const row of rows) {
      const told = settle(row.proposal).cause;
      counts[told] = (counts[told] ?? 0) + 1;
    }
    console.log(`\n${rows.length} cards at threshold ${DIAGNOSIS_THRESHOLD}:`);
    console.table(counts);
    return;
  }

  const thresholds = [0, 0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9];
  const scan = thresholds.map((t) => costAt(labelled, t));
  console.log(
    `\nThreshold scan over ${labelled.length} labelled cards (cost = ${WRONG_CLAIM_COST} × wrong cause named + ${MISSED_COST} × cause missed):`,
  );
  console.table(scan);
  const best = scan.reduce((a, b) =>
    b.cost < a.cost || (b.cost === a.cost && b.threshold > a.threshold) ? b : a,
  );
  console.log(`Lowest cost at ${best.threshold}; the service uses ${DIAGNOSIS_THRESHOLD}.`);

  const threshold = DIAGNOSIS_THRESHOLD;
  const perCause = DIAGNOSIS_CAUSES.map((cause) => {
    const mine = labelled.filter((row) => row.expected === cause);
    const agreed = mine.filter((row) => outcome(row, threshold).agrees).length;
    const told = labelled.filter((row) => outcome(row, threshold).told === cause);
    const right = told.filter((row) => outcome(row, threshold).agrees).length;
    return {
      cause,
      labelled: mine.length,
      agreed,
      recall: mine.length ? +(agreed / mine.length).toFixed(2) : null,
      told: told.length,
      precision: told.length ? +(right / told.length).toFixed(2) : null,
    };
  });
  const total = labelled.filter((row) => outcome(row, threshold).agrees).length;
  console.log(
    `\nAt ${threshold}: ${total}/${labelled.length} agree (${((100 * total) / labelled.length).toFixed(0)}%).`,
  );
  console.table(perCause);

  const confusion = Object.fromEntries(
    DIAGNOSIS_CAUSES.map((expected) => [
      expected,
      Object.fromEntries(
        DIAGNOSIS_CAUSES.map((told) => [
          told,
          labelled.filter(
            (row) => row.expected === expected && outcome(row, threshold).told === told,
          ).length,
        ]),
      ),
    ]),
  );
  console.log("\nConfusion (rows: expected, columns: told):");
  console.table(confusion);
}

function printRows(rows: Scored[]) {
  for (const row of rows) {
    const told = settle(row.proposal);
    const mark = row.expected
      ? outcome(row, DIAGNOSIS_THRESHOLD).agrees
        ? "ok  "
        : "MISS"
      : "    ";
    console.log(
      `${mark} ${row.term} | expected ${row.expected ?? "-"} | named ${row.proposal?.proposedCause ?? "no reply"} ${row.proposal?.confidence ?? ""} | told ${told.cause}`,
    );
    if (row.proposal?.reason) console.log(`     ${row.proposal.reason}`);
    if (told.draft) console.log(`     ${JSON.stringify(told.draft)}`);
  }
}

const from = option("--from");
const rows: Scored[] = from
  ? JSON.parse(readFileSync(from, "utf8"))
  : await diagnoseAll(
      (
        JSON.parse(
          readFileSync(option("--cards") ?? new URL("./evaluation.json", import.meta.url), "utf8"),
        ) as { decks: FixtureDeck[] }
      ).decks,
    );
const save = option("--save");
if (save) writeFileSync(save, JSON.stringify(rows, null, 2));
if (verbose) printRows(rows);
report(rows);
