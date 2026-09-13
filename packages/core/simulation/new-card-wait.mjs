// Compares how new-card slots choose when cards arrive faster than they are started. See README.md.
const DAYS = 365;
const NEW_SLOTS_PER_DAY = 5;
const JOINED_DECK = 300;
const LESSON_SIZE = 60;
const LESSON_EVERY_DAYS = 7;
const SEED = 7;

let state = 1;
const random = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};

const halveWeekly = (age) => 0.5 ** (age / 7);
const policies = {
  "Odds halve weekly, no floor": () => halveWeekly,
  "Odds halve weekly, never below 1/8": () => (age) => Math.max(1 / 8, halveWeekly(age)),
  "Every unseen card equally likely": () => () => 1,
  "Oldest first": () => null,
  "3 slots in 4 favor recent, 1 in 4 takes the oldest": (slot) =>
    slot % 4 === 3 ? null : halveWeekly,
};

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)];
};

console.log("| Rule | Lesson wait, median | Lesson wait, 90th percentile | Joined deck started |");
console.log("| --- | --- | --- | --- |");
for (const [name, policy] of Object.entries(policies)) {
  state = SEED;
  let slot = 0;
  const pool = Array.from({ length: JOINED_DECK }, () => ({ added: 0, joined: true }));
  const lessonWaits = [];
  let joinedStarted = 0;
  for (let day = 0; day < DAYS; day++) {
    if (day > 0 && day % LESSON_EVERY_DAYS === 0) {
      for (let i = 0; i < LESSON_SIZE; i++) pool.push({ added: day, joined: false });
    }
    for (let s = 0; s < NEW_SLOTS_PER_DAY && pool.length > 0; s++) {
      const weight = policy(slot++);
      let pick = 0;
      if (weight) {
        let best = Number.NEGATIVE_INFINITY;
        pool.forEach((card, i) => {
          const key = Math.log(random()) / weight(day - card.added);
          if (key > best) {
            best = key;
            pick = i;
          }
        });
      } else {
        pool.forEach((card, i) => {
          if (card.added < pool[pick].added) pick = i;
        });
      }
      const [card] = pool.splice(pick, 1);
      if (card.joined) joinedStarted++;
      else lessonWaits.push(day - card.added);
    }
  }
  console.log(
    `| ${name} | ${percentile(lessonWaits, 0.5)} days | ${percentile(lessonWaits, 0.9)} days | ${joinedStarted} of ${JOINED_DECK} |`,
  );
}
