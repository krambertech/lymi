import { Code } from "../Code";
import { ORIGIN } from "../origin";
import { H2, Lead, NextLinks } from "../Prose";

export function McpChatgpt() {
  return (
    <div className="doc-prose">
      <Lead>
        ChatGPT reaches Lymi through a custom MCP plugin, and the Codex CLI through its MCP config.
        Both sign in with OAuth; neither takes an API key.
      </Lead>

      <Code lang="text" label="MCP server URL" code={`${ORIGIN}/mcp`} />

      <p>
        Once connected, ask it to add the cards from a lesson, list what is due, or find a card.
        What it can and cannot do is on <a href="/docs/mcp">Connect an assistant</a>.
      </p>

      <H2>ChatGPT</H2>
      <p>
        Open <strong>Plugins</strong> on the web, choose the plus button, then{" "}
        <strong>Add custom MCP server</strong>. Name it Lymi and paste the server URL above. Choose{" "}
        <strong>OAuth</strong> authentication and{" "}
        <strong>Client ID Metadata Documents (CIMD)</strong> when asked how the client identifies
        itself. Lymi does not use dynamic client registration.
      </p>
      <p>
        Review the connection warning and choose <strong>Create as a plugin</strong>. Complete
        Lymi’s sign-in and approve the access you want to grant. Install the resulting plugin, then
        select it with <strong>@</strong> in a new chat.
      </p>
      <p>
        Account and workspace permissions can affect whether this option is available. If your
        interface still uses Apps, follow{" "}
        <a href="https://developers.openai.com/api/docs/guides/custom-mcp-server">
          OpenAI’s current connection guide
        </a>{" "}
        for your account.
      </p>

      <H2>Codex CLI</H2>
      <p>Add the server, then sign in. Codex handles the OAuth round trip for you.</p>
      <Code
        lang="bash"
        label="Terminal"
        code={`codex mcp add lymi --url ${ORIGIN}/mcp
codex mcp login lymi`}
      />
      <p>
        That writes an entry into <code>~/.codex/config.toml</code>. You can also write it yourself:
      </p>
      <Code
        lang="text"
        label="~/.codex/config.toml"
        code={`[mcp_servers.lymi]
url = "${ORIGIN}/mcp"`}
      />
      <p>
        Leave <code>bearer_token_env_var</code> out. That field is for servers that take a static
        token, and Lymi does not: it wants the OAuth flow, so that every grant is one you approved
        and can revoke.
      </p>

      <H2>When it does not connect</H2>
      <ul>
        <li>
          <strong>Sign-in is refused.</strong> An account made with an email address and a password
          cannot sign in until the address is confirmed. Open the link in the confirmation email,
          then connect again.
        </li>
        <li>
          <strong>Registration fails.</strong> Lymi has no dynamic client registration, by design.
          ChatGPT and current Codex use a Client ID Metadata Document instead. If an older Codex
          tries to register, update it, or run{" "}
          <code>codex mcp login lymi --oauth-client-registration cimd</code>.
        </li>
        <li>
          <strong>Writes are refused.</strong> The connection was granted read only. Reconnect and
          leave write ticked on the consent screen.
        </li>
      </ul>

      <NextLinks
        items={[
          {
            to: "/docs/mcp/gemini",
            title: "Gemini CLI",
            blurb: "The same server, from Google's command line.",
          },
        ]}
      />
    </div>
  );
}
