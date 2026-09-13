/**
 * Client ID Metadata Documents that Lymi publishes for MCP clients that cannot publish their own.
 * Gemini CLI only knows dynamic client registration, which Lymi keeps off (ADR 0003).
 */

export const GEMINI_CLI_CLIENT_PATH = "/oauth/gemini-cli.json";

/** The loopback callback Gemini CLI listens on; a 127.0.0.1 redirect may use any port (RFC 8252 §7.3). */
export const GEMINI_CLI_REDIRECT_URI = "http://127.0.0.1/oauth/callback";

export function geminiCliClientMetadata(siteOrigin: string) {
  return {
    client_id: new URL(GEMINI_CLI_CLIENT_PATH, siteOrigin).toString(),
    client_name: "Gemini CLI",
    client_uri: new URL("/docs/mcp/gemini", siteOrigin).toString(),
    redirect_uris: [GEMINI_CLI_REDIRECT_URI],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };
}
