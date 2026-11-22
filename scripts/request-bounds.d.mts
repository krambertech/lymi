export function unboundedParts(
  schema: unknown,
  options?: {
    components?: Record<string, unknown> | undefined;
    parsers?: readonly string[] | undefined;
  },
): string[];
