import type { LanguageOut } from "@lymi/core";
import { Fragment } from "react";
import { Code } from "../Code";
import { Defs, H2, Lead, NextLinks, Note } from "../Prose";

const LABELS: Record<LanguageOut["pronunciation"]["label"], string> = {
  reading: "Reading",
  stress: "Stress",
  pronunciation: "Pronunciation",
};

const DUPLICATES: Record<LanguageOut["duplicates"], string> = {
  term: "The term and language, as for any language.",
  "term-and-reading":
    "The term and language, unless both cards have a reading and the readings differ: then they are two words.",
};

function Language({ language }: { language: LanguageOut }) {
  const { pronunciation, example } = language;
  return (
    <>
      <H2 id={language.tag}>{language.name}</H2>
      <p>
        Tag <code>{language.tag}</code>, written in{" "}
        {language.scripts.map((script, at) => (
          <Fragment key={script}>
            {at > 0 && " or "}
            <code>{script}</code>
          </Fragment>
        ))}
        .
      </p>
      <Defs
        items={[
          {
            term: (
              <>
                <code>pronunciation</code>, called {LABELS[pronunciation.label]} in the app
              </>
            ),
            def: (
              <>
                {pronunciation.format} <span lang={language.tag}>{pronunciation.sample.term}</span>{" "}
                → <code lang={language.tag}>{pronunciation.sample.pronunciation}</code>
              </>
            ),
          },
          {
            term: <code>example</code>,
            def: example ? (
              <>
                {example.format} <code lang={language.tag}>{example.sample}</code> Each reading
                matches <code>{example.pattern}</code> with the <code>u</code> flag.
              </>
            ) : (
              "A plain sentence, with no readings inside it."
            ),
          },
          { term: "Duplicates", def: DUPLICATES[language.duplicates] },
        ]}
      />
    </>
  );
}

export function Languages({ languages }: { languages: readonly LanguageOut[] }) {
  const [first] = languages;
  return (
    <div className="doc-prose">
      <Lead>
        A card has one <code>pronunciation</code> field and one <code>example</code>. Most languages
        write them the same way; the languages on this page each have a format of their own, and
        Lymi's AI writes to it when it enriches a card.
      </Lead>

      <H2>Every other language</H2>
      <p>
        <code>pronunciation</code> holds IPA or a plain respelling, and <code>example</code> is a
        plain sentence. Two cards are duplicates when their term and language match.
      </p>

      {languages.map((language) => (
        <Language key={language.tag} language={language} />
      ))}

      <H2>Ask Lymi</H2>
      <p>
        The same facts come from <code>GET /api/languages</code>, which needs no key and may be
        cached for an hour. An assistant gets them from <code>list_decks</code>, as a{" "}
        <code>languages</code> map for the languages of the learner's decks.
      </p>
      <Code lang="bash" label="Terminal" code={`curl "$LYMI_URL/api/languages"`} />
      {first && (
        <Code
          lang="json"
          label="Response · 200, first entry"
          code={JSON.stringify({ languages: [first] }, null, 2)}
        />
      )}
      <Note title="Sending a reading inline">
        In a language whose examples carry readings, a term sent with its reading in brackets, such
        as <code>食[た]べる</code>, is stored as the term and its reading, and the result lists the
        converted fields in <code>normalized</code>. A card is never refused for its format.
      </Note>

      <NextLinks
        items={[
          {
            to: "/docs/cards",
            title: "Decks and cards",
            blurb: "Every field a card holds, and what counts as a duplicate.",
          },
          {
            to: "/docs/api",
            title: "API reference",
            blurb: "Every field and response, route by route.",
          },
        ]}
      />
    </div>
  );
}
