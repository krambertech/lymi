import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Code } from "../Code";
import {
  accessOf,
  allSchemas,
  bodySchema,
  byTag,
  constraints,
  curlFor,
  type Defs,
  type Doc,
  deref,
  type Method,
  type Param,
  type Route,
  refName,
  responseSchema,
  type Schema,
  typeLabel,
  variantsOf,
} from "../openapi";
import { OPENAPI_URL, ORIGIN } from "../origin";
import { H2, Lead, Note, slug } from "../Prose";

/* -- Small pieces ------------------------------------------------------------ */

/** The HTTP method. Monochrome, because in Lymi colour means status, not category. */
function MethodTag({ method }: { method: Method }) {
  return (
    <span
      className={clsx(
        "inline-flex h-[22px] shrink-0 items-center rounded-xs px-1.5 font-mono text-xs font-semibold uppercase tracking-[0.06em]",
        method === "delete" ? "bg-danger-soft text-danger" : "bg-plate-2 text-text",
      )}
    >
      {method}
    </span>
  );
}

/** A response code. 2xx reads as good, anything else as a failure. */
function StatusTag({ code }: { code: string }) {
  const ok = code.startsWith("2");
  return (
    <span
      className={clsx(
        "inline-flex h-[22px] shrink-0 items-center rounded-xs px-1.5 font-mono text-2xs font-semibold tabular-nums",
        ok ? "bg-good-soft text-good" : "bg-danger-soft text-danger",
      )}
    >
      {code}
    </span>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <p className="mb-2 text-xs font-medium text-muted">{children}</p>;
}

/** A type, linked to its own entry when it is a named schema. */
function TypeName({ schema, defs }: { schema: Schema | undefined; defs: Defs }) {
  const label = typeLabel(schema, defs);
  const named = refName(schema) ?? refName(schema?.items);
  if (!named) return <span className="font-mono text-xs text-muted">{label}</span>;
  return (
    <a
      href={`#schema-${slug(named)}`}
      className="doc-plain font-mono text-xs text-muted underline decoration-edge-2 underline-offset-2 hoverable:hover:decoration-current"
    >
      {label}
    </a>
  );
}

/* -- Field tables ------------------------------------------------------------ */

interface FieldsProps {
  schema: Schema | undefined;
  defs: Defs;
  /** Follow a named `$ref` instead of linking to it. True only at the top of a body. */
  expand?: boolean;
}

/** One object schema as a list of fields. Named types inside it are links, not more rows. */
function Fields({ schema, defs, expand = false }: FieldsProps) {
  if (!schema) return null;
  const named = refName(schema);
  const resolved = expand || !named ? deref(schema, defs) : schema;

  if (!expand && named) {
    return (
      <p className="text-base text-text-2">
        <TypeName schema={schema} defs={defs} />
      </p>
    );
  }

  const variants = variantsOf(resolved);
  if (variants) {
    return (
      <div className="grid gap-3">
        <p className="text-base text-text-2">One of these shapes:</p>
        {variants.map((v, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: variants have no id of their own
          <div key={i} className="rounded-md bg-plate-2 p-3">
            {v.label && <p className="mb-2 font-mono text-xs text-text">{v.label}</p>}
            <Fields schema={v.schema} defs={defs} expand />
          </div>
        ))}
      </div>
    );
  }

  if (resolved.type === "array") {
    const inner = resolved.items;
    return (
      <div className="grid gap-2">
        <p className="text-base text-text-2">
          An array of <TypeName schema={inner} defs={defs} />.
        </p>
        {!refName(inner) && <Fields schema={inner} defs={defs} expand />}
      </div>
    );
  }

  const props = Object.entries(resolved.properties ?? {});
  if (props.length === 0) {
    return (
      <p className="text-base text-text-2">
        <TypeName schema={resolved} defs={defs} />
      </p>
    );
  }

  const required = new Set(resolved.required ?? []);
  return (
    <ul className="grid list-none !pl-0">
      {props.map(([name, prop]) => {
        const limits = constraints(prop);
        return (
          <li
            key={name}
            className="grid gap-x-3 gap-y-0.5 border-edge py-2 sm:grid-cols-[minmax(8rem,auto)_1fr] [&:not(:first-child)]:border-t"
          >
            <div className="flex items-baseline gap-2">
              <code className="doc-code-inline !bg-transparent !px-0 text-text">{name}</code>
              {required.has(name) && (
                <span className="text-2xs font-medium text-amber-text">required</span>
              )}
            </div>
            <div className="min-w-0">
              <TypeName schema={prop} defs={defs} />
              {prop.description && <p className="text-base text-text-2">{prop.description}</p>}
              {limits.length > 0 && <p className="text-sm text-muted">{limits.join(", ")}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Params({ params, defs, where }: { params: Param[]; defs: Defs; where: "path" | "query" }) {
  const list = params.filter((p) => p.in === where);
  if (list.length === 0) return null;
  return (
    <div>
      <SectionLabel>{where === "path" ? "Path parameters" : "Query parameters"}</SectionLabel>
      <ul className="grid list-none !pl-0">
        {list.map((p) => (
          <li
            key={p.name}
            className="grid gap-x-3 gap-y-0.5 border-edge py-2 sm:grid-cols-[minmax(8rem,auto)_1fr] [&:not(:first-child)]:border-t"
          >
            <div className="flex items-baseline gap-2">
              <code className="doc-code-inline !bg-transparent !px-0 text-text">{p.name}</code>
              {p.required && <span className="text-2xs font-medium text-amber-text">required</span>}
            </div>
            <div className="min-w-0">
              <TypeName schema={p.schema} defs={defs} />
              {p.description && <p className="text-base text-text-2">{p.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -- One operation ----------------------------------------------------------- */

function anchorFor(route: Route): string {
  return `${route.method}-${slug(route.path.replace(/[{}]/g, ""))}`;
}

function Operation({ route, doc, defs }: { route: Route; doc: Doc; defs: Defs }) {
  const { method, path, op } = route;
  const body = bodySchema(op);
  const responses = Object.entries(op.responses ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const success = responses.filter(([code]) => code.startsWith("2"));
  const failures = responses.filter(([code]) => !code.startsWith("2"));

  return (
    <section className="my-6 overflow-hidden rounded-lg bg-plate edge">
      <header className="border-b border-edge px-4 py-3.5">
        <h3
          id={anchorFor(route)}
          data-toc={`${method.toUpperCase()} ${path}`}
          className="!m-0 flex flex-wrap items-center gap-2.5 !text-base !font-normal"
        >
          <MethodTag method={method} />
          <code className="doc-code-inline !bg-transparent !px-0 !text-[0.8125rem] text-text">
            {path}
          </code>
        </h3>
        {op.summary && <p className="!mb-0 mt-1.5 text-base text-text">{op.summary}</p>}
      </header>

      <div className="grid gap-5 px-4 py-4">
        {op.description && <p className="!mb-0 text-base text-text-2">{op.description}</p>}

        <p className="!mb-0 text-sm text-muted">
          Access: <span className="text-text-2">{accessOf(op, method)}</span>
        </p>

        <Params params={op.parameters ?? []} defs={defs} where="path" />
        <Params params={op.parameters ?? []} defs={defs} where="query" />

        {body && (
          <div>
            <SectionLabel>Request body</SectionLabel>
            <Fields schema={body} defs={defs} expand />
          </div>
        )}

        {success.length > 0 && (
          <div>
            <SectionLabel>Returns</SectionLabel>
            <div className="grid gap-3">
              {success.map(([code, res]) => (
                <div key={code} className="grid gap-1.5">
                  <div className="flex items-center gap-2">
                    <StatusTag code={code} />
                    <span className="text-base text-text-2">{res.description}</span>
                  </div>
                  <Fields schema={responseSchema(res)} defs={defs} />
                </div>
              ))}
            </div>
          </div>
        )}

        {failures.length > 0 && (
          <div>
            <SectionLabel>Errors</SectionLabel>
            <ul className="grid list-none !pl-0">
              {failures.map(([code, res]) => (
                <li key={code} className="flex items-baseline gap-2.5 py-1">
                  <StatusTag code={code} />
                  <span className="text-base text-text-2">{res.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Code lang="bash" label="Request" code={curlFor(route, ORIGIN, doc)} />
      </div>
    </section>
  );
}

/* -- The page ---------------------------------------------------------------- */

function Loading() {
  return (
    <div
      className="grid gap-4"
      role="status"
      aria-busy="true"
      aria-label="Loading the API reference"
    >
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-24 rounded-lg" />
      ))}
    </div>
  );
}

export function ApiReference() {
  const { data, isPending, isError } = useQuery<Doc>({
    queryKey: ["openapi"],
    queryFn: async () => {
      const res = await fetch(OPENAPI_URL, { credentials: "omit", mode: "cors" });
      if (!res.ok) throw new Error(`The document answered ${res.status}`);
      return res.json();
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  });

  const doc = data;
  const defs = doc ? allSchemas(doc) : {};
  const groups = doc ? byTag(doc) : [];

  return (
    <div className="doc-prose">
      <Lead>
        Every route the Lymi API serves, read from the running server. This page renders{" "}
        <a href={OPENAPI_URL}>{OPENAPI_URL}</a>, so it is never out of date with the code.
      </Lead>

      <p>
        The base URL is <code>{ORIGIN}</code>. Send your key in an <code>x-api-key</code> header;
        see <a href="/docs/authentication">Authentication</a> for scopes and errors. Each route’s{" "}
        <strong>Request</strong> snippet assumes <code>LYMI_KEY</code> is set in your shell; replace
        anything in braces with a real id.
      </p>

      {isPending && <Loading />}

      {isError && (
        <Note tone="careful" title="The reference could not load">
          <p>
            Fetching <a href={OPENAPI_URL}>{OPENAPI_URL}</a> failed. Reload the page, or open the
            document directly to read it as JSON.
          </p>
        </Note>
      )}

      {doc &&
        groups.map((group) => (
          <section key={group.name}>
            <H2>{group.name}</H2>
            {group.description && <p>{group.description}</p>}
            {group.routes.map((route) => (
              <Operation
                key={`${route.method} ${route.path}`}
                route={route}
                doc={doc}
                defs={defs}
              />
            ))}
          </section>
        ))}

      {doc && (
        <section>
          <H2>Schemas</H2>
          <p>
            The shapes the routes above refer to. Every timestamp is an ISO 8601 string, and every
            id is a 19-character string that sorts by the time it was made.
          </p>
          {Object.entries(defs)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, schema]) => (
              <section key={name} className="my-6 overflow-hidden rounded-lg bg-plate edge">
                <h3
                  id={`schema-${slug(name)}`}
                  className="!m-0 border-b border-edge px-4 py-3 font-mono !text-base !font-medium text-text"
                >
                  {name}
                </h3>
                <div className="px-4 py-3">
                  <Fields schema={schema} defs={defs} expand />
                </div>
              </section>
            ))}
        </section>
      )}
    </div>
  );
}
