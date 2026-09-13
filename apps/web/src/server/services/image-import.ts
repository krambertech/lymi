import { isPublicRoutableHost } from "@better-auth/core/utils/host";
import { IMAGE_LIMITS } from "@lymi/core";
import { ServiceError } from "./context";
import { readAtMost } from "./images";

export type Fetcher = (request: Request) => Promise<Response>;

const IMPORT_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

/** Fetch a picture from a public link once, rechecking every redirect and never repeating the URL in an error; the rules are in docs/data-model.md. */
export async function fetchRemoteImage(
  link: string,
  fetcher: Fetcher = (request) => fetch(request),
): Promise<{ bytes: Uint8Array; host: string }> {
  const signal = AbortSignal.timeout(IMPORT_TIMEOUT_MS);
  let url = publicUrl(link);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const response = await fetcher(
        new Request(url, {
          redirect: "manual",
          signal,
          headers: {
            accept: "image/webp,image/png,image/jpeg,image/gif",
            "user-agent": "Lymi picture import (+https://lymi.app)",
          },
        }),
      );
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel();
        url = publicUrl(new URL(location, url).href);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw invalid("That link did not return a picture.");
      }
      if (Number(response.headers.get("content-length")) > IMAGE_LIMITS.maxBytes) {
        await response.body?.cancel();
        throw tooLarge();
      }
      const bytes = await readAtMost(response.body, IMAGE_LIMITS.maxBytes);
      if (!bytes) throw tooLarge();
      if (bytes.byteLength === 0) throw invalid("That link did not return a picture.");
      return { bytes, host: url.hostname };
    }
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw invalid("That link could not be reached.");
  }
  throw invalid("That link redirects too many times.");
}

function publicUrl(link: string): URL {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    throw invalid("Use a public http or https link to a picture.");
  }
  const defaultPort = url.port === "" || url.port === "80" || url.port === "443";
  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    !defaultPort ||
    !isPublicRoutableHost(url.hostname)
  ) {
    throw invalid("Use a public http or https link to a picture.");
  }
  return url;
}

function invalid(message: string) {
  return new ServiceError("invalid", message);
}

function tooLarge() {
  return invalid("That image is too large. Use one under 10 MB and 12,000 pixels on a side.");
}
