import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";
import {
  constraints,
  type Defs,
  deref,
  type Param,
  refName,
  type Schema,
  typeLabel,
  variantsOf,
} from "../openapi";
import { schemaHref, useReference } from "./reference";
import { inline } from "./Text";

/**
 * A type, linked to the object it names wherever that object is described. In a field row it is
 * small and quiet; `inSentence` sets it at the size of the words around it.
 */
export function TypeName({
  schema,
  inSentence = false,
}: {
  schema: Schema | undefined;
  inSentence?: boolean;
}) {
  const ref = useReference();
  const label = typeLabel(schema, ref.defs);
  const named = refName(schema) ?? refName(schema?.items);
  const size = inSentence ? "!bg-transparent !p-0 text-[0.9em] text-ink" : "text-xs text-ink-muted";
  if (!named) return <span className={clsx("font-mono", size)}>{label}</span>;
  return (
    <a
      href={schemaHref(named, ref)}
      className={clsx(
        "doc-plain font-mono underline decoration-edge-strong underline-offset-2 hoverable:hover:text-ink hoverable:hover:decoration-current",
        size,
      )}
    >
      {label}
    </a>
  );
}

/** An anonymous object inside a field, which would otherwise show only as `object`. */
function childObject(schema: Schema, defs: Defs): Schema | undefined {
  if (refName(schema)) return undefined;
  const target = schema.anyOf?.find((s) => s.type !== "null") ?? schema;
  if (refName(target)) return undefined;
  const inner = target.type === "array" ? target.items : target;
  if (!inner || refName(inner)) return undefined;
  const resolved = deref(inner, defs);
  return Object.keys(resolved.properties ?? {}).length > 0 || variantsOf(resolved)
    ? resolved
    : undefined;
}

/** One field: its name, type and whether it is required on the first line, then what it means. */
function Field({ name, schema, required }: { name: string; schema: Schema; required: boolean }) {
  const { defs } = useReference();
  const limits = constraints(schema);
  const child = childObject(schema, defs);
  const description = schema.description ?? schema.anyOf?.find((s) => s.description)?.description;
  const count = Object.keys(child?.properties ?? {}).length;
  return (
    <li className="border-edge py-3 first:pt-0 last:pb-0 [&:not(:first-child)]:border-t">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <code className="break-all !bg-transparent !p-0 font-mono !text-[0.8125rem] font-medium text-ink">
          {name}
        </code>
        <TypeName schema={schema} />
        {required && <span className="text-2xs font-medium text-amber-text">required</span>}
      </div>
      {description && (
        <p className="!mb-0 mt-1 text-base text-ink-secondary">{inline(description)}</p>
      )}
      {limits.length > 0 && (
        <p className="!mb-0 mt-0.5 text-sm text-ink-muted">{limits.join(", ")}</p>
      )}
      {child && (
        <details className="group mt-2">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-xs text-sm text-ink-muted hoverable:hover:text-ink [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="size-3.5 transition-transform duration-150 group-open:rotate-90"
              aria-hidden="true"
            />
            Child fields
            {count > 0 && <span className="tabular-nums text-ink-faint">{count}</span>}
          </summary>
          <div className="mt-2 rounded-md px-3.5 py-3 edge">
            <Fields schema={child} expand />
          </div>
        </details>
      )}
    </li>
  );
}

interface FieldsProps {
  schema: Schema | undefined;
  /** Follow a named `$ref` instead of linking to it. True at the top of a body or an object. */
  expand?: boolean;
}

/** An object's fields, one under another, so a long name never pushes the next row out of line. */
export function Fields({ schema, expand = false }: FieldsProps) {
  const { defs } = useReference();
  if (!schema) return null;
  const named = refName(schema);
  if (!expand && named) {
    return (
      <p className="!mb-0 text-base text-ink-secondary">
        A <TypeName schema={schema} inSentence /> object.
      </p>
    );
  }
  const resolved = deref(schema, defs);

  const variants = variantsOf(resolved);
  if (variants) {
    return (
      <div className="grid gap-3">
        <p className="!mb-0 text-base text-ink-secondary">One of these shapes:</p>
        {variants.map((v, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: variants have no id of their own
          <div key={i} className="rounded-md bg-plate-nested p-3.5">
            {v.label && <p className="!mb-2 font-mono text-xs text-ink">{v.label}</p>}
            <Fields schema={v.schema} expand />
          </div>
        ))}
      </div>
    );
  }

  if (resolved.type === "array") {
    const inner = resolved.items;
    return (
      <div className="grid gap-2">
        <p className="!mb-0 text-base text-ink-secondary">
          An array of <TypeName schema={inner} inSentence />.
        </p>
        {!refName(inner) && <Fields schema={inner} expand />}
      </div>
    );
  }

  const props = Object.entries(resolved.properties ?? {});
  if (props.length === 0) {
    return (
      <p className="!mb-0 text-base text-ink-secondary">
        <TypeName schema={resolved} inSentence />
      </p>
    );
  }
  const required = new Set(resolved.required ?? []);
  return (
    <ul className="grid list-none !ps-0">
      {props.map(([name, prop]) => (
        <Field key={name} name={name} schema={prop} required={required.has(name)} />
      ))}
    </ul>
  );
}

export function Params({ params, where }: { params: Param[]; where: "path" | "query" }) {
  const list = params.filter((p) => p.in === where);
  if (list.length === 0) return null;
  return (
    <ul className="grid list-none !ps-0">
      {list.map((p) => (
        <Field
          key={p.name}
          name={p.name}
          schema={{ ...p.schema, ...(p.description ? { description: p.description } : {}) }}
          required={p.required ?? false}
        />
      ))}
    </ul>
  );
}

/** A small heading inside an endpoint or object: what the list under it is. */
export function Label({ children, className }: { children: string; className?: string }) {
  return (
    <h4 className={clsx("!mb-3 !mt-0 !text-sm !font-medium !text-ink-muted", className)}>
      {children}
    </h4>
  );
}
