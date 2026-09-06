/**
 * Just enough OpenAPI to render the reference. The document is generated from the Zod
 * schemas in packages/core, so its shape is narrow and predictable: JSON Schema objects,
 * `$ref` into `components.schemas`, and `$defs` carried alongside a schema when the
 * generator inlines a definition instead of hoisting it.
 */

export interface Schema {
  $ref?: string;
  $defs?: Record<string, Schema>;
  type?: string | string[];
  format?: string;
  description?: string;
  enum?: unknown[];
  const?: unknown;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  anyOf?: Schema[];
  oneOf?: Schema[];
  allOf?: Schema[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  maxItems?: number;
  minItems?: number;
  pattern?: string;
  discriminator?: { propertyName: string };
}

export interface Param {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  description?: string;
  schema?: Schema;
}

export interface Response {
  description?: string;
  content?: Record<string, { schema?: Schema }>;
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Param[];
  requestBody?: { required?: boolean; content?: Record<string, { schema?: Schema }> };
  responses?: Record<string, Response>;
  security?: Record<string, string[]>[];
}

export interface Doc {
  info?: { title?: string; version?: string; description?: string };
  tags?: { name: string; description?: string }[];
  paths?: Record<string, Record<string, Operation>>;
  components?: { schemas?: Record<string, Schema> };
}

export const METHODS = ["get", "post", "patch", "put", "delete"] as const;
export type Method = (typeof METHODS)[number];

export interface Route {
  method: Method;
  path: string;
  op: Operation;
}

/** Every operation, grouped by its first tag, in the order the document lists tags. */
export function byTag(doc: Doc): { name: string; description?: string; routes: Route[] }[] {
  const groups = new Map<string, Route[]>();
  for (const [path, item] of Object.entries(doc.paths ?? {})) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      const tag = op.tags?.[0] ?? "Other";
      const list = groups.get(tag) ?? [];
      list.push({ method, path, op });
      groups.set(tag, list);
    }
  }
  const declared = (doc.tags ?? []).map((t) => t.name);
  const names = [...declared, ...[...groups.keys()].filter((n) => !declared.includes(n))];
  return names
    .filter((n) => groups.has(n))
    .map((name) => {
      const described = doc.tags?.find((t) => t.name === name)?.description;
      return {
        name,
        ...(described ? { description: described } : {}),
        routes: groups.get(name) ?? [],
      };
    });
}

/** Definitions a `$ref` can point at: the document's own, plus any carried on a schema. */
export type Defs = Record<string, Schema>;

export function defsOf(doc: Doc, schema?: Schema): Defs {
  return { ...(doc.components?.schemas ?? {}), ...(schema?.$defs ?? {}) };
}

/** Follow a `$ref`. An unknown name comes back as an empty schema rather than throwing. */
export function deref(schema: Schema | undefined, defs: Defs): Schema {
  if (!schema) return {};
  if (!schema.$ref) return schema;
  const name = schema.$ref.split("/").pop() ?? "";
  const target = defs[name];
  return target ? { ...target, ...(schema.$defs ? { $defs: schema.$defs } : {}) } : {};
}

/** The name a `$ref` points at, for showing "Card" instead of the whole object. */
export function refName(schema: Schema | undefined): string | undefined {
  return schema?.$ref?.split("/").pop();
}

/**
 * A short, readable type: `string`, `integer`, `string | null`, `"a" | "b"`, `Card[]`.
 * Named types keep their name; anonymous objects come back as `object`.
 */
export function typeLabel(schema: Schema | undefined, defs: Defs): string {
  if (!schema) return "any";
  const named = refName(schema);
  if (named) return named;

  if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (schema.const !== undefined) return JSON.stringify(schema.const);

  const union = schema.anyOf ?? schema.oneOf;
  if (union) {
    const parts = union.map((s) => typeLabel(s, defs));
    return [...new Set(parts)].join(" | ");
  }

  if (Array.isArray(schema.type)) return schema.type.join(" | ");

  if (schema.type === "array") {
    const inner = typeLabel(schema.items, defs);
    return inner.includes(" | ") ? `(${inner})[]` : `${inner}[]`;
  }
  if (schema.type === "string" && schema.format === "date-time") return "string";
  if (schema.type) return schema.type;
  if (schema.properties) return "object";
  return "any";
}

/** The limits worth showing next to a field. */
export function constraints(schema: Schema | undefined): string[] {
  if (!schema) return [];
  const out: string[] = [];
  const target = schema.anyOf?.find((s) => s.type !== "null") ?? schema;
  // A minimum of one character only says the field cannot be empty, which `required` says
  // already, so it is left out.
  const min = target.minLength !== undefined && target.minLength > 1 ? target.minLength : undefined;
  if (min !== undefined && target.maxLength !== undefined) {
    out.push(`${min}–${target.maxLength} characters`);
  } else if (target.maxLength !== undefined) {
    out.push(`up to ${target.maxLength} characters`);
  } else if (min !== undefined) {
    out.push(`at least ${min} characters`);
  }
  // The generator writes the full 64-bit range on every integer; that is noise, not a limit.
  const SAFE = 9007199254740991;
  if (
    target.minimum !== undefined &&
    target.maximum !== undefined &&
    Math.abs(target.maximum) !== SAFE
  ) {
    out.push(`${target.minimum} to ${target.maximum}`);
  }
  if (target.maxItems !== undefined) {
    out.push(`up to ${target.maxItems} item${target.maxItems === 1 ? "" : "s"}`);
  }
  return out;
}

/** The JSON body of a request, as an object schema with its properties resolved. */
export function bodySchema(op: Operation): Schema | undefined {
  return op.requestBody?.content?.["application/json"]?.schema;
}

export function responseSchema(res: Response | undefined): Schema | undefined {
  return res?.content?.["application/json"]?.schema;
}

/** Which credential a route accepts. Routes without their own `security` take either. */
export function accessOf(op: Operation, method: Method): string {
  const sessionOnly = op.security?.every((s) => "session" in s) ?? false;
  if (sessionOnly) return "Your session only";
  return method === "get" ? "Any key" : "Write scope";
}

/** A placeholder value for one field, so a curl example has something to send. */
function sample(schema: Schema | undefined, defs: Defs, depth = 0): unknown {
  const s = deref(schema, defs);
  if (s.enum?.length) return s.enum[0];
  if (s.const !== undefined) return s.const;
  const union = s.anyOf ?? s.oneOf;
  if (union) {
    const first = union.find((u) => u.type !== "null");
    return first ? sample(first, defs, depth) : null;
  }
  const type = Array.isArray(s.type) ? s.type.find((t) => t !== "null") : s.type;
  if (type === "array") return depth > 1 ? [] : [sample(s.items, defs, depth + 1)];
  if (type === "object" || s.properties) {
    if (depth > 1) return {};
    const out: Record<string, unknown> = {};
    for (const key of s.required ?? Object.keys(s.properties ?? {}).slice(0, 3)) {
      out[key] = sample(s.properties?.[key], defs, depth + 1);
    }
    return out;
  }
  if (type === "integer" || type === "number") return 1;
  if (type === "boolean") return true;
  return "…";
}

/**
 * The request as curl. Path parameters keep their braces, because a placeholder that looks
 * like a placeholder is clearer than one that looks like a real id. Optional query
 * parameters are left out: an empty `?limit=` teaches nothing.
 */
export function curlFor(route: Route, origin: string, doc: Doc): string {
  const { method, path, op } = route;
  const query = (op.parameters ?? [])
    .filter((p) => p.in === "query" && p.required)
    .map((p) => `${p.name}=`)
    .join("&");
  const url = `${origin}${path}${query ? `?${query}` : ""}`;
  const lines = [`curl${method === "get" ? "" : ` -X ${method.toUpperCase()}`} "${url}" \\`];
  lines.push(`  -H "x-api-key: $LYMI_KEY"`);

  const body = bodySchema(op);
  if (body) {
    const defs = defsOf(doc, body);
    const json = JSON.stringify(sample(body, defs), null, 2)
      .split("\n")
      .map((l, i) => (i === 0 ? l : `  ${l}`))
      .join("\n");
    lines[lines.length - 1] += " \\";
    lines.push(`  -H "content-type: application/json" \\`);
    lines.push(`  -d '${json}'`);
  }
  return lines.join("\n");
}

/**
 * Every named schema in the document, wherever it is declared. The generator hoists some
 * into `components.schemas` and leaves others in a `$defs` beside the schema that uses
 * them, so the reference gathers both into one list.
 */
export function allSchemas(doc: Doc): Defs {
  const out: Defs = { ...(doc.components?.schemas ?? {}) };
  const seen = new Set<unknown>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const record = node as Record<string, unknown>;
    const defs = record.$defs;
    if (defs && typeof defs === "object") {
      for (const [name, schema] of Object.entries(defs as Defs)) {
        if (!out[name]) out[name] = schema;
      }
    }
    for (const value of Object.values(record)) walk(value);
  };
  walk(doc.paths);
  return out;
}

/** The variants of a union, with the label its discriminating constant gives it. */
export function variantsOf(schema: Schema): { label?: string; schema: Schema }[] | undefined {
  const union = schema.oneOf ?? schema.anyOf;
  if (!union || union.length < 2) return undefined;
  const objects = union.filter((s) => s.properties || s.$ref);
  if (objects.length < 2) return undefined;
  return union.map((s) => {
    const marker = Object.entries(s.properties ?? {}).find(([, p]) => p.const !== undefined);
    return marker
      ? { label: `${marker[0]}: ${JSON.stringify(marker[1].const)}`, schema: s }
      : { schema: s };
  });
}
