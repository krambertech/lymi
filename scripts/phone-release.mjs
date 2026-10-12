// Reads and moves the phone's EAS Update branches for the release workflows; docs/phone-release.md.
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const EAS_CLI_VERSION = "24.13.0";
export const CHANNELS = ["beta", "production"];
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "apps/mobile");
const MANIFEST = join(ROOT, "scripts/eas-cli-commands.json");
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

/** Whether production may take this beta group now, or why not. */
export function promotionCheck({ planned, beta, production, commit }) {
  if (beta?.group !== planned) {
    return { ok: false, reason: "Beta moved on since the smoke journey; run Promote again." };
  }
  const [latest] = production;
  if (latest?.message?.includes(promoteMessage(commit))) {
    return { ok: false, done: true, reason: `${commit.slice(0, 7)} is already on production.` };
  }
  if (latest?.rolloutPercentage !== undefined && latest.rolloutPercentage < 100) {
    return {
      ok: false,
      reason: "A production rollout is still running; let Phone rollout finish it or roll it back.",
    };
  }
  return { ok: true };
}

export function promoteMessage(commit) {
  return `Promote ${commit.slice(0, 7)}`;
}

// Only JSON calls capture stdout; the rest print update IDs and links straight into the job log.
function defaultRunner(argv, { capture }) {
  return execFileSync(argv[0], argv.slice(1), {
    cwd: APP,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", capture ? "pipe" : "inherit", "inherit"],
  });
}

/** Every EAS call, with each command's own flags; tests swap the runner to check them. */
export function createEas(runner = defaultRunner) {
  const run = (args, capture) =>
    runner(["npx", "--yes", `eas-cli@${EAS_CLI_VERSION}`, ...args], { capture });
  const call = (args) => run(args, false);
  const json = (args) => JSON.parse(run(args, true));
  return {
    channels: () => json(["channel:list", "--limit", "25", "--json", "--non-interactive"]),
    createChannel: (name) => call(["channel:create", name, "--json", "--non-interactive"]),
    groups: (branch) =>
      iosGroups(
        json([
          "update:list",
          "--branch",
          branch,
          "--platform",
          "ios",
          "--limit",
          "25",
          "--json",
          "--non-interactive",
        ]),
      ),
    // update:view takes --json and no --non-interactive.
    view: (group) => {
      const updates = json(["update:view", group, "--json"]);
      return updates.find((update) => update.platform === "ios") ?? updates[0];
    },
    builds: (profile, runtime) =>
      json([
        "build:list",
        "--platform",
        "ios",
        "--build-profile",
        profile,
        "--runtime-version",
        runtime,
        "--limit",
        "10",
        "--json",
        "--non-interactive",
      ]),
    build: (profile, whatToTest) =>
      call([
        "build",
        "--profile",
        profile,
        "--platform",
        "ios",
        "--auto-submit",
        "--no-wait",
        ...(whatToTest ? ["--what-to-test", whatToTest] : []),
        "--non-interactive",
      ]),
    publish: (branch, environment, message) =>
      call([
        "update",
        "--branch",
        branch,
        "--platform",
        "ios",
        "--environment",
        environment,
        "--message",
        message,
        "--non-interactive",
      ]),
    republish: (group, branch, message, rollout) =>
      call([
        "update:republish",
        "--group",
        group,
        "--destination-branch",
        branch,
        "--platform",
        "ios",
        ...(rollout ? ["--rollout-percentage", String(rollout)] : []),
        "--message",
        message,
        "--non-interactive",
      ]),
    finishRollout: (group) =>
      call(["update:edit", group, "--rollout-percentage", "100", "--non-interactive"]),
    revertRollout: (group, message) =>
      call([
        "update:revert-update-rollout",
        "--group",
        group,
        "--message",
        message,
        "--non-interactive",
      ]),
    rollBackToEmbedded: (branch, runtime, message) =>
      call([
        "update:roll-back-to-embedded",
        "--branch",
        branch,
        "--runtime-version",
        runtime,
        "--platform",
        "ios",
        "--message",
        message,
        "--non-interactive",
      ]),
  };
}

/** Makes every kind of EAS call once, so the tests and the manifest check the same argv. */
export function sampleCalls(eas) {
  eas.channels();
  eas.createChannel("production");
  eas.groups("beta");
  eas.view("g1");
  eas.builds("beta", "r1");
  eas.build("beta", "- feat(mobile): add reminders");
  eas.build("production");
  eas.publish("beta", "preview", "feat(mobile): add reminders");
  eas.republish("g1", "production", "Promote abc1234", 10);
  eas.republish("g1", "production", "Roll back production");
  eas.finishRollout("g2");
  eas.revertRollout("g2", "Roll back production");
  eas.rollBackToEmbedded("production", "r1", "Roll back production");
}

/** The argv of each sample call, without the npx prefix. */
export function recordSampleCalls() {
  const calls = [];
  sampleCalls(
    createEas((argv) => {
      calls.push(argv.slice(3));
      return "[]";
    }),
  );
  return calls;
}

/** The release commands; each returns the values the workflow reads as step outputs. */
export function createCommands(eas = createEas()) {
  return {
    ready() {
      const config = JSON.parse(readFileSync(join(APP, "app.json"), "utf8")).expo;
      const { ready, reason } = readiness({ token: process.env.EXPO_TOKEN, config });
      if (!ready) {
        console.log(`::notice title=Phone release skipped::${reason} docs/phone-release.md`);
      }
      return { ready };
    },

    runtime() {
      const cli = join(APP, "node_modules/expo-updates/bin/cli.js");
      const resolved = execFileSync("node", [cli, "runtimeversion:resolve", "--platform", "ios"], {
        cwd: APP,
        encoding: "utf8",
      });
      return { runtime: JSON.parse(resolved).runtimeVersion };
    },

    // A fresh project has no branches, and update:list and republish refuse a missing one.
    channels() {
      const existing = new Set(eas.channels().currentPage.map((channel) => channel.name));
      for (const name of CHANNELS.filter((channel) => !existing.has(channel))) {
        eas.createChannel(name);
        console.log(`Created the ${name} channel and its branch.`);
      }
    },

    latest(branch) {
      const [latest] = eas.groups(branch);
      if (!latest) return { group: "", runtime: "", rollout: "", commit: "" };
      return {
        group: latest.group,
        runtime: latest.runtimeVersion,
        rollout: latest.rolloutPercentage ?? 100,
        commit: eas.view(latest.group).gitCommitHash ?? "",
      };
    },

    "has-build"(profile, runtime) {
      return { build: hasLiveBuild(eas.builds(profile, runtime)) };
    },

    build(profile, whatToTest) {
      eas.build(profile, whatToTest);
    },

    publish(branch, environment, message) {
      eas.publish(branch, environment, message);
    },

    promote(group, commit) {
      const check = promotionCheck({
        planned: group,
        beta: eas.groups("beta")[0],
        production: eas.groups("production"),
        commit,
      });
      if (check.done) {
        console.log(`::notice title=Phone promote::${check.reason}`);
        return { promoted: false };
      }
      if (!check.ok) throw new Error(check.reason);
      eas.republish(group, "production", promoteMessage(commit), 10);
      return { promoted: true };
    },

    "finish-rollout"(branch, hours) {
      const [latest] = eas.groups(branch);
      if (!latest) return console.log(`Nothing is published on ${branch}.`);
      if (!rolloutDue(latest, eas.view(latest.group).createdAt, Date.now(), Number(hours))) {
        return console.log(`No rollout on ${branch} is due to finish.`);
      }
      eas.finishRollout(latest.group);
      console.log(`Rolled ${latest.group} out to everyone on ${branch}.`);
    },

    rollback(branch, group) {
      const plan = rollbackPlan(eas.groups(branch), group);
      const message = `Roll back ${branch}`;
      if (plan.action === "none") {
        throw new Error(`Nothing is published on ${branch}, so there is nothing to roll back.`);
      }
      if (plan.action === "revert-rollout") eas.revertRollout(plan.group, message);
      if (plan.action === "republish") eas.republish(plan.group, branch, message);
      if (plan.action === "embedded") eas.rollBackToEmbedded(branch, plan.runtime, message);
      console.log(`Rolled back ${branch}: ${JSON.stringify(plan)}`);
    },

    // Records the pinned CLI's commands and flags, and every sample call its own parser accepted, values included.
    async manifest() {
      const dir = mkdtempSync(join(tmpdir(), "eas-cli-"));
      execFileSync(
        "npm",
        [
          "install",
          "--prefix",
          dir,
          "--ignore-scripts",
          "--no-audit",
          "--no-fund",
          `eas-cli@${EAS_CLI_VERSION}`,
        ],
        { stdio: ["ignore", "ignore", "pipe"] },
      );
      const require = createRequire(join(dir, "node_modules/eas-cli/package.json"));
      const { Parser } = require("@oclif/core");
      const { commands } = require("./oclif.manifest.json");
      const accepted = recordSampleCalls();
      for (const [id, ...argv] of accepted) {
        const { args, flags } = require(`./${commands[id].relativePath.join("/")}`).default;
        try {
          await Parser.parse(argv, { args, flags, strict: true });
        } catch (error) {
          throw new Error(
            `eas-cli ${EAS_CLI_VERSION} rejects ${id} ${argv.join(" ")}: ${error.message}`,
          );
        }
      }
      const used = Object.fromEntries(
        Object.entries(commands)
          .filter(
            ([id]) => id === "build" || id === "update" || /^(update|build|channel):/.test(id),
          )
          .map(([id, command]) => [
            id,
            {
              args: Object.keys(command.args ?? {}),
              flags: Object.fromEntries(
                Object.entries(command.flags).map(([name, flag]) => [
                  name,
                  flag.type === "option" ? "option" : flag.allowNo ? "boolean-or-no" : "boolean",
                ]),
              ),
            },
          ]),
      );
      writeFileSync(
        MANIFEST,
        `${JSON.stringify({ version: EAS_CLI_VERSION, commands: used, accepted }, null, 2)}\n`,
      );
    },
  };
}

function output(values) {
  for (const [key, value] of Object.entries(values ?? {})) {
    console.log(`${key}=${value}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [name, ...args] = process.argv.slice(2);
  const commands = createCommands();
  const command = commands[name];
  if (!command) {
    console.error(`Usage: node scripts/phone-release.mjs <${Object.keys(commands).join("|")}> …`);
    process.exit(1);
  }
  output(await command(...args));
}
