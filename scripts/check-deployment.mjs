#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export function validateHealth(payload, expectedName = "lymi-product", expectedTag) {
  if (payload?.ok !== true || payload.name !== expectedName) {
    throw new Error("the endpoint did not identify a healthy Lymi deployment");
  }
  if (!payload.version?.id || !payload.version?.deployedAt) {
    throw new Error("the endpoint did not report deployment version metadata");
  }
  if (expectedTag && payload.version.tag !== expectedTag) {
    throw new Error("the endpoint did not report the expected commit tag");
  }
  return payload;
}

export async function checkDeployment(url, expectedName, expectedTag) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`the health endpoint returned HTTP ${response.status}`);
  return validateHealth(await response.json(), expectedName, expectedTag);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.argv[2] ?? "https://my.lymi.app/api/health";
  const expectedName = process.argv[3] ?? "lymi-product";
  const expectedTag = process.argv[4];
  try {
    const health = await checkDeployment(url, expectedName, expectedTag);
    const tag = health.version.tag ? `, tag ${health.version.tag}` : "";
    process.stdout.write(
      `Healthy Lymi deployment: version ${health.version.id}${tag}, deployed ${health.version.deployedAt}\n`,
    );
  } catch (error) {
    process.stderr.write(`Deployment health check failed for ${url}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
