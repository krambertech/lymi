// Reads and moves the phone's EAS Update branches for the release workflows; docs/phone-release.md.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const EAS_CLI = "eas-cli@24.13.0";
const APP = join(dirname(fileURLToPath(import.meta.url)), "../apps/mobile");
const DEAD_BUILDS = new Set(["ERRORED", "CANCELED"]);

/** Whether the workflows can reach EAS, and what is missing when they cannot. */
export function readiness({ token, config }) {
  const missing = [];
  if (!token) missing.push("the EXPO_TOKEN secret");
  if (!config.extra?.eas?.projectId) missing.push("extra.eas.projectId in apps/mobile/app.json");
  if (!config.updates?.url) missing.push("updates.url in apps/mobile/app.json");
  return missing.length
    ? { ready: false, reason: `EAS is not set up yet: missing ${missing.join(", ")}.` }
    : { ready: true, reason: "" };
}

/** `eas update:list --json` groups, newest first, keeping those that ship to iOS. */
export function iosGroups(list) {
  return (list?.currentPage ?? []).filter((group) => /\bios\b/.test(group.platforms ?? ""));
}

/** Whether a build for this runtime exists or is on its way, so another would be wasted. */
export function hasLiveBuild(builds) {
  return builds.some((build) => !DEAD_BUILDS.has(build.status));
}

/** Whether a partial rollout has had its day and should reach everyone. */
export function rolloutDue(group, createdAt, now, hours) {
  if (group.rolloutPercentage === undefined || group.rolloutPercentage >= 100) return false;
  return now - Date.parse(createdAt) >= hours * 3_600_000;
}

/**
 * How to undo the newest update on a branch: end its rollout, or bring back the update before it
 * on the same runtime, or fall back to the update inside the binary.
 */
export function rollbackPlan(groups, group) {
  if (group) return { action: "republish", group };
  const [latest] = groups;
  if (!latest) return { action: "none" };
  if (latest.rolloutPercentage !== undefined && latest.rolloutPercentage < 100) {
    return { action: "revert-rollout", group: latest.group };
  }
  const previous = groups
    .slice(1)
    .find((candidate) => candidate.runtimeVersion === latest.runtimeVersion);
  if (previous && !previous.isRollBackToEmbedded) {
    return { action: "republish", group: previous.group };
  }
  return { action: "embedded", runtime: latest.runtimeVersion };
}

function eas(args, { json = true } = {}) {
  const output = execFileSync(
    "npx",
    ["--yes", EAS_CLI, ...args, ...(json ? ["--json"] : []), "--non-interactive"],
    { cwd: APP, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
  if (!json) return output;
  return JSON.parse(output);
}

function output(values) {
  for (const [key, value] of Object.entries(values)) {
    console.log(`${key}=${value}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

function listGroups(branch) {
  return iosGroups(eas(["update:list", "--branch", branch, "--platform", "ios", "--limit", "25"]));
}

function viewGroup(group) {
  const updates = eas(["update:view", group]);
  return updates.find((update) => update.platform === "ios") ?? updates[0];
}

const commands = {
  ready() {
    const config = JSON.parse(readFileSync(join(APP, "app.json"), "utf8")).expo;
    const { ready, reason } = readiness({ token: process.env.EXPO_TOKEN, config });
    if (!ready)
      console.log(`::notice title=Phone release skipped::${reason} docs/phone-release.md`);
    output({ ready });
  },

  runtime() {
    const cli = join(APP, "node_modules/expo-updates/bin/cli.js");
    const resolved = execFileSync("node", [cli, "runtimeversion:resolve", "--platform", "ios"], {
      cwd: APP,
      encoding: "utf8",
    });
    output({ runtime: JSON.parse(resolved).runtimeVersion });
  },

  latest(branch) {
    const [latest] = listGroups(branch);
    if (!latest) return output({ group: "", runtime: "", rollout: "", commit: "" });
    const update = viewGroup(latest.group);
    output({
      group: latest.group,
      runtime: latest.runtimeVersion,
      rollout: latest.rolloutPercentage ?? 100,
      commit: update.gitCommitHash ?? "",
    });
  },

  "has-build"(profile, runtime) {
    const builds = eas([
      "build:list",
      "--platform",
      "ios",
      "--build-profile",
      profile,
      "--runtime-version",
      runtime,
      "--limit",
      "10",
    ]);
    output({ build: hasLiveBuild(builds) });
  },

  "finish-rollout"(branch, hours) {
    const [latest] = listGroups(branch);
    if (!latest) return console.log(`Nothing is published on ${branch}.`);
    const { createdAt } = viewGroup(latest.group);
    if (!rolloutDue(latest, createdAt, Date.now(), Number(hours))) {
      return console.log(`No rollout on ${branch} is due to finish.`);
    }
    eas(["update:edit", latest.group, "--rollout-percentage", "100"], { json: false });
    console.log(`Rolled ${latest.group} out to everyone on ${branch}.`);
  },

  rollback(branch, group) {
    const plan = rollbackPlan(listGroups(branch), group);
    const message = ["--message", `Roll back ${branch}`];
    switch (plan.action) {
      case "none":
        throw new Error(`Nothing is published on ${branch}, so there is nothing to roll back.`);
      case "revert-rollout":
        eas(["update:revert-update-rollout", "--group", plan.group, ...message], { json: false });
        break;
      case "republish":
        eas(
          [
            "update:republish",
            "--group",
            plan.group,
            "--destination-branch",
            branch,
            "--platform",
            "ios",
            ...message,
          ],
          { json: false },
        );
        break;
      case "embedded":
        eas(
          [
            "update:roll-back-to-embedded",
            "--branch",
            branch,
            "--runtime-version",
            plan.runtime,
            "--platform",
            "ios",
            ...message,
          ],
          { json: false },
        );
        break;
    }
    console.log(`Rolled back ${branch}: ${JSON.stringify(plan)}`);
  },
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [name, ...args] = process.argv.slice(2);
  const command = commands[name];
  if (!command) {
    console.error(`Usage: node scripts/phone-release.mjs <${Object.keys(commands).join("|")}> …`);
    process.exit(1);
  }
  command(...args);
}
