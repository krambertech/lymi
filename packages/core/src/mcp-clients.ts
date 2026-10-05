/**
 * Client ID Metadata Documents that Lymi publishes for MCP clients that cannot publish their own.
 * Gemini CLI and Cursor accept a client ID in their config; without one they try dynamic
 * registration, which Lymi keeps off (ADR 0027).
 */

export const GEMINI_CLI_CLIENT_PATH = "/oauth/gemini-cli.json";

/** A 127.0.0.1 redirect matches any port (RFC 8252 §7.3), so learners can pick a free one. */
const GEMINI_CLI_REDIRECT_URI = "http://127.0.0.1/oauth/callback";

export function geminiCliClientMetadata(siteOrigin: string) {
  return {
    client_id: new URL(GEMINI_CLI_CLIENT_PATH, siteOrigin).toString(),
    client_name: "Gemini CLI",
    client_uri: new URL("/docs/mcp/gemini", siteOrigin).toString(),
    application_type: "native",
    redirect_uris: [GEMINI_CLI_REDIRECT_URI],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };
}

export const CURSOR_CLIENT_PATH = "/oauth/cursor.json";

/** Cursor's fixed redirects: its web and cloud agents, then the desktop app's local listener. */
const CURSOR_REDIRECT_URIS = [
  "https://www.cursor.com/agents/mcp/oauth/callback",
  "http://localhost:8787/callback",
];

export function cursorClientMetadata(siteOrigin: string) {
  return {
    client_id: new URL(CURSOR_CLIENT_PATH, siteOrigin).toString(),
    client_name: "Cursor",
    client_uri: new URL("/docs/mcp/cursor", siteOrigin).toString(),
    // Native, because a web client may not redirect to localhost.
    application_type: "native",
    redirect_uris: CURSOR_REDIRECT_URIS,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  };
}
