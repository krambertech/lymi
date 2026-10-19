import type {
  McpServer,
  RegisteredTool,
  StandardSchemaWithJSON,
  ToolAnnotations,
} from "@modelcontextprotocol/server";

interface ToolConfig {
  title?: string;
  annotations?: ToolAnnotations;
  inputSchema?: StandardSchemaWithJSON;
}

/**
 * Directory portals read a tool's title only from `annotations.title` and do not follow `$ref`,
 * so every tool registered on `server` copies its title there and inlines its input `$defs`.
 */
export function forDirectories(server: McpServer) {
  const register = server.registerTool.bind(server) as (...args: unknown[]) => RegisteredTool;
  server.registerTool = ((name: string, config: ToolConfig, handler: unknown) =>
    register(
      name,
      {
        ...config,
        annotations: { ...config.annotations, title: config.title },
        inputSchema: config.inputSchema && inlineDefinitions(config.inputSchema),
      },
      handler,
    )) as typeof server.registerTool;
}

function inlineDefinitions(schema: StandardSchemaWithJSON): StandardSchemaWithJSON {
  const standard = schema["~standard"];
  const { input } = standard.jsonSchema;
  return {
    "~standard": {
      ...standard,
      jsonSchema: {
        ...standard.jsonSchema,
        input: (options) => {
          const { $defs, ...json } = input(options);
          return inline(json, ($defs ?? {}) as Record<string, unknown>, []) as Record<
            string,
            unknown
          >;
        },
      },
    },
  };
}

function inline(node: unknown, defs: Record<string, unknown>, path: string[]): unknown {
  if (Array.isArray(node)) return node.map((item) => inline(item, defs, path));
  if (!node || typeof node !== "object") return node;
  const { $ref, ...rest } = node as Record<string, unknown>;
  const name = typeof $ref === "string" && $ref.startsWith("#/$defs/") ? $ref.slice(8) : null;
  if (name === null) {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, inline(value, defs, path)]),
    );
  }
  // A recursive definition cannot be inlined; failing here fails the tools test, not a host.
  if (path.includes(name)) throw new Error(`MCP input schema $defs/${name} is recursive`);
  const definition = inline(defs[name], defs, [...path, name]) as Record<string, unknown>;
  return { ...definition, ...(inline(rest, defs, path) as Record<string, unknown>) };
}
