// Reads and moves the phone's EAS Update branches for the release workflows; docs/phone-release.md.
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const EAS_CLI_VERSION = "24.13.0";
export const CHANNELS = ["beta", "production"];
export const PLATFORMS = ["ios", "android"];
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

/** The platforms the workflows release, from the PHONE_PLATFORMS variable; iOS alone until Play is set up. */
export function releasePlatforms(value) {
  const named = (value ?? "").split(/[\s,]+/).filter(Boolean);
  const unknown = named.filter((platform) => !PLATFORMS.includes(platform));
  if (unknown.length)
    throw new Error(`PHONE_PLATFORMS names ${unknown.join(", ")}; use ios, android.`);
  return named.length ? PLATFORMS.filter((platform) => named.includes(platform)) : ["ios"];
}

/**
 * `eas update:list --json` groups, newest first, keeping those that ship to the platform. Each
 * platform publishes its own groups, because a group carries one runtime and the two fingerprints differ.
 */
export function platformGroups(list, platform) {
  const named = new RegExp(`\\b${platform}\\b`);
  return (list?.currentPage ?? []).filter((group) => named.test(group.platforms ?? ""));
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

/** The beta update Promote tests and ships: one commit, with a group on every released platform. */
export function promotionCandidate(latest) {
  const missing = Object.keys(latest).filter((platform) => !latest[platform].group);
  if (missing.length) {
    return { ok: false, reason: `Nothing is published on beta for ${missing.join(", ")} yet.` };
  }
  const commits = new Set(Object.values(latest).map((update) => update.commit));
  if (commits.size > 1) {
    const each = Object.entries(latest).map(([p, u]) => `${p} ${u.commit.slice(0, 7)}`);
    return {
      ok: false,
      reason: `Beta runs different commits (${each.join(", ")}); run Phone beta again.`,
    };
  }
  const [commit] = commits;
  const groups = Object.fromEntries(
    Object.entries(latest).map(([p, u]) => [p, { group: u.group, runtime: u.runtime }]),
  );
  return { ok: true, commit, groups };
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
    groups: (platform, branch) =>
      platformGroups(
        json([
          "update:list",
          "--branch",
          branch,
          "--platform",
          platform,
          "--limit",
          "25",
          "--json",
          "--non-interactive",
        ]),
        platform,
      ),
    // update:view takes --json and no --non-interactive.
    view: (group) => json(["update:view", group, "--json"])[0],
    builds: (platform, profile, runtime) =>
      json([
        "build:list",
        "--platform",
        platform,
        "--build-profile",
        profile,
        "--runtime-version",
        runtime,
        "--limit",
        "10",
        "--json",
        "--non-interactive",
      ]),
    build: (platform, profile) =>
      call([
        "build",
        "--profile",
        profile,
        "--platform",
        platform,
        "--auto-submit",
        "--no-wait",
        "--non-interactive",
      ]),
    publish: (platform, branch, environment, message) =>
      call([
        "update",
        "--branch",
        branch,
        "--platform",
        platform,
        "--environment",
        environment,
        "--message",
        message,
        "--non-interactive",
      ]),
    republish: (platform, group, branch, message, rollout) =>
      call([
        "update:republish",
        "--group",
        group,
        "--destination-branch",
        branch,
        "--platform",
        platform,
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
    rollBackToEmbedded: (platform, branch, runtime, message) =>
      call([
        "update:roll-back-to-embedded",
        "--branch",
        branch,
        "--runtime-version",
        runtime,
        "--platform",
        platform,
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
  eas.view("g1");
  eas.finishRollout("g2");
  eas.revertRollout("g2", "Roll back production");
  for (const platform of PLATFORMS) {
    eas.groups(platform, "beta");
    eas.builds(platform, "beta", "r1");
    eas.build(platform, "beta");
    eas.build(platform, "production");
    eas.publish(platform, "beta", "preview", "feat(mobile): add reminders");
    eas.republish(platform, "g1", "production", "Promote abc1234", 10);
    eas.republish(platform, "g1", "production", "Roll back production");
    eas.rollBackToEmbedded(platform, "production", "r1", "Roll back production");
  }
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
export function createCommands(
  eas = createEas(),
  platforms = releasePlatforms(process.env.PHONE_PLATFORMS),
) {
  const latest = (platform, branch) => {
    const [group] = eas.groups(platform, branch);
    if (!group) return { group: "", runtime: "", rollout: "", commit: "" };
    return {
      group: group.group,
      runtime: group.runtimeVersion,
      rollout: group.rolloutPercentage ?? 100,
      commit: eas.view(group.group).gitCommitHash ?? "",
    };
  };

  return {
    ready() {
      const config = JSON.parse(readFileSync(join(APP, "app.json"), "utf8")).expo;
      const { ready, reason } = readiness({ token: process.env.EXPO_TOKEN, config });
      if (!ready) {
        console.log(`::notice title=Phone release skipped::${reason} docs/phone-release.md`);
      }
      return { ready, platforms: JSON.stringify(platforms) };
    },

    runtime(platform) {
      const cli = join(APP, "node_modules/expo-updates/bin/cli.js");
      const resolved = execFileSync(
        "node",
        [cli, "runtimeversion:resolve", "--platform", platform],
        {
          cwd: APP,
          encoding: "utf8",
        },
      );
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

    latest(branch, platform) {
      return latest(platform, branch);
    },

    // Promote ships one commit everywhere, so every released platform's beta must run it.
    candidate() {
      const result = promotionCandidate(
        Object.fromEntries(platforms.map((platform) => [platform, latest(platform, "beta")])),
      );
      if (!result.ok) throw new Error(result.reason);
      return { commit: result.commit, groups: JSON.stringify(result.groups) };
    },

    "has-build"(platform, profile, runtime) {
      return { build: hasLiveBuild(eas.builds(platform, profile, runtime)) };
    },

    build(platform, profile) {
      eas.build(platform, profile);
    },

    "build-missing"(profile, groups) {
      for (const [platform, { runtime }] of Object.entries(JSON.parse(groups))) {
        if (hasLiveBuild(eas.builds(platform, profile, runtime))) continue;
        eas.build(platform, profile);
      }
    },

    publish(platform, branch, environment, message) {
      eas.publish(platform, branch, environment, message);
    },

    // Every platform is checked before any is republished, so production never takes half a release.
    promote(commit, groups) {
      const planned = Object.entries(JSON.parse(groups));
      const checks = planned.map(([platform, { group }]) => {
        const check = promotionCheck({
          planned: group,
          beta: eas.groups(platform, "beta")[0],
          production: eas.groups(platform, "production"),
          commit,
        });
        if (!check.ok && !check.done) throw new Error(`${platform}: ${check.reason}`);
        return { platform, group, check };
      });
      let promoted = false;
      for (const { platform, group, check } of checks) {
        if (check.done) {
          console.log(`::notice title=Phone promote::${platform}: ${check.reason}`);
          continue;
        }
        eas.republish(platform, group, "production", promoteMessage(commit), 10);
        promoted = true;
      }
      return { promoted };
    },

    "finish-rollout"(branch, hours) {
      for (const platform of platforms) {
        const [group] = eas.groups(platform, branch);
        if (!group) {
          console.log(`Nothing is published on ${branch} for ${platform}.`);
          continue;
        }
        if (!rolloutDue(group, eas.view(group.group).createdAt, Date.now(), Number(hours))) {
          console.log(`No ${platform} rollout on ${branch} is due to finish.`);
          continue;
        }
        eas.finishRollout(group.group);
        console.log(`Rolled ${group.group} out to every ${platform} install on ${branch}.`);
      }
    },

    // A group names its own platform; without one, each chosen platform rolls back its newest update.
    rollback(branch, which, group) {
      const chosen = group
        ? [eas.view(group).platform]
        : which === "all"
          ? platforms
          : releasePlatforms(which);
      const message = `Roll back ${branch}`;
      let rolledBack = 0;
      for (const platform of chosen) {
        const plan = rollbackPlan(eas.groups(platform, branch), group);
        if (plan.action === "none") {
          console.log(`Nothing is published on ${branch} for ${platform}.`);
          continue;
        }
        if (plan.action === "revert-rollout") eas.revertRollout(plan.group, message);
        if (plan.action === "republish") eas.republish(platform, plan.group, branch, message);
        if (plan.action === "embedded") {
          eas.rollBackToEmbedded(platform, branch, plan.runtime, message);
        }
        console.log(`Rolled back ${platform} on ${branch}: ${JSON.stringify(plan)}`);
        rolledBack++;
      }
      if (!rolledBack) {
        throw new Error(`Nothing is published on ${branch}, so there is nothing to roll back.`);
      }
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
