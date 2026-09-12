import { Code } from "../Code";
import { ORIGIN } from "../origin";
import { H2, Lead, NextLinks, Steps, StepTitle } from "../Prose";

export function McpClaude() {
  return (
    <div className="doc-prose">
      <Lead>
        Claude connects to Lymi as a custom connector on the web and in the desktop app, and as a
        remote MCP server in Claude Code. All three use the same URL and the same sign-in.
      </Lead>

      <Code lang="text" label="MCP server URL" code={`${ORIGIN}/mcp`} />

      <p>
        Once connected, ask Claude to add the words from a lesson, list what is due, or find a card.
        What it can and cannot do is on <a href="/docs/mcp">Connect an assistant</a>.
      </p>

      <H2>Claude Desktop and claude.ai</H2>
      <p>Custom connectors live in the same place in the app and on the web.</p>
      <Steps>
        <div>
          <StepTitle>Open the connector list</StepTitle>
          <p>
            Go to <strong>Settings → Connectors</strong>. On a Team or Enterprise plan an owner adds
            it once under <strong>Organization settings → Connectors</strong>, and everyone else
            then connects to it.
          </p>
        </div>
        <div>
          <StepTitle>Add a custom connector</StepTitle>
          <p>
            Choose <strong>Add custom connector</strong> and paste the URL above. Leave the advanced
            OAuth fields empty: Lymi tells Claude where to sign in through the protocol, so there is
            no client id or secret to fill in.
          </p>
        </div>
        <div>
          <StepTitle>Sign in</StepTitle>
          <p>
            Claude opens Lymi in your browser. Sign in with the Google account your Lymi uses, then
            approve the connection. Untick <strong>write</strong> on the consent screen if you want
            Claude to read your decks and nothing more.
          </p>
        </div>
        <div>
          <StepTitle>Turn it on in a conversation</StepTitle>
          <p>
            Connectors are per conversation. Click <strong>+</strong> in the composer, choose{" "}
            <strong>Connectors</strong>, and enable Lymi.
          </p>
        </div>
      </Steps>

      <H2>Claude Code</H2>
      <p>Add the server once, then authenticate from inside a session.</p>
      <Code
        lang="bash"
        label="Terminal"
        code={`claude mcp add --transport http lymi ${ORIGIN}/mcp`}
      />
      <p>
        Start Claude Code and run <code>/mcp</code>. It lists Lymi as needing authentication and
        opens the browser for you. From v2.1.186 you can do the same without the slash command:
      </p>
      <Code
        lang="bash"
        label="Terminal"
        code={`claude mcp login lymi     # sign in
claude mcp logout lymi    # forget the tokens`}
      />
      <p>
        Tokens are stored by Claude Code and refreshed on their own. To disconnect for good, revoke
        the grant in Lymi as well as running <code>logout</code>.
      </p>

      <H2>When it does not connect</H2>
      <ul>
        <li>
          <strong>Sign-in is refused.</strong> Lymi is private. Only the accounts on its allowlist
          can sign in, whatever the Claude account is.
        </li>
        <li>
          <strong>The connector never gets past the URL.</strong> Lymi has no dynamic client
          registration, by design. A client that cannot use a Client ID Metadata Document has no way
          to identify itself here.
        </li>
        <li>
          <strong>Claude says it can only read.</strong> The token was granted read only. Reconnect
          and leave write ticked at the consent screen.
        </li>
      </ul>

      <NextLinks
        items={[
          {
            to: "/docs/mcp/chatgpt",
            title: "ChatGPT and Codex",
            blurb: "The same server, from OpenAI's clients.",
          },
        ]}
      />
    </div>
  );
}
