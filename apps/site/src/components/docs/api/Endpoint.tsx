import { clsx } from "clsx";
import { useState } from "react";
import { CopyButton } from "../Code";
import { highlight } from "../highlight";
import {
  accessOf,
  bodySchema,
  curlFor,
  example,
  type Method,
  type Route,
  responseSchema,
} from "../openapi";
import { ORIGIN } from "../origin";
import { slug } from "../Prose";
import { Fields, Label, Params } from "./Fields";
import { useReference } from "./reference";
import { Description, inline } from "./Text";

/** The HTTP method. Monochrome, because in Lymi colour means status, not category. */
export function MethodTag({ method, className }: { method: Method; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex h-[22px] shrink-0 items-center justify-center rounded-xs px-1.5 font-mono text-2xs font-semibold uppercase tracking-[0.04em]",
        method === "delete" ? "bg-danger-soft text-danger" : "bg-plate-2 text-text",
        className,
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

export function anchorFor(route: Route): string {
  return `${route.method}-${slug(route.path.replace(/[{}]/g, ""))}`;
}

/** Every route answers 401 and 429, and every write 403, so the overview says so once. */
const SHARED_ERRORS = new Set(["401", "403", "429"]);

/** The request and an example response, one at a time, so neither pushes the other off screen. */
function Example({ route }: { route: Route }) {
  const { doc, defs } = useReference();
  const success = Object.entries(route.op.responses ?? {}).find(([code]) => code.startsWith("2"));
  const response = success ? responseSchema(success[1]) : undefined;
  const samples = [
    { name: "Request", lang: "bash" as const, code: curlFor(route, ORIGIN, doc) },
    ...(response
      ? [
          {
            name: success?.[0] === "200" ? "Response" : `Response ${success?.[0]}`,
            lang: "json" as const,
            code: JSON.stringify(example(response, defs), null, 2),
          },
        ]
      : []),
  ];
  const [name, setName] = useState(samples[0]?.name);
  const active = samples.find((s) => s.name === name) ?? samples[0];
  if (!active) return null;
  return (
    <div className="rounded-md bg-plate edge">
      <div className="flex h-9 items-center justify-between gap-3 border-b border-edge px-1.5">
        <div className="flex items-center gap-0.5" role="tablist" aria-label="Example">
          {samples.map((s) => {
            const on = s.name === active.name;
            return (
              <button
                key={s.name}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setName(s.name)}
                className={clsx(
                  "h-7 shrink-0 rounded-xs px-2 text-xs font-medium transition-[background-color,color] duration-150",
                  on ? "bg-plate-2 text-text" : "text-muted hoverable:hover:text-text",
                )}
              >
                {s.name}
              </button>
            );
          })}
        </div>
        <CopyButton text={active.code} />
      </div>
      <pre className="doc-code doc-scroll max-h-[28rem] overflow-y-auto px-3.5 py-3">
        <code>{highlight(active.code, active.lang)}</code>
      </pre>
    </div>
  );
}

/**
 * One route: what it does in a sentence, who may call it, what it takes and what it returns.
 * On a wide screen the example stays beside it while the details scroll; narrower, it follows.
 */
export function Endpoint({ route }: { route: Route }) {
  const { method, path, op } = route;
  const body = bodySchema(op);
  const responses = Object.entries(op.responses ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const success = responses.filter(([code]) => code.startsWith("2"));
  const failures = responses.filter(([code]) => !code.startsWith("2") && !SHARED_ERRORS.has(code));
  const params = op.parameters ?? [];
  const hasPath = params.some((p) => p.in === "path");
  const hasQuery = params.some((p) => p.in === "query");

  const details = (
    <div className="grid min-w-0 content-start gap-6">
      {op.description && <Description text={op.description} />}
      {hasPath && (
        <div>
          <Label>Path parameters</Label>
          <Params params={params} where="path" />
        </div>
      )}
      {hasQuery && (
        <div>
          <Label>Query parameters</Label>
          <Params params={params} where="query" />
        </div>
      )}
      {body && (
        <div>
          <Label>Request body</Label>
          <Fields schema={body} expand />
        </div>
      )}
      {success.length > 0 && (
        <div>
          <Label>Returns</Label>
          <div className="grid gap-3">
            {success.map(([code, res]) => (
              <div key={code} className="grid gap-2">
                <div className="flex items-center gap-2">
                  <StatusTag code={code} />
                  <span className="text-base text-text-2">{inline(res.description ?? "")}</span>
                </div>
                <Fields schema={responseSchema(res)} />
              </div>
            ))}
          </div>
        </div>
      )}
      {failures.length > 0 && (
        <div>
          <Label>Errors</Label>
          <ul className="grid list-none gap-1.5 !pl-0">
            {failures.map(([code, res]) => (
              <li key={code} className="flex items-baseline gap-2.5">
                <StatusTag code={code} />
                <span className="text-base text-text-2">{inline(res.description ?? "")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <section
      aria-labelledby={anchorFor(route)}
      className="border-t border-edge pt-8 pb-12 first-of-type:border-t-0"
    >
      <h3
        id={anchorFor(route)}
        data-toc={op.summary ?? `${method.toUpperCase()} ${path}`}
        className="!mt-0"
      >
        {op.summary ?? path}
      </h3>
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="flex min-w-0 items-center gap-2">
          <MethodTag method={method} />
          <code className="doc-code-inline !bg-transparent !px-0 break-all !text-[0.8125rem] text-text">
            {path}
          </code>
        </span>
        <span className="text-sm text-muted">{accessOf(op, method)}</span>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:gap-10">
        {details}
        <div className="xl:sticky xl:top-20 xl:self-start">
          <Example route={route} />
        </div>
      </div>
    </section>
  );
}

/** Every route of a resource on its own line, method and path in columns that line up. */
export function EndpointIndex({ routes }: { routes: Route[] }) {
  return (
    <ul className="grid list-none grid-cols-[auto_minmax(0,1fr)] rounded-md bg-plate !pl-0 edge sm:grid-cols-[auto_minmax(0,auto)_minmax(0,1fr)]">
      {routes.map((route) => (
        <li
          key={`${route.method} ${route.path}`}
          className="col-span-full grid grid-cols-subgrid border-edge [&:not(:first-child)]:border-t"
        >
          <a
            href={`#${anchorFor(route)}`}
            className="doc-plain col-span-full grid grid-cols-subgrid items-baseline gap-x-3 gap-y-0.5 px-3.5 py-2.5 transition-colors duration-150 hoverable:hover:bg-plate-2"
          >
            <MethodTag method={route.method} className="w-14 self-center" />
            <code className="truncate !bg-transparent !p-0 font-mono !text-[0.8125rem] text-text max-sm:col-start-2 max-sm:row-start-2">
              {route.path}
            </code>
            <span className="truncate text-base text-text-2 max-sm:col-start-2 max-sm:row-start-1">
              {route.op.summary}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
