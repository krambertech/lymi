#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export function validateHealth(payload, expectedName = "lymi-product", expectedVersionId) {
  if (payload?.ok !== true || payload.name !== expectedName) {
    throw new Error("the endpoint did not identify a healthy Lymi deployment");
  }
  if (!payload.version?.id || !payload.version?.deployedAt) {
    throw new Error("the endpoint did not report deployment version metadata");
  }
  if (expectedVersionId && payload.version.id !== expectedVersionId) {
    throw new Error("the endpoint did not report the expected Worker version");
  }
  return payload;
}

export async function checkDeployment(
  url,
  expectedName,
  expectedVersionId,
  { attempts = 1, retryDelayMs = 5_000, fetchImpl = fetch, onRetry = () => {} } = {},
) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error("deployment health check attempts must be a positive integer");
  }
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`the health endpoint returned HTTP ${response.status}`);
      return validateHealth(await response.json(), expectedName, expectedVersionId);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      onRetry(error, attempt, attempts);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  throw lastError;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.argv[2] ?? "https://my.lymi.app/api/health";
  const expectedName = process.argv[3] ?? "lymi-product";
  const expectedVersionId = process.argv[4];
  const attempts = Number(process.argv[5] ?? "1");
  try {
    const health = await checkDeployment(url, expectedName, expectedVersionId, {
      attempts,
      onRetry(error, attempt, total) {
        process.stdout.write(
          `Preview alias not ready (${attempt}/${total}): ${error.message}; retrying in 5 seconds.\n`,
        );
      },
    });
    const tag = health.version.tag ? `, tag ${health.version.tag}` : "";
    process.stdout.write(
      `Healthy Lymi deployment: version ${health.version.id}${tag}, deployed ${health.version.deployedAt}\n`,
    );
  } catch (error) {
    process.stderr.write(`Deployment health check failed for ${url}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
