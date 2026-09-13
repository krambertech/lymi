import { Code } from "../Code";
import { ORIGIN } from "../origin";
import { H2, Lead, NextLinks, Steps, StepTitle } from "../Prose";

export function McpChatgpt() {
  return (
    <div className="doc-prose">
      <Lead>
        ChatGPT reaches Lymi through a custom connector, and the Codex CLI through its MCP config.
        Both sign in with OAuth; neither takes an API key.
      </Lead>

      <Code lang="text" label="MCP server URL" code={`${ORIGIN}/mcp`} />

      <p>
        Once connected, ask it to add the cards from a lesson, list what is due, or find a card.
        What it can and cannot do is on <a href="/docs/mcp">Connect an assistant</a>.
      </p>

      <H2>ChatGPT</H2>
      <p>
        Custom connectors need developer mode, which OpenAI offers on the web for Plus, Pro,
        Business, Enterprise and Education. On a Business, Enterprise or Education workspace an
        admin has to allow developer mode first.
      </p>
      <p>
        Developer mode reads and writes. ChatGPT asks you to confirm each write, such as adding
        cards or archiving a deck, before it runs. Reads run without asking.
      </p>
      <Steps>
        <div>
          <StepTitle>Turn on developer mode</StepTitle>
          <p>
            In ChatGPT on the web, open <strong>Settings → Apps → Advanced settings</strong> and
            switch <strong>Developer mode</strong> on.
          </p>
        </div>
        <div>
          <StepTitle>Create the connector</StepTitle>
          <p>
            Go to <strong>Settings → Connectors</strong> and choose <strong>Create</strong>. Give it
            a name, a short description, and the MCP server URL above. Leave the authentication
            fields alone: Lymi advertises OAuth through the protocol.
          </p>
        </div>
        <div>
          <StepTitle>Sign in</StepTitle>
          <p>
            ChatGPT sends you to Lymi. Sign in with the account your Lymi uses and approve the
            connection, unticking <strong>write</strong> if you want it read-only.
          </p>
        </div>
        <div>
          <StepTitle>Use it in a chat</StepTitle>
          <p>
            Enable the connector for the conversation from the composer, the same way as any other.
          </p>
        </div>
      </Steps>

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
          <strong>Sign-in is refused.</strong> Lymi is private. Only the accounts on its allowlist
          can sign in, whatever the OpenAI account is.
        </li>
        <li>
          <strong>Registration fails.</strong> Lymi has no dynamic client registration, by design.
          ChatGPT and current Codex identify themselves with a Client ID Metadata Document instead.
          If an older Codex tries to register, update it, or run{" "}
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
