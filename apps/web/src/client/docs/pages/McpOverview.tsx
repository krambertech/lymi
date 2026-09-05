import { Code } from "../Code";
import { ORIGIN } from "../origin";
import { Defs, H2, Lead, NextLinks, Note, Steps, StepTitle } from "../Prose";

export function McpOverview() {
  return (
    <div className="doc-prose">
      <Lead>
        Lymi speaks the Model Context Protocol, so an assistant can work with your decks inside a
        conversation. It signs in as you, over OAuth, and never sees an API key.
      </Lead>

      <Note tone="careful" title="The tools are not there yet">
        The endpoint, the sign-in and the consent screen all work today. The tools an assistant
        would call — list decks, search cards, add cards — land in the next pass. Connect now if you
        want the sign-in ready; there is nothing for an assistant to do until then.
      </Note>

      <H2>One endpoint</H2>
      <Code lang="text" label="MCP server URL" code={`${ORIGIN}/mcp`} />
      <p>
        It is a streamable HTTP endpoint. There is no local process to install, no npx command and
        no config file holding a secret.
      </p>

      <H2>How signing in works</H2>
      <Steps>
        <div>
          <StepTitle>The assistant asks, and is turned away</StepTitle>
          <p>
            Its first request has no token, so Lymi answers <code>401</code> with a{" "}
            <code>WWW-Authenticate</code> header naming where to go next. That header is the whole
            handshake: nothing is configured by hand.
          </p>
        </div>
        <div>
          <StepTitle>It finds the authorization server</StepTitle>
          <p>
            The header points at <code>/.well-known/oauth-protected-resource/mcp</code>, which names
            Lymi’s own authorization server. Lymi is both the resource and the issuer, so there is
            no third party in the middle.
          </p>
        </div>
        <div>
          <StepTitle>You sign in and choose</StepTitle>
          <p>
            Your browser opens on Lymi’s sign-in, then on a consent screen naming the assistant and
            what it is asking for. You can untick write before you agree. Whatever you leave ticked
            is what the token carries.
          </p>
        </div>
        <div>
          <StepTitle>The assistant gets a token</StepTitle>
          <p>
            Bound to <code>{ORIGIN}/mcp</code> and to the scopes you approved. With{" "}
            <code>offline_access</code> it also gets a refresh token, so you are not asked again
            every hour.
          </p>
        </div>
      </Steps>

      <H2>Scopes</H2>
      <Defs
        items={[
          { term: <code>read</code>, def: "List and read decks, cards, the queue and settings." },
          {
            term: "write",
            def: "Also add, edit, archive and restore. Untick it to keep the assistant read-only.",
          },
          {
            term: "offline_access",
            def: "A refresh token, so the connection survives longer than an hour.",
          },
        ]}
      />
      <p>
        The scope on the token is what counts, not what the assistant asked for. Removing write at
        the consent screen means every write it attempts comes back <code>403</code>.
      </p>

      <H2>What a connected assistant can never do</H2>
      <ul>
        <li>
          <strong>Grade a review.</strong> Only you, in the app, whatever the token holds.
        </li>
        <li>
          <strong>Touch your API keys.</strong> Keys are session-only, so an MCP token cannot list,
          mint or revoke one.
        </li>
        <li>
          <strong>Delete anything.</strong> Archive and restore are the only two, and both are
          reversible.
        </li>
      </ul>
      <p>
        Everything it does add carries <code>createdBy: "mcp"</code> and lands in the audit log with
        the same actor, so you can always tell what came from a conversation.
      </p>

      <H2>What the client has to support</H2>
      <p>
        Lymi follows the MCP authorization spec of 28 July 2026. Two things follow, and both can
        stop a client connecting:
      </p>
      <ul>
        <li>
          <strong>Client ID Metadata Documents.</strong> A client identifies itself with an HTTPS
          URL that serves its own metadata. Dynamic client registration is deprecated by that spec
          and is switched off here, so a client that only knows how to register dynamically cannot
          connect.
        </li>
        <li>
          <strong>PKCE with S256.</strong> The only code challenge method Lymi accepts.
        </li>
      </ul>
      <p>
        You also need an account on the allowlist. Lymi is private for now, so sign-in is limited to
        the addresses named in its configuration.
      </p>

      <H2>Set it up</H2>
      <NextLinks
        items={[
          {
            to: "/docs/mcp/claude",
            title: "Claude",
            blurb: "Claude Desktop, claude.ai and Claude Code.",
          },
          {
            to: "/docs/mcp/chatgpt",
            title: "ChatGPT and Codex",
            blurb: "Custom connectors, and the Codex CLI.",
          },
        ]}
      />
    </div>
  );
}
