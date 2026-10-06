import { GROK_CLIENT_PATH } from "@lymi/core";
import { publicSiteUrl } from "../../../lib/origins";
import { Code } from "../Code";
import { ORIGIN } from "../origin";
import { H2, Lead, NextLinks, Steps, StepTitle } from "../Prose";

const CLIENT_ID = publicSiteUrl(GROK_CLIENT_PATH);

export function McpGrok() {
  return (
    <div className="doc-prose">
      <Lead>
        Grok connects to Lymi as a custom connector and signs in with OAuth. It needs a client ID,
        which Lymi publishes for it, because Lymi does not let apps register themselves.
      </Lead>

      <Code lang="text" label="MCP server URL" code={`${ORIGIN}/mcp`} />

      <p>
        Custom connectors are on Grok’s paid plans. Once connected, ask Grok to add the cards from a
        lesson, list what is due, or find a card. What it can and cannot do is on{" "}
        <a href="/docs/mcp">Connect an assistant</a>.
      </p>

      <H2>Grok</H2>
      <Steps>
        <div>
          <StepTitle>Add the connector</StepTitle>
          <p>
            Open <a href="https://grok.com/connectors">grok.com/connectors</a>, press{" "}
            <strong>New Connector</strong>, choose <strong>Custom</strong>, and paste the server URL
            above.
          </p>
        </div>
        <div>
          <StepTitle>Give it Lymi’s client ID</StepTitle>
          <p>
            Grok asks for OAuth credentials. Paste this as the <strong>Client ID</strong>, leave{" "}
            <strong>Client Secret</strong> empty, choose <strong>None / PKCE only</strong>, and keep
            the endpoints Grok filled in.
          </p>
          <Code lang="text" label="Client ID" code={CLIENT_ID} />
        </div>
        <div>
          <StepTitle>Sign in</StepTitle>
          <p>
            Press <strong>Save &amp; Connect</strong>. Your browser opens on Lymi. Sign in with the
            account your Lymi uses, then approve the connection. Untick <strong>write</strong> if
            you want Grok to read your decks and nothing more.
          </p>
        </div>
      </Steps>

      <H2>When it does not connect</H2>
      <ul>
        <li>
          <strong>“Invalid redirect URI”.</strong> Grok signed in from a callback address Lymi does
          not list. Write to <a href="mailto:hello@lymi.app">hello@lymi.app</a> with the address in
          the error, and Lymi will add it.
        </li>
        <li>
          <strong>Grok never asks for a client ID.</strong> It tried to register itself and Lymi
          refused. Remove the connector and add it again; the credentials step follows the refusal.
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
