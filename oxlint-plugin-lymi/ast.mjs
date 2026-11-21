export function* descendants(sourceCode, node) {
  yield node;
  for (const key of sourceCode.visitorKeys[node.type] ?? []) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item) yield* descendants(sourceCode, item);
      }
    } else if (child && typeof child.type === "string") {
      yield* descendants(sourceCode, child);
    }
  }
}

export function someDescendant(sourceCode, nodes, predicate) {
  for (const node of nodes) {
    for (const descendant of descendants(sourceCode, node)) {
      if (predicate(descendant)) return true;
    }
  }
  return false;
}

export function isIdentifierNamed(node, name) {
  return (node.type === "Identifier" || node.type === "JSXIdentifier") && node.name === name;
}

export function isStaticMember(node, objectName, propertyName) {
  return (
    node.type === "MemberExpression" &&
    !node.computed &&
    !node.optional &&
    node.object.type === "Identifier" &&
    node.object.name === objectName &&
    node.property.type === "Identifier" &&
    node.property.name === propertyName
  );
}

export function isMethodCall(node, methodName) {
  return (
    node.type === "CallExpression" &&
    !node.optional &&
    node.callee.type === "MemberExpression" &&
    !node.callee.computed &&
    !node.callee.optional &&
    node.callee.property.type === "Identifier" &&
    node.callee.property.name === methodName
  );
}

export function isFunctionCall(node, functionName) {
  return (
    node.type === "CallExpression" &&
    !node.optional &&
    node.callee.type === "Identifier" &&
    node.callee.name === functionName
  );
}

export function isJsxAttribute(sourceCode, node, name, valueText) {
  if (node.type !== "JSXAttribute") return false;
  if (node.name.type !== "JSXIdentifier" || node.name.name !== name) return false;
  const { value } = node;
  if (value?.type === "Literal") return sourceCode.getText(value) === valueText;
  if (value?.type === "JSXExpressionContainer") {
    return `{${sourceCode.getText(value.expression)}}` === valueText;
  }
  return false;
}

export function isSelfClosingNamed(node, name) {
  return (
    node.type === "JSXOpeningElement" &&
    node.selfClosing &&
    node.name.type === "JSXIdentifier" &&
    node.name.name === name
  );
}

export function attributesSpan(attributes) {
  return { range: [attributes[0].range[0], attributes.at(-1).range[1]] };
}
