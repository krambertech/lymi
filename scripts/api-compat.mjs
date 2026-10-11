// Whether a newer OpenAPI document still serves a client built against an older one.
// An installed phone app lags the Worker by weeks, so every phone release freezes the document it
// was built against and the Worker must stay compatible with each frozen one. ADR 0031.
//
// Responses may gain fields, endpoints may be added, and requests may gain optional fields. A
// response may gain an enum value or a union branch only where the frozen document marks the
// field `x-lymi-open`, a promise that the client shows an unknown value safely.

const PROSE = new Set(["description", "summary", "examples", "example", "tags", "externalDocs"]);
const METHODS = ["get", "put", "post", "patch", "delete"];

/** The parts of a document a client depends on: paths and schemas, without prose. */
export function contractOf(document) {
  const strip = (value) => {
    if (Array.isArray(value)) return value.map(strip);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !PROSE.has(key))
        .map(([key, entry]) => [key, strip(entry)]),
    );
  };
  return strip({
    paths: document.paths ?? {},
    components: { schemas: document.components?.schemas ?? {} },
  });
}

/** Every way `next` would break a client built against `frozen`, as readable lines. */
export function breakingChanges(frozen, next) {
  const problems = [];
  const nextPaths = new Map(
    Object.entries(next.paths ?? {}).map(([path, item]) => [templateOf(path), item]),
  );
  for (const [path, item] of Object.entries(frozen.paths ?? {})) {
    for (const method of METHODS) {
      const before = item[method];
      if (!before) continue;
      const where = `${method.toUpperCase()} ${path}`;
      const after = nextPaths.get(templateOf(path))?.[method];
      if (!after) {
        problems.push(`${where}: removed`);
        continue;
      }
      const check = (direction, a, b, at) =>
        compare({ direction, a, b, at, frozen, next, problems, seen: new Set() });
      checkParameters(where, before, after, check, problems);
      const beforeBody = jsonSchema(before.requestBody);
      const afterBody = jsonSchema(after.requestBody);
      if (afterBody && after.requestBody?.required && !beforeBody) {
        problems.push(`${where}: now requires a body`);
      } else if (beforeBody && afterBody) {
        // An old client's request must still be accepted.
        check("request", beforeBody, afterBody, `${where} body`);
      }
      for (const [status, response] of Object.entries(before.responses ?? {})) {
        if (!status.startsWith("2")) continue;
        const afterResponse = after.responses?.[status];
        if (!afterResponse) {
          problems.push(`${where}: no longer answers ${status}`);
          continue;
        }
        const beforeSchema = jsonSchema(response);
        const afterSchema = jsonSchema(afterResponse);
        // Every response the new Worker sends must read as the old client expects.
        if (beforeSchema && afterSchema) {
          check("response", afterSchema, beforeSchema, `${where} ${status}`);
        }
      }
      for (const status of Object.keys(after.responses ?? {})) {
        if (status.startsWith("2") && !before.responses?.[status]) {
          problems.push(`${where}: now answers ${status}, which the client does not expect`);
        }
      }
    }
  }
  return problems;
}

const templateOf = (path) => path.replace(/\{[^}]+\}/g, "{}");

const jsonSchema = (body) => body?.content?.["application/json"]?.schema;

function checkParameters(where, before, after, check, problems) {
  const key = (p) => `${p.in}:${p.name}`;
  const old = new Map((before.parameters ?? []).map((p) => [key(p), p]));
  for (const parameter of after.parameters ?? []) {
    const previous = old.get(key(parameter));
    if (!previous) {
      if (parameter.required) problems.push(`${where}: new required ${key(parameter)}`);
      continue;
    }
    if (parameter.required && !previous.required) {
      problems.push(`${where}: ${key(parameter)} is now required`);
    }
    if (previous.schema && parameter.schema) {
      check("request", previous.schema, parameter.schema, `${where} ${key(parameter)}`);
    }
  }
}

/**
 * Whether every value schema `a` allows is accepted by schema `b`. In a request `a` is what the
 * old client sends; in a response `a` is what the new Worker sends and `b` what the old client reads.
 */
function compare(ctx) {
  const { direction, at, problems } = ctx;
  const responseSide = direction === "response";
  // `a` belongs to the next document in a response and to the frozen one in a request.
  const a = resolve(ctx.a, responseSide ? ctx.next : ctx.frozen);
  const b = resolve(ctx.b, responseSide ? ctx.frozen : ctx.next);
  if (!a || !b) return;
  const pair = `${at}|${JSON.stringify(ctx.a)}|${JSON.stringify(ctx.b)}`;
  if (ctx.seen.has(pair)) return;
  ctx.seen.add(pair);
  const recurse = (childA, childB, childAt) =>
    compare({ ...ctx, a: childA, b: childB, at: childAt });
  const fails = (message) => problems.push(`${at}: ${message}`);
  const open = b["x-lymi-open"] === true;

  if (isEmpty(b)) return;
  const aBranches = branches(a);
  if (aBranches) {
    for (const branch of aBranches) {
      const before = problems.length;
      compare({ ...ctx, a: branch, at });
      if (problems.length > before && open && responseSide) problems.length = before;
    }
    return;
  }
  const bBranches = branches(b);
  if (bBranches) {
    const fits = bBranches.some((branch) => {
      const scratch = [];
      compare({ ...ctx, b: branch, problems: scratch, seen: new Set(ctx.seen) });
      return scratch.length === 0;
    });
    if (!fits && !(open && responseSide)) fails("a value no longer fits any of the shapes it had");
    return;
  }

  const aTypes = typesOf(a);
  const bTypes = typesOf(b);
  if (aTypes && bTypes) {
    const extra = aTypes.filter(
      (type) => !bTypes.includes(type) && !(type === "integer" && bTypes.includes("number")),
    );
    if (extra.length) return fails(`type ${aTypes.join("|")} is not ${bTypes.join("|")}`);
  }

  const bValues = valuesOf(b);
  if (bValues) {
    const aValues = valuesOf(a);
    const unknown = aValues
      ? aValues.filter((value) => !bValues.some((known) => same(known, value)))
      : ["any value"];
    if (unknown.length && !(open && responseSide)) {
      fails(
        `${unknown.map((v) => JSON.stringify(v)).join(", ")} not among ${JSON.stringify(bValues)}`,
      );
    }
  }

  if (b.format && a.format !== b.format) fails(`format ${a.format ?? "none"} is not ${b.format}`);

  if (!responseSide) {
    for (const [low, high] of [
      ["minLength", "maxLength"],
      ["minimum", "maximum"],
      ["minItems", "maxItems"],
    ]) {
      if (b[low] !== undefined && !(a[low] >= b[low])) fails(`${low} tightened to ${b[low]}`);
      if (b[high] !== undefined && !(a[high] <= b[high])) fails(`${high} tightened to ${b[high]}`);
    }
  }

  if (a.items || b.items) recurse(a.items ?? {}, b.items ?? {}, `${at}[]`);

  if (a.properties || b.properties || b.required) {
    const aProps = a.properties ?? {};
    const bProps = b.properties ?? {};
    const aRequired = new Set(a.required ?? []);
    for (const name of b.required ?? []) {
      if (!aRequired.has(name)) {
        fails(responseSide ? `${name} may be missing` : `${name} is now required`);
      }
    }
    for (const [name, schema] of Object.entries(bProps)) {
      if (aProps[name]) recurse(aProps[name], schema, `${at}.${name}`);
    }
    // The client never rejects an unknown key, so only a strict request schema can refuse one.
    if (!responseSide && b.additionalProperties === false) {
      for (const name of Object.keys(aProps)) {
        if (!bProps[name]) fails(`${name} is no longer accepted`);
      }
    }
  }
}

function resolve(schema, document) {
  let current = schema;
  for (let hops = 0; current?.$ref && hops < 32; hops += 1) {
    const name = current.$ref.replace("#/components/schemas/", "");
    current = document.components?.schemas?.[name];
  }
  if (!current?.allOf) return current;
  // Zod writes an intersection or a described reference as allOf; merging covers both.
  const merged = omit(current, "allOf");
  const properties = { ...merged.properties };
  const required = [...(merged.required ?? [])];
  for (const part of current.allOf) {
    const resolved = resolve(part, document) ?? {};
    Object.assign(merged, resolved);
    Object.assign(properties, resolved.properties);
    required.push(...(resolved.required ?? []));
  }
  return { ...merged, properties, required };
}

function branches(schema) {
  const list = schema.anyOf ?? schema.oneOf;
  if (list) return list;
  // `type: ["string", "null"]` is the same union as `anyOf` written another way.
  if (Array.isArray(schema.type) && schema.type.length > 1 && !valuesOf(schema)) {
    return schema.type.map((type) => ({ ...schema, type }));
  }
  return null;
}

function typesOf(schema) {
  if (schema.const !== undefined) return [jsonType(schema.const)];
  if (schema.enum) return [...new Set(schema.enum.map(jsonType))];
  if (!schema.type) return null;
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  return schema.nullable ? [...types, "null"] : types;
}

function valuesOf(schema) {
  if (schema.const !== undefined) return [schema.const];
  return schema.enum ?? null;
}

function jsonType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

const isEmpty = (schema) =>
  Object.keys(schema).filter((key) => !key.startsWith("x-") && !PROSE.has(key)).length === 0;

const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

const omit = (object, key) => Object.fromEntries(Object.entries(object).filter(([k]) => k !== key));
