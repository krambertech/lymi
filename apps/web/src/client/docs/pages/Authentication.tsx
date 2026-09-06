import { Table, Td, Th } from "../../components/Table";
import { productUrl } from "../../lib/origins";
import { Code } from "../Code";
import { H2, H3, Lead, NextLinks, Note } from "../Prose";

const ERRORS: { code: string; when: string; fix: string }[] = [
  {
    code: "400",
    when: "The body or the query string did not validate.",
    fix: "Read issues in the response. It names the field and what was wrong with it.",
  },
  {
    code: "401",
    when: "No key, or a key that is wrong or revoked.",
    fix: "Check the header is x-api-key and that the key still exists in Settings.",
  },
  {
    code: "403",
    when: "A read key tried to write, or a key tried a route only you can call.",
    fix: "Make a key with the write scope, or do this one in the app.",
  },
  {
    code: "404",
    when: "Not found, or not yours.",
    fix: "Check the id. Lymi does not say whether an id belongs to someone else.",
  },
  {
    code: "429",
    when: "The key is over its rate limit.",
    fix: "Slow down. The window is a minute, so waiting one clears it.",
  },
];

export function Authentication() {
  return (
    <div className="doc-prose">
      <Lead>
        Requests carry a personal API key in a header. Keys are yours, they never expire on their
        own, and each one holds a single scope.
      </Lead>

      <H2>Send the key in a header</H2>
      <p>
        Put the key in <code>x-api-key</code>. There is no bearer token and no query parameter, so a
        key can never end up in a log line or a browser history.
      </p>
      <Code
        lang="http"
        label="Request"
        code={`POST /api/cards
x-api-key: lymi_2f8c1a4e7b93d05a6c1f
content-type: application/json`}
      />
      <Note tone="careful" title="A key is a password">
        Keep it in an environment variable or a secret store, never in a file you commit or a script
        you paste into a chat. If one gets out, revoke it in Settings; requests with it fail from
        the next call.
      </Note>

      <H2>Two scopes, chosen when you make the key</H2>
      <p>
        A key holds one scope for its whole life. To change it, make a new key and revoke the old
        one.
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Scope</Th>
            <Th>Can</Th>
            <Th>Cannot</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td className="font-mono text-sm">read</Td>
            <Td>List and read decks, cards, the review queue and settings.</Td>
            <Td>Anything that changes something.</Td>
          </tr>
          <tr>
            <Td className="font-mono text-sm">write</Td>
            <Td>Everything a read key can, plus add, edit, archive and restore.</Td>
            <Td>Grade a review, or manage keys.</Td>
          </tr>
        </tbody>
      </Table>

      <H3>What no key can do</H3>
      <p>
        Two routes need your own session in the app and answer <code>403</code> to any key, whatever
        its scope:
      </p>
      <ul>
        <li>
          <code>POST /api/review/grade</code>. A review is a claim about your memory, so nothing
          else gets to make it.
        </li>
        <li>
          Everything under <code>/api/keys</code>. A key cannot list, mint or revoke another key, so
          one leaked key cannot become several.
        </li>
      </ul>

      <H2>Sessions, for the app itself</H2>
      <p>
        The Lymi app authenticates with a session cookie rather than a key. You will only meet this
        if you call the API from a browser tab already signed in to Lymi. Everything in these docs
        otherwise assumes a key.
      </p>

      <H2>Rate limit</H2>
      <p>
        600 requests a minute per key. That is far above a batch import, which sends 200 cards in
        one call. Over the limit you get <code>429</code>; the window is a minute, so waiting one
        clears it.
      </p>

      <H2>Errors have one shape</H2>
      <p>
        Every failure is JSON with an <code>error</code> field written in plain words. A{" "}
        <code>400</code> adds <code>issues</code>, which lists what failed validation.
      </p>
      <Code
        lang="json"
        label="Response · 400"
        code={`{
  "error": "Invalid card",
  "issues": [
    {
      "code": "too_small",
      "path": ["term"],
      "message": "Too small: expected string to have >=1 characters"
    }
  ]
}`}
      />

      <Table>
        <thead>
          <tr>
            <Th>Code</Th>
            <Th>When</Th>
            <Th>What to do</Th>
          </tr>
        </thead>
        <tbody>
          {ERRORS.map((e) => (
            <tr key={e.code}>
              <Td className="font-mono text-sm text-danger">{e.code}</Td>
              <Td>{e.when}</Td>
              <Td className="text-text-2">{e.fix}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <H2>Revoking a key</H2>
      <p>
        Open <a href={productUrl("/you")}>You</a>, find the key by its first characters, and revoke
        it. That is final and takes effect on the next request. Nothing the key added is removed;
        the cards stay where they are.
      </p>

      <NextLinks
        items={[
          {
            to: "/docs/cards",
            title: "Decks and cards",
            blurb: "What a card holds and how duplicates are handled.",
          },
          {
            to: "/docs/api",
            title: "API reference",
            blurb: "Which scope each route needs, route by route.",
          },
        ]}
      />
    </div>
  );
}
