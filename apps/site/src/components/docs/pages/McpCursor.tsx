import { CURSOR_CLIENT_PATH } from "@lymi/core";
import { publicSiteUrl } from "../../../lib/origins";
import { Code } from "../Code";
import { ORIGIN } from "../origin";
import { H2, Lead, NextLinks, Steps, StepTitle } from "../Prose";

const CLIENT_ID = publicSiteUrl(CURSOR_CLIENT_PATH);

export function McpCursor() {
  return (
    <div className="doc-prose">
      <Lead>
        Cursor connects to Lymi as a remote MCP server and signs in with OAuth. Like Gemini CLI, it
        needs a client ID in its config, because it cannot identify itself the way Lymi asks.
      </Lead>

      <Code lang="text" label="MCP server URL" code={`${ORIGIN}/mcp`} />

      <p>
        Once connected, ask the agent to add the cards from a lesson, list what is due, or find a
        card. What it can and cannot do is on <a href="/docs/mcp">Connect an assistant</a>.
      </p>

      <H2>Cursor</H2>
      <Steps>
        <div>
          <StepTitle>Add the server</StepTitle>
          <p>
            Open <code>~/.cursor/mcp.json</code>, or <strong>Cursor Settings → MCP → Add</strong>,
            and add Lymi under <code>mcpServers</code>. If the file already has servers, add the{" "}
            <code>lymi</code> entry beside them.
          </p>
          <Code
            lang="json"
            label="~/.cursor/mcp.json"
            code={`{
  "mcpServers": {
    "lymi": {
      "url": "${ORIGIN}/mcp",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "scopes": ["read", "write", "offline_access"]
      }
    }
  }
}`}
          />
        </div>
        <div>
          <StepTitle>Sign in</StepTitle>
          <p>
            In <strong>Cursor Settings → MCP</strong>, press <strong>Connect</strong> beside Lymi.
            Your browser opens on Lymi. Sign in with the account your Lymi uses, then approve the
            connection. Untick <strong>write</strong> if you want Cursor to read your decks and
            nothing more.
          </p>
        </div>
        <div>
          <StepTitle>Check the tools</StepTitle>
          <p>Lymi shows a green dot in the MCP settings, with its tools listed under it.</p>
        </div>
      </Steps>
      <p>
        To disconnect for good, remove the <code>lymi</code> entry and revoke the grant under{" "}
        <strong>Connected apps</strong> in Lymi.
      </p>

      <H2>Why the client ID is on lymi.app</H2>
      <p>
        Cursor registers itself dynamically with a server that allows it, and Lymi keeps that
        switched off. So Lymi publishes a Client ID Metadata Document for Cursor, at{" "}
        <a href={CLIENT_ID}>{CLIENT_ID}</a>, and the <code>CLIENT_ID</code> line points Cursor at
        it. The document allows two redirects: Cursor's own web callback, and{" "}
        <code>http://localhost:8787/callback</code> for the desktop app. Nothing connects until you
        approve it.
      </p>

      <H2>When it does not connect</H2>
      <ul>
        <li>
          <strong>Port 8787 is in use.</strong> The desktop app listens there during sign-in. Quit
          whatever holds the port and press <strong>Connect</strong> again.
        </li>
        <li>
          <strong>Sign-in asks you to register a client.</strong> The <code>auth</code> block is
          missing or misspelled. Copy it again from the step above.
        </li>
        <li>
          <strong>The tools do not appear.</strong> Restart Cursor after editing{" "}
          <code>mcp.json</code> by hand.
        </li>
      </ul>

      <NextLinks
        items={[
          {
            to: "/docs/api",
            title: "API reference",
            blurb: "The REST routes, for scripts of your own.",
          },
        ]}
      />
    </div>
  );
}
