#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { pathToFileURL } from "node:url";

export const MEDIA_BRANCH = "pr-media";
const IMAGE_TYPES = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const VIDEO_TYPES = new Set([".webm", ".mp4", ".mov"]);
// GitHub stops proxying images above this size, so the reference renders as a broken image.
const IMAGE_LIMIT = 10 * 1024 * 1024;
const PUSH_ATTEMPTS = 3;

const USAGE = `Usage: pnpm pr:media [--body <file>] [--dry-run] <file[#alt text]>...

Pushes images and videos to the ${MEDIA_BRANCH} branch and prints commit-pinned links.
With --body, rewrites references such as ![After](./deck-after.png) in that file in place.
Videos become an inline GIF that links to the full recording.`;

export function parseArgs(argv) {
  const options = { body: undefined, dryRun: false, files: [] };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { ...options, help: true };
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--body") {
      options.body = argv[++index];
      if (!options.body) throw new Error("--body needs a file");
    } else if (arg.startsWith("-")) throw new Error(`Unknown option ${arg}`);
    else {
      const hash = arg.indexOf("#");
      const path = hash === -1 ? arg : arg.slice(0, hash);
      const alt = hash === -1 ? undefined : arg.slice(hash + 1);
      options.files.push({ path, alt });
    }
  }
  if (options.files.length === 0) throw new Error("Name at least one image or video");
  return options;
}

export function mediaKind(path) {
  const type = extname(path).toLowerCase();
  if (IMAGE_TYPES.has(type)) return "image";
  if (VIDEO_TYPES.has(type)) return "video";
  throw new Error(`${basename(path)} is not an image or video GitHub can show`);
}

export function mediaFolder(branch) {
  const folder = branch
    .replace(/[^A-Za-z0-9._/-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^[/.-]+|[/.-]+$/g, "");
  if (!folder) throw new Error("Cannot name a media folder without a branch; check out a branch");
  return folder;
}

export function parseRepository(remoteUrl) {
  const match = remoteUrl.trim().match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (!match) throw new Error(`origin is not a GitHub repository: ${remoteUrl.trim()}`);
  return `${match[1]}/${match[2]}`;
}

export function mediaUrl(repository, commit, path) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${repository}/blob/${commit}/${encoded}?raw=true`;
}

export function snippet(upload) {
  if (upload.kind === "video") {
    return upload.previewUrl
      ? `[![${upload.alt}](${upload.previewUrl})](${upload.url})`
      : `[${upload.alt}](${upload.url})`;
  }
  return `![${upload.alt}](${upload.url})`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Matches a local reference to the file in Markdown or an <img> tag, with or without ./ or a folder.
function referencePattern(name) {
  const local = `(?:\\.\\/)?(?:[^\\s()"'<>:]*\\/)?${escapeRegExp(name)}`;
  return new RegExp(`(!?)\\[([^\\]]*)\\]\\(<?${local}>?\\)|(src=["'])${local}(["'])`, "g");
}

export function rewriteBody(body, uploads) {
  const unreferenced = [];
  let next = body;
  for (const upload of uploads) {
    let found = false;
    next = next.replace(referencePattern(upload.name), (_match, _bang, alt, srcOpen, srcClose) => {
      found = true;
      if (srcOpen) return `${srcOpen}${upload.previewUrl ?? upload.url}${srcClose}`;
      return snippet({ ...upload, alt: alt || upload.alt });
    });
    if (!found) unreferenced.push(upload);
  }
  const unresolved = [
    ...next.matchAll(/\]\((?:\.\/)?[^)\s:]+\.(?:png|jpe?g|gif|webp|svg|webm|mp4|mov)\)/gi),
  ]
    .map((match) => match[0].slice(2, -1))
    .filter((target) => !target.startsWith("http"));
  return { body: next, unreferenced, unresolved };
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function toGif(video, directory) {
  const gif = join(directory, `${basename(video, extname(video))}.gif`);
  try {
    execFileSync(
      "ffmpeg",
      [
        "-loglevel",
        "error",
        "-y",
        "-i",
        video,
        "-vf",
        "fps=12,scale='min(960,iw)':-2:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse",
        gif,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
  } catch {
    console.warn(`ffmpeg could not make a preview of ${basename(video)}; it will be a plain link`);
    return undefined;
  }
  if (statSync(gif).size > IMAGE_LIMIT) {
    console.warn(`The preview of ${basename(video)} is over 10 MB; it will be a plain link`);
    return undefined;
  }
  return gif;
}

function prepare(files, folder, directory) {
  const entries = [];
  const uploads = files.map(({ path, alt }) => {
    if (!existsSync(path)) throw new Error(`${path} does not exist`);
    const kind = mediaKind(path);
    const name = basename(path);
    const size = statSync(path).size;
    if (size === 0) throw new Error(`${name} is empty`);
    if (kind === "image" && size > IMAGE_LIMIT)
      throw new Error(`${name} is over 10 MB, which GitHub will not show`);
    const upload = {
      name,
      kind,
      alt: alt ?? basename(name, extname(name)),
      path: `${folder}/${name}`,
    };
    entries.push({ file: path, path: upload.path });
    if (kind === "video") {
      const gif = toGif(path, directory);
      if (gif) {
        upload.previewPath = `${folder}/${basename(gif)}`;
        entries.push({ file: gif, path: upload.previewPath });
      }
    }
    return upload;
  });
  const names = new Set(entries.map((entry) => entry.path));
  if (names.size !== entries.length) throw new Error("Two files would share a name; rename one");
  return { uploads, entries };
}

function commitMedia(entries, folder, directory) {
  const index = join(directory, "index");
  const env = { ...process.env, GIT_INDEX_FILE: index };
  let parent;
  try {
    git([
      "fetch",
      "--quiet",
      "origin",
      `+refs/heads/${MEDIA_BRANCH}:refs/remotes/origin/${MEDIA_BRANCH}`,
    ]);
    parent = git(["rev-parse", `refs/remotes/origin/${MEDIA_BRANCH}`]);
  } catch {
    parent = undefined;
  }
  git(parent ? ["read-tree", parent] : ["read-tree", "--empty"], { env });
  for (const entry of entries) {
    const blob = git(["hash-object", "-w", entry.file]);
    git(["update-index", "--add", "--cacheinfo", `100644,${blob},${entry.path}`], { env });
  }
  const tree = git(["write-tree"], { env });
  const message = `Add pull request media for ${folder}`;
  return git(["commit-tree", tree, ...(parent ? ["-p", parent] : []), "-m", message]);
}

function publish(entries, folder, directory, dryRun) {
  for (let attempt = 1; ; attempt++) {
    const commit = commitMedia(entries, folder, directory);
    if (dryRun) return commit;
    try {
      git(["push", "--quiet", "origin", `${commit}:refs/heads/${MEDIA_BRANCH}`]);
      return commit;
    } catch (error) {
      const rejected = /rejected|non-fast-forward|fetch first/i.test(String(error.stderr));
      if (!rejected || attempt === PUSH_ATTEMPTS) {
        throw new Error(`Pushing to ${MEDIA_BRANCH} failed: ${String(error.stderr).trim()}`);
      }
    }
  }
}

function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(USAGE);
    return;
  }
  const repository = parseRepository(git(["remote", "get-url", "origin"]));
  const folder = mediaFolder(git(["branch", "--show-current"]));
  const directory = mkdtempSync(join(tmpdir(), "pr-media-"));
  try {
    const { uploads, entries } = prepare(options.files, folder, directory);
    const commit = publish(entries, folder, directory, options.dryRun);
    for (const upload of uploads) {
      upload.url = mediaUrl(repository, commit, upload.path);
      if (upload.previewPath) upload.previewUrl = mediaUrl(repository, commit, upload.previewPath);
    }

    if (options.body) {
      const result = rewriteBody(readFileSync(options.body, "utf8"), uploads);
      writeFileSync(options.body, result.body);
      console.log(
        `Rewrote ${uploads.length - result.unreferenced.length} reference(s) in ${options.body}`,
      );
      for (const upload of result.unreferenced) {
        console.log(`Not referenced in the body, add it yourself:\n${snippet(upload)}`);
      }
      if (result.unresolved.length > 0) {
        throw new Error(`The body still points at local files: ${result.unresolved.join(", ")}`);
      }
    } else {
      for (const upload of uploads) console.log(snippet(upload));
    }
    if (options.dryRun) console.log(`Dry run: nothing was pushed to ${MEDIA_BRANCH}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
