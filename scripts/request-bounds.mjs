const FIXES = {
  text: "text with no maximum. Add .max(n), or use Id or Cursor from packages/core/src/bounds.ts.",
  list: "a list with no maximum. Add .max(n).",
  record: "a record with no maximum. Use boundedRecord from packages/core/src/bounds.ts.",
  any: "any value at all. Give it a schema, or parsedLater from packages/core/src/bounds.ts.",
};

export function unboundedParts(schema, { components = {}, parsers = [] } = {}) {
  const problems = new Set();
  const report = (at, kind) => problems.add(`${at || "(whole value)"} accepts ${FIXES[kind]}`);

  const visit = (node, at, seen) => {
    if (node === false) return;
    if (node === true || node === undefined) return report(at, "any");
    if (node.$ref) {
      if (seen.includes(node.$ref)) return;
      return visit(target(node.$ref, schema, components), at, [...seen, node.$ref]);
    }
    if (parsers.includes(node["x-lymi-parsed-by"])) return;
    if (node.const !== undefined || node.enum) return;
    const parts = node.anyOf ?? node.oneOf ?? node.allOf;
    if (parts) return parts.forEach((part) => visit(part, at, seen));
    for (const type of [node.type].flat()) {
      if (type === undefined) report(at, "any");
      if (type === "string" && !boundedText(node)) report(at, "text");
      if (type === "array") visitArray(node, at, seen);
      if (type === "object") visitObject(node, at, seen);
    }
  };

  const visitArray = (node, at, seen) => {
    for (const [i, item] of (node.prefixItems ?? []).entries()) visit(item, `${at}[${i}]`, seen);
    if (node.items === false || (node.prefixItems && node.items === undefined)) return;
    if (node.maxItems === undefined) report(at, "list");
    visit(node.items, `${at}[]`, seen);
  };

  const visitObject = (node, at, seen) => {
    for (const [name, property] of Object.entries(node.properties ?? {})) {
      visit(property, at ? `${at}.${name}` : name, seen);
    }
    const values = node.additionalProperties;
    if (values === undefined || values === false) return;
    if (!node.propertyNames?.enum && node.maxProperties === undefined) report(at, "record");
    visit(node.propertyNames, `${at}{key}`, seen);
    visit(values, `${at}{value}`, seen);
  };

  visit(schema, "", []);
  return [...problems];
}

function target(ref, schema, components) {
  if (ref === "#") return schema;
  const name = ref.replace(/^#\/(?:components\/schemas|\$defs)\//, "");
  return components[name] ?? schema.$defs?.[name];
}

function boundedText({ maxLength, format, pattern }) {
  return maxLength !== undefined || format === "date-time" || closedPattern(pattern);
}

function closedPattern(pattern) {
  if (!pattern) return false;
  const bare = pattern.replace(/\\./g, "x").replace(/\[[^\]]*\]/g, "x");
  if (!bare.startsWith("^") || !bare.endsWith("$") || /[*+]|\{\d+,\}/.test(bare)) return false;
  let depth = 0;
  for (const char of bare) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "|" && depth === 0) return false;
  }
  return true;
}
