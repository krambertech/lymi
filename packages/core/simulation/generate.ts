import { writeFileSync } from "node:fs";
import { fingerprint, RESULTS_PATH } from "./fingerprint";
import { newCardStudy, reviewOrderStudy } from "./year";

const results = {
  fingerprint: fingerprint(),
  reviewOrder: reviewOrderStudy(),
  newCards: newCardStudy(),
};
writeFileSync(RESULTS_PATH, `${JSON.stringify(results, null, 2)}\n`);
console.log(`Wrote ${RESULTS_PATH}`);
