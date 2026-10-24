#!/usr/bin/env node

// Which verify features a pull request reaches, so CI drives them on its app preview.
// The verify skill owns the features; this table owns which paths reach each one.

import { appendFileSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isTestFile } from "./e2e-impact.mjs";

const featuresDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.agents/skills/verify/features",
);
const recipes = ".agents/skills/verify/features/";
const web = "apps/web/";
const client = "apps/web/src/client/";
const server = "apps/web/src/server/";
const core = "packages/core/src/";
const shared = "packages/client/src/";

// Every recipe signs a persona in, seeds it and draws the shell, so these reach every feature.
export const everyFeature = [
  ".github/workflows/ci.yml",
  ".nvmrc",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  ".agents/skills/verify/scripts/",
  "scripts/verify-ci.mjs",
  "scripts/verify-impact.mjs",
  `${web}package.json`,
  `${web}vite.config.ts`,
  `${web}wrangler.jsonc`,
  `${web}index.html`,
  `${web}migrations/`,
  `${web}public/`,
  `${web}src/locales/`,
  `${web}src/shared/`,
  `${client}main.tsx`,
  `${client}app-entry.tsx`,
  `${client}routes/__root.tsx`,
  `${client}views/shell.tsx`,
  `${client}components/layout/`,
  `${client}components/ui/`,
  `${client}components/button.tsx`,
  `${client}components/rail-nav.tsx`,
  `${client}components/pill-nav.tsx`,
  `${client}components/nav-link.tsx`,
  `${client}components/learner-menu.tsx`,
  `${client}dev/`,
  `${client}lib/api/`,
  `${client}lib/queries/`,
  `${client}lib/auth.ts`,
  `${client}lib/client.ts`,
  `${client}lib/i18n.ts`,
  `${client}lib/persisted.ts`,
  `${client}lib/query-persister.ts`,
  `${client}lib/utils.ts`,
  `${client}styles/`,
  `${client}styles.css`,
  `${server}app.ts`,
  `${server}index.ts`,
  `${server}auth.ts`,
  `${server}db.ts`,
  `${server}env.ts`,
  `${server}http.ts`,
  `${server}i18n.ts`,
  `${server}principal.ts`,
  `${server}preview-access.ts`,
  `${server}origin-routing.ts`,
  `${server}dev/`,
  `${server}routes/dev.ts`,
  `${server}services/dev.ts`,
  `${server}services/audit.ts`,
  `${server}services/context.ts`,
  `${server}services/index.ts`,
  `${core}index.ts`,
  `${core}types.ts`,
  `${core}db.ts`,
  `${core}ids.ts`,
  `${core}schema/`,
  `${core}responses/`,
  `${shared}index.ts`,
  `${shared}config.ts`,
  `${shared}cache.ts`,
  `${shared}keyed.ts`,
  `${shared}api/index.ts`,
  `${shared}api/request.ts`,
  `${shared}queries/index.ts`,
  "packages/design/",
];

// A product path no row claims still changes the product, so CI drives the learner's main path.
export const fallbackFeatures = ["review", "add-card", "deck-page"];

const reviewing = [
  `${client}routes/review.tsx`,
  `${client}views/review-view.tsx`,
  `${client}components/grade.tsx`,
  `${client}components/recall-aid.tsx`,
  `${client}components/recall-tally.tsx`,
  `${client}components/progress.tsx`,
  `${client}lib/review-leg.ts`,
  `${client}lib/review-modes.ts`,
  `${server}routes/review.ts`,
  `${server}services/review.ts`,
  `${server}services/draw.ts`,
  `${server}services/modes.ts`,
  `${server}services/review-days.ts`,
  `${server}services/card-view.ts`,
  `${shared}api/review.ts`,
  `${shared}queries/review.ts`,
  `${shared}grades.ts`,
  `${shared}queued.ts`,
  `${shared}recall-clock.ts`,
  `${shared}review-day.ts`,
  `${shared}review-draw.ts`,
  `${shared}review-end.ts`,
  `${shared}daily-goal.ts`,
  `${core}fsrs.ts`,
  `${core}draw.ts`,
  `${core}modes.ts`,
  `${core}chosen.ts`,
  `${core}slipping.ts`,
];

const today = [
  `${client}routes/today.tsx`,
  `${client}routes/index.tsx`,
  `${client}views/today-view.tsx`,
  `${client}components/due-count.tsx`,
  `${client}components/next-steps.tsx`,
  `${client}components/new-cards-row.tsx`,
  `${client}components/start-panel.tsx`,
  `${client}components/streak`,
  `${client}components/seven-lights.tsx`,
  `${client}components/flame.tsx`,
  `${client}components/lantern`,
  `${client}lib/streak.tsx`,
  `${client}lib/use-flame.ts`,
  `${server}routes/stats.ts`,
  `${server}services/stats.ts`,
  `${core}streak.ts`,
];

const library = [
  `${client}routes/library.tsx`,
  `${client}routes/library.$deckId.tsx`,
  `${client}views/library-view.tsx`,
  `${client}views/deck-detail-view.tsx`,
  `${client}views/deck-glossary.tsx`,
  `${client}components/library-board.tsx`,
  `${client}components/deck-row.tsx`,
  `${client}components/deck-tray.tsx`,
  `${client}components/shelf-bar.tsx`,
  `${client}components/section-`,
  `${client}components/series-dialogs.tsx`,
  `${client}lib/use-sections.ts`,
  `${client}lib/use-series.ts`,
  `${client}lib/last-deck.ts`,
  `${server}routes/decks.ts`,
  `${server}routes/sections.ts`,
  `${server}routes/series.ts`,
  `${server}services/decks.ts`,
  `${server}services/sections.ts`,
  `${server}services/series.ts`,
  `${server}services/series-access.ts`,
  `${server}services/deck-style.ts`,
  `${server}services/deck-stages`,
  `${shared}api/decks.ts`,
  `${shared}api/sections.ts`,
  `${shared}api/series.ts`,
  `${shared}queries/decks.ts`,
  `${shared}queries/sections.ts`,
  `${shared}queries/series.ts`,
  `${shared}deck-list.ts`,
  `${shared}library-groups.ts`,
  `${core}sections.ts`,
];

const cardWrites = [
  `${client}components/add-card-sheet.tsx`,
  `${client}components/add-menu.tsx`,
  `${client}components/card-form.tsx`,
  `${client}components/card-form-pickers.tsx`,
  `${client}components/edit-card-sheet.tsx`,
  `${client}components/smart-add`,
  `${client}lib/add-card.tsx`,
  `${client}lib/card-writes.ts`,
  `${client}lib/composing.ts`,
  `${server}routes/cards.ts`,
  `${server}routes/add.ts`,
  `${server}batch.ts`,
  `${server}services/cards.ts`,
  `${server}services/batch.ts`,
  `${server}services/revisions.ts`,
  `${shared}api/cards.ts`,
  `${shared}queries/cards.ts`,
  `${shared}card-batch.ts`,
  `${shared}card-input.ts`,
  `${shared}writes.ts`,
  `${shared}write-projections.ts`,
  `${core}terms.ts`,
  `${core}card-search.ts`,
];

// How a card's term, reading and example are drawn and enriched, in every language.
const cardText = [
  `${client}components/term-text.tsx`,
  `${client}components/example-lines.tsx`,
  `${client}components/furigana.tsx`,
  `${client}views/word-view.tsx`,
  `${client}lib/bidi.tsx`,
  `${server}enrichment/`,
  `${server}languages/index.ts`,
  `${server}languages/types.ts`,
  `${server}languages/stress-checks.ts`,
  `${server}services/enrichment.ts`,
  `${server}routes/languages.ts`,
  `${core}card-text.ts`,
  `${core}example.ts`,
  `${core}enrichment.ts`,
  `${core}isolate.ts`,
  `${core}reading.ts`,
  `${core}languages/index.ts`,
  `${core}languages/types.ts`,
  `${core}languages/names.ts`,
  `${core}languages/notation.ts`,
  `${shared}known-readings.ts`,
];

// Configured languages share one core module and have no server module of their own.
const language = (name) => [
  ...reviewing,
  ...library,
  ...cardText,
  `${core}languages/${name}.ts`,
  ...(name === "configured" ? [] : [`${server}languages/${name}.ts`]),
];

const importing = [
  `${client}routes/-import-start.tsx`,
  `${client}routes/import.`,
  `${client}views/import-view.tsx`,
  `${client}components/import-parts.tsx`,
  `${client}lib/import-guides.ts`,
  `${client}lib/import-uploads.ts`,
  `${client}views/settings-view.tsx`,
  `${server}imports/adapter.ts`,
  `${server}imports/call-budget.ts`,
  `${server}imports/files.ts`,
  `${server}imports/sqlite.ts`,
  `${server}imports/workflow.ts`,
  `${server}routes/imports.ts`,
  `${server}services/imports.ts`,
  `${server}services/import-writer.ts`,
  `${server}services/import-languages.ts`,
  `${shared}api/imports.ts`,
  `${shared}queries/imports.ts`,
  `${shared}imports.ts`,
  `${core}import.ts`,
  `${core}import-text.ts`,
  `${core}import-replay.ts`,
];

const anki = [...importing, `${server}imports/anki/`];

const firstRun = [
  ...today,
  `${client}components/first-run.tsx`,
  `${client}components/goal-picker.tsx`,
  `${client}components/language-picker.tsx`,
  `${client}lib/first-run.ts`,
  `${client}lib/use-add-published-deck.ts`,
  `${server}routes/explore.ts`,
  `${server}routes/settings.ts`,
  `${server}services/explore.ts`,
  `${server}services/publications.ts`,
  `${server}services/editions.ts`,
  `${server}services/settings.ts`,
  `${shared}welcome.ts`,
  `${shared}api/explore.ts`,
  `${shared}queries/explore.ts`,
  `${core}catalog.ts`,
];

export const featureReach = {
  "sign-in": [
    `${client}routes/login.tsx`,
    `${client}views/login-view.tsx`,
    `${client}components/auth-frame.tsx`,
    `${client}components/auth-notice.tsx`,
    `${client}components/apple-mark.tsx`,
    `${client}components/google-mark.tsx`,
    `${client}components/password-field.tsx`,
    `${server}apple-sign-in`,
    `${server}apple-id-token.ts`,
    `${server}google-sign-in`,
    `${server}auth-rate-limit.ts`,
    `${server}password-rules.ts`,
  ],
  review: [...today, ...reviewing],
  "day-turns": [...today, ...reviewing],
  "reveal-hint": [...reviewing, `${client}lib/reveal-hint.ts`, `${shared}reveal-hint.ts`],
  furigana: language("japanese"),
  "add-card": [...library, ...cardWrites],
  "deck-page": [
    ...library,
    `${client}components/card-menu.tsx`,
    `${client}components/card-notes.tsx`,
  ],
  "select-cards": [
    ...library,
    `${client}lib/use-card-batch.ts`,
    `${client}components/move-cards-to-deck-dialog.tsx`,
    `${client}components/move-to-dialog.tsx`,
    `${client}components/tag-cards-dialog.tsx`,
    `${client}lib/use-tag-cards.ts`,
  ],
  "new-deck": [
    ...library,
    `${client}components/new-deck-sheet.tsx`,
    `${client}components/deck-fields.tsx`,
  ],
  "deck-settings": [
    ...library,
    `${client}routes/library.$deckId.settings`,
    `${client}views/deck-settings-view.tsx`,
    `${client}views/deck-tags-view.tsx`,
    `${client}components/deck-fields.tsx`,
    `${server}routes/tags.ts`,
    `${server}services/tags.ts`,
    `${server}services/deck-tags`,
  ],
  "deck-invitation": [
    ...library,
    `${client}routes/library.$deckId.settings.tsx`,
    `${client}views/deck-settings-view.tsx`,
    `${client}components/member-dialogs.tsx`,
    `${server}routes/join.ts`,
    `${server}services/invitations.ts`,
    `${server}services/members.ts`,
    `${server}invitation-rate-limit.ts`,
    `${server}email/`,
    `${server}routes/email.ts`,
    `${server}services/email.ts`,
    `${shared}api/sharing.ts`,
    `${shared}queries/sharing.ts`,
  ],
  import: [...anki, `${client}routes/activity.tsx`, `${client}views/activity-view.tsx`],
  "import-pleco": [...importing, `${server}imports/pleco/`, `${client}routes/activity.tsx`],
  "import-recordings": [
    ...anki,
    `${server}services/recordings.ts`,
    `${server}services/audio.ts`,
    `${server}routes/audio.ts`,
  ],
  "import-chinese": [...anki, `${core}pinyin/`],
  "offline-writes": [...library, ...cardWrites, `${client}components/new-deck-sheet.tsx`],
  japanese: [...language("japanese"), `${client}components/smart-add`],
  chinese: [...language("chinese"), `${core}pinyin/`],
  cantonese: [...language("cantonese"), `${core}jyutping/`],
  korean: language("configured"),
  "configured-languages": [...language("configured"), `${core}indic/`],
  russian: [...language("russian"), `${core}stress/`, `${server}speech-stress/`],
  ukrainian: [...language("ukrainian"), `${core}stress/`, `${server}speech-stress/`],
  tamil: [...language("tamil"), `${core}indic/`],
  "right-to-left": [...language("configured"), `${core}languages/direction.ts`],
  "example-audio": [
    ...library,
    ...cardText,
    `${client}components/example-audio.tsx`,
    `${client}components/audio-button.tsx`,
    `${client}lib/now-playing.ts`,
    `${server}routes/audio.ts`,
    `${server}services/audio.ts`,
    `${server}services/example-audio.ts`,
    `${server}example-audio-rate-limit.ts`,
  ],
  "example-translation": [
    ...library,
    ...cardText,
    ...cardWrites,
    `${server}services/example-translation.ts`,
  ],
  "rest-day": [
    ...today,
    `${client}components/rest-day`,
    `${client}lib/rest-day.ts`,
    `${client}routes/you.tsx`,
  ],
  "first-run": firstRun,
  "first-run-japanese": firstRun,
  "first-run-chinese": firstRun,
  "first-run-ukrainian": firstRun,
  "ai-services": [
    `${client}routes/settings.tsx`,
    `${client}views/settings-view.tsx`,
    `${client}components/ai-services-section.tsx`,
    `${client}components/settings-group.tsx`,
    `${server}routes/settings.ts`,
    `${server}services/settings.ts`,
    `${server}services/ai-consent.ts`,
    `${server}ai/`,
    `${shared}ai-consent.ts`,
    `${shared}api/settings.ts`,
    `${shared}queries/settings.ts`,
  ],
};

// Paths that change what a learner sees or does in the product the app preview serves.
const productPrefixes = [web, "packages/core/", "packages/client/", "packages/design/"];
const notProduct = [
  `${client}design/`,
  `${client}studio/`,
  `${server}enrichment/runs/`,
  "packages/core/simulation/",
];

function isProduct(path) {
  if (notProduct.some((prefix) => path.startsWith(prefix))) return false;
  return productPrefixes.some((prefix) => path.startsWith(prefix));
}

const claims = (reach, path) => reach.some((prefix) => path.startsWith(prefix));

/** A recipe's own file reaches it, and so does a recipe another one imports. */
function recipeReach(path, names, imports) {
  if (!path.startsWith(recipes) || !path.endsWith(".mjs")) return null;
  const name = path.slice(recipes.length, -".mjs".length);
  if (!names.includes(name)) return [];
  return names.filter((other) => other === name || imports[other]?.includes(name));
}

export function selectVerifyFeatures(
  paths,
  { names = Object.keys(featureReach), imports = {} } = {},
) {
  const chosen = new Set();
  const unclaimed = [];
  let everything = null;
  for (const path of paths) {
    const fromRecipe = recipeReach(path, names, imports);
    if (fromRecipe) {
      for (const name of fromRecipe) chosen.add(name);
      continue;
    }
    if (isTestFile(path) || path.endsWith(".md")) continue;
    if (
      everyFeature.some(
        (prefix) => path === prefix || (prefix.endsWith("/") && path.startsWith(prefix)),
      )
    ) {
      everything ??= path;
      continue;
    }
    if (!isProduct(path)) continue;
    const reached = names.filter((name) => claims(featureReach[name] ?? [], path));
    if (reached.length > 0) for (const name of reached) chosen.add(name);
    else unclaimed.push(path);
  }

  if (everything) {
    return { features: names, unclaimed, reason: `${everything} reaches every feature.` };
  }
  const packaged = unclaimed.filter((path) => !path.startsWith(web));
  if (packaged.length > 0) {
    return {
      features: names,
      unclaimed,
      reason: `${packaged[0]} is shared code no feature claims, so it reaches every feature.`,
    };
  }
  if (unclaimed.length > 0) for (const name of fallbackFeatures) chosen.add(name);
  const features = names.filter((name) => chosen.has(name));
  if (features.length === 0) {
    return {
      features,
      unclaimed,
      reason: "This pull request changes no product path a verify feature drives.",
    };
  }
  const reason =
    unclaimed.length > 0
      ? `No feature claims ${unclaimed.join(", ")}, so the main learner path is driven too.`
      : "These are the features the changed paths reach.";
  return { features, unclaimed, reason };
}

/** Recipe names and which other recipes each one imports, read from the features folder. */
export function readRecipes(dir = featuresDir) {
  const names = readdirSync(dir)
    .filter((file) => file.endsWith(".mjs"))
    .map((file) => file.slice(0, -".mjs".length))
    .sort();
  const imports = Object.fromEntries(
    names.map((name) => [
      name,
      [
        ...readFileSync(resolve(dir, `${name}.mjs`), "utf8").matchAll(/from "\.\/([\w-]+)\.mjs"/g),
      ].map((match) => match[1]),
    ]),
  );
  return { names, imports };
}

function readPaths() {
  const input = readFileSync(0, "utf8");
  return input.split(input.includes("\0") ? "\0" : "\n").filter(Boolean);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { features, reason } = selectVerifyFeatures(readPaths(), readRecipes());
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `verify_features=${features.join(" ")}\nverify_reason=${reason}\n`,
    );
  }
  process.stdout.write(
    features.length > 0
      ? `Verify drives ${features.length} feature(s): ${features.join(", ")}. ${reason}\n`
      : `Verify drives no feature. ${reason}\n`,
  );
}
