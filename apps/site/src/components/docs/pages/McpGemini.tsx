import { GEMINI_CLI_CLIENT_PATH } from "@lymi/core";
import { publicSiteUrl } from "../../../lib/origins";
import { Code } from "../Code";
import { ORIGIN } from "../origin";
import { H2, Lead, NextLinks, Steps, StepTitle } from "../Prose";

const CLIENT_ID = publicSiteUrl(GEMINI_CLI_CLIENT_PATH);

export function McpGemini() {
  return (
    <div className="doc-prose">
      <Lead>
        Gemini CLI connects to Lymi as a remote MCP server and signs in with OAuth. Unlike Claude
        Code or Codex, it needs a client ID in its config, because it cannot identify itself the way
        Lymi asks.
      </Lead>

      <Code lang="text" label="MCP server URL" code={`${ORIGIN}/mcp`} />

      <p>
        Once connected, ask it to add the cards from a lesson, list what is due, or find a card.
        What it can and cannot do is on <a href="/docs/mcp">Connect an assistant</a>.
      </p>

      <H2>Gemini CLI</H2>
      <p>
        Sign-in opens a browser on the same machine and waits for it on a local port, so run these
        steps on your own computer, not over SSH.
      </p>
      <Steps>
        <div>
          <StepTitle>Add the server</StepTitle>
          <p>
            Open <code>~/.gemini/settings.json</code> and add Lymi under <code>mcpServers</code>. If
            the file already has servers, add the <code>lymi</code> entry beside them.
          </p>
          <Code
            lang="json"
            label="~/.gemini/settings.json"
            code={`{
  "mcpServers": {
    "lymi": {
      "httpUrl": "${ORIGIN}/mcp",
      "oauth": {
        "enabled": true,
        "clientId": "${CLIENT_ID}",
        "redirectUri": "http://127.0.0.1:7777/oauth/callback"
      }
    }
  }
}`}
          />
        </div>
        <div>
          <StepTitle>Sign in</StepTitle>
          <p>
            Start <code>gemini</code> and run <code>/mcp auth lymi</code>. Your browser opens on
            Lymi. Sign in with the account your Lymi uses, then approve the connection. Untick{" "}
            <strong>write</strong> if you want Gemini CLI to read your decks and nothing more.
          </p>
        </div>
        <div>
          <StepTitle>Check the tools</StepTitle>
          <p>
            Run <code>/mcp</code>. Lymi shows as connected, with its tools listed under it.
          </p>
        </div>
      </Steps>
      <p>
        Gemini CLI keeps the tokens in <code>~/.gemini/mcp-oauth-tokens.json</code> and refreshes
        them on its own. To disconnect for good, remove the <code>lymi</code> entry and revoke the
        grant under <strong>Connected apps</strong> in Lymi.
      </p>

      <H2>Why the client ID is on lymi.app</H2>
      <p>
        An MCP client normally introduces itself with a Client ID Metadata Document: a URL it owns
        that names the app and the redirects it may use. Claude and Codex publish one. Gemini CLI
        does not. It only knows dynamic client registration, which Lymi keeps switched off.
      </p>
      <p>
        So Lymi publishes the document for it, at <a href={CLIENT_ID}>{CLIENT_ID}</a>, and the{" "}
        <code>clientId</code> line points Gemini CLI at it. The document allows one redirect: port
        7777, or any other port, on <code>127.0.0.1</code>. A token can only reach the computer that
        started the sign-in, and nothing connects until you approve it.
      </p>

      <H2>The Gemini app</H2>
      <p>
        Custom apps in the Gemini app are open to personal accounts of adults in the US, in English.
        Google signs the app in on its own, so no client ID is needed.
      </p>
      <Steps>
        <div>
          <StepTitle>Add the app</StepTitle>
          <p>
            In Gemini, open <strong>Settings → Connected Apps</strong>, press{" "}
            <strong>Add a custom app</strong>, and paste the server URL above.
          </p>
        </div>
        <div>
          <StepTitle>Sign in</StepTitle>
          <p>
            Press <strong>Next</strong>. Your browser opens on Lymi. Sign in, then approve the
            connection. Gemini asks you to confirm each change it makes to your decks.
          </p>
        </div>
      </Steps>
      <p>
        If Gemini asks for a client ID and secret instead, it could not identify itself to Lymi.
        Write to <a href="mailto:hello@lymi.app">hello@lymi.app</a>; Lymi has not been tested there
        yet.
      </p>

      <H2>When it does not connect</H2>
      <ul>
        <li>
          <strong>"No client ID provided and dynamic registration not supported".</strong> The{" "}
          <code>oauth</code> block is missing or misspelled. Copy it again from the step above.
        </li>
        <li>
          <strong>Port 7777 is in use.</strong> Change the port in <code>redirectUri</code> to any
          free one. Keep <code>127.0.0.1</code>: Lymi refuses <code>localhost</code> for this
          client.
        </li>
        <li>
          <strong>Sign-in is refused.</strong> Lymi is private. Only the accounts on its allowlist
          can sign in, whatever the Google account in Gemini CLI is.
        </li>
        <li>
          <strong>The browser never opens.</strong> Gemini CLI prints the sign-in URL. Open it in a
          browser on the same computer.
        </li>
      </ul>

      <NextLinks
        items={[
          {
            to: "/docs/api",
            title: "API reference",
            blurb: "The REST routes, which work today.",
          },
        ]}
      />
    </div>
  );
}
