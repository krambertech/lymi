// One base port so a second worktree can run the suite at the same time: E2E_PORT=4183 gives
// 4183, 4184 and 4185. The three ports move together because the servers address each other.
const raw = process.env.E2E_PORT ?? "4173";
const base = Number(raw);

if (!Number.isInteger(base) || base < 1024 || base > 65_533) {
  throw new Error(`E2E_PORT must be a whole port between 1024 and 65533, not ${raw}`);
}

/** Vite serving the product for the interactive journeys. */
export const e2eProductPort = base;
/** The site Worker, which keeps its own local D1. */
export const e2eSitePort = base + 1;
/** The production-built product package, for installation and offline-shell coverage. */
export const e2eProductPackagePort = base + 2;

export const e2eProductUrl = `http://localhost:${e2eProductPort}`;
export const e2eSiteUrl = `http://localhost:${e2eSitePort}`;
export const e2eProductPackageUrl = `http://localhost:${e2eProductPackagePort}`;
