#!/usr/bin/env node

import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function findPreview(output, { workerName, alias }) {
  const uploads = output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`Wrangler output line ${index + 1} is not valid JSON`);
      }
    })
    .filter((entry) => entry.type === "version-upload" && entry.worker_name === workerName);

  const upload = uploads.at(-1);
  if (!upload) throw new Error(`Wrangler did not report a version upload for ${workerName}`);
  if (!upload.version_id) throw new Error(`Wrangler did not report an uploaded version ID`);
  if (!upload.preview_alias_url) {
    throw new Error(`Wrangler uploaded ${workerName} without the requested stable preview alias`);
  }

  const url = new URL(upload.preview_alias_url);
  const expectedPrefix = `${alias}-${workerName}.`;
  if (url.protocol !== "https:" || !url.hostname.startsWith(expectedPrefix)) {
    throw new Error(`Wrangler returned an unexpected preview alias URL for ${workerName}`);
  }

  return { url: url.href.replace(/\/$/, ""), versionId: upload.version_id };
}

export function findPreviewUrl(output, options) {
  return findPreview(output, options).url;
}

function writeGitHubResult({ url, versionId }, alias, kind = "site") {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\nversion_id=${versionId}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const app = kind === "app";
    const openUrl = app ? process.env.APP_PREVIEW_ENTRY_URL : url;
    if (app && !openUrl) throw new Error("APP_PREVIEW_ENTRY_URL is required for an app preview");
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      [
        app ? "## Product-app preview" : "## Public-site preview",
        "",
        `[Open the stable ${alias} preview](${openUrl})`,
        "",
        app
          ? "The protected link signs into isolated synthetic data. It follows this pull request across new commits and cannot reach production bindings."
          : "The link follows this pull request across new commits and points to its latest successful preview upload.",
        "",
      ].join("\n"),
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [outputPath, workerName, alias, kind = "site"] = process.argv.slice(2);
  if (!outputPath || !workerName || !alias) {
    throw new Error("Usage: preview-url.mjs <wrangler-output> <worker-name> <alias>");
  }

  const preview = findPreview(readFileSync(outputPath, "utf8"), { workerName, alias });
  writeGitHubResult(preview, alias, kind);
  process.stdout.write(
    `Stable ${kind === "app" ? "app" : "public-site"} preview: ${preview.url}\n`,
  );
}
