#!/usr/bin/env node

import { pathToFileURL } from "node:url";

function addCookies(jar, response) {
  for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(";", 1);
    const separator = pair.indexOf("=");
    if (separator > 0) jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader(jar) {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function manualFetch(url, jar, fetchImpl) {
  const response = await fetchImpl(url, {
    redirect: "manual",
    headers: jar.size ? { cookie: cookieHeader(jar) } : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  addCookies(jar, response);
  return response;
}

// A newly created Worker can answer 404 or drop the connection before a given route is live.
async function settledFetch(url, jar, { attempts, retryDelayMs, fetchImpl, onRetry }) {
  const hop = `GET ${url.pathname}`;
  for (let attempt = 1; ; attempt += 1) {
    let reason;
    try {
      const response = await manualFetch(url, jar, fetchImpl);
      if (response.status !== 404) return response;
      reason = "HTTP 404";
    } catch (error) {
      reason = error.message;
    }
    if (attempt === attempts) {
      throw new Error(`${hop} was not live after ${attempts} attempt(s); last response: ${reason}`);
    }
    onRetry(hop, reason, attempt, attempts);
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
}

export async function checkAppPreview(
  entryUrl,
  { attempts = 1, retryDelayMs = 5_000, fetchImpl = fetch, onRetry = () => {} } = {},
) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new Error("app preview check attempts must be a positive integer");
  }
  const entry = new URL(entryUrl);
  if (
    entry.protocol !== "https:" ||
    entry.pathname !== "/_preview" ||
    !entry.searchParams.has("key")
  ) {
    throw new Error("PREVIEW_ENTRY_URL is not a protected app preview entry link");
  }

  const jar = new Map();
  const settling = { attempts, retryDelayMs, fetchImpl, onRetry };
  const opened = await settledFetch(entry, jar, settling);
  if (opened.status !== 303 || !opened.headers.get("location")) {
    throw new Error(`preview entry returned HTTP ${opened.status} instead of a sign-in redirect`);
  }
  if (!jar.has("__Host-lymi-preview")) {
    throw new Error("preview entry did not set the access cookie");
  }

  const signed = await settledFetch(new URL(opened.headers.get("location"), entry), jar, settling);
  if (signed.status !== 303 || !signed.headers.get("location")) {
    throw new Error(`preview persona sign-in returned HTTP ${signed.status}`);
  }

  const me = await settledFetch(new URL("/api/me", entry), jar, settling);
  const learner = await me.json();
  if (!me.ok || !learner.email?.endsWith("@lymi.local")) {
    throw new Error("preview persona session was not available after sign-in");
  }

  const decks = await settledFetch(new URL("/api/decks", entry), jar, settling);
  const data = await decks.json();
  if (!decks.ok || !Array.isArray(data) || data.length === 0) {
    throw new Error("preview persona did not receive seeded learning data");
  }

  return { learner, decks: data.length, destination: signed.headers.get("location") };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const entryUrl = process.env.PREVIEW_ENTRY_URL;
  if (!entryUrl) throw new Error("PREVIEW_ENTRY_URL is required");
  try {
    const result = await checkAppPreview(entryUrl, {
      attempts: 10,
      onRetry(hop, reason, attempt, total) {
        process.stdout.write(
          `App preview ${hop} not live (${attempt}/${total}): ${reason}; retrying in 5 seconds.\n`,
        );
      },
    });
    process.stdout.write(
      `App preview sign-in is healthy: ${result.decks} seeded deck(s), destination ${result.destination}.\n`,
    );
  } catch (error) {
    process.stderr.write(`App preview sign-in check failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
