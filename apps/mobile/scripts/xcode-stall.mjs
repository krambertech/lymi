// Xcode's build service reads its compiler probes only after they exit. When the Mac's pipe memory
// is used up, pipes stop growing past 16 KB, the probes block writing, and the build waits forever.
// pnpm dev-client and the verify-phone stack watch for it, since the build log keeps saying it is compiling.
import { execFileSync, spawnSync } from "node:child_process";

/** Every process below `rootPid`, however deep, since a build may sit under Stim or pnpm. */
export function descendants(rootPid) {
  const rows = ps(["-A", "-o", "pid=,ppid=,etime="]).map(([pid, ppid, etime]) => ({
    pid,
    ppid,
    etime,
  }));
  const tree = new Set([String(rootPid)]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const row of rows) {
      if (tree.has(row.ppid) && !tree.has(row.pid)) {
        tree.add(row.pid);
        grew = true;
      }
    }
  }
  return rows.filter((row) => row.pid !== String(rootPid) && tree.has(row.pid));
}

/** Whether a compiler probe under `rootPid` has been blocked for a minute. A failed check is a no. */
export function stalledProbes(rootPid) {
  try {
    const slow = descendants(rootPid).filter((row) => minutes(row.etime) >= 1);
    if (slow.length === 0) return false;
    // Full command lines only for the few candidates: all of them together can exceed a megabyte.
    return ps(["-o", "command=", "-p", slow.map((row) => row.pid).join(",")]).some((command) =>
      command.join(" ").includes("clang -v -E -dM"),
    );
  } catch (error) {
    console.warn(`! Skipped a stall check: ${error.message}`);
    return false;
  }
}

/** The three processes holding the most pipes, such as "Logitech Presentation (860)". */
export function pipeHolders() {
  const lsof = spawnSync("lsof", ["-n", "-F", "pct"], { encoding: "utf8", maxBuffer: 256 << 20 });
  const counts = new Map();
  let name = "";
  for (const line of lsof.stdout.split("\n")) {
    if (line.startsWith("c")) name = line.slice(1);
    if (line === "tPIPE") counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([command, count]) => `${command} (${count})`)
    .join(", ");
}

function minutes(etime) {
  const [clock, days = "0"] = etime.split("-").reverse();
  const [s = 0, m = 0, h = 0] = clock.split(":").reverse().map(Number);
  return Number(days) * 1440 + h * 60 + m + s / 60;
}

function ps(args) {
  return execFileSync("ps", args, { encoding: "utf8", maxBuffer: 64 << 20 })
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim().split(/\s+/));
}
