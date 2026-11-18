import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateHistories } from "./histories";
import { type History, schedulesOf, toJson } from "./snapshot";

const here = dirname(fileURLToPath(import.meta.url));
const HISTORIES = join(here, "histories.json");
const SCHEDULES = join(here, "schedules.json");

// `--histories` redraws the inputs; only for growing the corpus, never beside a scheduler change.
if (process.argv.includes("--histories")) {
  writeFileSync(HISTORIES, toJson(generateHistories()));
  console.log(`Wrote ${HISTORIES}`);
}

const histories = JSON.parse(readFileSync(HISTORIES, "utf8")) as Record<string, History>;
writeFileSync(SCHEDULES, toJson(schedulesOf(histories)));
console.log(`Wrote ${SCHEDULES}`);
