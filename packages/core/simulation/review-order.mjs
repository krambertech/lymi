// Compares review orders under a capped daily goal. See README.md for assumptions and results.
import { createEmptyCard, fsrs, generatorParameters, Rating } from "ts-fsrs";

const DAY = 86_400_000;
const START = Date.parse("2026-01-01T09:00:00Z");
const DAYS = 365;
const GOAL = 50;
const NEW_SLOT_EVERY = 5;
const FIRST_RECALL = 0.5;
const SEEDS = [42, 7, 99, 1234];

const scheduler = fsrs(
  generatorParameters({ enable_fuzz: true, learning_steps: ["10m"], relearning_steps: ["10m"] }),
);

let state = 1;
const random = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};

/** Efraimidis–Spirakis: a larger key wins, and a weight of w makes a card w times as likely. */
const weightedOrder = (items, weight) =>
  items
    .map((item) => ({ item, key: Math.log(random()) / Math.max(1e-6, weight(item)) }))
    .sort((a, b) => b.key - a.key)
    .map(({ item }) => item);

const orders = {
  "Due date, oldest first": (due) => due.sort((a, b) => a.card.due - b.card.due),
  "Strict, lowest recall first": (due) => due.sort((a, b) => a.r - b.r),
  "Strict, highest recall first": (due) => due.sort((a, b) => b.r - a.r),
  "Plain random": (due) => weightedOrder(due, () => 1),
  "Weighted, odds = 1 - recall": (due) => weightedOrder(due, (x) => 1 - x.r),
  "Weighted, odds = recall^4": (due) => weightedOrder(due, (x) => x.r ** 4),
};

/** One attempt. A miss gets one return a few cards later, assumed Good. */
function attempt(card, at, recall) {
  if (random() < recall) return [scheduler.next(card, new Date(at), Rating.Good).card, 1];
  const missed = scheduler.next(card, new Date(at), Rating.Again).card;
  return [scheduler.next(missed, new Date(at + 3 * 60_000), Rating.Good).card, 2];
}

function run(order, seed) {
  state = seed;
  const cards = [];
  for (let day = 0; day < DAYS; day++) {
    const now = START + day * DAY;
    const due = cards
      .filter((entry) => entry.card.due.getTime() <= now + 12 * 3_600_000)
      .map((entry) => ({
        entry,
        card: entry.card,
        r: scheduler.get_retrievability(entry.card, new Date(now), false),
      }));
    const drawn = order(due);
    let used = 0;
    let slot = 0;
    let next = 0;
    while (used < GOAL) {
      const newSlot = slot % NEW_SLOT_EVERY === NEW_SLOT_EVERY - 1 || next >= drawn.length;
      slot++;
      if (newSlot) {
        const [card, n] = attempt(createEmptyCard(new Date(now)), now, FIRST_RECALL);
        cards.push({ card });
        used += n;
      } else {
        const pick = drawn[next++];
        const [card, n] = attempt(pick.card, now, pick.r);
        pick.entry.card = card;
        used += n;
      }
    }
  }
  const end = new Date(START + DAYS * DAY);
  const known = cards.reduce(
    (sum, { card }) => sum + scheduler.get_retrievability(card, end, false),
    0,
  );
  const late = cards.filter(({ card }) => card.due.getTime() < end.getTime() - 7 * DAY).length;
  return { introduced: cards.length, known, late };
}

console.log("| Order | Cards introduced | Expected cards remembered | Cards over a week late |");
console.log("| --- | --- | --- | --- |");
for (const [name, order] of Object.entries(orders)) {
  const runs = SEEDS.map((seed) => run(order, seed));
  const mean = (key) => Math.round(runs.reduce((sum, r) => sum + r[key], 0) / runs.length);
  console.log(`| ${name} | ${mean("introduced")} | ${mean("known")} | ${mean("late")} |`);
}
