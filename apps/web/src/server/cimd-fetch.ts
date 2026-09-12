import { isPublicRoutableHost } from "@better-auth/core/utils/host";
import type { ClientMetadataResourceFetch } from "@better-auth/oauth-provider";

/**
 * Fetches a Client ID Metadata Document for the CIMD plugin, on Workers.
 *
 * The plugin wants a transport that resolves DNS once, rejects special-use addresses and
 * never follows redirects. Workers cannot pin a DNS answer, but the platform already refuses
 * outbound connections to private, loopback and link-local ranges, so a hostname that
 * rebinds to one of them fails at the network edge. What is left for this function: HTTPS
 * only, GET or HEAD only, no literal special-use addresses, and redirects handed back
 * unfollowed so the plugin can reject them.
 */
export const fetchClientMetadataResource: ClientMetadataResourceFetch = async (input, init) => {
  const request = new Request(input, { ...init, redirect: "manual" });
  const url = new URL(request.url);
  if (url.protocol !== "https:") {
    throw new TypeError("Client metadata documents must be served over HTTPS");
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    throw new TypeError("Client metadata documents are fetched with GET or HEAD only");
  }
  if (!isPublicRoutableHost(url.hostname)) {
    throw new TypeError("Client metadata documents must live on a public host");
  }
  return fetch(request);
};
