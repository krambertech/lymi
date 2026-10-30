import { API_RESOURCE_GROUPS, API_RESOURCES } from "@lymi/core/api-resources";
import { ArrowRight } from "lucide-react";
import { Code } from "../Code";
import { routesOf } from "../openapi";
import { OPENAPI_URL, ORIGIN } from "../origin";
import { Defs, H2, Lead, slug } from "../Prose";
import { ObjectEntry } from "./ResourcePage";
import { LoadFailed, ReferenceProvider, useOpenApi } from "./reference";

/** The resources by group: a name, what it is, and how many routes it has once the document loads. */
function Directory({ counts }: { counts: Map<string, number> | undefined }) {
  return (
    <div className="my-6 grid gap-8">
      {API_RESOURCE_GROUPS.map((group) => (
        <section key={group} aria-labelledby={`group-${slug(group)}`}>
          <h3
            id={`group-${slug(group)}`}
            className="!mb-2 !mt-0 !text-sm !font-medium !text-ink-muted"
          >
            {group}
          </h3>
          <ul className="grid list-none overflow-hidden rounded-md bg-plate !ps-0 edge">
            {API_RESOURCES.filter((r) => r.group === group).map((r) => (
              <li key={r.slug} className="border-edge [&:not(:first-child)]:border-t">
                <a
                  href={`/docs/api/${r.slug}`}
                  className="doc-plain group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3 transition-colors duration-150 hoverable:hover:bg-plate-nested sm:grid-cols-[9rem_minmax(0,1fr)_auto]"
                >
                  <span className="font-medium text-ink">{r.name}</span>
                  <span className="col-start-1 row-start-2 text-base text-ink-muted sm:col-start-2 sm:row-start-1">
                    {r.description}
                  </span>
                  <span className="col-start-2 row-span-2 row-start-1 flex items-center gap-3 sm:col-start-3 sm:row-span-1">
                    {counts?.has(r.name) && (
                      <span className="text-sm tabular-nums text-ink-faint">
                        {counts.get(r.name)}
                      </span>
                    )}
                    <ArrowRight
                      className="size-4 text-ink-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink"
                      aria-hidden="true"
                    />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ApiOverview() {
  const { reference, isError } = useOpenApi(undefined);
  const counts = reference
    ? new Map(API_RESOURCES.map((r) => [r.name, routesOf(reference.doc, r.name).length]))
    : undefined;
  const shared = reference
    ? Object.keys(reference.defs)
        .filter((name) => !reference.homes.has(name))
        .sort()
    : [];

  return (
    <div className="doc-prose">
      <Lead>
        Every route the Lymi API serves, one page per resource. The pages render{" "}
        <a href={OPENAPI_URL}>the OpenAPI document</a> from the running server, so they never fall
        behind the code.
      </Lead>

      <Code lang="text" code={ORIGIN} label="Base URL" />
      <p>
        Send your key in an <code>x-api-key</code> header;{" "}
        <a href="/docs/authentication">Authentication</a> covers scopes and errors. Each route’s
        request assumes <code>LYMI_KEY</code> is set in your shell; replace anything in braces with
        a real id.
      </p>

      <H2>Resources</H2>
      <Directory counts={counts} />

      <H2>Conventions</H2>
      <Defs
        items={[
          {
            term: "Ids",
            def: "A 19-character string that sorts by the time it was made.",
          },
          { term: "Timestamps", def: "ISO 8601 strings in UTC." },
          {
            term: "Duplicates",
            def: "Adding a term that already exists in the same language is skipped and reported, never rejected, so re-running a call is safe.",
          },
          {
            term: "Removal",
            def: "Cards, decks and sections are archived and can be restored. Only deleting a series cannot be undone.",
          },
        ]}
      />

      <H2>Errors</H2>
      <p>
        A failed call answers with a status and an <code>Error</code> body. Three statuses can come
        from any route, so the resource pages list only the ones a route adds.
      </p>
      <Defs
        items={[
          { term: "401", def: "No session, API key or token, or one that is not valid." },
          {
            term: "403",
            def: "A read key on a write, or a key or token on a route only the learner's own session may call.",
          },
          {
            term: "429",
            def: "The key is over its rate limit. Retry-After gives the seconds to wait.",
          },
        ]}
      />

      {isError && <LoadFailed />}
      {reference && shared.length > 0 && (
        <ReferenceProvider value={reference}>
          <H2>Shared objects</H2>
          {shared.map((name) => (
            <ObjectEntry key={name} name={name} />
          ))}
        </ReferenceProvider>
      )}
    </div>
  );
}
