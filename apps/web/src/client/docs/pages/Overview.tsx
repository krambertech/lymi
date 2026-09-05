import { Lantern } from "../../components/Lantern";
import { Code } from "../Code";
import { ORIGIN } from "../origin";
import { Defs, H2, Lead, NextLinks, Note } from "../Prose";

export function Overview() {
  return (
    <div className="doc-prose">
      <Lead>
        Lymi keeps the words you are learning and asks you about them again at the right time. This
        API is the same one the app uses, so anything you can do by hand you can do from a script, a
        shortcut or an assistant.
      </Lead>

      <div className="mb-10 flex items-center gap-4 rounded-lg bg-plate p-4 edge">
        <Lantern variant="lit" flicker glow className="size-14 shrink-0" />
        <p className="!mb-0 text-base text-text-2">
          Collect a word once, wherever you meet it. Lymi keeps it and brings it back before you
          forget.
        </p>
      </div>

      <H2>Two ways in</H2>
      <p>
        Pick by who is calling. A script you wrote uses an API key. An assistant such as Claude or
        ChatGPT signs in as you instead, over OAuth, and never sees a key.
      </p>

      <Defs
        items={[
          {
            term: "API key",
            def: (
              <>
                A header on every request, made in Settings. Best for curl, cron jobs, a shortcut on
                your phone, and anything you run yourself.
              </>
            ),
          },
          {
            term: "MCP",
            def: (
              <>
                An assistant connects to <code>/mcp</code> and asks you to sign in once. Best for
                “add these five words to my Italian deck” in the middle of a conversation.
              </>
            ),
          },
        ]}
      />

      <H2>The base URL is this site</H2>
      <p>
        Every route in these docs hangs off the origin you are reading them on. There is no separate
        API host and no version in the path.
      </p>
      <Code lang="text" code={ORIGIN} label="Base URL" />
      <p>
        The machine-readable description of every route lives at{" "}
        <a href="/api/openapi.json">/api/openapi.json</a>. The <a href="/docs/api">API reference</a>{" "}
        is that document, rendered.
      </p>

      <H2>What an integration may do</H2>
      <p>
        A key or a connected assistant can read your decks and cards, add and edit them, and archive
        or restore them. Three things are yours alone, from the app, whatever the scope:
      </p>
      <ul>
        <li>
          <strong>Grading a review.</strong> Only you can say whether you remembered a word.
        </li>
        <li>
          <strong>Managing API keys.</strong> A key can never mint or revoke another key.
        </li>
        <li>
          <strong>Deleting anything.</strong> There is no delete. Archiving hides a card and
          restoring brings it back with its schedule intact.
        </li>
      </ul>

      <Note title="Nothing lands unseen">
        A card added over the API carries <code>createdBy: "api"</code>, and one added over MCP
        carries <code>createdBy: "mcp"</code>. Every write is recorded in the audit log with the
        actor that made it, so you can always tell your own typing from a script’s.
      </Note>

      <H2>Where to go next</H2>
      <NextLinks
        items={[
          {
            to: "/docs/quickstart",
            title: "Quickstart",
            blurb: "Make a key and add a card in about two minutes.",
          },
          {
            to: "/docs/cards",
            title: "Decks and cards",
            blurb: "The shape of a card, and what happens when you add one twice.",
          },
          {
            to: "/docs/mcp",
            title: "Connect an assistant",
            blurb: "Sign Claude or ChatGPT in to your own decks.",
          },
          {
            to: "/docs/api",
            title: "API reference",
            blurb: "Every route, parameter and response.",
          },
        ]}
      />
    </div>
  );
}
