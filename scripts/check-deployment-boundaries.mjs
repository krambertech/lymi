#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const productDist = resolve(root, "apps/web/dist");
const siteDist = resolve(root, "apps/site/dist");

function filesBelow(directory) {
  if (!existsSync(directory)) throw new Error(`Build output is missing: ${directory}`);
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

function relativeTo(directory, path) {
  return path.slice(directory.length + 1);
}

const forbiddenSiteAssets =
  /(^|\/)(sw\.js|registerSW\.js|push-sw\.js|manifest\.webmanifest|workbox-[^/]+)$/;
const siteAssets = filesBelow(siteDist);
const leakedPwa = siteAssets
  .map((path) => relativeTo(siteDist, path))
  .find((path) => forbiddenSiteAssets.test(path));
if (leakedPwa) throw new Error(`Public-site build exposes a product PWA asset: ${leakedPwa}`);

const publicMarkers = [
  "Lymi · Keep what you learn",
  "Every route the Lymi API serves, read from the running server.",
  "Join the private beta",
];
for (const path of filesBelow(productDist)) {
  if (!/\.(?:css|html|js)$/.test(path) || statSync(path).size > 10_000_000) continue;
  const source = readFileSync(path, "utf8");
  const marker = publicMarkers.find((value) => source.includes(value));
  if (marker) {
    throw new Error(
      `Product build still contains public-site content (${marker}) in ${relativeTo(productDist, path)}`,
    );
  }
}

process.stdout.write(
  "Deployment boundary check passed: site has no PWA assets; product has no public pages.\n",
);
