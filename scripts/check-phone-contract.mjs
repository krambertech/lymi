#!/usr/bin/env node

// Checks a deployed Worker's OpenAPI document against every frozen phone release.
// Usage: node scripts/check-phone-contract.mjs https://my.lymi.app/api/openapi.json

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { breakingChanges, contractOf } from "./api-compat.mjs";

const contracts = resolve(fileURLToPath(new URL("..", import.meta.url)), "apps/mobile/contract");
const url = process.argv[2];
if (!url) {
  console.error("Name the OpenAPI document to check, such as https://my.lymi.app/api/openapi.json");
  process.exit(2);
}

const response = await fetch(url);
if (!response.ok) {
  console.error(`${url} answered ${response.status}`);
  process.exit(1);
}
const current = contractOf(await response.json());

let failed = false;
for (const name of readdirSync(contracts).filter((file) => file.endsWith(".json"))) {
  const frozen = JSON.parse(readFileSync(join(contracts, name), "utf8"));
  const problems = breakingChanges(frozen, current);
  const release = name.replace(/\.json$/, "");
  if (problems.length === 0) {
    console.log(`Phone release ${release}: compatible`);
    continue;
  }
  failed = true;
  console.error(`Phone release ${release}: ${problems.length} breaking changes`);
  for (const problem of problems) console.error(`  ${problem}`);
}
process.exit(failed ? 1 : 0);
